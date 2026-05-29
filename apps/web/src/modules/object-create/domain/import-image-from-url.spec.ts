import {
  isAllowedImageImportUrl,
  resolveImageMimeForImport,
  sniffImageMimeFromBuffer,
} from './import-image-from-url';

describe('isAllowedImageImportUrl', () => {
  it('allows public https URL', () => {
    const r = isAllowedImageImportUrl('https://cdn.example.com/a.jpg');
    expect(r.ok).toBe(true);
  });

  it('allows public http URL', () => {
    const r = isAllowedImageImportUrl('http://cdn.example.com/a.png');
    expect(r.ok).toBe(true);
  });

  it('rejects localhost', () => {
    expect(isAllowedImageImportUrl('http://localhost/x.png').ok).toBe(false);
  });

  it('rejects raw IPv4', () => {
    expect(isAllowedImageImportUrl('https://192.168.1.1/x.png').ok).toBe(false);
  });

  it('rejects non-http(s)', () => {
    expect(isAllowedImageImportUrl('file:///tmp/x.png').ok).toBe(false);
  });
});

describe('sniffImageMimeFromBuffer', () => {
  it('detects PNG signature', () => {
    const buf = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0,
    ]);
    expect(sniffImageMimeFromBuffer(buf)).toBe('image/png');
  });
});

describe('resolveImageMimeForImport', () => {
  it('prefers allowed Content-Type header', () => {
    const buf = Buffer.alloc(32);
    expect(resolveImageMimeForImport('image/jpeg', buf)).toBe('image/jpeg');
  });

  it('falls back to sniff when header is generic', () => {
    const buf = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0,
    ]);
    expect(resolveImageMimeForImport('application/octet-stream', buf)).toBe(
      'image/png',
    );
  });

  it('returns null for non-image bytes', () => {
    expect(resolveImageMimeForImport('text/html', Buffer.from('<html>'))).toBe(
      null,
    );
  });
});
