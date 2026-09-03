/**
 * VESPER Mind — Orb Store
 *
 * Persistent knowledge & reasoning graphs that power the Knowledge Orb and the
 * Reasoning Map Orb (Obsidian x Graphify style, rendered in 3D).
 *
 * Two graphs live here:
 *  - KNOWLEDGE: Bybit reference knowledge (seeded from research) + learned
 *    facts + memories + insights, connected by semantic edges.
 *  - REASONING: chains of the copilot's actual reasoning traces
 *    (goal → steps → outcome), recorded live as it works.
 *
 * The copilot can build, connect, edit, and improve nodes through its tools
 * (see agentTools.ts) — this store is its long-term mind.
 */

import { BYBIT_KNOWLEDGE } from './bybitKnowledgeData';

export type OrbNodeType =
  | 'bybit' // reference knowledge from research
  | 'learned' // fact learned from conversations
  | 'memory' // durable memory about the user
  | 'insight' // self-improvement / pattern insight
  | 'reasoning_goal' // reasoning trace root
  | 'reasoning_step' // retrieve / analyze step
  | 'reasoning_tool' // tool execution
  | 'reasoning_outcome'; // result of a trace

export interface OrbNode {
  id: string;
  label: string;
  type: OrbNodeType;
  content: string;
  sources?: string[];
  createdAt: string;
  /** Reinforcement counter — grows every time the node is used or confirmed. */
  strength: number;
}

export interface OrbEdge {
  from: string;
  to: string;
  relation: string;
  weight: number;
}

export interface ReasoningStep {
  type: 'retrieve' | 'analyze' | 'tool' | 'respond';
  label: string;
  detail?: string;
}

export interface ReasoningTrace {
  id: string;
  goal: string;
  steps: ReasoningStep[];
  outcome: string;
  confidence: number; // 0..1
  createdAt: string;
}

const K_KEY = 'vesper.orb.knowledge.v1';
const R_KEY = 'vesper.orb.reasoning.v1';

let knowledgeNodes: OrbNode[] | null = null;
let knowledgeEdges: OrbEdge[] | null = null;
let reasoningTraces: ReasoningTrace[] | null = null;

// ---------------------------------------------------------------------------
// persistence helpers
// ---------------------------------------------------------------------------

function loadJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function saveKnowledge() {
  try {
    localStorage.setItem(
      K_KEY,
      JSON.stringify({ nodes: knowledgeNodes, edges: knowledgeEdges }),
    );
  } catch {
    /* storage full/blocked — keep in-memory copies */
  }
}

function saveReasoning() {
  try {
    localStorage.setItem(R_KEY, JSON.stringify(reasoningTraces));
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Knowledge graph
// ---------------------------------------------------------------------------

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 48);
}

function keywordOverlap(a: string, b: string): number {
  const stop = new Set(['the', 'and', 'for', 'with', 'your', 'you', 'how', 'what', 'when', 'are', 'can', 'from', 'that', 'this', 'have', 'has', 'not', 'use', 'using']);
  const toks = (t: string) =>
    t
      .toLowerCase()
      .split(/[^a-z0-9äöüß]+/)
      .filter((w) => w.length > 3 && !stop.has(w));
  const A = new Set(toks(a));
  const B = new Set(toks(b));
  let hits = 0;
  A.forEach((w) => {
    if (B.has(w)) hits++;
  });
  return hits;
}

/** Auto-connect a node to related nodes by keyword overlap (max 3 links). */
function autoLink(node: OrbNode): void {
  const scored: Array<{ id: string; score: number }> = [];
  for (const other of knowledgeNodes!) {
    if (other.id === node.id) continue;
    const score =
      keywordOverlap(`${node.label} ${node.content}`, `${other.label} ${other.content}`) +
      keywordOverlap(node.label, other.label) * 2;
    if (score >= 2) scored.push({ id: other.id, score });
  }
  scored.sort((a, b) => b.score - a.score);
  for (const s of scored.slice(0, 3)) {
    knowledgeEdges!.push({
      from: node.id,
      to: s.id,
      relation: 'related',
      weight: Math.min(s.score, 5),
    });
  }
}

function ensureKnowledgeLoaded() {
  if (knowledgeNodes) return;
  const saved = loadJson<{ nodes: OrbNode[]; edges: OrbEdge[] }>(K_KEY);
  if (saved && Array.isArray(saved.nodes) && saved.nodes.length > 0) {
    knowledgeNodes = saved.nodes;
    knowledgeEdges = saved.edges ?? [];
    return;
  }
  // Seed from researched Bybit knowledge
  knowledgeNodes = [];
  knowledgeEdges = [];
  for (const e of BYBIT_KNOWLEDGE) {
    knowledgeNodes.push({
      id: `k-${e.id}`,
      label: e.title,
      type: 'bybit',
      content: e.content,
      sources: e.sources,
      createdAt: new Date().toISOString(),
      strength: 1,
    });
  }
  // Link related entries (keyword overlap) — the "graphify" moment
  for (const n of knowledgeNodes) autoLink(n);
  // Deduplicate edges
  const seen = new Set<string>();
  knowledgeEdges = knowledgeEdges.filter((e) => {
    const k = `${e.from}->${e.to}`;
    if (seen.has(k) || e.from === e.to) return false;
    seen.add(k);
    return true;
  });
  saveKnowledge();
}

export function getKnowledgeGraph(): { nodes: OrbNode[]; edges: OrbEdge[] } {
  ensureKnowledgeLoaded();
  return { nodes: knowledgeNodes!, edges: knowledgeEdges! };
}

export function addKnowledgeNode(input: {
  label: string;
  type: OrbNodeType;
  content: string;
  sources?: string[];
  connectTo?: string[];
}): OrbNode {
  ensureKnowledgeLoaded();
  const node: OrbNode = {
    id: `n-${slugify(input.label)}-${Date.now().toString(36)}`,
    label: input.label,
    type: input.type,
    content: input.content,
    sources: input.sources,
    createdAt: new Date().toISOString(),
    strength: 1,
  };
  knowledgeNodes!.push(node);
  for (const target of input.connectTo ?? []) {
    if (knowledgeNodes!.some((n) => n.id === target)) {
      knowledgeEdges!.push({ from: node.id, to: target, relation: 'linked', weight: 2 });
    }
  }
  autoLink(node);
  saveKnowledge();
  return node;
}

export function connectKnowledgeNodes(
  fromId: string,
  toId: string,
  relation = 'linked',
): boolean {
  ensureKnowledgeLoaded();
  if (fromId === toId) return false;
  const exists = knowledgeNodes!.some((n) => n.id === fromId) &&
    knowledgeNodes!.some((n) => n.id === toId);
  if (!exists) return false;
  if (knowledgeEdges!.some((e) => e.from === fromId && e.to === toId)) return true;
  knowledgeEdges!.push({ from: fromId, to: toId, relation, weight: 2 });
  saveKnowledge();
  return true;
}

export function editKnowledgeNode(
  id: string,
  patch: Partial<Pick<OrbNode, 'label' | 'content' | 'type' | 'sources'>>,
): boolean {
  ensureKnowledgeLoaded();
  const node = knowledgeNodes!.find((n) => n.id === id);
  if (!node) return false;
  Object.assign(node, patch);
  saveKnowledge();
  return true;
}

export function removeKnowledgeNode(id: string): boolean {
  ensureKnowledgeLoaded();
  const before = knowledgeNodes!.length;
  knowledgeNodes = knowledgeNodes!.filter((n) => n.id !== id);
  knowledgeEdges = knowledgeEdges!.filter((e) => e.from !== id && e.to !== id);
  saveKnowledge();
  return knowledgeNodes!.length < before;
}

/** Reinforce a node — called whenever the copilot uses it (self-learning signal). */
export function reinforceKnowledge(id: string, amount = 1): void {
  ensureKnowledgeLoaded();
  const node = knowledgeNodes!.find((n) => n.id === id);
  if (node) {
    node.strength += amount;
    saveKnowledge();
  }
}

/** Find nodes matching a query — used by the copilot to search its mind. */
export function queryKnowledge(query: string, limit = 5): OrbNode[] {
  ensureKnowledgeLoaded();
  const scored = knowledgeNodes!.map((n) => ({
    node: n,
    score: keywordOverlap(query, `${n.label} ${n.content}`) * 2 + (query.toLowerCase().includes(n.label.toLowerCase().slice(0, 12)) ? 3 : 0),
  }));
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.node);
}

// ---------------------------------------------------------------------------
// Reasoning traces
// ---------------------------------------------------------------------------

function ensureReasoningLoaded() {
  if (reasoningTraces) return;
  const saved = loadJson<ReasoningTrace[]>(R_KEY);
  reasoningTraces = Array.isArray(saved) ? saved : [];
}

export function addReasoningTrace(trace: {
  goal: string;
  steps: ReasoningStep[];
  outcome: string;
  confidence?: number;
}): ReasoningTrace {
  ensureReasoningLoaded();
  const full: ReasoningTrace = {
    id: `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    goal: trace.goal,
    steps: trace.steps,
    outcome: trace.outcome,
    confidence: trace.confidence ?? 0.8,
    createdAt: new Date().toISOString(),
  };
  reasoningTraces!.unshift(full);
  // Keep the most recent 120 traces
  if (reasoningTraces!.length > 120) reasoningTraces!.length = 120;
  saveReasoning();
  return full;
}

export function getReasoningTraces(limit = 60): ReasoningTrace[] {
  ensureReasoningLoaded();
  return reasoningTraces!.slice(0, limit);
}

/** Build a graph view of reasoning traces: goals → steps → outcomes, cross-linked
 *  when traces share tools or knowledge nodes. */
export function getReasoningGraph(): { nodes: OrbNode[]; edges: OrbEdge[] } {
  ensureReasoningLoaded();
  const traces = reasoningTraces!.slice(0, 40);
  const nodes: OrbNode[] = [];
  const edges: OrbEdge[] = [];
  const toolNodeIds = new Map<string, string>();

  for (const t of traces) {
    const goalId = `rg-${t.id}`;
    nodes.push({
      id: goalId,
      label: t.goal.slice(0, 60),
      type: 'reasoning_goal',
      content: `${t.goal}\n\nOutcome: ${t.outcome}\nConfidence: ${(t.confidence * 100).toFixed(0)}%`,
      createdAt: t.createdAt,
      strength: t.confidence,
    });
    let prevId = goalId;
    t.steps.forEach((s, i) => {
      const stepId = `rs-${t.id}-${i}`;
      const type: OrbNodeType =
        s.type === 'tool' ? 'reasoning_tool' : 'reasoning_step';
      nodes.push({
        id: stepId,
        label: s.label.slice(0, 60),
        type,
        content: `${s.type.toUpperCase()}: ${s.label}${s.detail ? `\n\n${s.detail}` : ''}`,
        createdAt: t.createdAt,
        strength: 1,
      });
      edges.push({ from: prevId, to: stepId, relation: 'step', weight: 1 });
      prevId = stepId;
      // Cross-link shared tools so the orb shows reasoning patterns
      if (s.type === 'tool') {
        const toolKey = s.label.split('(')[0].trim();
        const sharedId = toolNodeIds.get(toolKey);
        if (sharedId && sharedId !== stepId) {
          edges.push({ from: stepId, to: sharedId, relation: 'same tool', weight: 1 });
        } else {
          toolNodeIds.set(toolKey, stepId);
        }
      }
    });
    const outcomeId = `ro-${t.id}`;
    nodes.push({
      id: outcomeId,
      label: t.outcome.slice(0, 60),
      type: 'reasoning_outcome',
      content: t.outcome,
      createdAt: t.createdAt,
      strength: 1,
    });
    edges.push({ from: prevId, to: outcomeId, relation: 'resulted in', weight: 2 });
  }
  return { nodes, edges };
}
