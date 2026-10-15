import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { DEFAULT_APPEARANCE, type Appearance } from '@app/shared';
import { useSocketEvent } from '@/hooks/useSocket';
import { api } from '@/lib/api';
import { applyAppearance, loadLocalAppearance, saveLocalAppearance } from '@/lib/appearance';

interface AppearanceState {
  /** What is currently rendered: local override → site default → built-in default. */
  appearance: Appearance;
  /** Site-wide default published by an admin (null = built-in default). */
  site: Appearance | null;
  /** True when this browser has its own overrides. */
  customized: boolean;
  /** Change one or more parameters (saved in this browser). */
  update(patch: Partial<Appearance>): void;
  /** Drop local overrides and follow the site default again. */
  resetLocal(): void;
  /** Admin: make the current appearance the default for everyone. */
  publish(): Promise<void>;
  /** Admin: revert the site default to the built-in one. */
  resetSite(): Promise<void>;
}

const AppearanceContext = createContext<AppearanceState | null>(null);

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [local, setLocal] = useState<Appearance | null>(loadLocalAppearance);
  const [site, setSite] = useState<Appearance | null>(null);

  const appearance = local ?? site ?? DEFAULT_APPEARANCE;

  // Sync the DOM (CSS variables + font link) with the effective appearance.
  useEffect(() => applyAppearance(appearance), [appearance]);

  useEffect(() => {
    api.get<{ appearance: Appearance | null }>('/settings/appearance').then(
      (r) => setSite(r.appearance),
      () => {},
    );
  }, []);

  // Admin published a new default: everyone online picks it up live.
  useSocketEvent('settings:appearance', setSite);

  const setLocalPersisted = useCallback((a: Appearance | null) => {
    setLocal(a);
    saveLocalAppearance(a);
  }, []);

  const value = useMemo<AppearanceState>(
    () => ({
      appearance,
      site,
      customized: local !== null,
      update: (patch) => setLocalPersisted({ ...appearance, ...patch }),
      resetLocal: () => setLocalPersisted(null),
      publish: async () => {
        const r = await api.put<{ appearance: Appearance }>('/settings/appearance', appearance);
        setSite(r.appearance);
        setLocalPersisted(null);
      },
      resetSite: async () => {
        await api.delete('/settings/appearance');
        setSite(null);
      },
    }),
    [appearance, site, local, setLocalPersisted],
  );

  return <AppearanceContext value={value}>{children}</AppearanceContext>;
}

export function useAppearance() {
  const ctx = use(AppearanceContext);
  if (!ctx) throw new Error('useAppearance must be used inside <AppearanceProvider>');
  return ctx;
}
