export const DEFAULT_REMOTE_TIMEOUT_MS = 15_000;
export const DEFAULT_REMOTE_UA = 'Mozilla/5.0 (compatible; CaptureInbox/2.0)';

export interface RemoteTextFetchOptions {
  timeoutMs?: number;
  userAgent?: string;
  accept?: string;
}

export interface RemoteJsonFetchOptions {
  timeoutMs?: number;
  headers?: Record<string, string>;
  data?: unknown;
}

export type RemoteFetchResult =
  | { ok: true; status: number; text: string }
  | { ok: false; status: number; error: string };

export type RemoteJsonResult =
  | { ok: true; status: number; data: unknown }
  | { ok: false; status: number; error: string };

export interface RemoteImageFetchOptions {
  timeoutMs?: number;
  userAgent?: string;
  referer?: string;
}

export type RemoteImageResult =
  | { ok: true; status: number; data: Buffer; contentType: string }
  | { ok: false; status: number; error: string };

export const isAllowedRemoteUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

export const fetchRemoteTextUpstream = async (
  targetUrl: string,
  options: RemoteTextFetchOptions = {}
): Promise<RemoteFetchResult> => {
  const timeoutMs = options.timeoutMs ?? DEFAULT_REMOTE_TIMEOUT_MS;
  const userAgent = options.userAgent?.trim() || DEFAULT_REMOTE_UA;
  const accept = options.accept?.trim() || 'text/html,application/xhtml+xml,text/xml,application/xml';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(targetUrl, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        Accept: accept,
        'User-Agent': userAgent
      }
    });

    const text = await response.text();

    if (!response.ok) {
      return {
        ok: false,
        status: 502,
        error: `Upstream HTTP ${response.status}`
      };
    }

    return { ok: true, status: response.status, text };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const timedOut = message.toLowerCase().includes('abort');
    return {
      ok: false,
      status: timedOut ? 504 : 502,
      error: timedOut ? 'Upstream request timed out' : message
    };
  } finally {
    clearTimeout(timer);
  }
};

export const postRemoteJsonUpstream = async (
  targetUrl: string,
  options: RemoteJsonFetchOptions = {}
): Promise<RemoteJsonResult> => {
  const timeoutMs = options.timeoutMs ?? 60_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': DEFAULT_REMOTE_UA,
        ...(options.headers ?? {})
      },
      body: JSON.stringify(options.data ?? {})
    });

    const text = await response.text();
    let data: unknown = text;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      // Keep raw text when upstream is not JSON.
    }

    return { ok: true, status: response.status, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const timedOut = message.toLowerCase().includes('abort');
    return {
      ok: false,
      status: timedOut ? 504 : 502,
      error: timedOut ? 'Upstream request timed out' : message
    };
  } finally {
    clearTimeout(timer);
  }
};

export const fetchRemoteImageUpstream = async (
  targetUrl: string,
  options: RemoteImageFetchOptions = {}
): Promise<RemoteImageResult> => {
  const timeoutMs = options.timeoutMs ?? DEFAULT_REMOTE_TIMEOUT_MS;
  const userAgent = options.userAgent?.trim() || DEFAULT_REMOTE_UA;
  const headers: Record<string, string> = {
    Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
    'User-Agent': userAgent
  };

  if (options.referer?.trim()) {
    headers.Referer = options.referer.trim();
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(targetUrl, {
      signal: controller.signal,
      redirect: 'follow',
      headers
    });

    if (!response.ok) {
      return {
        ok: false,
        status: 502,
        error: `Upstream HTTP ${response.status}`
      };
    }

    const data = Buffer.from(await response.arrayBuffer());
    if (!data.length) {
      return { ok: false, status: 502, error: 'Empty image response' };
    }

    const contentType = response.headers.get('content-type')?.split(';')[0]?.trim() || 'image/jpeg';
    return { ok: true, status: response.status, data, contentType };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const timedOut = message.toLowerCase().includes('abort');
    return {
      ok: false,
      status: timedOut ? 504 : 502,
      error: timedOut ? 'Upstream request timed out' : message
    };
  } finally {
    clearTimeout(timer);
  }
};
