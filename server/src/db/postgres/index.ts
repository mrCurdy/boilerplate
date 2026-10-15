import { randomUUID } from 'node:crypto';
import pg from 'pg';
import type { ChatMessage, Note, NoteWithAuthor, Role } from '@app/shared';
import type { Db, RefreshTokenRecord, UserRecord } from '../types';
import { migrations } from './migrations';

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: Role;
  password_hash: string;
  created_at: Date;
}
interface TokenRow {
  id: string;
  user_id: string;
  family_id: string;
  token_hash: string;
  expires_at: Date;
  revoked_at: Date | null;
  created_at: Date;
}
interface NoteRow {
  id: string;
  user_id: string;
  title: string;
  content: string;
  done: boolean;
  created_at: Date;
  updated_at: Date;
  author_name?: string;
}
interface MessageRow {
  id: string;
  room: string;
  user_id: string;
  user_name: string;
  text: string;
  created_at: Date;
}

const iso = (d: Date) => d.toISOString();

const toUser = (r: UserRow): UserRecord => ({
  id: r.id,
  email: r.email,
  name: r.name,
  role: r.role,
  passwordHash: r.password_hash,
  createdAt: iso(r.created_at),
});
const toToken = (r: TokenRow): RefreshTokenRecord => ({
  id: r.id,
  userId: r.user_id,
  familyId: r.family_id,
  tokenHash: r.token_hash,
  expiresAt: iso(r.expires_at),
  revokedAt: r.revoked_at ? iso(r.revoked_at) : null,
  createdAt: iso(r.created_at),
});
const toNote = (r: NoteRow): Note => ({
  id: r.id,
  userId: r.user_id,
  title: r.title,
  content: r.content,
  done: r.done,
  createdAt: iso(r.created_at),
  updatedAt: iso(r.updated_at),
});
const toMessage = (r: MessageRow): ChatMessage => ({
  id: r.id,
  room: r.room,
  userId: r.user_id,
  userName: r.user_name,
  text: r.text,
  createdAt: iso(r.created_at),
});

/** Arbitrary constant used for pg_advisory_lock so concurrent instances don't migrate twice. */
const MIGRATION_LOCK_ID = 727_001;

export function createPostgresDb(connectionString: string): Db {
  const pool = new pg.Pool({ connectionString, max: 10 });

  const one = async <T extends pg.QueryResultRow>(sql: string, params: unknown[] = []) =>
    (await pool.query<T>(sql, params)).rows[0] ?? null;
  const many = async <T extends pg.QueryResultRow>(sql: string, params: unknown[] = []) =>
    (await pool.query<T>(sql, params)).rows;
  const count = async (table: string) =>
    Number((await one<{ c: string }>(`SELECT COUNT(*) AS c FROM ${table}`))?.c ?? 0);

  return {
    driver: 'postgres',

    async init() {
      const client = await pool.connect();
      try {
        await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_ID]);
        await client.query(
          'CREATE TABLE IF NOT EXISTS _migrations (id INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())',
        );
        const { rows } = await client.query<{ id: number }>('SELECT id FROM _migrations');
        const applied = new Set(rows.map((r) => r.id));
        for (const m of migrations) {
          if (applied.has(m.id)) continue;
          await client.query('BEGIN');
          try {
            await client.query(m.sql);
            await client.query('INSERT INTO _migrations (id, name) VALUES ($1, $2)', [
              m.id,
              m.name,
            ]);
            await client.query('COMMIT');
          } catch (err) {
            await client.query('ROLLBACK');
            throw err;
          }
        }
      } finally {
        await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_ID]).catch(() => {});
        client.release();
      }
    },

    async close() {
      await pool.end();
    },

    users: {
      async findById(id) {
        const r = await one<UserRow>('SELECT * FROM users WHERE id = $1', [id]);
        return r ? toUser(r) : null;
      },
      async findByEmail(email) {
        const r = await one<UserRow>('SELECT * FROM users WHERE email = $1', [email]);
        return r ? toUser(r) : null;
      },
      async list() {
        return (await many<UserRow>('SELECT * FROM users ORDER BY created_at')).map(toUser);
      },
      count: () => count('users'),
      async create(input) {
        const r = await one<UserRow>(
          'INSERT INTO users (id, email, name, role, password_hash) VALUES ($1, $2, $3, $4, $5) RETURNING *',
          [randomUUID(), input.email, input.name, input.role, input.passwordHash],
        );
        return toUser(r!);
      },
      async updateRole(id, role) {
        const r = await one<UserRow>('UPDATE users SET role = $1 WHERE id = $2 RETURNING *', [
          role,
          id,
        ]);
        return r ? toUser(r) : null;
      },
      async delete(id) {
        return ((await pool.query('DELETE FROM users WHERE id = $1', [id])).rowCount ?? 0) > 0;
      },
    },

    tokens: {
      async create(input) {
        const r = await one<TokenRow>(
          'INSERT INTO refresh_tokens (id, user_id, family_id, token_hash, expires_at) VALUES ($1, $2, $3, $4, $5) RETURNING *',
          [randomUUID(), input.userId, input.familyId, input.tokenHash, input.expiresAt],
        );
        return toToken(r!);
      },
      async findByHash(hash) {
        const r = await one<TokenRow>('SELECT * FROM refresh_tokens WHERE token_hash = $1', [hash]);
        return r ? toToken(r) : null;
      },
      async revoke(id) {
        await pool.query(
          'UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL',
          [id],
        );
      },
      async revokeFamily(familyId) {
        await pool.query(
          'UPDATE refresh_tokens SET revoked_at = now() WHERE family_id = $1 AND revoked_at IS NULL',
          [familyId],
        );
      },
      async revokeAllForUser(userId) {
        await pool.query(
          'UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL',
          [userId],
        );
      },
      async deleteExpired() {
        return (
          (await pool.query('DELETE FROM refresh_tokens WHERE expires_at <= now()')).rowCount ?? 0
        );
      },
    },

    notes: {
      async listByUser(userId) {
        return (
          await many<NoteRow>('SELECT * FROM notes WHERE user_id = $1 ORDER BY created_at DESC', [
            userId,
          ])
        ).map(toNote);
      },
      async listAll() {
        const rows = await many<NoteRow>(
          'SELECT n.*, u.name AS author_name FROM notes n JOIN users u ON u.id = n.user_id ORDER BY n.created_at DESC',
        );
        return rows.map((r): NoteWithAuthor => ({
          ...toNote(r),
          authorName: r.author_name ?? 'unknown',
        }));
      },
      async findById(id) {
        const r = await one<NoteRow>('SELECT * FROM notes WHERE id = $1', [id]);
        return r ? toNote(r) : null;
      },
      async create(input) {
        const r = await one<NoteRow>(
          'INSERT INTO notes (id, user_id, title, content) VALUES ($1, $2, $3, $4) RETURNING *',
          [randomUUID(), input.userId, input.title, input.content],
        );
        return toNote(r!);
      },
      async update(id, patch) {
        const r = await one<NoteRow>(
          `UPDATE notes SET
             title = COALESCE($2, title),
             content = COALESCE($3, content),
             done = COALESCE($4, done),
             updated_at = now()
           WHERE id = $1 RETURNING *`,
          [id, patch.title ?? null, patch.content ?? null, patch.done ?? null],
        );
        return r ? toNote(r) : null;
      },
      async delete(id) {
        return ((await pool.query('DELETE FROM notes WHERE id = $1', [id])).rowCount ?? 0) > 0;
      },
      count: () => count('notes'),
    },

    settings: {
      async get<T>(key: string) {
        const r = await one<{ value: T }>('SELECT value FROM settings WHERE key = $1', [key]);
        return r ? r.value : null;
      },
      async set(key, value) {
        await pool.query(
          'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()',
          [key, JSON.stringify(value)],
        );
      },
      async delete(key) {
        await pool.query('DELETE FROM settings WHERE key = $1', [key]);
      },
    },

    messages: {
      async create(input) {
        const r = await one<MessageRow>(
          'INSERT INTO messages (id, room, user_id, user_name, text) VALUES ($1, $2, $3, $4, $5) RETURNING *',
          [randomUUID(), input.room, input.userId, input.userName, input.text],
        );
        return toMessage(r!);
      },
      async listRecent(room, limit) {
        const rows = await many<MessageRow>(
          'SELECT * FROM (SELECT * FROM messages WHERE room = $1 ORDER BY created_at DESC LIMIT $2) t ORDER BY created_at ASC',
          [room, limit],
        );
        return rows.map(toMessage);
      },
      count: () => count('messages'),
    },
  };
}
