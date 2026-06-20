import { describe, expect, it } from 'vitest';
import {
  buildAndroidCacheFileUrl,
  createBackupPayload,
  normalizeImportedCapture,
  parseBackupJson,
  serializeBackup
} from './backup.service';
import { Capture } from '../types/capture';

const sampleCapture: Capture = {
  id: 'capture-1',
  type: 'url',
  title: 'Example',
  url: 'https://example.com',
  content: null,
  source: 'example.com',
  thumbnail: null,
  status: 'INBOX',
  createdAt: 1_700_000_000_000
};

describe('backup.service', () => {
  it('serializes and parses wrapped backup format', () => {
    const json = serializeBackup([sampleCapture]);
    const parsed = parseBackupJson(json);

    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe(sampleCapture.id);
    expect(createBackupPayload([sampleCapture]).app).toBe('capture-inbox');
  });

  it('parses raw capture arrays from older exports', () => {
    const json = JSON.stringify([sampleCapture]);
    const parsed = parseBackupJson(json);

    expect(parsed).toHaveLength(1);
    expect(parsed[0].url).toBe(sampleCapture.url);
  });

  it('normalizes captures missing status from older app versions', () => {
    const legacy = {
      id: 'legacy-1',
      type: 'note',
      title: 'Old note',
      content: 'Remember this',
      createdAt: 1_700_000_000_000
    };

    const normalized = normalizeImportedCapture(legacy);
    expect(normalized?.status).toBe('INBOX');
    expect(normalized?.type).toBe('note');
  });

  it('rejects invalid capture records', () => {
    expect(normalizeImportedCapture(null)).toBeNull();
    expect(normalizeImportedCapture({ id: '', type: 'url', createdAt: 1 })).toBeNull();
    expect(normalizeImportedCapture({ id: 'x', type: 'invalid', createdAt: 1 })).toBeNull();
  });

  it('throws for invalid backup json shape', () => {
    expect(() => parseBackupJson('{"foo":"bar"}')).toThrow('Invalid backup format');
  });

  it('builds android file url for share plugin', () => {
    const url = buildAndroidCacheFileUrl(
      'io.ionic.starter',
      'backups/capture-inbox-backup-2026-06-20.json'
    );

    expect(url).toBe(
      'file:///data/user/0/io.ionic.starter/cache/backups/capture-inbox-backup-2026-06-20.json'
    );
  });
});
