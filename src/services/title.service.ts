import { Capture } from '../types/capture';

const DEFAULT_MAX_LENGTH = 100;

const PLATFORM_SUFFIX =
  /\s*[|\-–—•:]\s*(YouTube|Instagram|TikTok|Facebook|Twitter|X|LinkedIn|Reddit|WhatsApp|Threads).*$/i;

const PLATFORM_PREFIX = /^(watch|video|reel|post|shared\s+from)\s*[:\-–—•]?\s*/i;

const SOCIAL_ATTRIBUTION =
  /^(.+?)\s+on\s+(Instagram|YouTube|TikTok|Facebook|Threads|Twitter|X|LinkedIn|Reddit)\s*:\s*(.*)$/is;

const GARBAGE_TITLE = /^[\s&;.'"\-–—|,!?:#@]+$/i;

const decodeHtmlEntities = (text: string): string => {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&\s*;/g, ' ');
};

const stripWrappingQuotes = (text: string): string => {
  return text.replace(/^["'`]+|["'`]+$/g, '').trim();
};

const extractSocialCaption = (title: string): string | null => {
  const match = title.match(SOCIAL_ATTRIBUTION);
  if (!match) {
    return null;
  }

  const author = stripWrappingQuotes(match[1]?.trim() ?? '');
  const caption = stripWrappingQuotes(match[3]?.trim() ?? '');

  if (caption && !isGarbageTitle(caption)) {
    return caption;
  }
  if (author && !isGarbageTitle(author)) {
    return author;
  }

  return null;
};

const truncateAtWord = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) {
    return text;
  }

  const slice = text.slice(0, maxLength);
  const lastSpace = slice.lastIndexOf(' ');
  if (lastSpace > maxLength * 0.6) {
    return slice.slice(0, lastSpace).trim();
  }

  return slice.trim();
};

const takeFirstSentence = (text: string): string => {
  const match = text.match(/^(.+?[.!?])(?:\s|$)/);
  return match ? match[1].trim() : text;
};

export const isGarbageTitle = (title: string): boolean => {
  const trimmed = title.trim();
  return !trimmed || GARBAGE_TITLE.test(trimmed);
};

export const isDirtyShareTitle = (title: string | null | undefined, url = ''): boolean => {
  const normalized = title?.trim();
  if (!normalized || normalized === url.trim()) {
    return true;
  }

  if (SOCIAL_ATTRIBUTION.test(normalized)) {
    return true;
  }

  if (/&\s*;/.test(normalized)) {
    return true;
  }

  const cleaned = cleanTitle(normalized);
  return !cleaned || cleaned !== normalized;
};

export const cleanTitle = (rawTitle: string, maxLength = DEFAULT_MAX_LENGTH): string => {
  let title = decodeHtmlEntities(rawTitle).replace(/\s+/g, ' ').trim();
  if (!title) {
    return '';
  }

  title = title.split('\n')[0]?.trim() ?? title;

  const socialCaption = extractSocialCaption(title);
  if (socialCaption) {
    title = socialCaption;
  }

  title = title.replace(/https?:\/\/\S+/gi, ' ');
  title = title.replace(/@\w+/g, ' ');
  title = title.replace(/#\w+/g, ' ');
  title = title.replace(PLATFORM_SUFFIX, '');
  title = title.replace(PLATFORM_PREFIX, '');
  title = stripWrappingQuotes(title);
  title = title.replace(/\s*[|\-–—•]\s*$/, '');
  title = title.replace(/\s+/g, ' ').trim();

  if (isGarbageTitle(title)) {
    return '';
  }

  if (title.length > maxLength * 1.5) {
    title = takeFirstSentence(title);
  }

  return truncateAtWord(title, maxLength);
};

export const suggestTitle = (rawTitle: string, maxLength = DEFAULT_MAX_LENGTH): string => {
  return cleanTitle(rawTitle, maxLength);
};

export const titlesAreEquivalent = (left: string | null | undefined, right: string | null | undefined): boolean => {
  return cleanTitle(left ?? '') === cleanTitle(right ?? '');
};

const titleFromUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./i, '') || url;
  } catch {
    return url;
  }
};

export const getCaptureDisplayTitle = (capture: Capture): string => {
  const rawTitle = capture.title?.trim();
  if (rawTitle) {
    const cleaned = cleanTitle(rawTitle);
    if (cleaned) {
      return cleaned;
    }
  }

  if (capture.type === 'url' && capture.url) {
    return titleFromUrl(capture.url);
  }

  if (capture.type === 'file') {
    return cleanTitle(capture.title ?? '') || 'Shared file';
  }

  if (capture.content?.trim()) {
    const preview = cleanTitle(capture.content.trim());
    if (preview) {
      return preview;
    }
  }

  return 'Untitled note';
};
