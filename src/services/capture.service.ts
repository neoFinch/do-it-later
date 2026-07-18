import { Capture, CaptureStatus } from '../types/capture';
import * as repository from '../database/capture.repository';
import { initializeAiAnalysisTable } from '../database/ai-analysis.repository';
import { initializeContentDocumentTable } from '../database/content-document.repository';
import { initializeCaptureProcessingTable } from '../database/processing.repository';
import { fetchUrlMetadata } from './metadata.service';
import {
  deletePersistedFile,
  isImageMime,
  isPersistedCapturePath,
  isRemoteHttpUrl,
  persistRemoteThumbnail,
  persistSharedFile,
  SharedFileInput
} from './file.service';
import { cleanTitle, getCaptureDisplayTitle, isDirtyShareTitle } from './title.service';
import { canonicalizeCaptureUrl } from './link.service';
import { useCaptureStore } from '../store/captureStore';
import { deleteCaptureArtifacts, queueCaptureProcessing } from './processing.service';
import { pickThumbnailUrl, resolveThumbnailForUrl } from './thumbnail.service';
import { isSameCaptureDisplay } from '../utils/capture-display';
import { getPipelineStages } from '../database/ai-pipeline.repository';
import {
  buildCaptureSearchContext,
  matchesCaptureSearch,
  normalizeSearchQuery
} from './capture-search.service';

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
  if (existing?.thumbnail && isPersistedCapturePath(existing.thumbnail)) {
    await deletePersistedFile(existing.thumbnail);
  }
  await deleteCaptureArtifacts(id);
  await repository.deleteCapture(id);
};

export const searchCaptures = async (query: string, status?: CaptureStatus): Promise<Capture[]> => {
  const captures = await repository.listCaptures(status);
  const normalizedQuery = normalizeSearchQuery(query);
  if (!normalizedQuery) {
    return captures;
  }

  const contexts = await Promise.all(
    captures.map(async (capture) => {
      const stages = await getPipelineStages(capture.id);
      return buildCaptureSearchContext({ capture, ...stages });
    })
  );

  return contexts
    .filter((context) => matchesCaptureSearch(context, query))
    .map((context) => context.capture)
    .sort((a, b) => b.createdAt - a.createdAt);
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

export const materializeCaptureThumbnail = async (
  captureId: string,
  pageUrl: string,
  thumbnail?: string | null
): Promise<string | null> => {
  if (!thumbnail?.trim()) {
    return null;
  }

  if (!isRemoteHttpUrl(thumbnail)) {
    return thumbnail;
  }

  const persisted = await persistRemoteThumbnail(captureId, thumbnail, pageUrl);
  return persisted ?? thumbnail;
};

const shouldReplaceTitle = (existingTitle: string | null | undefined, url: string): boolean => {
  const normalized = existingTitle?.trim();
  return !normalized || normalized === url;
};

const PATCH_BATCH_DEBOUNCE_MS = 400;
const pendingPatches = new Map<string, Partial<Omit<Capture, 'id' | 'createdAt'>>>();
let patchBatchTimer: ReturnType<typeof setTimeout> | null = null;

const flushPendingPatches = (): void => {
  patchBatchTimer = null;
  if (pendingPatches.size === 0) {
    return;
  }

  const { initialized, patchCaptures } = useCaptureStore.getState();
  const batch = Object.fromEntries(pendingPatches);
  pendingPatches.clear();

  if (initialized) {
    patchCaptures(batch);
  }
};

export const patchInboxCaptureIfInitialized = (
  id: string,
  updates: Partial<Omit<Capture, 'id' | 'createdAt'>>
): void => {
  const existing = pendingPatches.get(id) ?? {};
  pendingPatches.set(id, { ...existing, ...updates });

  if (patchBatchTimer) {
    clearTimeout(patchBatchTimer);
  }

  patchBatchTimer = setTimeout(flushPendingPatches, PATCH_BATCH_DEBOUNCE_MS);
};

export interface EnrichUrlResult {
  updated: boolean;
  thumbnail: string | null;
  title: string | null;
  error: string | null;
}

export const enrichUrlCapture = async (
  id: string,
  url: string,
  existingTitle?: string | null,
  options?: { force?: boolean; thumbnailOnly?: boolean }
): Promise<EnrichUrlResult> => {
  const force = options?.force === true;
  const thumbnailOnly = options?.thumbnailOnly === true;
  const existing = await repository.getCaptureById(id);

  try {
    const metadata = (await fetchUrlMetadata(url)) ?? {};
    const updates: Partial<Omit<Capture, 'id' | 'createdAt'>> = {};

    let thumbnail = pickThumbnailUrl(url, [metadata.thumbnail]);
    if (thumbnail) {
      thumbnail = (await materializeCaptureThumbnail(id, url, thumbnail)) ?? undefined;
    }
    if (thumbnail && (force || !existing?.thumbnail || thumbnail !== existing.thumbnail)) {
      updates.thumbnail = thumbnail;
    }
    if (!thumbnailOnly && metadata.source && metadata.source !== existing?.source) {
      updates.source = metadata.source;
    }
    if (
      !thumbnailOnly &&
      metadata.title &&
      (shouldReplaceTitle(existingTitle, url) ||
        isDirtyShareTitle(existingTitle, url) ||
        (force && !existingTitle?.trim()))
    ) {
      updates.title = cleanTitle(metadata.title);
    } else if (!thumbnailOnly && existingTitle && isDirtyShareTitle(existingTitle, url)) {
      updates.title = cleanTitle(existingTitle);
    }

    if (Object.keys(updates).length === 0) {
      return {
        updated: false,
        thumbnail: existing?.thumbnail ?? thumbnail ?? null,
        title: existing?.title ?? null,
        error:
          force && !existing?.thumbnail && !thumbnail
            ? 'Instagram (or this site) hid the preview image from scrapers. Your link is still saved — open it to view the content.'
            : null
      };
    }

    await updateCapture(id, updates);
    if (!existing || !isSameCaptureDisplay(existing, { ...existing, ...updates })) {
      patchInboxCaptureIfInitialized(id, updates);
    }

    const refreshed = await repository.getCaptureById(id);
    return {
      updated: true,
      thumbnail: refreshed?.thumbnail ?? thumbnail ?? null,
      title: refreshed?.title ?? null,
      error: null
    };
  } catch (error) {
    console.warn('Failed to enrich capture metadata', { id, url, error });

    const fallbackThumbnail = resolveThumbnailForUrl(url);
    const message = error instanceof Error ? error.message : String(error);

    if (fallbackThumbnail && (force || !existing?.thumbnail)) {
      const thumbnailUpdate = { thumbnail: fallbackThumbnail };
      await updateCapture(id, thumbnailUpdate);
      patchInboxCaptureIfInitialized(id, thumbnailUpdate);
      return {
        updated: true,
        thumbnail: fallbackThumbnail,
        title: existing?.title ?? null,
        error: null
      };
    }

    return {
      updated: false,
      thumbnail: existing?.thumbnail ?? null,
      title: existing?.title ?? null,
      error: message
    };
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

      const displayUnchanged =
        getCaptureDisplayTitle(capture) === getCaptureDisplayTitle({ ...capture, title: nextTitle });
      if (displayUnchanged) {
        return;
      }

      patchInboxCaptureIfInitialized(capture.id, { title: nextTitle });
    })
  );
};

export const updateCaptureTitle = async (id: string, title: string): Promise<void> => {
  const trimmed = title.trim();
  await updateCapture(id, { title: trimmed ? trimmed : null });
};

export const updateCaptureStatus = async (id: string, status: CaptureStatus): Promise<void> => {
  await updateCapture(id, { status });
};

export const createUrlCapture = async (url: string, title?: string | null): Promise<string> => {
  const canonicalUrl = canonicalizeCaptureUrl(url);
  const existing = await repository.findUrlCaptureByUrl(canonicalUrl);
  if (existing) {
    if (!existing.thumbnail || isDirtyShareTitle(existing.title, existing.url ?? '')) {
      queueUrlCaptureEnrichment(existing.id, existing.url!, existing.title);
    }
    return existing.id;
  }

  const id = createId();
  await saveCapture({
    id,
    type: 'url',
    url: normalizeValue(canonicalUrl),
    title: normalizeValue(title?.trim() ? cleanTitle(title) : canonicalUrl),
    content: null,
    source: null,
    thumbnail: null,
    status: 'INBOX'
  });
  queueUrlCaptureEnrichment(id, canonicalUrl, title ?? canonicalUrl);
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
