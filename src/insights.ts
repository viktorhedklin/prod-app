import type { DailyEntry, KPITarget, Insight, Reflection, JournalEntry, MoodCheckIn } from './types';
import { computeWeightedGrade } from './grading';
import { genId } from './storage';

export function generateRuleBasedInsights(
  entries: Record<string, DailyEntry>,
  targets: KPITarget[],
  reflections: Record<string, Reflection>,
  _journal: JournalEntry[],
  moodCheckins: MoodCheckIn[],
  existingInsightTitles: Set<string>,
): Insight[] {
  const insights: Insight[] = [];
  const entryList = Object.values(entries).sort((a, b) => a.date.localeCompare(b.date));

  // 1. CSAT vs volume correlation
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

  // 2. Missing reflections
  const recentDays: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    recentDays.push(d.toISOString().slice(0, 10));
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

  // 3. Escalation rate trend
  const escDays = entryList
    .filter((e) => e.escalations_raised > 0 || (e.chats_handled + e.emails_handled) > 0)
    .slice(-7);
  if (escDays.length >= 4) {
    const recentEscRate =
      escDays.slice(-3).reduce((s, e) => s + e.escalations_raised, 0) /
      Math.max(
        1,
        escDays.slice(-3).reduce((s, e) => s + e.chats_handled + e.emails_handled, 0),
      ) * 100;
    const olderEscRate =
      escDays.slice(0, -3).reduce((s, e) => s + e.escalations_raised, 0) /
      Math.max(
        1,
        escDays.slice(0, -3).reduce((s, e) => s + e.chats_handled + e.emails_handled, 0),
      ) * 100;
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

  // 5. Mood-performance correlation
  const moodWithEntries = moodCheckins.filter((m) => entries[m.entry_date]);
  if (moodWithEntries.length >= 4) {
    const goodMoodDays = moodWithEntries.filter(
      (m) => m.mood === 'great' || m.mood === 'good',
    );
    const stressedMoodDays = moodWithEntries.filter(
      (m) => m.mood === 'stressed' || m.mood === 'overwhelmed',
    );
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

  // 6. Task hours backlog
  const recentEntries = entryList.slice(-7);
  const totalLogged = recentEntries.reduce((s, e) => s + e.task_hours_logged, 0);
  const totalSubmitted = recentEntries.reduce((s, e) => s + e.task_hours_submitted, 0);
  if (totalLogged - totalSubmitted > 5) {
    const title = 'Task hours backlog growing';
    if (!existingInsightTitles.has(title)) {
      insights.push({
        id: genId(),
        insight_type: 'pattern',
        title,
        body: `You have ${(totalLogged - totalSubmitted).toFixed(1)} unsubmitted task hours from the last 7 days. Submit them promptly to avoid losing track.`,
        severity: 'warning',
        dismissed: false,
        created_at: new Date().toISOString(),
      });
    }
  }

  // 7. Productivity trend
  if (entryList.length >= 6) {
    const half = Math.floor(entryList.length / 2);
    const older = entryList.slice(0, half);
    const newer = entryList.slice(half);
    const olderAvg = older.reduce((s, e) => s + e.chats_handled + e.emails_handled + e.task_hours_submitted * 10 + e.internal_notes * 0.5, 0) / older.length;
    const newerAvg = newer.reduce((s, e) => s + e.chats_handled + e.emails_handled + e.task_hours_submitted * 10 + e.internal_notes * 0.5, 0) / newer.length;
    if (Math.abs(newerAvg - olderAvg) >= 2) {
      const direction = newerAvg > olderAvg ? 'improving' : 'declining';
      const title = `Productivity is ${direction}`;
      if (!existingInsightTitles.has(title)) {
        insights.push({
          id: genId(),
          insight_type: 'pattern',
          title,
          body: `Your average daily productivity points have ${direction} from ${olderAvg.toFixed(1)} to ${newerAvg.toFixed(1)}. ${newerAvg > olderAvg ? 'Keep up the momentum and see what is driving the gains.' : 'Look at the last few days to spot what changed.'}`,
          severity: newerAvg > olderAvg ? 'info' : 'warning',
          dismissed: false,
          created_at: new Date().toISOString(),
        });
      }
    }
  }

  // 8. Best weekday
  if (entryList.length >= 5) {
    const byWeekday: Record<number, number[]> = {};
    for (const e of entryList) {
      const dow = new Date(e.date + 'T00:00:00').getDay();
      const pts = e.chats_handled + e.emails_handled + e.task_hours_submitted * 10 + e.internal_notes * 0.5;
      (byWeekday[dow] ??= []).push(pts);
    }
    const entries = Object.entries(byWeekday).filter(([, pts]) => pts.length >= 2);
    if (entries.length >= 2) {
      const best = entries.reduce((a, b) =>
        b[1].reduce((s, p) => s + p, 0) / b[1].length > a[1].reduce((s, p) => s + p, 0) / a[1].length ? b : a,
      );
      const worst = entries.reduce((a, b) =>
        b[1].reduce((s, p) => s + p, 0) / b[1].length < a[1].reduce((s, p) => s + p, 0) / a[1].length ? b : a,
      );
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      if (best[0] !== worst[0]) {
        const bestAvg = best[1].reduce((s, p) => s + p, 0) / best[1].length;
        const worstAvg = worst[1].reduce((s, p) => s + p, 0) / worst[1].length;
        const title = `${dayNames[Number(best[0])]} is your most productive day`;
        if (!existingInsightTitles.has(title)) {
          insights.push({
            id: genId(),
            insight_type: 'pattern',
            title,
            body: `You average ${bestAvg.toFixed(1)} productivity points on ${dayNames[Number(best[0])]}s vs ${worstAvg.toFixed(1)} on ${dayNames[Number(worst[0])]}s. If you can, schedule demanding tasks on your strongest days.`,
            severity: 'info',
            dismissed: false,
            created_at: new Date().toISOString(),
          });
        }
      }
    }
  }

  // 9. CSAT response rate
  const workedDays = entryList.filter((e) => e.chats_handled + e.emails_handled > 0);
  const csatLoggedDays = workedDays.filter((e) => e.csat_ratings.length > 0);
  if (workedDays.length >= 3 && csatLoggedDays.length > 0) {
    const rate = (csatLoggedDays.length / workedDays.length) * 100;
    if (rate < 60) {
      const title = 'CSAT ratings are going unlogged';
      if (!existingInsightTitles.has(title)) {
        insights.push({
          id: genId(),
          insight_type: 'pattern',
          title,
          body: `You logged CSAT ratings on only ${csatLoggedDays.length} of ${workedDays.length} worked days (${rate.toFixed(0)}%). Rating more days gives you a clearer picture of customer satisfaction trends.`,
          severity: 'warning',
          dismissed: false,
          created_at: new Date().toISOString(),
        });
      }
    }
  }

  // 10. Task submission lag
  const lagDays = entryList
    .filter((e) => e.task_hours_logged > 0 && e.task_hours_submitted >= 0)
    .slice(-14);
  if (lagDays.length >= 3) {
    const lagging = lagDays.filter((e) => e.task_hours_submitted < e.task_hours_logged);
    const ratio = lagging.length / lagDays.length;
    if (ratio >= 0.4) {
      const totalLag = lagDays.reduce((s, e) => s + (e.task_hours_logged - Math.min(e.task_hours_submitted, e.task_hours_logged)), 0);
      const title = 'Task hours often not submitted same day';
      if (!existingInsightTitles.has(title)) {
        insights.push({
          id: genId(),
          insight_type: 'pattern',
          title,
          body: `On ${lagging.length} of the last ${lagDays.length} days, your submitted task hours were below what you logged (≈${totalLag.toFixed(1)}h in total). Complete your shift task list before logging out to keep submission tight.`,
          severity: ratio >= 0.7 ? 'warning' : 'info',
          dismissed: false,
          created_at: new Date().toISOString(),
        });
      }
    }
  }

  return insights;
}

export function computeReflectionStreak(reflections: Record<string, Reflection>): number {
  const dates = Object.keys(reflections).sort().reverse();
  if (dates.length === 0) return 0;

  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
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

  // First reflection
  if (reflectionCount >= 1 && !existingAchievements.has('first_reflection')) {
    unlocked.push({
      achievement_key: 'first_reflection',
      title: 'First Reflection',
      description: 'Completed your first end-of-day reflection',
    });
  }

  // 3-day streak
  if (computeReflectionStreak(reflections) >= 3 && !existingAchievements.has('streak_3')) {
    unlocked.push({
      achievement_key: 'streak_3',
      title: '3-Day Streak',
      description: 'Reflected 3 days in a row',
    });
  }

  // 7-day streak
  if (computeReflectionStreak(reflections) >= 7 && !existingAchievements.has('streak_7')) {
    unlocked.push({
      achievement_key: 'streak_7',
      title: '7-Day Streak',
      description: 'Reflected 7 days in a row',
    });
  }

  // First S-tier day
  const sTierDays = Object.values(reflections).filter((r) => r.grade === 'S');
  if (sTierDays.length >= 1 && !existingAchievements.has('first_s_tier')) {
    unlocked.push({
      achievement_key: 'first_s_tier',
      title: 'First S-Tier Day',
      description: 'Achieved an S grade on a single day',
    });
  }

  // 10 journal entries
  if (journalCount >= 10 && !existingAchievements.has('journal_10')) {
    unlocked.push({
      achievement_key: 'journal_10',
      title: 'Journal Keeper',
      description: 'Wrote 10 journal entries',
    });
  }

  // 5 mood check-ins
  if (moodCount >= 5 && !existingAchievements.has('mood_5')) {
    unlocked.push({
      achievement_key: 'mood_5',
      title: 'In Touch',
      description: 'Logged 5 mood check-ins',
    });
  }

  // 10 days of data
  if (entryCount >= 10 && !existingAchievements.has('data_10')) {
    unlocked.push({
      achievement_key: 'data_10',
      title: 'Dedicated Tracker',
      description: 'Logged data for 10 days',
    });
  }

  return unlocked;
}
