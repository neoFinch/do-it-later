import { Capture, CaptureStatus } from '../types/capture';
import * as repository from '../database/capture.repository';
import { initializeAiAnalysisTable } from '../database/ai-analysis.repository';
import { initializeContentDocumentTable } from '../database/content-document.repository';
import { initializeCaptureProcessingTable } from '../database/processing.repository';
import { fetchUrlMetadata } from './metadata.service';
import { deletePersistedFile, isImageMime, persistSharedFile, SharedFileInput } from './file.service';
import { cleanTitle, isDirtyShareTitle } from './title.service';
import { useCaptureStore } from '../store/captureStore';
import { deleteCaptureArtifacts, queueCaptureProcessing } from './processing.service';
import { pickThumbnailUrl, resolveThumbnailForUrl } from './thumbnail.service';

export const initializeCaptureService = async (): Promise<void> => {
  await repository.initializeCaptureTable();
  await initializeContentDocumentTable();
  await initializeAiAnalysisTable();
  await initializeCaptureProcessingTable();
};

export const listCaptures = async (status?: CaptureStatus): Promise<Capture[]> => {
  return repository.listCaptures(status);
};

export const getCapture = async (id: string): Promise<Capture | null> => {
  return repository.getCaptureById(id);
};

export const deleteCapture = async (id: string): Promise<void> => {
  const existing = await repository.getCaptureById(id);
  if (existing?.type === 'file' && existing.content) {
    await deletePersistedFile(existing.content);
  }
  await deleteCaptureArtifacts(id);
  await repository.deleteCapture(id);
};

export const searchCaptures = async (query: string, status?: CaptureStatus): Promise<Capture[]> => {
  if (!query.trim()) {
    return repository.listCaptures(status);
  }
  return repository.searchCaptures(query, status);
};

export const countCapturesByStatus = async (): Promise<Record<CaptureStatus, number>> => {
  return repository.countCapturesByStatus();
};

const createId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `capture-${Date.now()}`;
};

const normalizeValue = (value?: string | null): string | null => {
  return value ?? null;
};

export const saveCapture = async (capture: Omit<Capture, 'createdAt'> & { createdAt?: number }): Promise<void> => {
  await repository.saveCapture({
    ...capture,
    createdAt: capture.createdAt ?? Date.now()
  });
};

export const updateCapture = async (
  id: string,
  updates: Partial<Omit<Capture, 'id' | 'createdAt'>>
): Promise<void> => {
  const existing = await repository.getCaptureById(id);
  if (!existing) {
    return;
  }

  await repository.saveCapture({
    ...existing,
    ...updates
  });
};

const shouldReplaceTitle = (existingTitle: string | null | undefined, url: string): boolean => {
  const normalized = existingTitle?.trim();
  return !normalized || normalized === url;
};

const refreshInboxIfInitialized = async (): Promise<void> => {
  const { initialized, reload } = useCaptureStore.getState();
  if (!initialized) {
    return;
  }
  await reload();
};

export const enrichUrlCapture = async (
  id: string,
  url: string,
  existingTitle?: string | null
): Promise<void> => {
  try {
    const metadata = await fetchUrlMetadata(url);
    const updates: Partial<Omit<Capture, 'id' | 'createdAt'>> = {};

    const thumbnail = pickThumbnailUrl(url, [metadata.thumbnail]);
    if (thumbnail) {
      updates.thumbnail = thumbnail;
    }
    if (metadata.source) {
      updates.source = metadata.source;
    }
    if (metadata.title && (shouldReplaceTitle(existingTitle, url) || isDirtyShareTitle(existingTitle, url))) {
      updates.title = cleanTitle(metadata.title);
    } else if (existingTitle && isDirtyShareTitle(existingTitle, url)) {
      updates.title = cleanTitle(existingTitle);
    }

    if (Object.keys(updates).length === 0) {
      return;
    }

    await updateCapture(id, updates);
    await refreshInboxIfInitialized();
  } catch (error) {
    console.warn('Failed to enrich capture metadata', { id, url, error });

    const fallbackThumbnail = resolveThumbnailForUrl(url);
    if (!fallbackThumbnail) {
      return;
    }

    const existing = await repository.getCaptureById(id);
    if (existing?.thumbnail) {
      return;
    }

    await updateCapture(id, { thumbnail: fallbackThumbnail });
    await refreshInboxIfInitialized();
  }
};

const queueUrlCaptureEnrichment = (id: string, url: string, existingTitle?: string | null): void => {
  void enrichUrlCapture(id, url, existingTitle);
  queueCaptureProcessing(id);
};

export const enrichStaleUrlCaptures = (captures: Capture[]): void => {
  const stale = captures.filter(
    (capture) => capture.type === 'url' && !!capture.url && !capture.thumbnail
  );

  stale.slice(0, 5).forEach((capture) => {
    queueUrlCaptureEnrichment(capture.id, capture.url!, capture.title);
  });
};

export const refreshDirtyCaptureTitles = async (): Promise<void> => {
  const captures = await listCaptures();
  let updated = 0;

  await Promise.all(
    captures.map(async (capture) => {
      if (!capture.title?.trim() || !isDirtyShareTitle(capture.title, capture.url ?? '')) {
        return;
      }

      const cleaned = cleanTitle(capture.title);
      const nextTitle = cleaned || null;
      if (nextTitle === capture.title) {
        return;
      }

      await updateCapture(capture.id, { title: nextTitle });
      updated += 1;
    })
  );

  if (updated > 0) {
    await refreshInboxIfInitialized();
  }
};

export const updateCaptureTitle = async (id: string, title: string): Promise<void> => {
  const trimmed = title.trim();
  await updateCapture(id, { title: trimmed ? trimmed : null });
  await refreshInboxIfInitialized();
};

export const updateCaptureStatus = async (id: string, status: CaptureStatus): Promise<void> => {
  await updateCapture(id, { status });
  await refreshInboxIfInitialized();
};

export const createUrlCapture = async (url: string, title?: string | null): Promise<string> => {
  const id = createId();
  await saveCapture({
    id,
    type: 'url',
    url: normalizeValue(url),
    title: normalizeValue(title?.trim() ? cleanTitle(title) : url),
    content: null,
    source: null,
    thumbnail: null,
    status: 'INBOX'
  });
  queueUrlCaptureEnrichment(id, url, title ?? url);
  return id;
};

export const createNoteCapture = async (content: string, title?: string | null): Promise<string> => {
  const id = createId();
  await saveCapture({
    id,
    type: 'note',
    content: normalizeValue(content),
    title: normalizeValue(cleanTitle(title ?? content.trim().slice(0, 200))),
    url: null,
    source: null,
    thumbnail: null,
    status: 'INBOX'
  });
  queueCaptureProcessing(id);
  return id;
};

export const createFileCapture = async (file: SharedFileInput, title?: string | null): Promise<string> => {
  const id = createId();
  const relativePath = await persistSharedFile(id, file);
  const captureTitle = cleanTitle(title?.trim() || file.name || 'Shared file');

  await saveCapture({
    id,
    type: 'file',
    title: normalizeValue(captureTitle),
    content: normalizeValue(relativePath),
    source: normalizeValue(file.mimeType),
    url: null,
    thumbnail: isImageMime(file.mimeType) ? normalizeValue(relativePath) : null,
    status: 'INBOX'
  });

  return id;
};
