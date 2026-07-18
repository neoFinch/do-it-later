import { describe, expect, it } from 'vitest';
import {
  composeAnalysisFromStages,
  splitAnalysisIntoStages
} from './ai-pipeline-stages';
import { AIAnalysis, CURRENT_ANALYSIS_SCHEMA_VERSION } from './ai-analysis';

const sampleAnalysis: AIAnalysis = {
  schemaVersion: CURRENT_ANALYSIS_SCHEMA_VERSION,
  captureId: 'capture-1',
  lens: 'technology',
  summary: 'A useful tutorial',
  topics: ['typescript'],
  contentType: 'tutorial',
  targetAudience: ['developers'],
  estimatedReadingTime: 10,
  estimatedWatchTime: null,
  viewerExpectation: {
    youWillGet: ['Practical patterns'],
    youWillNotGet: ['Beginner basics']
  },
  expectedValue: 'high',
  potentialDisappointment: 'low',
  lensFields: { difficulty: 'intermediate' },
  recommendation: 'Read now',
  reasoning: 'High signal content',
  confidence: 0.9,
  analyzedAt: 1_700_000_000_000
};

describe('ai-pipeline-stages', () => {
  it('splits and composes analysis without data loss', () => {
    const stages = splitAnalysisIntoStages(sampleAnalysis);
    const composed = composeAnalysisFromStages(stages);

    expect(stages.understand?.summary).toBe('A useful tutorial');
    expect(stages.classify?.lens).toBe('technology');
    expect(stages.enrich?.viewerExpectation.youWillGet).toEqual(['Practical patterns']);
    expect(stages.evaluate?.expectedValue).toBe('high');
    expect(composed).toEqual(sampleAnalysis);
  });

  it('returns null when any stage is missing', () => {
    const stages = splitAnalysisIntoStages(sampleAnalysis);
    expect(
      composeAnalysisFromStages({
        ...stages,
        evaluate: null
      })
    ).toBeNull();
  });
});
