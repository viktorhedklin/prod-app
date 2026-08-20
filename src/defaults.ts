import type { KPITarget, DailyEntry } from './types';

export const DEFAULT_KPI_TARGETS: KPITarget[] = [
  {
    metric_key: 'productivity',
    label: 'Productivity',
    weight: 0.30,
    direction: 'higher_is_better',
    thresholds: { S: 110, A_plus: 95, A: 85, B: 75, C: 70 },
  },
  {
    metric_key: 'csat',
    label: 'CSAT',
    weight: 0.30,
    direction: 'higher_is_better',
    thresholds: { S: 4.50, A_plus: 4.45, A: 4.40, B: 4.15, C: 4.10 },
  },
  {
    metric_key: 'qa',
    label: 'QA (Chat & Email)',
    weight: 0.20,
    direction: 'higher_is_better',
    thresholds: { S: 97, A_plus: 95, A: 92, B: 88, C: 83 },
  },
  {
    metric_key: 'esc_rate',
    label: 'Escalation Rate %',
    weight: 0.05,
    direction: 'lower_is_better',
    thresholds: { S: 6.30, A_plus: 7.10, A: 9.10, B: 12.50, C: 13.50 },
  },
  {
    metric_key: 'esc_accuracy',
    label: 'Escalation Accuracy %',
    weight: 0.05,
    direction: 'higher_is_better',
    thresholds: { S: 97.50, A_plus: 97.00, A: 96.00, B: 94.00, C: 91.00 },
  },
];

export function makeEmptyEntry(date: string): DailyEntry {
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
  };
}
