# Handoff

Read this first. ~30 minutes and you should be productive in the codebase.
Companion docs (same folder): [CHANGELOG.md](./CHANGELOG.md) (per-commit
history), [LOGBOOK.md](./LOGBOOK.md) (narrative evolution),
[ROADMAP.md](./ROADMAP.md) (open work). Deeper review write-ups live in
[docs/reviews/](./reviews/) as they are produced.

## What this is

A single-tenant, single-user personal productivity and QA-coaching web app for a
shift worker: it logs daily shift metrics (chats, emails, CSAT ratings, task
hours, escalations, QA results), grades the week against editable KPI targets
into tiers (S / A+ / A / B / C / PIP), and provides an AI copilot ("Vesper")
that coaches the user, extracts QA findings from screenshots, runs an agent with
tools over the app's own data, and surfaces proactive intelligence (grade
forecast, behavioral patterns, triggers). The UI is a "Nuclear JARVIS" cockpit:
a React Three Fiber plasma core with a global state machine (cyan idle / orange
thinking / red error) surrounded by HUD widgets. Product names "Vesper Copilot"
and "Productivity Grader" are used interchangeably in code. No auth, no
routing — one static page deployed to GitHub Pages, Supabase as the backend.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | React 19 + TypeScript (strict), Vite 8, single-page, no router |
| UI | MUI v7 (`@mui/material` + icons), Emotion, `motion` for animation |
| 3D / WebGL | three.js + @react-three/fiber (NuclearCore, OrbGraph3D), GLSL shaders |
| Charts | recharts |
| Database | Supabase (Postgres) via anon key, wide-open RLS (single-tenant by design) |
| AI | Server-side Deno proxy (`functions/aiProxy.ts`, deployed on Base44) → Groq (`openai/gpt-oss-120b`) or xAI (`grok-2-latest`); client talks to it via `src/aiTransport.ts` (`aiFetch`) |
| Voice | Web Speech API (`src/hooks/useSpeechRecognition.ts`) |
| Tests | vitest + jsdom (`src/grading.test.ts`, `src/insights.test.ts` only) |
| Lint | ESLint 9 flat config (`eslint.config.js`) |
| Deploy | Static build to GitHub Pages (`gh-pages` branch), `npx gh-pages -d dist` |

## Repo layout

```
src/
  App.tsx              App shell: tabs, light/dark toggle, lazy-loaded screens
  AppContext.tsx       Central state provider: loads/persists all entities via storage.ts
  main.tsx             Entry point
  types.ts, defaults.ts  Domain types; default KPI targets (weights/thresholds)
  dateUtils.ts         All date math: local date keys, SGT work-date, week starts
  grading.ts           Grading engine: tiers, weighted grade, weekly grade, backlog
  insights.ts          Rule-based insight generation (pure functions)
  intelligence/        Forecast, pattern detection, proactive triggers, orb
                       reinforcement; runIntelligencePipeline() aggregator
  storage.ts           Supabase CRUD for all 15 tables + localStorage fallbacks,
                       incl. AI API key (fallback path)
  supabaseClient.ts    Supabase anon client (persistSession: false)
  ai.ts                Coach chat + QA screenshot extraction (vision) prompts,
                       robust JSON extraction from model output
  aiTransport.ts       THE AI transport: aiFetch() → proxy-first, direct-call
                       fallback, 429 retry
  aiAgent.ts           Older standalone agent engine (Grok) — check before reuse
  copilotAgentLoop.ts  runAgent(): builds full user-context prompt, executes
                       the tool-calling loop for copilot replies
  agentTools.ts        25 VESPER_* tool definitions + executor (tasks,
                       escalations, metrics, coach memory, journal, orbs)
  copilotSkills.ts     8 guided skills with form schemas (email-drafter,
                       chat-response, daily-logger, productivity-analyzer,
                       week-predictor, coach-checkin, task-manager,
                       pattern-detective)
  bybitKnowledge.ts / bybitKnowledgeData.ts
                       Keyword-retrieval Bybit product knowledge base
  orbStore.ts          Knowledge graph (nodes/edges/strength) + reasoning traces
  jarvisState.ts       Global JARVIS state machine (idle/listening/thinking/error,
                       cognitive load 0..1)
  jarvisEngagementStore.ts  Pub-sub store broadcasting real copilot activity to
                       every screen's core (useSyncExternalStore)
  hooks/               useSpeechRecognition (voice input)
  screens/             SmartDashboard (HUD cockpit), Today (daily entry, with
                       DateNav backfill), Tasks, Escalations, Reflection, QaReview
                       (screenshot extraction), Mind (3D knowledge-orb graph)
  components/          CopilotInterface + copilot/ (chat UI, skill forms),
                       jarvis/ (HUD widgets: gauges, boot splash, telemetry,
                       intelligence feed, provider grid...), jarvis3d/
                       (NuclearCore + state provider), plus shared UI
  theme.ts             Paired light/dark MUI themes (deep teal / dark space)
functions/aiProxy.ts   Deno edge function: holds AI key server-side, forwards
                       OpenAI-shaped chat completions + tool calls
supabase/migrations/   5 SQL files: full schema (see below)
research/              Source markdown (Bybit EU/.com) behind the knowledge base
qa/                    Playwright smoke scripts (*.mjs) + screenshots (*.png)
                       against localhost:5173 — not wired into npm scripts
docs/                  This documentation set
dist/                  Build output (gitignored)
```

Untracked/aux: `.env` (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY — used by
`supabaseClient.ts`), `gh-deploy/` (a manual copy of a build), root
`update_*.py` one-off agent scripts.

## Data flow

**Data:** Supabase tables → `src/storage.ts` (typed CRUD) → `AppContext.tsx`
(loads everything into memory on boot, persists on change) → screens. Key
tables: `daily_entries` (one row per date, PK = date string), `weekly_entries`
(a week's totals, spread into dailies by `expandWeeklyEntries` in
`grading.ts`), `csat_notes`, `tasks`, `escalations`, `reflections`,
`journal_entries`, `insights`, `achievements`, `kpi_targets`,
`mood_checkins`, `qa_entries` (owner_id nullable), `coaching_plans`,
`coach_profile`, `coach_memories`. All RLS policies are
`TO anon, authenticated USING (true)` — no auth, by design.

**Grading:** screens pass entries + KPI targets into `src/grading.ts`
(`computeWeightedGrade`, `computeWeeklyGrade`) → tier per metric → weighted
tier-point score → overall tier. `src/intelligence/` then runs
`runIntelligencePipeline()` over the same state: `forecast.ts` (projected
score / required daily pace to hit A+), `patterns.ts` (CSAT dips, backlog
streaks, weak weekdays, escalation drift), `triggers.ts` (unlogged metrics,
zero-hour tasks, tier risk). Results feed the SmartDashboard HUD widgets
(`LiveIntelligenceFeed`, `MemoryInsightWidget`, gauges).

**AI request path:** user types/speaks in `CopilotInterface` →
`copilotAgentLoop.runAgent()` builds a system prompt from live app state
(profile, memories, targets, today's entry, pending tasks, grade, knowledge
base hits, orb stats) → `aiFetch()` in `aiTransport.ts` POSTs to
`https://vesper-a0e4cc96.base44.app/functions/aiProxy` → the Deno function
injects the provider key from its env (`AI_API_KEY`) and forwards to Groq or
xAI → response streams back → if the model emitted tool calls, `agentTools.ts`
executes them against the app state and the loop continues → final reply is
rendered with `ChatBubble` and the engagement store drives the 3D core's state.
`ai.ts` (coach chat, QA-screenshot vision extraction) uses the same `aiFetch`.
Fallback: if the proxy is unreachable, `aiFetch` calls the provider directly
using a key from localStorage (`pg_ai_api_key`) or `VITE_AI_API_KEY`.

## Run / build / test / lint

```bash
npm install
# .env (untracked) must define: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
npm run dev            # Vite dev server on http://localhost:5173
npm run build          # tsc -b && vite build  → dist/
npm run test           # vitest run (grading + insights suites)
npm run test:watch     # vitest watch mode
npm run lint           # eslint .
npm run preview        # serve the built dist/
```

Gotcha: the test suite requires Node ≥ 22 (jsdom 30 breaks on Node 20 —
verified). Check `node -v` before concluding you broke something.

## Deployment

- `main` branch = source of truth. `gh-pages` branch = built output only.
- Deploy: `npm run build && npx gh-pages -d dist` — this pushes `dist/`
  contents to the `gh-pages` branch.
- Live: https://viktorhedklin.github.io/prod-app/
- Vite `base: './'` (relative assets) so it works under the `/prod-app/`
  subpath; `dist/` is gitignored, and the git remote for `gh-pages` is the same
  repo's `gh-pages` branch (the `gh-deploy/` folder is a leftover manual copy —
  not part of the pipeline).
- There is no CI; deploys are manual. `functions/aiProxy.ts` is deployed
  separately on the Base44 functions runtime — editing the file in-repo does
  NOT redeploy it.

## Known constraints & gotchas

1. **Single-tenant, no auth.** The anon Supabase key ships in the bundle and
   RLS allows full CRUD to anyone holding it. Treat the deployed URL as
   semi-public; don't store sensitive data in the DB beyond what it already has.
2. **`.env` is untracked but NOT in `.gitignore`** — don't `git add .` blindly.
3. **AI provider comments lie.** "OpenRouter"/"Claude" references in
   `aiAgent.ts`, `copilotAgentLoop.ts` comments, and the old docs describe the
   Aug-20 architecture; the current path is aiProxy → Groq/xAI. Trust
   `aiTransport.ts` + `functions/aiProxy.ts`.
4. **No router.** Tab state is React state; refresh always lands on the
   Copilot tab. Deep links aren't a thing.
5. **Dates are convention-sensitive.** All keys are local-date strings via
   `dateUtils.ts`; "work date" follows Asia/Singapore (SGT). Don't introduce
   `new Date().toISOString()` date keys anywhere — that's the exact class of
   bug fixed in d40217d.
6. **Two agent engines exist** (`aiAgent.ts`, `copilotAgentLoop.ts`) — the
   copilot uses the latter; the former is likely vestigial. Confirm before
   editing either.
7. **Orphaned components:** `StreakCalendar`, `WeeklyReviewDialog`,
   `CoachAvatar` are no longer imported anywhere (their screens were deleted
   Sep 3).
8. **Hardcoded AI proxy URL** in `aiTransport.ts`; hardcoded JARVIS colors in
   shaders/HUD. The KPI defaults in `defaults.ts` are overridden by DB
   `kpi_targets` rows.
9. **Stale `package.json` name** ("template"); `vite-plugin-singlefile` is
   installed but unused.
10. **The git remote URL embeds a GitHub access token** (in `.git/config`) —
    don't paste it anywhere; it should be rotated.
11. **Supabase schema changes** must go through new files in
    `supabase/migrations/` (never edit an applied migration).

## More detail

- Per-commit changes: [CHANGELOG.md](./CHANGELOG.md)
- The story of why the app looks/works the way it does: [LOGBOOK.md](./LOGBOOK.md)
- What to work on next: [ROADMAP.md](./ROADMAP.md)
- Code review write-ups: [docs/reviews/](./reviews/)
- Historical (superseded but useful context): `IMROVEMENT_PLAN.md` (Aug-13
  product review, partially executed), `vesper-mission-gameplan.md` (the Sep-3
  JARVIS refactor plan). `README.md` is template boilerplate, ignore it.
