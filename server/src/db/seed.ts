import bcrypt from 'bcryptjs';
import type { Config } from '../config';
import { logger } from '../lib/logger';
import type { Db } from './types';

/** Creates the initial admin account when the database has no users yet. */
export async function seedAdmin(db: Db, config: Config): Promise<void> {
  if (!config.ADMIN_EMAIL || !config.ADMIN_PASSWORD) return;
  if ((await db.users.count()) > 0) return;

  await db.users.create({
    email: config.ADMIN_EMAIL.toLowerCase(),
    name: config.ADMIN_NAME,
    role: 'admin',
    passwordHash: await bcrypt.hash(config.ADMIN_PASSWORD, 10),
  });
  logger.info({ email: config.ADMIN_EMAIL }, 'Seeded admin user');
}
