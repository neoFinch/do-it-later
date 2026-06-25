import { describe, expect, it } from 'vitest';
import {
  cleanTitle,
  getCaptureDisplayTitle,
  isDirtyShareTitle,
  isGarbageTitle,
  suggestTitle,
  titlesAreEquivalent
} from './title.service';
import { Capture } from '../types/capture';

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

  it('extracts Instagram captions from share titles', () => {
    expect(
      cleanTitle(
        'Rishika Khajuria on Instagram: "Mindset for this year . . . . . . . Mindset,winning"'
      )
    ).toBe('Mindset for this year . . . . . . . Mindset,winning');

    expect(
      cleanTitle('searchgoodsmovies on Instagram: "Link in Bio & ;& ; In The Furious, Wang Wei is pushed"')
    ).toBe('Link in Bio In The Furious, Wang Wei is pushed');
  });

  it('falls back to author when Instagram caption is garbage', () => {
    expect(cleanTitle('kanye west self motivation slogans on Instagram: ""')).toBe(
      'kanye west self motivation slogans'
    );
  });

  it('treats broken entity-only titles as garbage', () => {
    expect(isGarbageTitle('& ;& ;.')).toBe(true);
    expect(cleanTitle('& ;& ;.')).toBe('');
  });

  it('keeps clean YouTube titles intact', () => {
    expect(cleanTitle('How to 10x Your Value in the A.I. Era | ft. Kunal Shah')).toBe(
      'How to 10x Your Value in the A.I. Era | ft. Kunal Shah'
    );
  });

  it('detects dirty share titles', () => {
    expect(isDirtyShareTitle('Rishika Khajuria on Instagram: "Mindset"', 'https://instagram.com/reel/abc')).toBe(
      true
    );
    expect(isDirtyShareTitle('How DoorDash Handles 100TB Logs Daily with OpenTelemetry')).toBe(false);
    expect(isDirtyShareTitle('https://example.com', 'https://example.com')).toBe(true);
  });

  it('builds display titles with URL fallback', () => {
    const capture: Capture = {
      id: '1',
      type: 'url',
      title: '& ;& ;.',
      url: 'https://dsta.sh/G5oWVK',
      status: 'INBOX',
      createdAt: Date.now()
    };

    expect(getCaptureDisplayTitle(capture)).toBe('dsta.sh');
  });
});
