import { describe, expect, it } from 'vitest';
import { getDocumentAnalysisBody, hasUsableExtractedContent } from './document-body';
import { ContentDocument } from '../../types/content-document';

describe('document-body', () => {
  it('prefers transcript over article text', () => {
    const document: ContentDocument = {
      captureId: '1',
      source: 'youtube',
      transcript: 'Transcript body here with enough characters.',
      articleText: 'Article body',
      extractedAt: Date.now()
    };
    expect(getDocumentAnalysisBody(document)).toContain('Transcript body');
  });

  it('falls back to description when body is empty', () => {
    const document: ContentDocument = {
      captureId: '1',
      source: 'article',
      description: 'A short description that is still usable for analysis.',
      extractedAt: Date.now()
    };
    expect(hasUsableExtractedContent(document)).toBe(true);
    expect(getDocumentAnalysisBody(document)).toContain('short description');
  });

  it('rejects empty documents', () => {
    const document: ContentDocument = {
      captureId: '1',
      source: 'article',
      extractedAt: Date.now()
    };
    expect(hasUsableExtractedContent(document)).toBe(false);
  });
});
