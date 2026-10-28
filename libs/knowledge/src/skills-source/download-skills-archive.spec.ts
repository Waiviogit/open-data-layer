import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { create } from 'tar';
import {
  downloadSkillsArchive,
  shouldExtractArchivePath,
} from './download-skills-archive';
import { SKILLS_SHA_FILENAME } from './constants';
import { validateSkillsRoot } from './validate-skills-root';

const SHA = 'b'.repeat(40);

async function writeSkill(root: string, rel: string, body: string): Promise<void> {
  const abs = path.join(root, ...rel.split('/'));
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, body, 'utf8');
}

async function packArchive(srcDir: string, outFile: string): Promise<Buffer> {
  await create({ gzip: true, file: outFile, cwd: srcDir }, ['skills-master']);
  return readFile(outFile);
}

describe('shouldExtractArchivePath', () => {
  it('keeps odl markdown under the tarball prefix', () => {
    expect(shouldExtractArchivePath('skills-master/odl/foo/SKILL.md')).toBe(true);
    expect(shouldExtractArchivePath('skills-master/odl/object-create/references/recipe.md')).toBe(
      true,
    );
  });

  it('drops non-odl files, non-markdown, and traversal', () => {
    expect(shouldExtractArchivePath('skills-master/README.md')).toBe(false);
    expect(shouldExtractArchivePath('skills-master/odl/foo/notes.txt')).toBe(false);
    expect(shouldExtractArchivePath('skills-master/odl/../etc/passwd.md')).toBe(false);
    expect(shouldExtractArchivePath('../odl/foo/SKILL.md')).toBe(false);
  });
});

describe('downloadSkillsArchive', () => {
  const originalFetch = globalThis.fetch;
  let tmp: string;

  beforeEach(async () => {
    tmp = await mkdtemp(path.join(os.tmpdir(), 'odl-skills-archive-'));
  });

  afterEach(async () => {
    globalThis.fetch = originalFetch;
    await rm(tmp, { recursive: true, force: true });
  });

  it('extracts only odl markdown and writes SKILLS_SHA', async () => {
    const src = path.join(tmp, 'src');
    const prefix = path.join(src, 'skills-master');
    await writeSkill(prefix, 'odl/knowledge-api-routing/SKILL.md', '# routing\n');
    await writeSkill(prefix, 'odl/object-create/SKILL.md', '# create\n');
    await writeSkill(prefix, 'README.md', 'skip me\n');
    await writeSkill(prefix, 'odl/foo/notes.txt', 'skip too\n');

    const archive = path.join(tmp, 'archive.tgz');
    const buffer = await packArchive(src, archive);

    globalThis.fetch = jest.fn().mockResolvedValue(
      new Response(new Uint8Array(buffer), { status: 200 }),
    ) as typeof fetch;

    const dest = path.join(tmp, 'dest');
    await downloadSkillsArchive({ sha: SHA, destDir: dest });

    expect(await readFile(path.join(dest, 'odl/knowledge-api-routing/SKILL.md'), 'utf8')).toContain(
      '# routing',
    );
    await expect(readFile(path.join(dest, 'README.md'), 'utf8')).rejects.toThrow();
    await expect(readFile(path.join(dest, 'odl/foo/notes.txt'), 'utf8')).rejects.toThrow();
    expect(await validateSkillsRoot(dest)).toBe(SHA);
    expect((await readFile(path.join(dest, SKILLS_SHA_FILENAME), 'utf8')).trim()).toBe(SHA);
  });

  it('rejects archives over the size cap', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue(
      new Response(new Uint8Array(64), { status: 200 }),
    ) as typeof fetch;

    await expect(
      downloadSkillsArchive({
        sha: SHA,
        destDir: path.join(tmp, 'dest'),
        maxBytes: 16,
      }),
    ).rejects.toMatchObject({ code: 'archive_too_large' });
  });
});
