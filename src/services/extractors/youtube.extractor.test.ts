import { describe, expect, it } from 'vitest';
import {
  buildCaptionFetchUrls,
  parseCaptionTracksFromHtml,
  parseTranscriptJson3,
  parseTranscriptPayload,
  parseTranscriptVtt,
  parseTranscriptXml,
  pickCaptionTrack
} from './youtube.extractor';

describe('youtube.extractor', () => {
  it('parses caption tracks from watch page html', () => {
    const html = `
      <script>
        ytInitialPlayerResponse = {
          "captions": {
            "playerCaptionsTracklistRenderer": {
              "captionTracks": [
                {
                  "baseUrl": "https://www.youtube.com/api/timedtext?v=abc&lang=en&fmt=srv3",
                  "languageCode": "en",
                  "kind": "asr"
                }
              ]
            }
          },
          "videoDetails": { "lengthSeconds": "125" }
        };
      </script>
    `;

    const tracks = parseCaptionTracksFromHtml(html);
    expect(tracks).toHaveLength(1);
    expect(tracks[0].languageCode).toBe('en');
  });

  it('builds json3 caption urls by replacing fmt', () => {
    const urls = buildCaptionFetchUrls('https://www.youtube.com/api/timedtext?v=abc&lang=en&fmt=srv3');
    expect(urls[0]).toContain('fmt=json3');
    expect(urls[0]).toContain('c=WEB');
    expect(urls[0]).not.toContain('fmt=srv3');
  });

  it('parses json3 transcript payloads', () => {
    const payload = JSON.stringify({
      events: [
        { segs: [{ utf8: 'Hello ' }, { utf8: 'world' }] },
        { segs: [{ utf8: 'Welcome back' }] }
      ]
    });

    expect(parseTranscriptJson3(payload)).toBe('Hello world Welcome back');
    expect(parseTranscriptPayload(payload)).toBe('Hello world Welcome back');
  });

  it('parses xml and vtt transcript payloads', () => {
    const xml = '<transcript><text start="0" dur="1">Hello there</text></transcript>';
    const vtt = 'WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nHello there';

    expect(parseTranscriptXml(xml)).toBe('Hello there');
    expect(parseTranscriptVtt(vtt)).toBe('Hello there');
    expect(parseTranscriptPayload(xml)).toBe('Hello there');
    expect(parseTranscriptPayload(vtt)).toBe('Hello there');
  });

  it('prefers english manual captions over auto-generated when available', () => {
    const tracks = pickCaptionTrack([
      { languageCode: 'es', baseUrl: 'https://example.com/es' },
      { languageCode: 'en', kind: 'asr', baseUrl: 'https://example.com/en-asr' },
      { languageCode: 'en', baseUrl: 'https://example.com/en' }
    ]);

    expect(tracks?.baseUrl).toBe('https://example.com/en');
  });
});
