import type { Config } from '../config';
import type { Db } from './types';

export type * from './types';

/**
 * Picks the storage driver from config. Drivers are imported lazily so e.g. a
 * JSON-only deployment never loads the native SQLite module or the pg client.
 */
export async function createDb(
  config: Pick<Config, 'DB_DRIVER' | 'JSON_DB_PATH' | 'SQLITE_PATH' | 'DATABASE_URL'>,
): Promise<Db> {
  switch (config.DB_DRIVER) {
    case 'json': {
      const { createJsonDb } = await import('./json/index');
      return createJsonDb(config.JSON_DB_PATH);
    }
    case 'sqlite': {
      const { createSqliteDb } = await import('./sqlite/index');
      return createSqliteDb(config.SQLITE_PATH);
    }
    case 'postgres': {
      const { createPostgresDb } = await import('./postgres/index');
      return createPostgresDb(config.DATABASE_URL!);
    }
  }
}
