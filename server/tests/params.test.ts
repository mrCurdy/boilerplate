import type { Request } from 'express';
import { describe, expect, it } from 'vitest';
import { dateParam, found, param } from '../src/lib/params';

const req = (params: Record<string, string>) => ({ params }) as unknown as Request;

describe('route param helpers', () => {
  it('param reads a param as a string ("" when missing)', () => {
    expect(param(req({ id: 'x1' }), 'id')).toBe('x1');
    expect(param(req({}), 'id')).toBe('');
  });

  it('dateParam accepts YYYY-MM-DD, otherwise 400', () => {
    expect(dateParam(req({ date: '2026-11-13' }))).toBe('2026-11-13');
    expect(() => dateParam(req({ day: '13.11.2026' }), 'day')).toThrow(
      expect.objectContaining({ status: 400 }),
    );
  });

  it('found passes values through and turns null/false into 404', () => {
    expect(found(0, 'X')).toBe(0);
    for (const missing of [null, false])
      expect(() => found(missing, 'Note')).toThrow(
        expect.objectContaining({ status: 404, code: 'NOT_FOUND', message: 'Note not found' }),
      );
  });
});
