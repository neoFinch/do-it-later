import { Capacitor } from '@capacitor/core';

export type AppRuntime = 'web' | 'android' | 'ios' | 'electron' | 'unknown';

export const getAppRuntime = (): AppRuntime => {
  const platform = Capacitor.getPlatform();
  if (platform === 'web' || platform === 'android' || platform === 'ios' || platform === 'electron') {
    return platform;
  }
  return 'unknown';
};

export const isWebRuntime = (): boolean => getAppRuntime() === 'web';

export const isNativeRuntime = (): boolean => Capacitor.isNativePlatform();

/** Wide viewport suitable for keyboard-first / desktop UX (browser or future Electron). */
export const isDesktopViewport = (width = typeof window !== 'undefined' ? window.innerWidth : 0): boolean =>
  width >= 768;

export const prefersDesktopUx = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  const runtime = getAppRuntime();
  if (runtime === 'electron') {
    return true;
  }

  if (runtime === 'android' || runtime === 'ios') {
    return false;
  }

  return isDesktopViewport();
};

export const isEditableKeyboardTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
    return true;
  }

  if (target.isContentEditable) {
    return true;
  }

  return Boolean(target.closest('ion-input, ion-textarea, ion-searchbar, [contenteditable="true"]'));
};
