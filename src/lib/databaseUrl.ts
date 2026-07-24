// Vercel's Postgres storage integrations don't all use the same env var name.
// It depends on which integration/vintage created the database, and whether
// a custom variable prefix was set when connecting it to the project (e.g.
// prefix "DATABASE" turns POSTGRES_PRISMA_URL into DATABASE_POSTGRES_PRISMA_URL
// rather than producing a plain DATABASE_URL). Check the common ones in order,
// preferring Prisma's pooled connection string where available. Deliberately
// excludes any "*_NO_SSL" variant — this app should never connect without SSL.
export function resolveDatabaseUrl(): string | undefined {
  return (
    process.env.DATABASE_URL ??
    process.env.DATABASE_POSTGRES_PRISMA_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    process.env.DATABASE_POSTGRES_URL ??
    process.env.POSTGRES_URL ??
    process.env.DATABASE_URL_UNPOOLED ??
    process.env.POSTGRES_URL_NON_POOLING
  );
}
