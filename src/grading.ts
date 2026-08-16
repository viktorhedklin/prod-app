import type {
  DailyEntry,
  KPITarget,
  Tier,
  Thresholds,
  GradeResult,
  MetricBreakdown,
  TaskItem,
  EscalationItem,
  ProductivityPoints,
} from './types';
import { todayLocal } from './dates';

export const TIER_POINTS: Record<Tier, number> = {
  S: 5,
  A_plus: 4,
  A: 3,
  B: 2,
  C: 1,
  PIP: 0,
};

export function computeProductivityPoints(entry: DailyEntry): ProductivityPoints {
  const chats = entry.chats_handled || 0;
  const emails = entry.emails_handled || 0;
  const notes = (entry.internal_notes || 0) * 0.5;
  const taskHours = (entry.task_hours_submitted || 0) * 10;
  return {
    chats,
    emails,
    notes,
    taskHours,
    total: chats + emails + notes + taskHours,
  };
}

export function computeProductivityComposite(entries: DailyEntry[]): number {
  return entries.reduce((sum, entry) => sum + computeProductivityPoints(entry).total, 0);
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
  }

  for (const [tier, threshold] of tiers) {
    if (value <= threshold) return tier;
  }
  return 'PIP';
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

  return {
    productivity: computeProductivityComposite(entries),
    csat: avgRatings(entries.map((e) => e.csat_ratings)),
    qa: qaPct,
    esc_rate: computeEscalationRate(entries),
    esc_accuracy: avgNonNull(entries.map((e) => e.escalation_accuracy_pct)),
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
      weightedScore += TIER_POINTS[item.tier] * (item.weight_used / totalWeight);
    }
  }

  breakdown.sort((a, b) => b.weight_used - a.weight_used);
  return { score: weightedScore, grade: scoreToGrade(weightedScore), breakdown };
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
  const today = todayLocal();

  for (let i = days - 1; i >= 0; i--) {
    const dateStr = addDaysSafe(today, -i);
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

function addDaysSafe(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function computeTaskHoursBacklog(tasks: TaskItem[], date?: string): {
  pendingHours: number;
  submittedHours: number;
  pendingCount: number;
  submittedCount: number;
} {
  const scoped = date ? tasks.filter((t) => t.linked_date === date || t.completion_date === date) : tasks;
  const pending = scoped.filter((t) => t.status === 'pending');
  const submitted = scoped.filter((t) => t.status === 'submitted');
  return {
    pendingHours: pending.reduce((s, t) => s + (t.task_hours ?? 0), 0),
    submittedHours: submitted.reduce((s, t) => s + (t.task_hours ?? 0), 0),
    pendingCount: pending.length,
    submittedCount: submitted.length,
  };
}

export function getOpenShiftItems(
  tasks: TaskItem[],
  escalations: EscalationItem[],
  date?: string,
): { pendingTasks: TaskItem[]; openEscalations: EscalationItem[] } {
  return {
    pendingTasks: tasks.filter((t) => t.status === 'pending' && (!date || t.linked_date === date || t.completion_date === date)),
    openEscalations: escalations.filter(
      (e) => (e.status === 'open' || e.status === 'escalated') && (!date || e.linked_date === date),
    ),
  };
}

export function formatTierLabel(tier: Tier): string {
  if (tier === 'A_plus') return 'A+';
  return tier;
}
