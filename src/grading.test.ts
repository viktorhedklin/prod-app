import {
  computeProductivityComposite,
  computeEscalationRate,
  tierFromValue,
  avgNonNull,
  avgRatings,
  aggregateEntries,
  computeWeightedGrade,
  scoreToGrade,
  computeRollingAverage,
  computeTaskHoursBacklog,
  formatTierLabel,
  weekDays,
  expandWeeklyEntries,
  computeWeeklyGrade,
  TIER_POINTS,
} from './grading';
import type { DailyEntry, KPITarget, Thresholds } from './types';
import { DEFAULT_KPI_TARGETS } from './defaults';

function makeEntry(overrides: Partial<DailyEntry> = {}): DailyEntry {
  const today = new Date();
  const date = today.toISOString().split('T')[0];
  return {
    date,
    chats_handled: 0,
    emails_handled: 0,
    seek_feedback: 0,
    tasks_handled: 0,
    task_hours_logged: 0,
    task_hours_submitted: 0,
    internal_notes: 0,
    csat_ratings: [],
    escalations_raised: 0,
    escalation_accuracy_pct: null,
    ...overrides,
  };
}

describe('grading utilities', () => {
  describe('computeProductivityComposite', () => {
    it('sums chats, emails, submitted hours*10, internal notes*0.5', () => {
      const e = makeEntry({ chats_handled: 10, emails_handled: 5, task_hours_submitted: 2, internal_notes: 4 });
      expect(computeProductivityComposite([e])).toBe(10 + 5 + 2 * 10 + 4 * 0.5);
    });
  });

  describe('computeEscalationRate', () => {
    it('returns null for zero volume', () => {
      expect(computeEscalationRate([makeEntry({ chats_handled: 0, emails_handled: 0 })])).toBeNull();
    });
    it('computes rate correctly', () => {
      const e = makeEntry({ chats_handled: 100, emails_handled: 50, escalations_raised: 5 });
      expect(computeEscalationRate([e])).toBe((5 / 150) * 100);
    });
  });

  describe('tierFromValue', () => {
    const thresholds: Thresholds = { S: 100, A_plus: 90, A: 80, B: 70, C: 60 };
    it('returns correct tier for higher_is_better', () => {
      expect(tierFromValue(100, thresholds, 'higher_is_better')).toBe('S');
      expect(tierFromValue(95, thresholds, 'higher_is_better')).toBe('A_plus');
      expect(tierFromValue(85, thresholds, 'higher_is_better')).toBe('A');
      expect(tierFromValue(75, thresholds, 'higher_is_better')).toBe('B');
      expect(tierFromValue(65, thresholds, 'higher_is_better')).toBe('C');
      expect(tierFromValue(50, thresholds, 'higher_is_better')).toBe('PIP');
    });
    it('returns correct tier for lower_is_better', () => {
      // lower_is_better: lower values are better, so S has LOWEST threshold
      const lowerBetterThresholds: Thresholds = { S: 10, A_plus: 20, A: 30, B: 40, C: 50 };
      expect(tierFromValue(5, lowerBetterThresholds, 'lower_is_better')).toBe('S');
      expect(tierFromValue(15, lowerBetterThresholds, 'lower_is_better')).toBe('A_plus');
      expect(tierFromValue(25, lowerBetterThresholds, 'lower_is_better')).toBe('A');
      expect(tierFromValue(35, lowerBetterThresholds, 'lower_is_better')).toBe('B');
      expect(tierFromValue(45, lowerBetterThresholds, 'lower_is_better')).toBe('C');
      expect(tierFromValue(60, lowerBetterThresholds, 'lower_is_better')).toBe('PIP');
    });
    it('returns null for null/NaN', () => {
      expect(tierFromValue(null, thresholds, 'higher_is_better')).toBeNull();
      expect(tierFromValue(NaN, thresholds, 'higher_is_better')).toBeNull();
    });
  });

  describe('avgNonNull', () => {
    it('averages non-null numbers', () => {
      expect(avgNonNull([10, 20, 30])).toBe(20);
    });
    it('ignores null and NaN but keeps zero', () => {
      expect(avgNonNull([10, null, 20, NaN, 0])).toBe(10);
    });
    it('returns null if no valid values', () => {
      expect(avgNonNull([null, NaN])).toBeNull();
      expect(avgNonNull([])).toBeNull();
    });
  });

  describe('avgRatings', () => {
    it('averages all ratings', () => {
      expect(avgRatings([[5, 4], [5]])).toBe(14 / 3);
    });
    it('returns null for empty', () => {
      expect(avgRatings([[]])).toBeNull();
    });
  });

  describe('aggregateEntries', () => {
    it('aggregates correctly with qa pct', () => {
      const e = makeEntry({ chats_handled: 20, emails_handled: 10, task_hours_submitted: 3, internal_notes: 2, csat_ratings: [5, 4], escalations_raised: 1, escalation_accuracy_pct: 90 });
      const agg = aggregateEntries([e], 95);
      expect(agg.productivity).toBe(20 + 10 + 3 * 10 + 2 * 0.5);
      expect(agg.csat).toBe(4.5);
      expect(agg.qa).toBe(95);
      expect(agg.esc_rate).toBe(1 / 30 * 100);
      expect(agg.esc_accuracy).toBe(90);
    });
  });

  describe('computeWeightedGrade', () => {
    it('computes grade from targets', () => {
      const e = makeEntry({ chats_handled: 50, emails_handled: 20, task_hours_submitted: 5, internal_notes: 5, csat_ratings: [5, 5], escalations_raised: 2, escalation_accuracy_pct: 98 });
      const result = computeWeightedGrade([e], DEFAULT_KPI_TARGETS, 95);
      expect(result.score).not.toBeNull();
      expect(result.grade).not.toBeNull();
      expect(result.breakdown.length).toBe(5);
    });
    it('returns null for no data', () => {
      const result = computeWeightedGrade([], DEFAULT_KPI_TARGETS, null);
      expect(result.score).toBeNull();
      expect(result.grade).toBeNull();
    });
  });

  describe('scoreToGrade', () => {
    it('maps score to tier', () => {
      expect(scoreToGrade(4.5)).toBe('S');
      expect(scoreToGrade(4.0)).toBe('A_plus');
      expect(scoreToGrade(3.0)).toBe('A');
      expect(scoreToGrade(2.0)).toBe('B');
      expect(scoreToGrade(1.0)).toBe('C');
      expect(scoreToGrade(0)).toBe('PIP');
    });
  });

  describe('computeRollingAverage', () => {
    it('returns 7 days with scores', () => {
      const entries: Record<string, DailyEntry> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        entries[dateStr] = makeEntry({ chats_handled: 10, emails_handled: 5, csat_ratings: [5] });
      }
      const rolling = computeRollingAverage(entries, DEFAULT_KPI_TARGETS, 7, 95);
      expect(rolling.length).toBe(7);
      rolling.forEach((r) => expect(r.score).not.toBeNull());
    });
    it('returns null score for missing days', () => {
      const entries: Record<string, DailyEntry> = {};
      const d = new Date();
      d.setDate(d.getDate() - 1);
      const dateStr = d.toISOString().split('T')[0];
      entries[dateStr] = makeEntry({ chats_handled: 5 });
      const rolling = computeRollingAverage(entries, DEFAULT_KPI_TARGETS, 7, 95);
      const hasNull = rolling.some((r) => r.score === null);
      expect(hasNull).toBe(true);
    });
  });

  describe('computeTaskHoursBacklog', () => {
    it('computes logged, submitted, backlog', () => {
      const e1 = makeEntry({ task_hours_logged: 10, task_hours_submitted: 8 });
      const e2 = makeEntry({ task_hours_logged: 5, task_hours_submitted: 3 });
      const backlog = computeTaskHoursBacklog([e1, e2]);
      expect(backlog.logged).toBe(15);
      expect(backlog.submitted).toBe(11);
      expect(backlog.backlog).toBe(4);
    });
  });

  describe('formatTierLabel', () => {
    it('formats tiers correctly', () => {
      expect(formatTierLabel('A_plus')).toBe('A+');
      expect(formatTierLabel('S')).toBe('S');
      expect(formatTierLabel('PIP')).toBe('PIP');
    });
  });

  describe('weekDays', () => {
    it('returns 7 dates for the week', () => {
      const days = weekDays('2026-08-17');
      expect(days.length).toBe(7);
      expect(days[0]).toBe('2026-08-17');
      expect(days[6]).toBe('2026-08-23');
    });
  });

  describe('expandWeeklyEntries', () => {
    it('only spreads over past days', () => {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const ystr = yesterday.toISOString().split('T')[0];
      const weekStart = '2026-08-17';

      const entries: Record<string, DailyEntry> = {};
      const weeklyEntries = {
        [weekStart]: {
          week_start: weekStart,
          chats_handled: 70,
          emails_handled: 10,
          seek_feedback: 0,
          tasks_handled: 0,
          task_hours_logged: 7,
          task_hours_submitted: 5,
          internal_notes: 0,
          csat_ratings: [5, 5, 5, 5, 5],
          escalations_raised: 0,
          escalation_accuracy_pct: null,
        },
      };

      const expanded = expandWeeklyEntries(entries, weeklyEntries);
      const pastDays = Object.keys(expanded).filter((d) => d <= today);
      expect(pastDays.length).toBeGreaterThan(0);
      // future dates should not be created
      const futureDays = Object.keys(expanded).filter((d) => d > today);
      expect(futureDays.length).toBe(0);
    });
  });

  describe('computeWeeklyGrade', () => {
    it('grades from weekly entry when present', () => {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekStr = weekStart.toISOString().split('T')[0];
      const weekly = {
        week_start: weekStr,
        chats_handled: 100,
        emails_handled: 50,
        seek_feedback: 0,
        tasks_handled: 0,
        task_hours_logged: 0,
        task_hours_submitted: 10,
        internal_notes: 20,
        csat_ratings: [5, 5, 5],
        escalations_raised: 5,
        escalation_accuracy_pct: 95,
      };
      const realInWeek: DailyEntry[] = [];
      const result = computeWeeklyGrade(weekStr, realInWeek, weekly, DEFAULT_KPI_TARGETS, 95);
      expect(result.score).not.toBeNull();
      expect(result.grade).not.toBeNull();
    });
    it('falls back to daily entries when no weekly', () => {
      const weekStart = '2026-08-17';
      const realInWeek = Array.from({ length: 7 }, (_, i) => makeEntry({ chats_handled: 10, emails_handled: 5 }));
      const result = computeWeeklyGrade(weekStart, realInWeek, undefined, DEFAULT_KPI_TARGETS, 95);
      expect(result.score).not.toBeNull();
    });
  });
});