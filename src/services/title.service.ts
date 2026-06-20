const DEFAULT_MAX_LENGTH = 100;

const PLATFORM_SUFFIX =
  /\s*[|\-–—•:]\s*(YouTube|Instagram|TikTok|Facebook|Twitter|X|LinkedIn|Reddit|WhatsApp|Threads).*$/i;

const PLATFORM_PREFIX = /^(watch|video|reel|post|shared\s+from)\s*[:\-–—•]?\s*/i;

const decodeHtmlEntities = (text: string): string => {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
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

export const cleanTitle = (rawTitle: string, maxLength = DEFAULT_MAX_LENGTH): string => {
  let title = decodeHtmlEntities(rawTitle).replace(/\s+/g, ' ').trim();
  if (!title) {
    return '';
  }

  title = title.split('\n')[0]?.trim() ?? title;
  title = title.replace(/https?:\/\/\S+/gi, ' ');
  title = title.replace(/@\w+/g, ' ');
  title = title.replace(/#\w+/g, ' ');
  title = title.replace(PLATFORM_SUFFIX, '');
  title = title.replace(PLATFORM_PREFIX, '');
  title = title.replace(/\s*[|\-–—•]\s*$/, '');
  title = title.replace(/\s+/g, ' ').trim();

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
