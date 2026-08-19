import type { DailyEntry, KPITarget, Tier, Thresholds, GradeResult, MetricBreakdown, TaskItem, EscalationItem } from './types';

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
    (sum, e) => sum + e.chats_handled + e.emails_handled + e.seek_feedback * 0.5 + e.task_hours_submitted * 10,
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
  const valid = values.filter((v): v is number => v !== null && !isNaN(v) && v !== 0);
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
    quiz: 100,
    punctuality: 10,
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
    const dateStr = d.toISOString().slice(0, 10);
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
