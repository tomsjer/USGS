# Quake Map

Interactive, responsive map of USGS earthquake data with a filterable sidebar,
magnitude-scaled markers, click popups, and first-class loading / empty / error states.

## Stack

- **Docker** — dev/prod parity (multi-stage: Vite build → nginx serve)
- **Vite** — dev server + production build
- **TypeScript** (strict) + **React 19**
- **MapLibre GL JS** via `react-map-gl` — single GeoJSON source, circle layer sized & colored by magnitude
- **OpenFreeMap** basemap — free, no API key
- **Zustand** — state as explicit status unions (no boolean soup)
- **react-hook-form** + **Zod** — validated filter form
- **Zod** — runtime validation at both boundaries (form input + USGS response)
- **TailwindCSS** v4 + **shadcn/ui** — styling and the collapsible Sidebar
- **Biome** — lint + format
- **pnpm** — package manager (via Corepack)

No API key required.

## Prerequisites

- Docker + Docker Compose
- Node.js 20+ (only for tooling run outside the container)
- pnpm via Corepack: `corepack enable`

## Getting started

```bash
git clone <repo> && cd quake-map
corepack enable
pnpm install
docker compose up        # dev server (Vite) with hot reload
```

Dev app runs at http://localhost:5173.

## Docker

One multi-stage `Dockerfile` with named targets:

- `dev` — runs `pnpm dev --host`; used by `docker compose` with source bind-mounted for HMR.
- `build` → `serve` — Vite builds static assets, nginx serves them. The final image contains no Node.

```bash
docker build --target serve -t quake-map .
docker run -p 8080:80 quake-map
```

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Vite dev server |
| `pnpm build` | Production build → `dist/` |
| `pnpm check` | Biome lint + format (writes fixes) |
| `pnpm check:ci` | Biome in CI mode (no writes, fails on issues) |
| `pnpm typecheck` | `tsc --noEmit` |

`pnpm check:ci` and `pnpm typecheck` must both pass before a commit lands.

## Features

- **Sidebar filter form** — `starttime`, `endtime`, `minmagnitude`; validated on submit
  (start ≤ end, magnitude in range, no future dates) before any request fires.
- **Markers** — circle radius and color scale with magnitude via a MapLibre data-driven expression.
- **Popup** — click a point for place, magnitude, and human-readable local time.
- **Responsive** — collapsible sidebar; map and filters stay usable from mobile to desktop.
- **State feedback** — loading, fetching, rendering, ready, empty, and error are all surfaced.

## Data source

USGS FDSNWS Event API (GeoJSON):
`https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=...&endtime=...&minmagnitude=...`

Every response is parsed through the Zod schemas in `src/lib/usgs/schema.ts`; raw API JSON never
reaches a component. `endtime` is normalized to end-of-day UTC, and `mag` is treated as nullable.

## Architecture decisions

- **Pure data layer.** `src/lib/usgs` is framework-free — fetch + Zod parse as plain typed functions,
  no React / store / MapLibre imports. This isolates the seam where the optional Web Worker, IndexedDB,
  and Service Worker bonuses attach, so they can be added without touching the UI.
- **Explicit state machine.** App status is a discriminated union, not booleans, so loading/empty/error
  are first-class and the `rendering → ready` step is driven by MapLibre's `idle` event, not guessed.
- **Abortable requests.** Each fetch carries an `AbortController`; a new filter submit cancels the
  in-flight one so a stale response can't overwrite newer results.
- **Circle layer over clustering.** Per-point magnitude sizing and per-point popups need individual
  features; a GPU circle layer handles the data volume without clustering.

## State & UX model

- **Map lifecycle:** `idle → loading → ready` (MapLibre `load` event).
- **Data lifecycle:** `idle → fetching → rendering → ready`, plus `empty` and `error`.
- Status is shown **non-blocking** (corner pill / `aria-live`), never a full-screen blocker except the
  first map load.
- **Stale-while-revalidate:** current points stay visible (dimmed) while the next set fetches.

## Project structure

```
src/
  lib/usgs/   # framework-free fetch + Zod schemas (only place USGS URLs live)
  stores/     # Zustand slices: quakes, filters, status
  map/        # MapLibre config: source, circle layer, basemap, paint expressions
  components/ # dumb renderers of store state
```

## Notes & tradeoffs

<!-- Before submitting: document any incomplete work, assumptions, and (if attempted) the
     Web Worker / IndexedDB / Service Worker bonus approach and why you chose it. -->

## Conventions

Full set lives in `CLAUDE.md`. In short: no `any`; one-way data flow (form → fetch → Zod → store → view);
no fetching inside components; responsive-first Tailwind; derive with selectors, not effects.
