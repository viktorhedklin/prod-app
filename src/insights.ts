import type { DailyEntry, KPITarget, Insight, Reflection, JournalEntry, MoodCheckIn, TaskItem } from './types';
import { computeWeightedGrade } from './grading';
import { genId } from './storage';
import { todayLocal, addDays } from './dates';

export function generateRuleBasedInsights(
  entries: Record<string, DailyEntry>,
  targets: KPITarget[],
  reflections: Record<string, Reflection>,
  _journal: JournalEntry[],
  moodCheckins: MoodCheckIn[],
  existingInsightTitles: Set<string>,
  tasks: TaskItem[] = [],
): Insight[] {
  const insights: Insight[] = [];
  const entryList = Object.values(entries).sort((a, b) => a.date.localeCompare(b.date));

  const csatVolumeDays = entryList.filter(
    (e) => e.csat_ratings.length > 0 && (e.chats_handled + e.emails_handled) > 0,
  );
  if (csatVolumeDays.length >= 3) {
    const avgVolume =
      csatVolumeDays.reduce((s, e) => s + e.chats_handled + e.emails_handled, 0) /
      csatVolumeDays.length;
    const highVolumeDays = csatVolumeDays.filter(
      (e) => e.chats_handled + e.emails_handled > avgVolume * 1.3,
    );
    if (highVolumeDays.length >= 2) {
      const avgCsatHigh = highVolumeDays.reduce((s, e) => {
        const avg = e.csat_ratings.reduce((a, b) => a + b, 0) / e.csat_ratings.length;
        return s + avg;
      }, 0) / highVolumeDays.length;
      const avgCsatAll = csatVolumeDays.reduce((s, e) => {
        const avg = e.csat_ratings.reduce((a, b) => a + b, 0) / e.csat_ratings.length;
        return s + avg;
      }, 0) / csatVolumeDays.length;
      if (avgCsatHigh < avgCsatAll - 0.15) {
        const title = 'CSAT drops on high-volume days';
        if (!existingInsightTitles.has(title)) {
          insights.push({
            id: genId(),
            insight_type: 'pattern',
            title,
            body: `Your CSAT averages ${avgCsatHigh.toFixed(2)} on days with above-average volume, compared to ${avgCsatAll.toFixed(2)} overall. Consider pacing yourself during busy periods to maintain quality.`,
            severity: 'warning',
            dismissed: false,
            created_at: new Date().toISOString(),
          });
        }
      }
    }
  }

  const recentDays: string[] = [];
  for (let i = 0; i < 7; i++) {
    recentDays.push(addDays(todayLocal(), -i));
  }
  const daysWithEntries = recentDays.filter((d) => entries[d]);
  const daysWithReflections = recentDays.filter((d) => reflections[d]);
  if (daysWithEntries.length >= 2 && daysWithReflections.length === 0) {
    const title = 'No reflections this week';
    if (!existingInsightTitles.has(title)) {
      insights.push({
        id: genId(),
        insight_type: 'pattern',
        title,
        body: `You have data for ${daysWithEntries.length} days but haven't completed a reflection. Taking 20 minutes to reflect can improve next week's performance.`,
        severity: 'info',
        dismissed: false,
        created_at: new Date().toISOString(),
      });
    }
  }

  const escDays = entryList
    .filter((e) => e.escalations_raised > 0 || (e.chats_handled + e.emails_handled) > 0)
    .slice(-7);
  if (escDays.length >= 4) {
    const recentEscRate =
      escDays.slice(-3).reduce((s, e) => s + e.escalations_raised, 0) /
      Math.max(1, escDays.slice(-3).reduce((s, e) => s + e.chats_handled + e.emails_handled, 0)) * 100;
    const olderEscRate =
      escDays.slice(0, -3).reduce((s, e) => s + e.escalations_raised, 0) /
      Math.max(1, escDays.slice(0, -3).reduce((s, e) => s + e.chats_handled + e.emails_handled, 0)) * 100;
    if (recentEscRate > olderEscRate + 3) {
      const title = 'Escalation rate is increasing';
      if (!existingInsightTitles.has(title)) {
        insights.push({
          id: genId(),
          insight_type: 'pattern',
          title,
          body: `Your escalation rate has risen from ${olderEscRate.toFixed(1)}% to ${recentEscRate.toFixed(1)}% recently. Review whether you're escalating issues that could be resolved with available resources.`,
          severity: 'warning',
          dismissed: false,
          created_at: new Date().toISOString(),
        });
      }
    }
  }

  const moodWithEntries = moodCheckins.filter((m) => entries[m.entry_date]);
  if (moodWithEntries.length >= 4) {
    const goodMoodDays = moodWithEntries.filter((m) => m.mood === 'great' || m.mood === 'good');
    const stressedMoodDays = moodWithEntries.filter((m) => m.mood === 'stressed' || m.mood === 'overwhelmed');
    if (goodMoodDays.length >= 2 && stressedMoodDays.length >= 1) {
      const goodScores = goodMoodDays
        .map((m) => computeWeightedGrade([entries[m.entry_date]], targets).score)
        .filter((s): s is number => s !== null);
      const stressedScores = stressedMoodDays
        .map((m) => computeWeightedGrade([entries[m.entry_date]], targets).score)
        .filter((s): s is number => s !== null);
      if (goodScores.length >= 2 && stressedScores.length >= 1) {
        const avgGood = goodScores.reduce((a, b) => a + b, 0) / goodScores.length;
        const avgStressed = stressedScores.reduce((a, b) => a + b, 0) / stressedScores.length;
        if (avgGood > avgStressed + 0.5) {
          const title = 'Mood affects your performance';
          if (!existingInsightTitles.has(title)) {
            insights.push({
              id: genId(),
              insight_type: 'pattern',
              title,
              body: `Your scores average ${avgGood.toFixed(2)} on good-mood days vs ${avgStressed.toFixed(2)} on stressed days. Consider stress-management techniques before your shift to boost performance.`,
              severity: 'info',
              dismissed: false,
              created_at: new Date().toISOString(),
            });
          }
        }
      }
    }
  }

  const pendingTodos = tasks.filter((t) => t.status === 'pending');
  const pendingHours = pendingTodos.reduce((s, t) => s + (t.task_hours ?? 0), 0);
  if (pendingTodos.length >= 2 || pendingHours >= 2) {
    const title = 'Shift todos still open';
    if (!existingInsightTitles.has(title)) {
      insights.push({
        id: genId(),
        insight_type: 'pattern',
        title,
        body: `You have ${pendingTodos.length} open shift todos (${pendingHours.toFixed(1)}h). Pending hours do not count toward productivity until they are submitted.`,
        severity: 'warning',
        dismissed: false,
        created_at: new Date().toISOString(),
      });
    }
  }

  return insights;
}

export function computeReflectionStreak(reflections: Record<string, Reflection>): number {
  const dates = Object.keys(reflections).sort().reverse();
  if (dates.length === 0) return 0;

  let streak = 0;
  const today = todayLocal();
  for (let i = 0; i < 365; i++) {
    const dateStr = addDays(today, -i);
    if (reflections[dateStr]) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  return streak;
}

export function checkAchievements(
  reflections: Record<string, Reflection>,
  entries: Record<string, DailyEntry>,
  journal: JournalEntry[],
  moodCheckins: MoodCheckIn[],
  existingAchievements: Set<string>,
): Array<{ achievement_key: string; title: string; description: string }> {
  const unlocked: Array<{ achievement_key: string; title: string; description: string }> = [];
  const reflectionCount = Object.keys(reflections).length;
  const entryCount = Object.keys(entries).length;
  const journalCount = journal.length;
  const moodCount = moodCheckins.length;

  if (reflectionCount >= 1 && !existingAchievements.has('first_reflection')) {
    unlocked.push({
      achievement_key: 'first_reflection',
      title: 'First Reflection',
      description: 'Completed your first end-of-day reflection',
    });
  }

  if (computeReflectionStreak(reflections) >= 3 && !existingAchievements.has('streak_3')) {
    unlocked.push({
      achievement_key: 'streak_3',
      title: '3-Day Streak',
      description: 'Reflected 3 days in a row',
    });
  }

  if (computeReflectionStreak(reflections) >= 7 && !existingAchievements.has('streak_7')) {
    unlocked.push({
      achievement_key: 'streak_7',
      title: '7-Day Streak',
      description: 'Reflected 7 days in a row',
    });
  }

  const sTierDays = Object.values(reflections).filter((r) => r.grade === 'S');
  if (sTierDays.length >= 1 && !existingAchievements.has('first_s_tier')) {
    unlocked.push({
      achievement_key: 'first_s_tier',
      title: 'First S-Tier Day',
      description: 'Achieved an S grade on a single day',
    });
  }

  if (journalCount >= 10 && !existingAchievements.has('journal_10')) {
    unlocked.push({
      achievement_key: 'journal_10',
      title: 'Journal Keeper',
      description: 'Wrote 10 journal entries',
    });
  }

  if (moodCount >= 5 && !existingAchievements.has('mood_5')) {
    unlocked.push({
      achievement_key: 'mood_5',
      title: 'In Touch',
      description: 'Logged 5 mood check-ins',
    });
  }

  if (entryCount >= 10 && !existingAchievements.has('data_10')) {
    unlocked.push({
      achievement_key: 'data_10',
      title: 'Dedicated Tracker',
      description: 'Logged data for 10 days',
    });
  }

  return unlocked;
}
