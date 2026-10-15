import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';
import type { ChatMessage, Note, NoteWithAuthor, Role } from '@app/shared';
import type { Db, RefreshTokenRecord, UserRecord } from '../types';
import { migrations } from './migrations';

/* Row shapes as stored (snake_case, booleans as 0/1) */
interface UserRow {
  id: string;
  email: string;
  name: string;
  role: Role;
  password_hash: string;
  created_at: string;
}
interface TokenRow {
  id: string;
  user_id: string;
  family_id: string;
  token_hash: string;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
}
interface NoteRow {
  id: string;
  user_id: string;
  title: string;
  content: string;
  done: number;
  created_at: string;
  updated_at: string;
  author_name?: string;
}
interface MessageRow {
  id: string;
  room: string;
  user_id: string;
  user_name: string;
  text: string;
  created_at: string;
}

const toUser = (r: UserRow): UserRecord => ({
  id: r.id,
  email: r.email,
  name: r.name,
  role: r.role,
  passwordHash: r.password_hash,
  createdAt: r.created_at,
});
const toToken = (r: TokenRow): RefreshTokenRecord => ({
  id: r.id,
  userId: r.user_id,
  familyId: r.family_id,
  tokenHash: r.token_hash,
  expiresAt: r.expires_at,
  revokedAt: r.revoked_at,
  createdAt: r.created_at,
});
const toNote = (r: NoteRow): Note => ({
  id: r.id,
  userId: r.user_id,
  title: r.title,
  content: r.content,
  done: !!r.done,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});
const toMessage = (r: MessageRow): ChatMessage => ({
  id: r.id,
  room: r.room,
  userId: r.user_id,
  userName: r.user_name,
  text: r.text,
  createdAt: r.created_at,
});

/**
 * SQLite via better-sqlite3 (synchronous, very fast for a single process).
 * Methods are async only to satisfy the shared repository interface.
 */
export function createSqliteDb(filePath: string): Db {
  let db!: Database.Database;
  const now = () => new Date().toISOString();

  return {
    driver: 'sqlite',

    async init() {
      if (filePath !== ':memory:') mkdirSync(dirname(filePath), { recursive: true });
      db = new Database(filePath);
      db.pragma('journal_mode = WAL');
      db.pragma('foreign_keys = ON');
      db.exec(
        'CREATE TABLE IF NOT EXISTS _migrations (id INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL)',
      );
      const applied = new Set(
        db
          .prepare('SELECT id FROM _migrations')
          .all()
          .map((r) => (r as { id: number }).id),
      );
      for (const m of migrations) {
        if (applied.has(m.id)) continue;
        db.transaction(() => {
          db.exec(m.sql);
          db.prepare('INSERT INTO _migrations (id, name, applied_at) VALUES (?, ?, ?)').run(
            m.id,
            m.name,
            now(),
          );
        })();
      }
    },

    async close() {
      db?.close();
    },

    users: {
      async findById(id) {
        const r = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
        return r ? toUser(r) : null;
      },
      async findByEmail(email) {
        const r = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as
          UserRow | undefined;
        return r ? toUser(r) : null;
      },
      async list() {
        return (db.prepare('SELECT * FROM users ORDER BY created_at').all() as UserRow[]).map(
          toUser,
        );
      },
      async count() {
        return (db.prepare('SELECT COUNT(*) AS c FROM users').get() as { c: number }).c;
      },
      async create(input) {
        const user: UserRecord = { ...input, id: randomUUID(), createdAt: now() };
        db.prepare(
          'INSERT INTO users (id, email, name, role, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        ).run(user.id, user.email, user.name, user.role, user.passwordHash, user.createdAt);
        return user;
      },
      async updateRole(id, role) {
        db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
        return this.findById(id);
      },
      async delete(id) {
        return db.prepare('DELETE FROM users WHERE id = ?').run(id).changes > 0;
      },
    },

    tokens: {
      async create(input) {
        const t: RefreshTokenRecord = {
          ...input,
          id: randomUUID(),
          revokedAt: null,
          createdAt: now(),
        };
        db.prepare(
          'INSERT INTO refresh_tokens (id, user_id, family_id, token_hash, expires_at, revoked_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ).run(t.id, t.userId, t.familyId, t.tokenHash, t.expiresAt, t.revokedAt, t.createdAt);
        return t;
      },
      async findByHash(hash) {
        const r = db.prepare('SELECT * FROM refresh_tokens WHERE token_hash = ?').get(hash) as
          TokenRow | undefined;
        return r ? toToken(r) : null;
      },
      async revoke(id) {
        db.prepare(
          'UPDATE refresh_tokens SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL',
        ).run(now(), id);
      },
      async revokeFamily(familyId) {
        db.prepare(
          'UPDATE refresh_tokens SET revoked_at = ? WHERE family_id = ? AND revoked_at IS NULL',
        ).run(now(), familyId);
      },
      async revokeAllForUser(userId) {
        db.prepare(
          'UPDATE refresh_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL',
        ).run(now(), userId);
      },
      async deleteExpired() {
        return db.prepare('DELETE FROM refresh_tokens WHERE expires_at <= ?').run(now()).changes;
      },
    },

    notes: {
      async listByUser(userId) {
        return (
          db
            .prepare('SELECT * FROM notes WHERE user_id = ? ORDER BY created_at DESC')
            .all(userId) as NoteRow[]
        ).map(toNote);
      },
      async listAll() {
        const rows = db
          .prepare(
            'SELECT n.*, u.name AS author_name FROM notes n JOIN users u ON u.id = n.user_id ORDER BY n.created_at DESC',
          )
          .all() as NoteRow[];
        return rows.map((r): NoteWithAuthor => ({
          ...toNote(r),
          authorName: r.author_name ?? 'unknown',
        }));
      },
      async findById(id) {
        const r = db.prepare('SELECT * FROM notes WHERE id = ?').get(id) as NoteRow | undefined;
        return r ? toNote(r) : null;
      },
      async create(input) {
        const ts = now();
        const note: Note = {
          ...input,
          id: randomUUID(),
          done: false,
          createdAt: ts,
          updatedAt: ts,
        };
        db.prepare(
          'INSERT INTO notes (id, user_id, title, content, done, created_at, updated_at) VALUES (?, ?, ?, ?, 0, ?, ?)',
        ).run(note.id, note.userId, note.title, note.content, ts, ts);
        return note;
      },
      async update(id, patch) {
        const existing = await this.findById(id);
        if (!existing) return null;
        const next = { ...existing, ...patch, updatedAt: now() };
        db.prepare(
          'UPDATE notes SET title = ?, content = ?, done = ?, updated_at = ? WHERE id = ?',
        ).run(next.title, next.content, next.done ? 1 : 0, next.updatedAt, id);
        return next;
      },
      async delete(id) {
        return db.prepare('DELETE FROM notes WHERE id = ?').run(id).changes > 0;
      },
      async count() {
        return (db.prepare('SELECT COUNT(*) AS c FROM notes').get() as { c: number }).c;
      },
    },

    settings: {
      async get<T>(key: string) {
        const r = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
          { value: string } | undefined;
        return r ? (JSON.parse(r.value) as T) : null;
      },
      async set(key, value) {
        db.prepare(
          'INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at',
        ).run(key, JSON.stringify(value), now());
      },
      async delete(key) {
        db.prepare('DELETE FROM settings WHERE key = ?').run(key);
      },
    },

    messages: {
      async create(input) {
        const m: ChatMessage = { ...input, id: randomUUID(), createdAt: now() };
        db.prepare(
          'INSERT INTO messages (id, room, user_id, user_name, text, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        ).run(m.id, m.room, m.userId, m.userName, m.text, m.createdAt);
        return m;
      },
      async listRecent(room, limit) {
        const rows = db
          .prepare(
            'SELECT * FROM (SELECT * FROM messages WHERE room = ? ORDER BY created_at DESC LIMIT ?) ORDER BY created_at ASC',
          )
          .all(room, limit) as MessageRow[];
        return rows.map(toMessage);
      },
      async count() {
        return (db.prepare('SELECT COUNT(*) AS c FROM messages').get() as { c: number }).c;
      },
    },
  };
}
