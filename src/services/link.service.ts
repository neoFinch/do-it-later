import { AppLauncher } from '@capacitor/app-launcher';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { Capture } from '../types/capture';

export type LinkPlatform = 'youtube' | 'instagram' | 'tiktok' | 'twitter' | 'reddit' | 'linkedin' | 'generic';

export const normalizeUrl = (url: string): string => {
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
};

/** Query params ignored when detecting duplicate URL captures. */
const TRACKING_QUERY_PARAMS = new Set([
  'si',
  'fbclid',
  'gclid',
  'igsh',
  'igshid',
  'ref',
  'ref_src',
  'ref_source',
  's',
  't',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id'
]);

const stripTrackingParams = (parsed: URL): void => {
  for (const key of [...parsed.searchParams.keys()]) {
    if (TRACKING_QUERY_PARAMS.has(key.toLowerCase()) || key.toLowerCase().startsWith('utm_')) {
      parsed.searchParams.delete(key);
    }
  }
};

/** Canonical form used to detect duplicate URL captures. */
export const canonicalizeCaptureUrl = (url: string): string => {
  const normalized = normalizeUrl(url.trim());

  try {
    const parsed = new URL(normalized);
    parsed.hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
    parsed.hash = '';
    if (parsed.pathname.length > 1 && parsed.pathname.endsWith('/')) {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }

    const videoId = extractYouTubeVideoId(parsed.toString());
    if (videoId) {
      return `https://youtube.com/watch?v=${videoId}`;
    }

    stripTrackingParams(parsed);
    parsed.search = parsed.searchParams.toString();
    if (parsed.search) {
      parsed.search = `?${parsed.search}`;
    }

    return parsed.toString();
  } catch {
    return normalized.toLowerCase();
  }
};

export const extractFirstUrl = (text: string): string | null => {
  const match = text.match(/https?:\/\/[^\s]+/i);
  return match ? match[0] : null;
};

/** Strip trailing junk (e.g. `/` from pasted watch URLs) from a YouTube video id. */
const sanitizeYouTubeVideoId = (raw: string | null | undefined): string | null => {
  const match = raw?.trim().match(/^[\w-]+/);
  return match?.[0] ?? null;
};

export const extractYouTubeVideoId = (url: string): string | null => {
  try {
    const parsed = new URL(normalizeUrl(url));
    const host = parsed.hostname.replace(/^www\./, '');

    if (host === 'youtu.be') {
      return sanitizeYouTubeVideoId(parsed.pathname.slice(1).split('/')[0]);
    }

    if (host.includes('youtube.com') || host === 'youtube-nocookie.com') {
      if (parsed.pathname === '/watch') {
        return sanitizeYouTubeVideoId(parsed.searchParams.get('v'));
      }

      const pathMatch = parsed.pathname.match(/^\/(shorts|live|embed)\/([^/?]+)/);
      if (pathMatch) {
        return sanitizeYouTubeVideoId(pathMatch[2]);
      }
    }
  } catch {
    return null;
  }

  return null;
};

export const detectLinkPlatform = (url: string): LinkPlatform => {
  try {
    const host = new URL(normalizeUrl(url)).hostname.replace(/^www\./, '');

    if (host.includes('youtube.com') || host === 'youtu.be' || host === 'youtube-nocookie.com') {
      return 'youtube';
    }
    if (host.includes('instagram.com')) {
      return 'instagram';
    }
    if (host.includes('tiktok.com')) {
      return 'tiktok';
    }
    if (host === 'twitter.com' || host === 'x.com') {
      return 'twitter';
    }
    if (host.includes('reddit.com')) {
      return 'reddit';
    }
    if (host.includes('linkedin.com')) {
      return 'linkedin';
    }
  } catch {
    return 'generic';
  }

  return 'generic';
};

export const getNativeAppUrl = (url: string): string | null => {
  const normalized = normalizeUrl(url);
  const platform = detectLinkPlatform(normalized);

  if (platform === 'youtube') {
    const videoId = extractYouTubeVideoId(normalized);
    if (!videoId) {
      return null;
    }

    return Capacitor.getPlatform() === 'ios'
      ? `youtube://watch?v=${videoId}`
      : `vnd.youtube:${videoId}`;
  }

  if (platform === 'instagram') {
    return normalized.replace(/^https?:\/\//, 'instagram://');
  }

  if (platform === 'tiktok') {
    return normalized.replace(/^https?:\/\//, 'snssdk1180://');
  }

  if (platform === 'twitter') {
    return normalized.replace(/^https?:\/\//, 'twitter://');
  }

  if (platform === 'reddit') {
    return normalized.replace(/^https?:\/\//, 'reddit://');
  }

  if (platform === 'linkedin') {
    return normalized.replace(/^https?:\/\//, 'linkedin://');
  }

  return null;
};

export const getOpenLinkLabel = (url: string): string => {
  switch (detectLinkPlatform(url)) {
    case 'youtube':
      return 'Open in YouTube';
    case 'instagram':
      return 'Open in Instagram';
    case 'tiktok':
      return 'Open in TikTok';
    case 'twitter':
      return 'Open in X';
    case 'reddit':
      return 'Open in Reddit';
    case 'linkedin':
      return 'Open in LinkedIn';
    default:
      return 'Open Link';
  }
};

export const getCaptureLink = (capture: Capture): string | null => {
  if (capture.type === 'url' && capture.url) {
    return capture.url;
  }

  if (capture.content) {
    return extractFirstUrl(capture.content);
  }

  return null;
};

const tryLaunchUrl = async (url: string): Promise<boolean> => {
  try {
    const { completed } = await AppLauncher.openUrl({ url });
    return completed;
  } catch {
    return false;
  }
};

export const openLink = async (url: string): Promise<void> => {
  const normalized = normalizeUrl(url);

  if (!Capacitor.isNativePlatform()) {
    window.open(normalized, '_blank', 'noopener,noreferrer');
    return;
  }

  const nativeUrl = getNativeAppUrl(normalized);
  if (nativeUrl && (await tryLaunchUrl(nativeUrl))) {
    return;
  }

  if (await tryLaunchUrl(normalized)) {
    return;
  }

  await Browser.open({ url: normalized });
};
