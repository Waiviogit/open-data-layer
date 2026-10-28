import type { Kysely } from 'kysely';
import { KnowledgeRepository } from '../repository/knowledge.repository';
import type { KnowledgeDatabase } from '../repository/types';
import { reparseSkillsFromStoredBodies } from './reparse-skills-from-stored';

const upsertFile = jest.fn().mockResolvedValue(undefined);
const findFileByPath = jest.fn();
const listFilesByPathPrefix = jest.fn();

jest.mock('../repository/knowledge.repository', () => ({
  KnowledgeRepository: jest.fn().mockImplementation(() => ({
    findFileByPath,
    upsertFile,
    listFilesByPathPrefix,
  })),
}));

const FOLDED = `---
name: hive-account-signup
description: >-
  Guide a user through creating a new Hive blockchain account via public signup
  providers.
---
# Hive account signup

Body.
`;

describe('reparseSkillsFromStoredBodies', () => {
  const db = {} as Kysely<KnowledgeDatabase>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reindexes odl rows whose stored description is a YAML block marker', async () => {
    listFilesByPathPrefix.mockResolvedValue([
      {
        path: 'odl/hive-account-signup/SKILL.md',
        title: 'hive account signup',
        description: '>-',
        body: FOLDED,
        content_hash: 'same',
        routing_text: 'old',
      },
    ]);
    findFileByPath.mockResolvedValue({
      path: 'odl/hive-account-signup/SKILL.md',
      title: 'hive account signup',
      description: '>-',
      body: FOLDED,
      content_hash: 'same',
      routing_text: 'old',
    });

    const stats = await reparseSkillsFromStoredBodies(db);

    expect(upsertFile).toHaveBeenCalledWith(
      expect.objectContaining({
        path: 'odl/hive-account-signup/SKILL.md',
        description: expect.stringContaining('Guide a user through creating'),
      }),
    );
    expect(stats.indexed).toBe(1);
    expect(stats.deleted).toBe(0);
    expect(KnowledgeRepository).toHaveBeenCalled();
  });

  it('skips a broken stored body and does not delete the row', async () => {
    listFilesByPathPrefix.mockResolvedValue([
      {
        path: 'odl/broken/SKILL.md',
        body: '---\ntype: not-a-type\n---\n# Broken\n',
      },
    ]);
    const warn = jest.fn();
    const stats = await reparseSkillsFromStoredBodies(db, { warn });

    expect(upsertFile).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('odl/broken/SKILL.md'));
    expect(stats.deleted).toBe(0);
  });
});
