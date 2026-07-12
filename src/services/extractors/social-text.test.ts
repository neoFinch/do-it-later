import { describe, expect, it } from 'vitest';
import {
  cleanInstagramExtractedText,
  looksLikeInstagramChrome,
  looksLikeInstagramLoginWall,
  looksLikeInstagramRestrictedMedia
} from './social-text';

describe('social-text', () => {
  const polluted = [
    "Close Never miss a post from charliepotentiacoaching Sign up for Instagram to stay in the loop.",
    "By continuing, you agree to Instagram's Terms of Use and Privacy Policy . Sign up Log In",
    'charliepotentiacoaching Verified • Follow More Options charliepotentiacoaching Verified 23 h',
    "1. Having your 'selfless' & 'selfish' hours Selfless hours = family, team, clients, work",
    'Selfish hours = protected blocks for training, thinking, learning, reflection, and personal growth.'
  ].join(' ');

  it('detects Instagram chrome-heavy extracts', () => {
    expect(looksLikeInstagramChrome(polluted)).toBe(true);
    expect(looksLikeInstagramChrome("1. Having your 'selfless' & 'selfish' hours")).toBe(false);
  });

  it('strips Instagram signup / login boilerplate from concatenated scrapes', () => {
    const cleaned = cleanInstagramExtractedText(polluted);
    expect(cleaned.toLowerCase()).not.toContain('sign up for instagram');
    expect(cleaned.toLowerCase()).not.toContain('never miss a post');
    expect(cleaned.toLowerCase()).not.toContain('privacy policy');
    expect(cleaned.toLowerCase()).not.toContain('more options');
    expect(cleaned).toContain("selfless' & 'selfish' hours");
    expect(cleaned).toContain('Selfish hours');
  });

  it('detects Instagram login-wall HTML', () => {
    const html = `
      <html><body>
        Sign up for Instagram to stay in the loop.
        Create an account or log in to see photos.
        <form id="login_form"></form>
      </body></html>
    `;
    expect(looksLikeInstagramLoginWall(html)).toBe(true);
  });

  it('detects Instagram restricted / error media shells', () => {
    const html = `
      {"page_logging":{"name":"httpErrorPage"},"failure_reason":"MA","restricted_age":22,
      "show_lox_redesigned_404_page":true,"PolarisErrorRoot":true}
      <title>Instagram</title>
    `;
    expect(looksLikeInstagramRestrictedMedia(html)).toBe(true);
    expect(looksLikeInstagramRestrictedMedia('<meta property="og:image" content="https://x.jpg">httpErrorPage')).toBe(
      false
    );
  });
});
