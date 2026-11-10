import {
  checkCoverFile,
  COVER_MAX_BYTES,
  COVER_MAX_FILE_BYTES,
  coverSize,
  dataUrlBytes,
  isValidCoverDataUrl,
} from './personalCover';

describe('coverSize', () => {
  it('scales large photos down to 400px wide, keeping the ratio', () => {
    expect(coverSize(3000, 4500)).toEqual({ width: 400, height: 600 });
    expect(coverSize(4000, 3000)).toEqual({ width: 400, height: 300 });
  });

  it('caps very tall images by height', () => {
    expect(coverSize(1000, 4000)).toEqual({ width: 200, height: 800 });
  });

  it('never enlarges small images', () => {
    expect(coverSize(200, 300)).toEqual({ width: 200, height: 300 });
  });
});

describe('data URLs', () => {
  const dataUrl = (base64: string, type = 'webp') => `data:image/${type};base64,${base64}`;

  it('counts the encoded bytes', () => {
    expect(dataUrlBytes(dataUrl('QUJD'))).toBe(3);
    expect(dataUrlBytes(dataUrl('QUI='))).toBe(2);
    expect(dataUrlBytes(dataUrl('QQ=='))).toBe(1);
  });

  it('accepts WebP and JPEG within the limits only', () => {
    expect(isValidCoverDataUrl(dataUrl('QUJD'))).toBe(true);
    expect(isValidCoverDataUrl(dataUrl('QUJD', 'jpeg'))).toBe(true);
    expect(isValidCoverDataUrl(dataUrl('QUJD', 'png'))).toBe(false);
    expect(isValidCoverDataUrl('data:image/webp;base64,<script>')).toBe(false);
    expect(isValidCoverDataUrl(dataUrl('A'.repeat(Math.ceil((COVER_MAX_BYTES + 10) / 3) * 4)))).toBe(false);
  });
});

describe('checkCoverFile', () => {
  it('accepts images up to the file limit', () => {
    expect(checkCoverFile({ type: 'image/jpeg', size: 5_000_000 })).toBeNull();
    expect(checkCoverFile({ type: 'application/pdf', size: 10 })).toBe('notImage');
    expect(checkCoverFile({ type: 'image/png', size: COVER_MAX_FILE_BYTES + 1 })).toBe('tooLarge');
  });
});
