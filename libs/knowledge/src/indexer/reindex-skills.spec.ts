import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import type { Kysely } from 'kysely';
import { KnowledgeRepository } from '../repository/knowledge.repository';
import type { KnowledgeDatabase } from '../repository/types';
import { reindexSkills } from './reindex-skills';

const upsertFile = jest.fn().mockResolvedValue(undefined);
const deleteFileByPath = jest.fn().mockResolvedValue(undefined);
const findFileByPath = jest.fn().mockResolvedValue(null);
const listPaths = jest.fn().mockResolvedValue([]);

jest.mock('../repository/knowledge.repository', () => ({
  KnowledgeRepository: jest.fn().mockImplementation(() => ({
    findFileByPath,
    upsertFile,
    listPaths,
    deleteFileByPath,
  })),
}));

async function writeRel(root: string, rel: string, body: string): Promise<void> {
  const abs = path.join(root, ...rel.split('/'));
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, body, 'utf8');
}

describe('reindexSkills', () => {
  const db = {} as Kysely<KnowledgeDatabase>;
  let tmp: string;

  beforeEach(async () => {
    jest.clearAllMocks();
    findFileByPath.mockResolvedValue(null);
    upsertFile.mockResolvedValue(undefined);
    deleteFileByPath.mockResolvedValue(undefined);
    listPaths.mockResolvedValue([]);
    tmp = await mkdtemp(path.join(os.tmpdir(), 'odl-reindex-skills-'));
  });

  afterEach(async () => {
    await rm(tmp, { recursive: true, force: true });
  });

  it('indexes odl markdown and deletes stale odl rows', async () => {
    await writeRel(
      tmp,
      'odl/hive-account-signup/SKILL.md',
      '---\nname: hive-account-signup\ndescription: Sign up.\n---\n# Signup\n',
    );
    listPaths.mockResolvedValue([
      'odl/hive-account-signup/SKILL.md',
      'odl/removed/SKILL.md',
      'docs/getting-started.md',
    ]);

    const warn = jest.fn();
    const stats = await reindexSkills(db, { skillsRoot: tmp, warn });

    expect(upsertFile).toHaveBeenCalled();
    expect(deleteFileByPath).toHaveBeenCalledWith('odl/removed/SKILL.md');
    expect(deleteFileByPath).not.toHaveBeenCalledWith('docs/getting-started.md');
    expect(stats.deleted).toBe(1);
    expect(warn).not.toHaveBeenCalled();
    expect(KnowledgeRepository).toHaveBeenCalled();
  });

  it('skips a broken odl file and keeps its existing row', async () => {
    await writeRel(
      tmp,
      'odl/broken/SKILL.md',
      '---\ntype: not-a-type\n---\n# Broken\n',
    );
    findFileByPath.mockResolvedValue({
      path: 'odl/broken/SKILL.md',
      content_hash: 'old',
    });
    listPaths.mockResolvedValue(['odl/broken/SKILL.md']);

    const warn = jest.fn();
    const stats = await reindexSkills(db, { skillsRoot: tmp, warn });

    expect(upsertFile).not.toHaveBeenCalled();
    expect(deleteFileByPath).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('odl/broken/SKILL.md'));
    expect(stats.deleted).toBe(0);
  });
});
