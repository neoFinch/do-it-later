import { describe, expect, it } from 'vitest';
import {
  detectLinkPlatform,
  canonicalizeCaptureUrl,
  extractFirstUrl,
  extractYouTubeVideoId,
  getNativeAppUrl,
  getOpenLinkLabel,
  normalizeUrl
} from './link.service';

describe('link.service', () => {
  it('normalizes urls without protocol', () => {
    expect(normalizeUrl('example.com/page')).toBe('https://example.com/page');
  });

  it('canonicalizes urls for duplicate detection', () => {
    expect(canonicalizeCaptureUrl('https://WWW.Example.com/page/')).toBe('https://example.com/page');
    expect(canonicalizeCaptureUrl('example.com/page')).toBe('https://example.com/page');
    expect(canonicalizeCaptureUrl('https://example.com/page#section')).toBe('https://example.com/page');
    expect(canonicalizeCaptureUrl('https://www.youtube.com/watch?v=abc123&si=tracking')).toBe(
      'https://youtube.com/watch?v=abc123'
    );
    expect(canonicalizeCaptureUrl('https://youtu.be/abc123/')).toBe('https://youtube.com/watch?v=abc123');
  });

  it('extracts the first url from text', () => {
    expect(extractFirstUrl('Check this https://youtu.be/abc123 now')).toBe('https://youtu.be/abc123');
  });

  it('extracts youtube video ids from common urls', () => {
    expect(extractYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(extractYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(extractYouTubeVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(extractYouTubeVideoId('https://youtube.com/watch?v=L1Npx-fBing/')).toBe('L1Npx-fBing');
    expect(extractYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s')).toBe('dQw4w9WgXcQ');
  });

  it('detects supported platforms', () => {
    expect(detectLinkPlatform('https://www.youtube.com/watch?v=abc')).toBe('youtube');
    expect(detectLinkPlatform('https://www.instagram.com/reel/abc/')).toBe('instagram');
    expect(detectLinkPlatform('https://example.com')).toBe('generic');
  });

  it('builds native app urls for supported platforms', () => {
    expect(getNativeAppUrl('https://www.instagram.com/p/abc123/')).toBe('instagram://www.instagram.com/p/abc123/');
    expect(getOpenLinkLabel('https://www.youtube.com/watch?v=abc')).toBe('Open in YouTube');
  });
});
