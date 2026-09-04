# Roadmap

Forward-looking, as of 2026-09-04. Derived from code inspection, the current
test/build state, and still-open items in `IMPROVEMENT_PLAN.md` (written
2026-08-13, partially executed since) and `vesper-mission-gameplan.md`
(executed Sep 3). Concrete and actionable; nothing here is aspiration.

## Now (P0 — correctness, hygiene, small fixes)

1. **Fix the test runner.** `npm run test` currently fails to *start* on
   Node 20.x: `jsdom@30` pulls an `undici` that calls
   `webidl.util.markAsUncloneable`, which doesn't exist in Node 20
   (`TypeError` before any test runs; verified 2026-09-04 on Node v20.20.2).
   Action: pin `"engines": { "node": ">=22" }` in `package.json` (or downgrade
   jsdom), and verify `npm test` is green in CI/locally.
2. **Add `.env` to `.gitignore`.** `.env` is currently untracked but *not*
   ignored — one careless `git add .` publishes `VITE_SUPABASE_URL` /
   `VITE_SUPABASE_ANON_KEY` (and any `VITE_AI_API_KEY`). Related: the
   `origin` remote URL has a GitHub access token embedded in `.git/config`;
   treat that token as burned and rotate it.
3. **Resolve orphaned components.** `src/components/StreakCalendar.tsx`,
   `WeeklyReviewDialog.tsx`, and `CoachAvatar.tsx` have no importers since
   Growth/Coaching were deleted (Sep 3). Either delete them or reintroduce
   streaks/weekly review into `SmartDashboard` (the streak habit loop was a
   real feature; losing it silently is a product regression).
4. **Update stale AI-provider references.** Comments in
   `src/copilotAgentLoop.ts` ("Call OpenRouter API") and `src/aiAgent.ts`
   ("Execute ... call with OpenRouter") describe the Aug-20 architecture; the
   code now goes through `aiFetch` → Base44-hosted `functions/aiProxy.ts`
   (Groq / xAI). Fix the comments and the provider story in `README.md`.
5. **Reconcile `aiAgent.ts` vs `copilotAgentLoop.ts`.** Two ~1.1k-line agent
   engines coexist; the copilot path uses `copilotAgentLoop.ts` +
   `agentTools.ts`. Determine whether `aiAgent.ts` is dead code and delete it,
   or extract its still-used prompt-building pieces into shared modules.
6. **Repo hygiene:** rename `package.json` `name` from `"template"`;
   remove or relocate one-off agent scripts (`update_ai_ts.py`,
   `update_task_a1.py`, `update_tools.py`) and the stray `gh-deploy/` copy;
   decide whether `vite-plugin-singlefile` (installed, unused in
   `vite.config.ts`) is wanted — if yes, use it, if no, remove it.

## Next (P1 — product gaps left by the JARVIS overhaul)

1. **Restore a KPI-targets editor surface.** The editor built Aug 20
   (`cc3f797`) lived in the deleted Growth screen; targets are still
   DB-persisted and drive all grading/forecasting, but there is no UI to edit
   them. Add it to SmartDashboard or Settings.
2. **Navigation badges (old plan 2.5, never done).** 8 tabs again after
   Sep 3; add pending-count badges (Today: unlogged fields; Tasks: pending;
   Escalations: open) so attention is visible without clicking through tabs.
3. **Bundle-size pass.** One SPA now ships three.js + @react-three/fiber +
   recharts + MUI + motion. Action: `React.lazy` the three 3D components
   (`NuclearCore`, `OrbGraph3D`, `LivingAvatar`) so the core dashboard payload
   doesn't include WebGL code; run `vite build --report` (or rollup-plugin-
   visualizer) and record current gzipped size as a baseline.
4. **Test the intelligence layer.** `src/intelligence/` (forecast, patterns,
   triggers, reinforce) and `expandWeeklyEntries`/`computeWeeklyGrade` in
   `grading.ts` are pure and testable; only grading/insights have suites.
   Also add a contract test for the `aiFetch` → proxy JSON shape and the
   balanced-brace `parseJsonObject` in `ai.ts`.
5. **Wire the QA smoke tests.** `qa/*.mjs` (Playwright screenshots + checks
   against localhost:5173) are not in `package.json` and playwright isn't a
   declared dep. Add `npm run qa` and a devDependency so the JARVIS UI has any
   regression check at all.
6. **Week-over-week comparison (old plan 1.2, still open)** on
   SmartDashboard: delta of this week's weighted grade vs last, with per-metric
   up/down.
7. **Data export (old plan 4.1, still open):** CSV export of daily entries,
   weekly entries, CSAT notes, QA entries. Single-user personal data; the user
   should be able to own a copy.

## Later (P2 — risks and structural work)

1. **Auth / tenancy decision.** RLS is `USING (true)` for `anon` on every
   table: anyone who obtains the (public, bundle-visible) anon key can read and
   write all personal data. For a private deployed app this is a real exposure.
   Minimum: restrict policies + a Supabase Auth single-user login; maximum:
   full multi-tenancy (which would also let `qa_entries.owner_id` and friends
   become meaningful again).
2. **Harden `functions/aiProxy.ts`.** CORS is `*`, there's no rate limiting or
   origin allowlist, the model list is hardcoded (Groq `gpt-oss-120b` / xAI
   `grok-2-latest`), and `AI_PROXY_URL` is hardcoded in `src/aiTransport.ts`.
   Move the URL to an env var, restrict origins, and consider a per-day request
   cap so an abused proxy doesn't burn the AI quota.
3. **Quiz/punctuality override (old plan 1.7) — re-scoped.** Grading now uses
   only 5 KPI targets and no longer includes quiz/punctuality metrics, so the
   original plan item is obsolete; if the user wants those metrics back, add
   them as `kpi_targets` rows rather than special-case code.
4. **Knowledge pipeline for `research/`.** `bybitKnowledgeData.ts` is a
   hand-maintained 320-line literal; generate it from `research/bybit-*/`
   markdown (the `update_*.py` scripts were the start of this) and add a check
   that the data file stays in sync.
5. **PWA + notifications (old plan 4.6/4.7):** shift-work logging benefits
   from an installable app + "log your metrics" reminder; both remain unstarted.
6. **Component-level dark-mode audit (old plan 5.1):** tier/status/category
   colors are tokenized, but spot-check remaining hardcoded hexes in the
   jarvis/3D components (shaders and HUD chrome hardcode cyan/orange/red).
7. **Documentation upkeep:** `README.md` is untouched Vite template boilerplate
   — replace with a short project readme pointing at `docs/HANDOFF.md`.
   `IMPROVEMENT_PLAN.md` and `vesper-mission-gameplan.md` are historical; this
   file supersedes both as the live plan.
