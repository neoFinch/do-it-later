import { describe, expect, it } from 'vitest';
import { cleanInstagramExtractedText, looksLikeInstagramChrome } from './social-text';

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

  it('leaves clean captions alone', () => {
    const caption =
      "Having your 'selfless' & 'selfish' hours. Selfless hours = family, team, clients, work.";
    expect(cleanInstagramExtractedText(caption)).toBe(caption);
  });
});
