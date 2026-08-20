export interface DailyEntry {
  date: string;
  chats_handled: number;
  emails_handled: number;
  seek_feedback: number;
  tasks_handled: number;
  task_hours_logged: number;
  task_hours_submitted: number;
  internal_notes: number;
  csat_ratings: number[];
  escalations_raised: number;
  escalation_accuracy_pct: number | null;
}

export interface QaEntry {
  week_start: string;
  cases_reviewed: number;
  qa_percentage: number;
  notes: string | null;
  categories: string[];
  created_at: string;
  updated_at: string;
}

export interface CsatNote {
  id: string;
  entry_date: string;
  rating: number;
  note: string | null;
  created_at: string;
}

export interface TaskItem {
  task_id: string;
  source_task_id: string | null;
  brief_explanation: string;
  submit_to: string;
  amount: number | null;
  task_hours: number | null;
  completion_date: string | null;
  status: 'pending' | 'submitted';
  created_at: string;
  submitted_at: string | null;
  linked_date: string;
  additional_info: string | null;
}

export interface CoachingCheckIn {
  checked_at: string;
  prompt: string;
  user_response: string;
  coach_response: string;
}

export interface CoachingPlan {
  id: string;
  status: 'active' | 'paused' | 'completed';
  focus_area: string;
  goal: string;
  why_it_matters: string;
  action_steps: string[];
  cadence_days: number;
  next_follow_up_date: string;
  last_check_in_date: string | null;
  follow_up_prompt: string;
  check_in_history: CoachingCheckIn[];
  source_metric: string | null;
  created_at: string;
  updated_at: string;
}

export interface EscalationItem {
  escalation_id: string;
  case_number: string;
  escalate_to: string;
  reason: string;
  status: 'open' | 'escalated' | 'resolved';
  created_at: string;
  escalated_at: string | null;
  linked_date: string;
  additional_info: string | null;
}

export interface Thresholds {
  S: number;
  A_plus: number;
  A: number;
  B: number;
  C: number;
}

export type Tier = 'S' | 'A_plus' | 'A' | 'B' | 'C' | 'PIP';

export interface KPITarget {
  metric_key: string;
  label: string;
  weight: number;
  direction: 'higher_is_better' | 'lower_is_better';
  thresholds: Thresholds;
}

export interface MetricBreakdown {
  label: string;
  metric_key: string;
  aggregated_value: number | null;
  tier: Tier | null;
  weight_used: number;
}

export interface GradeResult {
  score: number | null;
  grade: Tier | null;
  breakdown: MetricBreakdown[];
}

export type PeriodType = 'today' | 'week' | 'month';

export type MoodType = 'great' | 'good' | 'okay' | 'stressed' | 'overwhelmed';

export interface MoodCheckIn {
  id: string;
  entry_date: string;
  mood: MoodType;
  checkin_type: 'start' | 'reflection';
  created_at: string;
}

export interface Reflection {
  entry_date: string;
  questions: string[];
  answers: string[];
  ai_tips: AiTip[];
  ai_summary: string | null;
  score: number | null;
  grade: Tier | null;
  created_at: string;
}

export interface AiTip {
  metric: string;
  tip: string;
  priority: 'high' | 'medium' | 'low';
}

export interface JournalEntry {
  id: string;
  entry_date: string;
  user_message: string;
  ai_response: string | null;
  category: JournalCategory | null;
  linked_entry_date: string | null;
  created_at: string;
}

export type JournalCategory = 'stress' | 'strength' | 'weakness' | 'win' | 'concern' | 'general';

export interface Insight {
  id: string;
  insight_type: 'pattern' | 'weekly_recap' | 'achievement_unlocked';
  title: string;
  body: string;
  severity: 'info' | 'positive' | 'warning';
  dismissed: boolean;
  created_at: string;
}

export interface Achievement {
  achievement_key: string;
  title: string;
  description: string;
  unlocked_at: string;
}
