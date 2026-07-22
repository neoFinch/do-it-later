import { describe, expect, it } from 'vitest';
import { isDesktopViewport, isEditableKeyboardTarget } from './platform';

describe('isDesktopViewport', () => {
  it('treats 768px and above as desktop', () => {
    expect(isDesktopViewport(767)).toBe(false);
    expect(isDesktopViewport(768)).toBe(true);
    expect(isDesktopViewport(1280)).toBe(true);
  });
});

describe('isEditableKeyboardTarget', () => {
  it('detects native inputs', () => {
    const input = document.createElement('input');
    expect(isEditableKeyboardTarget(input)).toBe(true);
  });

  it('detects ion-searchbar ancestors', () => {
    const host = document.createElement('div');
    host.innerHTML = '<ion-searchbar><input /></ion-searchbar>';
    const input = host.querySelector('input');
    expect(isEditableKeyboardTarget(input)).toBe(true);
  });

  it('allows non-editable targets', () => {
    expect(isEditableKeyboardTarget(document.createElement('button'))).toBe(false);
  });
});
