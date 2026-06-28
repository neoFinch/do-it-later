import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import { Capture, CaptureStatus, CaptureType } from '../types/capture';
import * as repository from '../database/capture.repository';

export const BACKUP_VERSION = 1;
export const BACKUP_APP_ID = 'capture-inbox';

export interface CaptureBackup {
  version: number;
  exportedAt: number;
  app: typeof BACKUP_APP_ID;
  captures: Capture[];
}

export interface ImportResult {
  imported: number;
  skipped: number;
  failed: number;
}

const VALID_TYPES: CaptureType[] = ['url', 'note', 'file'];
const VALID_STATUSES: CaptureStatus[] = ['INBOX', 'REVIEWED', 'ARCHIVED'];

const normalizeStatus = (status?: string | null): CaptureStatus => {
  if (status === 'REVIEWED' || status === 'ARCHIVED') {
    return status;
  }
  return 'INBOX';
};

const normalizeNullableString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

export const normalizeImportedCapture = (raw: unknown): Capture | null => {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const id = typeof record.id === 'string' ? record.id.trim() : '';
  const type = record.type;
  const createdAt = Number(record.createdAt);

  if (!id || !VALID_TYPES.includes(type as CaptureType) || !Number.isFinite(createdAt)) {
    return null;
  }

  const status = VALID_STATUSES.includes(record.status as CaptureStatus)
    ? (record.status as CaptureStatus)
    : normalizeStatus(record.status as string | null);

  return {
    id,
    type: type as CaptureType,
    title: normalizeNullableString(record.title),
    url: normalizeNullableString(record.url),
    content: normalizeNullableString(record.content),
    source: normalizeNullableString(record.source),
    thumbnail: normalizeNullableString(record.thumbnail),
    status,
    createdAt
  };
};

export const sanitizeBackupJsonText = (raw: string): string => {
  return raw.replace(/^\uFEFF/, '').trim();
};

const decodeBase64Utf8 = (base64: string): string => {
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder('utf-8').decode(bytes);
};

export const readBackupFileText = async (file: File): Promise<string> => {
  if (file.size === 0) {
    throw new Error('Selected file is empty.');
  }

  const text = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('Could not read backup file.'));
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Could not decode backup file as text.'));
        return;
      }
      resolve(reader.result);
    };
    reader.readAsText(file);
  });

  return sanitizeBackupJsonText(text);
};

export const isImportPickCanceled = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message === 'No file selected.' ||
    message.includes('pickFiles canceled') ||
    message.includes('User cancelled') ||
    message.includes('canceled')
  );
};

export const pickBackupFileText = async (): Promise<string> => {
  const result = await FilePicker.pickFiles({
    limit: 1,
    readData: true
  });

  if (!result.files.length) {
    throw new Error('No file selected.');
  }

  const picked = result.files[0];

  if (picked.data) {
    return sanitizeBackupJsonText(decodeBase64Utf8(picked.data));
  }

  if (picked.blob) {
    return sanitizeBackupJsonText(await picked.blob.text());
  }

  if (picked.path) {
    const uri = Capacitor.convertFileSrc(picked.path);
    const response = await fetch(uri);
    if (!response.ok) {
      throw new Error('Could not read selected backup file.');
    }
    return sanitizeBackupJsonText(await response.text());
  }

  throw new Error('Could not read selected backup file.');
};

export const parseBackupJson = (json: string): Capture[] => {
  const trimmed = sanitizeBackupJsonText(json);
  if (!trimmed) {
    throw new Error('Backup file is empty.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error('Invalid JSON in backup file.');
  }

  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (parsed && typeof parsed === 'object') {
    const captures = (parsed as CaptureBackup).captures;
    if (Array.isArray(captures)) {
      return captures;
    }
  }

  throw new Error('Invalid backup format');
};

export const createBackupPayload = (captures: Capture[]): CaptureBackup => ({
  version: BACKUP_VERSION,
  exportedAt: Date.now(),
  app: BACKUP_APP_ID,
  captures
});

export const serializeBackup = (captures: Capture[]): string => {
  return JSON.stringify(createBackupPayload(captures), null, 2);
};

const buildBackupFileName = (): string => {
  const date = new Date().toISOString().slice(0, 10);
  return `capture-inbox-backup-${date}.json`;
};

const downloadBackupOnWeb = (json: string, fileName: string): void => {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
};

const isShareCanceled = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('Share canceled');
};

export const buildAndroidCacheFileUrl = (appId: string, relativePath: string): string =>
  `file:///data/user/0/${appId}/cache/${relativePath}`;

export const resolveShareFileUrl = async (relativePath: string, filesystemUri: string): Promise<string> => {
  if (filesystemUri.startsWith('file://')) {
    return filesystemUri;
  }

  if (Capacitor.getPlatform() !== 'android') {
    return filesystemUri;
  }

  const { id } = await App.getInfo();
  return buildAndroidCacheFileUrl(id, relativePath);
};

const shareBackupFile = async (json: string, fileName: string, relativePath: string, fileUri: string): Promise<void> => {
  const shareFileUrl = await resolveShareFileUrl(relativePath, fileUri);

  if (shareFileUrl.startsWith('file://')) {
    try {
      await Share.share({
        title: 'Capture Inbox backup',
        dialogTitle: 'Export captures',
        files: [shareFileUrl]
      });
      return;
    } catch (error) {
      if (isShareCanceled(error)) {
        return;
      }
      console.warn('File share failed, falling back to text share', error);
    }
  }

  try {
    await Share.share({
      title: fileName,
      dialogTitle: 'Export captures',
      text: json
    });
  } catch (error) {
    if (isShareCanceled(error)) {
      return;
    }
    throw error;
  }
};

export const exportCaptures = async (): Promise<{ count: number; fileName: string }> => {
  await repository.initializeCaptureTable();
  const captures = await repository.listCaptures();
  const json = serializeBackup(captures);
  const fileName = buildBackupFileName();

  if (Capacitor.getPlatform() === 'web') {
    downloadBackupOnWeb(json, fileName);
    return { count: captures.length, fileName };
  }

  const relativePath = `backups/${fileName}`;
  const writeResult = await Filesystem.writeFile({
    path: relativePath,
    data: json,
    directory: Directory.Cache,
    recursive: true,
    encoding: Encoding.UTF8
  });

  await shareBackupFile(json, fileName, relativePath, writeResult.uri);

  return { count: captures.length, fileName };
};

export const importCaptures = async (json: string): Promise<ImportResult> => {
  await repository.initializeCaptureTable();

  const rawCaptures = parseBackupJson(json);
  const existing = await repository.listCaptures();
  const existingIds = new Set(existing.map((capture) => capture.id));
  const existingUrls = new Set(
    existing
      .filter((capture) => capture.type === 'url' && capture.url)
      .map((capture) => capture.url!.toLowerCase())
  );

  const result: ImportResult = {
    imported: 0,
    skipped: 0,
    failed: 0
  };

  for (const raw of rawCaptures) {
    const capture = normalizeImportedCapture(raw);
    if (!capture) {
      result.failed += 1;
      continue;
    }

    if (existingIds.has(capture.id)) {
      result.skipped += 1;
      continue;
    }

    if (capture.type === 'url' && capture.url) {
      const normalizedUrl = capture.url.toLowerCase();
      if (existingUrls.has(normalizedUrl)) {
        result.skipped += 1;
        continue;
      }
    }

    await repository.saveCapture(capture);
    existingIds.add(capture.id);
    if (capture.url) {
      existingUrls.add(capture.url.toLowerCase());
    }
    result.imported += 1;
  }

  return result;
};
