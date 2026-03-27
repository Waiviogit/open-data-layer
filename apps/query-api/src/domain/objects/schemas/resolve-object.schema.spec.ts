import { resolveObjectBodySchema } from './resolve-object.schema';

describe('resolveObjectBodySchema', () => {
  it('accepts valid body', () => {
    const r = resolveObjectBodySchema.safeParse({
      object_id: 'obj1',
      update_types: ['name'],
    });
    expect(r.success).toBe(true);
  });

  it('accepts include_rejected in body', () => {
    const r = resolveObjectBodySchema.safeParse({
      object_id: 'obj1',
      update_types: ['name'],
      include_rejected: true,
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.include_rejected).toBe(true);
    }
  });

  it('rejects empty object_id', () => {
    const r = resolveObjectBodySchema.safeParse({
      object_id: '',
      update_types: ['name'],
    });
    expect(r.success).toBe(false);
  });

  it('accepts empty update_types (resolved as all types on the object)', () => {
    const r = resolveObjectBodySchema.safeParse({
      object_id: 'x',
      update_types: [],
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.update_types).toEqual([]);
    }
  });

  it('defaults omitted update_types to empty array', () => {
    const r = resolveObjectBodySchema.safeParse({
      object_id: 'x',
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.update_types).toEqual([]);
    }
  });
});
