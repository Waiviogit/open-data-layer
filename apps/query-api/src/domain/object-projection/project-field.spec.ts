import { geoJsonPointToLatLon } from './project-field';

describe('geoJsonPointToLatLon', () => {
  const expected = { latitude: 49.187253, longitude: -123.131515 };

  it('parses GeoJSON Point', () => {
    expect(
      geoJsonPointToLatLon({
        type: 'Point',
        coordinates: [-123.131515, 49.187253],
      }),
    ).toEqual(expected);
  });

  it('parses OGC WKB Point (little-endian, no SRID)', () => {
    const b = Buffer.allocUnsafe(21);
    b.writeUInt8(1, 0);
    b.writeUInt32LE(1, 1);
    b.writeDoubleLE(-123.131515, 5);
    b.writeDoubleLE(49.187253, 13);
    expect(geoJsonPointToLatLon(b)).toEqual(expected);
  });

  it('parses PostGIS EWKB Point with SRID', () => {
    const b = Buffer.allocUnsafe(25);
    b.writeUInt8(1, 0);
    b.writeUInt32LE(0x20000001, 1);
    b.writeUInt32LE(4326, 5);
    b.writeDoubleLE(-123.131515, 9);
    b.writeDoubleLE(49.187253, 17);
    expect(geoJsonPointToLatLon(b)).toEqual(expected);
  });

  it('parses hex-encoded EWKB string', () => {
    const b = Buffer.allocUnsafe(21);
    b.writeUInt8(1, 0);
    b.writeUInt32LE(1, 1);
    b.writeDoubleLE(-123.131515, 5);
    b.writeDoubleLE(49.187253, 13);
    expect(geoJsonPointToLatLon(b.toString('hex'))).toEqual(expected);
  });

  it('parses WKT and EWKT text', () => {
    expect(geoJsonPointToLatLon('POINT (-123.131515 49.187253)')).toEqual(expected);
    expect(geoJsonPointToLatLon('SRID=4326;POINT(-123.131515 49.187253)')).toEqual(expected);
  });

  it('returns null for invalid inputs', () => {
    expect(geoJsonPointToLatLon(null)).toBeNull();
    expect(geoJsonPointToLatLon(undefined)).toBeNull();
    expect(geoJsonPointToLatLon({ type: 'LineString', coordinates: [] })).toBeNull();
    expect(geoJsonPointToLatLon('not a point')).toBeNull();
    expect(geoJsonPointToLatLon(Buffer.alloc(3))).toBeNull();
  });
});
