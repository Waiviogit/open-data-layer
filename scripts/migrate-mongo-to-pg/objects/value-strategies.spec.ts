import {
  addressStrategy,
  migrateObjectRefBodyToText,
  transformJsonBody,
  transformTelephoneFromField,
} from './value-strategies';
import type { MongoWObjectField } from './types';

describe('migrateObjectRefBodyToText', () => {
  it('maps legacy authors body with authorPermlink (camelCase)', () => {
    expect(
      migrateObjectRefBodyToText(
        JSON.stringify({ authorPermlink: 'ylk-test-person-1' }),
        'author',
      ),
    ).toEqual({ ok: true, value: 'ylk-test-person-1' });
  });

  it('maps legacy authors body with author_permlink (snake_case)', () => {
    expect(
      migrateObjectRefBodyToText(
        JSON.stringify({ author_permlink: 'ylk-test-person-1' }),
        'author',
      ),
    ).toEqual({ ok: true, value: 'ylk-test-person-1' });
  });

  it('skips author object_ref when authorPermlink / author_permlink missing', () => {
    expect(
      migrateObjectRefBodyToText(JSON.stringify({ name: 'Jane Doe' }), 'author'),
    ).toEqual({
      ok: false,
      reason: 'author: missing or empty authorPermlink / author_permlink',
    });
  });

  it('parses double-encoded JSON author bodies', () => {
    expect(
      migrateObjectRefBodyToText(
        JSON.stringify(JSON.stringify({ authorPermlink: 'ylk-test-person-1' })),
        'author',
      ),
    ).toEqual({ ok: true, value: 'ylk-test-person-1' });
  });

  it('maps legacy merchant body with authorPermlink (camelCase)', () => {
    expect(
      migrateObjectRefBodyToText(
        JSON.stringify({ authorPermlink: 'btw-test-merchant-02021106' }),
        'merchant',
      ),
    ).toEqual({ ok: true, value: 'btw-test-merchant-02021106' });
  });

  it('maps legacy brand body with authorPermlink (camelCase)', () => {
    expect(
      migrateObjectRefBodyToText(
        JSON.stringify({ authorPermlink: 'fcs-test-brand-02021105' }),
        'brand',
      ),
    ).toEqual({ ok: true, value: 'fcs-test-brand-02021105' });
  });

  it('maps legacy manufacturer body with authorPermlink (camelCase)', () => {
    expect(
      migrateObjectRefBodyToText(
        JSON.stringify({ authorPermlink: 'kfb-2-test-manufacturer' }),
        'manufacturer',
      ),
    ).toEqual({ ok: true, value: 'kfb-2-test-manufacturer' });
  });

  it('still accepts author_permlink (snake_case)', () => {
    expect(
      migrateObjectRefBodyToText(
        JSON.stringify({
          name: 'Acme',
          author_permlink: 'acme-brand',
        }),
        'brand',
      ),
    ).toEqual({ ok: true, value: 'acme-brand' });
  });

  it('parses parent JSON bodies with authorPermlink', () => {
    expect(
      migrateObjectRefBodyToText(
        JSON.stringify({ authorPermlink: 'parent-object-1' }),
        'parent',
      ),
    ).toEqual({ ok: true, value: 'parent-object-1' });
  });

  it('accepts plain permlink strings for object_ref', () => {
    expect(migrateObjectRefBodyToText('plain-object-id', 'parent')).toEqual({
      ok: true,
      value: 'plain-object-id',
    });
  });
});

describe('transformTelephoneFromField', () => {
  const base: MongoWObjectField = { name: 'phone' };

  it('maps number to value and body to title', () => {
    expect(
      transformTelephoneFromField('telephone', {
        ...base,
        body: 'Телефон',
        number: '+1 604-423-3447',
      }),
    ).toEqual({
      ok: true,
      value: { value: '+1 604-423-3447', title: 'Телефон' },
    });
  });

  it('maps number only without title when body is empty', () => {
    expect(
      transformTelephoneFromField('telephone', {
        ...base,
        body: '',
        number: '+1 604-423-3447',
      }),
    ).toEqual({
      ok: true,
      value: { value: '+1 604-423-3447' },
    });
  });

  it('falls back body to value when number is missing', () => {
    expect(
      transformTelephoneFromField('telephone', {
        ...base,
        body: '+58 212-555-0100',
      }),
    ).toEqual({
      ok: true,
      value: { value: '+58 212-555-0100' },
    });
  });

  it('returns null for non-telephone update types', () => {
    expect(transformTelephoneFromField('email', { ...base, number: '1' })).toBeNull();
  });

  it('fails when number and body are empty', () => {
    expect(transformTelephoneFromField('telephone', { ...base, body: '', number: '' })).toEqual({
      ok: false,
      reason: 'telephone: missing number and body',
    });
  });
});

describe('addressStrategy', () => {
  it('combines Waivio address number and street name into ODL street', () => {
    const result = addressStrategy.transform(
      JSON.stringify({
        address: '11151 ',
        street: 'No. 5 Road',
        city: 'Richmond',
        state: 'British Columbia',
        postalCode: 'V7A 4E8',
        country: 'Canada',
      }),
      'address',
    );

    expect(result).toEqual({
      ok: true,
      value: {
        street: '11151, No. 5 Road',
        locality: 'Richmond',
        postal_code: 'V7A 4E8',
        country: 'Canada',
        state: 'British Columbia',
      },
    });
  });

  it('uses street alone when address is missing', () => {
    const result = addressStrategy.transform(
      JSON.stringify({
        street: 'No. 5 Road',
        city: 'Richmond',
        postalCode: 'V7A 4E8',
        country: 'Canada',
      }),
      'address',
    );

    expect(result).toEqual({
      ok: true,
      value: {
        street: 'No. 5 Road',
        locality: 'Richmond',
        postal_code: 'V7A 4E8',
        country: 'Canada',
      },
    });
  });

  it('uses address alone when street is missing', () => {
    const result = addressStrategy.transform(
      JSON.stringify({
        address: '11151',
        city: 'Richmond',
        postalCode: 'V7A 4E8',
        country: 'Canada',
      }),
      'address',
    );

    expect(result).toEqual({
      ok: true,
      value: {
        street: '11151',
        locality: 'Richmond',
        postal_code: 'V7A 4E8',
        country: 'Canada',
      },
    });
  });

  it('keeps city and country when postalCode is missing (hsr-supermarket-leo dump)', () => {
    const result = addressStrategy.transform(
      JSON.stringify({
        address: 'On Ruta del Spondylus',
        city: 'Manglaralto',
        state: 'Santa Elena',
        country: 'Ecuador',
      }),
      'address',
    );

    expect(result).toEqual({
      ok: true,
      value: {
        street: 'On Ruta del Spondylus',
        locality: 'Manglaralto',
        state: 'Santa Elena',
        country: 'Ecuador',
        postal_code: '0',
      },
    });
  });

  it('keeps city when country and postal are missing (kri-not-bad-advice dump)', () => {
    const result = addressStrategy.transform(
      JSON.stringify({
        address: 'Donets-Zakharzhevsky 5',
        street: '',
        city: 'Kharkiv',
      }),
      'address',
    );

    expect(result).toEqual({
      ok: true,
      value: {
        street: 'Donets-Zakharzhevsky 5',
        locality: 'Kharkiv',
        country: 'Unknown',
        postal_code: '0',
      },
    });
  });

  it('maps street and city without postal or country', () => {
    const result = addressStrategy.transform(
      JSON.stringify({
        street: 'Main Street 1',
        city: 'Boston',
      }),
      'address',
    );

    expect(result).toEqual({
      ok: true,
      value: {
        street: 'Main Street 1',
        locality: 'Boston',
        country: 'Unknown',
        postal_code: '0',
      },
    });
  });

  it('falls back to packed-line parser for a lone address string', () => {
    const result = addressStrategy.transform(
      JSON.stringify({ address: '123 Main St' }),
      'address',
    );

    expect(result).toEqual({
      ok: true,
      value: {
        street: '123 Main St',
        locality: '123 Main St',
        country: 'Unknown',
        postal_code: '0',
      },
    });
  });
});

describe('legacyImageCidOrUrlStrategy affiliateButton', () => {
  it('maps a plain body string to { url }', () => {
    expect(
      transformJsonBody(
        'affiliateButton',
        'affiliateButton',
        'https://cdn.example/logo.png',
      ),
    ).toEqual({ ok: true, value: { url: 'https://cdn.example/logo.png' } });
  });

  it('keeps existing { url } JSON', () => {
    expect(
      transformJsonBody(
        'affiliateButton',
        'affiliateButton',
        '{"url":"https://cdn.example/logo.png"}',
      ),
    ).toEqual({ ok: true, value: { url: 'https://cdn.example/logo.png' } });
  });

  it('rejects an empty body', () => {
    expect(transformJsonBody('affiliateButton', 'affiliateButton', '')).toEqual({
      ok: false,
      reason: 'image: empty body',
    });
  });
});
