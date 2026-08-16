import { supabase } from './supabaseClient';
import type {
  DailyEntry,
  CsatNote,
  TaskItem,
  EscalationItem,
  KPITarget,
  MoodCheckIn,
  Reflection,
  JournalEntry,
  Insight,
  Achievement,
  QaEntry,
} from './types';
import { DEFAULT_KPI_TARGETS, makeEmptyEntry } from './defaults';

function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export { genId };

const TASK_META_RE = /<!--pg:([\s\S]*?)-->/;

function encodeTaskMeta(task: TaskItem, notes: string | null): string | null {
  const meta = JSON.stringify({
    completion_date: task.completion_date,
    source_task_id: task.source_task_id,
  });
  const clean = (notes ?? '').replace(TASK_META_RE, '').trim();
  return clean ? `${clean}\n<!--pg:${meta}-->` : `<!--pg:${meta}-->`;
}

function decodeTaskMeta(additionalInfo: string | null): {
  notes: string | null;
  completion_date: string | null;
  source_task_id: string | null;
} {
  if (!additionalInfo) return { notes: null, completion_date: null, source_task_id: null };
  const match = additionalInfo.match(TASK_META_RE);
  if (!match) return { notes: additionalInfo, completion_date: null, source_task_id: null };
  try {
    const parsed = JSON.parse(match[1]) as { completion_date?: string | null; source_task_id?: string | null };
    const notes = additionalInfo.replace(TASK_META_RE, '').trim();
    return {
      notes: notes || null,
      completion_date: parsed.completion_date ?? null,
      source_task_id: parsed.source_task_id ?? null,
    };
  } catch {
    return { notes: additionalInfo, completion_date: null, source_task_id: null };
  }
}

function normalizeEntry(date: string, raw: Record<string, unknown>): DailyEntry {
  const base = makeEmptyEntry(date);
  const notes =
    typeof raw.internal_notes === 'number'
      ? raw.internal_notes
      : typeof raw.seek_feedback === 'number'
        ? raw.seek_feedback
        : base.internal_notes;
  return {
    date,
    chats_handled: typeof raw.chats_handled === 'number' ? raw.chats_handled : base.chats_handled,
    emails_handled: typeof raw.emails_handled === 'number' ? raw.emails_handled : base.emails_handled,
    seek_feedback: notes,
    internal_notes: notes,
    tasks_handled: typeof raw.tasks_handled === 'number' ? raw.tasks_handled : base.tasks_handled,
    task_hours_logged: typeof raw.task_hours_logged === 'number' ? raw.task_hours_logged : base.task_hours_logged,
    task_hours_submitted: typeof raw.task_hours_submitted === 'number' ? raw.task_hours_submitted : base.task_hours_submitted,
    csat_ratings: Array.isArray(raw.csat_ratings) ? (raw.csat_ratings as number[]) : base.csat_ratings,
    escalations_raised: typeof raw.escalations_raised === 'number' ? raw.escalations_raised : base.escalations_raised,
    escalation_accuracy_pct: typeof raw.escalation_accuracy_pct === 'number' ? raw.escalation_accuracy_pct : null,
  };
}

export async function loadEntries(): Promise<Record<string, DailyEntry>> {
  const { data, error } = await supabase.from('daily_entries').select('*');
  if (error) throw error;
  const result: Record<string, DailyEntry> = {};
  for (const row of data ?? []) {
    result[row.date] = normalizeEntry(row.date, row as unknown as Record<string, unknown>);
  }
  return result;
}

export async function saveEntry(date: string, entry: DailyEntry): Promise<void> {
  const payload = {
    date,
    chats_handled: entry.chats_handled,
    emails_handled: entry.emails_handled,
    seek_feedback: entry.internal_notes,
    internal_notes: entry.internal_notes,
    tasks_handled: entry.tasks_handled,
    task_hours_logged: entry.task_hours_logged,
    task_hours_submitted: entry.task_hours_submitted,
    csat_ratings: entry.csat_ratings,
    escalations_raised: entry.escalations_raised,
    escalation_accuracy_pct: entry.escalation_accuracy_pct,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('daily_entries').upsert(payload);
  if (error && /internal_notes/.test(error.message)) {
    const { internal_notes: _unused, ...legacy } = payload;
    void _unused;
    const retry = await supabase.from('daily_entries').upsert(legacy);
    if (retry.error) throw retry.error;
    return;
  }
  if (error) throw error;
}

export async function loadCsatNotes(): Promise<CsatNote[]> {
  const { data, error } = await supabase.from('csat_notes').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    entry_date: r.entry_date,
    rating: r.rating,
    note: r.note,
    created_at: r.created_at,
  }));
}

export async function saveCsatNote(note: CsatNote): Promise<void> {
  const { error } = await supabase.from('csat_notes').insert({
    id: note.id,
    entry_date: note.entry_date,
    rating: note.rating,
    note: note.note,
    created_at: note.created_at,
  });
  if (error) throw error;
}

export async function deleteCsatNote(id: string): Promise<void> {
  const { error } = await supabase.from('csat_notes').delete().eq('id', id);
  if (error) throw error;
}

function normalizeTask(r: Record<string, unknown>): TaskItem {
  const meta = decodeTaskMeta(typeof r.additional_info === 'string' ? r.additional_info : null);
  const linked = typeof r.linked_date === 'string' ? r.linked_date : '';
  return {
    task_id: String(r.task_id),
    source_task_id:
      typeof r.source_task_id === 'string' && r.source_task_id
        ? r.source_task_id
        : meta.source_task_id,
    brief_explanation: String(r.brief_explanation ?? ''),
    submit_to: String(r.submit_to ?? ''),
    amount: typeof r.amount === 'number' ? r.amount : r.amount == null ? null : Number(r.amount),
    task_hours: typeof r.task_hours === 'number' ? r.task_hours : r.task_hours == null ? null : Number(r.task_hours),
    status: r.status === 'submitted' ? 'submitted' : 'pending',
    created_at: String(r.created_at ?? new Date().toISOString()),
    submitted_at: typeof r.submitted_at === 'string' ? r.submitted_at : null,
    linked_date: linked,
    completion_date:
      typeof r.completion_date === 'string' && r.completion_date
        ? r.completion_date
        : meta.completion_date ?? linked,
    additional_info: meta.notes,
  };
}

export async function loadTasks(): Promise<TaskItem[]> {
  const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => normalizeTask(r as unknown as Record<string, unknown>));
}

export async function saveTask(task: TaskItem): Promise<void> {
  const full = {
    task_id: task.task_id,
    source_task_id: task.source_task_id,
    brief_explanation: task.brief_explanation,
    submit_to: task.submit_to,
    amount: task.amount,
    task_hours: task.task_hours,
    status: task.status,
    created_at: task.created_at,
    submitted_at: task.submitted_at,
    linked_date: task.linked_date,
    completion_date: task.completion_date,
    additional_info: task.additional_info,
  };
  const { error } = await supabase.from('tasks').upsert(full);
  if (error && /source_task_id|completion_date/.test(error.message)) {
    const retry = await supabase.from('tasks').upsert({
      task_id: task.task_id,
      brief_explanation: task.brief_explanation,
      submit_to: task.submit_to,
      amount: task.amount,
      task_hours: task.task_hours,
      status: task.status,
      created_at: task.created_at,
      submitted_at: task.submitted_at,
      linked_date: task.linked_date,
      additional_info: encodeTaskMeta(task, task.additional_info),
    });
    if (retry.error) throw retry.error;
    return;
  }
  if (error) throw error;
}

export async function deleteTask(task_id: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('task_id', task_id);
  if (error) throw error;
}

export async function loadEscalations(): Promise<EscalationItem[]> {
  const { data, error } = await supabase.from('escalations').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    escalation_id: r.escalation_id,
    case_number: r.case_number,
    escalate_to: r.escalate_to,
    reason: r.reason,
    status: r.status,
    created_at: r.created_at,
    escalated_at: r.escalated_at,
    linked_date: r.linked_date,
    additional_info: r.additional_info,
  }));
}

export async function saveEscalation(esc: EscalationItem): Promise<void> {
  const { error } = await supabase.from('escalations').upsert({
    escalation_id: esc.escalation_id,
    case_number: esc.case_number,
    escalate_to: esc.escalate_to,
    reason: esc.reason,
    status: esc.status,
    created_at: esc.created_at,
    escalated_at: esc.escalated_at,
    linked_date: esc.linked_date,
    additional_info: esc.additional_info,
  });
  if (error) throw error;
}

export async function deleteEscalation(escalation_id: string): Promise<void> {
  const { error } = await supabase.from('escalations').delete().eq('escalation_id', escalation_id);
  if (error) throw error;
}

export async function loadTargets(): Promise<KPITarget[]> {
  const { data, error } = await supabase.from('kpi_targets').select('*');
  if (error) throw error;
  if (!data || data.length === 0) return DEFAULT_KPI_TARGETS;
  return data.map((r) => ({
    metric_key: r.metric_key,
    label: r.label,
    weight: Number(r.weight),
    direction: r.direction,
    thresholds: r.thresholds,
  }));
}

export async function saveTargets(targets: KPITarget[]): Promise<void> {
  const rows = targets.map((t) => ({
    metric_key: t.metric_key,
    label: t.label,
    weight: t.weight,
    direction: t.direction,
    thresholds: t.thresholds,
  }));
  const { error } = await supabase.from('kpi_targets').upsert(rows);
  if (error) throw error;
}

export async function loadMoodCheckins(): Promise<MoodCheckIn[]> {
  const { data, error } = await supabase.from('mood_checkins').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    entry_date: r.entry_date,
    mood: r.mood,
    checkin_type: r.checkin_type,
    created_at: r.created_at,
  }));
}

export async function saveMoodCheckIn(checkin: MoodCheckIn): Promise<void> {
  const { error } = await supabase.from('mood_checkins').upsert({
    id: checkin.id,
    entry_date: checkin.entry_date,
    mood: checkin.mood,
    checkin_type: checkin.checkin_type,
    created_at: checkin.created_at,
  });
  if (error) throw error;
}

export async function loadReflections(): Promise<Record<string, Reflection>> {
  const { data, error } = await supabase.from('reflections').select('*');
  if (error) throw error;
  const result: Record<string, Reflection> = {};
  for (const r of data ?? []) {
    result[r.entry_date] = {
      entry_date: r.entry_date,
      questions: r.questions ?? [],
      answers: r.answers ?? [],
      ai_tips: r.ai_tips ?? [],
      ai_summary: r.ai_summary,
      score: r.score !== null ? Number(r.score) : null,
      grade: r.grade,
      created_at: r.created_at,
    };
  }
  return result;
}

export async function saveReflection(date: string, reflection: Reflection): Promise<void> {
  const { error } = await supabase.from('reflections').upsert({
    entry_date: date,
    questions: reflection.questions,
    answers: reflection.answers,
    ai_tips: reflection.ai_tips,
    ai_summary: reflection.ai_summary,
    score: reflection.score,
    grade: reflection.grade,
    created_at: reflection.created_at,
  });
  if (error) throw error;
}

export async function loadJournal(): Promise<JournalEntry[]> {
  const { data, error } = await supabase.from('journal_entries').select('*').order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    entry_date: r.entry_date,
    user_message: r.user_message,
    ai_response: r.ai_response,
    category: r.category,
    linked_entry_date: r.linked_entry_date,
    created_at: r.created_at,
  }));
}

export async function saveJournalEntry(entry: JournalEntry): Promise<void> {
  const { error } = await supabase.from('journal_entries').insert({
    id: entry.id,
    entry_date: entry.entry_date,
    user_message: entry.user_message,
    ai_response: entry.ai_response,
    category: entry.category,
    linked_entry_date: entry.linked_entry_date,
    created_at: entry.created_at,
  });
  if (error) throw error;
}

export async function updateJournalEntryDb(id: string, patch: Partial<JournalEntry>): Promise<void> {
  const update: Record<string, unknown> = {};
  if (patch.ai_response !== undefined) update.ai_response = patch.ai_response;
  if (patch.category !== undefined) update.category = patch.category;
  const { error } = await supabase.from('journal_entries').update(update).eq('id', id);
  if (error) throw error;
}

export async function loadInsights(): Promise<Insight[]> {
  const { data, error } = await supabase.from('insights').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    insight_type: r.insight_type,
    title: r.title,
    body: r.body,
    severity: r.severity,
    dismissed: r.dismissed,
    created_at: r.created_at,
  }));
}

export async function saveInsight(insight: Insight): Promise<void> {
  const { error } = await supabase.from('insights').insert({
    id: insight.id,
    insight_type: insight.insight_type,
    title: insight.title,
    body: insight.body,
    severity: insight.severity,
    dismissed: insight.dismissed,
    created_at: insight.created_at,
  });
  if (error) throw error;
}

export async function updateInsightDismissed(id: string, dismissed: boolean): Promise<void> {
  const { error } = await supabase.from('insights').update({ dismissed }).eq('id', id);
  if (error) throw error;
}

export async function loadAchievements(): Promise<Achievement[]> {
  const { data, error } = await supabase.from('achievements').select('*').order('unlocked_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    achievement_key: r.achievement_key,
    title: r.title,
    description: r.description,
    unlocked_at: r.unlocked_at,
  }));
}

export async function saveAchievement(a: Achievement): Promise<void> {
  const { error } = await supabase.from('achievements').upsert({
    achievement_key: a.achievement_key,
    title: a.title,
    description: a.description,
    unlocked_at: a.unlocked_at,
  });
  if (error) throw error;
}

export function loadAiApiKey(): string {
  try {
    return localStorage.getItem('pg_ai_api_key') ?? localStorage.getItem('pg_openai_key') ?? '';
  } catch {
    return '';
  }
}

export function saveAiApiKey(key: string): void {
  try {
    localStorage.setItem('pg_ai_api_key', key);
  } catch {
    // non-fatal
  }
}

export async function loadTaskCounter(): Promise<number> {
  const { data: taskData } = await supabase.from('tasks').select('task_id');
  if (!taskData) return 0;
  return taskData.length;
}

export async function loadEscalationCounter(): Promise<number> {
  const { data, error } = await supabase.from('escalations').select('escalation_id');
  if (error) return 0;
  return data?.length ?? 0;
}

export function nextTaskId(counter: number): string {
  return `TSK-${String(counter).padStart(4, '0')}`;
}

export function nextEscalationId(counter: number): string {
  return `ESC-${String(counter).padStart(4, '0')}`;
}

export async function loadQaEntries(): Promise<Record<string, QaEntry>> {
  const { data, error } = await supabase
    .from('qa_entries')
    .select('*')
    .order('week_start', { ascending: true });
  if (error) throw new Error(error.message);
  const map: Record<string, QaEntry> = {};
  for (const row of data ?? []) {
    map[row.week_start] = {
      week_start: row.week_start,
      cases_reviewed: row.cases_reviewed ?? 0,
      qa_percentage: row.qa_percentage ?? 0,
      notes: row.notes ?? null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
  return map;
}

export async function saveQaEntry(weekStart: string, entry: QaEntry): Promise<void> {
  const { error } = await supabase.from('qa_entries').upsert(
    {
      week_start: weekStart,
      cases_reviewed: entry.cases_reviewed,
      qa_percentage: entry.qa_percentage,
      notes: entry.notes,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'week_start' },
  );
  if (error) throw new Error(error.message);
}

export async function deleteQaEntry(weekStart: string): Promise<void> {
  const { error } = await supabase
    .from('qa_entries')
    .delete()
    .eq('week_start', weekStart);
  if (error) throw new Error(error.message);
}
