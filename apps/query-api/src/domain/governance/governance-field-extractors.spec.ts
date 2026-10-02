import { parseInheritsFromJson } from './governance-field-extractors';

describe('parseInheritsFromJson', () => {
  it('normalizes a legacy validity_cutoff token alongside authors', () => {
    expect(
      parseInheritsFromJson({
        object_id: 'gov-x',
        scope: ['validity_cutoff', 'authors'],
      }),
    ).toEqual({
      object_id: 'gov-x',
      scope: ['validityCutoff', 'authors'],
    });
  });
});
