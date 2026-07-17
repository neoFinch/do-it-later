import { describe, expect, it } from 'vitest';
import {
  isImageMime,
  isImagePath,
  isLegacyLocalFilePath,
  isPersistedCapturePath,
  isRemoteHttpUrl,
  sanitizeFileName
} from './file.service';

describe('file.service helpers', () => {
  it('sanitizes unsafe file names', () => {
    expect(sanitizeFileName('my screenshot.png')).toBe('my_screenshot.png');
    expect(sanitizeFileName('   ')).toBe('shared_file');
  });

  it('detects image mime types', () => {
    expect(isImageMime('image/png')).toBe(true);
    expect(isImageMime('application/pdf')).toBe(false);
  });

  it('detects image file extensions', () => {
    expect(isImagePath('/data/user/0/cache/shared_files/photo.JPG')).toBe(true);
    expect(isImagePath('/data/user/0/cache/shared_files/doc.pdf')).toBe(false);
  });

  it('detects legacy android file paths', () => {
    expect(isLegacyLocalFilePath('/data/user/0/io.ionic.starter/cache/shared_files/a.png')).toBe(true);
    expect(isLegacyLocalFilePath('Just a note')).toBe(false);
  });

  it('detects remote and persisted thumbnail paths', () => {
    expect(isRemoteHttpUrl('https://cdn.example.com/thumb.jpg')).toBe(true);
    expect(isRemoteHttpUrl('captures/id/thumbnail.jpg')).toBe(false);
    expect(isPersistedCapturePath('captures/id/thumbnail.jpg')).toBe(true);
    expect(isPersistedCapturePath('https://cdn.example.com/thumb.jpg')).toBe(false);
  });
});
