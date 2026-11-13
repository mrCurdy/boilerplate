import type { Request } from 'express';
import { HttpError } from './errors';

/** A route param, as a string. */
export const param = (req: Request, name: string): string => String(req.params[name] ?? '');

/** Throws 404 when a repository returned null/false for a missing row. */
export function found<T>(value: T | null | false, what: string): T {
  if (value === null || value === false) throw HttpError.notFound(`${what} not found`);
  return value;
}
