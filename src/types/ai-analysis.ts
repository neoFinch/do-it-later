export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export type ContentType =
  | 'tutorial'
  | 'deep-dive'
  | 'reference'
  | 'news'
  | 'opinion'
  | 'entertainment'
  | 'other';

export type ExpectationLevel = 'low' | 'medium' | 'high';

export type ImplementationLevel = 'none' | 'low' | 'medium' | 'high';

export type LearningStyle = 'conceptual' | 'mixed' | 'practical';

export type AnalysisLens =
  | 'technology'
  | 'science'
  | 'health'
  | 'art'
  | 'movie'
  | 'finance'
  | 'productivity'
  | 'news'
  | 'general';

export const ANALYSIS_LENSES: AnalysisLens[] = [
  'technology',
  'science',
  'health',
  'art',
  'movie',
  'finance',
  'productivity',
  'news',
  'general'
];

/** Current persisted analysis schema. Bump when fields/semantics change. */
export const CURRENT_ANALYSIS_SCHEMA_VERSION = 5;

export interface ViewerExpectation {
  youWillGet: string[];
  youWillNotGet: string[];
}

export interface ScorecardMetric {
  label: string;
  value: string;
}

export interface AIAnalysis {
  schemaVersion: number;
  captureId: string;
  lens: AnalysisLens;
  summary: string;
  topics: string[];
  contentType: ContentType;
  targetAudience: string[];
  estimatedReadingTime: number | null;
  estimatedWatchTime: number | null;
  viewerExpectation: ViewerExpectation;
  expectedValue: ExpectationLevel;
  potentialDisappointment: ExpectationLevel;
  /** Lens-specific structured fields (discriminated by `lens`). */
  lensFields: Record<string, unknown>;
  recommendation: string;
  reasoning: string;
  confidence: number;
  analyzedAt: number;
}

export interface TechnologyLensFields {
  difficulty?: Difficulty;
  prerequisites?: string[];
  implementationLevel?: ImplementationLevel;
  learningStyle?: LearningStyle;
  codeWalkthrough?: boolean;
}

export interface MovieLensFields {
  genre?: string;
  mood?: string;
  spoilerRisk?: ExpectationLevel;
  whyWatch?: string;
}

export interface HealthLensFields {
  exerciseType?: string;
  equipmentNeeded?: string;
  intensity?: ExpectationLevel;
  medicalAdviceRisk?: ExpectationLevel;
}
