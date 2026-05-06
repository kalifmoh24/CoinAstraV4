# XogsideIQ

A crypto intelligence platform giving traders AI-powered token research, narrative tracking, trading signals, and portfolio analytics in one dark, data-dense interface.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/xogsideiq run dev` — run the frontend (port 19243)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Wouter routing + Tailwind CSS + shadcn/ui + Framer Motion
- API: Express 5 at `/api`
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/api-client-react/src/generated/` — generated React Query hooks
- `lib/api-zod/src/generated/` — generated Zod validation schemas
- `lib/db/src/schema/` — Drizzle table definitions (tokens, narratives, signals, positions, news)
- `artifacts/api-server/src/routes/` — Express route handlers (market, tokens, narratives, signals, portfolio, news)
- `artifacts/xogsideiq/src/` — React frontend

## Architecture decisions

- Contract-first OpenAPI: all API shapes defined in `openapi.yaml` before code is written; `lib/api-zod/src/index.ts` is patched post-codegen to avoid duplicate type exports
- Drizzle ORM with PostgreSQL; `narrative_ids` stored as a JSONB array on tokens to avoid a join table
- Portfolio enrichment computed on-the-fly from live token prices (no denormalized PnL stored)
- Dark-first theme (Bloomberg terminal aesthetic) with green accents; light mode toggle available
- No auth in v1 — single shared portfolio, signals, and research environment

## Product

- **Home Dashboard** `/` — BTC/ETH prices, market cap, Fear & Greed index, top gainers/losers, news feed with sentiment tags, active signals
- **Token Research** `/research` + `/research/:symbol` — searchable token list with grades, per-token score circles (Overall/Fundamental/Technical/Sentiment/Risk/Narrative), AI research summary, related news
- **Narratives** `/narratives` + `/narratives/:slug` — 10 crypto narratives (AI, DePIN, L2, DeFi, RWA, etc.) with momentum scores, 24h/7d performance, top tokens per narrative
- **Signals** `/signals` — BUY/SELL/WATCH trading signals with confidence bars, progress to target, status filters
- **Portfolio** `/portfolio` — manual position tracking with real-time PnL, sector allocation, AI portfolio insights

## Gotchas

- After editing `openapi.yaml`, always run codegen — the patch step rewrites `lib/api-zod/src/index.ts` to fix duplicate exports
- `pnpm --filter @workspace/db run push-force` if push fails with column conflicts
- API server must be restarted after adding new route files (routes are compiled into the esbuild bundle)

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See `lib/api-spec/orval.config.ts` for codegen configuration
