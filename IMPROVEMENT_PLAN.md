# Productivity Grader — Improvement Plan

> Generated from a full codebase review on 2026-08-13.
> Covers intelligence, UI, functions, visuals, and animations.

---

## 1. Intelligence & Logic

### 1.1 KPI Target Editor
**Problem:** KPI targets (weights, thresholds, direction) are hardcoded in `defaults.ts` and loaded from the database, but there is no UI to view or edit them. Users cannot tune the grading system.
**Plan:** Add a "KPI Settings" panel (accessible from Growth or a new Settings tab) that:
- Shows all 7 metrics with their current weights, thresholds, and direction
- Lets the user edit weights (with live validation that they sum to 1.0)
- Lets the user edit tier thresholds per metric
- Saves to Supabase via the existing `saveTargetsAndUpdate` function
- Shows a live preview of how changes affect the current score

### 1.2 Week-over-Week Comparison
**Problem:** The Dashboard shows today/week/month in isolation but no comparison between periods.
**Plan:** Add a "vs Last Week" delta indicator to the Dashboard:
- Compare this week's average score to last week's
- Show arrow + percentage change
- Highlight which metrics improved vs declined
- Surface as a small card below the period toggle

### 1.3 Predictive Score Projection
**Problem:** No forward-looking intelligence. The app only shows what happened, not what's likely.
**Plan:** Add a lightweight projection on the Dashboard:
- Based on the 7-day rolling average and trend slope, project where the score will land at month-end if the current pace continues
- Show as a subtle "Projected month-end: X.XX" line under the current score
- Only show when there are 5+ days of data

### 1.4 Smarter Daily Focus
**Problem:** `generateDailyFocus` in `ai.ts` is fully rule-based (picks weakest metric and returns a hardcoded tip). It doesn't use AI even when an API key is available.
**Plan:** When an AI key is present, call OpenAI to generate a contextual focus message that references the user's recent data. Fall back to the existing rule-based version when no key is set.

### 1.5 Data Logging Streak
**Problem:** Only reflection streak is tracked. There's no incentive for consistent data logging.
**Plan:** Add a "logging streak" counter that counts consecutive days with at least one metric entered. Show it on the Dashboard next to the reflection streak. Add an achievement for 7-day and 14-day logging streaks.

### 1.6 Insight Quality Expansion
**Problem:** `generateRuleBasedInsights` in `insights.ts` has 4 patterns. Missing useful patterns:
- **Productivity trend** (rising/falling over 2 weeks)
- **Best day of week** (which weekday consistently scores highest)
- **CSAT response rate** (low ratings count relative to volume)
- **Task submission lag** (average time between logging and submitting)
**Plan:** Add these 4 new pattern detectors. Each should follow the existing dedup-by-title pattern.

### 1.7 Quiz & Punctuality Override
**Problem:** Quiz score and punctuality are hardcoded to 100% / 10 points in `aggregateEntries`. The user confirmed this is intentional ("always standard on 100% unless I receive info about something different").
**Plan:** Add an override mechanism — a simple input on the Today screen (or a settings panel) where the user can enter a quiz score or punctuality adjustment for a specific date. When set, it replaces the default 100% for that date. When not set, the default 100% applies. Store overrides in a new `metric_overrides` table or as fields on `daily_entries`.

---

## 2. UI & Visuals

### 2.1 Mobile Bottom Navigation
**Problem:** The top nav has 7 tabs in a pill group. On mobile this overflows and is hard to tap.
**Plan:** On screens below `sm`, replace the top pill nav with a bottom navigation bar (Material `BottomNavigation`) showing 4-5 primary tabs (Dashboard, Today, Reflect, Growth) with a "More" menu for Tasks, Escalations, QA. Show numeric badges on Today (pending tasks) and Reflect (if not done).

### 2.2 Skeleton Loaders
**Problem:** The app shows a full-screen spinner during initial load. No skeleton placeholders for individual cards.
**Plan:** Replace the full-screen spinner with skeleton card layouts (Material `Skeleton` components) that match the Dashboard/Growth layout. This makes the app feel faster and more polished.

### 2.3 Empty States with Guidance
**Problem:** Empty states are plain text ("No tasks found", "No reflections yet"). No visual cues or calls to action.
**Plan:** Design empty states that include:
- A simple illustration or icon
- A one-line explanation
- A primary action button (e.g., "Add your first task", "Start your first reflection")
- Apply to: Tasks, Escalations, Reflections, Journal, QA History, Achievements

### 2.4 Dark Mode
**Problem:** Only light mode is supported. The theme has `mode: 'light'` hardcoded.
**Plan:** Add a dark mode toggle in the nav bar (sun/moon icon). Store preference in localStorage. Create a paired dark palette. Use `CssBaseline` automatic color scheme switching. All custom colors in components should reference theme tokens, not hardcoded hex values.

### 2.5 Navigation Badges
**Problem:** The nav tabs don't show pending counts. Users have to visit each tab to see what needs attention.
**Plan:** Add small numeric badges to:
- "Today" tab: count of unlogged metric fields
- "Tasks" tab: count of pending tasks
- "Escalations" tab: count of open escalations
- "Reflect" tab: dot indicator if reflection not done for today

### 2.6 Historical Date Navigation
**Problem:** The Today screen only shows today's data. There's no way to view or edit past entries.
**Plan:** Add a date picker (or prev/next day arrows) at the top of the Today screen. Let users navigate to any past date, view the entry, and edit it. This is important for users who forget to log on a given day.

### 2.7 Dashboard Chart Interactivity
**Problem:** The 7-day trend chart is static. No hover details, no clickable points.
**Plan:** Add:
- Hover tooltip showing full date + score
- Clickable points that navigate to that date's Today view
- A toggle between 7-day and 30-day view
- Gradient fill that intensifies on hover

---

## 3. Animations & Micro-interactions

### 3.1 Number Count-Up
**Problem:** Score numbers and streak counts appear instantly. No animated counting.
**Plan:** Add a `useCountUp` hook that animates numbers from 0 to their target value over 800ms. Apply to:
- Dashboard score
- Streak counters
- QA percentage
- Backlog hours
- Growth stats row

### 3.2 Staggered List Entrance
**Problem:** List items (tasks, escalations, insights, reflections) all appear at once.
**Plan:** Add staggered entrance animations to list items. Each item fades in with a 50ms delay from the previous. Use the existing `fadeInUp` keyframe with `animationDelay`.

### 3.3 Achievement Celebration
**Problem:** Unlocking an achievement just adds it to a list. No fanfare.
**Plan:** When a new achievement is unlocked:
- Show a full-width banner at the top of the current screen with the badge icon
- Animate it sliding in from the top with a bounce
- Auto-dismiss after 4 seconds
- Add a subtle confetti particle effect (lightweight CSS-based, no library)

### 3.4 Score Ring Fill Animation
**Problem:** The `ScoreRing` component uses `CircularProgress` with `variant="determinate"`, but the fill isn't animated on mount — it jumps to the value.
**Plan:** Animate the ring from 0% to the target percentage on mount using a CSS transition or a short interval-based animation. Add a subtle pulse when the score changes.

### 3.5 Tab Transition Polish
**Problem:** Tab changes use a basic `Fade` with 250ms. No directional sense.
**Plan:** Add a subtle slide+fade transition. When switching tabs, the new content slides up 8px while fading in. Use `Fade` + `Slide` combined, or a custom keyframe.

### 3.6 Button Micro-interactions
**Problem:** Buttons have a basic scale-down on active. No ripple feedback beyond Material default.
**Plan:** Add:
- Hover glow on primary buttons (subtle box-shadow that matches the button color)
- Spring-back on release (scale 0.97 → 1.02 → 1.0)
- Loading state spinner inside the button text when async actions are in progress

### 3.7 Loading Shimmer
**Problem:** Async loads (AI question generation, journal response, weekly recap) show a plain `CircularProgress`.
**Plan:** Replace with shimmer placeholder blocks that match the shape of the expected content. For example, when loading reflection questions, show 4 shimmer rectangles that look like question fields.

---

## 4. Functions & Features

### 4.1 Data Export (CSV)
**Problem:** No way to export data. Users can't back up or analyze their data externally.
**Plan:** Add an "Export Data" button in Growth settings that downloads a CSV with all daily entries, reflections, and QA scores. Use client-side CSV generation (no server needed).

### 4.2 Task Templates
**Problem:** Users recreate the same tasks repeatedly (e.g., daily reports, recurring submissions).
**Plan:** Add a "Save as Template" option on submitted tasks. Templates appear in a dropdown when creating a new task, pre-filling the form. Store templates in a `task_templates` table.

### 4.3 Batch Actions on Tasks & Escalations
**Problem:** Each task/escalation must be acted on individually. No "mark all submitted" or "resolve all" option.
**Plan:** Add a "Select All" checkbox and batch action bar to Tasks and Escalations screens. Allow batch "Mark Submitted" and batch "Mark Resolved".

### 4.4 CSAT Note Search
**Problem:** CSAT notes are stored but not searchable. Users can't find specific customer feedback.
**Plan:** Add a search field on the Growth or Today screen that searches CSAT notes by text content or rating. Show matching notes with the date and rating.

### 4.5 Weekly Planning Prompt
**Problem:** No forward-looking planning. The app is purely retrospective.
**Plan:** Add a "Plan Your Week" section on the Growth screen (or a new tab) that:
- Shows the upcoming week
- Lets the user set 1-3 focus areas for the week
- References last week's weakest metric as a suggested focus
- Stores the plan and checks in on it during the next weekly recap

### 4.6 PWA Support
**Problem:** The app is not installable as a PWA. No offline support.
**Plan:** Add a `manifest.json` and a service worker. Enable "Add to Home Screen" on mobile. Cache the app shell for offline viewing (data syncs when back online).

### 4.7 Notification Reminders
**Problem:** No reminders to log data, submit tasks, or complete reflections.
**Plan:** Use the Notification API to send browser notifications:
- 30 minutes before shift end: "Have you logged your metrics?"
- At shift end: "Submit your pending tasks"
- Evening: "Complete your reflection"
- Let the user enable/disable each reminder in settings

---

## 5. Code Quality & Architecture

### 5.1 Hardcoded Colors
**Problem:** Many components use hardcoded hex colors (e.g., `#EAF5EF`, `#4C8C6B`, `#FBEAE8`) instead of theme tokens. This makes dark mode and theming harder.
**Plan:** Move all tier/status colors into the theme palette. Reference via `theme.palette.success.light`, etc. This is a prerequisite for dark mode (2.4).

### 5.2 Date Handling
**Problem:** Dates are handled with `new Date().toISOString().slice(0, 10)` throughout the codebase. This uses UTC, which can cause off-by-one errors for users in negative timezones.
**Plan:** Create a shared `todayLocal()` utility that formats the date in the user's local timezone. Replace all `new Date().toISOString().slice(0, 10)` calls.

### 5.3 Error Boundaries
**Problem:** No React error boundaries. A runtime error in any screen crashes the entire app.
**Plan:** Add error boundaries around each screen. Show a friendly "Something went wrong" message with a retry button instead of a white screen.

### 5.4 Optimistic Update Rollback
**Problem:** Supabase saves are fire-and-forget with a toast on error. The UI already shows the updated state, so a failed save leaves the UI out of sync with the database.
**Plan:** On save failure, revert the local state to the previous value and show an error toast. This requires capturing the previous state in the setState callback.

---

## Priority Order

| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| P0 | 2.5 Navigation Badges | Small | High — users know where attention is needed |
| P0 | 2.6 Historical Date Navigation | Medium | High — users can backfill missed days |
| P0 | 3.1 Number Count-Up | Small | Medium — makes the app feel alive |
| P0 | 3.4 Score Ring Fill Animation | Small | Medium — visual polish on the most-viewed element |
| P1 | 1.1 KPI Target Editor | Medium | High — users can tune grading to their reality |
| P1 | 1.2 Week-over-Week Comparison | Small | Medium — adds context to scores |
| P1 | 2.1 Mobile Bottom Navigation | Medium | High — mobile usability |
| P1 | 2.3 Empty States with Guidance | Small | Medium — onboarding feel |
| P1 | 3.3 Achievement Celebration | Small | Medium — gamification payoff |
| P1 | 4.1 Data Export (CSV) | Small | Medium — data ownership |
| P1 | 5.2 Date Handling Fix | Small | Medium — prevents timezone bugs |
| P2 | 1.3 Predictive Score Projection | Medium | Medium — forward-looking intelligence |
| P2 | 1.4 Smarter Daily Focus | Small | Medium — better AI utilization |
| P2 | 1.5 Data Logging Streak | Small | Medium — habit reinforcement |
| P2 | 1.6 Insight Quality Expansion | Medium | Medium — deeper patterns |
| P2 | 1.7 Quiz & Punctuality Override | Medium | Medium — flexibility for edge cases |
| P2 | 2.2 Skeleton Loaders | Small | Medium — perceived performance |
| P2 | 2.7 Dashboard Chart Interactivity | Medium | Medium — data exploration |
| P2 | 3.2 Staggered List Entrance | Small | Low-Medium — visual polish |
| P2 | 3.5 Tab Transition Polish | Small | Low-Medium — smoothness |
| P2 | 3.6 Button Micro-interactions | Small | Low — detail polish |
| P2 | 3.7 Loading Shimmer | Small | Low-Medium — perceived performance |
| P2 | 4.3 Batch Actions | Small | Medium — efficiency |
| P2 | 5.3 Error Boundaries | Small | Medium — resilience |
| P2 | 5.4 Optimistic Update Rollback | Small | Medium — data integrity |
| P3 | 2.4 Dark Mode | Large | Medium — preference feature |
| P3 | 4.2 Task Templates | Medium | Low-Medium — power user feature |
| P3 | 4.4 CSAT Note Search | Small | Low — niche feature |
| P3 | 4.5 Weekly Planning Prompt | Medium | Low-Medium — proactive feature |
| P3 | 4.6 PWA Support | Medium | Medium — installability |
| P3 | 4.7 Notification Reminders | Medium | Medium — engagement |
| P3 | 5.1 Hardcoded Colors Cleanup | Large | Medium — tech debt for dark mode |
