import { describe, expect, it } from 'vitest';
import { extractSharedText } from './share.service';

describe('share.service', () => {
  it('prefers shared texts over title', () => {
    const text = extractSharedText({
      title: 'Title only',
      texts: ['https://youtube.com/watch?v=abc123'],
      files: []
    });

    expect(text).toBe('https://youtube.com/watch?v=abc123');
  });

  it('falls back to title when texts are empty', () => {
    const text = extractSharedText({
      title: 'https://instagram.com/reel/abc123',
      texts: [''],
      files: []
    });

    expect(text).toBe('https://instagram.com/reel/abc123');
  });
});
