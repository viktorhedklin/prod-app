import { generateRuleBasedInsights, computeReflectionStreak, checkAchievements } from './insights';
import type { DailyEntry, KPITarget, Reflection, JournalEntry, MoodCheckIn } from './types';
import { DEFAULT_KPI_TARGETS } from './defaults';

function makeEntry(overrides: Partial<DailyEntry> = {}): DailyEntry {
  const date = overrides.date ?? new Date().toISOString().split('T')[0];
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

function makeReflection(overrides: Partial<Reflection> = {}): Reflection {
  const d = new Date();
  const date = d.toISOString().split('T')[0];
  return {
    entry_date: date,
    score: 0,
    grade: 'B',
    body: '',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('insights', () => {
  describe('computeReflectionStreak', () => {
    it('returns 0 for empty reflections', () => {
      expect(computeReflectionStreak({})).toBe(0);
    });
    it('counts consecutive days ending today', () => {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const ystr = yesterday.toISOString().split('T')[0];
      expect(computeReflectionStreak({ [today]: makeReflection(), [ystr]: makeReflection() })).toBe(2);
    });
    it('stops at first gap', () => {
      const today = new Date().toISOString().split('T')[0];
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      const str = twoDaysAgo.toISOString().split('T')[0];
      expect(computeReflectionStreak({ [today]: makeReflection(), [str]: makeReflection() })).toBe(1);
    });
  });

  describe('checkAchievements', () => {
    it('unlocks first_reflection at 1 reflection', () => {
      const r = { [new Date().toISOString().split('T')[0]]: makeReflection() };
      const a = checkAchievements(r, {}, [], [], new Set());
      expect(a.some((x) => x.achievement_key === 'first_reflection')).toBe(true);
    });
    it('unlocks streak_3 at 3-day streak', () => {
      const refs: Record<string, Reflection> = {};
      for (let i = 0; i < 3; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        refs[d.toISOString().split('T')[0]] = makeReflection();
      }
      const a = checkAchievements(refs, {}, [], [], new Set());
      expect(a.some((x) => x.achievement_key === 'streak_3')).toBe(true);
    });
    it('does not duplicate already unlocked', () => {
      const r = { [new Date().toISOString().split('T')[0]]: makeReflection() };
      const existing = new Set(['first_reflection']);
      const a = checkAchievements(r, {}, [], [], existing);
      expect(a.some((x) => x.achievement_key === 'first_reflection')).toBe(false);
    });
  });

  describe('generateRuleBasedInsights', () => {
    const targets = DEFAULT_KPI_TARGETS;

    it('returns empty for no data', () => {
      const insights = generateRuleBasedInsights({}, targets, {}, [], [], new Set());
      expect(insights.length).toBe(0);
    });

    it('detects CSAT drop on high-volume days', () => {
      const entries: Record<string, DailyEntry> = {};
      const base = new Date();
      for (let i = 0; i < 6; i++) {
        const d = new Date(base);
        d.setDate(d.getDate() - i);
        const date = d.toISOString().split('T')[0];
        // low volume high CSAT
        if (i < 3) {
          entries[date] = {
            date,
            chats_handled: 10,
            emails_handled: 5,
            csat_ratings: [5, 5],
            task_hours_logged: 0,
            task_hours_submitted: 0,
            seek_feedback: 0,
            tasks_handled: 0,
            internal_notes: 0,
            escalations_raised: 0,
            escalation_accuracy_pct: null,
          };
        } else {
          // high volume low CSAT
          entries[date] = {
            date,
            chats_handled: 50,
            emails_handled: 20,
            csat_ratings: [3, 2],
            task_hours_logged: 0,
            task_hours_submitted: 0,
            seek_feedback: 0,
            tasks_handled: 0,
            internal_notes: 0,
            escalations_raised: 0,
            escalation_accuracy_pct: null,
          };
        }
      }
      const insights = generateRuleBasedInsights(entries, DEFAULT_KPI_TARGETS, {}, [], [], new Set());
      const csatInsight = insights.find((i) => i.title === 'CSAT drops on high-volume days');
      expect(csatInsight).toBeDefined();
      expect(csatInsight!.severity).toBe('warning');
    });

    it('detects missing reflections', () => {
      const entries: Record<string, DailyEntry> = {};
      const base = new Date();
      for (let i = 0; i < 3; i++) {
        const d = new Date(base);
        d.setDate(d.getDate() - i);
        const date = d.toISOString().split('T')[0];
        entries[date] = makeEntry({ chats_handled: 10 });
      }
      const insights = generateRuleBasedInsights(entries, DEFAULT_KPI_TARGETS, {}, [], [], new Set());
      const missing = insights.find((i) => i.title === 'No reflections this week');
      expect(missing).toBeDefined();
      expect(missing!.severity).toBe('info');
    });

    it('detects rising escalation rate', () => {
      const entries: Record<string, DailyEntry> = {};
      const base = new Date();
      for (let i = 0; i < 7; i++) {
        const d = new Date(base);
        d.setDate(d.getDate() - i);
        const date = d.toISOString().split('T')[0];
        // recent 3 days: higher escalations
        if (i < 3) {
          entries[date] = makeEntry({ date, chats_handled: 20, escalations_raised: 2 });
        } else {
          entries[date] = makeEntry({ date, chats_handled: 20, escalations_raised: 0 });
        }
      }
      const insights = generateRuleBasedInsights(entries, DEFAULT_KPI_TARGETS, {}, [], [], new Set());
      const escInsight = insights.find((i) => i.title === 'Escalation rate is increasing');
      expect(escInsight).toBeDefined();
    });

    it('detects mood-performance correlation', () => {
      const entries: Record<string, DailyEntry> = {};
      const moods: MoodCheckIn[] = [];
      const base = new Date();
      for (let i = 0; i < 5; i++) {
        const d = new Date(base);
        d.setDate(d.getDate() - i);
        const date = d.toISOString().split('T')[0];
        if (i < 3) {
          // good mood days - high productivity to trigger mood correlation
          entries[date] = makeEntry({ chats_handled: 80, emails_handled: 20 });
          moods.push({ id: i, entry_date: date, mood: 'great', checkin_type: 'start', created_at: new Date().toISOString() });
        } else {
          // stressed days - low productivity
          entries[date] = makeEntry({ chats_handled: 10, emails_handled: 5 });
          moods.push({ id: i + 3, entry_date: date, mood: 'stressed', checkin_type: 'start', created_at: new Date().toISOString() });
        }
      }
      const insights = generateRuleBasedInsights(entries, DEFAULT_KPI_TARGETS, {}, [], moods, new Set());
      const moodInsight = insights.find((i) => i.title === 'Mood affects your performance');
      expect(moodInsight).toBeDefined();
    });

    it('detects task hours backlog', () => {
      const entries: Record<string, DailyEntry> = {};
      const base = new Date();
      for (let i = 0; i < 7; i++) {
        const d = new Date(base);
        d.setDate(d.getDate() - i);
        const date = d.toISOString().split('T')[0];
        entries[date] = makeEntry({ task_hours_logged: 3, task_hours_submitted: 1 });
      }
      const insights = generateRuleBasedInsights(entries, DEFAULT_KPI_TARGETS, {}, [], [], new Set());
      const backlog = insights.find((i) => i.title === 'Task hours backlog growing');
      expect(backlog).toBeDefined();
    });

    it('detects productivity trend', () => {
      const entries: Record<string, DailyEntry> = {};
      const base = new Date();
      for (let i = 0; i < 10; i++) {
        const d = new Date(base);
        d.setDate(d.getDate() - i);
        const date = d.toISOString().split('T')[0];
        entries[date] = makeEntry({ chats_handled: 5, task_hours_submitted: i < 5 ? 1 : 5 });
      }
      const insights = generateRuleBasedInsights(entries, DEFAULT_KPI_TARGETS, {}, [], [], new Set());
      const trend = insights.find((i) => i.title.startsWith('Productivity is'));
      expect(trend).toBeDefined();
    });

    it('detects low CSAT response rate', () => {
      const entries: Record<string, DailyEntry> = {};
      const base = new Date();
      for (let i = 0; i < 5; i++) {
        const d = new Date(base);
        d.setDate(d.getDate() - i);
        const date = d.toISOString().split('T')[0];
        entries[date] = makeEntry({ chats_handled: 10 });
        if (i === 0) entries[date].csat_ratings = [5];
      }
      const insights = generateRuleBasedInsights(entries, DEFAULT_KPI_TARGETS, {}, [], [], new Set());
      const csatInsight = insights.find((i) => i.title === 'CSAT ratings are going unlogged');
      expect(csatInsight).toBeDefined();
    });

    it('detects task submission lag', () => {
      const entries: Record<string, DailyEntry> = {};
      const base = new Date();
      for (let i = 0; i < 10; i++) {
        const d = new Date(base);
        d.setDate(d.getDate() - i);
        const date = d.toISOString().split('T')[0];
        entries[date] = makeEntry({ task_hours_logged: 4, task_hours_submitted: i < 6 ? 1 : 4 });
      }
      const insights = generateRuleBasedInsights(entries, DEFAULT_KPI_TARGETS, {}, [], [], new Set());
      const lagInsight = insights.find((i) => i.title === 'Task hours often not submitted same day');
      expect(lagInsight).toBeDefined();
    });
  });
});