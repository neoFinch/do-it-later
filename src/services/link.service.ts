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

export const extractFirstUrl = (text: string): string | null => {
  const match = text.match(/https?:\/\/[^\s]+/i);
  return match ? match[0] : null;
};

export const extractYouTubeVideoId = (url: string): string | null => {
  try {
    const parsed = new URL(normalizeUrl(url));
    const host = parsed.hostname.replace(/^www\./, '');

    if (host === 'youtu.be') {
      return parsed.pathname.slice(1).split('/')[0] || null;
    }

    if (host.includes('youtube.com') || host === 'youtube-nocookie.com') {
      if (parsed.pathname === '/watch') {
        return parsed.searchParams.get('v');
      }

      const pathMatch = parsed.pathname.match(/^\/(shorts|live|embed)\/([^/?]+)/);
      if (pathMatch) {
        return pathMatch[2];
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
