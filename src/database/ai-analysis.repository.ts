import { Capacitor } from '@capacitor/core';
import { AIAnalysis, ContentType, Difficulty } from '../types/ai-analysis';
import { parseJsonArray, stringifyJsonArray } from '../utils/json-field';
import { getDatabase, initDatabase } from './sqlite';

const isWeb = Capacitor.getPlatform() === 'web';
const STORAGE_KEY = 'later:ai_analysis_v1';

const VALID_DIFFICULTIES: Difficulty[] = ['beginner', 'intermediate', 'advanced'];
const VALID_CONTENT_TYPES: ContentType[] = [
  'tutorial',
  'deep-dive',
  'reference',
  'news',
  'opinion',
  'other'
];

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

const readStorage = (): AIAnalysis[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? '[]';
    return JSON.parse(raw) as AIAnalysis[];
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
  containsCode: Boolean(row.containsCode),
  containsHandsOn: Boolean(row.containsHandsOn),
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
      (captureId, topics, difficulty, targetAudience, contentType, containsCode, containsHandsOn,
       estimatedReadingTime, estimatedWatchTime, prerequisites, learningOutcomes, summary,
       keyTakeaways, reasoning, confidence, analyzedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      analysis.captureId,
      stringifyJsonArray(analysis.topics),
      analysis.difficulty,
      stringifyJsonArray(analysis.targetAudience),
      analysis.contentType,
      analysis.containsCode ? 1 : 0,
      analysis.containsHandsOn ? 1 : 0,
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
