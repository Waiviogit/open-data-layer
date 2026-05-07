/**
 * Builds a Postgres connection string from POSTGRES_* environment variables.
 * Required: POSTGRES_HOST, POSTGRES_USER, POSTGRES_DATABASE.
 * Optional: POSTGRES_PASSWORD (default: empty), POSTGRES_PORT (default: 5432).
 */
export function resolveConnectionString(): string {
  const host = process.env['POSTGRES_HOST'];
  const port = process.env['POSTGRES_PORT'] ?? '5432';
  const user = process.env['POSTGRES_USER'];
  const password = process.env['POSTGRES_PASSWORD'];
  const database = process.env['POSTGRES_DATABASE'];

  if (!host || !user || !database) {
    console.error(
      'Database connection not configured. ' +
      'Set POSTGRES_HOST, POSTGRES_USER, POSTGRES_DATABASE ' +
      '(and optionally POSTGRES_PASSWORD, POSTGRES_PORT).',
    );
    process.exit(1);
  }

  const credentials = password ? `${user}:${encodeURIComponent(password)}` : user;
  return `postgres://${credentials}@${host}:${port}/${database}`;
}
