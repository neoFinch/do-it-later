export type ThemePreference = 'light' | 'dark';

const STORAGE_KEY = 'later:theme';

export const getSystemTheme = (): ThemePreference => {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return 'dark';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const getStoredTheme = (): ThemePreference | null => {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
};

export const getActiveTheme = (): ThemePreference => {
  return getStoredTheme() ?? getSystemTheme();
};

export const applyTheme = (theme: ThemePreference): void => {
  document.documentElement.classList.toggle('ion-palette-dark', theme === 'dark');

  const themeColor = theme === 'dark' ? '#12161f' : '#faf8f4';
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
    meta.setAttribute('content', themeColor);
  });
};

export const saveTheme = (theme: ThemePreference): void => {
  localStorage.setItem(STORAGE_KEY, theme);
  applyTheme(theme);
};

export const initializeTheme = (): ThemePreference => {
  const theme = getActiveTheme();
  applyTheme(theme);
  return theme;
};

export const toggleTheme = (): ThemePreference => {
  const next: ThemePreference = getActiveTheme() === 'dark' ? 'light' : 'dark';
  saveTheme(next);
  return next;
};
