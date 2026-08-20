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
  CoachingPlan,
  CoachProfile,
} from './types';
import { DEFAULT_KPI_TARGETS, makeEmptyEntry } from './defaults';

function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export { genId };

// --- Daily Entries ---

function normalizeEntry(date: string, raw: Record<string, unknown>): DailyEntry {
  const base = makeEmptyEntry(date);
  return {
    date,
    chats_handled: typeof raw.chats_handled === 'number' ? raw.chats_handled : base.chats_handled,
    emails_handled: typeof raw.emails_handled === 'number' ? raw.emails_handled : base.emails_handled,
    seek_feedback: typeof raw.seek_feedback === 'number' ? raw.seek_feedback : base.seek_feedback,
    tasks_handled: typeof raw.tasks_handled === 'number' ? raw.tasks_handled : base.tasks_handled,
    task_hours_logged: typeof raw.task_hours_logged === 'number' ? raw.task_hours_logged : base.task_hours_logged,
    task_hours_submitted: typeof raw.task_hours_submitted === 'number' ? raw.task_hours_submitted : base.task_hours_submitted,
    internal_notes: typeof raw.internal_notes === 'number' ? raw.internal_notes : base.internal_notes,
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
  const { error } = await supabase.from('daily_entries').upsert({
    date,
    chats_handled: entry.chats_handled,
    emails_handled: entry.emails_handled,
    seek_feedback: entry.seek_feedback,
    tasks_handled: entry.tasks_handled,
    task_hours_logged: entry.task_hours_logged,
    task_hours_submitted: entry.task_hours_submitted,
    internal_notes: entry.internal_notes,
    csat_ratings: entry.csat_ratings,
    escalations_raised: entry.escalations_raised,
    escalation_accuracy_pct: entry.escalation_accuracy_pct,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

// --- CSAT Notes ---

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

// --- Tasks ---

export async function loadTasks(): Promise<TaskItem[]> {
  const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    task_id: r.task_id,
    source_task_id: r.source_task_id ?? null,
    brief_explanation: r.brief_explanation,
    submit_to: r.submit_to,
    amount: r.amount,
    task_hours: r.task_hours,
    completion_date: r.completion_date ?? null,
    status: r.status,
    created_at: r.created_at,
    submitted_at: r.submitted_at,
    linked_date: r.linked_date,
    additional_info: r.additional_info,
  }));
}

export async function saveTask(task: TaskItem): Promise<void> {
  const { error } = await supabase.from('tasks').upsert({
    task_id: task.task_id,
    source_task_id: task.source_task_id,
    brief_explanation: task.brief_explanation,
    submit_to: task.submit_to,
    amount: task.amount,
    task_hours: task.task_hours,
    completion_date: task.completion_date,
    status: task.status,
    created_at: task.created_at,
    submitted_at: task.submitted_at,
    linked_date: task.linked_date,
    additional_info: task.additional_info,
  });
  if (error) throw error;
}

export async function deleteTask(task_id: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('task_id', task_id);
  if (error) throw error;
}

// --- Escalations ---

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

// --- KPI Targets ---

export async function loadTargets(): Promise<KPITarget[]> {
  const { data, error } = await supabase.from('kpi_targets').select('*');
  if (error) throw error;
  if (!data || data.length === 0) return DEFAULT_KPI_TARGETS;
  const supported = new Set(DEFAULT_KPI_TARGETS.map((target) => target.metric_key));
  const filtered = data.filter((r) => supported.has(r.metric_key));
  if (filtered.length === 0) return DEFAULT_KPI_TARGETS;
  return filtered.map((r) => ({
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

// --- Mood Check-ins ---

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

// --- Reflections ---

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

// --- Journal ---

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

// --- Insights ---

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

// --- Achievements ---

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

// --- AI Engine API Key (stays in localStorage — client-side secret) ---

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

// --- Coach Profile (stays in localStorage — personal coaching context) ---

export function loadCoachProfile(): CoachProfile | null {
  try {
    const raw = localStorage.getItem('pg_coach_profile');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CoachProfile;
    if (typeof parsed !== 'object' || parsed === null) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveCoachProfile(profile: CoachProfile): void {
  try {
    localStorage.setItem('pg_coach_profile', JSON.stringify(profile));
  } catch {
    // non-fatal
  }
}

export function clearCoachProfile(): void {
  try {
    localStorage.removeItem('pg_coach_profile');
  } catch {
    // non-fatal
  }
}

// --- Counters (stored as single-row metadata) ---

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
      categories: Array.isArray(row.categories) ? (row.categories as string[]) : [],
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
      categories: entry.categories ?? [],
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

// --- Coaching Plans ---

function normalizeCheckIns(raw: unknown): CoachingPlan['check_in_history'] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((item) => ({
      checked_at: typeof item.checked_at === 'string' ? item.checked_at : new Date().toISOString(),
      prompt: typeof item.prompt === 'string' ? item.prompt : '',
      user_response: typeof item.user_response === 'string' ? item.user_response : '',
      coach_response: typeof item.coach_response === 'string' ? item.coach_response : '',
    }));
}

export async function loadCoachingPlans(): Promise<CoachingPlan[]> {
  const { data, error } = await supabase
    .from('coaching_plans')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    status: r.status,
    focus_area: r.focus_area,
    goal: r.goal,
    why_it_matters: r.why_it_matters,
    action_steps: Array.isArray(r.action_steps) ? (r.action_steps as string[]) : [],
    cadence_days: Number(r.cadence_days ?? 3),
    next_follow_up_date: r.next_follow_up_date,
    last_check_in_date: r.last_check_in_date ?? null,
    follow_up_prompt: typeof r.follow_up_prompt === 'string' ? r.follow_up_prompt : '',
    check_in_history: normalizeCheckIns(r.check_in_history),
    source_metric: r.source_metric ?? null,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));
}

export async function saveCoachingPlan(plan: CoachingPlan): Promise<void> {
  const { error } = await supabase.from('coaching_plans').upsert({
    id: plan.id,
    status: plan.status,
    focus_area: plan.focus_area,
    goal: plan.goal,
    why_it_matters: plan.why_it_matters,
    action_steps: plan.action_steps,
    cadence_days: plan.cadence_days,
    next_follow_up_date: plan.next_follow_up_date,
    last_check_in_date: plan.last_check_in_date,
    follow_up_prompt: plan.follow_up_prompt,
    check_in_history: plan.check_in_history,
    source_metric: plan.source_metric,
    created_at: plan.created_at,
    updated_at: plan.updated_at,
  });
  if (error) throw error;
}

export async function deleteCoachingPlan(id: string): Promise<void> {
  const { error } = await supabase.from('coaching_plans').delete().eq('id', id);
  if (error) throw error;
}
