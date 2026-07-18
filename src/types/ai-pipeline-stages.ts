import {
  AIAnalysis,
  AnalysisLens,
  ContentType,
  CURRENT_ANALYSIS_SCHEMA_VERSION,
  ExpectationLevel,
  ViewerExpectation
} from './ai-analysis';

/** Schema version for per-stage persisted output. Bump when a stage's fields change. */
export const CURRENT_PIPELINE_STAGE_SCHEMA_VERSION = 1;

export type PipelineStage = 'understand' | 'classify' | 'enrich' | 'evaluate';

export const PIPELINE_STAGES: PipelineStage[] = ['understand', 'classify', 'enrich', 'evaluate'];

export interface UnderstandResult {
  schemaVersion: number;
  captureId: string;
  summary: string;
  topics: string[];
  targetAudience: string[];
  estimatedReadingTime: number | null;
  estimatedWatchTime: number | null;
  completedAt: number;
}

export interface ClassifyResult {
  schemaVersion: number;
  captureId: string;
  lens: AnalysisLens;
  contentType: ContentType;
  completedAt: number;
}

export interface EnrichResult {
  schemaVersion: number;
  captureId: string;
  viewerExpectation: ViewerExpectation;
  lensFields: Record<string, unknown>;
  completedAt: number;
}

export interface EvaluateResult {
  schemaVersion: number;
  captureId: string;
  expectedValue: ExpectationLevel;
  potentialDisappointment: ExpectationLevel;
  recommendation: string;
  reasoning: string;
  confidence: number;
  completedAt: number;
}

export interface PipelineStageResults {
  understand: UnderstandResult | null;
  classify: ClassifyResult | null;
  enrich: EnrichResult | null;
  evaluate: EvaluateResult | null;
}

export const splitAnalysisIntoStages = (analysis: AIAnalysis): PipelineStageResults => {
  const completedAt = analysis.analyzedAt;

  return {
    understand: {
      schemaVersion: CURRENT_PIPELINE_STAGE_SCHEMA_VERSION,
      captureId: analysis.captureId,
      summary: analysis.summary,
      topics: analysis.topics,
      targetAudience: analysis.targetAudience,
      estimatedReadingTime: analysis.estimatedReadingTime,
      estimatedWatchTime: analysis.estimatedWatchTime,
      completedAt
    },
    classify: {
      schemaVersion: CURRENT_PIPELINE_STAGE_SCHEMA_VERSION,
      captureId: analysis.captureId,
      lens: analysis.lens,
      contentType: analysis.contentType,
      completedAt
    },
    enrich: {
      schemaVersion: CURRENT_PIPELINE_STAGE_SCHEMA_VERSION,
      captureId: analysis.captureId,
      viewerExpectation: analysis.viewerExpectation,
      lensFields: analysis.lensFields,
      completedAt
    },
    evaluate: {
      schemaVersion: CURRENT_PIPELINE_STAGE_SCHEMA_VERSION,
      captureId: analysis.captureId,
      expectedValue: analysis.expectedValue,
      potentialDisappointment: analysis.potentialDisappointment,
      recommendation: analysis.recommendation,
      reasoning: analysis.reasoning,
      confidence: analysis.confidence,
      completedAt
    }
  };
};

export const composeAnalysisFromStages = (stages: PipelineStageResults): AIAnalysis | null => {
  const { understand, classify, enrich, evaluate } = stages;
  if (!understand || !classify || !enrich || !evaluate) {
    return null;
  }

  const analyzedAt = Math.max(
    understand.completedAt,
    classify.completedAt,
    enrich.completedAt,
    evaluate.completedAt
  );

  return {
    schemaVersion: CURRENT_ANALYSIS_SCHEMA_VERSION,
    captureId: understand.captureId,
    lens: classify.lens,
    summary: understand.summary,
    topics: understand.topics,
    contentType: classify.contentType,
    targetAudience: understand.targetAudience,
    estimatedReadingTime: understand.estimatedReadingTime,
    estimatedWatchTime: understand.estimatedWatchTime,
    viewerExpectation: enrich.viewerExpectation,
    expectedValue: evaluate.expectedValue,
    potentialDisappointment: evaluate.potentialDisappointment,
    lensFields: enrich.lensFields,
    recommendation: evaluate.recommendation,
    reasoning: evaluate.reasoning,
    confidence: evaluate.confidence,
    analyzedAt
  };
};

export const isPipelineComplete = (stages: PipelineStageResults): boolean =>
  !!stages.understand && !!stages.classify && !!stages.enrich && !!stages.evaluate;
