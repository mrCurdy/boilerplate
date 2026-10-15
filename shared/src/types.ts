import type { Role } from './roles';

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
}

export interface Note {
  id: string;
  userId: string;
  title: string;
  content: string;
  done: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Note joined with its author, used by moderation views. */
export interface NoteWithAuthor extends Note {
  authorName: string;
}

export interface ChatMessage {
  id: string;
  room: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
}

export interface OnlineUser {
  id: string;
  name: string;
  role: Role;
}

export interface AuthResponse {
  user: PublicUser;
  accessToken: string;
}

export interface SystemInfo {
  dbDriver: 'json' | 'sqlite' | 'postgres';
  nodeVersion: string;
  uptimeSec: number;
  env: string;
  counts: { users: number; notes: number; messages: number };
  sockets: { connections: number; onlineUsers: number };
}

export interface ApiErrorBody {
  error: { message: string; code: string; details?: unknown };
}

export interface AccessTokenPayload {
  sub: string;
  role: Role;
  name: string;
}
