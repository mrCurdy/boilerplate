import { describe, expect, it } from 'vitest';
import { APPEARANCE_PRESETS, DEFAULT_APPEARANCE, PALETTES, paletteIndex } from './appearance';

describe('palettes', () => {
  it('has one palette per preset, with only the colour knobs', () => {
    expect(PALETTES.map((p) => p.name)).toEqual(APPEARANCE_PRESETS.map((p) => p.name));
    expect(Object.keys(PALETTES[0]!.colors).sort()).toEqual([
      'brandChroma',
      'brandHue',
      'neutralHue',
      'neutralTint',
    ]);
  });

  it('finds the palette by colours and ignores the other knobs', () => {
    expect(paletteIndex(DEFAULT_APPEARANCE)).toBe(0);
    expect(paletteIndex({ ...DEFAULT_APPEARANCE, ...PALETTES[2]!.colors, radius: 0 })).toBe(2);
    expect(paletteIndex({ ...DEFAULT_APPEARANCE, brandHue: 1 })).toBe(-1);
  });
});
