import { describe, expect, it, beforeEach } from 'vitest';
import { applyTheme, getActiveTheme, getStoredTheme, getSystemTheme, saveTheme } from './theme.service';

describe('theme.service', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('ion-palette-dark');
  });

  it('falls back to system theme when no preference is stored', () => {
    expect(getActiveTheme()).toBe(getSystemTheme());
  });

  it('persists and applies theme preference', () => {
    saveTheme('light');
    expect(getStoredTheme()).toBe('light');
    expect(document.documentElement.classList.contains('ion-palette-dark')).toBe(false);

    saveTheme('dark');
    expect(getStoredTheme()).toBe('dark');
    expect(document.documentElement.classList.contains('ion-palette-dark')).toBe(true);
  });

  it('applyTheme toggles palette class', () => {
    applyTheme('light');
    expect(document.documentElement.classList.contains('ion-palette-dark')).toBe(false);
    applyTheme('dark');
    expect(document.documentElement.classList.contains('ion-palette-dark')).toBe(true);
  });
});
