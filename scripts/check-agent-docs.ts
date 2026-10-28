import { readdir, readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { scanKnowledgeSourcePaths } from '../libs/knowledge/src/config/scan-sources';
import { parseKnowledgeFile } from '../libs/knowledge/src/parser/parse-knowledge-file';
import {
  isYamlBlockScalarMarker,
  parseFrontmatterYaml,
  splitFrontmatter,
} from '../libs/knowledge/src/parser/parse-frontmatter';

const ROOT = path.resolve(process.cwd());

function fail(message: string): never {
  console.error(`check:agent-docs: ${message}`);
  process.exit(1);
}

async function listMarkdownFiles(dir: string): Promise<string[]> {
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
      out.push(...(await listMarkdownFiles(abs)));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      out.push(abs);
    }
  }
  return out;
}

function rel(filePath: string): string {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function extractRoutingTablePaths(markdown: string): string[] {
  const paths = new Set<string>();
  const rowRe = /\|\s*[^|]+\|\s*[^|]+\|\s*`([^`]+)`\s*\|/g;
  let match: RegExpExecArray | null;
  while ((match = rowRe.exec(markdown)) !== null) {
    const p = match[1]?.trim();
    if (p && !p.includes('<') && p.endsWith('.md')) {
      paths.add(p);
    }
  }
  return [...paths];
}

async function checkSkills(): Promise<void> {
  const skillsRoot = path.join(ROOT, 'vendor', 'skills');
  const files = (await listMarkdownFiles(path.join(skillsRoot, 'odl'))).filter(
    (abs) => abs.endsWith(`${path.sep}SKILL.md`) || abs.endsWith('/SKILL.md'),
  );

  if (files.length === 0) {
    fail('no vendor/skills/odl/**/SKILL.md files found — run pnpm sync:odl-skills');
  }

  for (const abs of files) {
    const indexedPath = path.relative(skillsRoot, abs).replace(/\\/g, '/');
    const raw = await readFile(abs, 'utf8');
    const parsed = parseKnowledgeFile(indexedPath, raw);
    const description = parsed.frontmatter.description?.trim();
    if (!description || isYamlBlockScalarMarker(description)) {
      fail(`${indexedPath}: missing non-empty frontmatter description`);
    }
    if (description.length > 1024) {
      fail(`${indexedPath}: description exceeds 1024 characters`);
    }
  }
}

async function checkAppOverviews(): Promise<void> {
  const appsDir = path.join(ROOT, 'docs/apps');
  const entries = await readdir(appsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const app = entry.name;
    const overviewPath = `docs/apps/${app}/spec/overview.md`;
    const abs = path.join(ROOT, overviewPath);
    let raw: string;
    try {
      raw = await readFile(abs, 'utf8');
    } catch {
      continue;
    }

    const parsed = parseKnowledgeFile(overviewPath, raw);
    const description = parsed.frontmatter.description?.trim();
    if (!description) {
      fail(`${overviewPath}: missing non-empty frontmatter description`);
    }
    if (parsed.frontmatter.scope !== app) {
      fail(`${overviewPath}: scope must be "${app}", got "${parsed.frontmatter.scope ?? ''}"`);
    }
  }
}

async function checkRoutingSkillPaths(): Promise<void> {
  const routingPath = path.join(
    ROOT,
    'vendor',
    'skills',
    'odl',
    'knowledge-api-routing',
    'SKILL.md',
  );
  let raw: string;
  try {
    raw = await readFile(routingPath, 'utf8');
  } catch {
    fail(
      'vendor/skills/odl/knowledge-api-routing/SKILL.md missing — run pnpm sync:odl-skills',
    );
  }
  const paths = extractRoutingTablePaths(raw).filter((p) => p.startsWith('docs/'));

  for (const p of paths) {
    const abs = path.join(ROOT, p);
    try {
      await readFile(abs, 'utf8');
    } catch {
      fail(`knowledge-api-routing: decision table path does not exist: ${p}`);
    }
  }
}

async function checkAppSpecScope(): Promise<void> {
  const appsDir = path.join(ROOT, 'docs/apps');
  const entries = await readdir(appsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const app = entry.name;
    const specDir = path.join(appsDir, app, 'spec');
    const files = (await listMarkdownFiles(specDir)).map(rel);

    for (const filePath of files) {
      if (!filePath.startsWith(`docs/apps/${app}/`)) {
        fail(`${filePath}: must live under docs/apps/${app}/`);
      }
    }
  }
}

async function checkSpecDescriptions(): Promise<void> {
  const appsSpecs = (await listMarkdownFiles(path.join(ROOT, 'docs/apps'))).map(rel);
  const platformSpecs = (await listMarkdownFiles(path.join(ROOT, 'docs/spec'))).map(rel);
  const files = [...appsSpecs, ...platformSpecs].filter(
    (p) => p.includes('/spec/') || p.startsWith('docs/spec/'),
  );

  for (const filePath of [...new Set(files)].sort()) {
    const raw = await readFile(path.join(ROOT, filePath), 'utf8');
    const { frontmatter: fmRaw } = splitFrontmatter(raw);
    const parsedFm = fmRaw ? parseFrontmatterYaml(fmRaw) : {};
    const description =
      typeof parsedFm['description'] === 'string'
        ? parsedFm['description'].trim()
        : '';
    if (!description) {
      fail(`${filePath}: missing non-empty frontmatter description`);
    }
    if (description.length > 500) {
      fail(`${filePath}: description exceeds 500 characters`);
    }
  }
}

async function checkIndexedFrontmatter(): Promise<void> {
  const sourcePaths = await scanKnowledgeSourcePaths(ROOT);

  for (const filePath of sourcePaths) {
    if (filePath === 'tasks/lessons.md') {
      continue;
    }
    const raw = await readFile(path.join(ROOT, filePath), 'utf8');
    try {
      parseKnowledgeFile(filePath, raw);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      fail(`${filePath}: invalid knowledge frontmatter: ${detail}`);
    }
  }
}

async function main(): Promise<void> {
  await checkSkills();
  await checkAppOverviews();
  await checkRoutingSkillPaths();
  await checkAppSpecScope();
  await checkSpecDescriptions();
  await checkIndexedFrontmatter();
  console.log('check:agent-docs: OK');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
