import type { DailyEntry, TaskItem, EscalationItem, KPITarget } from '../types';
import { startOfWeekLocal, workDateLocal } from '../dateUtils';
import { weekDays } from '../grading';

import { calculateGradeForecast, type GradeForecast } from './forecast';
import { detectBehavioralPatterns, type DetectedPattern } from './patterns';
import { evaluateProactiveTriggers, type ProactiveTrigger } from './triggers';

export * from './forecast';
export * from './patterns';
export * from './triggers';
export * from './reinforce';

export function runIntelligencePipeline(state: {
  entries: Record<string, DailyEntry>;
  weeklyEntries?: unknown;
  tasks: TaskItem[];
  escalations: EscalationItem[];
  targets: KPITarget[];
}): {
  forecast: GradeForecast | null;
  patterns: DetectedPattern[];
  triggers: ProactiveTrigger[];
} {
  const currentWorkDate = workDateLocal();
  const currentWeekStart = startOfWeekLocal(currentWorkDate);
  const currentWeekDays = new Set(weekDays(currentWeekStart));

  const allEntries = Object.values(state.entries);
  const entriesThisWeek = allEntries.filter((e) => currentWeekDays.has(e.date));

  let forecast: GradeForecast | null = null;
  if (entriesThisWeek.length > 0) {
    forecast = calculateGradeForecast(allEntries, state.targets, currentWeekStart);
  }

  const patterns = detectBehavioralPatterns(state.entries, state.tasks, state.escalations);

  const triggers = evaluateProactiveTriggers({
    entries: state.entries,
    tasks: state.tasks,
    forecast,
    nowSGT: new Date(),
  });

  return {
    forecast,
    patterns,
    triggers,
  };
}
