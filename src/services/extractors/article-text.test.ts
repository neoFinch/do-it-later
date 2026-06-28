import { describe, expect, it } from 'vitest';
import { extractArticleText, estimateReadingMinutes } from './article-text';

describe('article-text extractor', () => {
  it('extracts text from article tags', () => {
    const html = `
      <html>
        <body>
          <nav>Skip me</nav>
          <article>
            <h1>Redis Memory Model</h1>
            <p>${'This is a detailed explanation of Redis memory usage. '.repeat(8)}</p>
            <p>${'Eviction policies matter when your dataset grows beyond RAM. '.repeat(8)}</p>
          </article>
        </body>
      </html>
    `;

    const text = extractArticleText(html);
    expect(text).toContain('Redis Memory Model');
    expect(text).toContain('Eviction policies');
  });

  it('estimates reading minutes from word count', () => {
    const words = Array.from({ length: 440 }, (_, index) => `word${index}`).join(' ');
    expect(estimateReadingMinutes(words)).toBe(2);
  });
});
