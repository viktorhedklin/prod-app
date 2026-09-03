import type { DailyEntry, KPITarget } from '../types';
import { computeWeightedGrade, TIER_POINTS, weekDays } from '../grading';
import { workDateLocal } from '../dateUtils';

export interface GradeForecast {
  projectedScore: number;
  trend: 'rising' | 'flat' | 'falling';
  daysRemaining: number;
  requiredDailyScore: number;
}

const TARGET_SCORE = TIER_POINTS.A_plus; // 4.0

export function calculateGradeForecast(
  entries: DailyEntry[],
  targets: KPITarget[],
  weekStart: string,
): GradeForecast {
  const days = weekDays(weekStart);
  const daySet = new Set(days);
  const weekEntries = entries.filter((e) => daySet.has(e.date));

  const entryMap = new Map<string, DailyEntry>();
  for (const entry of weekEntries) {
    entryMap.set(entry.date, entry);
  }

  const points: Array<{ dayIndex: number; date: string; score: number }> = [];
  for (let i = 0; i < days.length; i++) {
    const dateStr = days[i];
    const entry = entryMap.get(dateStr);
    if (entry) {
      const { score } = computeWeightedGrade([entry], targets);
      if (score !== null && !isNaN(score)) {
        points.push({ dayIndex: i, date: dateStr, score });
      }
    }
  }

  const todayStr = workDateLocal();
  const todayIndex = days.indexOf(todayStr);

  let daysElapsed = points.length;
  if (todayIndex >= 0) {
    daysElapsed = Math.min(7, Math.max(points.length, todayIndex + 1));
  } else if (todayStr > days[6]) {
    daysElapsed = 7;
  }
  const daysRemaining = Math.max(0, 7 - daysElapsed);

  if (points.length === 0) {
    return {
      projectedScore: 0,
      trend: 'flat',
      daysRemaining,
      requiredDailyScore: TARGET_SCORE,
    };
  }

  const N = points.length;
  const meanX = points.reduce((s, p) => s + p.dayIndex, 0) / N;
  const meanY = points.reduce((s, p) => s + p.score, 0) / N;

  let covXY = 0;
  let varX = 0;
  for (const p of points) {
    covXY += (p.dayIndex - meanX) * (p.score - meanY);
    varX += (p.dayIndex - meanX) ** 2;
  }

  let slope = 0;
  let intercept = meanY;
  if (N >= 2 && varX > 0) {
    slope = covXY / varX;
    intercept = meanY - slope * meanX;
  }

  let trend: 'rising' | 'flat' | 'falling' = 'flat';
  if (slope > 0.05) {
    trend = 'rising';
  } else if (slope < -0.05) {
    trend = 'falling';
  }

  // Calculate projected 7-day average score
  let totalProjectedScore = 0;
  for (let i = 0; i < 7; i++) {
    const existing = points.find((p) => p.dayIndex === i);
    if (existing) {
      totalProjectedScore += existing.score;
    } else {
      const pred = Math.max(0, Math.min(5, slope * i + intercept));
      totalProjectedScore += pred;
    }
  }

  const rawProjectedScore = totalProjectedScore / 7;
  const projectedScore = Number(Math.max(0, Math.min(5, rawProjectedScore)).toFixed(2));

  const sumActualScores = points.reduce((s, p) => s + p.score, 0);
  let requiredDailyScore = 0;
  if (daysRemaining > 0) {
    const neededTotal = TARGET_SCORE * 7;
    const neededRemaining = neededTotal - sumActualScores;
    const rawReq = neededRemaining / daysRemaining;
    requiredDailyScore = Number(Math.max(0, Math.min(5, rawReq)).toFixed(2));
  }

  return {
    projectedScore,
    trend,
    daysRemaining,
    requiredDailyScore,
  };
}
