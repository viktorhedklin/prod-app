# VESPER → JARVIS Supercomputer — Mission Gameplan

Mission: refactor the app + backend functions, add new layers of intelligence,
and upgrade the UI to a JARVIS cockpit. Build must stay green at every step.

App: /app/conversations/6a97591c855837accef1023d
Stack: React 18 + TypeScript strict + MUI v5 + Vite, Supabase backend,
Groq AI through server proxy (functions/aiProxy.ts), agent tools
(src/agentTools.ts), knowledge/reasoning orbs (src/orbStore.ts, src/screens/Mind.tsx).

## Workstream A — Refactor (worker skill: vesper-refactor-worker)
- All AI call paths through src/aiTransport.ts (aiFetch) — zero direct provider fetches
- Split CopilotInterface.tsx (~1300 lines): runAgent → copilotAgentLoop.ts,
  chat rendering → components/copilot/, speech → hooks/useSpeechRecognition.ts
- Unify all date math on src/dateUtils.ts (SGT work date, Sunday-start weeks)
- Kill dead code, harden async error handling
- OWNERSHIP: src/ai.ts, src/aiAgent.ts, src/copilotSkills.ts, src/components/CopilotInterface.tsx (split), src/components/copilot/*, src/hooks/*, functions/*

## Workstream B — Intelligence layers (worker skill: vesper-intelligence-worker)
- src/intelligence/forecast.ts — weekly grade forecast (linear regression, 14d momentum)
- src/intelligence/patterns.ts — CSAT dips, backlog streaks, weak weekdays, esc accuracy drift
- src/intelligence/triggers.ts — proactive rules (unlogged metrics, zero-hour tasks, tier risk)
- src/intelligence/reinforce.ts — reinforced memory (retrieval strengthens orb nodes, decay curve)
- Wire into Dashboard/Today/Copilot greeting WITHOUT breaking existing screens
- OWNERSHIP: src/intelligence/*, plus minimal wiring imports into screens (coordinate: screens also touched by C — keep wiring additive, <10 lines per screen)

## Workstream C — JARVIS UI (worker skill: vesper-jarvis-ui-worker)
- src/components/jarvis/: SystemStatusChip, HudGauge, StatusReadout, BootSplash
- Theme: deep-space navy + teal HUD accents, uppercase letter-spaced micro-labels
- Dashboard as cockpit (gauges + telemetry row above existing charts)
- Restraint: status decoration only, content areas stay clean
- OWNERSHIP: src/components/jarvis/*, src/theme/* (if any), Dashboard.tsx layout section only

## Coordination rules
- Supervisor assigns explicit file ownership; no worker edits another's files
- Each worker reports: files touched, what changed, build result, self-checks
- Nuclear QA (vesper-nuclear-qa skill) reviews EVERYTHING before sign-off
- Supabase is READ-ONLY during QA. No schema changes ever.
- The dev server runs on port 5173 (tmux). Screens: Today, Dashboard, Tasks,
  Escalations, Coaching, Reflect, QaReview, Growth, Mind, SmartDashboard
