import { Monitor, Moon, Sun } from 'lucide-react';
import { Button, Tooltip } from '@/components/ui';
import { useTheme, type ThemePreference } from '@/context/ThemeContext';

const order: ThemePreference[] = ['light', 'dark', 'system'];
const icons = { light: Sun, dark: Moon, system: Monitor };

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const Icon = icons[theme];
  const next = order[(order.indexOf(theme) + 1) % order.length]!;
  return (
    <Tooltip content={`Theme: ${theme}`} side="bottom">
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Switch to ${next} theme`}
        onClick={() => setTheme(next)}
      >
        <Icon className="h-4 w-4" />
      </Button>
    </Tooltip>
  );
}
