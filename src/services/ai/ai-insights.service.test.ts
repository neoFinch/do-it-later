import { describe, expect, it } from 'vitest';
import { buildAiInsightsView } from './ai-insights.service';
import { AIAnalysis, CURRENT_ANALYSIS_SCHEMA_VERSION } from '../../types/ai-analysis';

const analysis: AIAnalysis = {
  schemaVersion: CURRENT_ANALYSIS_SCHEMA_VERSION,
  captureId: 'capture-1',
  lens: 'technology',
  summary: 'A practical walkthrough of React Server Components.',
  topics: ['react', 'rsc'],
  contentType: 'tutorial',
  targetAudience: ['frontend developers'],
  estimatedReadingTime: 14,
  estimatedWatchTime: null,
  viewerExpectation: {
    youWillGet: ['Architecture overview'],
    youWillNotGet: ['Beginner React basics']
  },
  expectedValue: 'high',
  potentialDisappointment: 'low',
  lensFields: {
    learningStyle: 'mixed',
    implementationLevel: 'medium'
  },
  recommendation: 'Worth reading if you already know React hooks.',
  reasoning: 'High signal for intermediate builders.',
  confidence: 0.82,
  analyzedAt: Date.now()
};

describe('ai-insights.service', () => {
  it('maps analysis into stage-aligned insight sections', () => {
    const view = buildAiInsightsView(analysis);

    expect(view.understand.summary).toContain('React Server Components');
    expect(view.understand.topics).toEqual(['react', 'rsc']);
    expect(view.understand.estimatedTimeLabel).toBe('~14 min read');
    expect(view.classify.lensLabel).toBe('Technology');
    expect(view.classify.contentTypeLabel).toBe('Tutorial');
    expect(view.enrich.youWillGet).toEqual(['Architecture overview']);
    expect(view.enrich.lensMetrics.length).toBeGreaterThan(0);
    expect(view.evaluate.recommendationLabel).toBe('Read now');
    expect(view.evaluate.expectedValueLabel).toBe('High');
    expect(view.evaluate.confidencePercent).toBe(82);
  });

  it('uses watch time when available', () => {
    const view = buildAiInsightsView({
      ...analysis,
      estimatedReadingTime: null,
      estimatedWatchTime: 22
    });

    expect(view.understand.estimatedTimeLabel).toBe('~22 min watch');
  });
});
