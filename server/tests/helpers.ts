import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import type { AuthResponse } from '@app/shared';
import { createApp } from '../src/app';
import { loadConfig } from '../src/config';
import { createContext, type AppContext } from '../src/context';
import { createDb, type DbDriver } from '../src/db';
import { seedAdmin } from '../src/db/seed';

/** Drivers to test. Postgres runs only when TEST_DATABASE_URL points at a disposable database. */
export const DRIVERS: DbDriver[] = [
  'json',
  'sqlite',
  ...(process.env.TEST_DATABASE_URL ? (['postgres'] as const) : []),
];

export const ADMIN = { email: 'admin@test.dev', password: 'admin-password-1' };

export async function setup(driver: DbDriver) {
  const dir = mkdtempSync(join(tmpdir(), 'bp-test-'));
  const config = loadConfig({
    NODE_ENV: 'test',
    DB_DRIVER: driver,
    JSON_DB_PATH: join(dir, 'db.json'),
    SQLITE_PATH: join(dir, 'db.sqlite'),
    DATABASE_URL: process.env.TEST_DATABASE_URL,
    JWT_ACCESS_SECRET: 'test-access-secret-test-access-secret-123',
    JWT_REFRESH_SECRET: 'test-refresh-secret-test-refresh-secret-123',
    ADMIN_EMAIL: ADMIN.email,
    ADMIN_PASSWORD: ADMIN.password,
  });

  const db = await createDb(config);
  await db.init();
  if (driver === 'postgres') await resetPostgres();
  await seedAdmin(db, config);

  const ctx: AppContext = createContext(config, db);
  const app = createApp(ctx);

  return {
    ctx,
    app,
    agent: () => request.agent(app),
    async cleanup() {
      await db.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

async function resetPostgres() {
  // Wipe data between suites; tables come from migrations.
  const pg = await import('pg');
  const client = new pg.default.Client({ connectionString: process.env.TEST_DATABASE_URL });
  await client.connect();
  await client.query('TRUNCATE users, refresh_tokens, notes, messages CASCADE');
  await client.end();
}

export type TestEnv = Awaited<ReturnType<typeof setup>>;

/** Registers (or logs in) a user and returns a supertest agent holding its refresh cookie, plus the access token. */
export async function signUp(
  env: TestEnv,
  email: string,
  name = 'Tester',
  password = 'password-123',
) {
  const agent = env.agent();
  const res = await agent.post('/api/auth/register').send({ email, name, password }).expect(201);
  return { agent, ...(res.body as AuthResponse) };
}

export async function signIn(env: TestEnv, email: string, password: string) {
  const agent = env.agent();
  const res = await agent.post('/api/auth/login').send({ email, password }).expect(200);
  return { agent, ...(res.body as AuthResponse) };
}

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
