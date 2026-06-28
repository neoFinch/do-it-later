import { Capacitor } from '@capacitor/core';
import { CaptureProcessing, PipelineStatus } from '../types/capture-processing';
import { getDatabase, initDatabase } from './sqlite';

const isWeb = Capacitor.getPlatform() === 'web';
const STORAGE_KEY = 'later:capture_processing_v1';

const VALID_STATUSES: PipelineStatus[] = ['pending', 'processing', 'completed', 'failed', 'skipped'];

const normalizeStatus = (value: unknown, fallback: PipelineStatus = 'pending'): PipelineStatus => {
  if (typeof value === 'string' && VALID_STATUSES.includes(value as PipelineStatus)) {
    return value as PipelineStatus;
  }
  return fallback;
};

const readStorage = (): CaptureProcessing[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? '[]';
    return JSON.parse(raw) as CaptureProcessing[];
  } catch {
    return [];
  }
};

const writeStorage = (items: CaptureProcessing[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
};

const mapRow = (row: Record<string, unknown>): CaptureProcessing => ({
  captureId: String(row.captureId),
  extractionStatus: normalizeStatus(row.extractionStatus),
  analysisStatus: normalizeStatus(row.analysisStatus),
  extractionError: (row.extractionError as string | null) ?? null,
  analysisError: (row.analysisError as string | null) ?? null,
  updatedAt: Number(row.updatedAt)
});

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
  if (isWeb) {
    const items = readStorage().filter((item) => item.captureId !== processing.captureId);
    items.push(processing);
    writeStorage(items);
    return;
  }

  const db = await getDatabase();
  await db.run(
    `INSERT OR REPLACE INTO capture_processing
      (captureId, extractionStatus, analysisStatus, extractionError, analysisError, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?);`,
    [
      processing.captureId,
      processing.extractionStatus,
      processing.analysisStatus,
      processing.extractionError,
      processing.analysisError,
      processing.updatedAt
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
  if (isWeb) {
    return readStorage()
      .filter(
        (item) =>
          item.extractionStatus === 'pending' ||
          item.analysisStatus === 'pending' ||
          item.extractionStatus === 'processing' ||
          item.analysisStatus === 'processing'
      )
      .slice(0, limit);
  }

  const db = await getDatabase();
  const result = await db.query(
    `SELECT * FROM capture_processing
     WHERE extractionStatus IN ('pending', 'processing')
        OR analysisStatus IN ('pending', 'processing')
     ORDER BY updatedAt ASC
     LIMIT ?;`,
    [limit]
  );
  return (result.values ?? []).map((row) => mapRow(row as Record<string, unknown>));
};
