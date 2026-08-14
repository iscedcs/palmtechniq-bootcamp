# PalmTechnIQ Bootcamp Platform

`bootcamp.palmtechniq.com` — a permanent, multi-cohort bootcamp platform. The
August 2026 "Don't Waste Your Break" cohort is the first instance, not the
product. Launching a second cohort must mean inserting database rows, never a
deploy.

Source of truth for scope: `docs/bootcamp-platform-prd.md`.

## Two rules that will cost real money if broken

**1. Never migrate the `public` schema.** This app shares the main platform's
Neon database (same instance, same database) but owns only the `bootcamp`
PostgreSQL schema. `public` belongs to `palmtechniq-v2`.

This is enforced structurally, not by discipline: `datasource.schemas` lists
**only** `["bootcamp"]`, so Prisma cannot emit DDL for `public` even if asked.
The main platform's `User` table is deliberately *not* modelled — admin auth
reads it with raw SQL in `lib/auth.ts`, and reads need no migration.
`Registration.userId` is a plain nullable column, not a foreign key, because an
FK from `bootcamp` into `public` would let this app block migrations on the
main platform.

Do not "fix" this by adding `"public"` back to `schemas` or re-adding a `User`
model. Doing so makes every generated migration contain `CREATE TABLE "User"`
and `CREATE TYPE "UserRole"`, which then have to be hand-stripped from the SQL
every time, forever, correctly — and one miss runs DDL against the live
platform.

Two connection strings are needed: `DATABASE_URL` (pooled, **must** carry
`?schema=bootcamp` so `_prisma_migrations` lands in `bootcamp` rather than
colliding with v2's history in `public`) and `DIRECT_URL` (non-pooled — Prisma
Migrate cannot run through pgbouncer).

**2. Money is integer kobo.** No floating-point value may appear in the payment
path. `lib/pricing.ts` contains the only division, and rounds to whole naira
immediately. Amounts are never accepted from the client — the price tier is
resolved server-side at transaction initialisation (PRD §7.3), so a payment
started at 00:03 on 22 August resolves to standard pricing no matter when the
page was loaded.

## This is not the Next.js you may know

Next.js 16 with the App Router, React 19, Turbopack by default. Read the
relevant guide in `node_modules/next/dist/docs/` before writing code. The
differences that bite most often:

- `proxy.ts`, not `middleware.ts`. The exported function is `proxy`. No edge
  runtime — `proxy` is always `nodejs`.
- `params`, `searchParams`, `cookies()`, `headers()` and `draftMode()` are all
  async. Synchronous access was removed, not deprecated.
- `revalidateTag` takes a second `cacheLife` argument. Single-argument calls
  are a TypeScript error. For read-your-writes in a Server Action, use
  `updateTag`.
- `next lint` is gone. Run `pnpm lint` (ESLint flat config) — `next build` does
  not lint.
- Run `pnpm exec next typegen` to get the `PageProps<'/route'>`,
  `LayoutProps` and `RouteContext` helpers.

Tailwind CSS v4: configuration lives in `app/globals.css` via `@theme`, not a
`tailwind.config.ts`.

## Design system

Ported from `palmtechniq-v2/app/globals.css` and deliberately kept
name-compatible, so components can be pasted between the two repos unedited:
`cyber-grid`, `glass-card`, `neon-border`, `text-gradient`, `hover-glow`, plus
the `--background` / `--primary` / `--secondary` HSL token set.

Two brand corrections were made on the way across, and v2 still carries the old
values — do not "fix" these back:

| Token | Here | v2 | Why |
|---|---|---|---|
| `--accent` | `56 95% 46%` | `84 61% 45%` | Brand yellow is `#e4d406`; v2's is an olive-green |
| `--primary` | `139 65% 44%` | `152 65% 48%` | Brand green is `#27ba55`; v2's is a mint |

The `cyber-grid` lattice is the main site's texture — a 50px grid in highlight
blue at 12%. Put it on an absolutely-positioned layer with `cyber-grid-fade`,
never directly on a section, so it dissolves at the edges instead of being
sliced off.

## Admin auth

Admins sign in at `/admin/login` with their existing **palmtechniq.com**
credentials, verified against the same `public."User"` rows and the same
bcryptjs hashes (`lib/password.ts` must stay byte-compatible with v2's). There
is no separate identity store, and this app never creates, updates, or deletes
a user. Access requires `role` in `ADMIN` or `SUPERIOR`, re-checked against the
live row on every JWT rotation — an admin demoted on the main platform loses
access here without waiting out their session.

The session cookie is `bootcamp.session-token`, deliberately distinct from v2's
`authjs.session-token`. v2 issues its cookie **host-only** (the
`domain: ".palmtechniq.com"` line in its `auth.config.ts` is commented out), so
sessions do not carry across subdomains today. If that domain is ever widened,
the distinct names mean the two still will not collide.

`requireAdmin()` in `lib/auth.ts` is the real gate — call it in every admin
loader and at the top of every server action. `proxy.ts` only checks that a
session cookie *exists*; it does not verify one.

## Payment integrity

Webhook, payment callback and the reconciliation cron all finalise the same
payment, all three will fire, and sometimes twice. Every finalisation path must
be idempotent: load `Payment` by reference inside a transaction, guard on
`status === PENDING`, then transition. Never blind-set a status.

Verify the `x-paystack-signature` HMAC-SHA512 on every webhook. Reject
unsigned or mismatched requests before parsing the body.

## Commands

```bash
pnpm dev
```

```bash
pnpm build
```

```bash
pnpm lint
```

```bash
pnpm exec prisma migrate dev --create-only
```
