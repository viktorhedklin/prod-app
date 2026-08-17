import type { DailyEntry, EscalationItem, TaskItem } from './types';
import { computeProductivityPoints } from './grading';

function csvEscape(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  let text = value == null ? '' : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function triggerDownload(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadDailyCsv(entries: Record<string, DailyEntry>): void {
  const rows = Object.values(entries).sort((a, b) => a.date.localeCompare(b.date));
  const lines = ['date,chats,emails,internal_notes,submitted_hours,prod_points,csat_avg,csat_count,escalations,esc_accuracy'];
  for (const entry of rows) {
    const points = computeProductivityPoints(entry);
    const csatAvg = entry.csat_ratings.length
      ? (entry.csat_ratings.reduce((sum, rating) => sum + rating, 0) / entry.csat_ratings.length).toFixed(2)
      : '';
    lines.push([
      entry.date,
      entry.chats_handled,
      entry.emails_handled,
      entry.internal_notes,
      entry.task_hours_submitted,
      points.total.toFixed(1),
      csatAvg,
      entry.csat_ratings.length,
      entry.escalations_raised,
      entry.escalation_accuracy_pct ?? '',
    ].map(csvEscape).join(','));
  }
  triggerDownload('productivity-log.csv', lines.join('\n'));
}

export function downloadTasksCsv(tasks: TaskItem[]): void {
  const lines = ['task_id,source_task_id,name,submit_to,hours,status,linked_date,completion_date,submitted_at'];
  for (const task of tasks) {
    lines.push([
      task.task_id,
      task.source_task_id ?? '',
      task.brief_explanation,
      task.submit_to,
      task.task_hours ?? '',
      task.status,
      task.linked_date,
      task.completion_date,
      task.submitted_at ?? '',
    ].map(csvEscape).join(','));
  }
  triggerDownload('shift-todos.csv', lines.join('\n'));
}

export function downloadEscalationsCsv(escalations: EscalationItem[]): void {
  const lines = ['escalation_id,case_number,escalate_to,reason,status,linked_date,escalated_at'];
  for (const item of escalations) {
    lines.push([
      item.escalation_id,
      item.case_number,
      item.escalate_to,
      item.reason,
      item.status,
      item.linked_date,
      item.escalated_at ?? '',
    ].map(csvEscape).join(','));
  }
  triggerDownload('escalations.csv', lines.join('\n'));
}
