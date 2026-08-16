import type { DailyEntry, KPITarget, JournalEntry, Reflection, Tier } from './types';
import { aggregateEntries, tierFromValue, formatTierLabel, computeProductivityPoints } from './grading';
import { loadAiApiKey } from './storage';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini';

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

async function callOpenAI(messages: OpenAIMessage[], temperature: number = 0.7): Promise<string> {
  const apiKey = loadAiApiKey();
  if (!apiKey) {
    throw new Error('No AI Engine API key configured. You can add one in the My Growth settings.');
  }

  const response = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model: MODEL, messages, temperature }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    let message = `OpenAI request failed (${response.status})`;
    try {
      const parsed = JSON.parse(errorBody);
      if (parsed.error?.message) message = parsed.error.message;
    } catch {
      // keep default
    }
    throw new Error(message);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new Error('OpenAI returned an unexpected response format.');
  }
  return content;
}

function buildDaySummary(entry: DailyEntry, targets: KPITarget[]): string {
  const aggregated = aggregateEntries([entry]);
  const points = computeProductivityPoints(entry);
  const lines: string[] = [];

  lines.push(`Date: ${entry.date}`);
  lines.push(`Chats handled: ${entry.chats_handled} (1 pt each)`);
  lines.push(`Emails handled: ${entry.emails_handled} (1 pt each)`);
  lines.push(`Internal notes: ${entry.internal_notes} (0.5 pt each)`);
  lines.push(`Submitted task hours: ${entry.task_hours_submitted}h (10 pts each)`);
  lines.push(`Productivity points: ${points.total.toFixed(1)}`);
  lines.push(`Escalations raised: ${entry.escalations_raised}`);
  lines.push(`Escalation accuracy: ${entry.escalation_accuracy_pct ?? 'N/A'}%`);
  if (entry.csat_ratings.length > 0) {
    const avg = entry.csat_ratings.reduce((a, b) => a + b, 0) / entry.csat_ratings.length;
    lines.push(`CSAT: avg ${avg.toFixed(2)} from ${entry.csat_ratings.length} ratings`);
  } else {
    lines.push('CSAT: no ratings');
  }

  lines.push('\nKPI Tiers:');
  for (const target of targets) {
    const value = aggregated[target.metric_key];
    const tier = tierFromValue(typeof value === 'number' ? value : null, target.thresholds, target.direction);
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
    const tier = tierFromValue(typeof value === 'number' ? value : null, target.thresholds, target.direction);
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

export async function generateReflectionQuestions(entry: DailyEntry, targets: KPITarget[]): Promise<string[]> {
  const daySummary = buildDaySummary(entry, targets);
  const weakest = identifyWeakestMetrics(entry, targets);
  const weakStr = weakest.length > 0
    ? weakest.map((w) => `${w.label} (tier ${formatTierLabel(w.tier)}, value ${w.value.toFixed(2)})`).join(', ')
    : 'All metrics performing well';

  const systemPrompt = `You are an empathetic productivity coach for a customer support agent. Your job is to generate 4-6 thoughtful reflection questions that help them reflect on their workday. Tailor questions to their actual performance data. Ask about weak areas with curiosity, not judgment. Ask about strong areas to reinforce good habits. Keep questions concise, personal, and specific to their data. Return ONLY a JSON array of question strings, no other text.`;
  const userPrompt = `Here is the agent's day summary:\n\n${daySummary}\n\nWeakest metrics: ${weakStr}\n\nGenerate 4-6 reflection questions. For weak metrics, ask what caused the low performance and what could improve it. For strong metrics, ask what they did well. Include at least one question about their emotional state or stress. Return a JSON array of strings.`;

  const result = await callOpenAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ], 0.8);

  try {
    const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const questions = JSON.parse(cleaned);
    if (Array.isArray(questions) && questions.every((q) => typeof q === 'string')) {
      return questions.slice(0, 6);
    }
  } catch {
    // fall through
  }

  return [
    'How did you feel about your overall performance today?',
    `Your ${weakStr.split(',')[0] || 'weakest metric'} was below target. What do you think contributed to that?`,
    'What was the most challenging part of your shift today?',
    'What is one thing you did well today that you want to keep doing?',
    'What is one specific thing you want to improve tomorrow?',
  ];
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
  const qaPairs = questions.map((q, i) => `Q: ${q}\nA: ${answers[i] || '(no answer)'}`).join('\n\n');

  const systemPrompt = `You are a productivity coach for a customer support agent. Based on their day's data and their reflection answers, generate personalized, actionable tips to help them improve. Each tip should be specific and practical. Return a JSON object with this exact shape:
{"tips": [{"metric": "metric name", "tip": "specific actionable advice", "priority": "high"|"medium"|"low"}], "summary": "a 2-3 sentence encouraging summary of their day"}
Generate 3-5 tips. Focus high priority tips on the weakest metrics. Return ONLY valid JSON, no other text.`;
  const userPrompt = `Day summary:\n${daySummary}\n\nOverall score: ${score?.toFixed(2) ?? 'N/A'}/5.00, Grade: ${grade ? formatTierLabel(grade) : 'N/A'}\n\nWeakest metrics: ${weakest.length > 0 ? weakest.map((w) => `${w.label} (${formatTierLabel(w.tier)})`).join(', ') : 'None'}\n\nReflection Q&A:\n${qaPairs}\n\nGenerate personalized tips and a summary. Return JSON.`;

  const result = await callOpenAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ], 0.7);

  try {
    const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    if (parsed.tips && Array.isArray(parsed.tips) && typeof parsed.summary === 'string') {
      return { tips: parsed.tips.slice(0, 5), summary: parsed.summary };
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
  const recentContext = recentJournal.slice(-5).map((j) => `User: ${j.user_message}\nCoach: ${j.ai_response ?? ''}`).join('\n\n');
  let performanceContext = '';
  if (recentEntries.length > 0) {
    performanceContext = buildDaySummary(recentEntries[recentEntries.length - 1], targets);
  }

  const systemPrompt = `You are a warm, empathetic personal growth coach for a customer support agent. They are sharing their thoughts, feelings, struggles, strengths, or concerns with you. Respond with genuine empathy, encouragement, and practical insight. If they mention something that connects to their performance data, make that connection. Keep responses concise (2-4 sentences) but meaningful. Ask a thoughtful follow-up question when appropriate. Return a JSON object with this exact shape: {"response": "your coaching response", "category": "stress|strength|weakness|win|concern|general"}. Return ONLY valid JSON.`;
  const userPrompt = `Recent conversation context:\n${recentContext || '(start of conversation)'}\n\nRecent performance data:\n${performanceContext || '(no data yet)'}\n\nNew message from the agent:\n${userMessage}\n\nRespond as their coach. Return JSON with "response" and "category".`;

  const result = await callOpenAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ], 0.8);

  try {
    const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    if (typeof parsed.response === 'string') {
      return { response: parsed.response, category: typeof parsed.category === 'string' ? parsed.category : 'general' };
    }
  } catch {
    // fall through
  }

  return {
    response: "I hear you, and thank you for sharing that with me. What feels like the most important thing for you to focus on right now?",
    category: 'general',
  };
}

export async function generateDailyFocus(recentEntries: DailyEntry[], targets: KPITarget[]): Promise<string> {
  if (recentEntries.length === 0) {
    return 'Start logging your daily metrics to receive a personalized focus area.';
  }

  const aggregated = aggregateEntries(recentEntries);
  const weakMetrics: Array<{ label: string; metric_key: string; tier: Tier | null }> = [];

  for (const target of targets) {
    const value = aggregated[target.metric_key];
    const tier = tierFromValue(typeof value === 'number' ? value : null, target.thresholds, target.direction);
    if (tier !== null) {
      const tierRank: Record<Tier, number> = { S: 5, A_plus: 4, A: 3, B: 2, C: 1, PIP: 0 };
      if (tierRank[tier] <= 3) weakMetrics.push({ label: target.label, metric_key: target.metric_key, tier });
    }
  }

  if (weakMetrics.length === 0) {
    return "You're performing well across all metrics. Keep up the consistency and look for ways to push to S-tier.";
  }

  const weakest = weakMetrics.sort((a, b) => {
    const rank: Record<Tier, number> = { S: 5, A_plus: 4, A: 3, B: 2, C: 1, PIP: 0 };
    return (rank[a.tier ?? 'PIP'] ?? 0) - (rank[b.tier ?? 'PIP'] ?? 0);
  })[0];

  const tips: Record<string, string> = {
    productivity: `Focus on ${weakest.label}: chats and emails are 1 point each, submitted task hours are 10, internal notes are 0.5. Close pending todos so those hours actually count.`,
    csat: `Focus on ${weakest.label}: Start each interaction by acknowledging the customer's concern before offering a solution.`,
    qa: `Focus on ${weakest.label}: Double-check your responses against the QA rubric before sending.`,
    esc_rate: `Focus on ${weakest.label}: Try to resolve more issues before escalating.`,
    esc_accuracy: `Focus on ${weakest.label}: Before escalating, verify the team and include UID, case IDs, and status.`,
    quiz: `Focus on ${weakest.label}: Review quiz materials for 15 minutes before your shift.`,
    punctuality: `Focus on ${weakest.label}: Set a reminder 10 minutes before your shift starts.`,
  };

  return tips[weakest.metric_key] ?? `Focus on improving your ${weakest.label} today.`;
}

export async function generateWeeklyRecap(
  weekEntries: DailyEntry[],
  targets: KPITarget[],
  reflections: Record<string, Reflection>,
  journal: JournalEntry[],
): Promise<{ title: string; body: string }> {
  if (weekEntries.length === 0) {
    return { title: 'No data this week', body: 'Start logging your metrics to receive a weekly recap.' };
  }

  const { computeWeightedGrade } = await import('./grading');
  const { score, grade } = computeWeightedGrade(weekEntries, targets);
  const reflectionCount = Object.values(reflections).filter((r) => weekEntries.some((e) => e.date === r.entry_date)).length;
  const journalCount = journal.filter((j) => weekEntries.some((e) => e.date === j.entry_date)).length;

  let bestDay: { date: string; score: number } | null = null;
  let worstDay: { date: string; score: number } | null = null;
  for (const entry of weekEntries) {
    const { score: dayScore } = computeWeightedGrade([entry], targets);
    if (dayScore === null) continue;
    if (!bestDay || dayScore > bestDay.score) bestDay = { date: entry.date, score: dayScore };
    if (!worstDay || dayScore < worstDay.score) worstDay = { date: entry.date, score: dayScore };
  }

  const title = `Weekly Recap: Grade ${grade ? formatTierLabel(grade) : 'N/A'}`;
  const body = [
    `Average score: ${score?.toFixed(2) ?? 'N/A'}/5.00`,
    bestDay && worstDay ? `Best day: ${bestDay.date} (${bestDay.score.toFixed(2)}), Worst day: ${worstDay.date} (${worstDay.score.toFixed(2)})` : '',
    `Reflections completed: ${reflectionCount}/${weekEntries.length}`,
    `Journal entries: ${journalCount}`,
    'Focus for next week: submit shift todos the same day so task hours actually count.',
  ].filter(Boolean).join('\n');

  return { title, body };
}
