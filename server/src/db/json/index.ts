import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { ChatMessage, Note } from '@app/shared';
import type { Db, RefreshTokenRecord, UserRecord } from '../types';

interface JsonData {
  users: UserRecord[];
  refreshTokens: RefreshTokenRecord[];
  notes: Note[];
  messages: ChatMessage[];
  settings: Record<string, unknown>;
}

const empty = (): JsonData => ({
  users: [],
  refreshTokens: [],
  notes: [],
  messages: [],
  settings: {},
});

/** Max chat messages kept per file to stop the JSON file growing forever. */
const MESSAGE_CAP = 1000;

/**
 * Single-file JSON store. Whole dataset lives in memory; every mutation is
 * flushed with an atomic write (tmp file + rename), serialized through a promise chain.
 * Great for prototypes and demos — not for concurrent multi-process access.
 */
export function createJsonDb(filePath: string): Db {
  let data: JsonData = empty();
  let writeChain: Promise<void> = Promise.resolve();

  const persist = () => {
    const snapshot = JSON.stringify(data, null, 2);
    writeChain = writeChain.then(async () => {
      const tmp = `${filePath}.tmp`;
      await writeFile(tmp, snapshot);
      await rename(tmp, filePath);
    });
    return writeChain;
  };

  const now = () => new Date().toISOString();
  const clone = <T>(v: T): T => structuredClone(v);

  return {
    driver: 'json',

    async init() {
      await mkdir(dirname(filePath), { recursive: true });
      try {
        data = { ...empty(), ...JSON.parse(await readFile(filePath, 'utf8')) };
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
        await persist();
      }
    },

    async close() {
      await writeChain;
    },

    users: {
      async findById(id) {
        return clone(data.users.find((u) => u.id === id) ?? null);
      },
      async findByEmail(email) {
        return clone(data.users.find((u) => u.email === email) ?? null);
      },
      async list() {
        return clone([...data.users].sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
      },
      async count() {
        return data.users.length;
      },
      async create(input) {
        const user: UserRecord = { ...input, id: randomUUID(), createdAt: now() };
        data.users.push(user);
        await persist();
        return clone(user);
      },
      async updateRole(id, role) {
        const user = data.users.find((u) => u.id === id);
        if (!user) return null;
        user.role = role;
        await persist();
        return clone(user);
      },
      async delete(id) {
        const before = data.users.length;
        data.users = data.users.filter((u) => u.id !== id);
        if (data.users.length === before) return false;
        // Emulate ON DELETE CASCADE
        data.notes = data.notes.filter((n) => n.userId !== id);
        data.refreshTokens = data.refreshTokens.filter((t) => t.userId !== id);
        await persist();
        return true;
      },
    },

    tokens: {
      async create(input) {
        const token: RefreshTokenRecord = {
          ...input,
          id: randomUUID(),
          revokedAt: null,
          createdAt: now(),
        };
        data.refreshTokens.push(token);
        await persist();
        return clone(token);
      },
      async findByHash(hash) {
        return clone(data.refreshTokens.find((t) => t.tokenHash === hash) ?? null);
      },
      async revoke(id) {
        const t = data.refreshTokens.find((x) => x.id === id);
        if (t && !t.revokedAt) {
          t.revokedAt = now();
          await persist();
        }
      },
      async revokeFamily(familyId) {
        const ts = now();
        data.refreshTokens.forEach((t) => {
          if (t.familyId === familyId && !t.revokedAt) t.revokedAt = ts;
        });
        await persist();
      },
      async revokeAllForUser(userId) {
        const ts = now();
        data.refreshTokens.forEach((t) => {
          if (t.userId === userId && !t.revokedAt) t.revokedAt = ts;
        });
        await persist();
      },
      async deleteExpired() {
        const ts = now();
        const before = data.refreshTokens.length;
        data.refreshTokens = data.refreshTokens.filter((t) => t.expiresAt > ts);
        const removed = before - data.refreshTokens.length;
        if (removed) await persist();
        return removed;
      },
    },

    notes: {
      async listByUser(userId) {
        return clone(
          data.notes
            .filter((n) => n.userId === userId)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        );
      },
      async listAll() {
        const names = new Map(data.users.map((u) => [u.id, u.name]));
        return clone(
          [...data.notes]
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .map((n) => ({ ...n, authorName: names.get(n.userId) ?? 'unknown' })),
        );
      },
      async findById(id) {
        return clone(data.notes.find((n) => n.id === id) ?? null);
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
        data.notes.push(note);
        await persist();
        return clone(note);
      },
      async update(id, patch) {
        const note = data.notes.find((n) => n.id === id);
        if (!note) return null;
        Object.assign(note, patch, { updatedAt: now() });
        await persist();
        return clone(note);
      },
      async delete(id) {
        const before = data.notes.length;
        data.notes = data.notes.filter((n) => n.id !== id);
        if (data.notes.length === before) return false;
        await persist();
        return true;
      },
      async count() {
        return data.notes.length;
      },
    },

    settings: {
      async get<T>(key: string) {
        return key in data.settings ? clone(data.settings[key] as T) : null;
      },
      async set(key, value) {
        data.settings[key] = clone(value);
        await persist();
      },
      async delete(key) {
        if (!(key in data.settings)) return;
        delete data.settings[key];
        await persist();
      },
    },

    messages: {
      async create(input) {
        const msg: ChatMessage = { ...input, id: randomUUID(), createdAt: now() };
        data.messages.push(msg);
        if (data.messages.length > MESSAGE_CAP) data.messages = data.messages.slice(-MESSAGE_CAP);
        await persist();
        return clone(msg);
      },
      async listRecent(room, limit) {
        return clone(data.messages.filter((m) => m.room === room).slice(-limit));
      },
      async count() {
        return data.messages.length;
      },
    },
  };
}
