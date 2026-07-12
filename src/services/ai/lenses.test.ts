import { describe, expect, it } from 'vitest';
import { getLensPack, normalizeLens } from './lenses';

describe('lenses', () => {
  it('normalizes unknown lenses to general', () => {
    expect(normalizeLens('nope')).toBe('general');
    expect(normalizeLens('movie')).toBe('movie');
  });

  it('exposes lens-specific scorecard metrics', () => {
    const health = getLensPack('health').metrics({ intensity: 'high', medicalAdviceRisk: 'medium' });
    expect(health.find((metric) => metric.label === 'Intensity')?.value).toBe('High');
  });
});
