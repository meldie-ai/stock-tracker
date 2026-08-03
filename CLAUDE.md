# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

A private Next.js inventory/sales-tracking app for a single Brisbane shop (vapes, tobacco
cartons/singles, chop chop, nicotine pouches). Staff log in, start a shift, record sales and
stock adjustments through the shift, then close it — closing snapshots everything into
permanent history. Two roles: STAFF (day-to-day operation) and ADMIN (staff management, money
made, sales reports).

## Commands

```bash
npm run dev      # dev server (Turbopack)
npm run build    # prisma generate && prisma migrate deploy && next build — migrations run
                  # against production DB as part of every build/deploy, not a separate step
npm run lint      # eslint
npx tsc --noEmit  # typecheck (no dedicated script)
```

No test suite exists. Local Postgres runs in Docker; `DATABASE_URL` in `.env` points at it.
After any `prisma/schema.prisma` change: hand-write the migration folder (`mkdir
prisma/migrations/<timestamp>_<name>` + `migration.sql`), then `npx prisma migrate deploy` —
this repo does not use `prisma migrate dev`. Regenerate the client with `npx prisma generate`
after schema/migration changes; a running `next dev` server can hold a stale client in memory,
so restart it too.

## Architecture

### The active shift is the center of the data model

At most one `Shift` has `status: ACTIVE` at a time (enforced by convention, not a DB
constraint — every mutating route re-fetches it via `prisma.shift.findFirst({where:{status:
"ACTIVE"}})`). Selling, adjusting stock, and adding shift notes all require an active shift and
attach to it. Closing a shift (`api/shifts/close`) snapshots the *entire current catalog* into
`ShiftStockSnapshot` (one row per product, including untouched ones) and backfills any
`ShiftSale` rows missing for products that had zero activity, so History always shows the full
product list, not just what moved. Anyone can end a shift regardless of who started it —
`startedByUserId`/`endedByUserId` are attribution only, not an authorization gate.

### Category-overrides-product pricing precedence

Both pricing (`cashPriceCents`/`cardPriceCents`) and deals (`dealQuantity`/`dealPriceCents`) use
the same all-or-nothing rule, centralized in `src/lib/pricing.ts`
(`hasCategoryPrice`/`resolveUnitPriceCents`/`resolveEffectiveDeal`): if a `Category` has its own
price set, *every* product in it uses the category's price/deal instead of its own — never a
per-field fallback. This determines whether the UI shows one shared price editor for the whole
category or per-product editors, and whether shift breakdowns aggregate by category or list
products individually (see `hasCategoryPrice` usage in `src/lib/data.ts`).

### Carton → Singles auto-cascade

`Product.linkedCartonProductId` (set explicitly in Manage, not inferred from
name/category — name-matching was tried and proved fragile) links a Singles product to its
Cartons product. `src/lib/cartonCascade.ts` has two mechanisms that compose:
- `tryCascadeSinglesFromCarton`: after any stock write that lands a linked product at exactly 0,
  auto-opens one carton and refills to `PACK_SIZE` (10).
- `ensureSinglesStockForSale`: before a sale that would exceed current stock, auto-opens however
  many cartons are needed to cover it in one transaction (all-or-nothing — if combined
  singles + cartons×10 still isn't enough, nothing is opened and the sale is rejected).

Both record `CASCADE` audit entries against the carton product.

### AuditLog is the source of truth for history, not just a log

Every stock-affecting action (`SELL`, `ADJUST`, `CASCADE`, `PRICE_CHANGE`) writes an `AuditLog`
row. Several report/summary functions in `src/lib/data.ts` derive their numbers by querying
`AuditLog` rather than a separate aggregate table — e.g. Restocked/Deducted summaries filter
`action: "ADJUST"` by `quantityDelta` sign, and the payment breakdown reads `SELL` entries'
`note` field. `note` is used as a lightweight free-text tag rather than adding new columns:
`"Cash sale"` / `"Card sale"` (sell route) or `"Deal sale"` (deals/sell route) for payment
method, or one of `ADJUST_DEDUCTION_REASONS` (`src/lib/adjustReasons.ts`) for a stock deduction.
Entries from before a given tagging convention existed have no matching note and are skipped by
the summaries that depend on it — this is accepted as a permanent historical-data gap, never
backfilled.

Deducting stock (Adjust stock to a lower value) requires picking a reason; restocking upward
does not.

### Session/auth

`src/lib/session.ts`'s `getCurrentUser()` is the single source of truth for "who is logged in" —
call it from Server Components directly (not just API routes). It re-validates against the DB on
every call (deactivated account, or session issued before a password reset) rather than trusting
the iron-session cookie alone, so admin actions (deactivate, reset password) take effect
immediately instead of waiting for the cookie to expire. API routes use
`requireAuthenticatedRequest`/`requireAdminRequest` from `src/lib/apiHelpers.ts`, which also
enforces same-origin on mutating requests.

### Retention

`SHIFT_RETENTION_DAYS`/`AUDIT_LOG_RETENTION_DAYS` (`src/lib/retention.ts`, currently 90 days
each) is the single place that governs both the nightly cron delete
(`api/cron/cleanup`, configured in `vercel.json`) and every page's "may be incomplete before
this date" notice — keep these in sync rather than hardcoding the cutoff elsewhere.

### Database connection

`src/lib/databaseUrl.ts` checks several env var names in order (`DATABASE_URL`,
`POSTGRES_PRISMA_URL`, etc.) because Vercel's Postgres integrations don't all name the
connection string the same way depending on integration/vintage/prefix. `src/lib/prisma.ts` uses
`@prisma/adapter-pg` (driver adapter), not Prisma's default engine — always import the app's
`prisma` singleton rather than constructing a new `PrismaClient` (e.g. in one-off scripts), since
the driver-adapter setup lives there.

### Env vars

`DATABASE_URL`, `SESSION_SECRET` (32+ chars), `CRON_SECRET` (bearer token the cron endpoint
checks), `SEED_ADMIN_USERNAME`/`SEED_ADMIN_PASSWORD` — see `.env.example`.
