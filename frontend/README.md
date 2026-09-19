# PRIMAX GOLD — Quantitative Trading & Financial Intelligence Terminal

A production-quality React frontend for the PRIMAX GOLD paper-trading and research
platform. The terminal connects to the existing **FastAPI + PostgreSQL** backend
documented below — it does not invent endpoints, database values or trading results.

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4 (custom dark terminal theme)
- Recharts (analytical charting)
- Zustand (application / system / toast stores)
- Lucide icons

## Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `http://localhost:8000/api` | REST base URL |
| `VITE_WS_URL` | `ws://localhost:8000/ws` | Realtime WebSocket URL |

Copy `.env.example` to `.env.local` to override the defaults.

## Backend contract used

```
GET /api/health         — service health, version, environment
GET /api/market-ticks   — instrument quotes (bid/ask/depth/timestamp)
GET /api/orders         — order lifecycle records
GET /api/executions     — fills, fees, latency
GET /api/positions      — open positions and P&L
GET /api/portfolio      — cash, equity, P&L, exposure
WS  /ws                 — realtime market updates
```

All HTTP access is centralised in `src/services/api.ts` with typed services in
`src/services/backend.ts` and defensive payload normalisation in
`src/services/normalize.ts`.

## Running

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production bundle in dist/
```

## Data behaviour

Every data-driven panel implements **loading / loaded / empty / error /
disconnected** states. When the backend is unreachable, the terminal shows an
explicit reconnect banner and renders a clearly-labelled *simulated preview
dataset* so the interface stays reviewable — simulated values are never
presented as live data.

## Pages

Overview · Markets · Orders · Executions · Positions · Portfolio · Strategy ·
Performance · Risk & Security · System Health · Backtests · Model Analytics ·
Settings

---

PRIMAX GOLD is currently operating in a paper-trading and research environment.
Past simulation results do not guarantee future performance. Trading signals are
experimental and should not be interpreted as financial advice.
