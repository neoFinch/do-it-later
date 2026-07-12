const WHITESPACE = /\s+/g;

/** Phrases that come from Instagram login walls / profile chrome, not the post. */
const INSTAGRAM_PHRASE_PATTERNS: RegExp[] = [
  /^Close\s+/i,
  /Never miss a post from \S[\s\S]*?(?=Sign up for Instagram|Sign up|Log In|$)/gi,
  /Sign up for Instagram to stay in the loop\.?/gi,
  /By continuing, you agree to Instagram'?s Terms of Use,? and Privacy Policy\.?/gi,
  /\bTerms of Use\b/gi,
  /\bPrivacy Policy\b/gi,
  /\bMore Options\b/gi,
  /\bVerified\s*[•·]\s*Follow\b/gi
];

const CHROME_TOKEN = /^(close|sign up|log in|follow|verified|more options|see translation|see more|liked by|view all comments)$/i;

const looksLikeTimeAgo = (token: string): boolean => /^\d+[smhdw]$/i.test(token) || /^\d+$/.test(token);

/**
 * True when text is mostly Instagram chrome rather than a caption/body.
 */
export const looksLikeInstagramChrome = (text: string): boolean => {
  const lower = text.toLowerCase();
  const chromeHits = [
    'sign up for instagram',
    'never miss a post',
    'terms of use',
    'privacy policy',
    'log in',
    'more options'
  ].filter((phrase) => lower.includes(phrase)).length;

  return chromeHits >= 2 && text.length < 800;
};

/** HTML that looks like an Instagram login / signup wall with little real post content. */
export const looksLikeInstagramLoginWall = (html: string): boolean => {
  const lower = html.toLowerCase();
  const wallSignals = [
    'sign up for instagram',
    'log in to see',
    'create an account',
    'login_form',
    'never miss a post'
  ].filter((phrase) => lower.includes(phrase)).length;

  const hasOgDescription = /property=["']og:description["']/i.test(html) || /name=["']description["']/i.test(html);
  return wallSignals >= 2 && !hasOgDescription;
};

/**
 * Instagram served an error / restricted media shell (age gate, unavailable, etc.)
 * with no Open Graph payload for scrapers.
 */
export const looksLikeInstagramRestrictedMedia = (html: string): boolean => {
  const hasErrorShell =
    /httpErrorPage/i.test(html) ||
    /PolarisErrorRoot/i.test(html) ||
    /show_lox_redesigned_404_page"\s*:\s*true/i.test(html);

  const hasOg =
    /property=["']og:image["']/i.test(html) ||
    /property=["']og:description["']/i.test(html) ||
    /property=["']og:title["']/i.test(html);

  return hasErrorShell && !hasOg;
};

export const INSTAGRAM_RESTRICTED_MESSAGE =
  'Instagram hid this post from scrapers (restricted or unavailable). The link still works — open it in Instagram to view the real content.';

export const INSTAGRAM_LOGIN_WALL_MESSAGE =
  'Instagram blocked this page (login wall). Open the post in Instagram, check your connection, then tap Try again.';

export const INSTAGRAM_EMPTY_EXTRACT_MESSAGE =
  'Could not extract Instagram caption or preview. This is often a network or login-wall issue — tap Try again in a moment.';

/**
 * Strip Instagram login-wall / profile chrome from extracted text.
 * Prefers content after chrome markers when the scrape concatenated UI + caption.
 */
export const cleanInstagramExtractedText = (raw: string): string => {
  let text = raw.replace(/\u00a0/g, ' ').trim();
  if (!text) {
    return '';
  }

  for (const pattern of INSTAGRAM_PHRASE_PATTERNS) {
    text = text.replace(pattern, ' ');
  }

  // Drop leading chrome tokens / repeated username / "23 h" before the real caption.
  const tokens = text.split(WHITESPACE).filter(Boolean);
  let start = 0;
  while (start < tokens.length) {
    const token = tokens[start];
    const next = tokens[start + 1];

    if (CHROME_TOKEN.test(token)) {
      start += 1;
      continue;
    }

    // "charliepotentiacoaching Verified" or "Username • Follow"
    if (next && /^(Verified|Follow)$/i.test(next)) {
      start += 2;
      continue;
    }

    // Relative time markers: "23 h", "2d", "15 m"
    if (looksLikeTimeAgo(token) && next && /^(s|m|h|d|w)$/i.test(next)) {
      start += 2;
      continue;
    }
    if (/^\d+[smhdw]$/i.test(token)) {
      start += 1;
      continue;
    }

    break;
  }

  text = tokens.slice(start).join(' ').replace(WHITESPACE, ' ').trim();

  // If chrome still dominates, try cutting after the last "Log In" / "More Options".
  if (looksLikeInstagramChrome(raw) || looksLikeInstagramChrome(text)) {
    const cut = raw.match(
      /(?:Log In|More Options|Follow)\s+(?:\S+\s+){0,6}?(?:Verified\s+)?(?:\d+\s*[smhdw]\s+)?([\s\S]{40,})$/i
    );
    if (cut?.[1]) {
      text = cut[1].replace(WHITESPACE, ' ').trim();
      for (const pattern of INSTAGRAM_PHRASE_PATTERNS) {
        text = text.replace(pattern, ' ');
      }
      text = text.replace(WHITESPACE, ' ').trim();
    }
  }

  return text;
};
