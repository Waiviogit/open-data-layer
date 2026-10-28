import { mkdir, rename, rm } from 'node:fs/promises';
import * as path from 'node:path';
import {
  DEFAULT_SKILLS_BRANCH,
  DEFAULT_SKILLS_REPO,
  downloadSkillsArchive,
  fetchSkillsHeadSha,
  readSkillsSha,
} from '../libs/knowledge/src/skills-source';

const ROOT = path.resolve(process.cwd());
const DEST = path.join(ROOT, 'vendor', 'skills');

async function main(): Promise<void> {
  const repo = process.env.KNOWLEDGE_SKILLS_REPO?.trim() || DEFAULT_SKILLS_REPO;
  const branch = process.env.KNOWLEDGE_SKILLS_BRANCH?.trim() || DEFAULT_SKILLS_BRANCH;
  const token = process.env.KNOWLEDGE_GITHUB_TOKEN?.trim() || undefined;

  const head = await fetchSkillsHeadSha({ repo, branch, token });
  if (head.status !== 'changed') {
    throw new Error('sync-odl-skills: unexpected unchanged result without etag');
  }

  const existing = await readSkillsSha(DEST);
  if (existing === head.sha) {
    // eslint-disable-next-line no-console
    console.log(`sync-odl-skills: ${DEST} already at ${head.sha}`);
    return;
  }

  const tmp = `${DEST}.tmp`;
  await rm(tmp, { recursive: true, force: true });
  await mkdir(tmp, { recursive: true });
  try {
    await downloadSkillsArchive({ repo, sha: head.sha, destDir: tmp, token });
    await rm(DEST, { recursive: true, force: true });
    await mkdir(path.dirname(DEST), { recursive: true });
    await rename(tmp, DEST);
  } catch (error) {
    await rm(tmp, { recursive: true, force: true });
    throw error;
  }

  // eslint-disable-next-line no-console
  console.log(`sync-odl-skills: synced ${repo}@${head.sha} to ${path.relative(ROOT, DEST)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
