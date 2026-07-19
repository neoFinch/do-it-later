import { describe, expect, it } from 'vitest';
import { formatReviewDuration, getContentConsumeMinutes } from './content-duration';
import { ContentDocument } from '../types/content-document';

describe('formatReviewDuration', () => {
  it('formats singular minute', () => {
    expect(formatReviewDuration(1)).toBe('about 1 minute');
  });

  it('formats plural minutes under an hour', () => {
    expect(formatReviewDuration(6)).toBe('about 6 minutes');
  });

  it('formats whole hours', () => {
    expect(formatReviewDuration(120)).toBe('about 2 hours');
  });

  it('rounds up near the next hour', () => {
    expect(formatReviewDuration(419)).toBe('about 7 hours');
  });

  it('formats hours and minutes when both matter', () => {
    expect(formatReviewDuration(75)).toBe('about 1 hour 15 minutes');
  });
});

describe('getContentConsumeMinutes', () => {
  it('uses default when document is missing', () => {
    expect(getContentConsumeMinutes(null)).toBe(2);
  });

  it('estimates reading time from article text', () => {
    const document: ContentDocument = {
      captureId: '1',
      title: null,
      description: null,
      articleText: 'word '.repeat(440),
      transcript: null,
      author: null,
      publishedAt: null,
      duration: null,
      thumbnail: null,
      source: 'article',
      extractedAt: Date.now()
    };

    expect(getContentConsumeMinutes(document)).toBe(2);
  });
});
