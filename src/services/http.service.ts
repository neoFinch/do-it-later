import { CapacitorHttp } from '@capacitor/core';
import { isWebRuntime } from '../utils/platform';

const DEFAULT_TIMEOUT_MS = 15_000;
export const WEB_REMOTE_TEXT_PROXY_PATH = '/api/remote-text';
export const WEB_REMOTE_JSON_PROXY_PATH = '/api/remote-json';

export interface FetchTextOptions {
  timeoutMs?: number;
  accept?: string;
  userAgent?: string;
}

export interface FetchImageOptions {
  timeoutMs?: number;
  userAgent?: string;
  referer?: string;
}

export interface PostRemoteOptions {
  timeoutMs?: number;
  headers?: Record<string, string>;
  data: unknown;
}

export const formatNetworkError = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error);

  if (
    message === 'Failed to fetch' ||
    message === 'fetch failed' ||
    message.includes('Network request failed') ||
    message.includes('Load failed') ||
    message.includes('Network Error')
  ) {
    return isWebRuntime()
      ? 'Could not reach the page from the browser. Start the app with `npm run dev` (metadata proxy) or use the Android app.'
      : 'Could not reach the page. Check your connection, or use the installed Android app to extract content from URLs.';
  }

  if (message.toLowerCase().includes('abort') || message.toLowerCase().includes('timeout')) {
    return 'The request timed out. Try again.';
  }

  return message;
};

const normalizeResponseText = (data: unknown): string => {
  if (typeof data === 'string') {
    return data;
  }
  if (data == null) {
    return '';
  }
  if (typeof data === 'object') {
    return JSON.stringify(data);
  }
  return String(data);
};

const shouldUseWebRemoteProxy = (): boolean => {
  if (!isWebRuntime() || typeof window === 'undefined') {
    return false;
  }
  // Vitest / non-app pages shouldn't hit the Vite middleware.
  if (import.meta.env.MODE === 'test') {
    return false;
  }
  return true;
};

const fetchRemoteTextViaProxy = async (url: string, options: FetchTextOptions = {}): Promise<string> => {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const params = new URLSearchParams({
    url,
    timeoutMs: String(timeoutMs)
  });

  if (options.userAgent) {
    params.set('ua', options.userAgent);
  }
  if (options.accept) {
    params.set('accept', options.accept);
  }

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${WEB_REMOTE_TEXT_PROXY_PATH}?${params.toString()}`, {
      signal: controller.signal
    });

    const body = await response.text();

    if (!response.ok) {
      let message = `Proxy HTTP ${response.status}`;
      try {
        const parsed = JSON.parse(body) as { error?: string };
        if (parsed.error) {
          message = parsed.error;
        }
      } catch {
        if (body.trim()) {
          message = body.trim();
        }
      }
      throw new Error(message);
    }

    return body;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('HTTP ')) {
      throw error;
    }
    throw new Error(formatNetworkError(error));
  } finally {
    window.clearTimeout(timer);
  }
};

export const fetchRemoteText = async (url: string, options: FetchTextOptions = {}): Promise<string> => {
  if (shouldUseWebRemoteProxy()) {
    return fetchRemoteTextViaProxy(url, options);
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  try {
    const response = await CapacitorHttp.get({
      url,
      connectTimeout: timeoutMs,
      readTimeout: timeoutMs,
      responseType: 'text',
      headers: {
        Accept: options.accept ?? 'text/html,application/xhtml+xml,text/xml,application/xml',
        'User-Agent': options.userAgent ?? 'Mozilla/5.0 (compatible; CaptureInbox/2.0)'
      }
    });

    if (response.status >= 400) {
      throw new Error(`HTTP ${response.status}`);
    }

    return normalizeResponseText(response.data);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('HTTP ')) {
      throw error;
    }
    throw new Error(formatNetworkError(error));
  }
};

export const fetchRemoteImageBase64 = async (url: string, options: FetchImageOptions = {}): Promise<string> => {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const headers: Record<string, string> = {
    Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
    'User-Agent': options.userAgent ?? 'Mozilla/5.0 (compatible; CaptureInbox/1.0)'
  };

  if (options.referer) {
    headers.Referer = options.referer;
  }

  try {
    const response = await CapacitorHttp.get({
      url,
      connectTimeout: timeoutMs,
      readTimeout: timeoutMs,
      responseType: 'blob',
      headers
    });

    if (response.status >= 400) {
      throw new Error(`HTTP ${response.status}`);
    }

    if (typeof response.data !== 'string' || !response.data.trim()) {
      throw new Error('Empty image response');
    }

    return response.data;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('HTTP ')) {
      throw error;
    }
    throw new Error(formatNetworkError(error));
  }
};

export const postRemote = async (
  url: string,
  options: PostRemoteOptions
): Promise<{ status: number; data: unknown }> => {
  const timeoutMs = options.timeoutMs ?? 60_000;

  if (shouldUseWebRemoteProxy()) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(WEB_REMOTE_JSON_PROXY_PATH, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          headers: options.headers,
          data: options.data,
          timeoutMs
        })
      });

      const body = await response.text();
      let parsed: { status?: number; data?: unknown; error?: string } = {};
      try {
        parsed = JSON.parse(body) as typeof parsed;
      } catch {
        throw new Error(body || `Proxy HTTP ${response.status}`);
      }

      if (!response.ok) {
        throw new Error(parsed.error || `Proxy HTTP ${response.status}`);
      }

      return {
        status: typeof parsed.status === 'number' ? parsed.status : response.status,
        data: parsed.data
      };
    } catch (error) {
      throw new Error(formatNetworkError(error));
    } finally {
      window.clearTimeout(timer);
    }
  }

  try {
    const response = await CapacitorHttp.post({
      url,
      connectTimeout: timeoutMs,
      readTimeout: timeoutMs,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      data: options.data
    });

    return { status: response.status, data: response.data };
  } catch (error) {
    throw new Error(formatNetworkError(error));
  }
};
