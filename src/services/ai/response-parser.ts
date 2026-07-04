import {
  AIAnalysis,
  ContentType,
  Difficulty,
  ExpectationLevel,
  ImplementationLevel,
  LearningStyle,
  ViewerExpectation
} from '../../types/ai-analysis';
import { ContentDocument } from '../../types/content-document';
import { deriveReadingMinutes, deriveWatchMinutes } from './prompt-builder';

const VALID_DIFFICULTIES: Difficulty[] = ['beginner', 'intermediate', 'advanced'];
const VALID_CONTENT_TYPES: ContentType[] = [
  'tutorial',
  'deep-dive',
  'reference',
  'news',
  'opinion',
  'other'
];
const VALID_IMPLEMENTATION_LEVELS: ImplementationLevel[] = ['none', 'low', 'medium', 'high'];
const VALID_LEARNING_STYLES: LearningStyle[] = ['conceptual', 'mixed', 'practical'];
const VALID_EXPECTATION_LEVELS: ExpectationLevel[] = ['low', 'medium', 'high'];

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
};

const normalizeDifficulty = (value: unknown): Difficulty => {
  if (typeof value === 'string' && VALID_DIFFICULTIES.includes(value as Difficulty)) {
    return value as Difficulty;
  }
  return 'intermediate';
};

const normalizeContentType = (value: unknown): ContentType => {
  if (typeof value === 'string' && VALID_CONTENT_TYPES.includes(value as ContentType)) {
    return value as ContentType;
  }
  return 'other';
};

const normalizeImplementationLevel = (value: unknown): ImplementationLevel => {
  if (typeof value === 'string' && VALID_IMPLEMENTATION_LEVELS.includes(value as ImplementationLevel)) {
    return value as ImplementationLevel;
  }
  return 'none';
};

const normalizeLearningStyle = (value: unknown): LearningStyle => {
  if (typeof value === 'string' && VALID_LEARNING_STYLES.includes(value as LearningStyle)) {
    return value as LearningStyle;
  }
  return 'conceptual';
};

const normalizeExpectationLevel = (value: unknown, fallback: ExpectationLevel = 'medium'): ExpectationLevel => {
  if (typeof value === 'string' && VALID_EXPECTATION_LEVELS.includes(value as ExpectationLevel)) {
    return value as ExpectationLevel;
  }
  return fallback;
};

const normalizeViewerExpectation = (value: unknown): ViewerExpectation => {
  if (typeof value === 'object' && value) {
    const record = value as Record<string, unknown>;
    return {
      youWillLearn: normalizeStringArray(record.youWillLearn),
      youWillNotLearn: normalizeStringArray(record.youWillNotLearn)
    };
  }
  return { youWillLearn: [], youWillNotLearn: [] };
};

const normalizeNullableNumber = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
};

const extractJsonObject = (text: string): Record<string, unknown> => {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
    }
    throw new Error('AI response did not contain valid JSON.');
  }
};

export const parseAnalysisResponse = (
  captureId: string,
  rawText: string,
  document: ContentDocument
): AIAnalysis => {
  const raw = extractJsonObject(rawText);
  const fallbackReadingTime = deriveReadingMinutes(document);
  const fallbackWatchTime = deriveWatchMinutes(document);
  const confidence = Number(raw.confidence);

  return {
    captureId,
    topics: normalizeStringArray(raw.topics),
    difficulty: normalizeDifficulty(raw.difficulty),
    targetAudience: normalizeStringArray(raw.targetAudience),
    contentType: normalizeContentType(raw.contentType),
    implementationLevel: normalizeImplementationLevel(raw.implementationLevel),
    learningStyle: normalizeLearningStyle(raw.learningStyle),
    codeWalkthrough: Boolean(raw.codeWalkthrough),
    viewerExpectation: normalizeViewerExpectation(raw.viewerExpectation),
    expectedLearning: normalizeExpectationLevel(raw.expectedLearning, 'medium'),
    potentialDisappointment: normalizeExpectationLevel(raw.potentialDisappointment, 'medium'),
    recommendation: typeof raw.recommendation === 'string' ? raw.recommendation.trim() : '',
    estimatedReadingTime: normalizeNullableNumber(raw.estimatedReadingTime) ?? fallbackReadingTime,
    estimatedWatchTime: normalizeNullableNumber(raw.estimatedWatchTime) ?? fallbackWatchTime,
    prerequisites: normalizeStringArray(raw.prerequisites),
    learningOutcomes: normalizeStringArray(raw.learningOutcomes),
    summary: typeof raw.summary === 'string' ? raw.summary.trim() : typeof raw.recommendation === 'string' ? raw.recommendation.trim() : '',
    keyTakeaways: normalizeStringArray(raw.keyTakeaways),
    reasoning: typeof raw.reasoning === 'string' ? raw.reasoning.trim() : '',
    confidence: Number.isFinite(confidence) ? Math.min(1, Math.max(0, confidence)) : 0.5,
    analyzedAt: Date.now()
  };
};
