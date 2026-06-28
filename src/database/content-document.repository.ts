import { Capacitor } from '@capacitor/core';
import { ContentDocument } from '../types/content-document';
import { getDatabase, initDatabase } from './sqlite';

const isWeb = Capacitor.getPlatform() === 'web';
const STORAGE_KEY = 'later:content_documents_v1';

const readStorage = (): ContentDocument[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? '[]';
    return JSON.parse(raw) as ContentDocument[];
  } catch {
    return [];
  }
};

const writeStorage = (items: ContentDocument[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
};

const mapRow = (row: Record<string, unknown>): ContentDocument => ({
  captureId: String(row.captureId),
  title: (row.title as string | null) ?? null,
  description: (row.description as string | null) ?? null,
  articleText: (row.articleText as string | null) ?? null,
  transcript: (row.transcript as string | null) ?? null,
  author: (row.author as string | null) ?? null,
  publishedAt: row.publishedAt != null ? Number(row.publishedAt) : null,
  duration: row.duration != null ? Number(row.duration) : null,
  thumbnail: (row.thumbnail as string | null) ?? null,
  source: row.source as ContentDocument['source'],
  extractedAt: Number(row.extractedAt)
});

export const initializeContentDocumentTable = async (): Promise<void> => {
  if (isWeb) {
    readStorage();
    return;
  }
  await initDatabase();
};

export const getContentDocument = async (captureId: string): Promise<ContentDocument | null> => {
  if (isWeb) {
    return readStorage().find((item) => item.captureId === captureId) ?? null;
  }

  const db = await getDatabase();
  const result = await db.query('SELECT * FROM content_documents WHERE captureId = ? LIMIT 1;', [captureId]);
  const values = result.values ?? [];
  if (values.length === 0) {
    return null;
  }
  return mapRow(values[0] as Record<string, unknown>);
};

export const saveContentDocument = async (document: ContentDocument): Promise<void> => {
  if (isWeb) {
    const items = readStorage().filter((item) => item.captureId !== document.captureId);
    items.push(document);
    writeStorage(items);
    return;
  }

  const db = await getDatabase();
  await db.run(
    `INSERT OR REPLACE INTO content_documents
      (captureId, title, description, articleText, transcript, author, publishedAt, duration, thumbnail, source, extractedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      document.captureId,
      document.title,
      document.description,
      document.articleText,
      document.transcript,
      document.author,
      document.publishedAt,
      document.duration,
      document.thumbnail,
      document.source,
      document.extractedAt
    ],
    true
  );
};

export const deleteContentDocument = async (captureId: string): Promise<void> => {
  if (isWeb) {
    writeStorage(readStorage().filter((item) => item.captureId !== captureId));
    return;
  }

  const db = await getDatabase();
  await db.run('DELETE FROM content_documents WHERE captureId = ?;', [captureId], true);
};
