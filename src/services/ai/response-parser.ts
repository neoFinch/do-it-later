import {
  AIAnalysis,
  ANALYSIS_LENSES,
  AnalysisLens,
  ContentType,
  CURRENT_ANALYSIS_SCHEMA_VERSION,
  ExpectationLevel,
  ViewerExpectation
} from '../../types/ai-analysis';
import { ContentDocument } from '../../types/content-document';
import { normalizeLens } from './lenses';
import { deriveReadingMinutes, deriveWatchMinutes } from './prompt-builder';

const VALID_CONTENT_TYPES: ContentType[] = [
  'tutorial',
  'deep-dive',
  'reference',
  'news',
  'opinion',
  'entertainment',
  'other'
];
const VALID_EXPECTATION_LEVELS: ExpectationLevel[] = ['low', 'medium', 'high'];

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
};

const normalizeContentType = (value: unknown): ContentType => {
  if (typeof value === 'string' && VALID_CONTENT_TYPES.includes(value as ContentType)) {
    return value as ContentType;
  }
  return 'other';
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
    const youWillGet = normalizeStringArray(record.youWillGet ?? record.youWillLearn);
    const youWillNotGet = normalizeStringArray(record.youWillNotGet ?? record.youWillNotLearn);
    return { youWillGet, youWillNotGet };
  }
  return { youWillGet: [], youWillNotGet: [] };
};

const normalizeLensFields = (value: unknown): Record<string, unknown> => {
  if (typeof value === 'object' && value && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
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

/** Lift legacy top-level tech fields into lensFields when the model still emits them. */
const coalesceLensFields = (raw: Record<string, unknown>, lens: AnalysisLens): Record<string, unknown> => {
  const fields = normalizeLensFields(raw.lensFields);
  if (lens === 'technology') {
    if (raw.implementationLevel != null && fields.implementationLevel == null) {
      fields.implementationLevel = raw.implementationLevel;
    }
    if (raw.learningStyle != null && fields.learningStyle == null) {
      fields.learningStyle = raw.learningStyle;
    }
    if (raw.codeWalkthrough != null && fields.codeWalkthrough == null) {
      fields.codeWalkthrough = raw.codeWalkthrough;
    }
    if (raw.difficulty != null && fields.difficulty == null) {
      fields.difficulty = raw.difficulty;
    }
    if (raw.prerequisites != null && fields.prerequisites == null) {
      fields.prerequisites = raw.prerequisites;
    }
  }
  return fields;
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
  const lens = normalizeLens(raw.lens);

  return {
    schemaVersion: CURRENT_ANALYSIS_SCHEMA_VERSION,
    captureId,
    lens,
    summary:
      typeof raw.summary === 'string'
        ? raw.summary.trim()
        : typeof raw.recommendation === 'string'
          ? raw.recommendation.trim()
          : '',
    topics: normalizeStringArray(raw.topics),
    contentType: normalizeContentType(raw.contentType),
    targetAudience: normalizeStringArray(raw.targetAudience),
    estimatedReadingTime: normalizeNullableNumber(raw.estimatedReadingTime) ?? fallbackReadingTime,
    estimatedWatchTime: normalizeNullableNumber(raw.estimatedWatchTime) ?? fallbackWatchTime,
    viewerExpectation: normalizeViewerExpectation(raw.viewerExpectation),
    expectedValue: normalizeExpectationLevel(raw.expectedValue ?? raw.expectedLearning, 'medium'),
    potentialDisappointment: normalizeExpectationLevel(raw.potentialDisappointment, 'medium'),
    lensFields: coalesceLensFields(raw, lens),
    recommendation: typeof raw.recommendation === 'string' ? raw.recommendation.trim() : '',
    reasoning: typeof raw.reasoning === 'string' ? raw.reasoning.trim() : '',
    confidence: Number.isFinite(confidence) ? Math.min(1, Math.max(0, confidence)) : 0.5,
    analyzedAt: Date.now()
  };
};

export { ANALYSIS_LENSES };
