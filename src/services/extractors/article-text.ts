const STRIP_TAGS = /<\/?[^>]+>/g;
const WHITESPACE = /\s+/g;

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

const stripHtml = (html: string): string => {
  return decodeHtmlEntities(html.replace(STRIP_TAGS, ' ').replace(WHITESPACE, ' ').trim());
};

const removeBlocks = (html: string, tags: string[]): string => {
  let result = html;
  for (const tag of tags) {
    const regex = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi');
    result = result.replace(regex, ' ');
    const selfClosing = new RegExp(`<${tag}\\b[^>]*/>`, 'gi');
    result = result.replace(selfClosing, ' ');
  }
  return result;
};

const extractTaggedContent = (html: string, tag: string): string | null => {
  const regex = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const match = html.match(regex);
  if (!match?.[1]) {
    return null;
  }
  const text = stripHtml(match[1]);
  return text.length >= 120 ? text : null;
};

const extractParagraphText = (html: string): string => {
  const paragraphs = [...html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((match) => stripHtml(match[1] ?? ''))
    .filter((text) => text.length >= 40);
  return paragraphs.join('\n\n');
};

export const extractArticleText = (html: string): string => {
  const cleaned = removeBlocks(html, ['script', 'style', 'nav', 'footer', 'header', 'aside', 'noscript']);
  const candidates = [
    extractTaggedContent(cleaned, 'article'),
    extractTaggedContent(cleaned, 'main'),
    extractParagraphText(cleaned)
  ].filter((value): value is string => !!value?.trim());

  const best = candidates.sort((a, b) => b.length - a.length)[0] ?? '';
  return best.slice(0, 50_000);
};

export const estimateReadingMinutes = (text: string): number => {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
};
