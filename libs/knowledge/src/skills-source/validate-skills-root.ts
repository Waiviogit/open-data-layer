import { access, readFile } from 'node:fs/promises';
import * as path from 'node:path';
import {
  COMMIT_SHA_RE,
  REQUIRED_SKILL_FILES,
  SKILLS_SHA_FILENAME,
} from './constants';

export async function readSkillsSha(dir: string): Promise<string | null> {
  try {
    const sha = (await readFile(path.join(dir, SKILLS_SHA_FILENAME), 'utf8')).trim().toLowerCase();
    return COMMIT_SHA_RE.test(sha) ? sha : null;
  } catch {
    return null;
  }
}

export async function validateSkillsRoot(dir: string): Promise<string | null> {
  for (const rel of REQUIRED_SKILL_FILES) {
    try {
      await access(path.join(dir, ...rel.split('/')));
    } catch {
      return null;
    }
  }
  return readSkillsSha(dir);
}
