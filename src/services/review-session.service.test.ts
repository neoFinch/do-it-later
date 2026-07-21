import { describe, expect, it } from 'vitest';
import { getReviewTriageMinutes, REVIEW_DECISION_MINUTES, REVIEW_SKIM_FACTOR } from './review-session.service';
import { DEFAULT_CONSUME_MINUTES } from '../utils/content-duration';
import { ContentDocument } from '../types/content-document';

const doc = (partial: Partial<ContentDocument>): ContentDocument =>
  ({
    captureId: 'c1',
    source: 'article',
    extractedAt: Date.now(),
    articleText: null,
    transcript: null,
    duration: null,
    ...partial
  }) as ContentDocument;

describe('getReviewTriageMinutes', () => {
  it('uses decision time plus skim factor when no document', () => {
    const expected = REVIEW_DECISION_MINUTES + DEFAULT_CONSUME_MINUTES * REVIEW_SKIM_FACTOR;
    expect(getReviewTriageMinutes(null)).toBeCloseTo(expected);
  });

  it('skims article read time instead of full duration', () => {
    const longRead = doc({ articleText: 'word '.repeat(4000) });
    const triage = getReviewTriageMinutes(longRead);
    expect(triage).toBeLessThan(10);
    expect(triage).toBeGreaterThan(REVIEW_DECISION_MINUTES);
  });
});
