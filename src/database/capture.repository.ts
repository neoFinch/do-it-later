import { Capture, CaptureStatus } from '../types/capture';
import { getDatabase, initDatabase } from './sqlite';
import { Capacitor } from '@capacitor/core';

const isWeb = Capacitor.getPlatform() === 'web';

const DEFAULT_STATUS: CaptureStatus = 'INBOX';

const normalizeStatus = (status?: string | null): CaptureStatus => {
  if (status === 'REVIEWED' || status === 'ARCHIVED') {
    return status;
  }
  return DEFAULT_STATUS;
};

const mapRowToCapture = (row: any): Capture => ({
  id: row.id,
  type: row.type as Capture['type'],
  title: row.title ?? null,
  url: row.url ?? null,
  content: row.content ?? null,
  source: row.source ?? null,
  thumbnail: row.thumbnail ?? null,
  status: normalizeStatus(row.status),
  createdAt: Number(row.createdAt)
});

const normalizeCapture = (capture: Capture): Capture => ({
  ...capture,
  status: normalizeStatus(capture.status)
});

// Web fallback using localStorage for development without jeep-sqlite
const STORAGE_KEY = 'later:capture_store_v1';

const readStorage = (): Capture[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? '[]';
    const parsed = JSON.parse(raw) as Capture[];
    return parsed.map(normalizeCapture);
  } catch (e) {
    console.warn('Failed to read storage fallback', e);
    return [];
  }
};

const writeStorage = (items: Capture[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.warn('Failed to write storage fallback', e);
  }
};

const sortCaptures = (items: Capture[]): Capture[] =>
  items.sort((a, b) => b.createdAt - a.createdAt);

const matchesSearch = (capture: Capture, query: string): boolean => {
  const q = query.trim().toLowerCase();
  if (!q) {
    return true;
  }

  const title = (capture.title ?? '').toLowerCase();
  const content = (capture.content ?? '').toLowerCase();
  const url = (capture.url ?? '').toLowerCase();
  const source = (capture.source ?? '').toLowerCase();
  return title.includes(q) || content.includes(q) || url.includes(q) || source.includes(q);
};

export const initializeCaptureTable = async (): Promise<void> => {
  if (isWeb) {
    readStorage();
    return;
  }
  await initDatabase();
};

export const listCaptures = async (status?: CaptureStatus): Promise<Capture[]> => {
  if (isWeb) {
    const items = readStorage();
    const filtered = status ? items.filter((item) => item.status === status) : items;
    return sortCaptures(filtered);
  }

  const db = await getDatabase();
  const result = status
    ? await db.query('SELECT * FROM captures WHERE status = ? ORDER BY createdAt DESC;', [status])
    : await db.query('SELECT * FROM captures ORDER BY createdAt DESC;');
  const values = result.values ?? [];
  return values.map(mapRowToCapture);
};

export const getCaptureById = async (id: string): Promise<Capture | null> => {
  if (isWeb) {
    const items = readStorage();
    const found = items.find((i) => i.id === id) ?? null;
    return found;
  }

  const db = await getDatabase();
  const result = await db.query('SELECT * FROM captures WHERE id = ? LIMIT 1;', [id]);
  const values = result.values ?? [];
  if (values.length === 0) {
    return null;
  }
  return mapRowToCapture(values[0]);
};

export const saveCapture = async (capture: Capture): Promise<void> => {
  const normalized = normalizeCapture(capture);

  if (isWeb) {
    const items = readStorage();
    const filtered = items.filter((i) => i.id !== normalized.id);
    filtered.push(normalized);
    writeStorage(filtered);
    return;
  }

  const db = await getDatabase();
  await db.run(
    'INSERT OR REPLACE INTO captures (id, type, title, url, content, source, thumbnail, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);',
    [
      normalized.id,
      normalized.type,
      normalized.title,
      normalized.url,
      normalized.content,
      normalized.source,
      normalized.thumbnail,
      normalized.status,
      normalized.createdAt
    ],
    true
  );
};

export const deleteCapture = async (id: string): Promise<void> => {
  if (isWeb) {
    const items = readStorage();
    const filtered = items.filter((i) => i.id !== id);
    writeStorage(filtered);
    return;
  }

  const db = await getDatabase();
  await db.run('DELETE FROM captures WHERE id = ?;', [id], true);
};

export const searchCaptures = async (query: string, status?: CaptureStatus): Promise<Capture[]> => {
  if (isWeb) {
    const items = readStorage();
    const filtered = items.filter((item) => {
      if (status && item.status !== status) {
        return false;
      }
      return matchesSearch(item, query);
    });
    return sortCaptures(filtered);
  }

  const db = await getDatabase();
  const normalized = `%${query.trim().toLowerCase()}%`;
  const result = status
    ? await db.query(
        'SELECT * FROM captures WHERE status = ? AND (LOWER(title) LIKE ? OR LOWER(content) LIKE ? OR LOWER(url) LIKE ? OR LOWER(source) LIKE ?) ORDER BY createdAt DESC;',
        [status, normalized, normalized, normalized, normalized]
      )
    : await db.query(
        'SELECT * FROM captures WHERE LOWER(title) LIKE ? OR LOWER(content) LIKE ? OR LOWER(url) LIKE ? OR LOWER(source) LIKE ? ORDER BY createdAt DESC;',
        [normalized, normalized, normalized, normalized]
      );
  const values = result.values ?? [];
  return values.map(mapRowToCapture);
};

export const countCapturesByStatus = async (): Promise<Record<CaptureStatus, number>> => {
  const counts: Record<CaptureStatus, number> = {
    INBOX: 0,
    REVIEWED: 0,
    ARCHIVED: 0
  };

  if (isWeb) {
    readStorage().forEach((capture) => {
      counts[capture.status] += 1;
    });
    return counts;
  }

  const db = await getDatabase();
  const result = await db.query('SELECT status, COUNT(*) as count FROM captures GROUP BY status;');
  (result.values ?? []).forEach((row: { status?: string; count?: number }) => {
    const status = normalizeStatus(row.status);
    counts[status] += Number(row.count ?? 0);
  });
  return counts;
};
