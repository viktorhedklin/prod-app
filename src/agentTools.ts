/**
 * VESPER Agent Tools
 *
 * The copilot's hands. OpenAI-style function schemas the model sees, plus
 * executors wired to the app's AppContext (which persists to Supabase) and the
 * VESPER Mind orb store. This is what lets the copilot BUILD, CONNECT, EDIT,
 * and IMPROVE — on command, unlimited.
 */

import type { AppContextValue } from './AppContext';
import type { JournalEntry, CoachProfile, CoachingPlan } from './types';
import {
  addKnowledgeNode,
  connectKnowledgeNodes,
  editKnowledgeNode,
  queryKnowledge,
  getKnowledgeGraph,
  reinforceKnowledge,
} from './orbStore';
import { workDateLocal, todayLocal } from './dateUtils';
import { generateCoachingPlan, generateCoachingFollowUp } from './ai';

function addDays(d: Date, days: number): Date {
  const nd = new Date(d);
  nd.setDate(nd.getDate() + days);
  return nd;
}

import { computeWeightedGrade, computeTaskHoursBacklog } from './grading';
import { startOfWeekLocal } from './dateUtils';

// ---------------------------------------------------------------------------
// Schema (OpenAI function-calling format — Groq & xAI compatible)
// ---------------------------------------------------------------------------

export interface ToolSchema {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export const VESPER_TOOLS: ToolSchema[] = [
  {
    type: 'function',
    function: {
      name: 'list_tasks',
      description:
        "List the user's shift tasks. Filter by status ('pending' or 'submitted') or leave empty for all.",
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['pending', 'submitted'] },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_task',
      description:
        'Create a new task in the shift todo list. Dates default to the current SGT work date.',
      parameters: {
        type: 'object',
        properties: {
          brief: { type: 'string', description: 'Task name / brief explanation' },
          submit_to: { type: 'string', description: 'Who it is submitted to (e.g. besson)' },
          task_hours: { type: 'number', description: 'Hours the task took (e.g. 0.5)' },
          details: { type: 'string', description: 'Optional additional info' },
          linked_date: { type: 'string', description: 'YYYY-MM-DD SGT work date (optional)' },
          submit: { type: 'boolean', description: 'Also mark it submitted immediately (default false)' },
        },
        required: ['brief'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_task',
      description:
        'Update an existing task by task_id (e.g. TSK-0019). Can change brief, hours, status, linked date, details.',
      parameters: {
        type: 'object',
        properties: {
          task_id: { type: 'string' },
          brief: { type: 'string' },
          task_hours: { type: 'number' },
          status: { type: 'string', enum: ['pending', 'submitted'] },
          linked_date: { type: 'string', description: 'YYYY-MM-DD' },
          details: { type: 'string' },
          submit_to: { type: 'string' },
        },
        required: ['task_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_task',
      description: 'Delete a task by task_id. Use with care — confirm with the user first.',
      parameters: {
        type: 'object',
        properties: { task_id: { type: 'string' } },
        required: ['task_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_escalations',
      description: "List the user's escalations, optionally filtered by status.",
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['open', 'escalated', 'resolved'] },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_escalation',
      description: 'Log a new escalation (case number, who it goes to, reason).',
      parameters: {
        type: 'object',
        properties: {
          case_number: { type: 'string' },
          escalate_to: { type: 'string' },
          reason: { type: 'string' },
          details: { type: 'string' },
        },
        required: ['case_number', 'escalate_to', 'reason'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_escalation',
      description: "Update an escalation's status or details by escalation_id.",
      parameters: {
        type: 'object',
        properties: {
          escalation_id: { type: 'string' },
          status: { type: 'string', enum: ['open', 'escalated', 'resolved'] },
          reason: { type: 'string' },
        },
        required: ['escalation_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_escalation',
      description: 'Delete an escalation by escalation_id. Confirm with the user first.',
      parameters: {
        type: 'object',
        properties: { escalation_id: { type: 'string' } },
        required: ['escalation_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'log_metrics',
      description:
        'Log today\'s (or a given date\'s) metrics: chats, emails, tasks handled, internal notes, escalation accuracy. Only provided fields are updated.',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'YYYY-MM-DD SGT work date (default: today)' },
          chats_handled: { type: 'number' },
          emails_handled: { type: 'number' },
          tasks_handled: { type: 'number' },
          internal_notes: { type: 'number' },
          escalations_raised: { type: 'number' },
          escalation_accuracy_pct: { type: 'number', description: '0-100' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'log_csat',
      description: 'Log a CSAT rating (1-5) for a date, with optional customer note.',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'YYYY-MM-DD SGT work date (default: today)' },
          rating: { type: 'number', minimum: 1, maximum: 5 },
          note: { type: 'string' },
        },
        required: ['rating'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_day_summary',
      description:
        'Read the full daily entry + tasks for a SGT work date (default: today).',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'YYYY-MM-DD (default: today)' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_stats',
      description:
        'Read overall stats: weekly weighted grade, tier, task backlog, pending count, streak. No parameters.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_coaching_status',
      description:
        'Read the coaching brain: coach profile, active coaching plans, due follow-ups, and recent coach memories. No parameters.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_coach_profile',
      description:
        'Create or update the coaching profile (who the user is, goals, strengths, struggles, motivation, preferred coaching style). Only provided fields change.',
      parameters: {
        type: 'object',
        properties: {
          role: { type: 'string' },
          main_goal: { type: 'string' },
          big_goal: { type: 'string' },
          strengths: { type: 'string' },
          struggles: { type: 'string' },
          stress_sources: { type: 'string' },
          motivation: { type: 'string' },
          demotivators: { type: 'string' },
          context: { type: 'string' },
          coaching_style: { type: 'string', enum: ['push', 'encourage', 'balanced'] },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'coach_remember',
      description:
        'Store a durable coaching memory about the user (routines, reactions, what coaching works). This persists across sessions.',
      parameters: {
        type: 'object',
        properties: { content: { type: 'string' } },
        required: ['content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'journal_write',
      description:
        'Write a journal entry on behalf of the user (after they tell you about their day, mood, wins, or frustrations).',
      parameters: {
        type: 'object',
        properties: {
          content: { type: 'string' },
          category: { type: 'string', enum: ['stress', 'strength', 'weakness', 'win', 'concern', 'general'] },
        },
        required: ['content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'journal_read',
      description:
        'Read recent journal entries (most recent N, default 5) to ground coaching in how the user has been feeling.',
      parameters: {
        type: 'object',
        properties: { limit: { type: 'number' } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_coaching_plan',
      description:
        'Analyze recent performance data and generate a personalized coaching plan (AI-drafted). Use when the user asks to be coached on something, wants a growth plan, or agrees a plan is needed. Returns the plan; it is saved automatically.',
      parameters: {
        type: 'object',
        properties: {
          focus_area_hint: {
            type: 'string',
            description: 'Optional: what the user wants to focus on (e.g. "CSAT", "backlog"). Omit to let the data pick the weakest metric.',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'coaching_check_in',
      description:
        'Run an AI coaching follow-up for an active plan: pass the user\'s update and get a coach response + updated plan schedule.',
      parameters: {
        type: 'object',
        properties: {
          plan_id: { type: 'string' },
          user_response: { type: 'string', description: 'The user\'s update since the last check-in' },
        },
        required: ['plan_id', 'user_response'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'remember_fact',
      description:
        'Save a durable memory about the user (preferences, routines, context) so it persists across sessions.',
      parameters: {
        type: 'object',
        properties: { content: { type: 'string' } },
        required: ['content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_insight',
      description:
        'Record a pattern or self-improvement insight generated from the user\'s data.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          body: { type: 'string' },
          severity: { type: 'string', enum: ['info', 'positive', 'warning'] },
        },
        required: ['title', 'body'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'orb_add_node',
      description:
        'Build a new node in your Knowledge Orb (your long-term mind). Types: learned (fact learned from chat), memory (about the user), insight (pattern), bybit (reference knowledge).',
      parameters: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          type: { type: 'string', enum: ['learned', 'memory', 'insight', 'bybit'] },
          content: { type: 'string' },
          connect_to_labels: {
            type: 'array',
            items: { type: 'string' },
            description: 'Labels of existing nodes to connect to',
          },
        },
        required: ['label', 'type', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'orb_connect',
      description: 'Connect two existing nodes in your Knowledge Orb by their labels.',
      parameters: {
        type: 'object',
        properties: {
          from_label: { type: 'string' },
          to_label: { type: 'string' },
          relation: { type: 'string', description: 'e.g. related, causes, supports' },
        },
        required: ['from_label', 'to_label'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'orb_edit',
      description: 'Improve/edit an existing Knowledge Orb node by its label.',
      parameters: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          new_label: { type: 'string' },
          new_content: { type: 'string' },
        },
        required: ['label'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'orb_search',
      description: 'Search your Knowledge Orb for relevant knowledge.',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string' } },
        required: ['query'],
      },
    },
  },
];

// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------

function findNodeByLabel(label: string) {
  const { nodes } = getKnowledgeGraph();
  const lower = label.toLowerCase().trim();
  return (
    nodes.find((n) => n.label.toLowerCase() === lower) ??
    nodes.find((n) => n.label.toLowerCase().includes(lower))
  );
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Execute a tool call. Returns a human/LLM-readable result string.
 * `ctx` is the live app context — every mutation goes through the app's own
 * actions, so Supabase persistence + UI toasts happen automatically.
 */
export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  ctx: AppContextValue,
): Promise<string> {
  try {
    switch (name) {
      case 'list_tasks': {
        const status = args.status as string | undefined;
        const tasks = ctx.tasks.filter((t) => !status || t.status === status);
        if (tasks.length === 0) return `No tasks${status ? ` with status '${status}'` : ''}.`;
        return tasks
          .map(
            (t) =>
              `${t.task_id}: ${t.brief_explanation} | ${t.task_hours}h | ${t.status} | date ${t.linked_date}`,
          )
          .join('\n');
      }
      case 'create_task': {
        const brief = String(args.brief ?? '');
        if (!brief) return 'Error: brief is required.';
        const date = (args.linked_date as string) || workDateLocal();
        ctx.addTask({
          brief_explanation: brief,
          submit_to: (args.submit_to as string) || 'besson',
          task_hours: typeof args.task_hours === 'number' ? args.task_hours : 0.5,
          status: args.submit ? 'submitted' : 'pending',
          completion_date: date,
          linked_date: date,
          additional_info: (args.details as string) ?? null,
          source_task_id: null,
          amount: null,
        });
        const created = ctx.tasks.length;
        return `Task "${brief}" created${args.submit ? ' and submitted' : ' (pending)'} for ${date}. The Tasks page now has ${created + 1} tasks.`;
      }
      case 'update_task': {
        const id = String(args.task_id ?? '');
        const t = ctx.tasks.find((x) => x.task_id === id);
        if (!t) return `Error: task ${id} not found.`;
        const patch: Record<string, unknown> = {};
        if (args.brief) patch.brief_explanation = args.brief;
        if (typeof args.task_hours === 'number') patch.task_hours = args.task_hours;
        if (args.status) patch.status = args.status;
        if (args.linked_date) patch.linked_date = args.linked_date;
        if (args.details !== undefined) patch.additional_info = args.details;
        if (args.submit_to) patch.submit_to = args.submit_to;
        ctx.updateTask(id, patch);
        return `Task ${id} updated: ${Object.keys(patch).join(', ')}.`;
      }
      case 'delete_task': {
        const id = String(args.task_id ?? '');
        if (!ctx.tasks.some((x) => x.task_id === id))
          return `Error: task ${id} not found.`;
        ctx.removeTask(id);
        return `Task ${id} deleted.`;
      }
      case 'list_escalations': {
        const status = args.status as string | undefined;
        const escs = ctx.escalations.filter((e) => !status || e.status === status);
        if (escs.length === 0) return `No escalations${status ? ` with status '${status}'` : ''}.`;
        return escs
          .map(
            (e) =>
              `${e.escalation_id}: case ${e.case_number} → ${e.escalate_to} | ${e.status} | ${e.reason}`,
          )
          .join('\n');
      }
      case 'create_escalation': {
        const date = workDateLocal();
        ctx.addEscalation({
          case_number: String(args.case_number ?? ''),
          escalate_to: String(args.escalate_to ?? ''),
          reason: String(args.reason ?? ''),
          status: 'open',
          linked_date: date,
          additional_info: (args.details as string) ?? null,
        });
        return `Escalation for case ${args.case_number} logged (open).`;
      }
      case 'update_escalation': {
        const id = String(args.escalation_id ?? '');
        if (!ctx.escalations.some((e) => e.escalation_id === id))
          return `Error: escalation ${id} not found.`;
        const patch: Record<string, unknown> = {};
        if (args.status) patch.status = args.status;
        if (args.reason) patch.reason = args.reason;
        ctx.updateEscalation(id, patch);
        return `Escalation ${id} updated: ${Object.keys(patch).join(', ')}.`;
      }
      case 'delete_escalation': {
        const id = String(args.escalation_id ?? '');
        if (!ctx.escalations.some((e) => e.escalation_id === id))
          return `Error: escalation ${id} not found.`;
        ctx.removeEscalation(id);
        return `Escalation ${id} deleted.`;
      }
      case 'log_metrics': {
        const date = (args.date as string) || workDateLocal();
        const patch: Record<string, number> = {};
        for (const k of [
          'chats_handled',
          'emails_handled',
          'tasks_handled',
          'internal_notes',
          'escalations_raised',
        ]) {
          if (typeof args[k] === 'number') patch[k] = args[k] as number;
        }
        if (typeof args.escalation_accuracy_pct === 'number') {
          patch.escalation_accuracy_pct = args.escalation_accuracy_pct as number;
        }
        if (Object.keys(patch).length === 0) return 'No metrics provided — nothing logged.';
        ctx.updateEntry(date, patch);
        return `Metrics logged for ${date}: ${Object.entries(patch)
          .map(([k, v]) => `${k}=${v}`)
          .join(', ')}.`;
      }
      case 'log_csat': {
        const date = (args.date as string) || workDateLocal();
        const rating = Number(args.rating ?? 0);
        if (rating < 1 || rating > 5) return 'Error: CSAT rating must be 1-5.';
        ctx.addCsatNote(date, rating, (args.note as string) ?? null);
        return `CSAT ${rating}/5 logged for ${date}.`;
      }
      case 'get_day_summary': {
        const date = (args.date as string) || workDateLocal();
        const entry = ctx.entries[date];
        const tasks = ctx.tasks.filter((t) => t.linked_date === date);
        const e = entry
          ? `Metrics — chats: ${entry.chats_handled}, emails: ${entry.emails_handled}, tasks handled: ${entry.tasks_handled}, notes: ${entry.internal_notes}, esc raised: ${entry.escalations_raised}, esc accuracy: ${entry.escalation_accuracy_pct ?? '—'}%, CSAT avg: ${
              entry.csat_ratings.length
                ? (entry.csat_ratings.reduce((a, b) => a + b, 0) / entry.csat_ratings.length).toFixed(1)
                : '—'
            }`
          : 'No metrics logged for this date yet.';
        const t =
          tasks.length > 0
            ? tasks.map((x) => `${x.task_id}: ${x.brief_explanation} (${x.status}, ${x.task_hours}h)`).join('\n')
            : 'No tasks linked to this date.';
        return `Day ${date}:\n${e}\nTasks:\n${t}`;
      }
      case 'get_stats': {
        const weekStart = startOfWeekLocal(new Date());
        const weekDates: string[] = [];
        for (let i = 0; i < 7; i++) {
          const d = new Date(weekStart);
          d.setDate(d.getDate() + i);
          weekDates.push(isoDate(d));
        }
        const weekEntries = weekDates
          .map((d) => ctx.entries[d])
          .filter((e): e is NonNullable<typeof e> => Boolean(e));
        const grade = computeWeightedGrade(weekEntries, ctx.targets, null);
        const hours = computeTaskHoursBacklog(weekEntries);
        const pending = ctx.tasks.filter((t) => t.status === 'pending').length;
        const open = ctx.escalations.filter((e) => e.status === 'open').length;
        return `Weekly composite: ${grade.score !== null ? grade.score.toFixed(2) : '—'} / 5.0${
          grade.grade ? ` (Tier ${grade.grade})` : ''
        }. Pending tasks: ${pending}. Open escalations: ${open}. This week: ${hours.logged.toFixed(1)}h logged, ${hours.submitted.toFixed(1)}h submitted.`;
      }
      case 'get_coaching_status': {
        const profile = ctx.coachProfile;
        const plans = ctx.coachingPlans ?? [];
        const active = plans.filter((p) => p.status === 'active');
        const due = active.filter(
          (p) => p.next_follow_up_date && p.next_follow_up_date <= todayLocal(),
        );
        const recentMemories = (ctx.coachMemories ?? []).slice(0, 8);
        return JSON.stringify({
          profile: profile
            ? {
                role: profile.role,
                main_goal: profile.main_goal,
                big_goal: profile.big_goal,
                strengths: profile.strengths,
                struggles: profile.struggles,
                stress_sources: profile.stress_sources,
                motivation: profile.motivation,
                demotivators: profile.demotivators,
                coaching_style: profile.coaching_style,
                context: profile.context,
                onboarding_complete: profile.onboarding_complete,
              }
            : null,
          active_plans: active.map((p) => ({
            id: p.id,
            goal: p.goal,
            focus_area: p.focus_area,
            why_it_matters: p.why_it_matters,
            action_steps: p.action_steps,
            cadence_days: p.cadence_days,
            next_follow_up_date: p.next_follow_up_date,
            follow_up_prompt: p.follow_up_prompt,
          })),
          due_follow_ups: due.length,
          recent_coach_memories: recentMemories.map((m) => m.content),
        });
      }
      case 'update_coach_profile': {
        const base: CoachProfile = ctx.coachProfile ?? {
          role: '',
          main_goal: '',
          big_goal: '',
          strengths: '',
          struggles: '',
          stress_sources: '',
          motivation: '',
          demotivators: '',
          coaching_style: 'balanced',
          context: '',
          onboarding_complete: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        const merged: CoachProfile = {
          ...base,
          ...(args.role !== undefined ? { role: String(args.role) } : {}),
          ...(args.main_goal !== undefined ? { main_goal: String(args.main_goal) } : {}),
          ...(args.big_goal !== undefined ? { big_goal: String(args.big_goal) } : {}),
          ...(args.strengths !== undefined ? { strengths: String(args.strengths) } : {}),
          ...(args.struggles !== undefined ? { struggles: String(args.struggles) } : {}),
          ...(args.stress_sources !== undefined ? { stress_sources: String(args.stress_sources) } : {}),
          ...(args.motivation !== undefined ? { motivation: String(args.motivation) } : {}),
          ...(args.demotivators !== undefined ? { demotivators: String(args.demotivators) } : {}),
          ...(args.coaching_style === 'push' || args.coaching_style === 'encourage' || args.coaching_style === 'balanced'
            ? { coaching_style: args.coaching_style }
            : {}),
          ...(args.context !== undefined ? { context: String(args.context) } : {}),
          onboarding_complete: true,
          updated_at: new Date().toISOString(),
        };
        ctx.updateCoachProfile(merged);
        return `Coaching profile updated: role="${merged.role}", main goal="${merged.main_goal}", style=${merged.coaching_style}.`;
      }
      case 'coach_remember': {
        const content = String(args.content ?? '').trim();
        if (!content) return 'Error: content is required.';
        ctx.remember(content, 'copilot');
        return `Coaching memory stored: "${content.slice(0, 80)}"`;
      }
      case 'journal_write': {
        const content = String(args.content ?? '').trim();
        if (!content) return 'Error: content is required.';
        const entry = ctx.addJournalEntry({
          entry_date: todayLocal(),
          user_message: content,
          ai_response: null,
          category: (typeof args.category === 'string' ? args.category : 'general') as JournalEntry['category'],
          linked_entry_date: null,
        });
        return `Journal entry saved for ${entry.entry_date} (${entry.category ?? 'general'}).`;
      }
      case 'journal_read': {
        const limit = typeof args.limit === 'number' ? Math.min(args.limit, 20) : 5;
        const entries = (ctx.journal ?? []).slice(-limit).reverse();
        return JSON.stringify(
          entries.map((j) => ({
            date: j.entry_date,
            category: j.category,
            content: j.user_message.slice(0, 300),
            ai_response: j.ai_response?.slice(0, 200) ?? null,
          })),
        );
      }
      case 'create_coaching_plan': {
        const dates = Object.keys(ctx.entries).sort();
        const recentEntries = dates.slice(-7).map((d) => ctx.entries[d]);
        const draft = await generateCoachingPlan(
          recentEntries,
          ctx.targets,
          ctx.reflections ?? {},
          ctx.journal ?? [],
          ctx.coachMemories ?? [],
        );
        const now = new Date().toISOString();
        const plan: CoachingPlan = {
          id: `plan-${Date.now()}`,
          status: 'active',
          focus_area: draft.focus_area,
          goal: draft.goal,
          why_it_matters: draft.why_it_matters,
          action_steps: draft.action_steps,
          cadence_days: draft.cadence_days,
          next_follow_up_date: todayLocal(addDays(new Date(), draft.cadence_days)),
          last_check_in_date: null,
          follow_up_prompt: draft.follow_up_prompt,
          check_in_history: [],
          source_metric: draft.source_metric,
          created_at: now,
          updated_at: now,
        };
        ctx.upsertCoachingPlan(plan);
        if (draft.memory) ctx.remember(draft.memory, 'copilot');
        return JSON.stringify({
          saved: true,
          focus_area: plan.focus_area,
          goal: plan.goal,
          why_it_matters: plan.why_it_matters,
          action_steps: plan.action_steps,
          cadence_days: plan.cadence_days,
          follow_up_prompt: plan.follow_up_prompt,
          first_follow_up: plan.next_follow_up_date,
        });
      }
      case 'coaching_check_in': {
        const planId = String(args.plan_id ?? '');
        const plan = (ctx.coachingPlans ?? []).find((p) => p.id === planId);
        if (!plan) {
          const available = (ctx.coachingPlans ?? []).filter((p) => p.status === 'active');
          return `Plan not found. Active plans: ${available.map((p) => `${p.id} (${p.focus_area})`).join(', ') || 'none'}.`;
        }
        const userResponse = String(args.user_response ?? '');
        const dates = Object.keys(ctx.entries).sort();
        const recentEntries = dates.slice(-7).map((d) => ctx.entries[d]);
        const result = await generateCoachingFollowUp(
          plan,
          recentEntries,
          userResponse,
          ctx.coachMemories ?? [],
        );
        const now = new Date().toISOString();
        const updated: CoachingPlan = {
          ...plan,
          status: result.status,
          last_check_in_date: todayLocal(),
          next_follow_up_date: todayLocal(addDays(new Date(), result.next_follow_up_days)),
          check_in_history: [
            ...plan.check_in_history,
            { checked_at: now, prompt: plan.follow_up_prompt, user_response: userResponse, coach_response: result.coach_response },
          ],
          updated_at: now,
        };
        ctx.upsertCoachingPlan(updated);
        if (result.memory) ctx.remember(result.memory, 'copilot');
        return JSON.stringify({
          coach_response: result.coach_response,
          plan_status: result.status,
          next_follow_up: updated.next_follow_up_date,
        });
      }
      case 'remember_fact': {
        const content = String(args.content ?? '');
        if (!content) return 'Error: content is required.';
        ctx.remember(content, 'vesper-chat');
        addKnowledgeNode({
          label: content.slice(0, 60),
          type: 'memory',
          content,
        });
        return `Memory saved permanently: "${content}".`;
      }
      case 'add_insight': {
        const title = String(args.title ?? '');
        if (!title) return 'Error: title is required.';
        ctx.addInsight({
          insight_type: 'pattern',
          title,
          body: String(args.body ?? ''),
          severity: (args.severity as 'info' | 'positive' | 'warning') ?? 'info',
        });
        addKnowledgeNode({
          label: title,
          type: 'insight',
          content: String(args.body ?? ''),
        });
        return `Insight recorded: "${title}".`;
      }
      case 'orb_add_node': {
        const label = String(args.label ?? '');
        if (!label) return 'Error: label is required.';
        const type = (args.type as 'learned' | 'memory' | 'insight' | 'bybit') ?? 'learned';
        const connectIds: string[] = [];
        for (const l of (args.connect_to_labels as string[]) ?? []) {
          const target = findNodeByLabel(l);
          if (target) connectIds.push(target.id);
        }
        addKnowledgeNode({
          label,
          type,
          content: String(args.content ?? ''),
          connectTo: connectIds,
        });
        return `Knowledge Orb: node "${label}" (${type}) built${connectIds.length ? ` and connected to ${connectIds.length} node(s)` : ''}.`;
      }
      case 'orb_connect': {
        const from = findNodeByLabel(String(args.from_label ?? ''));
        const to = findNodeByLabel(String(args.to_label ?? ''));
        if (!from || !to) {
          return `Error: ${!from ? `"${args.from_label}"` : `"${args.to_label}"`} not found in the orb.`;
        }
        connectKnowledgeNodes(from.id, to.id, (args.relation as string) || 'linked');
        return `Knowledge Orb: connected "${from.label}" ↔ "${to.label}" (${args.relation || 'linked'}).`;
      }
      case 'orb_edit': {
        const node = findNodeByLabel(String(args.label ?? ''));
        if (!node) return `Error: node "${args.label}" not found.`;
        editKnowledgeNode(node.id, {
          ...(args.new_label ? { label: String(args.new_label) } : {}),
          ...(args.new_content ? { content: String(args.new_content) } : {}),
        });
        return `Knowledge Orb: node "${args.label}" improved.`;
      }
      case 'orb_search': {
        const hits = queryKnowledge(String(args.query ?? ''), 5);
        if (hits.length === 0) return 'No matching knowledge in the orb.';
        hits.forEach((h) => reinforceKnowledge(h.id, 1));
        return hits
          .map((h) => `[${h.type}] ${h.label}: ${h.content.slice(0, 200)}`)
          .join('\n');
      }
      default:
        return `Error: unknown tool "${name}".`;
    }
  } catch (err) {
    return `Error executing ${name}: ${(err as Error).message}`;
  }
}
