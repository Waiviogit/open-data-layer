import { Kysely, PostgresDialect } from 'kysely';
import * as path from 'node:path';
import { Pool } from 'pg';
import { resolveConnectionString } from '../libs/migrations/src/connection';
import {
  KnowledgeRepository,
  reindexSkills,
  resolveWorkspaceRoot,
  runKnowledgeReindex,
  validateSkillsRoot,
  writeAgentRoutesFile,
  type KnowledgeDatabase,
} from '../libs/knowledge/src';

async function main(): Promise<void> {
  const pathArg = process.argv[2]?.startsWith('--path=')
    ? process.argv[2].slice('--path='.length)
    : undefined;

  const connectionString = resolveConnectionString();
  const db = new Kysely<KnowledgeDatabase>({
    dialect: new PostgresDialect({
      pool: new Pool({ connectionString }),
    }),
  });

  try {
    const workspaceRoot = resolveWorkspaceRoot();
    const stats = await runKnowledgeReindex(db, {
      workspaceRoot,
      pathFilter: pathArg,
      writeAgentRoutes: false,
    });
    // eslint-disable-next-line no-console
    console.log(
      `Knowledge reindex done: indexed=${stats.indexed} skipped=${stats.skipped} deleted=${stats.deleted} chunks=${stats.chunks} durationMs=${stats.durationMs}`,
    );

    if (!pathArg) {
      const skillsRoot = path.join(workspaceRoot, 'vendor', 'skills');
      const sha = await validateSkillsRoot(skillsRoot);
      if (!sha) {
        throw new Error(
          `Skills snapshot missing at ${skillsRoot}. Run pnpm sync:odl-skills`,
        );
      }
      const skillStats = await reindexSkills(db, { skillsRoot });
      // eslint-disable-next-line no-console
      console.log(
        `Skills reindex done (${sha}): indexed=${skillStats.indexed} skipped=${skillStats.skipped} deleted=${skillStats.deleted} chunks=${skillStats.chunks} durationMs=${skillStats.durationMs}`,
      );
    }

    if (!pathArg) {
      const repo = new KnowledgeRepository(db);
      const catalog = await repo.listRouteCatalog();
      await writeAgentRoutesFile(workspaceRoot, catalog);
    }
  } finally {
    await db.destroy();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
