import type { DailyEntry, KPITarget, Tier, Thresholds, GradeResult, MetricBreakdown, TaskItem, EscalationItem, WeeklyEntry } from './types';
import { todayLocal, dateKeyFromDate } from './dateUtils';

export const TIER_POINTS: Record<Tier, number> = {
  S: 5,
  A_plus: 4,
  A: 3,
  B: 2,
  C: 1,
  PIP: 0,
};

export function computeProductivityComposite(entries: DailyEntry[]): number {
  return entries.reduce(
    (sum, e) => sum + e.chats_handled + e.emails_handled + e.task_hours_submitted * 10 + e.internal_notes * 0.5,
    0,
  );
}

export function computeEscalationRate(entries: DailyEntry[]): number | null {
  const totalEscalations = entries.reduce((s, e) => s + e.escalations_raised, 0);
  const totalVolume = entries.reduce((s, e) => s + e.chats_handled + e.emails_handled, 0);
  if (totalVolume === 0) return null;
  return (totalEscalations / totalVolume) * 100;
}

export function tierFromValue(
  value: number | null,
  thresholds: Thresholds,
  direction: 'higher_is_better' | 'lower_is_better',
): Tier | null {
  if (value === null || value === undefined || isNaN(value)) return null;

  const tiers: Array<[Tier, number]> = [
    ['S', thresholds.S],
    ['A_plus', thresholds.A_plus],
    ['A', thresholds.A],
    ['B', thresholds.B],
    ['C', thresholds.C],
  ];

  if (direction === 'higher_is_better') {
    for (const [tier, threshold] of tiers) {
      if (value >= threshold) return tier;
    }
    return 'PIP';
  } else {
    for (const [tier, threshold] of tiers) {
      if (value <= threshold) return tier;
    }
    return 'PIP';
  }
}

function avgNonNull(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v !== null && !isNaN(v));
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

function avgRatings(ratings: number[][]): number | null {
  const all = ratings.flat();
  if (all.length === 0) return null;
  return all.reduce((a, b) => a + b, 0) / all.length;
}

export function aggregateEntries(entries: DailyEntry[], qaPct: number | null = null): Record<string, number | null> {
  if (entries.length === 0 && qaPct === null) return {};

  const productivity = computeProductivityComposite(entries);
  const escRate = computeEscalationRate(entries);

  const csatAvg = avgRatings(entries.map((e) => e.csat_ratings));
  const escAccAvg = avgNonNull(entries.map((e) => e.escalation_accuracy_pct));

  return {
    productivity,
    csat: csatAvg,
    qa: qaPct,
    esc_rate: escRate,
    esc_accuracy: escAccAvg,
  };
}

export function computeWeightedGrade(
  entries: DailyEntry[],
  targets: KPITarget[],
  qaPct: number | null = null,
): GradeResult {
  if (entries.length === 0 && qaPct === null) return { score: null, grade: null, breakdown: [] };

  const aggregated = aggregateEntries(entries, qaPct);
  const breakdown: MetricBreakdown[] = [];
  let totalWeight = 0;
  let weightedScore = 0;

  for (const target of targets) {
    const value = aggregated[target.metric_key] ?? null;
    const tier = tierFromValue(
      typeof value === 'number' ? value : null,
      target.thresholds,
      target.direction,
    );

    if (tier === null) {
      breakdown.push({
        label: target.label,
        metric_key: target.metric_key,
        aggregated_value: null,
        tier: null,
        weight_used: 0,
      });
      continue;
    }

    totalWeight += target.weight;
    breakdown.push({
      label: target.label,
      metric_key: target.metric_key,
      aggregated_value: typeof value === 'number' ? value : null,
      tier,
      weight_used: target.weight,
    });
  }

  if (totalWeight === 0) return { score: null, grade: null, breakdown };

  for (const item of breakdown) {
    if (item.tier !== null) {
      const normalizedWeight = item.weight_used / totalWeight;
      weightedScore += TIER_POINTS[item.tier] * normalizedWeight;
    }
  }

  breakdown.sort((a, b) => b.weight_used - a.weight_used);

  const grade = scoreToGrade(weightedScore);

  return { score: weightedScore, grade, breakdown };
}

export function scoreToGrade(score: number): Tier {
  if (score >= 4.5) return 'S';
  if (score >= 3.5) return 'A_plus';
  if (score >= 2.5) return 'A';
  if (score >= 1.5) return 'B';
  if (score >= 0.5) return 'C';
  return 'PIP';
}

export function computeRollingAverage(
  entries: Record<string, DailyEntry>,
  targets: KPITarget[],
  days: number = 7,
  qaPct: number | null = null,
): Array<{ date: string; score: number | null }> {
  const result: Array<{ date: string; score: number | null }> = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = dateKeyFromDate(d);
    const entry = entries[dateStr];
    if (!entry) {
      result.push({ date: dateStr, score: null });
    } else {
      const { score } = computeWeightedGrade([entry], targets, qaPct);
      result.push({ date: dateStr, score });
    }
  }

  return result;
}

export function computeTaskHoursBacklog(entries: DailyEntry[]): {
  logged: number;
  submitted: number;
  backlog: number;
} {
  const logged = entries.reduce((s, e) => s + e.task_hours_logged, 0);
  const submitted = entries.reduce((s, e) => s + e.task_hours_submitted, 0);
  return { logged, submitted, backlog: logged - submitted };
}

export function getOpenShiftItems(
  tasks: TaskItem[],
  escalations: EscalationItem[],
): { pendingTasks: TaskItem[]; openEscalations: EscalationItem[] } {
  return {
    pendingTasks: tasks.filter((t) => t.status === 'pending'),
    openEscalations: escalations.filter(
      (e) => e.status === 'open' || e.status === 'escalated',
    ),
  };
}

export function formatTierLabel(tier: Tier): string {
  if (tier === 'A_plus') return 'A+';
  return tier;
}

export function weekDays(weekStart: string): string[] {
  const [y, m, d] = weekStart.split('-').map((n) => Number(n));
  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const dt = new Date(y, m - 1, d + i, 12, 0, 0, 0);
    days.push(
      `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`,
    );
  }
  return days;
}

export function expandWeeklyEntries(
  entries: Record<string, DailyEntry>,
  weeklyEntries: Record<string, WeeklyEntry>,
): Record<string, DailyEntry> {
  const merged: Record<string, DailyEntry> = { ...entries };
  const today = todayLocal();
  for (const week of Object.values(weeklyEntries)) {
    const days = weekDays(week.week_start);
    // Only spread a week's totals over days that have already passed or are
    // today. Fabricating future days would score unworked time on the trend
    // and the dashboard's "today" card.
    const pastDays = days.filter((d) => d <= today);
    if (pastDays.length === 0) continue;
    // Distribute the week's CSAT ratings round-robin across the past days so
    // the weekly average stays honest and no single day carries the whole week.
    const csatByDay: number[][] = Array.from({ length: pastDays.length }, () => []);
    week.csat_ratings.forEach((rating, i) => {
      csatByDay[i % pastDays.length].push(rating);
    });
    const perDay = (v: number) => v / pastDays.length;
    for (let di = 0; di < pastDays.length; di++) {
      const day = pastDays[di];
      if (merged[day]) continue;
      merged[day] = {
        date: day,
        chats_handled: perDay(week.chats_handled),
        emails_handled: perDay(week.emails_handled),
        seek_feedback: perDay(week.seek_feedback),
        tasks_handled: perDay(week.tasks_handled),
        task_hours_logged: perDay(week.task_hours_logged),
        task_hours_submitted: perDay(week.task_hours_submitted),
        internal_notes: perDay(week.internal_notes),
        csat_ratings: csatByDay[di],
        escalations_raised: perDay(week.escalations_raised),
        escalation_accuracy_pct: week.escalation_accuracy_pct,
      };
    }
  }
  return merged;
}

// Honest weekly aggregate: if a weekly entry exists for the week, grade from the
// week's own totals (CSAT averaged across all its ratings, productivity summed,
// escalation rate computed over the week's volume). Otherwise fall back to the
// week's real daily entries.
export function computeWeeklyGrade(
  _weekStart: string,
  realEntriesInWeek: DailyEntry[],
  weeklyEntry: WeeklyEntry | undefined,
  targets: KPITarget[],
  qaPct: number | null = null,
): GradeResult {
  if (weeklyEntry) {
    const csatAvg =
      weeklyEntry.csat_ratings.length > 0
        ? weeklyEntry.csat_ratings.reduce((a, b) => a + b, 0) / weeklyEntry.csat_ratings.length
        : null;
    const totalVolume = weeklyEntry.chats_handled + weeklyEntry.emails_handled;
    const escRate =
      totalVolume > 0
        ? (weeklyEntry.escalations_raised / totalVolume) * 100
        : null;
    const aggregate: Record<string, number | null> = {
      productivity:
        weeklyEntry.chats_handled +
        weeklyEntry.emails_handled +
        weeklyEntry.task_hours_submitted * 10 +
        weeklyEntry.internal_notes * 0.5,
      csat: csatAvg,
      qa: qaPct,
      esc_rate: escRate,
      esc_accuracy: weeklyEntry.escalation_accuracy_pct,
    };
    return gradeFromAggregate(aggregate, targets);
  }
  return computeWeightedGrade(realEntriesInWeek, targets, qaPct);
}

function gradeFromAggregate(
  aggregated: Record<string, number | null>,
  targets: KPITarget[],
): GradeResult {
  const breakdown: MetricBreakdown[] = [];
  let totalWeight = 0;
  let weightedScore = 0;

  for (const target of targets) {
    const value = aggregated[target.metric_key] ?? null;
    const tier = tierFromValue(
      typeof value === 'number' ? value : null,
      target.thresholds,
      target.direction,
    );
    if (tier === null) {
      breakdown.push({
        label: target.label,
        metric_key: target.metric_key,
        aggregated_value: null,
        tier: null,
        weight_used: 0,
      });
      continue;
    }
    totalWeight += target.weight;
    breakdown.push({
      label: target.label,
      metric_key: target.metric_key,
      aggregated_value: typeof value === 'number' ? value : null,
      tier,
      weight_used: target.weight,
    });
  }

  if (totalWeight === 0) return { score: null, grade: null, breakdown };

  for (const item of breakdown) {
    if (item.tier !== null) {
      const normalizedWeight = item.weight_used / totalWeight;
      weightedScore += TIER_POINTS[item.tier] * normalizedWeight;
    }
  }
  breakdown.sort((a, b) => b.weight_used - a.weight_used);
  return { score: weightedScore, grade: scoreToGrade(weightedScore), breakdown };
}
