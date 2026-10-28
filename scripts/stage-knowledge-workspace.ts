import { copyFile, mkdir, readdir } from 'node:fs/promises';
import * as path from 'node:path';
import { scanKnowledgeSourcePaths } from '../libs/knowledge/src/config/scan-sources';
import { SKILLS_SHA_FILENAME } from '../libs/knowledge/src/skills-source';

const ROOT = path.resolve(process.cwd());
const OUT_DIR = path.join(ROOT, 'dist', 'knowledge-workspace');
const SKILLS_SRC = path.join(ROOT, 'vendor', 'skills');

async function walkFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walkFiles(abs)));
    } else if (entry.isFile()) {
      out.push(abs);
    }
  }
  return out;
}

async function copySkillsSnapshot(): Promise<number> {
  const files = await walkFiles(path.join(SKILLS_SRC, 'odl'));
  const shaFile = path.join(SKILLS_SRC, SKILLS_SHA_FILENAME);
  files.push(shaFile);

  let copied = 0;
  for (const abs of files) {
    const rel = path.relative(ROOT, abs).replace(/\\/g, '/');
    const dest = path.join(OUT_DIR, rel);
    await mkdir(path.dirname(dest), { recursive: true });
    await copyFile(abs, dest);
    copied += 1;
  }
  return copied;
}

async function main(): Promise<void> {
  const sourcePaths = await scanKnowledgeSourcePaths(ROOT);
  let copied = 0;

  for (const rel of sourcePaths) {
    const src = path.join(ROOT, rel);
    const dest = path.join(OUT_DIR, rel);
    await mkdir(path.dirname(dest), { recursive: true });
    await copyFile(src, dest);
    copied += 1;
  }

  const skillsCopied = await copySkillsSnapshot();
  copied += skillsCopied;

  // eslint-disable-next-line no-console
  console.log(
    `stage-knowledge-workspace: copied ${copied} files to ${path.relative(ROOT, OUT_DIR)} (skills=${skillsCopied})`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
