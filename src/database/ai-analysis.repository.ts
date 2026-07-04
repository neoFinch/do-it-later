import { Capacitor } from '@capacitor/core';
import {
  AIAnalysis,
  ContentType,
  Difficulty,
  ExpectationLevel,
  ImplementationLevel,
  LearningStyle,
  ViewerExpectation
} from '../types/ai-analysis';
import { parseJsonArray, stringifyJsonArray } from '../utils/json-field';
import { getDatabase, initDatabase } from './sqlite';

const isWeb = Capacitor.getPlatform() === 'web';
const STORAGE_KEY = 'later:ai_analysis_v3';

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

const normalizeExpectationLevel = (value: unknown): ExpectationLevel => {
  if (typeof value === 'string' && VALID_EXPECTATION_LEVELS.includes(value as ExpectationLevel)) {
    return value as ExpectationLevel;
  }
  return 'medium';
};

const normalizeViewerExpectation = (value: unknown): ViewerExpectation => {
  if (typeof value === 'object' && value) {
    const record = value as Record<string, unknown>;
    return {
      youWillLearn: parseJsonArray(record.youWillLearn),
      youWillNotLearn: parseJsonArray(record.youWillNotLearn)
    };
  }
  return { youWillLearn: [], youWillNotLearn: [] };
};

const normalizeStoredAnalysis = (item: AIAnalysis): AIAnalysis => ({
  ...item,
  expectedLearning: item.expectedLearning ?? 'medium',
  potentialDisappointment: item.potentialDisappointment ?? 'medium',
  recommendation: item.recommendation ?? item.summary ?? ''
});

const readStorage = (): AIAnalysis[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? '[]';
    return (JSON.parse(raw) as AIAnalysis[]).map(normalizeStoredAnalysis);
  } catch {
    return [];
  }
};

const writeStorage = (items: AIAnalysis[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
};

const mapRow = (row: Record<string, unknown>): AIAnalysis => ({
  captureId: String(row.captureId),
  topics: parseJsonArray(row.topics),
  difficulty: normalizeDifficulty(row.difficulty),
  targetAudience: parseJsonArray(row.targetAudience),
  contentType: normalizeContentType(row.contentType),
  implementationLevel: normalizeImplementationLevel(row.implementationLevel),
  learningStyle: normalizeLearningStyle(row.learningStyle),
  codeWalkthrough: Boolean(row.codeWalkthrough),
  viewerExpectation: {
    youWillLearn: parseJsonArray(row.viewerExpectationYouWillLearn),
    youWillNotLearn: parseJsonArray(row.viewerExpectationYouWillNotLearn)
  },
  expectedLearning: normalizeExpectationLevel(row.expectedLearning),
  potentialDisappointment: normalizeExpectationLevel(row.potentialDisappointment),
  recommendation: String(row.recommendation ?? row.summary ?? ''),
  estimatedReadingTime: row.estimatedReadingTime != null ? Number(row.estimatedReadingTime) : null,
  estimatedWatchTime: row.estimatedWatchTime != null ? Number(row.estimatedWatchTime) : null,
  prerequisites: parseJsonArray(row.prerequisites),
  learningOutcomes: parseJsonArray(row.learningOutcomes),
  summary: String(row.summary ?? ''),
  keyTakeaways: parseJsonArray(row.keyTakeaways),
  reasoning: String(row.reasoning ?? ''),
  confidence: Number(row.confidence ?? 0),
  analyzedAt: Number(row.analyzedAt)
});

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
      (captureId, topics, difficulty, targetAudience, contentType, implementationLevel, learningStyle,
       codeWalkthrough, viewerExpectationYouWillLearn, viewerExpectationYouWillNotLearn,
       expectedLearning, potentialDisappointment, recommendation,
       estimatedReadingTime, estimatedWatchTime, prerequisites, learningOutcomes, summary,
       keyTakeaways, reasoning, confidence, analyzedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      analysis.captureId,
      stringifyJsonArray(analysis.topics),
      analysis.difficulty,
      stringifyJsonArray(analysis.targetAudience),
      analysis.contentType,
      analysis.implementationLevel,
      analysis.learningStyle,
      analysis.codeWalkthrough ? 1 : 0,
      stringifyJsonArray(analysis.viewerExpectation.youWillLearn),
      stringifyJsonArray(analysis.viewerExpectation.youWillNotLearn),
      analysis.expectedLearning,
      analysis.potentialDisappointment,
      analysis.recommendation,
      analysis.estimatedReadingTime,
      analysis.estimatedWatchTime,
      stringifyJsonArray(analysis.prerequisites),
      stringifyJsonArray(analysis.learningOutcomes),
      analysis.summary,
      stringifyJsonArray(analysis.keyTakeaways),
      analysis.reasoning,
      analysis.confidence,
      analysis.analyzedAt
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
