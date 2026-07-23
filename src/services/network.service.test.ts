import { describe, expect, it, vi } from 'vitest';
import { assertNetworkOnline, isNetworkOnline, OFFLINE_ERROR_MESSAGE } from './network.service';

describe('network.service', () => {
  it('reports online when navigator.onLine is true', () => {
    vi.stubGlobal('navigator', { onLine: true });
    expect(isNetworkOnline()).toBe(true);
    expect(() => assertNetworkOnline()).not.toThrow();
  });

  it('reports offline when navigator.onLine is false', () => {
    vi.stubGlobal('navigator', { onLine: false });
    expect(isNetworkOnline()).toBe(false);
    expect(() => assertNetworkOnline()).toThrow(OFFLINE_ERROR_MESSAGE);
  });
});
