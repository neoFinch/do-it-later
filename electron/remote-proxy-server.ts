import http from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  DEFAULT_REMOTE_TIMEOUT_MS,
  fetchRemoteImageUpstream,
  fetchRemoteTextUpstream,
  isAllowedRemoteUrl,
  postRemoteJsonUpstream
} from './remote-fetch';

export const ELECTRON_REMOTE_PROXY_PORT = 31999;
export const ELECTRON_REMOTE_PROXY_ORIGIN = `http://127.0.0.1:${ELECTRON_REMOTE_PROXY_PORT}`;

const TEXT_PROXY_PATH = '/api/remote-text';
const JSON_PROXY_PATH = '/api/remote-json';
const IMAGE_PROXY_PATH = '/api/remote-image';

let server: http.Server | null = null;

const setCorsHeaders = (res: ServerResponse): void => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

const sendJson = (res: ServerResponse, status: number, body: unknown): void => {
  setCorsHeaders(res);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
};

const readRequestBody = async (req: IncomingMessage): Promise<string> => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
};

const handleRemoteText = async (req: IncomingMessage, res: ServerResponse, url: URL): Promise<void> => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  const targetUrl = url.searchParams.get('url')?.trim() ?? '';
  if (!targetUrl || !isAllowedRemoteUrl(targetUrl)) {
    sendJson(res, 400, { error: 'Valid http(s) url query param is required' });
    return;
  }

  const timeoutMs = Number(url.searchParams.get('timeoutMs') ?? DEFAULT_REMOTE_TIMEOUT_MS);
  const userAgent = url.searchParams.get('ua')?.trim() || undefined;
  const accept = url.searchParams.get('accept')?.trim() || undefined;

  const result = await fetchRemoteTextUpstream(targetUrl, {
    timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : DEFAULT_REMOTE_TIMEOUT_MS,
    userAgent,
    accept
  });

  if (!result.ok) {
    sendJson(res, result.status, { error: result.error });
    return;
  }

  res.statusCode = 200;
  setCorsHeaders(res);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(result.text);
};

const handleRemoteImage = async (req: IncomingMessage, res: ServerResponse, url: URL): Promise<void> => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  const targetUrl = url.searchParams.get('url')?.trim() ?? '';
  if (!targetUrl || !isAllowedRemoteUrl(targetUrl)) {
    sendJson(res, 400, { error: 'Valid http(s) url query param is required' });
    return;
  }

  const timeoutMs = Number(url.searchParams.get('timeoutMs') ?? DEFAULT_REMOTE_TIMEOUT_MS);
  const userAgent = url.searchParams.get('ua')?.trim() || undefined;
  const referer = url.searchParams.get('referer')?.trim() || undefined;

  const result = await fetchRemoteImageUpstream(targetUrl, {
    timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : DEFAULT_REMOTE_TIMEOUT_MS,
    userAgent,
    referer
  });

  if (!result.ok) {
    sendJson(res, result.status, { error: result.error });
    return;
  }

  res.statusCode = 200;
  setCorsHeaders(res);
  res.setHeader('Content-Type', result.contentType);
  res.setHeader('Cache-Control', 'private, max-age=3600');
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  res.end(result.data);
};

const handleRemoteJson = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  let payload: {
    url?: string;
    headers?: Record<string, string>;
    data?: unknown;
    timeoutMs?: number;
  };

  try {
    payload = JSON.parse(await readRequestBody(req)) as typeof payload;
  } catch {
    sendJson(res, 400, { error: 'Invalid JSON body' });
    return;
  }

  const targetUrl = payload.url?.trim() ?? '';
  if (!targetUrl || !isAllowedRemoteUrl(targetUrl)) {
    sendJson(res, 400, { error: 'Valid http(s) url is required' });
    return;
  }

  const result = await postRemoteJsonUpstream(targetUrl, {
    timeoutMs: payload.timeoutMs,
    headers: payload.headers,
    data: payload.data
  });

  if (!result.ok) {
    sendJson(res, result.status, { error: result.error });
    return;
  }

  sendJson(res, 200, { status: result.status, data: result.data });
};

const handleRequest = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
  if (req.method === 'OPTIONS') {
    setCorsHeaders(res);
    res.statusCode = 204;
    res.end();
    return;
  }

  const host = req.headers.host ?? `127.0.0.1:${ELECTRON_REMOTE_PROXY_PORT}`;
  const url = new URL(req.url ?? '/', `http://${host}`);

  try {
    if (url.pathname === TEXT_PROXY_PATH) {
      await handleRemoteText(req, res, url);
      return;
    }

    if (url.pathname === JSON_PROXY_PATH) {
      await handleRemoteJson(req, res);
      return;
    }

    if (url.pathname === IMAGE_PROXY_PATH) {
      await handleRemoteImage(req, res, url);
      return;
    }

    sendJson(res, 404, { error: 'Not found' });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    sendJson(res, 500, { error: message });
  }
};

export const startRemoteProxyServer = (): Promise<void> => {
  if (server) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const nextServer = http.createServer((req, res) => {
      void handleRequest(req, res);
    });

    nextServer.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        resolve();
        return;
      }
      reject(error);
    });
    nextServer.listen(ELECTRON_REMOTE_PROXY_PORT, '127.0.0.1', () => {
      server = nextServer;
      resolve();
    });
  });
};

export const stopRemoteProxyServer = (): Promise<void> => {
  if (!server) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    server?.close((error) => {
      server = null;
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
};
