# PROJECT KNOWLEDGE BASE

**Generated:** 2026-03-18
**Commit:** d0c9467
**Branch:** main

## OVERVIEW

LinkedIn Analytics API Strategy Analyzer — Next.js 15 + TypeScript app comparing 4 LinkedIn Marketing API approaches (Overall/Geographic/Monthly/Daily) for campaign reporting accuracy. OAuth 2.0 via NextAuth.js, Tailwind CSS UI, 95 Jest tests.

## STRUCTURE

```
reporting-api-analysis/
├── app/
│   ├── api/                    # 8 API route handlers (Next.js App Router)
│   │   ├── auth/[...nextauth]/ # OAuth 2.0 entry point → delegates to app/lib/auth-config.ts
│   │   ├── overall-analytics/  # Strategy 1: Benchmark (no pivot, gold standard)
│   │   ├── analytics/          # Strategy 2: Geographic (pivot=MEMBER_COUNTRY_V2)
│   │   ├── monthly-analytics/  # Strategy 3: Monthly (timeGranularity=MONTHLY + pivot)
│   │   ├── daily-analytics/    # Strategy 4: Daily aggregation (one call/day — high data loss)
│   │   ├── geo/                # Resolve urn:li:geo:{id} → country name
│   │   ├── linkedin-introspect/# Token introspection proxy
│   │   └── linkedin-profile/   # User profile proxy
│   ├── components/             # AuthProvider, Navigation, TokenStatusComponent
│   ├── lib/auth-config.ts      # NextAuth config (JWT callbacks, token refresh, LinkedIn provider)
│   ├── auth/                   # signin + error pages
│   ├── debug/                  # OAuth debug page
│   ├── session-debug/          # Session inspection (dev tool)
│   ├── token-introspect/       # Token analysis page
│   ├── contexts/               # Empty — unused
│   ├── layout.tsx              # Root layout: AuthProvider + Navigation wrapper
│   └── page.tsx                # Main dashboard — 4-strategy parallel fetch + comparison tables
├── lib/linkedin-token-refresh.ts   # Token refresh/expiry/introspect utilities
├── utils/
│   ├── csv-export.ts           # CSV generation + browser download for all 4 strategies
│   └── data-processing.ts      # Metric calculations, data transformation
├── types/next-auth.d.ts        # NextAuth session type extensions
├── __tests__/                  # 13 suites, 95 tests (mirrors source structure)
│   ├── api/                    # Route handler tests (4 files)
│   ├── components/             # React component tests (4 files)
│   ├── lib/                    # Auth + token tests (2 files)
│   ├── utils/                  # Data processing tests
│   └── integration/            # End-to-end workflow test
└── .github/workflows/          # Empty — no CI configured yet
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add new API strategy | `app/api/{name}/route.ts` | Copy `overall-analytics/route.ts` as template, add to parallel fetch in `page.tsx` |
| Auth flow / token logic | `app/lib/auth-config.ts` + `lib/linkedin-token-refresh.ts` | Auth config is under `app/lib/`, NOT top-level `lib/` |
| LinkedIn API headers | Any `app/api/*/route.ts` | All use `LinkedIn-Version` header from `LINKEDIN_API_VERSION` env var |
| Add React component | `app/components/` | Client components need `'use client'` directive |
| Add/modify tests | `__tests__/{api,components,lib,utils}/` | Mirror source structure |
| CSV export for new strategy | `utils/csv-export.ts` | Add generator fn + wire download handler in `page.tsx` |
| Environment config | `.env.local.example` | Template; real secrets in `.env.local` (gitignored) |
| Type extensions | `types/next-auth.d.ts` | Session augmentation for accessToken, refreshToken, etc. |

## CONVENTIONS

- **API routes**: Each strategy = separate route (not parameterized). GET handler exports only.
- **Auth pattern**: Bearer token passed via `Authorization` header from client → API routes forward to LinkedIn.
- **Interfaces**: Duplicated per file (AnalyticsElement, DateRange, LinkedInAnalyticsResponse appear in page.tsx, route files, csv-export.ts independently). No shared types file for API responses.
- **Path alias**: `@/*` maps to project root (tsconfig paths).
- **Port**: Dev server on 3001 (`next dev -p 3001`), NOT default 3000.
- **API version**: Centralized via `LINKEDIN_API_VERSION` env var, fallback `'202506'`.
- **Coverage threshold**: 70% minimum (branches, functions, lines, statements).

## ANTI-PATTERNS (THIS PROJECT)

- **DO NOT** add `@ts-ignore` or `@ts-expect-error` — the codebase has zero instances, keep it that way.
- **DO NOT** use daily aggregation (Strategy 4) for business decisions — 20-50%+ data loss documented.
- **WATCH**: `app/lib/auth-config.ts:210` uses `as unknown as ExtendedSession` double-cast. Avoid adding more.
- **WATCH**: `utils/data-processing.ts` accepts `any[]` in some functions. Type properly for new additions.
- **WATCH**: `app/contexts/` directory exists but is empty. Either use or remove.

## UNIQUE STYLES

- **4-Strategy pattern**: Core architecture. Each API strategy demonstrates different LinkedIn data accuracy trade-offs due to Professional Demographic privacy thresholds (min 3 events).
- **page.tsx is monolithic** (~1200+ lines JSX). All 4 strategy tables, form, CSV handlers, geo resolution in one component. No extraction yet.
- **Console logging everywhere**: 30+ console.log/error across auth + API files. `next.config.js` strips console in production builds, so this is tolerated.
- **No shared API response types**: Each file defines its own `AnalyticsElement` interface identically.
- **Geo resolution**: Client-side lazy loading via `fetchGeoName()` — resolves `urn:li:geo:{id}` on demand, caches in React state.

## COMMANDS

```bash
npm run dev            # Dev server at http://localhost:3001
npm run build          # Production build (strict TS, strips console)
npm start              # Production server (port 3000)
npm test               # Jest — 13 suites, 95 tests
npm run test:watch     # Jest watch mode
npm run test:coverage  # Coverage report (70% threshold)
npm run lint           # ESLint (next/core-web-vitals + typescript)
```

## NOTES

- **LinkedIn Professional Demographic restrictions**: Pivot queries filter out data points with <3 events. This is NOT a bug — it's LinkedIn privacy. Strategy 1 (no pivot) is the gold standard benchmark.
- **Token lifecycle**: Access tokens ~60 days. Refresh proactively 7 days before expiry. Refresh tokens valid 360 days max. After 360 days, user must re-authenticate.
- **OAuth scopes required**: `r_ads_reporting,r_basicprofile,r_ads,rw_ads`
- **No CI/CD**: `.github/workflows/` is empty. Tests must be run manually.
- **.env.local**: Gitignored but exists with real credentials. Rotate if repo is shared.
- **README.md**: 1300+ lines. Comprehensive but verbose — primary reference for LinkedIn API strategy details.
- **jest.setup.js**: Mocks Next.js server/navigation, NextAuth, and global fetch. Read this before writing tests.
