import { describe, expect, it } from 'vitest';
import { buildAnalysisPrompt } from './prompt-builder';
import { ContentDocument } from '../../types/content-document';

describe('prompt-builder', () => {
  it('builds multi-lens decision-focused prompt from note content', () => {
    const document: ContentDocument = {
      captureId: 'note-1',
      source: 'note',
      title: 'OAuth notes',
      articleText: 'Validate redirect URIs and rotate refresh tokens.',
      extractedAt: Date.now()
    };

    const prompt = buildAnalysisPrompt(document);
    expect(prompt.system).toContain('decide whether saved content deserves');
    expect(prompt.system).toContain('Do NOT force a software/learning lens');
    expect(prompt.system).toContain('Technology lens');
    expect(prompt.system).toContain('Movie / entertainment lens');
    expect(prompt.user).toContain('expectedValue');
    expect(prompt.user).toContain('potentialDisappointment');
    expect(prompt.user).toContain('youWillGet');
    expect(prompt.user).toContain('"lens"');
    expect(prompt.user).toContain('OAuth notes');
    expect(prompt.user).toContain('Estimated reading minutes');
  });

  it('builds compact prompt for on-device models', () => {
    const document: ContentDocument = {
      captureId: 'yt-1',
      source: 'youtube',
      title: 'Redis internals',
      transcript: 'Today we explore Redis memory model in depth.',
      duration: 1200,
      extractedAt: Date.now()
    };

    const prompt = buildAnalysisPrompt(document, { compact: true });
    expect(prompt.user).toContain('Keep lensFields small');
    expect(prompt.user).toContain('Redis internals');
    expect(prompt.user).toContain('Estimated watch minutes');
  });
});
