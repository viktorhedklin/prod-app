import type {
  DailyEntry,
  WeeklyEntry,
  TaskItem,
  EscalationItem,
  KPITarget,
  Tier,
  CoachProfile,
  CoachMemory,
  Reflection,
} from './types';
import {
  computeWeightedGrade,
  computeProductivityComposite,
  computeTaskHoursBacklog,
} from './grading';
import { buildKnowledgeContext } from './bybitKnowledge';
import {
  loadCoachProfile,
  loadCoachMemories,
  addCoachMemory,
  genId,
} from './storage';
import {
  dateFromKey,
  workDateLocal,
} from './dateUtils';

// --- xAI (Grok) API Setup ---

const MODEL = 'grok-2-latest';

import { aiFetch } from './aiTransport';
import type { OpenAIMessage } from './ai';

/**
 * Robust JSON extraction helper that extracts the first balanced JSON object.
 */
function parseJsonObject(raw: string): unknown {
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const start = cleaned.indexOf('{');
  if (start === -1) {
    throw new Error('No JSON object found in AI response.');
  }
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === '{') {
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) {
        return JSON.parse(cleaned.slice(start, i + 1));
      }
    }
  }
  throw new Error('Unbalanced JSON object in AI response.');
}

/**
 * Execute an OpenAI chat completion call with OpenRouter.
 */
export async function callOpenAI(
  messages: OpenAIMessage[],
  temperature = 0.7,
  maxTokens = 1200,
): Promise<string> {
  const response = await aiFetch({
    model: MODEL,
    messages,
    temperature,
    max_tokens: maxTokens,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    let message = `AI request failed (${response.status})`;
    try {
      const parsed = JSON.parse(errorBody);
      if (parsed.error?.message) message = parsed.error.message;
    } catch {
      // Use fallback error string
    }
    if (response.status === 402) {
      throw new Error(
        'xAI (Grok) API credits are running low. Add more credits at https://console.x.ai to keep using the AI coach.',
      );
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

// --- Data Structures & Interfaces for AI Agent ---

export interface PatternResult {
  id: string;
  title: string;
  description: string;
  category: 'volume' | 'csat' | 'tasks' | 'escalations' | 'day_of_week' | 'productivity';
  confidence: number; // 0.0 to 1.0
  impact: 'positive' | 'negative' | 'neutral';
  recommendation?: string;
}

export interface MetricForecastBreakdown {
  metric_key: string;
  label: string;
  currentValue: number;
  projectedValue: number;
  targetTier: Tier | null;
}

export interface WeeklyForecast {
  predictedScore: number | null;
  predictedGrade: Tier | null;
  predictedTaskHoursLogged: number;
  predictedTaskHoursSubmitted: number;
  predictedChats: number;
  predictedEmails: number;
  predictedTasks: number;
  predictedEscalations: number;
  predictedCsat: number | null;
  daysCompleted: number;
  daysRemaining: number;
  confidence: 'high' | 'medium' | 'low';
  summary: string;
  breakdown: MetricForecastBreakdown[];
}

export interface AdaptiveRecommendation {
  id: string;
  title: string;
  action: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  category: 'tasks' | 'hours' | 'csat' | 'escalations' | 'productivity' | 'general';
  metric: string;
  impact: string;
  adaptedBasedOnHistory: boolean;
  historyNote?: string;
}

export interface ProactiveInsight {
  id: string;
  insight_type: 'pattern' | 'weekly_recap' | 'achievement_unlocked';
  title: string;
  body: string;
  severity: 'info' | 'positive' | 'warning';
  triggerReason: string;
  actionableStep?: string;
  dismissed: boolean;
  created_at: string;
}

export interface AgentContextData {
  entries?: DailyEntry[] | Record<string, DailyEntry>;
  weeklyEntries?: Record<string, WeeklyEntry>;
  targets?: KPITarget[];
  tasks?: TaskItem[];
  escalations?: EscalationItem[];
  reflections?: Record<string, Reflection>;
  profile?: CoachProfile | null;
  memories?: CoachMemory[];
  forecast?: WeeklyForecast;
}

export interface FeedbackAnalysis {
  actedCount: number;
  ignoredCount: number;
  responsivenessByCategory: Record<
    string,
    { acted: number; ignored: number; score: number }
  >;
  preferredCategories: string[];
  ignoredCategories: string[];
  summary: string;
}

// --- Helper Functions ---

function toEntriesArray(
  input?: DailyEntry[] | Record<string, DailyEntry>,
): DailyEntry[] {
  if (!input) return [];
  if (Array.isArray(input)) return [...input];
  return Object.values(input);
}

function calculateLinearRegression(
  values: number[],
): { slope: number; intercept: number } {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] ?? 0 };

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < n; i++) {
    const x = i + 1;
    const y = values[i];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }

  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) {
    return { slope: 0, intercept: sumY / n };
  }

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

// ============================================================================
// 1. PATTERN RECOGNITION
// ============================================================================

/**
 * Analyzes daily entries, tasks, and targets to discover behavioral and statistical patterns.
 */
export async function recognizePatterns(
  entriesInput?: DailyEntry[] | Record<string, DailyEntry>,
  tasks: TaskItem[] = [],
  _targets: KPITarget[] = [],
): Promise<PatternResult[]> {
  try {
    const entries = toEntriesArray(entriesInput).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
    const patterns: PatternResult[] = [];

    if (entries.length === 0) return patterns;

    // Pattern 1: CSAT vs Chat/Email Volume Correlation
    const csatVolumeDays = entries.filter(
      (e) =>
        e.csat_ratings.length > 0 && e.chats_handled + e.emails_handled > 0,
    );
    if (csatVolumeDays.length >= 3) {
      const avgVol =
        csatVolumeDays.reduce(
          (s, e) => s + e.chats_handled + e.emails_handled,
          0,
        ) / csatVolumeDays.length;
      const highVolDays = csatVolumeDays.filter(
        (e) => e.chats_handled + e.emails_handled >= avgVol * 1.25,
      );

      if (highVolDays.length >= 2) {
        const avgCsatHigh =
          highVolDays.reduce((s, e) => {
            const avg =
              e.csat_ratings.reduce((a, b) => a + b, 0) / e.csat_ratings.length;
            return s + avg;
          }, 0) / highVolDays.length;

        const avgCsatOverall =
          csatVolumeDays.reduce((s, e) => {
            const avg =
              e.csat_ratings.reduce((a, b) => a + b, 0) / e.csat_ratings.length;
            return s + avg;
          }, 0) / csatVolumeDays.length;

        if (avgCsatHigh < avgCsatOverall - 0.15) {
          patterns.push({
            id: genId(),
            title: 'CSAT drops on high volume days',
            description: `Your average CSAT drops to ${avgCsatHigh.toFixed(2)} on days with high chat/email volume (above ${Math.round(avgVol)} items), compared to ${avgCsatOverall.toFixed(2)} overall.`,
            category: 'csat',
            confidence: 0.85,
            impact: 'negative',
            recommendation:
              'Take brief 2-minute breathers during high volume spikes to maintain answer quality.',
          });
        }
      }
    }

    // Pattern 2: Task Submission / Completion by Day of Week
    const daysOfWeekNames = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    const taskSubmissionsByDay: Record<number, number> = {};
    const countByDay: Record<number, number> = {};

    for (const entry of entries) {
      const dow = dateFromKey(entry.date).getDay();
      taskSubmissionsByDay[dow] =
        (taskSubmissionsByDay[dow] || 0) + entry.tasks_handled;
      countByDay[dow] = (countByDay[dow] || 0) + 1;
    }

    const activeDows = Object.keys(countByDay).map(Number);
    if (activeDows.length >= 3) {
      let maxDow = activeDows[0];
      let maxAvgTasks = 0;
      let totalTasksSum = 0;
      let totalDaysSum = 0;

      for (const dow of activeDows) {
        const avg = taskSubmissionsByDay[dow] / countByDay[dow];
        totalTasksSum += taskSubmissionsByDay[dow];
        totalDaysSum += countByDay[dow];
        if (avg > maxAvgTasks) {
          maxAvgTasks = avg;
          maxDow = dow;
        }
      }

      const overallAvgTasks = totalDaysSum > 0 ? totalTasksSum / totalDaysSum : 0;
      if (maxAvgTasks >= overallAvgTasks * 1.35 && maxAvgTasks > 1) {
        const dayName = daysOfWeekNames[maxDow];
        patterns.push({
          id: genId(),
          title: `Peak task submission day: ${dayName}s`,
          description: `You submit significantly more tasks on ${dayName}s (averaging ${maxAvgTasks.toFixed(1)} tasks vs ${overallAvgTasks.toFixed(1)} overall).`,
          category: 'day_of_week',
          confidence: 0.8,
          impact: 'positive',
          recommendation: `Capitalize on your ${dayName} momentum by scheduling your highest-complexity tasks then.`,
        });
      }
    }

    // Pattern 3: Task Submission Hours Lag (Logged vs Submitted)
    const backlogInfo = computeTaskHoursBacklog(entries);
    if (backlogInfo.backlog > 4.0) {
      patterns.push({
        id: genId(),
        title: 'Task submission backlog accumulating',
        description: `You have logged ${backlogInfo.logged.toFixed(1)} task hours but only submitted ${backlogInfo.submitted.toFixed(1)} hours (backlog of ${backlogInfo.backlog.toFixed(1)}h).`,
        category: 'tasks',
        confidence: 0.9,
        impact: 'negative',
        recommendation:
          'Batch-submit your logged pending tasks at the end of each shift to ensure credit.',
      });
    }

    // Pattern 4: Internal Notes Correlation with High Productivity
    if (entries.length >= 5) {
      const highNoteDays = entries.filter((e) => e.internal_notes >= 3);
      const lowNoteDays = entries.filter((e) => e.internal_notes < 3);

      if (highNoteDays.length >= 2 && lowNoteDays.length >= 2) {
        const avgHighProd =
          highNoteDays.reduce((s, e) => s + computeProductivityComposite([e]), 0) /
          highNoteDays.length;
        const avgLowProd =
          lowNoteDays.reduce((s, e) => s + computeProductivityComposite([e]), 0) /
          lowNoteDays.length;

        if (avgHighProd >= avgLowProd * 1.2) {
          patterns.push({
            id: genId(),
            title: 'Internal notes boost overall output',
            description: `On days when you log 3+ internal notes, your total productivity score averages ${avgHighProd.toFixed(1)} vs ${avgLowProd.toFixed(1)} on lower documentation days.`,
            category: 'productivity',
            confidence: 0.78,
            impact: 'positive',
            recommendation:
              'Maintain detailed documentation; it helps structure your shift and drive higher throughput.',
          });
        }
      }
    }

    // Pattern 5: Escalation Accuracy Pattern
    const escDays = entries.filter((e) => e.escalations_raised > 0);
    if (escDays.length >= 3) {
      const avgAcc =
        escDays.reduce((s, e) => s + (e.escalation_accuracy_pct ?? 0), 0) /
        escDays.length;
      if (avgAcc < 75) {
        patterns.push({
          id: genId(),
          title: 'Escalation accuracy needs attention',
          description: `Your average escalation accuracy is ${avgAcc.toFixed(1)}% across ${escDays.length} escalation days.`,
          category: 'escalations',
          confidence: 0.82,
          impact: 'negative',
          recommendation:
            'Review escalation guidelines or check with senior peers before submitting edge-case escalations.',
        });
      }
    }

    // Optional LLM Pattern Augmentation if API key is present
    if (patterns.length < 3 && entries.length >= 3) {
      try {
        const prompt = `Analyze these productivity entries and tasks to find 1 subtle behavioral pattern:
Entries: ${JSON.stringify(
          entries.slice(-7).map((e) => ({
            date: e.date,
            chats: e.chats_handled,
            emails: e.emails_handled,
            tasks: e.tasks_handled,
            taskHours: e.task_hours_submitted,
            csat:
              e.csat_ratings.length > 0
                ? e.csat_ratings.reduce((a, b) => a + b, 0) / e.csat_ratings.length
                : null,
          })),
        )}
Pending Tasks: ${tasks.filter((t) => t.status === 'pending').length}
Return strictly JSON object: {"title": string, "description": string, "recommendation": string, "impact": "positive"|"negative"|"neutral"}`;

        const aiResponse = await callOpenAI(
          [{ role: 'user', content: prompt }],
          0.3,
          400,
        );
        const parsed = parseJsonObject(aiResponse) as Record<string, string>;
        if (parsed.title && parsed.description) {
          patterns.push({
            id: genId(),
            title: parsed.title,
            description: parsed.description,
            category: 'volume',
            confidence: 0.75,
            impact: (parsed.impact as 'positive' | 'negative' | 'neutral') || 'neutral',
            recommendation: parsed.recommendation,
          });
        }
      } catch {
        // Fallback smoothly to statistical patterns
      }
    }

    return patterns;
  } catch (error) {
    console.error('Pattern recognition error:', error);
    return [];
  }
}

// ============================================================================
// 2. PREDICTIVE FORECASTING
// ============================================================================

/**
 * Predicts where the user will end up by end of week using simple linear regression & historical averages.
 */
export async function predictEndOfWeek(
  currentWeekEntriesInput?: DailyEntry[] | Record<string, DailyEntry>,
  historicalEntriesInput?: DailyEntry[] | Record<string, DailyEntry>,
  targets: KPITarget[] = [],
  _weeklyEntries: Record<string, WeeklyEntry> = {},
): Promise<WeeklyForecast> {
  try {
    const currentWeekEntries = toEntriesArray(currentWeekEntriesInput).sort(
      (a, b) => a.date.localeCompare(b.date),
    );
    const historicalEntries = toEntriesArray(historicalEntriesInput);

    const daysCompleted = currentWeekEntries.length;
    const daysInWeek = 7;
    const daysRemaining = Math.max(0, daysInWeek - daysCompleted);

    // Sum current week progress
    let sumChats = 0;
    let sumEmails = 0;
    let sumTasks = 0;
    let sumTaskHoursLogged = 0;
    let sumTaskHoursSubmitted = 0;
    let sumInternalNotes = 0;
    let sumEscalations = 0;
    const allCsatRatings: number[] = [];

    for (const entry of currentWeekEntries) {
      sumChats += entry.chats_handled;
      sumEmails += entry.emails_handled;
      sumTasks += entry.tasks_handled;
      sumTaskHoursLogged += entry.task_hours_logged;
      sumTaskHoursSubmitted += entry.task_hours_submitted;
      sumInternalNotes += entry.internal_notes;
      sumEscalations += entry.escalations_raised;
      if (entry.csat_ratings && entry.csat_ratings.length > 0) {
        allCsatRatings.push(...entry.csat_ratings);
      }
    }

    // Historical daily averages (fallback if regression has few data points)
    const histCount = Math.max(1, historicalEntries.length);
    const histAvgChats =
      historicalEntries.reduce((s, e) => s + e.chats_handled, 0) / histCount;
    const histAvgEmails =
      historicalEntries.reduce((s, e) => s + e.emails_handled, 0) / histCount;
    const histAvgTasks =
      historicalEntries.reduce((s, e) => s + e.tasks_handled, 0) / histCount;
    const histAvgHoursLogged =
      historicalEntries.reduce((s, e) => s + e.task_hours_logged, 0) / histCount;
    const histAvgHoursSubmitted =
      historicalEntries.reduce((s, e) => s + e.task_hours_submitted, 0) /
      histCount;
    const histAvgNotes =
      historicalEntries.reduce((s, e) => s + e.internal_notes, 0) / histCount;
    const histAvgEscalations =
      historicalEntries.reduce((s, e) => s + e.escalations_raised, 0) / histCount;

    // Linear regression projection for remaining days
    const projectMetric = (
      currentSeries: number[],
      histAvg: number,
    ): number => {
      if (daysRemaining === 0) return 0;
      if (currentSeries.length >= 2) {
        const { slope, intercept } = calculateLinearRegression(currentSeries);
        let projSum = 0;
        for (let i = 1; i <= daysRemaining; i++) {
          const dayIdx = daysCompleted + i;
          const regVal = Math.max(0, slope * dayIdx + intercept);
          // Blend 60% linear trend + 40% historical average
          const blended = 0.6 * regVal + 0.4 * histAvg;
          projSum += blended;
        }
        return projSum;
      }
      return histAvg * daysRemaining;
    };

    const projectedRemainingChats = projectMetric(
      currentWeekEntries.map((e) => e.chats_handled),
      histAvgChats,
    );
    const projectedRemainingEmails = projectMetric(
      currentWeekEntries.map((e) => e.emails_handled),
      histAvgEmails,
    );
    const projectedRemainingTasks = projectMetric(
      currentWeekEntries.map((e) => e.tasks_handled),
      histAvgTasks,
    );
    const projectedRemainingHoursLogged = projectMetric(
      currentWeekEntries.map((e) => e.task_hours_logged),
      histAvgHoursLogged,
    );
    const projectedRemainingHoursSubmitted = projectMetric(
      currentWeekEntries.map((e) => e.task_hours_submitted),
      histAvgHoursSubmitted,
    );
    const projectedRemainingNotes = projectMetric(
      currentWeekEntries.map((e) => e.internal_notes),
      histAvgNotes,
    );
    const projectedRemainingEscalations = projectMetric(
      currentWeekEntries.map((e) => e.escalations_raised),
      histAvgEscalations,
    );

    const predictedChats = Math.round(sumChats + projectedRemainingChats);
    const predictedEmails = Math.round(sumEmails + projectedRemainingEmails);
    const predictedTasks = Math.round(sumTasks + projectedRemainingTasks);
    const predictedTaskHoursLogged = Number(
      (sumTaskHoursLogged + projectedRemainingHoursLogged).toFixed(1),
    );
    const predictedTaskHoursSubmitted = Number(
      (sumTaskHoursSubmitted + projectedRemainingHoursSubmitted).toFixed(1),
    );
    const predictedNotes = Math.round(
      sumInternalNotes + projectedRemainingNotes,
    );
    const predictedEscalations = Math.round(
      sumEscalations + projectedRemainingEscalations,
    );

    const predictedCsat =
      allCsatRatings.length > 0
        ? Number(
            (
              allCsatRatings.reduce((a, b) => a + b, 0) / allCsatRatings.length
            ).toFixed(2),
          )
        : null;

    // Build synthetic full week daily entry array to run computeWeightedGrade
    const projectedDailyEntry: DailyEntry = {
      date: 'projected_week_summary',
      chats_handled: predictedChats,
      emails_handled: predictedEmails,
      tasks_handled: predictedTasks,
      task_hours_logged: predictedTaskHoursLogged,
      task_hours_submitted: predictedTaskHoursSubmitted,
      internal_notes: predictedNotes,
      csat_ratings: allCsatRatings,
      escalations_raised: predictedEscalations,
      escalation_accuracy_pct: 100,
      seek_feedback: 0,
    };

    const gradeResult = computeWeightedGrade([projectedDailyEntry], targets);

    const confidence: 'high' | 'medium' | 'low' =
      daysCompleted >= 4
        ? 'high'
        : daysCompleted >= 2 || historicalEntries.length >= 7
          ? 'medium'
          : 'low';

    const predictedGradeStr = gradeResult.grade ?? 'A';

    const breakdown: MetricForecastBreakdown[] = (
      gradeResult.breakdown || []
    ).map((b) => ({
      metric_key: b.metric_key,
      label: b.label,
      currentValue: Number((b.aggregated_value ?? 0).toFixed(1)),
      projectedValue: Number((b.aggregated_value ?? 0).toFixed(1)),
      targetTier: b.tier,
    }));

    const summary = `Based on your ${daysCompleted}-day pace this week and historical trends, you are projected to finish the week with ~${predictedTaskHoursSubmitted}h submitted task hours, ${predictedChats + predictedEmails} ticket interactions, and a Tier ${predictedGradeStr} overall performance.`;

    return {
      predictedScore:
        gradeResult.score !== null ? Number(gradeResult.score.toFixed(2)) : null,
      predictedGrade: gradeResult.grade,
      predictedTaskHoursLogged,
      predictedTaskHoursSubmitted,
      predictedChats,
      predictedEmails,
      predictedTasks,
      predictedEscalations,
      predictedCsat,
      daysCompleted,
      daysRemaining,
      confidence,
      summary,
      breakdown,
    };
  } catch (error) {
    console.error('Predictive forecasting error:', error);
    return {
      predictedScore: null,
      predictedGrade: null,
      predictedTaskHoursLogged: 0,
      predictedTaskHoursSubmitted: 0,
      predictedChats: 0,
      predictedEmails: 0,
      predictedTasks: 0,
      predictedEscalations: 0,
      predictedCsat: null,
      daysCompleted: 0,
      daysRemaining: 7,
      confidence: 'low',
      summary: 'Insufficient data to compute forecast.',
      breakdown: [],
    };
  }
}

// ============================================================================
// 3. ADAPTIVE RECOMMENDATIONS
// ============================================================================

/**
 * Generates smart, contextual action items that adapt based on past user behavior.
 */
export async function generateAdaptiveRecommendations(
  entriesInput?: DailyEntry[] | Record<string, DailyEntry>,
  tasks: TaskItem[] = [],
  targets: KPITarget[] = [],
  forecast?: WeeklyForecast,
): Promise<AdaptiveRecommendation[]> {
  try {
    const entries = toEntriesArray(entriesInput);
    const feedbackAnalysis = await analyzeFeedbackHistory();
    const recommendations: AdaptiveRecommendation[] = [];

    // 1. Check Task Hours / Catch-up pace
    const recentWeekEntries = entries.slice(-7);
    const submittedHours = recentWeekEntries.reduce(
      (s, e) => s + e.task_hours_submitted,
      0,
    );
    const targetHoursPace = 15.0; // Benchmark weekly task hours target

    if (submittedHours < targetHoursPace) {
      const deficit = targetHoursPace - submittedHours;
      const catchUpAmount = Math.min(deficit, 2.5).toFixed(1);
      recommendations.push({
        id: genId(),
        title: 'Catch up on task submission hours',
        action: `Log and submit ${catchUpAmount}h of task work today to stay on track.`,
        reason: `You're ${deficit.toFixed(1)} hours behind your target pace for the week.`,
        priority: 'high',
        category: 'hours',
        metric: 'task_hours_submitted',
        impact: `Will raise your weekly task hours metric closer to Tier A target.`,
        adaptedBasedOnHistory: false,
      });
    }

    // 2. Pending Tasks Submission Action
    const pendingTasks = tasks.filter((t) => t.status === 'pending');
    if (pendingTasks.length > 0) {
      const pendingHours = pendingTasks.reduce(
        (s, t) => s + (t.task_hours || 0),
        0,
      );
      recommendations.push({
        id: genId(),
        title: 'Submit pending completed tasks',
        action: `Submit your ${pendingTasks.length} pending task(s) (${pendingHours.toFixed(1)}h total) before shift end.`,
        reason: `Pending tasks do not count towards your submitted metrics until formally submitted.`,
        priority: 'high',
        category: 'tasks',
        metric: 'tasks_handled',
        impact: `Instantly adds ${pendingHours.toFixed(1)} hours to your submitted total.`,
        adaptedBasedOnHistory: false,
      });
    }

    // 3. CSAT Feedback Prompt
    const csatTarget =
      targets.find((t) => t.metric_key === 'csat')?.thresholds.A ?? 4.5;
    const csatDays = entries.filter((e) => e.csat_ratings.length > 0);
    const currentCsat =
      csatDays.length > 0
        ? csatDays.reduce((s, e) => {
            const avg =
              e.csat_ratings.reduce((a, b) => a + b, 0) / e.csat_ratings.length;
            return s + avg;
          }, 0) / csatDays.length
        : 5.0;

    if (currentCsat < csatTarget) {
      recommendations.push({
        id: genId(),
        title: 'Proactively request CSAT feedback',
        action: 'Send CSAT feedback links on 2 resolved high-satisfaction cases today.',
        reason: `Your current CSAT is ${currentCsat.toFixed(2)}, below your Tier A target of ${csatTarget}.`,
        priority: 'medium',
        category: 'csat',
        metric: 'csat',
        impact: 'Adding 5-star ratings will boost your CSAT average.',
        adaptedBasedOnHistory: false,
      });
    }

    // 4. Forecast-driven Action Item
    if (
      forecast &&
      forecast.predictedGrade &&
      ['B', 'C', 'PIP'].includes(forecast.predictedGrade)
    ) {
      recommendations.push({
        id: genId(),
        title: 'Forecast Alert: High impact push required',
        action: 'Handle 5 extra chat/email cases and submit 1 task today.',
        reason: `Forecast projects a end-of-week grade of Tier ${forecast.predictedGrade}.`,
        priority: 'high',
        category: 'productivity',
        metric: 'productivity',
        impact: 'Will elevate overall composite score above the Tier B threshold.',
        adaptedBasedOnHistory: false,
      });
    }

    // --- APPLY SELF-IMPROVEMENT LOOP ADAPTATION ---
    // Adjust priorities and messaging based on historical feedback history
    return recommendations.map((rec) => {
      const catStats = feedbackAnalysis.responsivenessByCategory[rec.category];
      if (!catStats) return rec;

      // If user consistently acts on items in this category -> Boost priority
      if (catStats.acted >= 2 && catStats.score >= 0.6) {
        return {
          ...rec,
          priority: 'high',
          adaptedBasedOnHistory: true,
          historyNote: `Priority boosted because you frequently act on ${rec.category} recommendations (${catStats.acted} completed).`,
        };
      }

      // If user consistently ignores or dismisses items in this category -> Soften priority
      if (catStats.ignored >= 2 && catStats.score < 0.3) {
        return {
          ...rec,
          priority: 'low',
          action: `Quick check: ${rec.action}`,
          adaptedBasedOnHistory: true,
          historyNote: `Adjusted to low priority based on your past preferences for ${rec.category} tasks.`,
        };
      }

      return rec;
    });
  } catch (error) {
    console.error('Adaptive recommendations error:', error);
    return [];
  }
}

// ============================================================================
// 4. CONVERSATIONAL AI
// ============================================================================

const AGENT_SYSTEM_PROMPT = `You are an intelligent, proactive AI Productivity Agent & Performance Coach.
You analyze productivity metrics, tasks, escalations, and historical trends to give hyper-personalized, data-driven advice.
Your tone is supportive, direct, concise, and actionable.
Always ground your answers in the user's specific data context (chats, emails, tasks, CSAT, forecast, and goals).
Never give generic corporate advice — be precise with numbers and step-by-step guidance.
You also have researched knowledge about Bybit EU and Bybit.com products (help center, cards, Earn, fees, legal). When the user asks about Bybit products, policies, or customer scenarios, use that knowledge to give accurate, specific answers grounded in official sources.`;

function buildAgentContextBlock(context: AgentContextData): string {
  const profile = context.profile || loadCoachProfile();
  const entries = toEntriesArray(context.entries);
  const tasks = context.tasks || [];
  const escalations = context.escalations || [];
  const forecast = context.forecast;

  const lines: string[] = [];

  // Coach Profile Block
  lines.push('--- USER PROFILE ---');
  if (profile) {
    lines.push(`Role: ${profile.role || 'Not set'}`);
    lines.push(`Main Goal: ${profile.main_goal || 'Not set'}`);
    lines.push(`Big Ambition: ${profile.big_goal || 'Not set'}`);
    lines.push(`Strengths: ${profile.strengths || 'Not set'}`);
    lines.push(`Struggles: ${profile.struggles || 'Not set'}`);
    lines.push(`Coaching Style: ${profile.coaching_style || 'balanced'}`);
  } else {
    lines.push('No onboarding profile set.');
  }

  // Recent Performance Block
  lines.push('\n--- RECENT PERFORMANCE (LAST 7 DAYS) ---');
  if (entries.length > 0) {
    const recent = entries.slice(-7);
    const totalChats = recent.reduce((s, e) => s + e.chats_handled, 0);
    const totalEmails = recent.reduce((s, e) => s + e.emails_handled, 0);
    const totalTasks = recent.reduce((s, e) => s + e.tasks_handled, 0);
    const totalHoursLogged = recent.reduce((s, e) => s + e.task_hours_logged, 0);
    const totalHoursSubmitted = recent.reduce(
      (s, e) => s + e.task_hours_submitted,
      0,
    );
    const csatRatings = recent.flatMap((e) => e.csat_ratings);
    const avgCsat =
      csatRatings.length > 0
        ? (csatRatings.reduce((a, b) => a + b, 0) / csatRatings.length).toFixed(2)
        : 'N/A';

    lines.push(`Days Logged: ${recent.length}`);
    lines.push(`Chats Handled: ${totalChats}`);
    lines.push(`Emails Handled: ${totalEmails}`);
    lines.push(`Tasks Handled: ${totalTasks}`);
    lines.push(
      `Task Hours: ${totalHoursSubmitted.toFixed(1)}h submitted / ${totalHoursLogged.toFixed(1)}h logged`,
    );
    lines.push(`Average CSAT: ${avgCsat}`);
  } else {
    lines.push('No daily entries recorded yet.');
  }

  // Tasks & Escalations State
  const pendingTasks = tasks.filter((t) => t.status === 'pending');
  const openEsc = escalations.filter((e) => e.status !== 'resolved');
  lines.push('\n--- ACTIVE WORKITEMS ---');
  lines.push(`Pending Tasks: ${pendingTasks.length}`);
  lines.push(`Open Escalations: ${openEsc.length}`);

  // Forecast Block
  if (forecast) {
    lines.push('\n--- WEEKLY FORECAST ---');
    lines.push(
      `Predicted End-of-Week Grade: Tier ${forecast.predictedGrade || 'N/A'} (Score: ${forecast.predictedScore ?? 'N/A'})`,
    );
    lines.push(`Predicted Task Hours: ${forecast.predictedTaskHoursSubmitted}h`);
    lines.push(`Forecast Summary: ${forecast.summary}`);
  }

  // Coach Memories
  if (context.memories && context.memories.length > 0) {
    lines.push('\n--- COACH MEMORIES & FEEDBACK ---');
    context.memories.slice(0, 10).forEach((m) => lines.push(`- ${m.content}`));
  }

  return lines.join('\n');
}

/**
 * Conversational AI chat handler that answers questions with full data context.
 */
export async function chatWithAgent(
  userQuestion: string,
  chatHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [],
  context: AgentContextData = {},
): Promise<string> {
  try {
    const contextBlock = buildAgentContextBlock(context);
    const knowledgeBlock = buildKnowledgeContext(userQuestion);
    const messages: OpenAIMessage[] = [
      {
        role: 'system',
        content: `${AGENT_SYSTEM_PROMPT}\n\n${contextBlock}${knowledgeBlock ? `\n\n--- BYBIT PRODUCT KNOWLEDGE ---\n${knowledgeBlock}` : ''}`,
      },
      ...chatHistory.slice(-6).map((h) => ({
        role: h.role,
        content: h.content,
      })),
      { role: 'user', content: userQuestion },
    ];

    return await callOpenAI(messages, 0.7, 1000);
  } catch (error) {
    console.error('Chat with agent error:', error);
    if (error instanceof Error) {
      return `I encountered an issue answering your question: ${error.message}`;
    }
    return 'I encountered an unexpected error. Please check your AI API key settings.';
  }
}

// ============================================================================
// 5. PROACTIVE INSIGHTS
// ============================================================================

/**
 * Auto-generates proactive insights from real-time data shifts and trend detections.
 */
export async function generateProactiveInsights(
  entriesInput?: DailyEntry[] | Record<string, DailyEntry>,
  targets: KPITarget[] = [],
  _tasks: TaskItem[] = [],
  escalations: EscalationItem[] = [],
): Promise<ProactiveInsight[]> {
  try {
    const entries = toEntriesArray(entriesInput).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
    const insights: ProactiveInsight[] = [];
    const today = workDateLocal();

    if (entries.length === 0) return insights;

    // Trigger 1: Metric Trending Down (3-day declining trend)
    if (entries.length >= 3) {
      const last3 = entries.slice(-3);
      const score1 = computeProductivityComposite([last3[0]]);
      const score2 = computeProductivityComposite([last3[1]]);
      const score3 = computeProductivityComposite([last3[2]]);

      if (score1 > score2 && score2 > score3 && score1 - score3 >= 5) {
        insights.push({
          id: genId(),
          insight_type: 'pattern',
          title: 'Productivity output declining over 3 days',
          body: `Your composite output score decreased from ${score1.toFixed(1)} to ${score3.toFixed(1)} over the last 3 days.`,
          severity: 'warning',
          triggerReason: '3 consecutive days of declining productivity score',
          actionableStep:
            'Focus on completing 1 high-value task or review your workload pace today.',
          dismissed: false,
          created_at: new Date().toISOString(),
        });
      }
    }

    // Trigger 2: Exceeding 14-Day Average
    if (entries.length >= 5) {
      const recent = entries.slice(-14);
      const avgHours =
        recent.reduce((s, e) => s + e.task_hours_submitted, 0) / recent.length;
      const latestEntry = entries[entries.length - 1];

      if (latestEntry && latestEntry.task_hours_submitted >= avgHours * 1.35 && latestEntry.task_hours_submitted > 2.0) {
        insights.push({
          id: genId(),
          insight_type: 'achievement_unlocked',
          title: 'Exceeding average output!',
          body: `On ${latestEntry.date}, you submitted ${latestEntry.task_hours_submitted.toFixed(1)} task hours — 35%+ above your recent average of ${avgHours.toFixed(1)}h!`,
          severity: 'positive',
          triggerReason: 'Submitted task hours exceeded 1.35x 14-day average',
          actionableStep: 'Keep up this momentum or log your effective strategy in your reflection!',
          dismissed: false,
          created_at: new Date().toISOString(),
        });
      }
    }

    // Trigger 3: Unsubmitted Task Backlog Alert
    const backlog = computeTaskHoursBacklog(entries);
    if (backlog.backlog >= 5.0) {
      insights.push({
        id: genId(),
        insight_type: 'pattern',
        title: 'Significant task hours backlog',
        body: `You have ${backlog.backlog.toFixed(1)} unsubmitted task hours logged across your entries.`,
        severity: 'warning',
        triggerReason: 'Task hours backlog exceeded 5.0 hours',
        actionableStep: 'Submit your completed tasks today to claim grade credit.',
        dismissed: false,
        created_at: new Date().toISOString(),
      });
    }

    // Trigger 4: Escalations Spike
    const openEsc = escalations.filter((e) => e.status !== 'resolved');
    if (openEsc.length >= 3) {
      insights.push({
        id: genId(),
        insight_type: 'pattern',
        title: 'Multiple open escalations pending',
        body: `You currently have ${openEsc.length} open/unresolved escalations waiting for resolution.`,
        severity: 'warning',
        triggerReason: 'Open escalations count >= 3',
        actionableStep:
          'Ping escalation leads or update case notes to get them resolved.',
        dismissed: false,
        created_at: new Date().toISOString(),
      });
    }

    // Trigger 5: Streak at Risk
    if (entries.length >= 3) {
      const prevEntries = entries.slice(0, -1);
      const targetGrade = targets.length > 0 ? targets : [];
      const pastGrades = prevEntries
        .slice(-3)
        .map((e) => computeWeightedGrade([e], targetGrade).grade);

      const isHighStreak = pastGrades.every((g) => g === 'S' || g === 'A_plus' || g === 'A');
      const todayEntry = entries.find((e) => e.date === today);

      if (isHighStreak && (!todayEntry || computeProductivityComposite([todayEntry]) < 10)) {
        insights.push({
          id: genId(),
          insight_type: 'pattern',
          title: '3-Day Tier A Streak at Risk',
          body: `You have achieved Tier A or higher for 3 straight days! Log today's work to protect your streak.`,
          severity: 'info',
          triggerReason: 'High tier streak active but today entry is low or missing',
          actionableStep: 'Log your current shift metrics to maintain your Tier A streak.',
          dismissed: false,
          created_at: new Date().toISOString(),
        });
      }
    }

    return insights;
  } catch (error) {
    console.error('Proactive insights error:', error);
    return [];
  }
}

// ============================================================================
// 6. SELF-IMPROVEMENT LOOP
// ============================================================================

/**
 * Tracks when a user acts on, ignores, or dismisses a recommendation or insight,
 * storing it durably in coach_memories.
 */
export async function recordRecommendationFeedback(
  recommendationId: string,
  category: string,
  action: 'acted' | 'ignored' | 'dismissed',
  detail?: string,
): Promise<void> {
  try {
    const memoryContent = `[REC_FEEDBACK] Action: ${action} | Category: ${category} | RecID: ${recommendationId} | ${detail || ''}`;
    await addCoachMemory(memoryContent, 'self_improvement_feedback');
  } catch (error) {
    console.error('Error recording recommendation feedback:', error);
  }
}

/**
 * Analyzes the user's historical action/ignore feedback from coach_memories.
 */
export async function analyzeFeedbackHistory(): Promise<FeedbackAnalysis> {
  try {
    const memories = await loadCoachMemories();
    const feedbackMemories = memories.filter(
      (m) =>
        m.source === 'self_improvement_feedback' ||
        m.content.startsWith('[REC_FEEDBACK]'),
    );

    let actedCount = 0;
    let ignoredCount = 0;
    const catMap: Record<string, { acted: number; ignored: number }> = {};

    for (const mem of feedbackMemories) {
      const isActed = mem.content.includes('Action: acted');
      const isIgnored =
        mem.content.includes('Action: ignored') ||
        mem.content.includes('Action: dismissed');

      const catMatch = mem.content.match(/Category:\s*([\w_-]+)/);
      const category = catMatch ? catMatch[1] : 'general';

      if (!catMap[category]) {
        catMap[category] = { acted: 0, ignored: 0 };
      }

      if (isActed) {
        actedCount++;
        catMap[category].acted++;
      } else if (isIgnored) {
        ignoredCount++;
        catMap[category].ignored++;
      }
    }

    const responsivenessByCategory: Record<
      string,
      { acted: number; ignored: number; score: number }
    > = {};
    const preferredCategories: string[] = [];
    const ignoredCategories: string[] = [];

    for (const [cat, counts] of Object.entries(catMap)) {
      const total = counts.acted + counts.ignored;
      const score = total > 0 ? Number((counts.acted / total).toFixed(2)) : 0.5;

      responsivenessByCategory[cat] = {
        acted: counts.acted,
        ignored: counts.ignored,
        score,
      };

      if (counts.acted > counts.ignored) {
        preferredCategories.push(cat);
      } else if (counts.ignored > counts.acted) {
        ignoredCategories.push(cat);
      }
    }

    const summary = `User has acted on ${actedCount} recommendations and ignored/dismissed ${ignoredCount}. Preferred focus areas: ${
      preferredCategories.join(', ') || 'None yet'
    }.`;

    return {
      actedCount,
      ignoredCount,
      responsivenessByCategory,
      preferredCategories,
      ignoredCategories,
      summary,
    };
  } catch (error) {
    console.error('Error analyzing feedback history:', error);
    return {
      actedCount: 0,
      ignoredCount: 0,
      responsivenessByCategory: {},
      preferredCategories: [],
      ignoredCategories: [],
      summary: 'No feedback history available.',
    };
  }
}
