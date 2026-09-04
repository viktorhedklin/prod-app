# Engineering Logbook

A narrative history of how this app got where it is. Written 2026-09-04 from the
full commit history (Aug 19 – Sep 4, 2026) and the current tree.

## Phase 0 — What this app is

The user is a shift worker in customer support (Bybit). They wanted a personal
tool that (a) logs the numbers of their shift — chats, emails, CSAT ratings, task
hours, escalations — (b) grades their week against KPI targets into tiers
(S / A+ / A / B / C / PIP), and (c) coaches them with AI. Two names are used
interchangeably in the code: "Vesper" (the AI copilot persona) and "Productivity
Grader" (the original product name). It is deliberately single-tenant: one user,
no auth, deployed as a static site to GitHub Pages with Supabase as the database.

## Phase 1 — Core coaching + QA grading MVP (Aug 19–20)

The initial commit (d6bc9fa, Aug 19) was already a complete v1: every screen
existed as a static MUI page, the grading engine (`src/grading.ts`) turned raw
daily metrics into weighted tier scores over 5 KPI targets (productivity 30%,
CSAT 30%, QA 20%, escalation rate 5%, escalation accuracy 5%), rule-based
insights lived in `src/insights.ts`, and the whole Supabase schema was created
with intentionally wide-open RLS (`USING (true)` to `anon`) because there is no
auth — the anon key in the browser is trusted to read and write everything.
That decision is still the defining constraint of the backend.

The Aug 20 early-hours commits were a rapid hardening and deepening pass done
directly with the user in the loop:

- **Data depth**: coaching plans, QA categories, a shift todo list, and —
  important for a shift worker who doesn't always log daily — a per-date
  backfill UI (`DateNav.tsx`) so missed days could be edited later (de654f4).
- **DB pragmatism**: `qa_entries.owner_id` made nullable because anon writes
  have no owner (f4cb3b9). Schema follows the no-auth reality rather than
  fighting it.
- **AI, take one**: the coach persona got an onboarding profile (role, goals,
  coaching style), a KPI targets editor so grading reflects the user's real
  targets, and the AI provider was pointed at OpenRouter/Claude with the API key
  held client-side (cc3f797, d4ff5cc). JSON parsing of AI replies was made
  robust (balanced-brace extraction — models append prose after JSON), QA
  screenshot extraction via a vision model was added, and free OpenRouter
  models with 429-retry reduced cost (1c4dfc6, 9f54845).
- **Coach memory**: weekly bulk data entry (a week's numbers in one form,
  spread across days by `expandWeeklyEntries`) and persistent coach
  memory/profile in Supabase (9f1324b).

Tradeoffs made here: the client held the AI key (acceptable for one user, but it
meant the key shipped in the bundle/localStorage), and `aggregateEntries` at one
point fabricated future days from weekly totals — fixed later the same day.

## Phase 2 — P0 bug fixes + visual redesign + coach avatar (Aug 20, evening)

The same day, a review pass (mirroring IMPROVEMENT_PLAN.md's P0 list) fixed the
real bugs first (d40217d): the mobile bottom nav couldn't reach all tabs, date
keys were inconsistent across screens (timezone bugs), weekly task hours were
ignored by grading, and `expandWeeklyEntries` was inventing future days — the
trend chart and "today" card showed scores for time not yet worked. Date logic
was centralized in `src/dateUtils.ts` with an SGT (Asia/Singapore) work-date
convention — a shift worker's "today" doesn't always match the browser's date.

Then the redesign (c6e94ba): deep-teal palette, paired light/dark themes (dark
mode was previously P3 "too large" in the plan; it got done anyway), nav icons,
and a shared `PageHeader`. A follow-up pass (23d0222) moved tier/status/category
colors into theme tokens, fixed MetricBar fill math, derived QA grading from the
editable targets, and introduced a shared `EmptyState` — deliberate cleanup that
made dark mode and later restyling much cheaper.

Finally the coach got a face: an animated gradient-orb avatar with
thinking/speaking states (eac4a6b), polished the same day with shine sweeps and
status pills (f34ff13). Small, user-delight-driven work.

## Phase 3 — Growth page, tests, lazy loading (Aug 21)

Two commits closed out the human-led era:

- 5d1c3fe added a Streak Calendar heatmap (habit reinforcement for logging) and
  a Weekly Review dialog to the Growth page.
- 9eb32da introduced vitest with real test suites for the two pure logic
  modules (`grading.ts`, `insights.ts`) and converted all screens to
  `React.lazy` + `Suspense` so tab code loads on demand. The choice to test only
  pure functions — not MUI components — kept the suite fast and stable.

Tradeoff: UI and AI code remained untested; the AI layer especially has no
contract tests (prompt/parse round-trips), which would bite in Phase 4 when the
AI surface grew tenfold.

## Phase 4 — Nuclear JARVIS: 3D core, HUD cockpit, agent copilot (Sep 3–4)

After a ~2-week pause, an AI agent ("Vesper AI") executed the
`vesper-mission-gameplan.md` plan in one giant commit (0165ac9, ~16.6k
insertions) with three workstreams:

- **Refactor (A)**: every AI call now flows through one transport
  (`src/aiTransport.ts` → `aiFetch`) hitting a server-side Deno proxy
  (`functions/aiProxy.ts`, deployed on Base44) that holds the provider key in a
  server env var — the client-side OpenRouter key is gone. The proxy
  auto-detects Groq vs xAI from the key prefix and transparently passes through
  OpenAI-shaped JSON, tool calls included. The old 1300-line CopilotInterface
  was split into agent loop (`copilotAgentLoop.ts`), chat components
  (`components/copilot/`), and speech (`hooks/useSpeechRecognition.ts`). The
  copilot became a real agent: 25 tools over the app's data (tasks, escalations,
  metrics, journal, coach memory, knowledge orbs) plus 8 guided skills with
  forms.
- **Intelligence (B)**: a new `src/intelligence/` pipeline — weekly grade
  forecast (projected score, required daily pace to hit A+), behavioral pattern
  detectors (CSAT dips, backlog streaks, weak weekdays, escalation-accuracy
  drift), proactive triggers (unlogged metrics, zero-hour tasks, tier risk),
  and reinforcement that strengthens knowledge-orb nodes on retrieval.
- **JARVIS UI (C)**: the whole visual identity moved to a "Nuclear JARVIS"
  cockpit: a React Three Fiber plasma core with GLSL shaders and particle
  effects (`components/jarvis3d/NuclearCore.tsx`), a global state machine
  (`jarvisState.ts`: cyan idle → orange thinking → red error, with a
  cognitive-load scalar) and an engagement store that broadcasts what the
  copilot is *actually doing* right now (listening/thinking/speaking) to every
  screen's 3D core via `useSyncExternalStore`. A HUD widget kit
  (`components/jarvis/`) provides gauges, boot splash, telemetry, and live
  intelligence feed.

The biggest product decision: **Dashboard, Growth, and Coaching screens were
deleted** (~2,069 lines) and replaced by one cinematic `SmartDashboard` and a
conversational copilot — coaching became a chat with an agent, not a form.
Consequences accepted: the Streak Calendar, Weekly Review dialog, and Coach
Avatar components were orphaned (still in the tree, unreferenced), and the
KPI-targets editor and streaks (Phase 1–3 features) currently have no UI surface.

A Bybit product knowledge base (`bybitKnowledge[Data].ts`, from `research/`
notes) and a knowledge-orb graph (`orbStore.ts` + the Mind screen, a 3D graph
editor) were added so the copilot can answer product questions during coaching.

The next day (531d660, Sep 4) tightened the result: the telemetry card that sat
boxed under the AI Core was killed; gauges and readouts now float directly over
the reactor scene via a chrome-less `TelemetryReadout` — one hero panel, real
FUI design language, less clutter.

Where this leaves the app: a visually ambitious single-page cockpit where the
AI copilot is the primary interface, grading/intelligence run client-side over
Supabase data, and the static bundle now carries three.js, R3F, recharts, MUI,
and motion — a bundle-size and test-coverage debt that Phase 5 should address.
