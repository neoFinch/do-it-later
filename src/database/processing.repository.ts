import {
  CaptureProcessing,
  createDefaultProcessingState,
  deriveAnalysisStatus,
  PipelineStatus
} from '../types/capture-processing';
import { getDatabase, initDatabase } from './sqlite';
import { usesBrowserStorage } from '../utils/platform';

const isWeb = usesBrowserStorage();
const STORAGE_KEY = 'later:capture_processing_v2';
const LEGACY_STORAGE_KEY = 'later:capture_processing_v1';

const VALID_STATUSES: PipelineStatus[] = ['pending', 'processing', 'completed', 'failed', 'skipped'];

const normalizeStatus = (value: unknown, fallback: PipelineStatus = 'pending'): PipelineStatus => {
  if (typeof value === 'string' && VALID_STATUSES.includes(value as PipelineStatus)) {
    return value as PipelineStatus;
  }
  return fallback;
};

const normalizeProcessing = (item: Record<string, unknown>): CaptureProcessing => {
  const captureId = String(item.captureId);
  const updatedAt = Number(item.updatedAt ?? Date.now());
  const base = createDefaultProcessingState(captureId, updatedAt);

  const processing: CaptureProcessing = {
    ...base,
    extractionStatus: normalizeStatus(item.extractionStatus, base.extractionStatus),
    analysisStatus: normalizeStatus(item.analysisStatus, base.analysisStatus),
    understandStatus: normalizeStatus(item.understandStatus, normalizeStatus(item.analysisStatus, base.understandStatus)),
    classifyStatus: normalizeStatus(item.classifyStatus, normalizeStatus(item.analysisStatus, base.classifyStatus)),
    enrichStatus: normalizeStatus(item.enrichStatus, normalizeStatus(item.analysisStatus, base.enrichStatus)),
    evaluateStatus: normalizeStatus(item.evaluateStatus, normalizeStatus(item.analysisStatus, base.evaluateStatus)),
    extractionError: (item.extractionError as string | null) ?? null,
    analysisError: (item.analysisError as string | null) ?? null,
    understandError: (item.understandError as string | null) ?? null,
    classifyError: (item.classifyError as string | null) ?? null,
    enrichError: (item.enrichError as string | null) ?? null,
    evaluateError: (item.evaluateError as string | null) ?? null,
    updatedAt
  };

  processing.analysisStatus = deriveAnalysisStatus(processing);
  return processing;
};

const readStorage = (): CaptureProcessing[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return (JSON.parse(raw) as Record<string, unknown>[]).map(normalizeProcessing);
    }

    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      const migrated = (JSON.parse(legacy) as Record<string, unknown>[]).map(normalizeProcessing);
      writeStorage(migrated);
      return migrated;
    }

    return [];
  } catch {
    return [];
  }
};

const writeStorage = (items: CaptureProcessing[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
};

const mapRow = (row: Record<string, unknown>): CaptureProcessing => normalizeProcessing(row);

export const initializeCaptureProcessingTable = async (): Promise<void> => {
  if (isWeb) {
    readStorage();
    return;
  }
  await initDatabase();
};

export const getCaptureProcessing = async (captureId: string): Promise<CaptureProcessing | null> => {
  if (isWeb) {
    return readStorage().find((item) => item.captureId === captureId) ?? null;
  }

  const db = await getDatabase();
  const result = await db.query('SELECT * FROM capture_processing WHERE captureId = ? LIMIT 1;', [captureId]);
  const values = result.values ?? [];
  if (values.length === 0) {
    return null;
  }
  return mapRow(values[0] as Record<string, unknown>);
};

export const saveCaptureProcessing = async (processing: CaptureProcessing): Promise<void> => {
  const next: CaptureProcessing = {
    ...processing,
    analysisStatus: deriveAnalysisStatus(processing)
  };

  if (isWeb) {
    const items = readStorage().filter((item) => item.captureId !== next.captureId);
    items.push(next);
    writeStorage(items);
    return;
  }

  const db = await getDatabase();
  await db.run(
    `INSERT OR REPLACE INTO capture_processing
      (captureId, extractionStatus, analysisStatus,
       understandStatus, classifyStatus, enrichStatus, evaluateStatus,
       extractionError, analysisError,
       understandError, classifyError, enrichError, evaluateError,
       updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      next.captureId,
      next.extractionStatus,
      next.analysisStatus,
      next.understandStatus,
      next.classifyStatus,
      next.enrichStatus,
      next.evaluateStatus,
      next.extractionError,
      next.analysisError,
      next.understandError,
      next.classifyError,
      next.enrichError,
      next.evaluateError,
      next.updatedAt
    ],
    true
  );
};

export const deleteCaptureProcessing = async (captureId: string): Promise<void> => {
  if (isWeb) {
    writeStorage(readStorage().filter((item) => item.captureId !== captureId));
    return;
  }

  const db = await getDatabase();
  await db.run('DELETE FROM capture_processing WHERE captureId = ?;', [captureId], true);
};

export const listPendingProcessing = async (limit = 10): Promise<CaptureProcessing[]> => {
  const isPending = (item: CaptureProcessing): boolean => {
    const statuses = [
      item.extractionStatus,
      item.analysisStatus,
      item.understandStatus,
      item.classifyStatus,
      item.enrichStatus,
      item.evaluateStatus
    ];
    return statuses.some((status) => status === 'pending' || status === 'processing');
  };

  if (isWeb) {
    return readStorage().filter(isPending).slice(0, limit);
  }

  const db = await getDatabase();
  const result = await db.query(
    `SELECT * FROM capture_processing
     WHERE extractionStatus IN ('pending', 'processing')
        OR analysisStatus IN ('pending', 'processing')
        OR understandStatus IN ('pending', 'processing')
        OR classifyStatus IN ('pending', 'processing')
        OR enrichStatus IN ('pending', 'processing')
        OR evaluateStatus IN ('pending', 'processing')
     ORDER BY updatedAt ASC
     LIMIT ?;`,
    [limit]
  );
  return (result.values ?? []).map((row) => mapRow(row as Record<string, unknown>));
};
