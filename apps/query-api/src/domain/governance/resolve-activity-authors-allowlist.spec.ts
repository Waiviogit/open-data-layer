import { DEFAULT_GOVERNANCE_SNAPSHOT } from '@opden-data-layer/objects-domain';
import { resolveActivityAuthorsAllowlist } from './resolve-activity-authors-allowlist';

describe('resolveActivityAuthorsAllowlist', () => {
  it('returns undefined without authors_only and does not resolve overlay', async () => {
    const resolveMergedForObjectView = jest.fn();
    const result = await resolveActivityAuthorsAllowlist(
      { resolveMergedForObjectView },
      {
        authorsOnly: false,
        authorsGovernanceObjectId: 'gov-b',
      },
    );
    expect(result).toBeUndefined();
    expect(resolveMergedForObjectView).not.toHaveBeenCalled();
  });

  it('returns merged authors when authors_only and no overlay', async () => {
    const resolveMergedForObjectView = jest.fn().mockResolvedValue({
      ...DEFAULT_GOVERNANCE_SNAPSHOT,
      authors: ['alice', 'bob'],
    });
    const result = await resolveActivityAuthorsAllowlist(
      { resolveMergedForObjectView },
      { authorsOnly: true, governanceObjectIdFromHeader: 'gov-h' },
    );
    expect(result).toEqual(['alice', 'bob']);
    expect(resolveMergedForObjectView).toHaveBeenCalledTimes(1);
    expect(resolveMergedForObjectView).toHaveBeenCalledWith('gov-h');
  });

  it('unions overlay authors into the allowlist', async () => {
    const resolveMergedForObjectView = jest.fn(async (id?: string) => {
      if (id === 'gov-c') {
        return { ...DEFAULT_GOVERNANCE_SNAPSHOT, authors: ['carol'] };
      }
      return { ...DEFAULT_GOVERNANCE_SNAPSHOT, authors: ['alice'] };
    });
    const result = await resolveActivityAuthorsAllowlist(
      { resolveMergedForObjectView },
      {
        authorsOnly: true,
        governanceObjectIdFromHeader: 'gov-h',
        authorsGovernanceObjectId: 'gov-c',
      },
    );
    expect(result).toEqual(['alice', 'carol']);
    expect(resolveMergedForObjectView).toHaveBeenCalledWith('gov-h');
    expect(resolveMergedForObjectView).toHaveBeenCalledWith('gov-c');
  });

  it('adds nothing when overlay is not a governance object', async () => {
    const resolveMergedForObjectView = jest.fn(async (id?: string) => {
      if (id === 'book-1') {
        return DEFAULT_GOVERNANCE_SNAPSHOT;
      }
      return { ...DEFAULT_GOVERNANCE_SNAPSHOT, authors: ['alice'] };
    });
    const result = await resolveActivityAuthorsAllowlist(
      { resolveMergedForObjectView },
      { authorsOnly: true, authorsGovernanceObjectId: 'book-1' },
    );
    expect(result).toEqual(['alice']);
  });

  it('adds nothing when overlay does not exist', async () => {
    const resolveMergedForObjectView = jest.fn(async (id?: string) => {
      if (id === 'missing') {
        return DEFAULT_GOVERNANCE_SNAPSHOT;
      }
      return { ...DEFAULT_GOVERNANCE_SNAPSHOT, authors: ['alice'] };
    });
    const result = await resolveActivityAuthorsAllowlist(
      { resolveMergedForObjectView },
      { authorsOnly: true, authorsGovernanceObjectId: 'missing' },
    );
    expect(result).toEqual(['alice']);
  });

  it('returns overlay authors when the merged list is empty', async () => {
    const resolveMergedForObjectView = jest.fn(async (id?: string) => {
      if (id === 'gov-c') {
        return { ...DEFAULT_GOVERNANCE_SNAPSHOT, authors: ['carol'] };
      }
      return DEFAULT_GOVERNANCE_SNAPSHOT;
    });
    const result = await resolveActivityAuthorsAllowlist(
      { resolveMergedForObjectView },
      { authorsOnly: true, authorsGovernanceObjectId: 'gov-c' },
    );
    expect(result).toEqual(['carol']);
  });
});
