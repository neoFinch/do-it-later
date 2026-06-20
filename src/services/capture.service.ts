import { Capture } from '../types/capture';
import * as repository from '../database/capture.repository';

export const initializeCaptureService = async (): Promise<void> => {
  await repository.initializeCaptureTable();
};

export const listCaptures = async (): Promise<Capture[]> => {
  return repository.listCaptures();
};

export const getCapture = async (id: string): Promise<Capture | null> => {
  return repository.getCaptureById(id);
};

export const deleteCapture = async (id: string): Promise<void> => {
  await repository.deleteCapture(id);
};

export const searchCaptures = async (query: string): Promise<Capture[]> => {
  if (!query.trim()) {
    return repository.listCaptures();
  }
  return repository.searchCaptures(query);
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

export const saveCapture = async (capture: Omit<Capture, 'createdAt'>): Promise<void> => {
  await repository.saveCapture({
    ...capture,
    createdAt: Date.now()
  });
};

export const createUrlCapture = async (url: string, title?: string | null): Promise<void> => {
  await saveCapture({
    id: createId(),
    type: 'url',
    url: normalizeValue(url),
    title: normalizeValue(title),
    content: null,
    source: null,
    thumbnail: null
  });
};

export const createNoteCapture = async (content: string, title?: string | null): Promise<void> => {
  await saveCapture({
    id: createId(),
    type: 'note',
    content: normalizeValue(content),
    title: normalizeValue(title ?? content.trim().slice(0, 80)),
    url: null,
    source: null,
    thumbnail: null
  });
};
