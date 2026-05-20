import {
  formatGeoCoord,
  geoFormValueFromCoordPair,
  parseGeoCoordPair,
} from './geo-form-value';

describe('geo-form-value', () => {
  it('parseGeoCoordPair accepts valid coordinates', () => {
    expect(parseGeoCoordPair({ latitude: '49.945363', longitude: '35.914822' })).toEqual(
      [49.945363, 35.914822],
    );
  });

  it('parseGeoCoordPair rejects empty or out-of-range values', () => {
    expect(parseGeoCoordPair({ latitude: '', longitude: '10' })).toBeNull();
    expect(parseGeoCoordPair({ latitude: '91', longitude: '0' })).toBeNull();
  });

  it('formatGeoCoord rounds to six decimal places', () => {
    expect(formatGeoCoord(49.945363499)).toBe('49.945363');
  });

  it('geoFormValueFromCoordPair formats both fields', () => {
    expect(geoFormValueFromCoordPair(10.5, 20.25)).toEqual({
      latitude: '10.5',
      longitude: '20.25',
    });
  });
});
