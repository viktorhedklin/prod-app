import type { DailyEntry, TaskItem, EscalationItem } from '../types';
import { computeWeightedGrade } from '../grading';
import { DEFAULT_KPI_TARGETS } from '../defaults';
import { dateFromKey } from '../dateUtils';

export interface DetectedPattern {
  id: string;
  type: 'csat_dip' | 'backlog_streak' | 'weak_weekday' | 'escalation_drift';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  evidence: string;
  suggestion: string;
}

const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export function detectBehavioralPatterns(
  entries: Record<string, DailyEntry>,
  tasks: TaskItem[],
  escalations: EscalationItem[],
): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];
  const entryList = Object.values(entries).sort((a, b) => a.date.localeCompare(b.date));

  // -------------------------------------------------------------------------
  // 1. CSAT dip: 3+ consecutive SGT work dates with CSAT below target (4.40)
  // -------------------------------------------------------------------------
  const csatTarget = 4.40;
  let currentDipRun: DailyEntry[] = [];

  for (const entry of entryList) {
    if (entry.csat_ratings && entry.csat_ratings.length > 0) {
      const avgCsat = entry.csat_ratings.reduce((a, b) => a + b, 0) / entry.csat_ratings.length;
      if (avgCsat < csatTarget) {
        currentDipRun.push(entry);
      } else {
        if (currentDipRun.length >= 3) {
          const startDate = currentDipRun[0].date;
          const endDate = currentDipRun[currentDipRun.length - 1].date;
          patterns.push({
            id: `csat-dip-${startDate}`,
            type: 'csat_dip',
            severity: 'critical',
            title: 'CSAT Dip Streak Detected',
            evidence: `${currentDipRun.length} consecutive work dates (${startDate} to ${endDate}) with CSAT below target (${csatTarget}).`,
            suggestion: 'Review recent feedback notes, slow down during resolution, and seek mid-chat clarification.',
          });
        }
        currentDipRun = [];
      }
    } else {
      if (currentDipRun.length >= 3) {
        const startDate = currentDipRun[0].date;
        const endDate = currentDipRun[currentDipRun.length - 1].date;
        patterns.push({
          id: `csat-dip-${startDate}`,
          type: 'csat_dip',
          severity: 'critical',
          title: 'CSAT Dip Streak Detected',
          evidence: `${currentDipRun.length} consecutive work dates (${startDate} to ${endDate}) with CSAT below target (${csatTarget}).`,
          suggestion: 'Review recent feedback notes, slow down during resolution, and seek mid-chat clarification.',
        });
      }
      currentDipRun = [];
    }
  }

  if (currentDipRun.length >= 3) {
    const startDate = currentDipRun[0].date;
    const endDate = currentDipRun[currentDipRun.length - 1].date;
    patterns.push({
      id: `csat-dip-${startDate}`,
      type: 'csat_dip',
      severity: 'critical',
      title: 'CSAT Dip Streak Detected',
      evidence: `${currentDipRun.length} consecutive work dates (${startDate} to ${endDate}) with CSAT below target (${csatTarget}).`,
      suggestion: 'Review recent feedback notes, slow down during resolution, and seek mid-chat clarification.',
    });
  }

  // -------------------------------------------------------------------------
  // 2. Backlog streak: tasks pending with 0 hours submitted across 2+ days
  // -------------------------------------------------------------------------
  const pendingZeroHourTasks = tasks.filter(
    (t) => t.status === 'pending' && (!t.task_hours || t.task_hours === 0),
  );
  const distinctPendingDates = new Set(pendingZeroHourTasks.map((t) => t.linked_date.slice(0, 10)));

  if (pendingZeroHourTasks.length >= 2 || distinctPendingDates.size >= 2) {
    patterns.push({
      id: 'backlog-streak',
      type: 'backlog_streak',
      severity: 'warning',
      title: 'Unsubmitted Task Backlog Streak',
      evidence: `${pendingZeroHourTasks.length} pending task(s) with 0 hours submitted spanning ${Math.max(2, distinctPendingDates.size)} day(s).`,
      suggestion: 'Log task hours daily to prevent end-of-week task velocity drops and backlog accumulation.',
    });
  }

  // -------------------------------------------------------------------------
  // 3. Weak weekday: same weekday's average composite >0.5 below overall mean
  // -------------------------------------------------------------------------
  const scoredEntries: Array<{ dayOfWeek: number; score: number }> = [];
  for (const entry of entryList) {
    const { score } = computeWeightedGrade([entry], DEFAULT_KPI_TARGETS);
    if (score !== null && !isNaN(score)) {
      const dt = dateFromKey(entry.date);
      scoredEntries.push({ dayOfWeek: dt.getDay(), score });
    }
  }

  if (scoredEntries.length >= 3) {
    const overallMean = scoredEntries.reduce((s, e) => s + e.score, 0) / scoredEntries.length;
    const weekdayScores: Record<number, number[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    for (const e of scoredEntries) {
      weekdayScores[e.dayOfWeek].push(e.score);
    }

    for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
      const dayScores = weekdayScores[dayIdx];
      if (dayScores.length >= 1) {
        const dayMean = dayScores.reduce((a, b) => a + b, 0) / dayScores.length;
        const diff = overallMean - dayMean;
        if (diff > 0.5) {
          const dayName = WEEKDAY_NAMES[dayIdx];
          patterns.push({
            id: `weak-weekday-${dayName.toLowerCase()}`,
            type: 'weak_weekday',
            severity: 'info',
            title: `Weak Performance Trend on ${dayName}s`,
            evidence: `${dayName} composite average (${dayMean.toFixed(2)}) is ${diff.toFixed(2)} points below overall mean (${overallMean.toFixed(2)}).`,
            suggestion: `Pace your energy and prioritize high-value chats/tasks on ${dayName}s.`,
          });
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // 4. Escalation drift: returned/rejected escalations >25% of resolved
  // -------------------------------------------------------------------------
  let returnedCount = 0;
  let resolvedCount = 0;

  for (const esc of escalations) {
    if (esc.status === 'resolved') {
      resolvedCount++;
    }
    const info = `${esc.reason} ${esc.additional_info ?? ''}`.toLowerCase();
    if (
      info.includes('return') ||
      info.includes('reject') ||
      info.includes('invalid') ||
      info.includes('incorrect')
    ) {
      returnedCount++;
    }
  }

  const accuracyValues = entryList
    .map((e) => e.escalation_accuracy_pct)
    .filter((v): v is number => v !== null && !isNaN(v));

  const avgAccuracy =
    accuracyValues.length > 0
      ? accuracyValues.reduce((a, b) => a + b, 0) / accuracyValues.length
      : null;

  const returnedRatio = resolvedCount > 0 ? returnedCount / resolvedCount : 0;
  const isAccuracyDrift =
    (returnedCount > 0 && returnedRatio > 0.25) || (avgAccuracy !== null && avgAccuracy < 75);

  if (isAccuracyDrift) {
    patterns.push({
      id: 'escalation-drift',
      type: 'escalation_drift',
      severity: 'warning',
      title: 'Escalation Accuracy Drift',
      evidence:
        avgAccuracy !== null
          ? `Recent escalation accuracy average is ${avgAccuracy.toFixed(1)}% (error/return rate >25%).`
          : `${returnedCount} of ${resolvedCount || 1} escalations were returned/rejected (>25%).`,
      suggestion: 'Review L2 escalation criteria and verify mandatory fields before submitting escalation forms.',
    });
  }

  return patterns;
}
