import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DEFAULT_APPEARANCE } from '@app/shared';
import { ADMIN, bearer, DRIVERS, setup, signIn, signUp, type TestEnv } from './helpers';

describe.each(DRIVERS)('REST API [%s]', (driver) => {
  let env: TestEnv;

  beforeAll(async () => {
    env = await setup(driver);
  });
  afterAll(async () => {
    await env.cleanup();
  });

  describe('system', () => {
    it('health is public', async () => {
      const res = await env.agent().get('/api/health').expect(200);
      expect(res.body.status).toBe('ok');
    });

    it('meta exposes the db driver', async () => {
      const res = await env.agent().get('/api/meta').expect(200);
      expect(res.body.dbDriver).toBe(driver);
    });

    it('unknown api route is a JSON 404', async () => {
      const res = await env.agent().get('/api/nope').expect(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('auth', () => {
    it('registers a user with role "user" and no password hash in the response', async () => {
      const { user, accessToken } = await signUp(env, 'alice@test.dev', 'Alice');
      expect(user.role).toBe('user');
      expect(user).not.toHaveProperty('passwordHash');
      expect(accessToken).toMatch(/^ey/);
    });

    it('rejects duplicate emails', async () => {
      await env
        .agent()
        .post('/api/auth/register')
        .send({ email: 'alice@test.dev', name: 'Alice 2', password: 'password-123' })
        .expect(409);
    });

    it('validates input with field details', async () => {
      const res = await env
        .agent()
        .post('/api/auth/register')
        .send({ email: 'not-an-email', name: 'A', password: 'short' })
        .expect(400);
      const paths = res.body.error.details.map((d: { path: string }) => d.path);
      expect(paths).toEqual(expect.arrayContaining(['email', 'name', 'password']));
    });

    it('rejects wrong passwords', async () => {
      await env
        .agent()
        .post('/api/auth/login')
        .send({ email: ADMIN.email, password: 'wrong' })
        .expect(401);
    });

    it('logs in the seeded admin and returns /me', async () => {
      const { user, accessToken, agent } = await signIn(env, ADMIN.email, ADMIN.password);
      expect(user.role).toBe('admin');
      const me = await agent.get('/api/auth/me').set(bearer(accessToken)).expect(200);
      expect(me.body.user.email).toBe(ADMIN.email);
    });

    it('requires a bearer token', async () => {
      await env.agent().get('/api/auth/me').expect(401);
      await env.agent().get('/api/auth/me').set(bearer('garbage')).expect(401);
    });

    it('rotates refresh tokens and detects reuse', async () => {
      const { agent } = await signUp(env, 'rotate@test.dev');
      const first = await agent.post('/api/auth/refresh').expect(200);
      const oldCookie = first.headers['set-cookie']![0]!.split(';')[0]!;
      expect(first.body.accessToken).toBeTruthy();

      // Normal rotation with the new cookie works
      await agent.post('/api/auth/refresh').expect(200);

      // Replaying the already-used cookie is reuse -> 401 and the whole family is revoked
      await env.agent().post('/api/auth/refresh').set('Cookie', oldCookie).expect(401);
      await agent.post('/api/auth/refresh').expect(401);
    });

    it('logout revokes the refresh token', async () => {
      const { agent } = await signUp(env, 'logout@test.dev');
      await agent.post('/api/auth/logout').expect(204);
      await agent.post('/api/auth/refresh').expect(401);
    });
  });

  describe('roles', () => {
    it('blocks users from admin and moderator endpoints', async () => {
      const { accessToken } = await signUp(env, 'plain@test.dev');
      await env.agent().get('/api/info').set(bearer(accessToken)).expect(403);
      await env.agent().get('/api/users').set(bearer(accessToken)).expect(403);
      await env.agent().get('/api/notes/all').set(bearer(accessToken)).expect(403);
    });

    it('lets admins promote users, and new claims apply after refresh', async () => {
      const admin = await signIn(env, ADMIN.email, ADMIN.password);
      const bob = await signUp(env, 'bob@test.dev', 'Bob');

      const res = await env
        .agent()
        .patch(`/api/users/${bob.user.id}/role`)
        .set(bearer(admin.accessToken))
        .send({ role: 'moderator' })
        .expect(200);
      expect(res.body.user.role).toBe('moderator');

      // Old token still says "user"
      await env.agent().get('/api/users').set(bearer(bob.accessToken)).expect(403);
      // After refresh the role is picked up from the DB
      const refreshed = await bob.agent.post('/api/auth/refresh').expect(200);
      await env.agent().get('/api/users').set(bearer(refreshed.body.accessToken)).expect(200);
      // ...but moderators still can't change roles
      await env
        .agent()
        .patch(`/api/users/${admin.user.id}/role`)
        .set(bearer(refreshed.body.accessToken))
        .send({ role: 'user' })
        .expect(403);
    });

    it('prevents admins from demoting or deleting themselves', async () => {
      const admin = await signIn(env, ADMIN.email, ADMIN.password);
      await env
        .agent()
        .patch(`/api/users/${admin.user.id}/role`)
        .set(bearer(admin.accessToken))
        .send({ role: 'user' })
        .expect(400);
      await env
        .agent()
        .delete(`/api/users/${admin.user.id}`)
        .set(bearer(admin.accessToken))
        .expect(400);
    });

    it('admin info returns counts', async () => {
      const admin = await signIn(env, ADMIN.email, ADMIN.password);
      const res = await env.agent().get('/api/info').set(bearer(admin.accessToken)).expect(200);
      expect(res.body.dbDriver).toBe(driver);
      expect(res.body.counts.users).toBeGreaterThan(1);
    });
  });

  describe('notes', () => {
    it('supports full CRUD scoped to the owner', async () => {
      const carol = await signUp(env, 'carol@test.dev', 'Carol');
      const dave = await signUp(env, 'dave@test.dev', 'Dave');
      const auth = bearer(carol.accessToken);

      const created = await env
        .agent()
        .post('/api/notes')
        .set(auth)
        .send({ title: '  Buy milk  ' })
        .expect(201);
      const note = created.body.note;
      expect(note).toMatchObject({
        title: 'Buy milk',
        content: '',
        done: false,
        userId: carol.user.id,
      });

      const updated = await env
        .agent()
        .patch(`/api/notes/${note.id}`)
        .set(auth)
        .send({ done: true })
        .expect(200);
      expect(updated.body.note).toMatchObject({ title: 'Buy milk', done: true });

      const list = await env.agent().get('/api/notes').set(auth).expect(200);
      expect(list.body.notes).toHaveLength(1);

      // Other users can't see, edit or delete it (404, not 403, to avoid leaking ids)
      expect(
        (await env.agent().get('/api/notes').set(bearer(dave.accessToken))).body.notes,
      ).toHaveLength(0);
      await env
        .agent()
        .patch(`/api/notes/${note.id}`)
        .set(bearer(dave.accessToken))
        .send({ title: 'x' })
        .expect(404);
      await env.agent().delete(`/api/notes/${note.id}`).set(bearer(dave.accessToken)).expect(404);

      await env.agent().delete(`/api/notes/${note.id}`).set(auth).expect(204);
      await env.agent().get(`/api/notes/${note.id}`).set(auth).expect(404);
    });

    it('lets moderators list and delete any note', async () => {
      const erin = await signUp(env, 'erin@test.dev', 'Erin');
      const { body } = await env
        .agent()
        .post('/api/notes')
        .set(bearer(erin.accessToken))
        .send({ title: 'spam' })
        .expect(201);

      const admin = await signIn(env, ADMIN.email, ADMIN.password);
      const all = await env
        .agent()
        .get('/api/notes/all')
        .set(bearer(admin.accessToken))
        .expect(200);
      expect(all.body.notes.find((n: { id: string }) => n.id === body.note.id)?.authorName).toBe(
        'Erin',
      );
      await env
        .agent()
        .delete(`/api/notes/${body.note.id}`)
        .set(bearer(admin.accessToken))
        .expect(204);
    });

    it('deleting a user cascades to their notes', async () => {
      const frank = await signUp(env, 'frank@test.dev', 'Frank');
      const { body } = await env
        .agent()
        .post('/api/notes')
        .set(bearer(frank.accessToken))
        .send({ title: 'mine' })
        .expect(201);
      const admin = await signIn(env, ADMIN.email, ADMIN.password);
      await env
        .agent()
        .delete(`/api/users/${frank.user.id}`)
        .set(bearer(admin.accessToken))
        .expect(204);
      expect(await env.ctx.db.notes.findById(body.note.id)).toBeNull();
      await frank.agent.post('/api/auth/refresh').expect(401);
    });
  });

  describe('settings: appearance', () => {
    it('is public and null until an admin publishes', async () => {
      const res = await env.agent().get('/api/settings/appearance').expect(200);
      expect(res.body.appearance).toBeNull();
    });

    it('only admins can publish, and input is validated', async () => {
      const user = await signUp(env, 'theme-user@test.dev');
      await env.agent().put('/api/settings/appearance').send(DEFAULT_APPEARANCE).expect(401);
      await env
        .agent()
        .put('/api/settings/appearance')
        .set(bearer(user.accessToken))
        .send(DEFAULT_APPEARANCE)
        .expect(403);

      const admin = await signIn(env, ADMIN.email, ADMIN.password);
      await env
        .agent()
        .put('/api/settings/appearance')
        .set(bearer(admin.accessToken))
        .send({ ...DEFAULT_APPEARANCE, brandHue: 999, font: 'comic-sans' })
        .expect(400);

      const custom = { ...DEFAULT_APPEARANCE, brandHue: 150, font: 'poppins' as const, radius: 0 };
      await env
        .agent()
        .put('/api/settings/appearance')
        .set(bearer(admin.accessToken))
        .send(custom)
        .expect(200);
      expect((await env.agent().get('/api/settings/appearance')).body.appearance).toEqual(custom);

      // Upsert overwrites
      const next = { ...custom, brandHue: 20 };
      await env
        .agent()
        .put('/api/settings/appearance')
        .set(bearer(admin.accessToken))
        .send(next)
        .expect(200);
      expect((await env.agent().get('/api/settings/appearance')).body.appearance).toEqual(next);

      await env
        .agent()
        .delete('/api/settings/appearance')
        .set(bearer(admin.accessToken))
        .expect(204);
      expect((await env.agent().get('/api/settings/appearance')).body.appearance).toBeNull();
    });
  });
});
