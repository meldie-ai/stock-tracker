// Vercel's Postgres storage integrations don't all use the same env var name
// (DATABASE_URL, POSTGRES_URL, POSTGRES_PRISMA_URL, etc. depending on which
// integration/vintage created the database) — check the common ones in order.
export function resolveDatabaseUrl(): string | undefined {
  return (
    process.env.DATABASE_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    process.env.POSTGRES_URL ??
    process.env.DATABASE_URL_UNPOOLED ??
    process.env.POSTGRES_URL_NON_POOLING
  );
}
