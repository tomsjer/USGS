# AGENTS.md

Single source of truth for every coding agent on this project (Claude Code, Codex, Cursor,
Windsurf, Cline, Copilot, Gemini CLI, …). Edit **this** file — never the per-tool ones.

- Claude Code reads it via `@AGENTS.md` in `CLAUDE.md`.
- All other listed agents read this file at the repo root natively.
- Keep tool-specific rule dirs (`.cursor/rules/`, `.windsurf/rules/`, etc.) empty unless a rule
  is genuinely tool-specific. Everything shared lives here.

## Project
Interactive, responsive map of USGS earthquake data. A validated sidebar filter form drives
queries to the USGS API; results render as magnitude-scaled circle markers with click popups.
Loading / empty / error states are always visible.

## Stack (don't substitute without flagging)
- Docker for dev/prod parity (multi-stage: Vite build → nginx serve)
- pnpm via Corepack
- Vite — dev server + build (TS/JSX transpile, bundling, HMR, Tailwind plugin)
- TypeScript, strict mode, no `any`
- React 19, function components only
- State: Zustand — one slice per domain (`quakes`, `filters`, `status`)
- Forms: react-hook-form + Zod via `zodResolver`
- Validation: Zod at BOTH boundaries — the filter form (input) and USGS responses (output)
- Styling: TailwindCSS v4 (via `@tailwindcss/vite`) + shadcn/ui (Sidebar primitive, collapsible on mobile)
- Map: MapLibre GL JS via react-map-gl — single GeoJSON source + data-driven circle layer
  (radius + color by magnitude). NO clustering: it breaks per-point magnitude sizing and per-point popups.
- Basemap: OpenFreeMap (free, keyless) — pinned in map config.
- Lint/format: Biome.

## Architecture
- One-way data flow: form submit → USGS query → Zod parse → typed `Earthquake[]` → Zustand → map + sidebar.
- **`src/lib/usgs` is framework-free.** Pure functions, returns typed results, imports NOTHING from
  React, the store, or MapLibre. This seam is what keeps the bonus features (Web Worker / IndexedDB /
  Service Worker) cheap to add later — never bury fetch inside a component hook.
- Map and sidebar are dumb renderers of store state. No fetching inside components.
- Each fetch carries an `AbortController`; submitting a new filter aborts the in-flight one. Latest response wins.
- Data source is the USGS query API:
  `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=&endtime=&minmagnitude=`
  The base URL is env-overridable (`VITE_USGS_API_URL`) with a default in `src/lib/constants.ts`;
  `src/lib/usgs` is still the only place that *builds* the query URL. (Summary feeds may seed an
  initial paint, but the form drives the query API.)
- All response shapes live in `src/lib/usgs/schema.ts` as Zod schemas; `z.infer` types ARE the
  domain types. Nothing downstream redefines them.
- Constants live in `src/lib/constants.ts`; generic helpers in `src/lib/utils.ts`. External
  URLs/config come from `VITE_*` env vars with a default in `constants.ts` (e.g. `VITE_USGS_API_URL`,
  `VITE_BASEMAP_STYLE_URL`). `constants.ts` reads only `import.meta.env`, so the framework-free
  `src/lib/usgs` may import it.
- The MapLibre circle-layer/paint **spec** lives in one module under `src/map/`; its scalar constants
  (source/layer ids, basemap URL, default mag, initial view) live in `src/lib/constants.ts`.

## Filter validation (graded — don't skip)
- The filter form has its own Zod schema: `starttime <= endtime`, magnitude numeric and in range, no future dates.
- Validate on submit with `zodResolver`; show inline field errors. Only a valid form triggers a fetch.

## UX & app state (matters a lot — loading/empty/error are graded)
- Filters are submit-driven server fetches. UI always reflects status via a `status` slice modelled
  as discriminated unions — never isLoading/isFetching booleans.
- Two lifecycles: map (`idle→loading→ready`, from MapLibre `load`) and data
  (`idle→fetching→rendering→ready` + `empty` + `error`). `rendering→ready` fires on MapLibre's
  `idle` event after a source update.
- `empty` (200 OK, 0 features) and `error` (network/parse failure) are explicit, user-visible states.
- Tips are contextual hints over ready/empty, not lifecycle states.
- Surface status non-blockingly (corner pill + aria-live), never full-screen except the first map load.
- Stale-while-revalidate: keep prior points visible (dimmed) during a fetch; never blank the map.

## Markers & popup
- Circle radius and color interpolate on `mag`. `mag` is nullable in USGS data — coalesce a default;
  never assume a number.
- Click a point → popup with place, magnitude, and human-readable local time (`time` is Unix ms).

## Gotchas
- USGS `endtime=YYYY-MM-DD` is midnight UTC — push to end-of-day UTC or events that day are dropped.
  Normalize form dates to UTC ISO.
- `mag` can be null; `place` can be null/empty. Schema accordingly.

## Conventions
- Unknown shape → model it with Zod, never `any`.
- Components: PascalCase files, colocated with hooks and tests.
- Tailwind: responsive-first (mobile default, scale up). No arbitrary values when a token exists.
- Derive state with Zustand selectors, not `useEffect`.
- Constants live in `src/lib/constants.ts` — don't scatter magic values inline.
- Generic helpers live in `src/lib/utils.ts`. Keep it DRY: extract a shared helper before duplicating.
- External URLs/config go through `VITE_*` env vars (typed in `src/vite-env.d.ts`) with a safe default
  in `constants.ts`; document each in `.env.example`. `.env` is gitignored.

## Commands
- `corepack enable` then `pnpm install` — first-time setup
- `docker compose up` — dev (runs `pnpm dev` in the container with source mounted)
- `pnpm check:ci` — Biome lint + format check
- `pnpm typecheck` — tsc --noEmit
- Both must pass before any commit.

## Git workflow
- Upon a successful feature implementation, commit it. "Successful" means the feature works and
  both gates pass (`pnpm typecheck` + `pnpm check:ci`).
- Write a proper message: a concise imperative subject (≤ ~72 chars), then a body explaining the
  what and why when the change is non-trivial. One logical feature per commit.

## Don't
- Don't cluster — use a circle layer sized/colored by magnitude.
- Don't put React / store / MapLibre imports in `src/lib/usgs`.
- Don't let a stale response overwrite a newer one — abort superseded fetches.
- Don't inline USGS URLs in components — they go through the `usgs` module.
