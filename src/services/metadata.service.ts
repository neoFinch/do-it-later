import { fetchRemoteText } from './http.service';
import { pickThumbnailUrl } from './thumbnail.service';

export interface UrlMetadata {
  title?: string;
  description?: string;
  thumbnail?: string;
  source?: string;
  author?: string;
}

/** Instagram serves og:image to this UA; desktop Chrome gets a login shell without images. */
export const METADATA_USER_AGENT = 'Mozilla/5.0 (compatible; CaptureInbox/1.0)';

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

const getMetaContent = (html: string, key: string, attr: 'property' | 'name' = 'property'): string | null => {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(
    `<meta[^>]+${attr}=["']${escapedKey}["'][^>]+content=["']([^"']+)["']|<meta[^>]+content=["']([^"']+)["'][^>]+${attr}=["']${escapedKey}["']`,
    'i'
  );
  const match = html.match(regex);
  if (!match) {
    return null;
  }
  const value = (match[1] ?? match[2] ?? '').trim();
  return value ? decodeHtmlEntities(value) : null;
};

const decodeJsonString = (value: string): string => {
  return decodeHtmlEntities(value.replace(/\\u0026/g, '&').replace(/\\\//g, '/'));
};

const extractEmbeddedThumbnail = (html: string): string | undefined => {
  const patterns = [
    /"og:image"\s*:\s*"([^"]+)"/,
    /"display_url"\s*:\s*"([^"]+)"/,
    /"thumbnail_src"\s*:\s*"([^"]+)"/
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]?.trim()) {
      return decodeJsonString(match[1]);
    }
  }

  return undefined;
};

export const parseOpenGraphMetadata = (html: string, pageUrl?: string): UrlMetadata => {
  const title =
    getMetaContent(html, 'og:title') ??
    getMetaContent(html, 'twitter:title', 'name') ??
    html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ??
    undefined;

  const thumbnailRaw =
    getMetaContent(html, 'og:image') ??
    getMetaContent(html, 'twitter:image', 'name') ??
    getMetaContent(html, 'twitter:image:src', 'name') ??
    extractEmbeddedThumbnail(html) ??
    undefined;

  const thumbnail = pageUrl
    ? pickThumbnailUrl(pageUrl, [thumbnailRaw])
    : thumbnailRaw
      ? decodeHtmlEntities(thumbnailRaw)
      : undefined;

  const description =
    getMetaContent(html, 'og:description') ??
    getMetaContent(html, 'twitter:description', 'name') ??
    getMetaContent(html, 'description', 'name') ??
    undefined;

  const source = getMetaContent(html, 'og:site_name') ?? undefined;
  const author =
    getMetaContent(html, 'author', 'name') ??
    getMetaContent(html, 'article:author') ??
    undefined;

  return {
    title: title ? decodeHtmlEntities(title) : undefined,
    description: description ? decodeHtmlEntities(description) : undefined,
    thumbnail,
    source,
    author: author ? decodeHtmlEntities(author) : undefined
  };
};

export const fetchPageHtml = async (url: string, userAgent = METADATA_USER_AGENT): Promise<string> => {
  return fetchRemoteText(url, {
    accept: 'text/html,application/xhtml+xml',
    userAgent
  });
};

export const fetchUrlMetadata = async (url: string): Promise<UrlMetadata> => {
  try {
    const html = await fetchPageHtml(url);
    return parseOpenGraphMetadata(html, url);
  } catch {
    const thumbnail = pickThumbnailUrl(url, []);
    return thumbnail ? { thumbnail } : {};
  }
};
