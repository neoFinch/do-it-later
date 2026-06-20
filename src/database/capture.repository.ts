import { Capture } from '../types/capture';
import { getDatabase, initDatabase } from './sqlite';
import { Capacitor } from '@capacitor/core';

const isWeb = Capacitor.getPlatform() === 'web';

const mapRowToCapture = (row: any): Capture => ({
  id: row.id,
  type: row.type as Capture['type'],
  title: row.title ?? null,
  url: row.url ?? null,
  content: row.content ?? null,
  source: row.source ?? null,
  thumbnail: row.thumbnail ?? null,
  createdAt: Number(row.createdAt)
});

// Web fallback using localStorage for development without jeep-sqlite
const STORAGE_KEY = 'later:capture_store_v1';

const readStorage = (): Capture[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? '[]';
    const parsed = JSON.parse(raw) as Capture[];
    return parsed;
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

export const initializeCaptureTable = async (): Promise<void> => {
  if (isWeb) {
    // ensure key exists
    readStorage();
    return;
  }
  await initDatabase();
};

export const listCaptures = async (): Promise<Capture[]> => {
  if (isWeb) {
    const items = readStorage();
    return items.sort((a, b) => b.createdAt - a.createdAt);
  }

  const db = await getDatabase();
  const result = await db.query('SELECT * FROM captures ORDER BY createdAt DESC;');
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
  if (isWeb) {
    const items = readStorage();
    const filtered = items.filter((i) => i.id !== capture.id);
    filtered.push(capture);
    writeStorage(filtered);
    return;
  }

  const db = await getDatabase();
  await db.run(
    'INSERT OR REPLACE INTO captures (id, type, title, url, content, source, thumbnail, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?);',
    [capture.id, capture.type, capture.title, capture.url, capture.content, capture.source, capture.thumbnail, capture.createdAt],
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

export const searchCaptures = async (query: string): Promise<Capture[]> => {
  if (isWeb) {
    const q = query.trim().toLowerCase();
    if (!q) {
      return listCaptures();
    }
    const items = readStorage();
    const filtered = items.filter((it) => {
      const title = (it.title ?? '').toLowerCase();
      const content = (it.content ?? '').toLowerCase();
      const url = (it.url ?? '').toLowerCase();
      const source = (it.source ?? '').toLowerCase();
      return title.includes(q) || content.includes(q) || url.includes(q) || source.includes(q);
    });
    return filtered.sort((a, b) => b.createdAt - a.createdAt);
  }

  const db = await getDatabase();
  const normalized = `%${query.trim().toLowerCase()}%`;
  const result = await db.query(
    'SELECT * FROM captures WHERE LOWER(title) LIKE ? OR LOWER(content) LIKE ? OR LOWER(url) LIKE ? OR LOWER(source) LIKE ? ORDER BY createdAt DESC;',
    [normalized, normalized, normalized, normalized]
  );
  const values = result.values ?? [];
  return values.map(mapRowToCapture);
};
