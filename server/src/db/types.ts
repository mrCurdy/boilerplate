import type { ChatMessage, Note, NoteWithAuthor, Role } from '@app/shared';

/**
 * Repository contracts. Routes and sockets depend only on these interfaces,
 * so swapping DB_DRIVER never touches business logic.
 * To add an entity: add a repo interface here, implement it in json/sqlite/postgres, expose it on `Db`.
 */

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  role: Role;
  passwordHash: string;
  createdAt: string;
}

export interface UserRepo {
  findById(id: string): Promise<UserRecord | null>;
  findByEmail(email: string): Promise<UserRecord | null>;
  list(): Promise<UserRecord[]>;
  count(): Promise<number>;
  create(data: Omit<UserRecord, 'id' | 'createdAt'>): Promise<UserRecord>;
  updateRole(id: string, role: Role): Promise<UserRecord | null>;
  delete(id: string): Promise<boolean>;
}

export interface RefreshTokenRecord {
  id: string;
  userId: string;
  /** All tokens issued from one login share a family; reuse of a revoked token kills the family. */
  familyId: string;
  tokenHash: string;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
}

export interface RefreshTokenRepo {
  create(
    data: Omit<RefreshTokenRecord, 'id' | 'createdAt' | 'revokedAt'>,
  ): Promise<RefreshTokenRecord>;
  findByHash(tokenHash: string): Promise<RefreshTokenRecord | null>;
  revoke(id: string): Promise<void>;
  revokeFamily(familyId: string): Promise<void>;
  revokeAllForUser(userId: string): Promise<void>;
  deleteExpired(): Promise<number>;
}

export interface NoteRepo {
  listByUser(userId: string): Promise<Note[]>;
  listAll(): Promise<NoteWithAuthor[]>;
  findById(id: string): Promise<Note | null>;
  create(data: Pick<Note, 'userId' | 'title' | 'content'>): Promise<Note>;
  update(
    id: string,
    patch: Partial<Pick<Note, 'title' | 'content' | 'done'>>,
  ): Promise<Note | null>;
  delete(id: string): Promise<boolean>;
  count(): Promise<number>;
}

export interface MessageRepo {
  create(data: Omit<ChatMessage, 'id' | 'createdAt'>): Promise<ChatMessage>;
  /** Most recent `limit` messages in chronological order. */
  listRecent(room: string, limit: number): Promise<ChatMessage[]>;
  count(): Promise<number>;
}

/** Small key/value store for app-wide settings (values are JSON-serializable). */
export interface SettingsRepo {
  get<T = unknown>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
}

export type DbDriver = 'json' | 'sqlite' | 'postgres';

export interface Db {
  driver: DbDriver;
  users: UserRepo;
  tokens: RefreshTokenRepo;
  notes: NoteRepo;
  messages: MessageRepo;
  settings: SettingsRepo;
  /** Create tables / files. Must be idempotent. */
  init(): Promise<void>;
  close(): Promise<void>;
}
