import type {
  DailyEntry,
  WeeklyEntry,
  TaskItem,
  EscalationItem,
  KPITarget,
  CoachProfile,
  CoachMemory,
  CsatNote,
  QaEntry,
  CoachingPlan,
  JournalEntry,
  Reflection,
} from './types';
import {
  loadTasks,
  saveTask,
  nextTaskId,
  loadCoachProfile,
  loadCoachMemories,
  loadEntries,
  loadTargets,
} from './storage';
import {
  computeWeightedGrade,
  aggregateEntries,
  computeTaskHoursBacklog,
  formatTierLabel,
} from './grading';
import { recognizePatterns, predictEndOfWeek } from "./aiAgent";
import type { WeeklyForecast, PatternResult } from "./aiAgent";
import { startOfWeekLocal, startOfMonthLocal, workDateLocal } from './dateUtils';

// --- Skill Types ---

export type SkillCategory =
  | 'communication'
  | 'productivity'
  | 'analysis'
  | 'coaching'
  | 'planning';

export interface SkillField {
  name: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'textarea' | 'json';
  required?: boolean;
  defaultValue?: unknown;
  options?: Array<{ label: string; value: string | number }>;
  description?: string;
}

export interface SkillInput {
  params: Record<string, unknown>;
  context?: {
    entries?: DailyEntry[] | Record<string, DailyEntry>;
    weeklyEntries?: Record<string, WeeklyEntry>;
    targets?: KPITarget[];
    tasks?: TaskItem[];
    escalations?: EscalationItem[];
    reflections?: Record<string, Reflection>;
    profile?: CoachProfile | null;
    memories?: CoachMemory[];
    csatNotes?: CsatNote[];
    qaEntries?: Record<string, QaEntry>;
    coachingPlans?: CoachingPlan[];
    journal?: JournalEntry[];
  };
}

export interface SkillOutput {
  success: boolean;
  result?: unknown;
  formattedOutput?: string;
  message?: string;
  data?: Record<string, unknown>;
  error?: string;
}

export interface CopilotSkill {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: SkillCategory;
  execute: (input: SkillInput) => Promise<SkillOutput>;
  inputSchema: { fields: SkillField[] };
}

// --- AI API Client (xAI / Grok) ---

import { aiFetch } from './aiTransport';
import type { OpenAIMessage } from './ai';
const MODEL = 'grok-2-latest';

async function callOpenAI(
  messages: OpenAIMessage[],
  temperature = 0.7,
  maxTokens = 1200,
): Promise<string> {
  const response = await aiFetch({
    model: MODEL,
    messages,
    temperature,
    max_tokens: maxTokens,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    let message = `AI request failed (${response.status})`;
    try {
      const parsed = JSON.parse(errorBody) as { error?: { message?: string } };
      if (parsed.error?.message) message = parsed.error.message;
    } catch {
      // Keep default error message
    }
    if (response.status === 402) {
      throw new Error(
        'xAI (Grok) API credits are running low. Add more credits at https://console.x.ai to keep using the AI copilot.',
      );
    }
    throw new Error(message);
  }

  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new Error('AI provider returned an unexpected response format.');
  }
  return content;
}

function parseJsonObject(raw: string): unknown {
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const start = cleaned.indexOf('{');
  if (start === -1) {
    throw new Error('No JSON object found in AI response.');
  }
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === '{') {
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) {
        return JSON.parse(cleaned.slice(start, i + 1));
      }
    }
  }
  throw new Error('Unbalanced JSON object in AI response.');
}

function buildProfileContext(profile?: CoachProfile | null, memories?: CoachMemory[]): string {
  const prof = profile ?? loadCoachProfile();
  const mems = memories ?? ((() => { try { return loadCoachMemories() as unknown as CoachMemory[]; } catch { return []; } })());
  const parts: string[] = [];

  if (prof) {
    parts.push(
      `User Profile:\n- Role: ${prof.role || 'Not specified'}\n- Main Goal: ${prof.main_goal || 'Not specified'}\n- Style: ${prof.coaching_style}`,
    );
  }
  if (mems && mems.length > 0) {
    parts.push(`User Memories:\n` + mems.slice(0, 10).map((m) => `- ${m.content}`).join('\n'));
  }

  return parts.join('\n\n');
}

function toEntriesArray(
  input?: DailyEntry[] | Record<string, DailyEntry>,
): DailyEntry[] {
  if (!input) return [];
  if (Array.isArray(input)) return [...input];
  return Object.values(input);
}

// --- 1. Email Drafter Skill ---

const emailDrafterSkill: CopilotSkill = {
  id: 'email-drafter',
  name: 'Email Drafter',
  description: 'Drafts professional, well-structured emails for customers, managers, or team members.',
  icon: '📧',
  category: 'communication',
  inputSchema: {
    fields: [
      {
        name: 'recipient',
        label: 'Recipient Type',
        type: 'select',
        required: true,
        defaultValue: 'customer',
        options: [
          { label: 'Customer / External', value: 'customer' },
          { label: 'Manager / Lead', value: 'manager' },
          { label: 'Team / Peer', value: 'team' },
        ],
      },
      {
        name: 'tone',
        label: 'Tone',
        type: 'select',
        required: true,
        defaultValue: 'professional',
        options: [
          { label: 'Formal', value: 'formal' },
          { label: 'Friendly', value: 'friendly' },
          { label: 'Urgent', value: 'urgent' },
          { label: 'Empathetic', value: 'empathetic' },
          { label: 'Professional', value: 'professional' },
        ],
      },
      {
        name: 'context',
        label: 'Email Context / Background',
        type: 'textarea',
        required: true,
        description: 'Provide details about the issue or thread background',
      },
      {
        name: 'keyPoints',
        label: 'Key Points to Include',
        type: 'textarea',
        required: true,
        description: 'Bullet points or specific facts to convey',
      },
    ],
  },
  execute: async (input: SkillInput): Promise<SkillOutput> => {
    try {
      const recipient = String(input.params.recipient ?? 'customer');
      const tone = String(input.params.tone ?? 'professional');
      const context = String(input.params.context ?? '');
      const keyPoints = String(input.params.keyPoints ?? '');

      if (!context.trim() && !keyPoints.trim()) {
        return {
          success: false,
          error: 'Context or key points must be provided.',
          formattedOutput: '⚠️ **Error:** Please provide context or key points for the email.',
        };
      }

      const userProfile = buildProfileContext(input.context?.profile, input.context?.memories);

      const systemPrompt = `You are an expert email drafting copilot. Your task is to draft a complete, clear, and effective email.
Output JSON only with schema:
{
  "subject": "Email subject line",
  "body": "Full body text of the email"
}

Tone: ${tone}
Recipient Type: ${recipient}
${userProfile ? `\nUser Profile Context:\n${userProfile}` : ''}`;

      const userPrompt = `Draft an email with the following details:
Context: ${context}
Key Points: ${keyPoints}`;

      const raw = await callOpenAI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]);

      let subject = 'Draft Email';
      let body = raw;

      try {
        const parsed = parseJsonObject(raw) as { subject?: string; body?: string };
        if (parsed.subject) subject = parsed.subject;
        if (parsed.body) body = parsed.body;
      } catch {
        // Fallback: raw response used as body
      }

      const formattedOutput = `### 📧 Email Draft

**Subject:** ${subject}

---

${body}`;

      return {
        success: true,
        result: { subject, body },
        formattedOutput,
        data: { subject, body, recipient, tone },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: message,
        message,
        formattedOutput: `⚠️ **Error drafting email:** ${message}`,
      };
    }
  },
};

// --- 2. Chat Response Drafter Skill ---

const chatResponseSkill: CopilotSkill = {
  id: 'chat-response',
  name: 'Chat Response Drafter',
  description: 'Generates professional customer chat responses and detects escalation needs.',
  icon: '💬',
  category: 'communication',
  inputSchema: {
    fields: [
      {
        name: 'customerMessage',
        label: 'Customer Message',
        type: 'textarea',
        required: true,
        description: 'Copy and paste the customer message or question',
      },
      {
        name: 'context',
        label: 'Account / Case Context',
        type: 'textarea',
        required: false,
        description: 'Account details, past conversation, or technical notes',
      },
      {
        name: 'desiredOutcome',
        label: 'Desired Outcome / Policy',
        type: 'textarea',
        required: false,
        description: 'The answer or action you need to communicate',
      },
    ],
  },
  execute: async (input: SkillInput): Promise<SkillOutput> => {
    try {
      const customerMessage = String(input.params.customerMessage ?? '');
      const context = String(input.params.context ?? '');
      const desiredOutcome = String(input.params.desiredOutcome ?? '');

      if (!customerMessage.trim()) {
        return {
          success: false,
          error: 'Customer message is required.',
          formattedOutput: '⚠️ **Error:** Please enter the customer message.',
        };
      }

      const systemPrompt = `You are a customer support chat copilot. Draft a professional, clear, and empathetic response.
Also assess whether this issue requires escalation to Tier 2/Manager (e.g. system outages, legal/compliance threats, severe billing bugs, or unresolvable policy conflicts).

Output JSON only with schema:
{
  "response": "Drafted chat reply text",
  "shouldEscalate": boolean,
  "escalationReason": "Reason for escalation or null"
}`;

      const userPrompt = `Customer Message: ${customerMessage}
${context ? `Context: ${context}\n` : ''}${desiredOutcome ? `Desired Outcome: ${desiredOutcome}` : ''}`;

      const raw = await callOpenAI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]);

      let responseText = raw;
      let shouldEscalate = false;
      let escalationReason: string | null = null;

      try {
        const parsed = parseJsonObject(raw) as {
          response?: string;
          shouldEscalate?: boolean;
          escalationReason?: string | null;
        };
        if (parsed.response) responseText = parsed.response;
        if (typeof parsed.shouldEscalate === 'boolean') shouldEscalate = parsed.shouldEscalate;
        if (parsed.escalationReason) escalationReason = parsed.escalationReason;
      } catch {
        // Fallback
      }

      const escalationBanner = shouldEscalate
        ? `\n\n⚠️ **Escalation Recommended:** ${escalationReason ?? 'Requires higher tier intervention.'}`
        : '\n\n✅ **Standard Resolution:** No escalation required.';

      const formattedOutput = `### 💬 Suggested Response

${responseText}${escalationBanner}`;

      return {
        success: true,
        result: { response: responseText, shouldEscalate, escalationReason },
        formattedOutput,
        data: { response: responseText, shouldEscalate, escalationReason },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: message,
        message,
        formattedOutput: `⚠️ **Error drafting chat response:** ${message}`,
      };
    }
  },
};

// --- 3. Daily Log Assistant Skill ---

const dailyLoggerSkill: CopilotSkill = {
  id: 'daily-logger',
  name: 'Daily Log Assistant',
  description: 'Parses natural language notes into structured daily metrics ready to save.',
  icon: '📝',
  category: 'productivity',
  inputSchema: {
    fields: [
      {
        name: 'description',
        label: 'What did you do today?',
        type: 'textarea',
        required: true,
        description: 'e.g. Handled 35 chats, 15 emails, 3 tasks in 4 hours, 6 notes, CSAT ratings 5, 5, 4',
      },
      {
        name: 'date',
        label: 'Entry Date (YYYY-MM-DD)',
        type: 'string',
        required: false,
        description: 'Defaults to today if left blank',
      },
    ],
  },
  execute: async (input: SkillInput): Promise<SkillOutput> => {
    try {
      const description = String(input.params.description ?? '');
      const dateStr = String(input.params.date ?? '').trim() || workDateLocal();

      if (!description.trim()) {
        return {
          success: false,
          error: 'Description is required.',
          formattedOutput: '⚠️ **Error:** Please describe what you did today.',
        };
      }

      const systemPrompt = `You are a productivity metrics parser. Parse natural language work logs into structured JSON metrics.
Output JSON only with schema:
{
  "chats_handled": number,
  "emails_handled": number,
  "seek_feedback": number,
  "tasks_handled": number,
  "task_hours_logged": number,
  "task_hours_submitted": number,
  "internal_notes": number,
  "csat_ratings": number[],
  "escalations_raised": number,
  "escalation_accuracy_pct": number or null
}`;

      const userPrompt = `Description: ${description}`;

      const raw = await callOpenAI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]);

      const parsed = parseJsonObject(raw) as Partial<DailyEntry>;

      const entry: DailyEntry = {
        date: dateStr,
        chats_handled: typeof parsed.chats_handled === 'number' ? parsed.chats_handled : 0,
        emails_handled: typeof parsed.emails_handled === 'number' ? parsed.emails_handled : 0,
        seek_feedback: typeof parsed.seek_feedback === 'number' ? parsed.seek_feedback : 0,
        tasks_handled: typeof parsed.tasks_handled === 'number' ? parsed.tasks_handled : 0,
        task_hours_logged: typeof parsed.task_hours_logged === 'number' ? parsed.task_hours_logged : 0,
        task_hours_submitted: typeof parsed.task_hours_submitted === 'number' ? parsed.task_hours_submitted : 0,
        internal_notes: typeof parsed.internal_notes === 'number' ? parsed.internal_notes : 0,
        csat_ratings: Array.isArray(parsed.csat_ratings) ? parsed.csat_ratings.map(Number) : [],
        escalations_raised: typeof parsed.escalations_raised === 'number' ? parsed.escalations_raised : 0,
        escalation_accuracy_pct: typeof parsed.escalation_accuracy_pct === 'number' ? parsed.escalation_accuracy_pct : null,
      };

      const csatText = entry.csat_ratings.length > 0
        ? entry.csat_ratings.join(', ') + ` (Avg: ${(entry.csat_ratings.reduce((a, b) => a + b, 0) / entry.csat_ratings.length).toFixed(2)})`
        : 'None';

      const formattedOutput = `### 📝 Parsed Daily Entry (${entry.date})

- **Chats Handled:** ${entry.chats_handled}
- **Emails Handled:** ${entry.emails_handled}
- **Tasks Handled:** ${entry.tasks_handled}
- **Task Hours Logged:** ${entry.task_hours_logged}h
- **Task Hours Submitted:** ${entry.task_hours_submitted}h
- **Internal Notes:** ${entry.internal_notes}
- **Escalations Raised:** ${entry.escalations_raised}
- **CSAT Ratings:** ${csatText}

*Ready to save to your daily entries.*`;

      return {
        success: true,
        result: entry,
        formattedOutput,
        data: { entry },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: message,
        message,
        formattedOutput: `⚠️ **Error parsing daily entry:** ${message}`,
      };
    }
  },
};

// --- 4. Productivity Analyzer Skill ---

const productivityAnalyzerSkill: CopilotSkill = {
  id: 'productivity-analyzer',
  name: 'Productivity Analyzer',
  description: 'Analyzes productivity metrics across periods and compares against KPI targets.',
  icon: '📊',
  category: 'analysis',
  inputSchema: {
    fields: [
      {
        name: 'period',
        label: 'Analysis Period',
        type: 'select',
        required: true,
        defaultValue: 'week',
        options: [
          { label: 'Today', value: 'today' },
          { label: 'This Week', value: 'week' },
          { label: 'This Month', value: 'month' },
        ],
      },
    ],
  },
  execute: async (input: SkillInput): Promise<SkillOutput> => {
    try {
      const period = String(input.params.period ?? 'week');
      const allEntriesMap = input.context?.entries ?? (await loadEntries());
      const entries = toEntriesArray(allEntriesMap);
      const targets = input.context?.targets ?? (await loadTargets());

      const today = workDateLocal();
      const startOfWeek = startOfWeekLocal(workDateLocal());
      const startOfMonth = startOfMonthLocal(workDateLocal());

      const filteredEntries = entries.filter((e) => {
        if (period === 'today') return e.date === today;
        if (period === 'week') return e.date >= startOfWeek && e.date <= today;
        if (period === 'month') return e.date >= startOfMonth && e.date <= today;
        return true;
      });

      const gradeResult = computeWeightedGrade(filteredEntries, targets);
      const backlog = computeTaskHoursBacklog(filteredEntries);
      const aggregated = aggregateEntries(filteredEntries);

      const systemPrompt = `You are a senior productivity analyst. Review the user's productivity data for period: ${period}.
Provide concise, constructive insights including:
1. Strengths
2. Areas for improvement
3. Top 2 actionable recommendations.`;

      const userPrompt = `Period: ${period}
Total Entries: ${filteredEntries.length}
Weighted Score: ${gradeResult.score !== null ? gradeResult.score.toFixed(2) : 'N/A'}
Grade: ${gradeResult.grade ? formatTierLabel(gradeResult.grade) : 'N/A'}
Task Hours Backlog: ${backlog.backlog}h (Logged: ${backlog.logged}h, Submitted: ${backlog.submitted}h)
Metrics Breakdown:
${gradeResult.breakdown.map((b) => `- ${b.label}: Value=${b.aggregated_value ?? 'N/A'}, Tier=${b.tier ? formatTierLabel(b.tier) : 'N/A'}`).join('\n')}`;

      const aiAnalysis = await callOpenAI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]);

      const formattedOutput = `### 📊 Productivity Analysis (${period.toUpperCase()})

**Overall Grade:** ${gradeResult.grade ? formatTierLabel(gradeResult.grade) : 'N/A'} (${gradeResult.score !== null ? gradeResult.score.toFixed(2) : 'N/A'}/5.0)

#### 📈 Key Metrics:
- **Productivity Score:** ${aggregated.productivity !== null ? Math.round(Number(aggregated.productivity)) : 'N/A'}
- **Task Hours Backlog:** ${backlog.backlog}h (${backlog.logged}h logged, ${backlog.submitted}h submitted)
- **CSAT Average:** ${aggregated.csat !== null ? Number(aggregated.csat).toFixed(2) : 'N/A'}
- **Escalation Rate:** ${aggregated.esc_rate !== null ? Number(aggregated.esc_rate).toFixed(1) + '%' : 'N/A'}

#### 💡 Copilot Insights:
${aiAnalysis}`;

      return {
        success: true,
        result: { period, gradeResult, backlog, aggregated, aiAnalysis },
        formattedOutput,
        data: { period, score: gradeResult.score, grade: gradeResult.grade, backlog: backlog.backlog },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: message,
        message,
        formattedOutput: `⚠️ **Error analyzing productivity:** ${message}`,
      };
    }
  },
};

// --- 5. Week Predictor Skill ---

const weekPredictorSkill: CopilotSkill = {
  id: 'week-predictor',
  name: 'Week Predictor',
  description: 'Predicts end-of-week performance grade, metrics, and actionable advice.',
  icon: '🔮',
  category: 'planning',
  inputSchema: { fields: [] },
  execute: async (input: SkillInput): Promise<SkillOutput> => {
    try {
      const entriesMap = input.context?.entries ?? (await loadEntries());
      const targets = input.context?.targets ?? (await loadTargets());

      const forecast: WeeklyForecast = await predictEndOfWeek(entriesMap, undefined, targets);

      const tableRows = forecast.breakdown
        .map(
          (b) =>
            `| ${b.label} | ${b.currentValue.toFixed(1)} | ${b.projectedValue.toFixed(1)} | ${b.targetTier ? formatTierLabel(b.targetTier) : 'N/A'} |`,
        )
        .join('\n');

      const formattedOutput = `### 🔮 End-of-Week Forecast

**Predicted Grade:** ${forecast.predictedGrade ? formatTierLabel(forecast.predictedGrade) : 'N/A'} (${forecast.predictedScore !== null ? forecast.predictedScore.toFixed(2) : 'N/A'}/5.0)
**Confidence:** ${forecast.confidence.toUpperCase()} (${forecast.daysCompleted} days completed, ${forecast.daysRemaining} days remaining)

#### 📉 Projected Metrics Table
| Metric | Current | Projected End of Week | Target Tier |
| :--- | :--- | :--- | :--- |
${tableRows}

#### 🎯 Executive Summary & Advice
${forecast.summary}`;

      return {
        success: true,
        result: forecast,
        formattedOutput,
        data: {
          predictedGrade: forecast.predictedGrade,
          predictedScore: forecast.predictedScore,
          confidence: forecast.confidence,
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: message,
        message,
        formattedOutput: `⚠️ **Error predicting week performance:** ${message}`,
      };
    }
  },
};

// --- 6. Coach Check-in Skill ---

const coachCheckinSkill: CopilotSkill = {
  id: 'coach-checkin',
  name: 'Coach Check-in',
  description: 'Generates a personalized coaching session based on mood and what is on your mind.',
  icon: '🧘',
  category: 'coaching',
  inputSchema: {
    fields: [
      {
        name: 'mood',
        label: 'Current Mood',
        type: 'select',
        required: true,
        defaultValue: 'okay',
        options: [
          { label: 'Great 😁', value: 'great' },
          { label: 'Good 🙂', value: 'good' },
          { label: 'Okay 😐', value: 'okay' },
          { label: 'Stressed 😓', value: 'stressed' },
          { label: 'Overwhelmed 🤯', value: 'overwhelmed' },
        ],
      },
      {
        name: 'userThought',
        label: 'What is on your mind?',
        type: 'textarea',
        required: true,
        description: 'Share your current challenge, win, or focus area',
      },
    ],
  },
  execute: async (input: SkillInput): Promise<SkillOutput> => {
    try {
      const mood = String(input.params.mood ?? 'okay');
      const userThought = String(input.params.userThought ?? '');

      if (!userThought.trim()) {
        return {
          success: false,
          error: 'Please share what is on your mind.',
          formattedOutput: '⚠️ **Error:** Please provide what is on your mind for the coaching session.',
        };
      }

      const profileCtx = buildProfileContext(input.context?.profile, input.context?.memories);

      const systemPrompt = `You are a high-performance executive coach.
${profileCtx}

Provide a personalized, encouraging yet direct coaching response.
Output JSON schema:
{
  "coachingResponse": "Main coaching advice and reflection",
  "actionItems": ["Action item 1", "Action item 2"],
  "followUpQuestion": "A targeted question to keep the user focused"
}`;

      const userPrompt = `User Mood: ${mood}
User Thoughts: ${userThought}`;

      const raw = await callOpenAI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]);

      let coachingResponse = raw;
      let actionItems: string[] = [];
      let followUpQuestion = '';

      try {
        const parsed = parseJsonObject(raw) as {
          coachingResponse?: string;
          actionItems?: string[];
          followUpQuestion?: string;
        };
        if (parsed.coachingResponse) coachingResponse = parsed.coachingResponse;
        if (Array.isArray(parsed.actionItems)) actionItems = parsed.actionItems;
        if (parsed.followUpQuestion) followUpQuestion = parsed.followUpQuestion;
      } catch {
        // Fallback
      }

      const actionsText = actionItems.length > 0
        ? `\n\n#### 🎯 Suggested Action Items:\n` + actionItems.map((a) => `- ${a}`).join('\n')
        : '';

      const followUpText = followUpQuestion
        ? `\n\n💬 **Reflection Question:** ${followUpQuestion}`
        : '';

      const formattedOutput = `### 🧘 Coaching Check-in

${coachingResponse}${actionsText}${followUpText}`;

      return {
        success: true,
        result: { coachingResponse, actionItems, followUpQuestion },
        formattedOutput,
        data: { mood, coachingResponse, actionItems, followUpQuestion },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: message,
        message,
        formattedOutput: `⚠️ **Error during coach check-in:** ${message}`,
      };
    }
  },
};

// --- 7. Task Manager Skill ---

const taskManagerSkill: CopilotSkill = {
  id: 'task-manager',
  name: 'Task Manager',
  description: 'Creates, lists, submits, or prioritizes tasks in Supabase.',
  icon: '✅',
  category: 'productivity',
  inputSchema: {
    fields: [
      {
        name: 'action',
        label: 'Action',
        type: 'select',
        required: true,
        defaultValue: 'list',
        options: [
          { label: 'List Tasks', value: 'list' },
          { label: 'Create Task', value: 'create' },
          { label: 'Submit Task', value: 'submit' },
          { label: 'Prioritize Pending Tasks', value: 'prioritize' },
        ],
      },
      {
        name: 'explanation',
        label: 'Task Explanation',
        type: 'textarea',
        required: false,
        description: 'Brief description for Create Task',
      },
      {
        name: 'submitTo',
        label: 'Submit To / System',
        type: 'string',
        required: false,
        description: 'Recipient or system (e.g. Jira, Manager)',
      },
      {
        name: 'hours',
        label: 'Task Hours',
        type: 'number',
        required: false,
        description: 'Hours spent or estimated',
      },
      {
        name: 'taskId',
        label: 'Task ID (for submit action)',
        type: 'string',
        required: false,
        description: 'ID of task to submit (e.g. TASK-1001)',
      },
    ],
  },
  execute: async (input: SkillInput): Promise<SkillOutput> => {
    try {
      const action = String(input.params.action ?? 'list');
      const existingTasks = input.context?.tasks ?? (await loadTasks());

      if (action === 'list') {
        const pending = existingTasks.filter((t) => t.status === 'pending');
        const submitted = existingTasks.filter((t) => t.status === 'submitted');

        const pendingList = pending.length > 0
          ? pending.map((t) => `- **${t.task_id}**: ${t.brief_explanation} (${t.task_hours ?? 0}h) -> Submit to: ${t.submit_to}`).join('\n')
          : '*No pending tasks.*';

        const submittedList = submitted.length > 0
          ? submitted.slice(0, 5).map((t) => `- **${t.task_id}**: ${t.brief_explanation} (Submitted: ${t.submitted_at ? t.submitted_at.slice(0, 10) : 'Done'})`).join('\n')
          : '*No submitted tasks recently.*';

        const formattedOutput = `### ✅ Task Manager - Current Tasks

#### ⏳ Pending Tasks (${pending.length})
${pendingList}

#### 🎉 Recently Submitted Tasks (${submitted.length})
${submittedList}`;

        return {
          success: true,
          result: { pending, submitted },
          formattedOutput,
          data: { pendingCount: pending.length, submittedCount: submitted.length },
        };
      }

      if (action === 'create') {
        const explanation = String(input.params.explanation ?? '').trim();
        const submitTo = String(input.params.submitTo ?? 'General Queue').trim();
        const hours = typeof input.params.hours === 'number' ? input.params.hours : Number(input.params.hours ?? 1);

        if (!explanation) {
          return {
            success: false,
            error: 'Task explanation is required to create a task.',
            formattedOutput: '⚠️ **Error:** Please provide a brief explanation for the task.',
          };
        }

        const taskId = nextTaskId(existingTasks.length);
        const newTask: TaskItem = {
          task_id: taskId,
          source_task_id: null,
          brief_explanation: explanation,
          submit_to: submitTo,
          amount: null,
          task_hours: isNaN(hours) ? 1 : hours,
          completion_date: null,
          status: 'pending',
          created_at: new Date().toISOString(),
          submitted_at: null,
          linked_date: workDateLocal(),
          additional_info: null,
        };

        await saveTask(newTask);

        const formattedOutput = `### ✅ Task Created Successfully!

- **Task ID:** ${newTask.task_id}
- **Description:** ${newTask.brief_explanation}
- **Submit To:** ${newTask.submit_to}
- **Hours:** ${newTask.task_hours}h
- **Status:** Pending`;

        return {
          success: true,
          result: newTask,
          formattedOutput,
          data: { task: newTask },
        };
      }

      if (action === 'submit') {
        const taskId = String(input.params.taskId ?? '').trim();
        if (!taskId) {
          return {
            success: false,
            error: 'Task ID is required for submit action.',
            formattedOutput: '⚠️ **Error:** Please provide a Task ID to submit.',
          };
        }

        const targetTask = existingTasks.find((t) => t.task_id.toLowerCase() === taskId.toLowerCase());
        if (!targetTask) {
          return {
            success: false,
            error: `Task ${taskId} not found.`,
            formattedOutput: `⚠️ **Error:** Task ID \`${taskId}\` was not found.`,
          };
        }

        const updatedTask: TaskItem = {
          ...targetTask,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          completion_date: workDateLocal(),
        };

        await saveTask(updatedTask);

        const formattedOutput = `### 🎉 Task Submitted!

- **Task ID:** ${updatedTask.task_id}
- **Description:** ${updatedTask.brief_explanation}
- **Submitted At:** ${updatedTask.submitted_at?.slice(0, 19).replace('T', ' ')}
- **Status:** Submitted`;

        return {
          success: true,
          result: updatedTask,
          formattedOutput,
          data: { task: updatedTask },
        };
      }

      if (action === 'prioritize') {
        const pending = existingTasks.filter((t) => t.status === 'pending');
        if (pending.length === 0) {
          return {
            success: true,
            result: [],
            formattedOutput: '✅ **No pending tasks to prioritize!**',
          };
        }

        const systemPrompt = `You are an executive assistant copilot. Prioritize the user's pending tasks.
Provide a ranked order with brief justification for each task.`;

        const userPrompt = `Pending Tasks:\n` + pending.map((t) => `- ID: ${t.task_id}, Description: ${t.brief_explanation}, Hours: ${t.task_hours}h, Submit To: ${t.submit_to}`).join('\n');

        const aiPrioritization = await callOpenAI([
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ]);

        const formattedOutput = `### 🔝 Task Prioritization Recommendations

${aiPrioritization}`;

        return {
          success: true,
          result: { pending, prioritization: aiPrioritization },
          formattedOutput,
          data: { pendingCount: pending.length },
        };
      }

      return {
        success: false,
        error: `Unknown action ${action}`,
        formattedOutput: `⚠️ **Error:** Unknown task manager action: ${action}`,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: message,
        message,
        formattedOutput: `⚠️ **Error executing task manager:** ${message}`,
      };
    }
  },
};

// --- 8. Pattern Detective Skill ---

const patternDetectiveSkill: CopilotSkill = {
  id: 'pattern-detective',
  name: 'Pattern Detective',
  description: 'Uncovers statistical correlations and behavioral patterns in your workspace data.',
  icon: '🔍',
  category: 'analysis',
  inputSchema: { fields: [] },
  execute: async (input: SkillInput): Promise<SkillOutput> => {
    try {
      const entriesMap = input.context?.entries ?? (await loadEntries());
      const tasks = input.context?.tasks ?? (await loadTasks());
      const targets = input.context?.targets ?? (await loadTargets());

      const patterns: PatternResult[] = await recognizePatterns(entriesMap, tasks, targets);

      if (patterns.length === 0) {
        return {
          success: true,
          result: [],
          formattedOutput: `### 🔍 Pattern Detective

No strong statistical patterns detected yet. Log a few more daily entries and tasks to reveal deeper correlations!`,
        };
      }

      const patternBlocks = patterns
        .map(
          (p) =>
            `#### ${p.impact === 'positive' ? '🟢' : p.impact === 'negative' ? '🔴' : '🔵'} ${p.title}
- **Description:** ${p.description}
- **Confidence:** ${Math.round(p.confidence * 100)}%
${p.recommendation ? `- **Recommendation:** ${p.recommendation}` : ''}`,
        )
        .join('\n\n');

      const formattedOutput = `### 🔍 Pattern Detective Insights

Found **${patterns.length}** behavioral patterns in your data:

${patternBlocks}`;

      return {
        success: true,
        result: patterns,
        formattedOutput,
        data: { patternCount: patterns.length, patterns },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: message,
        message,
        formattedOutput: `⚠️ **Error detecting patterns:** ${message}`,
      };
    }
  },
};

// --- Exports ---

export const COPILOT_SKILLS: CopilotSkill[] = [
  emailDrafterSkill,
  chatResponseSkill,
  dailyLoggerSkill,
  productivityAnalyzerSkill,
  weekPredictorSkill,
  coachCheckinSkill,
  taskManagerSkill,
  patternDetectiveSkill,
];

export function getSkillById(id: string): CopilotSkill | undefined {
  return COPILOT_SKILLS.find((skill) => skill.id === id);
}

export function getSkillsByCategory(category: string): CopilotSkill[] {
  return COPILOT_SKILLS.filter((skill) => skill.category === category);
}
