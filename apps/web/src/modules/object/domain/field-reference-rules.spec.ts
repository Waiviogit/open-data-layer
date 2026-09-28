import {
  isAllowedFieldReferencePathSegment,
  isFieldReferencePathSegment,
  resolveFieldReferencePathSegmentFromType,
  resolveFieldReferenceTypeFromPathSegment,
} from './field-reference-rules';

describe('field-reference-rules path segments', () => {
  it('maps plural path segments to singular object types', () => {
    expect(resolveFieldReferenceTypeFromPathSegment('books')).toBe('book');
    expect(resolveFieldReferenceTypeFromPathSegment('products')).toBe('product');
    expect(resolveFieldReferenceTypeFromPathSegment('service-offers')).toBe('service_offer');
    expect(resolveFieldReferenceTypeFromPathSegment('service-requests')).toBe('service_request');
    expect(resolveFieldReferenceTypeFromPathSegment('reviews')).toBeNull();
  });

  it('maps singular object types to plural path segments', () => {
    expect(resolveFieldReferencePathSegmentFromType('book')).toBe('books');
    expect(resolveFieldReferencePathSegmentFromType('product')).toBe('products');
    expect(resolveFieldReferencePathSegmentFromType('service_offer')).toBe('service-offers');
    expect(resolveFieldReferencePathSegmentFromType('service_request')).toBe('service-requests');
    expect(resolveFieldReferencePathSegmentFromType('person')).toBeNull();
  });

  it('recognizes field-reference feed path segments', () => {
    expect(isFieldReferencePathSegment('books')).toBe(true);
    expect(isFieldReferencePathSegment('products')).toBe(true);
    expect(isFieldReferencePathSegment('service-offers')).toBe(true);
    expect(isFieldReferencePathSegment('service-requests')).toBe(true);
    expect(isFieldReferencePathSegment('related')).toBe(false);
  });

  it('gates path segments by source object type', () => {
    expect(isAllowedFieldReferencePathSegment('person', 'books')).toBe(true);
    expect(isAllowedFieldReferencePathSegment('person', 'products')).toBe(false);
    expect(isAllowedFieldReferencePathSegment('business', 'books')).toBe(true);
    expect(isAllowedFieldReferencePathSegment('business', 'products')).toBe(true);
    expect(isAllowedFieldReferencePathSegment('business', 'service-offers')).toBe(true);
    expect(isAllowedFieldReferencePathSegment('business', 'service-requests')).toBe(true);
    expect(isAllowedFieldReferencePathSegment('person', 'service-offers')).toBe(false);
    expect(isAllowedFieldReferencePathSegment('book', 'books')).toBe(false);
  });
});
