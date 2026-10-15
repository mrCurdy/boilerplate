import {
  appearanceSchema,
  appearanceToCssVars,
  fontStylesheetUrl,
  type Appearance,
} from '@app/shared';

const LOCAL_KEY = 'appearance';
/** Read by public/theme-init.js before first paint, so a reload doesn't flash the default theme. */
const CACHE_KEY = 'appearance-cache';
const FONT_LINK_ID = 'appearance-font';

/** Write the appearance parameters onto <html> and load its web font. */
export function applyAppearance(a: Appearance) {
  const vars = appearanceToCssVars(a);
  const root = document.documentElement;
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);

  const fontUrl = fontStylesheetUrl(a.font);
  let link = document.getElementById(FONT_LINK_ID) as HTMLLinkElement | null;
  if (fontUrl) {
    if (!link) {
      link = Object.assign(document.createElement('link'), { id: FONT_LINK_ID, rel: 'stylesheet' });
      document.head.appendChild(link);
    }
    if (link.href !== fontUrl) link.href = fontUrl;
  } else {
    link?.remove();
  }

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ vars, fontUrl }));
  } catch {
    /* storage unavailable */
  }
}

/** The current user's own overrides (per browser), or null if they use the site default. */
export function loadLocalAppearance(): Appearance | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    const parsed = raw ? appearanceSchema.safeParse(JSON.parse(raw)) : null;
    return parsed?.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function saveLocalAppearance(a: Appearance | null) {
  try {
    if (a) localStorage.setItem(LOCAL_KEY, JSON.stringify(a));
    else localStorage.removeItem(LOCAL_KEY);
  } catch {
    /* storage unavailable */
  }
}
