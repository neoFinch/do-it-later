import { describe, expect, it } from 'vitest';
import { extractNoteContent } from './content-extractor.service';
import { Capture } from '../../types/capture';

describe('content-extractor.service', () => {
  it('extracts note content directly', () => {
    const capture: Capture = {
      id: 'note-1',
      type: 'note',
      title: 'OAuth notes',
      content: 'Remember to validate redirect URIs and rotate refresh tokens regularly.',
      url: null,
      source: null,
      thumbnail: null,
      status: 'INBOX',
      createdAt: Date.now()
    };

    const result = extractNoteContent(capture);
    expect(result.document.source).toBe('note');
    expect(result.document.articleText).toContain('redirect URIs');
    expect(result.estimatedReadingTime).toBeGreaterThan(0);
  });
});
