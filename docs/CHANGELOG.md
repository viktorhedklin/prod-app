# Changelog

Reverse-chronological. One entry per commit; same-day related commits are grouped.
Dates are commit dates (author local time, UTC+2). Pre-Sep-3 commits are human
commits; the Sep 3–4 commits were produced by an AI agent ("Vesper AI") executing
the plan in `vesper-mission-gameplan.md`.

## 2026-09-04

### 531d660 — AI Core: merge reactor + telemetry into one cinematic HUD, kill boxed clutter
- Removed the separate "COCKPIT TELEMETRY" card that was stacked under the AI Core
  hero panel on the Dashboard — the two boxes competed for attention.
- Score/forecast gauges and volume/CSAT/backlog/pending readouts now float directly
  over the 3D reactor scene as ambient HUD overlays (scrimmed, no card chrome).
- New `src/components/jarvis/TelemetryReadout.tsx`: plain-text overlay component with
  zero border/background, designed to sit on top of visuals.
- `src/screens/SmartDashboard.tsx` reworked (~113 lines changed) into a single
  dominant hero panel; `src/components/jarvis/index.ts` re-exports the new component.
- Why: moves the dashboard closer to genuine FUI/HUD design language — one focal
  point, data floating around it, minimal chrome.

## 2026-09-03

### 0165ac9 — Nuclear JARVIS: 3D AI core, HUD widgets, live copilot engagement state, intelligence pipeline
By far the largest commit (~16.6k insertions, ~2.4k deletions, 65 files). Executes
the full "VESPER → JARVIS" mission gameplan (A: refactor, B: intelligence, C: UI).

- **AI path refactor (Workstream A)**: all AI calls now go through
  `src/aiTransport.ts` (`aiFetch`) → server-side proxy `functions/aiProxy.ts`
  (Deno function deployed at `https://vesper-a0e4cc96.base44.app/functions/aiProxy`,
  key held in server env, Groq `openai/gpt-oss-120b` or xAI `grok-2-latest`
  depending on key prefix). This replaces the Aug-20 OpenRouter/Claude client-side
  provider. Fallback: direct provider call with a key stored in localStorage.
  The old ~1300-line CopilotInterface was split: agent loop →
  `src/copilotAgentLoop.ts`, chat rendering → `src/components/copilot/`
  (ChatBubble, SkillForms), speech → `src/hooks/useSpeechRecognition.ts`.
- **Agent + skills**: `src/agentTools.ts` (25 `VESPER_*` tools: tasks,
  escalations, metric/CSAT logging, coach profile/memory, journal, coaching plans,
  knowledge-orb CRUD), `src/copilotSkills.ts` (8 guided skills: email-drafter,
  chat-response, daily-logger, productivity-analyzer, week-predictor,
  coach-checkin, task-manager, pattern-detective), `src/aiAgent.ts` agent engine.
- **Intelligence layer (Workstream B)**: new `src/intelligence/` —
  `forecast.ts` (weekly grade projection vs A+ target), `patterns.ts`
  (csat_dip, backlog_streak, weak_weekday, escalation_drift detectors),
  `triggers.ts` (UNLOGGED_METRICS, ZERO_HOUR_TASKS, TIER_RISK proactive nudges),
  `reinforce.ts` (retrieval strengthens knowledge-orb nodes), plus
  `runIntelligencePipeline()` in `index.ts` wired into the new dashboard.
- **3D + HUD (Workstream C)**: `src/components/jarvis3d/` — WebGL plasma core
  (`NuclearCore.tsx`, GLSL shaders, particles, mouse parallax) behind
  `JarvisStateProvider`. New `src/components/jarvis/` widget set (AiCore,
  BootSplash, HudFrame, HudGauge, LiveIntelligenceFeed, MemoryInsightWidget,
  MissionTimeline, ProviderStatusGrid, StatusReadout, SystemMonitorPanel,
  SystemStatusChip). Global state machine in `src/jarvisState.ts`
  (idle=cyan / listening=cyan / thinking=orange / error=red, cognitive load 0–1)
  and `src/jarvisEngagementStore.ts` (pub-sub + `useSyncExternalStore`) wiring
  real copilot activity (voice, agent loop, speaking, error) into the core on
  every screen.
- **New screens**: `SmartDashboard.tsx` (cinematic cockpit, ~1650 lines) replaces
  `Dashboard.tsx`; `Mind.tsx` — 3D knowledge-orb graph editor
  (`OrbGraph3D.tsx`, `OrbDetailPanel.tsx`, backed by `src/orbStore.ts` and
  Bybit knowledge base `src/bybitKnowledge[Data].ts` sourced from `research/`).
  Static `Dashboard.tsx`, `Growth.tsx`, `Coaching.tsx` screens deleted
  (−2,069 lines) in favor of the conversational copilot UI
  (`CopilotInterface.tsx`, `LivingAvatar.tsx` ~1,077 lines).
- Also added: `ErrorBoundary.tsx`, `bybit-com/bybit-eu` research notes, root-level
  one-off scripts (`update_ai_ts.py`, `update_task_a1.py`, `update_tools.py`),
  and `vesper-mission-gameplan.md`.

## 2026-08-21

### 5d1c3fe — Add Streak Calendar heatmap + Weekly Review dialog to Growth page
- New `src/components/StreakCalendar.tsx`: GitHub-style contribution heatmap of
  daily logging streaks on the Growth page.
- New `src/components/WeeklyReviewDialog.tsx` (~360 lines): weekly review with
  per-metric grade breakdown and coach feedback.
- `src/grading.test.ts` updated for the new grading surface.
- Note: the Growth page (and therefore both of these components) was deleted in
  the Sep-3 JARVIS overhaul; the two component files remain in the tree,
  now unreferenced.

### 9eb32da — P2: vitest setup + tests for grading/insights, lazy-load screens with React.lazy + Suspense
- Added vitest + jsdom (`vitest.config.ts`, deps in `package.json`); first test
  suites: `src/grading.test.ts` (261 lines) and `src/insights.test.ts` (248 lines).
- All screens converted to `React.lazy` + `Suspense` in `src/App.tsx` so each
  tab's code loads on demand; `src/useApp.ts` extracted as a thin hook wrapper
  over `AppContext`.
- `src/AppContext.tsx` reduced (~55 lines changed), `tsconfig.app.json` updated
  for tests.

## 2026-08-20 (evening — bug-fix and polish passes)

### 23d0222 — P1: derive QA grading from editable targets, fix MetricBar fill math, shared EmptyState, tokenize tier/status/category colors
- `src/components/EmptyState.tsx` added; Tasks/Escalations/QaReview/Growth/Dashboard
  now share one empty-state component instead of ad-hoc plain text.
- Tier/status/category colors moved into theme tokens in `src/theme.ts`
  (`TierChip.tsx` simplified) — groundwork for consistent dark mode.
- MetricBar fill math corrected (bars previously overflowed/mis-scaled).
- QA grading now derives tiers from the user-editable KPI targets
  (`src/grading.ts`) instead of hardcoded cutoffs.

### d40217d — Fix P0 bugs: mobile nav reaches all tabs, unify local date keys, wire weekly task hours, stop fabricating future days
- Mobile bottom nav previously couldn't reach all 7 tabs; `src/App.tsx` nav
  reworked (+139 lines) so every tab is reachable on small screens.
- All screens now use one local-date key convention (`src/dateUtils.ts`),
  fixing a class of "today shows the wrong day" timezone bugs.
- Weekly task hours wired into grading instead of silently ignoring them.
- `expandWeeklyEntries` in `src/grading.ts` no longer spreads a weekly entry's
  totals across future days of that week (which had been inflating the trend
  with unworked days).

### f34ff13 + eac4a6b — Animated AI coach avatar (added, then polished)
- `eac4a6b`: new `src/components/CoachAvatar.tsx` — animated gradient orb with
  thinking/speaking states (added `motion` dependency); used in the Coaching
  screen chat.
- `f34ff13`: polished it — shine sweep, status pill, animated "thinking" eyes —
  and used it in the Growth chat too.

### c6e94ba — Redesign: deep teal theme, dark mode, nav icons, mobile bottom nav, consistent headers
- Full visual retheme: deep-teal palette, paired light/dark themes in
  `src/theme.ts` (was hardcoded light-only) with a sun/moon toggle persisted to
  localStorage.
- Icons added to every nav tab; mobile bottom navigation bar; shared
  `PageHeader.tsx` for consistent screen headers.
- This delivered several IMPROVEMENT_PLAN items in one pass (dark mode 2.4,
  mobile bottom nav 2.1, header consistency).

## 2026-08-20 (early hours — AI provider and coaching depth)

### 9f54845 + 1c4dfc6 — Free OpenRouter models with retry; AI JSON parsing, honest weekly CSAT grading, QA screenshot extraction
- `1c4dfc6`: robust JSON extraction from AI replies (balanced-brace parser in
  `src/ai.ts`), weekly CSAT grading computed honestly from the week's own
  totals, and vision-model QA extraction: paste/upload a QA screenshot and the
  AI returns structured QA findings.
- `9f54845`: switched to free OpenRouter models with retry-on-429 logic —
  cost reduction for a personal app.

### 9f1324b — Add weekly data entry, coach memory, and DB-persisted coach profile
- Weekly entry flow: log a whole week's numbers in one form
  (`weekly_entries` table, migration `20260820150000_weekly_entries_coach_memory.sql`),
  spread into daily entries by `expandWeeklyEntries`.
- Coach memory (`coach_memories`) and coach profile moved to Supabase
  (`coach_profile`) with localStorage fallback — the AI coach now remembers
  facts about the user across sessions.

### d4ff5cc — Switch AI provider to OpenRouter with Claude Sonnet model
- `src/ai.ts` + `src/storage.ts` retargeted from a previous provider to
  OpenRouter (`anthropic/claude-sonnet`) with the key held client-side.
- Superseded on Sep 3 by the proxy-first Grok/xAI architecture.

### cc3f797 — Add coach onboarding profile, motivating AI persona, and KPI targets editor
- Coach onboarding profile (role, goals, coaching style) persisted via
  `src/storage.ts`; `COACH_PERSONA` system prompt in `src/ai.ts` personalizes
  coaching by style (push / encourage / balanced).
- KPI targets editor UI in Growth — users can edit metric weights/thresholds,
  saved to `kpi_targets` (delivers IMPROVEMENT_PLAN item 1.1).

### f4cb3b9 — Make qa_entries.owner_id nullable for single-tenant anon writes
- Migration patch (`20260820090000_coaching_plans_and_qa_categories.sql`):
  `qa_entries.owner_id` nullable so the anon-key frontend can write QA rows
  without an owner (there is no auth/user system).

### de654f4 — Add coaching plans, shift todo list, backfill, QA categories, and UI polish
- Coaching plans (`coaching_plans`), QA categories, migration
  `20260820090000_coaching_plans_and_qa_categories.sql`.
- Shift todo list and per-date backfill: new `DateNav.tsx` lets the user page
  to past dates and edit entries (delivers IMPROVEMENT_PLAN 2.6).
- `src/insights.ts` extended, Tasks/Today/QaReview/Escalations substantially
  reworked; `src/dateUtils.ts` added.

## 2026-08-19

### d6bc9fa — Initial commit ("Added eslint.config.js")
- Full Vite React+TS scaffold of the Productivity Grader app (~10.8k lines):
  all original screens (Dashboard, Today, Tasks, Escalations, Growth, Coaching
  came later, Reflection, QaReview), `AppContext.tsx`, `storage.ts`,
  `supabaseClient.ts`, grading (`grading.ts`, tiers S/A+/A/B/C/PIP) and
  rule-based insights (`insights.ts`), MUI theme, and the Supabase schema
  (`20260812010610_create_app_tables.sql` — daily_entries, csat_notes, tasks,
  escalations, reflections, journal_entries, insights, achievements,
  kpi_targets, mood_checkins, all with wide-open anon RLS policies for the
  single-tenant design), plus `20260812011642` (seek_feedback) and
  `20260813030931` (qa_entries).
