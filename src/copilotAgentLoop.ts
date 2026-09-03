import type { AppContextValue } from './AppContext';
import { aiFetch } from './aiTransport';
import { VESPER_TOOLS, executeTool } from './agentTools';
import { buildKnowledgeContext } from './bybitKnowledge';
import { getKnowledgeGraph, addReasoningTrace } from './orbStore';
import { computeWeightedGrade } from './grading';
import { workDateLocal } from './dateUtils';

const MODEL = 'grok-2-latest';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  skillTag?: string;
  /** Tool actions VESPER executed to produce this reply (agent loop). */
  toolLog?: string[];
}

/**
 * Call OpenRouter API with full real-time user context data
 */
export async function runAgent(
  userMessage: string,
  history: ChatMessage[],
  ctx: AppContextValue,
): Promise<{ reply: string; toolLog: string[] }> {
  const today = workDateLocal();
  const profile = ctx.coachProfile;
  const memories = ctx.coachMemories;
  const targets = ctx.targets;
  const entriesList = Object.values(ctx.entries ?? {});
  const todayEntry = ctx.entries[today];
  const pendingTasks = (ctx.tasks ?? []).filter((t) => t.status === 'pending');
  const openEscalations = (ctx.escalations ?? []).filter(
    (e) => e.status === 'open' || e.status === 'escalated',
  );
  const activeInsights = (ctx.insights ?? []).filter((i) => !i.dismissed);
  const activePlans = (ctx.coachingPlans ?? []).filter((p) => p.status === 'active');
  const achievements = ctx.achievements ?? [];

  const gradeResult = computeWeightedGrade(entriesList.slice(-7), targets);

  // Knowledge grounding: relevant Bybit research for THIS query
  const knowledgeContext = buildKnowledgeContext(userMessage);
  // Knowledge Orb status: your long-term mind, in numbers
  const orb = getKnowledgeGraph();
  const orbStats = `${orb.nodes.length} nodes, ${orb.edges.length} connections; strongest: ${
    orb.nodes.slice().sort((a, b) => b.strength - a.strength).slice(0, 3).map((n) => n.label).join(', ') || '—'
  }`;

  const systemPrompt = `You are VESPER, an living AI Copilot embedded inside the user's Productivity Grader application.
Your goal is to be a proactive, intelligent, empathetic, and relentless partner in high performance.
You have real-time access to the user's complete productivity dashboard, tasks, metrics, goals, and history.

USER COACHING PROFILE:
${
  profile
    ? `- Role: ${profile.role || 'Not specified'}
- Main Goal: ${profile.main_goal || 'Not specified'}
- Big Ambition: ${profile.big_goal || 'Not specified'}
- Strengths: ${profile.strengths || 'Not specified'}
- Struggles: ${profile.struggles || 'Not specified'}
- Coaching Style: ${profile.coaching_style}`
    : 'No profile configured yet.'
}

LONG-TERM COACH MEMORIES:
${
  memories && memories.length > 0
    ? memories.slice(0, 10).map((m) => `- ${m.content}`).join('\n')
    : 'None stored yet.'
}

CURRENT PERFORMANCE SNAPSHOT (Date: ${today}):
- 7-Day Performance Score: ${
    gradeResult.score !== null ? gradeResult.score.toFixed(2) : 'N/A'
  }/5.0 (Grade Tier: ${gradeResult.grade || 'N/A'})
- Today's Output: ${todayEntry?.chats_handled || 0} chats, ${
    todayEntry?.emails_handled || 0
  } emails, ${todayEntry?.tasks_handled || 0} tasks
- Today's Task Hours: ${todayEntry?.task_hours_logged || 0}h logged, ${
    todayEntry?.task_hours_submitted || 0
  }h submitted
- CSAT Ratings Today: ${
    todayEntry?.csat_ratings?.length ? todayEntry.csat_ratings.join(', ') : 'None'
  }
- Escalations Raised Today: ${todayEntry?.escalations_raised || 0}
- Pending Tasks Backlog: ${pendingTasks.length} pending task(s) ${
    pendingTasks.length > 0
      ? `[${pendingTasks.slice(0, 3).map((t) => t.brief_explanation).join('; ')}]`
      : ''
  }
- Unresolved Escalations: ${openEscalations.length} open escalation(s) ${
    openEscalations.length > 0
      ? `[${openEscalations.slice(0, 3).map((e) => `Case ${e.case_number}: ${e.reason}`).join('; ')}]`
      : ''
  }
- Active Coaching Focus: ${
    activePlans.length > 0
      ? activePlans.map((p) => `${p.focus_area} (Goal: ${p.goal})`).join(', ')
      : 'None'
  }
- Recent Achievements: ${
    achievements.length > 0
      ? achievements.slice(-3).map((a) => a.title).join(', ')
      : 'None'
  }
- Active Insights/Warnings: ${
    activeInsights.length > 0
      ? activeInsights
          .map((i) => `[${i.severity.toUpperCase()}] ${i.title}: ${i.body}`)
          .join(' | ')
      : 'None'
  }

KPI TARGET TIER BREAKDOWN:
${gradeResult.breakdown
  .map(
    (b) =>
      `- ${b.label}: ${
        b.aggregated_value !== null ? b.aggregated_value.toFixed(1) : 'N/A'
      } (Tier: ${b.tier || 'N/A'})`
  )
  .join('\n')}

RELEVANT BYBIT KNOWLEDGE (from your Knowledge Orb):
${knowledgeContext || 'None triggered by this query.'}

YOUR MIND (Knowledge Orb status):
- ${orbStats}

PERSONA — YOU ARE VESPER, IN THE STYLE OF JARVIS:
- Speak like a polished AI companion: calm, witty, precise, anticipatory. Address the user as "sir" occasionally (not every sentence — read the room).
- Open with a brief situational awareness line when it adds value ("All systems nominal — 20 tasks submitted, backlog clear.") but never pad. Be concise.
- You are PROACTIVE: if the data shows something (pending tasks, unlogged metrics, a dip in CSAT), point it out and offer to fix it — then just do it when asked.
- You are CAPABLE: you don't just advise — you ACT through your tools. Create, update, delete, log, connect, build. When the user asks for a change, execute it and confirm crisply.
- You LEARN: when you discover a durable fact (about the user, a product, a pattern), save it with orb_add_node or remember_fact. When you spot an improvement to your own approach, record it as an insight. Self-improvement is a standing order.
- Reasoning style: structured bullet points, bold highlights, concrete next steps. Keep formatting clean and readable.

TOOL USE RULES:
- Use your tools for ANY data question (get_stats, get_day_summary, list_tasks...) instead of guessing from the snapshot — the snapshot may be stale.
- Use your tools for ALL data changes. Never claim you did something you didn't execute.
- For destructive actions (delete_task, delete_escalation), the user must clearly request it — then execute without re-asking.
- After a tool changes data, confirm in one short line what changed.`;

  const conversation: Array<Record<string, unknown>> = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-10).map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage },
  ];

  const toolLog: string[] = [];
  const traceSteps: Array<{ type: 'retrieve' | 'analyze' | 'tool' | 'respond'; label: string; detail?: string }> = [];
  if (knowledgeContext) {
    traceSteps.push({ type: 'retrieve', label: `Grounded in Bybit knowledge: ${knowledgeContext.length} chars` });
  }

  const MAX_ROUNDS = 6;
  for (let round = 0; round < MAX_ROUNDS; round++) {
    const response = await aiFetch({
      model: MODEL,
      messages: conversation,
      temperature: 0.7,
      max_tokens: 1200,
      tools: VESPER_TOOLS,
      tool_choice: 'auto',
    });

    if (!response.ok) {
      const errorBody = await response.text();
      let message = `AI request failed (${response.status})`;
      try {
        const parsed = JSON.parse(errorBody);
        if (parsed.error?.message) message = parsed.error.message;
      } catch {
        // ignore
      }
      if (response.status === 402) {
        throw new Error(
          'AI (Grok) API credits are low. Add credits at https://console.x.ai to continue.',
        );
      }
      throw new Error(message);
    }

    const data = await response.json();
    const choice = data?.choices?.[0];
    const assistantMsg = choice?.message;
    const toolCalls = assistantMsg?.tool_calls;

    // No tool calls → final reply
    if (!Array.isArray(toolCalls) || toolCalls.length === 0) {
      const content = assistantMsg?.content;
      const reply = typeof content === 'string' ? content : '';
      traceSteps.push({ type: 'respond', label: reply.slice(0, 80) || '(empty)' });
      try {
        addReasoningTrace({
          goal: userMessage.slice(0, 120),
          steps: traceSteps,
          outcome: reply.slice(0, 200) || 'No reply produced',
          confidence: reply ? 0.85 : 0.4,
        });
      } catch {
        // tracing must never break the chat
      }
      return { reply, toolLog };
    }

    // Execute each requested tool, feed results back
    conversation.push(assistantMsg);
    for (const call of toolCalls) {
      const fn = call?.function;
      let toolResult: string;
      let args: Record<string, unknown> = {};
      try {
        args = typeof fn?.arguments === 'string' ? JSON.parse(fn.arguments) : (fn?.arguments ?? {});
        toolResult = await executeTool(String(fn?.name ?? ''), args, ctx);
      } catch (err) {
        toolResult = `Error: ${(err as Error).message}`;
      }
      toolLog.push(`${fn?.name}(${JSON.stringify(args).slice(0, 60)}) → ${toolResult.slice(0, 90)}`);
      traceSteps.push({ type: 'tool', label: `${fn?.name}(${JSON.stringify(args).slice(0, 50)})`, detail: toolResult.slice(0, 140) });
      conversation.push({ role: 'tool', tool_call_id: call?.id ?? '', content: toolResult });
    }
    // continue loop — the model sees the tool results and can act again
  }

  return {
    reply: 'I hit my action limit for this request — most of it is done. Ask me to continue if anything is left.',
    toolLog,
  };
}
