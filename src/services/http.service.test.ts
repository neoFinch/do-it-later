import { describe, expect, it } from 'vitest';
import { formatNetworkError } from './http.service';

describe('http.service', () => {
  it('maps browser fetch failures to a helpful message', () => {
    expect(formatNetworkError(new TypeError('Failed to fetch'))).toMatch(/browser|Android app/i);
  });

  it('maps timeout errors', () => {
    expect(formatNetworkError(new Error('Request timed out'))).toContain('timed out');
  });

  it('maps DNS resolution failures to a helpful message', () => {
    expect(
      formatNetworkError(new Error('Unable to resolve host "api.openai.com": No address associated with hostname'))
    ).toMatch(/Could not reach the server/i);
  });

  it('passes through other errors', () => {
    expect(formatNetworkError(new Error('HTTP 403'))).toBe('HTTP 403');
  });
});
