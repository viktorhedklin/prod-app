with open('src/ai.ts', 'r') as f:
    code = f.read()

code = code.replace(
    "import { loadAiApiKey, loadCoachProfile } from './storage';",
    "import { loadCoachProfile } from './storage';"
)

# 1. generateDailyFocus
old_focus = """  try {
    const apiKey = loadAiApiKey();
    if (apiKey) {
      const recentSummary = recentEntries
        .slice(-7)
        .map((entry) => buildDaySummary(entry, targets))
        .join('\\n\\n');
      const response = await callOpenAI([
        {
          role: 'system',
          content: `${COACH_PERSONA}

${buildCoachContext(memories)}

Write ONE short, sharp daily focus sentence. It should name the main area to work on today, reference the data and what you know about them, and end with a concrete next step. Make it motivating and direct. Return only plain text, no bullets, no preamble.`,
        },
        {
          role: 'user',
          content: `Recent performance data:\\n${recentSummary}\\n\\nWeakest metric: ${weakest.label} (${weakest.metric_key})\\n\\nWrite one focused sentence for today.`,
        },
      ], 0.5);
      const cleaned = response.replace(/^\\s*[-*]\\s*/, '').trim();
      if (cleaned) return cleaned;
    }
  } catch {"""

new_focus = """  try {
    const recentSummary = recentEntries
      .slice(-7)
      .map((entry) => buildDaySummary(entry, targets))
      .join('\\n\\n');
    const response = await callOpenAI([
      {
        role: 'system',
        content: `${COACH_PERSONA}

${buildCoachContext(memories)}

Write ONE short, sharp daily focus sentence. It should name the main area to work on today, reference the data and what you know about them, and end with a concrete next step. Make it motivating and direct. Return only plain text, no bullets, no preamble.`,
      },
      {
        role: 'user',
        content: `Recent performance data:\\n${recentSummary}\\n\\nWeakest metric: ${weakest.label} (${weakest.metric_key})\\n\\nWrite one focused sentence for today.`,
      },
    ], 0.5);
    const cleaned = response.replace(/^\\s*[-*]\\s*/, '').trim();
    if (cleaned) return cleaned;
  } catch {"""

assert old_focus in code, "old_focus not found"
code = code.replace(old_focus, new_focus)

# 2. generateCoachingPlan
old_plan = """  try {
    if (loadAiApiKey()) {
      const response = await callOpenAI(
        [
          {
            role: 'system',
            content: `${COACH_PERSONA}

${buildCoachContext(memories)}

You are a coaching planner. Based on recent performance data AND the person's profile (goals, struggles, stressors, motivation), write a concrete, personalized improvement plan as JSON with fields focus_area, goal, why_it_matters, action_steps (3-4 short items), cadence_days (1-7), follow_up_prompt, source_metric, and memory (ONE short durable fact about this person you learned or confirmed while planning, or empty string if nothing durable). The plan should push them toward their stated goals and address their real struggles. Return only valid JSON.`,
          },
          {
            role: 'user',
            content: `Recent performance data:\\n${recentSummary || '(no data yet)'}\\n\\nWeakest metric: ${weakestMetric ? `${weakestMetric.label} (${weakestMetric.metric_key})` : 'none'}\\nReflections completed: ${reflectionCount}\\nJournal entries: ${journalCount}\\n\\nCreate a realistic, personalized coaching plan that pushes this person toward their goals.`,
          },
        ],
        0.4,
      );

      const parsed = parseJsonObject(response) as Record<string, unknown>;
      if (
        parsed &&
        typeof parsed.focus_area === 'string' &&
        typeof parsed.goal === 'string' &&
        typeof parsed.why_it_matters === 'string' &&
        Array.isArray(parsed.action_steps) &&
        parsed.action_steps.every((step: unknown) => typeof step === 'string')
      ) {
        return {
          focus_area: parsed.focus_area,
          goal: parsed.goal,
          why_it_matters: parsed.why_it_matters,
          action_steps: parsed.action_steps.slice(0, 4),
          cadence_days: Math.max(1, Math.min(7, Number(parsed.cadence_days) || 3)),
          follow_up_prompt: typeof parsed.follow_up_prompt === 'string'
            ? parsed.follow_up_prompt
            : `How is your work going on ${parsed.focus_area}? What have you done so far, and what do you need from me?`,
          source_metric: typeof parsed.source_metric === 'string' ? parsed.source_metric : weakestMetric?.metric_key ?? null,
          memory: typeof parsed.memory === 'string' && parsed.memory.trim() ? parsed.memory.trim() : undefined,
        };
      }
    }
  } catch {"""

new_plan = """  try {
    const response = await callOpenAI(
      [
        {
          role: 'system',
          content: `${COACH_PERSONA}

${buildCoachContext(memories)}

You are a coaching planner. Based on recent performance data AND the person's profile (goals, struggles, stressors, motivation), write a concrete, personalized improvement plan as JSON with fields focus_area, goal, why_it_matters, action_steps (3-4 short items), cadence_days (1-7), follow_up_prompt, source_metric, and memory (ONE short durable fact about this person you learned or confirmed while planning, or empty string if nothing durable). The plan should push them toward their stated goals and address their real struggles. Return only valid JSON.`,
        },
        {
          role: 'user',
          content: `Recent performance data:\\n${recentSummary || '(no data yet)'}\\n\\nWeakest metric: ${weakestMetric ? `${weakestMetric.label} (${weakestMetric.metric_key})` : 'none'}\\nReflections completed: ${reflectionCount}\\nJournal entries: ${journalCount}\\n\\nCreate a realistic, personalized coaching plan that pushes this person toward their goals.`,
        },
      ],
      0.4,
    );

    const parsed = parseJsonObject(response) as Record<string, unknown>;
    if (
      parsed &&
      typeof parsed.focus_area === 'string' &&
      typeof parsed.goal === 'string' &&
      typeof parsed.why_it_matters === 'string' &&
      Array.isArray(parsed.action_steps) &&
      parsed.action_steps.every((step: unknown) => typeof step === 'string')
    ) {
      return {
        focus_area: parsed.focus_area,
        goal: parsed.goal,
        why_it_matters: parsed.why_it_matters,
        action_steps: parsed.action_steps.slice(0, 4),
        cadence_days: Math.max(1, Math.min(7, Number(parsed.cadence_days) || 3)),
        follow_up_prompt: typeof parsed.follow_up_prompt === 'string'
          ? parsed.follow_up_prompt
          : `How is your work going on ${parsed.focus_area}? What have you done so far, and what do you need from me?`,
        source_metric: typeof parsed.source_metric === 'string' ? parsed.source_metric : weakestMetric?.metric_key ?? null,
        memory: typeof parsed.memory === 'string' && parsed.memory.trim() ? parsed.memory.trim() : undefined,
      };
    }
  } catch {"""

assert old_plan in code, "old_plan not found"
code = code.replace(old_plan, new_plan)

# 3. generateCoachingFollowUp
old_followup = """  try {
    if (loadAiApiKey()) {
      const response = await callOpenAI(
        [
          {
            role: 'system',
            content: `${COACH_PERSONA}

${buildCoachContext(memories)}

Read the current plan, recent performance, and the person's response. Respond as their follow-up check-in: acknowledge what they've done, push them on gaps, reference their profile and data, and keep them motivated and accountable. Return JSON with coach_response, next_follow_up_days, status (active, paused, completed), and memory (ONE short durable fact about this person you learned or confirmed from this check-in, or empty string if nothing durable). Keep the tone direct, warm, and useful.`,
          },
          {
            role: 'user',
            content: `Current coaching plan:\\n${JSON.stringify(plan, null, 2)}\\n\\nRecent performance data:\\n${recentSummary || '(no recent data)'}\\n\\nPerson's response:\\n${userResponse}\\n\\nReturn JSON only.`,
          },
        ],
        0.5,
      );

      const parsed = parseJsonObject(response) as Record<string, unknown>;
      if (typeof parsed.coach_response === 'string') {
        return {
          coach_response: parsed.coach_response,
          next_follow_up_days: Math.max(1, Math.min(14, Number(parsed.next_follow_up_days) || plan.cadence_days)),
          status: parsed.status === 'paused' || parsed.status === 'completed' ? parsed.status : 'active',
          memory: typeof parsed.memory === 'string' && parsed.memory.trim() ? parsed.memory.trim() : undefined,
        };
      }
    }
  } catch {"""

new_followup = """  try {
    const response = await callOpenAI(
      [
        {
          role: 'system',
          content: `${COACH_PERSONA}

${buildCoachContext(memories)}

Read the current plan, recent performance, and the person's response. Respond as their follow-up check-in: acknowledge what they've done, push them on gaps, reference their profile and data, and keep them motivated and accountable. Return JSON with coach_response, next_follow_up_days, status (active, paused, completed), and memory (ONE short durable fact about this person you learned or confirmed from this check-in, or empty string if nothing durable). Keep the tone direct, warm, and useful.`,
        },
        {
          role: 'user',
          content: `Current coaching plan:\\n${JSON.stringify(plan, null, 2)}\\n\\nRecent performance data:\\n${recentSummary || '(no recent data)'}\\n\\nPerson's response:\\n${userResponse}\\n\\nReturn JSON only.`,
        },
      ],
      0.5,
    );

    const parsed = parseJsonObject(response) as Record<string, unknown>;
    if (typeof parsed.coach_response === 'string') {
      return {
        coach_response: parsed.coach_response,
        next_follow_up_days: Math.max(1, Math.min(14, Number(parsed.next_follow_up_days) || plan.cadence_days)),
        status: parsed.status === 'paused' || parsed.status === 'completed' ? parsed.status : 'active',
        memory: typeof parsed.memory === 'string' && parsed.memory.trim() ? parsed.memory.trim() : undefined,
      };
    }
  } catch {"""

assert old_followup in code, "old_followup not found"
code = code.replace(old_followup, new_followup)

with open('src/ai.ts', 'w') as f:
    f.write(code)

print("Updated ai.ts successfully!")
