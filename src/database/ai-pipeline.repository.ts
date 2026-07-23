import {
  ClassifyResult,
  composeAnalysisFromStages,
  CURRENT_PIPELINE_STAGE_SCHEMA_VERSION,
  EnrichResult,
  EvaluateResult,
  isPipelineComplete,
  PipelineStageResults,
  UnderstandResult
} from '../types/ai-pipeline-stages';
import { AIAnalysis, AnalysisLens, ContentType, ExpectationLevel } from '../types/ai-analysis';
import { normalizeLens } from '../services/ai/lenses';
import { parseJsonArray, stringifyJsonArray } from '../utils/json-field';
import { getDatabase, initDatabase } from './sqlite';
import { usesBrowserStorage } from '../utils/platform';

const isWeb = usesBrowserStorage();
const STORAGE_KEY = 'later:ai_pipeline_v1';

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

interface PipelineStorage {
  understand: UnderstandResult[];
  classify: ClassifyResult[];
  enrich: EnrichResult[];
  evaluate: EvaluateResult[];
}

const emptyStorage = (): PipelineStorage => ({
  understand: [],
  classify: [],
  enrich: [],
  evaluate: []
});

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

const normalizeViewerExpectation = (youWillGet: unknown, youWillNotGet: unknown) => ({
  youWillGet: parseJsonArray(youWillGet),
  youWillNotGet: parseJsonArray(youWillNotGet)
});

const normalizeUnderstand = (item: Record<string, unknown>): UnderstandResult => ({
  schemaVersion: Number(item.schemaVersion) || CURRENT_PIPELINE_STAGE_SCHEMA_VERSION,
  captureId: String(item.captureId),
  summary: String(item.summary ?? ''),
  topics: parseJsonArray(item.topics),
  targetAudience: parseJsonArray(item.targetAudience),
  estimatedReadingTime: item.estimatedReadingTime != null ? Number(item.estimatedReadingTime) : null,
  estimatedWatchTime: item.estimatedWatchTime != null ? Number(item.estimatedWatchTime) : null,
  completedAt: Number(item.completedAt ?? Date.now())
});

const normalizeClassify = (item: Record<string, unknown>): ClassifyResult => ({
  schemaVersion: Number(item.schemaVersion) || CURRENT_PIPELINE_STAGE_SCHEMA_VERSION,
  captureId: String(item.captureId),
  lens: normalizeLens(item.lens ?? 'general') as AnalysisLens,
  contentType: normalizeContentType(item.contentType),
  completedAt: Number(item.completedAt ?? Date.now())
});

const normalizeEnrich = (item: Record<string, unknown>): EnrichResult => {
  let lensFields: Record<string, unknown> = {};
  try {
    lensFields =
      item.lensFields != null && String(item.lensFields).trim()
        ? (JSON.parse(String(item.lensFields)) as Record<string, unknown>)
        : {};
  } catch {
    lensFields = {};
  }

  return {
    schemaVersion: Number(item.schemaVersion) || CURRENT_PIPELINE_STAGE_SCHEMA_VERSION,
    captureId: String(item.captureId),
    viewerExpectation: normalizeViewerExpectation(
      item.viewerExpectationYouWillGet ??
        (item.viewerExpectation as { youWillGet?: unknown } | undefined)?.youWillGet,
      item.viewerExpectationYouWillNotGet ??
        (item.viewerExpectation as { youWillNotGet?: unknown } | undefined)?.youWillNotGet
    ),
    lensFields,
    completedAt: Number(item.completedAt ?? Date.now())
  };
};

const normalizeEvaluate = (item: Record<string, unknown>): EvaluateResult => ({
  schemaVersion: Number(item.schemaVersion) || CURRENT_PIPELINE_STAGE_SCHEMA_VERSION,
  captureId: String(item.captureId),
  expectedValue: normalizeExpectationLevel(item.expectedValue),
  potentialDisappointment: normalizeExpectationLevel(item.potentialDisappointment),
  recommendation: String(item.recommendation ?? ''),
  reasoning: String(item.reasoning ?? ''),
  confidence: Number(item.confidence ?? 0),
  completedAt: Number(item.completedAt ?? Date.now())
});

const readStorage = (): PipelineStorage => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return emptyStorage();
    }
    const parsed = JSON.parse(raw) as Record<string, unknown[]>;
    return {
      understand: (parsed.understand ?? []).map((item) => normalizeUnderstand(item as Record<string, unknown>)),
      classify: (parsed.classify ?? []).map((item) => normalizeClassify(item as Record<string, unknown>)),
      enrich: (parsed.enrich ?? []).map((item) => normalizeEnrich(item as Record<string, unknown>)),
      evaluate: (parsed.evaluate ?? []).map((item) => normalizeEvaluate(item as Record<string, unknown>))
    };
  } catch {
    return emptyStorage();
  }
};

const writeStorage = (storage: PipelineStorage): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
};

const mapUnderstandRow = (row: Record<string, unknown>): UnderstandResult =>
  normalizeUnderstand({
    ...row,
    topics: row.topics,
    targetAudience: row.targetAudience
  });

const mapClassifyRow = (row: Record<string, unknown>): ClassifyResult => normalizeClassify(row);

const mapEnrichRow = (row: Record<string, unknown>): EnrichResult =>
  normalizeEnrich({
    ...row,
    viewerExpectationYouWillGet: row.viewerExpectationYouWillGet,
    viewerExpectationYouWillNotGet: row.viewerExpectationYouWillNotGet
  });

const mapEvaluateRow = (row: Record<string, unknown>): EvaluateResult => normalizeEvaluate(row);

export const initializeAiPipelineTables = async (): Promise<void> => {
  if (isWeb) {
    readStorage();
    return;
  }
  await initDatabase();
};

export const getPipelineStages = async (captureId: string): Promise<PipelineStageResults> => {
  if (isWeb) {
    const storage = readStorage();
    return {
      understand: storage.understand.find((item) => item.captureId === captureId) ?? null,
      classify: storage.classify.find((item) => item.captureId === captureId) ?? null,
      enrich: storage.enrich.find((item) => item.captureId === captureId) ?? null,
      evaluate: storage.evaluate.find((item) => item.captureId === captureId) ?? null
    };
  }

  const db = await getDatabase();
  const [understandResult, classifyResult, enrichResult, evaluateResult] = await Promise.all([
    db.query('SELECT * FROM ai_understand WHERE captureId = ? LIMIT 1;', [captureId]),
    db.query('SELECT * FROM ai_classify WHERE captureId = ? LIMIT 1;', [captureId]),
    db.query('SELECT * FROM ai_enrich WHERE captureId = ? LIMIT 1;', [captureId]),
    db.query('SELECT * FROM ai_evaluate WHERE captureId = ? LIMIT 1;', [captureId])
  ]);

  const understandValues = understandResult.values ?? [];
  const classifyValues = classifyResult.values ?? [];
  const enrichValues = enrichResult.values ?? [];
  const evaluateValues = evaluateResult.values ?? [];

  return {
    understand: understandValues.length > 0 ? mapUnderstandRow(understandValues[0] as Record<string, unknown>) : null,
    classify: classifyValues.length > 0 ? mapClassifyRow(classifyValues[0] as Record<string, unknown>) : null,
    enrich: enrichValues.length > 0 ? mapEnrichRow(enrichValues[0] as Record<string, unknown>) : null,
    evaluate: evaluateValues.length > 0 ? mapEvaluateRow(evaluateValues[0] as Record<string, unknown>) : null
  };
};

export const getComposedAnalysis = async (captureId: string): Promise<AIAnalysis | null> => {
  const stages = await getPipelineStages(captureId);
  if (!isPipelineComplete(stages)) {
    return null;
  }
  return composeAnalysisFromStages(stages);
};

export const saveUnderstandResult = async (result: UnderstandResult): Promise<void> => {
  if (isWeb) {
    const storage = readStorage();
    storage.understand = storage.understand.filter((item) => item.captureId !== result.captureId);
    storage.understand.push(result);
    writeStorage(storage);
    return;
  }

  const db = await getDatabase();
  await db.run(
    `INSERT OR REPLACE INTO ai_understand
      (captureId, schemaVersion, summary, topics, targetAudience, estimatedReadingTime, estimatedWatchTime, completedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      result.captureId,
      result.schemaVersion,
      result.summary,
      stringifyJsonArray(result.topics),
      stringifyJsonArray(result.targetAudience),
      result.estimatedReadingTime,
      result.estimatedWatchTime,
      result.completedAt
    ],
    true
  );
};

export const saveClassifyResult = async (result: ClassifyResult): Promise<void> => {
  if (isWeb) {
    const storage = readStorage();
    storage.classify = storage.classify.filter((item) => item.captureId !== result.captureId);
    storage.classify.push(result);
    writeStorage(storage);
    return;
  }

  const db = await getDatabase();
  await db.run(
    `INSERT OR REPLACE INTO ai_classify
      (captureId, schemaVersion, lens, contentType, completedAt)
      VALUES (?, ?, ?, ?, ?);`,
    [result.captureId, result.schemaVersion, result.lens, result.contentType, result.completedAt],
    true
  );
};

export const saveEnrichResult = async (result: EnrichResult): Promise<void> => {
  if (isWeb) {
    const storage = readStorage();
    storage.enrich = storage.enrich.filter((item) => item.captureId !== result.captureId);
    storage.enrich.push(result);
    writeStorage(storage);
    return;
  }

  const db = await getDatabase();
  await db.run(
    `INSERT OR REPLACE INTO ai_enrich
      (captureId, schemaVersion, viewerExpectationYouWillGet, viewerExpectationYouWillNotGet, lensFields, completedAt)
      VALUES (?, ?, ?, ?, ?, ?);`,
    [
      result.captureId,
      result.schemaVersion,
      stringifyJsonArray(result.viewerExpectation.youWillGet),
      stringifyJsonArray(result.viewerExpectation.youWillNotGet),
      JSON.stringify(result.lensFields ?? {}),
      result.completedAt
    ],
    true
  );
};

export const saveEvaluateResult = async (result: EvaluateResult): Promise<void> => {
  if (isWeb) {
    const storage = readStorage();
    storage.evaluate = storage.evaluate.filter((item) => item.captureId !== result.captureId);
    storage.evaluate.push(result);
    writeStorage(storage);
    return;
  }

  const db = await getDatabase();
  await db.run(
    `INSERT OR REPLACE INTO ai_evaluate
      (captureId, schemaVersion, expectedValue, potentialDisappointment, recommendation, reasoning, confidence, completedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      result.captureId,
      result.schemaVersion,
      result.expectedValue,
      result.potentialDisappointment,
      result.recommendation,
      result.reasoning,
      result.confidence,
      result.completedAt
    ],
    true
  );
};

export const savePipelineStages = async (stages: PipelineStageResults): Promise<void> => {
  const saves: Promise<void>[] = [];
  if (stages.understand) {
    saves.push(saveUnderstandResult(stages.understand));
  }
  if (stages.classify) {
    saves.push(saveClassifyResult(stages.classify));
  }
  if (stages.enrich) {
    saves.push(saveEnrichResult(stages.enrich));
  }
  if (stages.evaluate) {
    saves.push(saveEvaluateResult(stages.evaluate));
  }
  await Promise.all(saves);
};

export const deletePipelineStages = async (captureId: string): Promise<void> => {
  if (isWeb) {
    const storage = readStorage();
    storage.understand = storage.understand.filter((item) => item.captureId !== captureId);
    storage.classify = storage.classify.filter((item) => item.captureId !== captureId);
    storage.enrich = storage.enrich.filter((item) => item.captureId !== captureId);
    storage.evaluate = storage.evaluate.filter((item) => item.captureId !== captureId);
    writeStorage(storage);
    return;
  }

  const db = await getDatabase();
  await Promise.all([
    db.run('DELETE FROM ai_understand WHERE captureId = ?;', [captureId], true),
    db.run('DELETE FROM ai_classify WHERE captureId = ?;', [captureId], true),
    db.run('DELETE FROM ai_enrich WHERE captureId = ?;', [captureId], true),
    db.run('DELETE FROM ai_evaluate WHERE captureId = ?;', [captureId], true)
  ]);
};
