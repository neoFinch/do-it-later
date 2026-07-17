import { describe, expect, it } from 'vitest';
import { getExtractedText } from './CaptureExtractedContent';
import { ContentDocument } from '../types/content-document';

describe('CaptureExtractedContent helpers', () => {
  it('prefers transcript over article text', () => {
    const document: ContentDocument = {
      captureId: 'c1',
      source: 'youtube',
      articleText: 'Article body',
      transcript: 'Spoken transcript',
      extractedAt: Date.now()
    };

    expect(getExtractedText(document)).toBe('Spoken transcript');
  });

  it('falls back to article text when transcript is empty', () => {
    const document: ContentDocument = {
      captureId: 'c1',
      source: 'instagram',
      articleText: 'Caption with #fitness #motivation',
      extractedAt: Date.now()
    };

    expect(getExtractedText(document)).toBe('Caption with #fitness #motivation');
  });
});
