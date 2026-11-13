import { Palette } from 'lucide-react';
import { PALETTES, paletteIndex } from '@app/shared';
import { Button, Tooltip } from '@/components/ui';
import { useAppearance } from '@/context/AppearanceContext';

/** Cycles the colour palettes; a shortcut for the colour part of the Appearance presets. */
export function PaletteToggle() {
  const { appearance, update } = useAppearance();
  const i = paletteIndex(appearance);
  const next = PALETTES[(i + 1) % PALETTES.length]!;
  return (
    <Tooltip content={`Palette: ${PALETTES[i]?.name ?? 'custom'}`} side="bottom" align="end">
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Switch to ${next.name} palette`}
        onClick={() => update(next.colors)}
      >
        <Palette className="h-4 w-4 text-primary" />
      </Button>
    </Tooltip>
  );
}
