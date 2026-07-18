import { describe, expect, it } from 'vitest';
import { Capture } from '../types/capture';
import { CaptureSearchContext } from '../types/capture-search';
import {
  buildCaptureSqlSearchClause,
  CAPTURE_SEARCHABLE_FIELDS,
  getSqlCaptureSearchColumns,
  matchesCaptureSearch,
  normalizeSearchQuery
} from './capture-search.service';

const capture: Capture = {
  id: 'capture-1',
  type: 'url',
  title: 'React Patterns',
  url: 'https://example.com/react',
  content: 'Hooks and composition',
  source: 'example.com',
  thumbnail: null,
  status: 'INBOX',
  createdAt: Date.now()
};

const captureContext = (overrides: Partial<CaptureSearchContext> = {}): CaptureSearchContext => ({
  capture,
  ...overrides
});

describe('capture-search.service', () => {
  it('matches capture fields from the searchable field list', () => {
    expect(matchesCaptureSearch(captureContext(), 'react')).toBe(true);
    expect(matchesCaptureSearch(captureContext(), 'hooks')).toBe(true);
    expect(matchesCaptureSearch(captureContext(), 'example.com')).toBe(true);
    expect(matchesCaptureSearch(captureContext(), 'missing')).toBe(false);
  });

  it('matches AI metadata when present on the search context', () => {
    const context = captureContext({
      understand: {
        schemaVersion: 1,
        captureId: capture.id,
        summary: 'A deep dive into React architecture',
        topics: ['react', 'architecture'],
        targetAudience: ['frontend developers'],
        estimatedReadingTime: 12,
        estimatedWatchTime: null,
        completedAt: Date.now()
      },
      classify: {
        schemaVersion: 1,
        captureId: capture.id,
        lens: 'technology',
        contentType: 'deep-dive',
        completedAt: Date.now()
      },
      evaluate: {
        schemaVersion: 1,
        captureId: capture.id,
        expectedValue: 'high',
        potentialDisappointment: 'low',
        recommendation: 'Read now',
        reasoning: 'High signal',
        confidence: 0.9,
        completedAt: Date.now()
      }
    });

    expect(matchesCaptureSearch(context, 'architecture')).toBe(true);
    expect(matchesCaptureSearch(context, 'deep-dive')).toBe(true);
    expect(matchesCaptureSearch(context, 'read now')).toBe(true);
  });

  it('builds SQL search clauses only from capture table columns', () => {
    expect(getSqlCaptureSearchColumns()).toEqual(['title', 'content', 'url', 'source']);
    expect(buildCaptureSqlSearchClause()).toBe(
      'LOWER(title) LIKE ? OR LOWER(content) LIKE ? OR LOWER(url) LIKE ? OR LOWER(source) LIKE ?'
    );
    expect(CAPTURE_SEARCHABLE_FIELDS.some((field) => field.id === 'summary' && !field.sqlColumn)).toBe(true);
  });

  it('normalizes empty queries to match everything', () => {
    expect(normalizeSearchQuery('  ')).toBe('');
    expect(matchesCaptureSearch(captureContext(), '   ')).toBe(true);
  });
});
