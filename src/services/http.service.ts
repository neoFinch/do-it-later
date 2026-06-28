import { CapacitorHttp } from '@capacitor/core';

const DEFAULT_TIMEOUT_MS = 15_000;

export interface FetchTextOptions {
  timeoutMs?: number;
  accept?: string;
  userAgent?: string;
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
    return 'Could not reach the page. Check your connection, or use the installed Android app to extract content from URLs.';
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

export const fetchRemoteText = async (url: string, options: FetchTextOptions = {}): Promise<string> => {
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

export const postRemote = async (
  url: string,
  options: PostRemoteOptions
): Promise<{ status: number; data: unknown }> => {
  const timeoutMs = options.timeoutMs ?? 60_000;

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
