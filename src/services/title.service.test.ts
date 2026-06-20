import { describe, expect, it } from 'vitest';
import { cleanTitle, suggestTitle, titlesAreEquivalent } from './title.service';

describe('title.service', () => {
  it('removes hashtags and mentions', () => {
    expect(cleanTitle('Great talk #react #webdev @speaker')).toBe('Great talk');
  });

  it('removes platform suffixes', () => {
    expect(cleanTitle('How to build apps | YouTube')).toBe('How to build apps');
    expect(cleanTitle('Sunset reel - Instagram')).toBe('Sunset reel');
  });

  it('truncates long titles at word boundaries', () => {
    const longTitle = `${'word '.repeat(30).trim()} extra words`;
    expect(cleanTitle(longTitle, 40).length).toBeLessThanOrEqual(40);
  });

  it('suggestTitle matches cleanTitle for offline cleanup', () => {
    expect(suggestTitle('Watch: Demo video #launch | YouTube')).toBe('Demo video');
  });

  it('compares cleaned titles', () => {
    expect(titlesAreEquivalent('Hello #world', 'Hello')).toBe(true);
  });
});
