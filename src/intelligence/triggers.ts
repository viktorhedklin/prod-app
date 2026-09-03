import type { DailyEntry, TaskItem } from '../types';
import type { GradeForecast } from './forecast';
import { workDateLocal } from '../dateUtils';

export interface ProactiveTrigger {
  id: string;
  code: 'UNLOGGED_METRICS' | 'ZERO_HOUR_TASKS' | 'TIER_RISK';
  priority: 'high' | 'medium' | 'low';
  userMessage: string;
}

export function evaluateProactiveTriggers(state: {
  entries: Record<string, DailyEntry>;
  tasks: TaskItem[];
  forecast: GradeForecast | null;
  nowSGT: Date;
}): ProactiveTrigger[] {
  const triggers: ProactiveTrigger[] = [];

  // 1. UNLOGGED_METRICS
  const sgtWorkDate = workDateLocal(state.nowSGT);
  const sgtHourStr = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Singapore',
    hour: 'numeric',
    hour12: false,
  }).format(state.nowSGT);
  const sgtHour = parseInt(sgtHourStr, 10);

  const todayEntry = state.entries[sgtWorkDate];
  const isUnlogged =
    !todayEntry || (todayEntry.chats_handled === 0 && todayEntry.emails_handled === 0);

  if (isUnlogged && sgtHour >= 4) {
    triggers.push({
      id: 'trigger-unlogged-metrics',
      code: 'UNLOGGED_METRICS',
      priority: 'medium',
      userMessage: `Good day, Sir. Hour ${sgtHour} of shift date ${sgtWorkDate} is underway with zero chats or emails logged. Shall we update your progress?`,
    });
  }

  // 2. ZERO_HOUR_TASKS
  const zeroHourTasks = state.tasks.filter(
    (t) => t.status === 'pending' && (!t.task_hours || t.task_hours === 0),
  );

  if (zeroHourTasks.length >= 2) {
    triggers.push({
      id: 'trigger-zero-hour-tasks',
      code: 'ZERO_HOUR_TASKS',
      priority: 'medium',
      userMessage: `Attention: ${zeroHourTasks.length} pending tasks have zero logged hours. Updating task hours will prevent productivity velocity drops.`,
    });
  }

  // 3. TIER_RISK
  if (state.forecast) {
    const isRisk = state.forecast.trend === 'falling' || state.forecast.projectedScore < 4.0;
    if (isRisk) {
      const isHighPriority = state.forecast.trend === 'falling' || state.forecast.projectedScore < 3.0;
      triggers.push({
        id: 'trigger-tier-risk',
        code: 'TIER_RISK',
        priority: isHighPriority ? 'high' : 'medium',
        userMessage: `Warning, Sir: Weekly forecast projects ${state.forecast.projectedScore.toFixed(2)} (${state.forecast.trend} trend). A daily score of ${state.forecast.requiredDailyScore.toFixed(2)} is needed over the next ${state.forecast.daysRemaining} days to meet tier targets.`,
      });
    }
  }

  return triggers;
}
