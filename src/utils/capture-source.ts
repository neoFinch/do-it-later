import { Capture } from '../types/capture';
import { detectLinkPlatform, LinkPlatform } from '../services/link.service';
import { isImageMime } from '../services/file.service';

export type SourceBadgeVariant =
  | LinkPlatform
  | 'note'
  | 'image'
  | 'file'
  | 'generic';

export interface CaptureSourceBadge {
  label: string;
  variant: SourceBadgeVariant;
}

const PLATFORM_LABELS: Record<LinkPlatform, string> = {
  youtube: 'YouTube',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  twitter: 'X',
  reddit: 'Reddit',
  linkedin: 'LinkedIn',
  generic: 'Link'
};

const normalizeSourceName = (source: string): CaptureSourceBadge | null => {
  const lower = source.toLowerCase();

  if (lower.includes('youtube')) {
    return { label: 'YouTube', variant: 'youtube' };
  }
  if (lower.includes('instagram')) {
    return { label: 'Instagram', variant: 'instagram' };
  }
  if (lower.includes('tiktok')) {
    return { label: 'TikTok', variant: 'tiktok' };
  }
  if (lower.includes('twitter') || lower === 'x') {
    return { label: 'X', variant: 'twitter' };
  }
  if (lower.includes('reddit')) {
    return { label: 'Reddit', variant: 'reddit' };
  }
  if (lower.includes('linkedin')) {
    return { label: 'LinkedIn', variant: 'linkedin' };
  }

  return null;
};

export const getCaptureSourceBadge = (capture: Capture): CaptureSourceBadge => {
  if (capture.type === 'note') {
    return { label: 'Note', variant: 'note' };
  }

  if (capture.type === 'file') {
    if (isImageMime(capture.source)) {
      return { label: 'Image', variant: 'image' };
    }
    return { label: 'File', variant: 'file' };
  }

  if (capture.source?.trim()) {
    const fromSource = normalizeSourceName(capture.source.trim());
    if (fromSource) {
      return fromSource;
    }
  }

  if (capture.url) {
    const platform = detectLinkPlatform(capture.url);
    return {
      label: PLATFORM_LABELS[platform],
      variant: platform
    };
  }

  return { label: 'Link', variant: 'generic' };
};
