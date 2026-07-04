export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export type ContentType =
  | 'tutorial'
  | 'deep-dive'
  | 'reference'
  | 'news'
  | 'opinion'
  | 'other';

export type ImplementationLevel = 'none' | 'low' | 'medium' | 'high';

export type LearningStyle = 'conceptual' | 'mixed' | 'practical';

export type ExpectationLevel = 'low' | 'medium' | 'high';

export interface ViewerExpectation {
  youWillLearn: string[];
  youWillNotLearn: string[];
}

export interface AIAnalysis {
  captureId: string;
  topics: string[];
  difficulty: Difficulty;
  targetAudience: string[];
  contentType: ContentType;
  implementationLevel: ImplementationLevel;
  learningStyle: LearningStyle;
  codeWalkthrough: boolean;
  viewerExpectation: ViewerExpectation;
  expectedLearning: ExpectationLevel;
  potentialDisappointment: ExpectationLevel;
  recommendation: string;
  estimatedReadingTime: number | null;
  estimatedWatchTime: number | null;
  prerequisites: string[];
  learningOutcomes: string[];
  summary: string;
  keyTakeaways: string[];
  reasoning: string;
  confidence: number;
  analyzedAt: number;
}
