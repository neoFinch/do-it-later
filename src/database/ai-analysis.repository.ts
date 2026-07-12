import { Capacitor } from '@capacitor/core';
import {
  AIAnalysis,
  AnalysisLens,
  ContentType,
  CURRENT_ANALYSIS_SCHEMA_VERSION,
  ExpectationLevel,
  ViewerExpectation
} from '../types/ai-analysis';
import { normalizeLens } from '../services/ai/lenses';
import { parseJsonArray, stringifyJsonArray } from '../utils/json-field';
import { getDatabase, initDatabase } from './sqlite';

const isWeb = Capacitor.getPlatform() === 'web';
const STORAGE_KEY = 'later:ai_analysis_v5';
const LEGACY_STORAGE_KEYS = ['later:ai_analysis_v3'];

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

const normalizeContentType = (value: unknown): ContentType => {
  if (typeof value === 'string' && VALID_CONTENT_TYPES.includes(value as ContentType)) {
    return value as ContentType;
  }
  return 'other';
};

const normalizeExpectationLevel = (value: unknown): ExpectationLevel => {
  if (typeof value === 'string' && VALID_EXPECTATION_LEVELS.includes(value as ExpectationLevel)) {
    return value as ExpectationLevel;
  }
  return 'medium';
};

const normalizeViewerExpectation = (item: Record<string, unknown>): ViewerExpectation => {
  const nested = item.viewerExpectation as Record<string, unknown> | undefined;
  if (nested && typeof nested === 'object') {
    return {
      youWillGet: parseJsonArray(nested.youWillGet ?? nested.youWillLearn),
      youWillNotGet: parseJsonArray(nested.youWillNotGet ?? nested.youWillNotLearn)
    };
  }
  return {
    youWillGet: parseJsonArray(item.youWillGet ?? item.youWillLearn),
    youWillNotGet: parseJsonArray(item.youWillNotGet ?? item.youWillNotLearn)
  };
};

const buildLegacyLensFields = (item: Record<string, unknown>): Record<string, unknown> => {
  if (item.lensFields && typeof item.lensFields === 'object' && !Array.isArray(item.lensFields)) {
    return item.lensFields as Record<string, unknown>;
  }
  const fields: Record<string, unknown> = {};
  if (item.implementationLevel != null) {
    fields.implementationLevel = item.implementationLevel;
  }
  if (item.learningStyle != null) {
    fields.learningStyle = item.learningStyle;
  }
  if (item.codeWalkthrough != null) {
    fields.codeWalkthrough = item.codeWalkthrough;
  }
  if (item.difficulty != null) {
    fields.difficulty = item.difficulty;
  }
  if (item.prerequisites != null) {
    fields.prerequisites = Array.isArray(item.prerequisites)
      ? item.prerequisites
      : parseJsonArray(item.prerequisites);
  }
  return fields;
};

const normalizeStoredAnalysis = (item: Record<string, unknown>): AIAnalysis => {
  const viewerExpectation = normalizeViewerExpectation(item);
  const lens = normalizeLens(item.lens ?? 'technology');

  return {
    schemaVersion: Number(item.schemaVersion) || CURRENT_ANALYSIS_SCHEMA_VERSION,
    captureId: String(item.captureId),
    lens,
    summary: String(item.summary ?? ''),
    topics: parseJsonArray(item.topics),
    contentType: normalizeContentType(item.contentType),
    targetAudience: parseJsonArray(item.targetAudience),
    estimatedReadingTime: item.estimatedReadingTime != null ? Number(item.estimatedReadingTime) : null,
    estimatedWatchTime: item.estimatedWatchTime != null ? Number(item.estimatedWatchTime) : null,
    viewerExpectation,
    expectedValue: normalizeExpectationLevel(item.expectedValue ?? item.expectedLearning),
    potentialDisappointment: normalizeExpectationLevel(item.potentialDisappointment),
    lensFields: buildLegacyLensFields(item),
    recommendation: String(item.recommendation ?? item.summary ?? ''),
    reasoning: String(item.reasoning ?? ''),
    confidence: Number(item.confidence ?? 0),
    analyzedAt: Number(item.analyzedAt ?? Date.now())
  };
};

const readStorage = (): AIAnalysis[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return (JSON.parse(raw) as Record<string, unknown>[]).map(normalizeStoredAnalysis);
    }

    for (const key of LEGACY_STORAGE_KEYS) {
      const legacy = localStorage.getItem(key);
      if (legacy) {
        const migrated = (JSON.parse(legacy) as Record<string, unknown>[]).map(normalizeStoredAnalysis);
        writeStorage(migrated);
        return migrated;
      }
    }

    return [];
  } catch {
    return [];
  }
};

const writeStorage = (items: AIAnalysis[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
};

const mapRow = (row: Record<string, unknown>): AIAnalysis => {
  const youWillGet = parseJsonArray(row.viewerExpectationYouWillGet ?? row.viewerExpectationYouWillLearn);
  const youWillNotGet = parseJsonArray(
    row.viewerExpectationYouWillNotGet ?? row.viewerExpectationYouWillNotLearn
  );

  let lensFields: Record<string, unknown> = {};
  try {
    lensFields =
      row.lensFields != null && String(row.lensFields).trim()
        ? (JSON.parse(String(row.lensFields)) as Record<string, unknown>)
        : {};
  } catch {
    lensFields = {};
  }

  if (Object.keys(lensFields).length === 0) {
    lensFields = buildLegacyLensFields(row);
  }

  return {
    schemaVersion: Number(row.schemaVersion) || CURRENT_ANALYSIS_SCHEMA_VERSION,
    captureId: String(row.captureId),
    lens: normalizeLens(row.lens ?? 'technology') as AnalysisLens,
    summary: String(row.summary ?? ''),
    topics: parseJsonArray(row.topics),
    contentType: normalizeContentType(row.contentType),
    targetAudience: parseJsonArray(row.targetAudience),
    estimatedReadingTime: row.estimatedReadingTime != null ? Number(row.estimatedReadingTime) : null,
    estimatedWatchTime: row.estimatedWatchTime != null ? Number(row.estimatedWatchTime) : null,
    viewerExpectation: { youWillGet, youWillNotGet },
    expectedValue: normalizeExpectationLevel(row.expectedValue ?? row.expectedLearning),
    potentialDisappointment: normalizeExpectationLevel(row.potentialDisappointment),
    lensFields,
    recommendation: String(row.recommendation ?? row.summary ?? ''),
    reasoning: String(row.reasoning ?? ''),
    confidence: Number(row.confidence ?? 0),
    analyzedAt: Number(row.analyzedAt)
  };
};

export const initializeAiAnalysisTable = async (): Promise<void> => {
  if (isWeb) {
    readStorage();
    return;
  }
  await initDatabase();
};

export const getAiAnalysis = async (captureId: string): Promise<AIAnalysis | null> => {
  if (isWeb) {
    return readStorage().find((item) => item.captureId === captureId) ?? null;
  }

  const db = await getDatabase();
  const result = await db.query('SELECT * FROM ai_analysis WHERE captureId = ? LIMIT 1;', [captureId]);
  const values = result.values ?? [];
  if (values.length === 0) {
    return null;
  }
  return mapRow(values[0] as Record<string, unknown>);
};

export const saveAiAnalysis = async (analysis: AIAnalysis): Promise<void> => {
  if (isWeb) {
    const items = readStorage().filter((item) => item.captureId !== analysis.captureId);
    items.push(analysis);
    writeStorage(items);
    return;
  }

  const db = await getDatabase();
  await db.run(
    `INSERT OR REPLACE INTO ai_analysis
      (captureId, schemaVersion, lens, topics, targetAudience, contentType,
       viewerExpectationYouWillGet, viewerExpectationYouWillNotGet,
       expectedValue, potentialDisappointment, recommendation,
       estimatedReadingTime, estimatedWatchTime, lensFields, summary,
       reasoning, confidence, analyzedAt,
       difficulty, implementationLevel, learningStyle, codeWalkthrough,
       viewerExpectationYouWillLearn, viewerExpectationYouWillNotLearn,
       expectedLearning, prerequisites, learningOutcomes, keyTakeaways)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      analysis.captureId,
      analysis.schemaVersion,
      analysis.lens,
      stringifyJsonArray(analysis.topics),
      stringifyJsonArray(analysis.targetAudience),
      analysis.contentType,
      stringifyJsonArray(analysis.viewerExpectation.youWillGet),
      stringifyJsonArray(analysis.viewerExpectation.youWillNotGet),
      analysis.expectedValue,
      analysis.potentialDisappointment,
      analysis.recommendation,
      analysis.estimatedReadingTime,
      analysis.estimatedWatchTime,
      JSON.stringify(analysis.lensFields ?? {}),
      analysis.summary,
      analysis.reasoning,
      analysis.confidence,
      analysis.analyzedAt,
      // Legacy columns kept for older readers / safe defaults
      String(analysis.lensFields.difficulty ?? 'intermediate'),
      String(analysis.lensFields.implementationLevel ?? 'none'),
      String(analysis.lensFields.learningStyle ?? 'conceptual'),
      analysis.lensFields.codeWalkthrough ? 1 : 0,
      stringifyJsonArray(analysis.viewerExpectation.youWillGet),
      stringifyJsonArray(analysis.viewerExpectation.youWillNotGet),
      analysis.expectedValue,
      stringifyJsonArray(
        Array.isArray(analysis.lensFields.prerequisites)
          ? (analysis.lensFields.prerequisites as string[])
          : []
      ),
      '[]',
      '[]'
    ],
    true
  );
};

export const deleteAiAnalysis = async (captureId: string): Promise<void> => {
  if (isWeb) {
    writeStorage(readStorage().filter((item) => item.captureId !== captureId));
    return;
  }

  const db = await getDatabase();
  await db.run('DELETE FROM ai_analysis WHERE captureId = ?;', [captureId], true);
};
