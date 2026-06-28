import { describe, expect, it } from 'vitest';
import { getPlatformThumbnailUrl, getYouTubeThumbnailUrl, pickThumbnailUrl, resolveAbsoluteUrl } from './thumbnail.service';

describe('thumbnail.service', () => {
  it('builds YouTube thumbnail from video id', () => {
    expect(getYouTubeThumbnailUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(
      'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg'
    );
    expect(getYouTubeThumbnailUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(
      'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg'
    );
  });

  it('resolves relative og:image URLs against the page URL', () => {
    expect(resolveAbsoluteUrl('https://example.com/page', '/images/thumb.jpg')).toBe(
      'https://example.com/images/thumb.jpg'
    );
  });

  it('prefers explicit thumbnail over platform fallback', () => {
    expect(
      pickThumbnailUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ', ['https://cdn.example.com/custom.jpg'])
    ).toBe('https://cdn.example.com/custom.jpg');
  });

  it('falls back to platform thumbnail when og:image is missing', () => {
    expect(pickThumbnailUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ', [])).toBe(
      'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg'
    );
    expect(getPlatformThumbnailUrl('https://example.com/article')).toBeNull();
  });
});
