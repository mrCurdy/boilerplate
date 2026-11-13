import { z } from 'zod';

/**
 * Global look & feel parameters. The client turns these into CSS variables on <html>
 * (see `appearanceToCssVars`); styles/index.css derives every color, radius, spacing
 * and shadow token from them, so one change re-themes the whole app.
 */

export const FONTS = {
  system: {
    label: 'System UI',
    stack: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
  },
  inter: {
    label: 'Inter',
    stack: "'Inter', ui-sans-serif, system-ui, sans-serif",
    google: 'Inter:wght@400;500;600;700',
  },
  roboto: {
    label: 'Roboto',
    stack: "'Roboto', ui-sans-serif, system-ui, sans-serif",
    google: 'Roboto:wght@400;500;700',
  },
  poppins: {
    label: 'Poppins',
    stack: "'Poppins', ui-sans-serif, system-ui, sans-serif",
    google: 'Poppins:wght@400;500;600;700',
  },
  nunito: {
    label: 'Nunito',
    stack: "'Nunito', ui-sans-serif, system-ui, sans-serif",
    google: 'Nunito:wght@400;500;600;700',
  },
  'space-grotesk': {
    label: 'Space Grotesk',
    stack: "'Space Grotesk', ui-sans-serif, system-ui, sans-serif",
    google: 'Space+Grotesk:wght@400;500;600;700',
  },
  'source-serif': {
    label: 'Source Serif 4',
    stack: "'Source Serif 4', ui-serif, Georgia, serif",
    google: 'Source+Serif+4:wght@400;500;600;700',
  },
  'jetbrains-mono': {
    label: 'JetBrains Mono',
    stack: "'JetBrains Mono', ui-monospace, monospace",
    google: 'JetBrains+Mono:wght@400;500;600;700',
  },
} as const satisfies Record<string, { label: string; stack: string; google?: string }>;

export type FontKey = keyof typeof FONTS;
const FONT_KEYS = Object.keys(FONTS) as [FontKey, ...FontKey[]];

export const appearanceSchema = z.object({
  /** OKLCH hue of the brand/primary color (0–360). */
  brandHue: z.number().min(0).max(360),
  /** OKLCH chroma (saturation) of the brand color. 0 = grayscale. */
  brandChroma: z.number().min(0).max(0.3),
  /** Hue that neutrals (backgrounds, borders, text) are tinted towards. */
  neutralHue: z.number().min(0).max(360),
  /** How strongly neutrals are tinted. 0 = pure gray. */
  neutralTint: z.number().min(0).max(4),
  font: z.enum(FONT_KEYS),
  /** Root font size in px; every rem-based size scales with it. */
  fontSize: z.number().min(12).max(20),
  /** Multiplier for all corner radii. 0 = square. */
  radius: z.number().min(0).max(2.5),
  /** Multiplier for Tailwind's spacing unit (padding, gaps, heights). */
  density: z.number().min(0.75).max(1.25),
  /** Multiplier for shadow opacity. 0 = flat. */
  shadow: z.number().min(0).max(3),
});

export type Appearance = z.infer<typeof appearanceSchema>;

export const DEFAULT_APPEARANCE: Appearance = {
  brandHue: 277,
  brandChroma: 0.23,
  neutralHue: 265,
  neutralTint: 1,
  font: 'inter',
  fontSize: 16,
  radius: 1,
  density: 1,
  shadow: 1,
};

export const APPEARANCE_PRESETS: { name: string; appearance: Appearance }[] = [
  { name: 'Indigo', appearance: DEFAULT_APPEARANCE },
  {
    name: 'Emerald',
    appearance: {
      ...DEFAULT_APPEARANCE,
      brandHue: 158,
      brandChroma: 0.16,
      neutralHue: 160,
      neutralTint: 0.8,
      font: 'nunito',
      radius: 1.4,
    },
  },
  {
    name: 'Rose',
    appearance: {
      ...DEFAULT_APPEARANCE,
      brandHue: 10,
      brandChroma: 0.21,
      neutralHue: 20,
      neutralTint: 1.2,
      font: 'poppins',
      radius: 2,
    },
  },
  {
    name: 'Amber',
    appearance: {
      ...DEFAULT_APPEARANCE,
      brandHue: 60,
      brandChroma: 0.17,
      neutralHue: 70,
      neutralTint: 1.5,
      font: 'source-serif',
      radius: 0.6,
      shadow: 0.5,
    },
  },
  {
    name: 'Ocean',
    appearance: {
      ...DEFAULT_APPEARANCE,
      brandHue: 225,
      brandChroma: 0.17,
      neutralHue: 230,
      neutralTint: 1.6,
      font: 'roboto',
      radius: 0.8,
      density: 0.9,
    },
  },
  {
    name: 'Mono',
    appearance: {
      ...DEFAULT_APPEARANCE,
      brandChroma: 0,
      neutralTint: 0,
      font: 'jetbrains-mono',
      fontSize: 15,
      radius: 0,
      shadow: 0,
    },
  },
  {
    name: 'Brutal',
    appearance: {
      ...DEFAULT_APPEARANCE,
      brandHue: 300,
      brandChroma: 0.28,
      neutralTint: 0,
      font: 'space-grotesk',
      radius: 0,
      shadow: 3,
      density: 1.15,
    },
  },
];

/** The colour knobs. A palette is a preset reduced to these, so switching it keeps font, radius etc. */
export const COLOR_KEYS = ['brandHue', 'brandChroma', 'neutralHue', 'neutralTint'] as const;
export type AppearanceColors = Pick<Appearance, (typeof COLOR_KEYS)[number]>;

const colorsOf = (a: Appearance): AppearanceColors =>
  Object.fromEntries(COLOR_KEYS.map((k) => [k, a[k]])) as AppearanceColors;

/** Colour schemes for the header palette toggle (one per preset). */
export const PALETTES: { name: string; colors: AppearanceColors }[] = APPEARANCE_PRESETS.map(
  (p) => ({ name: p.name, colors: colorsOf(p.appearance) }),
);

/** Index of the palette `a` uses, or -1 when its colours are custom. */
export function paletteIndex(a: Appearance): number {
  return PALETTES.findIndex((p) => COLOR_KEYS.every((k) => p.colors[k] === a[k]));
}

/** Google Fonts stylesheet URL for a font, or null for system fonts. */
export function fontStylesheetUrl(font: FontKey): string | null {
  const f = FONTS[font] as { google?: string };
  return f.google ? `https://fonts.googleapis.com/css2?family=${f.google}&display=swap` : null;
}

/** CSS custom properties consumed by client/src/styles/index.css. */
export function appearanceToCssVars(a: Appearance): Record<string, string> {
  return {
    '--brand-h': String(a.brandHue),
    '--brand-c': String(a.brandChroma),
    '--neutral-h': String(a.neutralHue),
    '--neutral-tint': String(a.neutralTint),
    '--font-user': FONTS[a.font].stack,
    '--font-size-root': `${a.fontSize}px`,
    '--radius-scale': String(a.radius),
    '--density': String(a.density),
    '--shadow-strength': String(a.shadow),
  };
}
