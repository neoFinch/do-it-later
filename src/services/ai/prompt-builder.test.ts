import { describe, expect, it } from 'vitest';
import { buildAnalysisPrompt } from './prompt-builder';
import { ContentDocument } from '../../types/content-document';

describe('prompt-builder', () => {
  it('builds prompt from note content', () => {
    const document: ContentDocument = {
      captureId: 'note-1',
      source: 'note',
      title: 'OAuth notes',
      articleText: 'Validate redirect URIs and rotate refresh tokens.',
      extractedAt: Date.now()
    };

    const prompt = buildAnalysisPrompt(document);
    expect(prompt.system).toContain('personal learning inbox');
    expect(prompt.user).toContain('OAuth notes');
    expect(prompt.user).toContain('Validate redirect URIs');
    expect(prompt.user).toContain('Estimated reading minutes');
  });

  it('builds prompt from youtube transcript', () => {
    const document: ContentDocument = {
      captureId: 'yt-1',
      source: 'youtube',
      title: 'Redis internals',
      transcript: 'Today we explore Redis memory model in depth.',
      duration: 1200,
      extractedAt: Date.now()
    };

    const prompt = buildAnalysisPrompt(document);
    expect(prompt.user).toContain('Redis internals');
    expect(prompt.user).toContain('Redis memory model');
    expect(prompt.user).toContain('Estimated watch minutes');
  });
});
