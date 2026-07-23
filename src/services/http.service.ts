import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { getAppRuntime, isElectronShell, isWebRuntime } from '../utils/platform';
import { detectLinkPlatform } from './link.service';
import { assertNetworkOnline } from './network.service';

const DEFAULT_TIMEOUT_MS = 15_000;
const NATIVE_DNS_RETRY_ATTEMPTS = 3;
const NATIVE_DNS_RETRY_DELAY_MS = 2_000;
const DNS_ERROR_PATTERN = /unable to resolve|no address associated|unknownhost|enotfound/i;
export const WEB_REMOTE_TEXT_PROXY_PATH = '/api/remote-text';
export const WEB_REMOTE_JSON_PROXY_PATH = '/api/remote-json';
export const WEB_REMOTE_IMAGE_PROXY_PATH = '/api/remote-image';
export const ELECTRON_REMOTE_PROXY_ORIGIN = 'http://127.0.0.1:31999';

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

const isDnsResolutionError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error);
  return DNS_ERROR_PATTERN.test(message);
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });

export const formatNetworkError = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error);

  if (isDnsResolutionError(error)) {
    const runtime = getAppRuntime();
    if (runtime === 'android' || runtime === 'ios') {
      return 'Could not reach the server. Check your internet connection, turn off VPN or private DNS/ad blockers, then try again.';
    }
    if (isElectronShell()) {
      return 'Could not reach the server from the desktop app. Check your connection and try again.';
    }
    if (isWebRuntime()) {
      return 'Could not reach the server from the browser. Check your connection and try again.';
    }
  }

  if (
    message === 'Failed to fetch' ||
    message === 'fetch failed' ||
    message.includes('Network request failed') ||
    message.includes('Load failed') ||
    message.includes('Network Error')
  ) {
    return isWebRuntime()
      ? 'Could not reach the page from the browser. Start the app with `npm run dev` (metadata proxy) or use the Android app.'
      : isElectronShell()
        ? 'Could not reach the page from the desktop app. Check your connection and try again.'
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

const shouldUseRemoteProxy = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }
  if (import.meta.env.MODE === 'test') {
    return false;
  }
  if (isElectronShell()) {
    return true;
  }
  // Mobile native always uses CapacitorHttp — never the web/Electron proxy.
  if (Capacitor.isNativePlatform()) {
    return false;
  }
  return getAppRuntime() === 'web';
};

const getRemoteProxyOrigin = (): string => {
  if (isElectronShell()) {
    return ELECTRON_REMOTE_PROXY_ORIGIN;
  }
  return '';
};

const shouldUseWebRemoteProxy = shouldUseRemoteProxy;

export const shouldProxyRemoteImage = (imageUrl: string, pageUrl?: string): boolean => {
  if (pageUrl) {
    const platform = detectLinkPlatform(pageUrl);
    if (platform === 'instagram' || platform === 'tiktok') {
      return true;
    }
  }

  try {
    const host = new URL(imageUrl).hostname.toLowerCase();
    return host.includes('cdninstagram.com') || host.includes('fbcdn.net') || host.includes('tiktokcdn');
  } catch {
    return false;
  }
};

export const buildRemoteImageProxyUrl = (url: string, options: FetchImageOptions = {}): string => {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const params = new URLSearchParams({
    url,
    timeoutMs: String(timeoutMs)
  });

  if (options.userAgent) {
    params.set('ua', options.userAgent);
  }
  if (options.referer) {
    params.set('referer', options.referer);
  }

  return `${getRemoteProxyOrigin()}${WEB_REMOTE_IMAGE_PROXY_PATH}?${params.toString()}`;
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
    const response = await fetch(`${getRemoteProxyOrigin()}${WEB_REMOTE_TEXT_PROXY_PATH}?${params.toString()}`, {
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
  assertNetworkOnline();

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
  assertNetworkOnline();

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  if (shouldUseWebRemoteProxy()) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(buildRemoteImageProxyUrl(url, options), {
        signal: controller.signal
      });

      if (!response.ok) {
        let message = `Proxy HTTP ${response.status}`;
        try {
          const parsed = (await response.json()) as { error?: string };
          if (parsed.error) {
            message = parsed.error;
          }
        } catch {
          // Ignore non-JSON error bodies.
        }
        throw new Error(message);
      }

      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      if (!bytes.length) {
        throw new Error('Empty image response');
      }

      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('HTTP ')) {
        throw error;
      }
      throw new Error(formatNetworkError(error));
    } finally {
      window.clearTimeout(timer);
    }
  }

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

const postRemoteNative = async (
  url: string,
  options: PostRemoteOptions
): Promise<{ status: number; data: unknown }> => {
  const timeoutMs = options.timeoutMs ?? 60_000;
  const request = () =>
    CapacitorHttp.post({
      url,
      connectTimeout: timeoutMs,
      readTimeout: timeoutMs,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      data: options.data
    });

  let lastError: unknown;

  for (let attempt = 0; attempt < NATIVE_DNS_RETRY_ATTEMPTS; attempt += 1) {
    try {
      const response = await request();
      return { status: response.status, data: response.data };
    } catch (error) {
      lastError = error;
      const canRetry = attempt < NATIVE_DNS_RETRY_ATTEMPTS - 1 && isDnsResolutionError(error);
      if (!canRetry) {
        break;
      }
      await sleep(NATIVE_DNS_RETRY_DELAY_MS);
    }
  }

  if (lastError instanceof Error && lastError.message.startsWith('HTTP ')) {
    throw lastError;
  }
  throw new Error(formatNetworkError(lastError));
};

export const postRemote = async (
  url: string,
  options: PostRemoteOptions
): Promise<{ status: number; data: unknown }> => {
  assertNetworkOnline();

  const timeoutMs = options.timeoutMs ?? 60_000;

  if (shouldUseWebRemoteProxy()) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${getRemoteProxyOrigin()}${WEB_REMOTE_JSON_PROXY_PATH}`, {
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

  return postRemoteNative(url, options);
};
