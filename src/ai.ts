import type { DailyEntry, KPITarget, JournalEntry, Reflection, Tier, CoachProfile } from './types';
import { aggregateEntries, tierFromValue, formatTierLabel } from './grading';
import { loadAiApiKey, loadCoachProfile } from './storage';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'anthropic/claude-sonnet-4.6';

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const APP_TAG = 'productivity-grader-app';

const COACH_PERSONA = `You are a relentlessly supportive, high-standard performance coach. Your ONLY goal is to make this person successful in their role and build their long-term growth. You push them, encourage them, and keep them motivated. You celebrate real wins, call out patterns honestly, and never let them settle. Be warm but direct, concise, and concrete. When you don't know something about them yet, ask instead of guessing.`;

function buildProfileBlock(profile: CoachProfile | null): string {
  if (!profile) {
    return `You are just getting to know this person. They have not completed an onboarding profile yet, so you know very little about them personally. Ask warm, specific questions to understand: their role and what success looks like for them, what they struggle with most, what stresses them out, what motivates them, and what kind of coaching works best for them (pushing hard vs gentle encouragement). Weave these questions naturally into your replies — don't interrogate.`;
  }
  const styleNote =
    profile.coaching_style === 'push'
      ? "This person wants to be pushed: challenge them, hold them to high standards, and do not go easy when they underperform."
      : profile.coaching_style === 'encourage'
        ? 'This person responds best to encouragement: build them up, affirm progress, and nudge forward gently.'
        : 'Balance pushing and encouragement: affirm their effort, then hold them to high standards.';
  return [
    `This is the person's coaching profile — use it to personalize everything:`,
    `- Role / what they do: ${profile.role || 'not specified'}`,
    `- Their main goal right now: ${profile.main_goal || 'not specified'}`,
    `- Their bigger ambition: ${profile.big_goal || 'not specified'}`,
    `- Strengths: ${profile.strengths || 'not specified'}`,
    `- What they struggle with: ${profile.struggles || 'not specified'}`,
    `- Sources of stress: ${profile.stress_sources || 'not specified'}`,
    `- What motivates them: ${profile.motivation || 'not specified'}`,
    `- What demotivates or blocks them: ${profile.demotivators || 'not specified'}`,
    `- Coaching style they asked for: ${styleNote}`,
    profile.context ? `- Extra context they shared: ${profile.context}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function buildCoachContext(): string {
  return buildProfileBlock(loadCoachProfile());
}

async function callOpenAI(messages: OpenAIMessage[], temperature: number = 0.7): Promise<string> {
  const apiKey = loadAiApiKey();
  if (!apiKey) {
    throw new Error('No AI Engine API key configured. You can add one in the My Growth settings.');
  }

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://prod-app-5ah.pages.dev',
      'X-Title': APP_TAG,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    let message = `AI request failed (${response.status})`;
    try {
      const parsed = JSON.parse(errorBody);
      if (parsed.error?.message) message = parsed.error.message;
    } catch {
      // keep default message
    }
    throw new Error(message);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new Error('AI provider returned an unexpected response format.');
  }
  return content;
}

function buildDaySummary(entry: DailyEntry, targets: KPITarget[]): string {
  const aggregated = aggregateEntries([entry]);
  const lines: string[] = [];

  lines.push(`Date: ${entry.date}`);
  lines.push(`Chats handled: ${entry.chats_handled}`);
  lines.push(`Emails handled: ${entry.emails_handled}`);
  lines.push(`Tasks handled: ${entry.tasks_handled}`);
  lines.push(`Task hours logged: ${entry.task_hours_logged}h`);
  lines.push(`Task hours submitted: ${entry.task_hours_submitted}h`);
  lines.push(`Internal notes: ${entry.internal_notes}`);
  lines.push(`Escalations raised: ${entry.escalations_raised}`);
  lines.push(`Escalation accuracy: ${entry.escalation_accuracy_pct ?? 'N/A'}%`);
  if (entry.csat_ratings.length > 0) {
    const avg =
      entry.csat_ratings.reduce((a, b) => a + b, 0) / entry.csat_ratings.length;
    lines.push(`CSAT: avg ${avg.toFixed(2)} from ${entry.csat_ratings.length} ratings`);
  } else {
    lines.push('CSAT: no ratings');
  }

  lines.push('\nKPI Tiers:');
  for (const target of targets) {
    const value = aggregated[target.metric_key];
    const tier = tierFromValue(
      typeof value === 'number' ? value : null,
      target.thresholds,
      target.direction,
    );
    const tierLabel = tier ? formatTierLabel(tier) : 'N/A';
    const valStr = value !== null && value !== undefined ? value.toFixed(2) : 'N/A';
    lines.push(`  ${target.label}: ${valStr} -> Tier ${tierLabel} (weight ${(target.weight * 100).toFixed(0)}%)`);
  }

  return lines.join('\n');
}

function identifyWeakestMetrics(
  entry: DailyEntry,
  targets: KPITarget[],
): Array<{ label: string; metric_key: string; tier: Tier; value: number }> {
  const aggregated = aggregateEntries([entry]);
  const weak: Array<{ label: string; metric_key: string; tier: Tier; value: number }> = [];

  for (const target of targets) {
    const value = aggregated[target.metric_key];
    const tier = tierFromValue(
      typeof value === 'number' ? value : null,
      target.thresholds,
      target.direction,
    );
    if (tier !== null && value !== null && value !== undefined) {
      const tierRank: Record<Tier, number> = { S: 5, A_plus: 4, A: 3, B: 2, C: 1, PIP: 0 };
      if (tierRank[tier] <= 2) {
        weak.push({ label: target.label, metric_key: target.metric_key, tier, value });
      }
    }
  }
  return weak.sort((a, b) => {
    const rank: Record<Tier, number> = { S: 5, A_plus: 4, A: 3, B: 2, C: 1, PIP: 0 };
    return rank[a.tier] - rank[b.tier];
  });
}

export async function generateReflectionQuestions(
  entry: DailyEntry,
  targets: KPITarget[],
): Promise<string[]> {
  const daySummary = buildDaySummary(entry, targets);
  const weakest = identifyWeakestMetrics(entry, targets);
  const weakStr =
    weakest.length > 0
      ? weakest.map((w) => `${w.label} (tier ${formatTierLabel(w.tier)}, value ${w.value.toFixed(2)})`).join(', ')
      : 'All metrics performing well';

  const systemPrompt = `${COACH_PERSONA}

${buildCoachContext()}

You are generating 4-6 thoughtful reflection questions that help them reflect on their workday. Tailor questions to their actual performance data AND to their personal profile (struggles, stressors, goals). Ask about weak areas with curiosity, not judgment. Ask about strong areas to reinforce good habits. Include at least one question about their emotional state or stress. Keep questions concise, personal, and specific. Return ONLY a JSON array of question strings, no other text.`;

  const userPrompt = `Here is the agent's day summary:\n\n${daySummary}\n\nWeakest metrics: ${weakStr}\n\nGenerate 4-6 reflection questions. For weak metrics, ask what caused the low performance and what could improve it. For strong metrics, ask what they did well. Include at least one question about their emotional state or stress. Return a JSON array of strings.`;

  const result = await callOpenAI(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    0.8,
  );

  try {
    const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const questions = JSON.parse(cleaned);
    if (Array.isArray(questions) && questions.every((q) => typeof q === 'string')) {
      return questions.slice(0, 6);
    }
  } catch {
    // fall through to fallback
  }

  // Fallback questions if AI fails
  const fallback: string[] = [
    'How did you feel about your overall performance today?',
    `Your ${weakStr.split(',')[0] || 'weakest metric'} was below target. What do you think contributed to that?`,
    'What was the most challenging part of your shift today?',
    'What is one thing you did well today that you want to keep doing?',
    'What is one specific thing you want to improve tomorrow?',
  ];
  return fallback;
}

export interface AiTipResult {
  tips: Array<{ metric: string; tip: string; priority: 'high' | 'medium' | 'low' }>;
  summary: string;
}

export async function generateReflectionTips(
  entry: DailyEntry,
  targets: KPITarget[],
  questions: string[],
  answers: string[],
  score: number | null,
  grade: Tier | null,
): Promise<AiTipResult> {
  const daySummary = buildDaySummary(entry, targets);
  const weakest = identifyWeakestMetrics(entry, targets);

  const qaPairs = questions
    .map((q, i) => `Q: ${q}\nA: ${answers[i] || '(no answer)'}`)
    .join('\n\n');

  const systemPrompt = `${COACH_PERSONA}

${buildCoachContext()}

Based on their day's data and their reflection answers, generate personalized, actionable tips to help them improve. Each tip should be specific, practical, and reference both the data and what you know about them. Return a JSON object with this exact shape:
{"tips": [{"metric": "metric name", "tip": "specific actionable advice", "priority": "high"|"medium"|"low"}], "summary": "a 2-3 sentence encouraging summary of their day that pushes them forward"}
Generate 3-5 tips. Focus high priority tips on the weakest metrics. Return ONLY valid JSON, no other text.`;

  const userPrompt = `Day summary:\n${daySummary}\n\nOverall score: ${score?.toFixed(2) ?? 'N/A'}/5.00, Grade: ${grade ? formatTierLabel(grade) : 'N/A'}\n\nWeakest metrics: ${weakest.length > 0 ? weakest.map((w) => `${w.label} (${formatTierLabel(w.tier)})`).join(', ') : 'None'}\n\nReflection Q&A:\n${qaPairs}\n\nGenerate personalized tips and a summary. Return JSON.`;

  const result = await callOpenAI(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    0.7,
  );

  try {
    const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    if (parsed.tips && Array.isArray(parsed.tips) && typeof parsed.summary === 'string') {
      return {
        tips: parsed.tips.slice(0, 5),
        summary: parsed.summary,
      };
    }
  } catch {
    // fall through
  }

  return {
    tips: weakest.slice(0, 3).map((w) => ({
      metric: w.label,
      tip: `Your ${w.label} is at tier ${formatTierLabel(w.tier)}. Focus on small improvements to this metric tomorrow.`,
      priority: 'high' as const,
    })),
    summary: `You finished today at grade ${grade ? formatTierLabel(grade) : 'N/A'}. Keep reflecting and looking for small daily improvements.`,
  };
}

export async function generateJournalResponse(
  userMessage: string,
  recentJournal: JournalEntry[],
  recentEntries: DailyEntry[],
  targets: KPITarget[],
): Promise<{ response: string; category: string }> {
  const recentContext = recentJournal
    .slice(-5)
    .map((j) => `User: ${j.user_message}\nCoach: ${j.ai_response ?? ''}`)
    .join('\n\n');

  let performanceContext = '';
  if (recentEntries.length > 0) {
    const lastEntry = recentEntries[recentEntries.length - 1];
    performanceContext = buildDaySummary(lastEntry, targets);
  }

  const systemPrompt = `${COACH_PERSONA}

${buildCoachContext()}

The person is sharing their thoughts, feelings, struggles, strengths, or concerns with you. Respond with genuine empathy, encouragement, and practical insight. Push them toward their goals, connect what they say to their performance data and to their profile, and keep them motivated. If they're stressed, first acknowledge and validate, then give one concrete next step. Keep responses concise (2-4 sentences) but meaningful. Ask a thoughtful follow-up question when appropriate. Return a JSON object with this exact shape: {"response": "your coaching response", "category": "stress|strength|weakness|win|concern|general"}. Return ONLY valid JSON.`;

  const userPrompt = `Recent conversation context:\n${recentContext || '(start of conversation)'}\n\nRecent performance data:\n${performanceContext || '(no data yet)'}\n\nNew message from the agent:\n${userMessage}\n\nRespond as their coach. Return JSON with "response" and "category".`;

  const result = await callOpenAI(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    0.8,
  );

  try {
    const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    if (typeof parsed.response === 'string') {
      return {
        response: parsed.response,
        category: typeof parsed.category === 'string' ? parsed.category : 'general',
      };
    }
  } catch {
    // fall through
  }

  return {
    response: "I hear you, and thank you for sharing that with me. What feels like the most important thing for you to focus on right now?",
    category: 'general',
  };
}

export async function generateDailyFocus(
  recentEntries: DailyEntry[],
  targets: KPITarget[],
): Promise<string> {
  if (recentEntries.length === 0) {
    return 'Start logging your daily metrics to receive a personalized focus area.';
  }

  const aggregated = aggregateEntries(recentEntries);
  const weakMetrics: Array<{ label: string; metric_key: string; tier: Tier | null }> = [];

  for (const target of targets) {
    const value = aggregated[target.metric_key];
    const tier = tierFromValue(
      typeof value === 'number' ? value : null,
      target.thresholds,
      target.direction,
    );
    if (tier !== null) {
      const tierRank: Record<Tier, number> = { S: 5, A_plus: 4, A: 3, B: 2, C: 1, PIP: 0 };
      if (tierRank[tier] <= 3) {
        weakMetrics.push({ label: target.label, metric_key: target.metric_key, tier });
      }
    }
  }

  if (weakMetrics.length === 0) {
    return "You're performing well across all metrics. Keep up the consistency and look for ways to push to S-tier.";
  }

  const weakest = weakMetrics.sort((a, b) => {
    const rank: Record<Tier, number> = { S: 5, A_plus: 4, A: 3, B: 2, C: 1, PIP: 0 };
    return (rank[a.tier ?? 'PIP'] ?? 0) - (rank[b.tier ?? 'PIP'] ?? 0);
  })[0];

  try {
    const apiKey = loadAiApiKey();
    if (apiKey) {
      const recentSummary = recentEntries
        .slice(-7)
        .map((entry) => buildDaySummary(entry, targets))
        .join('\n\n');
      const response = await callOpenAI([
        {
          role: 'system',
          content: `${COACH_PERSONA}

${buildCoachContext()}

Write ONE short, sharp daily focus sentence. It should name the main area to work on today, reference the data and what you know about them, and end with a concrete next step. Make it motivating and direct. Return only plain text, no bullets, no preamble.`,
        },
        {
          role: 'user',
          content: `Recent performance data:\n${recentSummary}\n\nWeakest metric: ${weakest.label} (${weakest.metric_key})\n\nWrite one focused sentence for today.`,
        },
      ], 0.5);
      const cleaned = response.replace(/^\s*[-*]\s*/, '').trim();
      if (cleaned) return cleaned;
    }
  } catch {
    // fall back to rules
  }

  const tips: Record<string, string> = {
    productivity: `Focus on ${weakest.label}: Try increasing your chat or email volume by 10% today. Set a pace goal for each hour.`,
    csat: `Focus on ${weakest.label}: Start each interaction by acknowledging the customer's concern before offering a solution. This single habit can lift CSAT significantly.`,
    qa: `Focus on ${weakest.label}: Double-check your responses against the QA rubric before sending. Review one past failed case to identify patterns.`,
    esc_rate: `Focus on ${weakest.label}: Try to resolve more issues before escalating. Confirm you've exhausted all available resources and knowledge base articles first.`,
    esc_accuracy: `Focus on ${weakest.label}: Before escalating, verify you're routing to the correct team and including all necessary context in your escalation notes.`,
  };

  return tips[weakest.metric_key] ?? `Focus on improving your ${weakest.label} today.`;
}

export interface CoachingPlanDraft {
  focus_area: string;
  goal: string;
  why_it_matters: string;
  action_steps: string[];
  cadence_days: number;
  follow_up_prompt: string;
  source_metric: string | null;
}

export interface CoachingFollowUpResult {
  coach_response: string;
  next_follow_up_days: number;
  status: 'active' | 'paused' | 'completed';
}

export async function generateCoachingPlan(
  recentEntries: DailyEntry[],
  targets: KPITarget[],
  reflections: Record<string, Reflection>,
  journal: JournalEntry[],
): Promise<CoachingPlanDraft> {
  const weakest = identifyWeakestMetrics(
    recentEntries[recentEntries.length - 1] ?? ({ date: '', chats_handled: 0, emails_handled: 0, seek_feedback: 0, tasks_handled: 0, task_hours_logged: 0, task_hours_submitted: 0, internal_notes: 0, csat_ratings: [], escalations_raised: 0, escalation_accuracy_pct: null } as DailyEntry),
    targets,
  );
  const weakestMetric = weakest[0] ?? null;
  const recentSummary = recentEntries
    .slice(-7)
    .map((entry) => buildDaySummary(entry, targets))
    .join('\n\n');
  const reflectionCount = Object.keys(reflections).length;
  const journalCount = journal.length;

  try {
    if (loadAiApiKey()) {
      const response = await callOpenAI(
        [
          {
            role: 'system',
            content: `${COACH_PERSONA}

${buildCoachContext()}

You are a coaching planner. Based on recent performance data AND the person's profile (goals, struggles, stressors, motivation), write a concrete, personalized improvement plan as JSON with fields focus_area, goal, why_it_matters, action_steps (3-4 short items), cadence_days (1-7), follow_up_prompt, and source_metric. The plan should push them toward their stated goals and address their real struggles. Return only valid JSON.`,
          },
          {
            role: 'user',
            content: `Recent performance data:\n${recentSummary || '(no data yet)'}\n\nWeakest metric: ${weakestMetric ? `${weakestMetric.label} (${weakestMetric.metric_key})` : 'none'}\nReflections completed: ${reflectionCount}\nJournal entries: ${journalCount}\n\nCreate a realistic, personalized coaching plan that pushes this person toward their goals.`,
          },
        ],
        0.4,
      );

      const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
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
        };
      }
    }
  } catch {
    // fall back
  }

  const fallbackMetric = weakestMetric ?? {
    label: 'Consistency',
    metric_key: null,
    tier: null,
    value: 0,
  };

  return {
    focus_area: fallbackMetric.label,
    goal: `Raise ${fallbackMetric.label.toLowerCase()} with one focused habit over the next few shifts.`,
    why_it_matters: `This is the clearest lever in your recent data, and tightening it should improve your overall score.`,
    action_steps: [
      'Pick one repeatable action before each shift.',
      'Track what changed by the end of the shift.',
      'Write down one blocker and one win each day.',
    ],
    cadence_days: 2,
    follow_up_prompt: `How is ${fallbackMetric.label.toLowerCase()} going? What did you try, what worked, and where are you stuck?`,
    source_metric: fallbackMetric.metric_key,
  };
}

export async function generateCoachingFollowUp(
  plan: CoachingPlanDraft,
  recentEntries: DailyEntry[],
  userResponse: string,
): Promise<CoachingFollowUpResult> {
  const recentSummary = recentEntries
    .slice(-7)
    .map((entry) => buildDaySummary(entry, [] as KPITarget[]))
    .join('\n\n');

  try {
    if (loadAiApiKey()) {
      const response = await callOpenAI(
        [
          {
            role: 'system',
            content: `${COACH_PERSONA}

${buildCoachContext()}

Read the current plan, recent performance, and the person's response. Respond as their follow-up check-in: acknowledge what they've done, push them on gaps, reference their profile and data, and keep them motivated and accountable. Return JSON with coach_response, next_follow_up_days, and status (active, paused, completed). Keep the tone direct, warm, and useful.`,
          },
          {
            role: 'user',
            content: `Current coaching plan:\n${JSON.stringify(plan, null, 2)}\n\nRecent performance data:\n${recentSummary || '(no recent data)'}\n\nPerson's response:\n${userResponse}\n\nReturn JSON only.`,
          },
        ],
        0.5,
      );

      const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (typeof parsed.coach_response === 'string') {
        return {
          coach_response: parsed.coach_response,
          next_follow_up_days: Math.max(1, Math.min(14, Number(parsed.next_follow_up_days) || plan.cadence_days)),
          status: parsed.status === 'paused' || parsed.status === 'completed' ? parsed.status : 'active',
        };
      }
    }
  } catch {
    // fall back
  }

  return {
    coach_response: `Keep focusing on ${plan.focus_area.toLowerCase()}. Your next step is to finish the actions you set and tell me what changed.`,
    next_follow_up_days: plan.cadence_days,
    status: 'active',
  };
}

export async function generateWeeklyRecap(
  weekEntries: DailyEntry[],
  targets: KPITarget[],
  reflections: Record<string, Reflection>,
  journal: JournalEntry[],
): Promise<{ title: string; body: string }> {
  if (weekEntries.length === 0) {
    return {
      title: 'No data this week',
      body: 'Start logging your metrics to receive a weekly recap.',
    };
  }

  const { computeWeightedGrade } = await import('./grading');
  const { score, grade } = computeWeightedGrade(weekEntries, targets);
  const reflectionCount = Object.values(reflections).filter((r) =>
    weekEntries.some((e) => e.date === r.entry_date),
  ).length;
  const journalCount = journal.filter((j) =>
    weekEntries.some((e) => e.date === j.entry_date),
  ).length;

  let bestDay: { date: string; score: number } | null = null;
  let worstDay: { date: string; score: number } | null = null;

  for (const entry of weekEntries) {
    const { score: dayScore } = computeWeightedGrade([entry], targets);
    if (dayScore === null) continue;
    if (!bestDay || dayScore > bestDay.score) bestDay = { date: entry.date, score: dayScore };
    if (!worstDay || dayScore < worstDay.score) worstDay = { date: entry.date, score: dayScore };
  }

  const journalCategories = journal
    .filter((j) => weekEntries.some((e) => e.date === j.entry_date) && j.category)
    .map((j) => j.category);

  const categoryCounts: Record<string, number> = {};
  for (const cat of journalCategories) {
    if (cat) categoryCounts[cat] = (categoryCounts[cat] ?? 0) + 1;
  }
  const topCategory =
    Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'none';

  const title = `Weekly Recap: Grade ${grade ? formatTierLabel(grade) : 'N/A'}`;
  const body = [
    `Average score: ${score?.toFixed(2) ?? 'N/A'}/5.00`,
    bestDay && worstDay
      ? `Best day: ${bestDay.date} (${bestDay.score.toFixed(2)}), Worst day: ${worstDay.date} (${worstDay.score.toFixed(2)})`
      : '',
    `Reflections completed: ${reflectionCount}/${weekEntries.length}`,
    `Journal entries: ${journalCount}`,
    topCategory !== 'none' ? `Most common journal theme: ${topCategory}` : '',
    `Focus for next week: Continue building on your strengths and address your weakest metric.`,
  ]
    .filter(Boolean)
    .join('\n');

  return { title, body };
}
