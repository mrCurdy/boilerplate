import { z } from 'zod';

const duration = z.string().regex(/^\d+[smhd]$/, 'Use a duration like 15m, 12h, 7d');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  DB_DRIVER: z.enum(['json', 'sqlite', 'postgres']).default('sqlite'),
  JSON_DB_PATH: z.string().default('../data/db.json'),
  SQLITE_PATH: z.string().default('../data/app.sqlite'),
  DATABASE_URL: z.string().optional(),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 chars'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 chars'),
  ACCESS_TOKEN_TTL: duration.default('15m'),
  REFRESH_TOKEN_TTL: duration.default('7d'),

  ADMIN_EMAIL: z.string().optional(),
  ADMIN_PASSWORD: z.string().optional(),
  ADMIN_NAME: z.string().default('Admin'),

  /**
   * Site is served over HTTPS (directly or via a TLS-terminating proxy). Enables Secure cookies,
   * HSTS and upgrade-insecure-requests. Defaults to true in production; set false for plain-HTTP hosts.
   */
  HTTPS_ONLY: z.enum(['true', 'false']).optional(),

  /** Directory with the built client; served in production. */
  CLIENT_DIST: z.string().optional(),
});

export type Config = z.infer<typeof envSchema> & { httpsOnly: boolean };

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  const cfg = {
    ...parsed.data,
    httpsOnly: (parsed.data.HTTPS_ONLY ?? String(parsed.data.NODE_ENV === 'production')) === 'true',
  };
  if (cfg.DB_DRIVER === 'postgres' && !cfg.DATABASE_URL) {
    throw new Error('DATABASE_URL is required when DB_DRIVER=postgres');
  }
  return cfg;
}

/** Converts "15m" / "7d" style durations to milliseconds. */
export function durationToMs(value: string): number {
  const n = Number.parseInt(value, 10);
  const unit = value.at(-1);
  const mult = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit as 's' | 'm' | 'h' | 'd'];
  return n * mult;
}
