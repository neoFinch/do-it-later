import { describe, expect, it } from 'vitest';
import { parseOpenGraphMetadata } from './metadata.service';

describe('parseOpenGraphMetadata', () => {
  it('extracts Open Graph title and image', () => {
    const html = `
      <html>
        <head>
          <meta property="og:title" content="Example Video" />
          <meta property="og:image" content="https://cdn.example.com/thumb.jpg" />
          <meta property="og:site_name" content="YouTube" />
        </head>
      </html>
    `;

    expect(parseOpenGraphMetadata(html)).toEqual({
      title: 'Example Video',
      thumbnail: 'https://cdn.example.com/thumb.jpg',
      source: 'YouTube'
    });
  });

  it('falls back to title tag when og:title is missing', () => {
    const html = '<html><head><title>Page Title</title></head></html>';

    expect(parseOpenGraphMetadata(html)).toEqual({
      title: 'Page Title',
      thumbnail: undefined,
      source: undefined
    });
  });

  it('decodes HTML entities in metadata values', () => {
    const html =
      '<meta property="og:title" content="Tom &amp; Jerry" /><meta property="og:image" content="https://example.com/a&amp;b.jpg" />';

    expect(parseOpenGraphMetadata(html)).toEqual({
      title: 'Tom & Jerry',
      thumbnail: 'https://example.com/a&b.jpg',
      source: undefined
    });
  });

  it('falls back to embedded JSON thumbnail when og meta tags are missing', () => {
    const html =
      '<script>{"display_url":"https://cdn.example.com/reel.jpg","caption":"Hello"}</script>';

    expect(parseOpenGraphMetadata(html)).toEqual({
      title: undefined,
      thumbnail: 'https://cdn.example.com/reel.jpg',
      source: undefined
    });
  });
});
