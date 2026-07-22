import { postRemote, fetchRemoteText } from '../http.service';
import { extractYouTubeVideoId, normalizeUrl } from '../link.service';

const YOUTUBE_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const DEFAULT_INNERTUBE_KEY = 'AIzaSyAO_FJ2SlWDRk5A8S1bY8N0-';

interface CaptionTrack {
  baseUrl?: string;
  languageCode?: string;
  kind?: string;
  name?: { simpleText?: string };
}

interface PlayerCaptions {
  captions?: {
    playerCaptionsTracklistRenderer?: {
      captionTracks?: CaptionTrack[];
    };
  };
}

interface Json3Event {
  segs?: Array<{ utf8?: string }>;
}

interface Json3Transcript {
  events?: Json3Event[];
}

const decodeXmlEntities = (text: string): string => {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
};

export const extractBalancedJson = (html: string, marker: string): unknown | null => {
  const markerIndex = html.indexOf(marker);
  if (markerIndex < 0) {
    return null;
  }

  const start = html.indexOf('{', markerIndex);
  if (start < 0) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < html.length; index += 1) {
    const char = html[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(start, index + 1));
        } catch {
          return null;
        }
      }
    }
  }

  return null;
};

export const extractInnertubeApiKey = (html: string): string => {
  const match = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/);
  return match?.[1] ?? DEFAULT_INNERTUBE_KEY;
};

export const parseCaptionTracksFromHtml = (html: string): CaptionTrack[] => {
  const player = extractBalancedJson(html, 'ytInitialPlayerResponse') as PlayerCaptions | null;
  const fromPlayer = player?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
  if (fromPlayer.length > 0) {
    return fromPlayer;
  }

  const tracksMatch = html.match(/"captionTracks":(\[[\s\S]*?\])\s*,\s*"audioTracks"/);
  if (!tracksMatch?.[1]) {
    return [];
  }

  try {
    return JSON.parse(tracksMatch[1].replace(/\\u0026/g, '&')) as CaptionTrack[];
  } catch {
    return [];
  }
};

export const parseCaptionTracksFromPlayer = (player: PlayerCaptions): CaptionTrack[] => {
  return player.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
};

export const pickCaptionTrack = (tracks: CaptionTrack[]): CaptionTrack | null => {
  if (tracks.length === 0) {
    return null;
  }

  const preferred =
    tracks.find((track) => track.languageCode?.startsWith('en') && track.kind !== 'asr') ??
    tracks.find((track) => track.languageCode?.startsWith('en')) ??
    tracks.find((track) => track.kind === 'asr') ??
    tracks[0];

  return preferred ?? null;
};

export const buildCaptionFetchUrls = (baseUrl: string): string[] => {
  const normalized = baseUrl.replace(/\\u0026/g, '&');
  const url = new URL(normalized);

  url.searchParams.delete('fmt');
  url.searchParams.set('fmt', 'json3');
  url.searchParams.set('c', 'WEB');

  const json3Url = url.toString();

  url.searchParams.set('fmt', 'vtt');
  const vttUrl = url.toString();

  url.searchParams.delete('fmt');
  url.searchParams.delete('c');
  const xmlUrl = url.toString();

  return [...new Set([json3Url, vttUrl, xmlUrl, normalized])];
};

export const parseTranscriptJson3 = (payload: string): string => {
  const parsed = JSON.parse(payload) as Json3Transcript;
  const segments =
    parsed.events
      ?.flatMap((event) => event.segs ?? [])
      .map((segment) => segment.utf8?.replace(/\n/g, ' ').trim() ?? '')
      .filter(Boolean) ?? [];

  return segments.join(' ').replace(/\s+/g, ' ').trim();
};

export const parseTranscriptXml = (payload: string): string => {
  const segments = [...payload.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/gi)]
    .map((match) => decodeXmlEntities(match[1]?.replace(/<[^>]+>/g, ' ').trim() ?? ''))
    .filter(Boolean);
  return segments.join(' ').replace(/\s+/g, ' ').trim();
};

export const parseTranscriptVtt = (payload: string): string => {
  const lines = payload
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && line !== 'WEBVTT' && !line.includes('-->') && !/^\d+$/.test(line));

  return lines.join(' ').replace(/\s+/g, ' ').trim();
};

export const parseTranscriptPayload = (payload: string): string => {
  const trimmed = payload.trim();
  if (!trimmed) {
    return '';
  }

  if (trimmed.startsWith('{')) {
    try {
      return parseTranscriptJson3(trimmed);
    } catch {
      return '';
    }
  }

  if (trimmed.startsWith('WEBVTT')) {
    return parseTranscriptVtt(trimmed);
  }

  if (trimmed.includes('<text')) {
    return parseTranscriptXml(trimmed);
  }

  return trimmed.replace(/\s+/g, ' ').trim();
};

const fetchInnertubePlayer = async (
  videoId: string,
  apiKey: string,
  clientName: 'ANDROID' | 'WEB',
  clientVersion: string
): Promise<PlayerCaptions | null> => {
  try {
    const endpoint = `https://www.youtube.com/youtubei/v1/player?key=${encodeURIComponent(apiKey)}`;
    const { status, data } = await postRemote(endpoint, {
      headers: {
        'User-Agent': YOUTUBE_USER_AGENT,
        'X-Youtube-Client-Name': clientName === 'ANDROID' ? '3' : '1',
        'X-Youtube-Client-Version': clientVersion
      },
      data: {
        context: {
          client: {
            clientName,
            clientVersion,
            hl: 'en',
            gl: 'US',
            ...(clientName === 'ANDROID' ? { androidSdkVersion: 30 } : {})
          }
        },
        videoId
      }
    });

    if (status >= 400 || !data || typeof data !== 'object') {
      return null;
    }

    return data as PlayerCaptions;
  } catch {
    return null;
  }
};

const fetchCaptionTracks = async (videoId: string, watchHtml: string): Promise<CaptionTrack[]> => {
  const apiKey = extractInnertubeApiKey(watchHtml);

  const androidPlayer = await fetchInnertubePlayer(videoId, apiKey, 'ANDROID', '20.10.38');
  const androidTracks = androidPlayer ? parseCaptionTracksFromPlayer(androidPlayer) : [];
  if (androidTracks.length > 0) {
    return androidTracks;
  }

  const webPlayer = await fetchInnertubePlayer(videoId, apiKey, 'WEB', '2.20250201.01.00');
  const webTracks = webPlayer ? parseCaptionTracksFromPlayer(webPlayer) : [];
  if (webTracks.length > 0) {
    return webTracks;
  }

  return parseCaptionTracksFromHtml(watchHtml);
};

const fetchTranscriptFromTrack = async (track: CaptionTrack, videoId: string): Promise<string> => {
  if (!track.baseUrl) {
    return '';
  }

  const lang = track.languageCode ?? 'en';
  const directUrl = `https://www.youtube.com/api/timedtext?v=${encodeURIComponent(videoId)}&lang=${encodeURIComponent(lang)}&fmt=json3&c=WEB`;
  const urls = [...buildCaptionFetchUrls(track.baseUrl), directUrl];

  for (const url of urls) {
    try {
      const payload = await fetchRemoteText(url, {
        userAgent: YOUTUBE_USER_AGENT,
        accept: 'application/json,text/xml,text/vtt,*/*'
      });
      const transcript = parseTranscriptPayload(payload);
      if (transcript) {
        return transcript;
      }
    } catch {
      // Try the next caption format/url.
    }
  }

  return '';
};

export interface YouTubeExtraction {
  transcript: string;
  duration?: number | null;
  title?: string | null;
  description?: string | null;
  author?: string | null;
}

interface VideoDetails {
  title?: string;
  shortDescription?: string;
  author?: string;
  lengthSeconds?: string;
}

const parseVideoDetails = (html: string): VideoDetails | null => {
  const player = extractBalancedJson(html, 'ytInitialPlayerResponse') as {
    videoDetails?: VideoDetails;
  } | null;
  return player?.videoDetails ?? null;
};

export const extractYouTubeTranscript = async (url: string): Promise<YouTubeExtraction> => {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) {
    throw new Error('Could not parse YouTube video id.');
  }

  const watchUrl = normalizeUrl(`https://www.youtube.com/watch?v=${videoId}`);
  const html = await fetchRemoteText(watchUrl, { userAgent: YOUTUBE_USER_AGENT });
  const details = parseVideoDetails(html);

  let duration: number | null = null;
  const lengthSeconds = details?.lengthSeconds ?? html.match(/"lengthSeconds":"(\d+)"/)?.[1];
  if (lengthSeconds) {
    duration = Number(lengthSeconds);
  }

  const meta = {
    title: details?.title?.trim() || null,
    description: details?.shortDescription?.trim() || null,
    author: details?.author?.trim() || null,
    duration
  };

  const tracks = await fetchCaptionTracks(videoId, html);
  const track = pickCaptionTrack(tracks);

  if (!track?.baseUrl) {
    if (meta.title || meta.description) {
      return {
        transcript: '',
        ...meta
      };
    }
    throw new Error('No captions available for this video.');
  }

  const transcript = await fetchTranscriptFromTrack(track, videoId);
  if (!transcript) {
    if (meta.title || meta.description) {
      return {
        transcript: '',
        ...meta
      };
    }
    throw new Error(
      'Could not read the YouTube transcript. The video may have captions in the app but block automated access.'
    );
  }

  return {
    transcript: transcript.slice(0, 50_000),
    ...meta
  };
};

export const estimateWatchMinutes = (durationSeconds?: number | null): number | null => {
  if (!durationSeconds || !Number.isFinite(durationSeconds)) {
    return null;
  }
  return Math.max(1, Math.round(durationSeconds / 60));
};
