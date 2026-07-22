import type { Connect, Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';

const TEXT_PROXY_PATH = '/api/remote-text';
const JSON_PROXY_PATH = '/api/remote-json';
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_UA = 'Mozilla/5.0 (compatible; CaptureInbox/2.0)';

const readQuery = (req: IncomingMessage): URLSearchParams => {
  const host = req.headers.host ?? 'localhost';
  const url = new URL(req.url ?? '/', `http://${host}`);
  return url.searchParams;
};

const readRequestBody = async (req: IncomingMessage): Promise<string> => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
};

const sendJson = (res: ServerResponse, status: number, body: unknown): void => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
};

const isAllowedRemoteUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const handleRemoteText: Connect.NextHandleFunction = async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  const params = readQuery(req);
  const targetUrl = params.get('url')?.trim() ?? '';
  if (!targetUrl || !isAllowedRemoteUrl(targetUrl)) {
    sendJson(res, 400, { error: 'Valid http(s) url query param is required' });
    return;
  }

  const timeoutMs = Number(params.get('timeoutMs') ?? DEFAULT_TIMEOUT_MS);
  const userAgent = params.get('ua')?.trim() || DEFAULT_UA;
  const accept = params.get('accept')?.trim() || 'text/html,application/xhtml+xml,text/xml,application/xml';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Number.isFinite(timeoutMs) ? timeoutMs : DEFAULT_TIMEOUT_MS);

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
      sendJson(res, 502, {
        error: `Upstream HTTP ${response.status}`,
        status: response.status
      });
      return;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(text);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const timedOut = message.toLowerCase().includes('abort');
    sendJson(res, timedOut ? 504 : 502, {
      error: timedOut ? 'Upstream request timed out' : message
    });
  } finally {
    clearTimeout(timer);
  }
};

interface RemoteJsonRequest {
  url?: string;
  headers?: Record<string, string>;
  data?: unknown;
  timeoutMs?: number;
}

const handleRemoteJson: Connect.NextHandleFunction = async (req, res) => {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  let payload: RemoteJsonRequest;
  try {
    payload = JSON.parse(await readRequestBody(req)) as RemoteJsonRequest;
  } catch {
    sendJson(res, 400, { error: 'Invalid JSON body' });
    return;
  }

  const targetUrl = payload.url?.trim() ?? '';
  if (!targetUrl || !isAllowedRemoteUrl(targetUrl)) {
    sendJson(res, 400, { error: 'Valid http(s) url is required' });
    return;
  }

  const timeoutMs = Number(payload.timeoutMs ?? 60_000);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Number.isFinite(timeoutMs) ? timeoutMs : 60_000);

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': DEFAULT_UA,
        ...(payload.headers ?? {})
      },
      body: JSON.stringify(payload.data ?? {})
    });

    const text = await response.text();
    let data: unknown = text;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      // Keep raw text when upstream is not JSON.
    }

    sendJson(res, 200, { status: response.status, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const timedOut = message.toLowerCase().includes('abort');
    sendJson(res, timedOut ? 504 : 502, {
      error: timedOut ? 'Upstream request timed out' : message
    });
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Dev/preview middleware so the browser can fetch remote HTML/JSON without CORS.
 * - GET  /api/remote-text?url=...
 * - POST /api/remote-json  { url, headers?, data?, timeoutMs? }
 */
export const remoteTextProxyPlugin = (): Plugin => ({
  name: 'remote-text-proxy',
  configureServer(server) {
    server.middlewares.use(TEXT_PROXY_PATH, handleRemoteText);
    server.middlewares.use(JSON_PROXY_PATH, handleRemoteJson);
  },
  configurePreviewServer(server) {
    server.middlewares.use(TEXT_PROXY_PATH, handleRemoteText);
    server.middlewares.use(JSON_PROXY_PATH, handleRemoteJson);
  }
});

export const WEB_REMOTE_TEXT_PROXY_PATH = TEXT_PROXY_PATH;
export const WEB_REMOTE_JSON_PROXY_PATH = JSON_PROXY_PATH;
