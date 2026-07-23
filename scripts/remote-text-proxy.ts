import type { Connect, Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  DEFAULT_REMOTE_TIMEOUT_MS,
  fetchRemoteImageUpstream,
  fetchRemoteTextUpstream,
  isAllowedRemoteUrl,
  postRemoteJsonUpstream
} from '../electron/remote-fetch';

const TEXT_PROXY_PATH = '/api/remote-text';
const JSON_PROXY_PATH = '/api/remote-json';
const IMAGE_PROXY_PATH = '/api/remote-image';

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

  const timeoutMs = Number(params.get('timeoutMs') ?? DEFAULT_REMOTE_TIMEOUT_MS);
  const result = await fetchRemoteTextUpstream(targetUrl, {
    timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : DEFAULT_REMOTE_TIMEOUT_MS,
    userAgent: params.get('ua')?.trim() || undefined,
    accept: params.get('accept')?.trim() || undefined
  });

  if (!result.ok) {
    sendJson(res, result.status, { error: result.error, status: result.status });
    return;
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(result.text);
};

const handleRemoteJson: Connect.NextHandleFunction = async (req, res) => {
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

const handleRemoteImage: Connect.NextHandleFunction = async (req, res) => {
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

  const timeoutMs = Number(params.get('timeoutMs') ?? DEFAULT_REMOTE_TIMEOUT_MS);
  const result = await fetchRemoteImageUpstream(targetUrl, {
    timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : DEFAULT_REMOTE_TIMEOUT_MS,
    userAgent: params.get('ua')?.trim() || undefined,
    referer: params.get('referer')?.trim() || undefined
  });

  if (!result.ok) {
    sendJson(res, result.status, { error: result.error });
    return;
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', result.contentType);
  res.setHeader('Cache-Control', 'private, max-age=3600');
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  res.end(result.data);
};

/**
 * Dev/preview middleware so the browser can fetch remote HTML/JSON without CORS.
 * - GET  /api/remote-text?url=...
 * - POST /api/remote-json  { url, headers?, data?, timeoutMs? }
 * - GET  /api/remote-image?url=...&referer=...
 */
export const remoteTextProxyPlugin = (): Plugin => ({
  name: 'remote-text-proxy',
  configureServer(server) {
    server.middlewares.use(TEXT_PROXY_PATH, handleRemoteText);
    server.middlewares.use(JSON_PROXY_PATH, handleRemoteJson);
    server.middlewares.use(IMAGE_PROXY_PATH, handleRemoteImage);
  },
  configurePreviewServer(server) {
    server.middlewares.use(TEXT_PROXY_PATH, handleRemoteText);
    server.middlewares.use(JSON_PROXY_PATH, handleRemoteJson);
    server.middlewares.use(IMAGE_PROXY_PATH, handleRemoteImage);
  }
});

export const WEB_REMOTE_TEXT_PROXY_PATH = TEXT_PROXY_PATH;
export const WEB_REMOTE_JSON_PROXY_PATH = JSON_PROXY_PATH;
export const WEB_REMOTE_IMAGE_PROXY_PATH = IMAGE_PROXY_PATH;
