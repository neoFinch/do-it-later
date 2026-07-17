import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Capture } from '../types/capture';
import { detectLinkPlatform, normalizeUrl } from './link.service';
import { fetchRemoteImageBase64 } from './http.service';
import { METADATA_USER_AGENT } from './metadata.service';
import { resolveThumbnailForUrl } from './thumbnail.service';

export interface SharedFileInput {
  uri: string;
  name: string;
  mimeType: string;
}

export const sanitizeFileName = (name: string): string => {
  const trimmed = name.trim();
  const sanitized = trimmed.replace(/[^a-zA-Z0-9._-]/g, '_');
  return sanitized || 'shared_file';
};

export const isImageMime = (mimeType?: string | null): boolean => {
  return !!mimeType?.startsWith('image/');
};

export const isImagePath = (path: string): boolean => {
  return /\.(png|jpe?g|gif|webp|bmp|heic|heif)$/i.test(path);
};

export const isLegacyLocalFilePath = (value: string): boolean => {
  const path = value.trim().split('\n')[0]?.trim() ?? '';
  return /^\/(?:data|storage)\/.+/i.test(path);
};

export const isRemoteHttpUrl = (value?: string | null): boolean => {
  return /^https?:\/\//i.test(value?.trim() ?? '');
};

export const isPersistedCapturePath = (value?: string | null): boolean => {
  return (value?.trim() ?? '').startsWith('captures/');
};

const shouldPersistRemoteThumbnail = (imageUrl: string, pageUrl: string): boolean => {
  const platform = detectLinkPlatform(pageUrl);
  if (platform === 'instagram' || platform === 'tiktok') {
    return true;
  }

  try {
    const host = new URL(imageUrl).hostname.toLowerCase();
    return host.includes('cdninstagram.com') || host.includes('fbcdn.net') || host.includes('tiktokcdn');
  } catch {
    return false;
  }
};

export const persistRemoteThumbnail = async (
  captureId: string,
  imageUrl: string,
  pageUrl: string
): Promise<string | null> => {
  if (Capacitor.getPlatform() === 'web' || !shouldPersistRemoteThumbnail(imageUrl, pageUrl)) {
    return null;
  }

  const relativePath = `captures/${captureId}/thumbnail.jpg`;

  try {
    const data = await fetchRemoteImageBase64(imageUrl, {
      referer: normalizeUrl(pageUrl),
      userAgent: METADATA_USER_AGENT
    });

    await Filesystem.writeFile({
      path: relativePath,
      data,
      directory: Directory.Data,
      recursive: true
    });

    return relativePath;
  } catch (error) {
    console.warn('Failed to persist remote thumbnail', { captureId, imageUrl, error });
    return null;
  }
};

export const resolveThumbnailPreviewUrl = async (thumbnail?: string | null): Promise<string | null> => {
  if (!thumbnail?.trim()) {
    return null;
  }

  if (isRemoteHttpUrl(thumbnail)) {
    return thumbnail;
  }

  if (isPersistedCapturePath(thumbnail)) {
    return getLocalFilePreviewUrl(thumbnail);
  }

  return null;
};

export const getLocalFilePreviewUrl = async (relativePath: string): Promise<string | null> => {
  if (Capacitor.getPlatform() === 'web') {
    return null;
  }

  try {
    const { uri } = await Filesystem.getUri({
      directory: Directory.Data,
      path: relativePath
    });
    return Capacitor.convertFileSrc(uri);
  } catch (error) {
    console.warn('Failed to resolve local file preview', { relativePath, error });
    return null;
  }
};

export const getAbsoluteFilePreviewUrl = (absolutePath: string): string => {
  const normalized = absolutePath.startsWith('file://') ? absolutePath : absolutePath;
  return Capacitor.convertFileSrc(normalized);
};

export const resolveCapturePreviewUrl = async (capture: Capture): Promise<string | null> => {
  if (capture.type === 'url') {
    const persisted = await resolveThumbnailPreviewUrl(capture.thumbnail);
    if (persisted) {
      return persisted;
    }
    return resolveThumbnailForUrl(capture.url ?? '') ?? null;
  }

  if (capture.type === 'file' && capture.content && isImageMime(capture.source)) {
    return getLocalFilePreviewUrl(capture.content);
  }

  if (capture.type === 'note' && capture.content && isLegacyLocalFilePath(capture.content)) {
    const legacyPath = capture.content.trim().split('\n')[0]?.trim();
    if (legacyPath && isImagePath(legacyPath)) {
      return getAbsoluteFilePreviewUrl(legacyPath);
    }
  }

  return null;
};

export const persistSharedFile = async (captureId: string, file: SharedFileInput): Promise<string> => {
  const fileName = sanitizeFileName(file.name || 'shared_file');
  const relativePath = `captures/${captureId}/${fileName}`;

  if (Capacitor.getPlatform() === 'web') {
    return file.uri;
  }

  const readResult = await Filesystem.readFile({ path: file.uri });
  await Filesystem.writeFile({
    path: relativePath,
    data: readResult.data,
    directory: Directory.Data,
    recursive: true
  });

  return relativePath;
};

export const deletePersistedFile = async (relativePath: string): Promise<void> => {
  if (Capacitor.getPlatform() === 'web') {
    return;
  }

  try {
    await Filesystem.deleteFile({
      path: relativePath,
      directory: Directory.Data
    });
  } catch (error) {
    console.warn('Failed to delete persisted file', { relativePath, error });
  }
};
