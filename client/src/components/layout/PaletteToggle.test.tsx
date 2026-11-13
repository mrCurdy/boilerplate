import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PALETTES } from '@app/shared';
import { AppearanceProvider } from '@/context/AppearanceContext';
import { mockApi } from '@/test/fetch';
import { PaletteToggle } from './PaletteToggle';

vi.mock('@/lib/socket', () => ({
  socket: { connected: false, on() {}, off() {}, connect() {}, disconnect() {} },
}));

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('PaletteToggle', () => {
  it('cycles the palettes and keeps them as local appearance', async () => {
    mockApi(() => ({ status: 200, body: { appearance: null } }));
    render(
      <AppearanceProvider>
        <PaletteToggle />
      </AppearanceProvider>,
    );
    const root = document.documentElement;
    expect(root.style.getPropertyValue('--brand-h')).toBe(String(PALETTES[0]!.colors.brandHue));

    await userEvent.click(
      screen.getByRole('button', { name: `Switch to ${PALETTES[1]!.name} palette` }),
    );
    expect(root.style.getPropertyValue('--brand-h')).toBe(String(PALETTES[1]!.colors.brandHue));
    expect(JSON.parse(localStorage.getItem('appearance')!).brandHue).toBe(
      PALETTES[1]!.colors.brandHue,
    );
    expect(
      screen.getByRole('button', { name: `Switch to ${PALETTES[2]!.name} palette` }),
    ).toBeInTheDocument();
  });
});
