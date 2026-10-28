import {
  objectTypeToPlaybookPath,
  resolveLegacySkillPath,
} from './legacy-skill-path';

describe('resolveLegacySkillPath', () => {
  it('maps a top-level skill file', () => {
    expect(resolveLegacySkillPath('docs/skills/hive-account-signup.md')).toEqual({
      path: 'odl/hive-account-signup/SKILL.md',
      movedFrom: 'docs/skills/hive-account-signup.md',
    });
  });

  it('maps object-create.md to the skill, not a playbook', () => {
    expect(resolveLegacySkillPath('docs/skills/object-create.md')).toEqual({
      path: 'odl/object-create/SKILL.md',
      movedFrom: 'docs/skills/object-create.md',
    });
  });

  it('maps playbooks including snake_case object types', () => {
    expect(resolveLegacySkillPath('docs/skills/object-create/recipe.md')).toEqual({
      path: 'odl/object-create/references/recipe.md',
      movedFrom: 'docs/skills/object-create/recipe.md',
    });
    expect(resolveLegacySkillPath('docs/skills/object-create/service_offer.md')).toEqual({
      path: 'odl/object-create/references/service-offer.md',
      movedFrom: 'docs/skills/object-create/service_offer.md',
    });
  });

  it('leaves already-canonical paths unchanged', () => {
    expect(resolveLegacySkillPath('odl/hive-account-signup/SKILL.md')).toEqual({
      path: 'odl/hive-account-signup/SKILL.md',
      movedFrom: null,
    });
  });
});

describe('objectTypeToPlaybookPath', () => {
  it('kebabs snake_case object types', () => {
    expect(objectTypeToPlaybookPath('service_offer')).toBe(
      'odl/object-create/references/service-offer.md',
    );
  });
});
