import { detectLinkPlatform, extractYouTubeVideoId, normalizeUrl } from './link.service';

export const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export const resolveAbsoluteUrl = (pageUrl: string, value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    return trimmed;
  }

  try {
    return new URL(trimmed, normalizeUrl(pageUrl)).toString();
  } catch {
    return trimmed;
  }
};

export const getYouTubeThumbnailUrl = (url: string): string | null => {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) {
    return null;
  }
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
};

export const getPlatformThumbnailUrl = (url: string): string | null => {
  const platform = detectLinkPlatform(url);
  if (platform === 'youtube') {
    return getYouTubeThumbnailUrl(url);
  }
  return null;
};

export const pickThumbnailUrl = (pageUrl: string, candidates: Array<string | null | undefined>): string | undefined => {
  for (const candidate of candidates) {
    if (!candidate?.trim()) {
      continue;
    }
    return resolveAbsoluteUrl(pageUrl, candidate);
  }

  const fallback = getPlatformThumbnailUrl(pageUrl);
  return fallback ?? undefined;
};

export const resolveThumbnailForUrl = (url: string): string | undefined => {
  return pickThumbnailUrl(url, []);
};
