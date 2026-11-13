import { describe, expect, it } from 'vitest';
import { parseNumber, parseQty } from './numbers';

describe('numbers', () => {
  it('parseQty: empty clears, comma decimals work, negatives and junk are rejected', () => {
    expect(parseQty('  ')).toBeNull();
    expect(parseQty('3')).toBe(3);
    expect(parseQty(' 2,5 ')).toBe(2.5);
    expect(parseQty('0')).toBe(0);
    expect(parseQty('-1')).toBeUndefined();
    expect(parseQty('abc')).toBeUndefined();
    expect(parseQty('Infinity')).toBeUndefined();
  });

  it('parseNumber allows negatives', () => {
    expect(parseNumber('-1,5')).toBe(-1.5);
    expect(parseNumber('')).toBeNull();
    expect(parseNumber('1e')).toBeUndefined();
  });
});
