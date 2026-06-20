import { Capacitor, CapacitorHttp } from '@capacitor/core';

export interface UrlMetadata {
  title?: string;
  thumbnail?: string;
  source?: string;
}

const FETCH_TIMEOUT_MS = 10_000;

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

export const parseOpenGraphMetadata = (html: string): UrlMetadata => {
  const title =
    getMetaContent(html, 'og:title') ??
    getMetaContent(html, 'twitter:title', 'name') ??
    html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ??
    undefined;

  const thumbnail =
    getMetaContent(html, 'og:image') ??
    getMetaContent(html, 'twitter:image', 'name') ??
    getMetaContent(html, 'twitter:image:src', 'name') ??
    undefined;

  const source = getMetaContent(html, 'og:site_name') ?? undefined;

  return {
    title: title ? decodeHtmlEntities(title) : undefined,
    thumbnail,
    source
  };
};

const fetchPageHtml = async (url: string): Promise<string> => {
  if (Capacitor.isNativePlatform()) {
    const response = await CapacitorHttp.get({
      url,
      connectTimeout: FETCH_TIMEOUT_MS,
      readTimeout: FETCH_TIMEOUT_MS,
      responseType: 'text',
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'Mozilla/5.0 (compatible; CaptureInbox/1.0)'
      }
    });

    if (response.status >= 400) {
      throw new Error(`HTTP ${response.status}`);
    }

    return typeof response.data === 'string' ? response.data : String(response.data ?? '');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'text/html,application/xhtml+xml'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
};

export const fetchUrlMetadata = async (url: string): Promise<UrlMetadata> => {
  const html = await fetchPageHtml(url);
  return parseOpenGraphMetadata(html);
};
