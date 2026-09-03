/**
 * Bybit Knowledge Base
 * 
 * Structured product knowledge about Bybit EU and Bybit.com, researched from
 * official help center, announcements, and legal pages. Used by the AI copilot
 * to answer product questions during support chats and coaching.
 *
 * Each entry is a compact knowledge unit with keywords for retrieval.
 * The copilot searches these by keyword overlap and injects the most
 * relevant entries into its context.
 */

import { BYBIT_KNOWLEDGE as BYBIT_KNOWLEDGE_DATA } from './bybitKnowledgeData';

export interface KnowledgeEntry {
  id: string;
  category: 'accounts' | 'trading' | 'card' | 'earn' | 'legal' | 'announcements' | 'global' | 'comparisons';
  title: string;
  keywords: string[];
  content: string;
  sources?: string[];
}

// ---------------------------------------------------------------------------
// Retrieval: score entries by keyword overlap with the user's query
// ---------------------------------------------------------------------------

export function searchBybitKnowledge(query: string, limit = 4): KnowledgeEntry[] {
  const q = query.toLowerCase();
  const tokens = q.split(/[^a-z0-9äöüßéèà]+/i).filter((t) => t.length > 2);

  const scored = BYBIT_KNOWLEDGE.map((entry) => {
    let score = 0;
    for (const kw of entry.keywords) {
      if (q.includes(kw)) score += 3;
    }
    for (const token of tokens) {
      if (entry.title.toLowerCase().includes(token)) score += 2;
      if (entry.keywords.some((kw) => kw.includes(token) || token.includes(kw))) score += 1;
      if (entry.content.toLowerCase().includes(token)) score += 0.5;
    }
    return { entry, score };
  });

  return scored
    .filter((s) => s.score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.entry);
}

export function buildKnowledgeContext(query: string): string {
  const relevant = searchBybitKnowledge(query);
  if (relevant.length === 0) return '';
  const sections = relevant.map(
    (e) => `### ${e.title}\n${e.content}${e.sources?.length ? `\nSources: ${e.sources.join(', ')}` : ''}`,
  );
  return `You have access to researched knowledge about Bybit EU (bybit.eu) and Bybit.com. Use it to answer product questions accurately. When unsure beyond this knowledge, say so and recommend the customer check the official help center.\n\n${sections.join('\n\n')}`;
}

// ---------------------------------------------------------------------------
// The knowledge base
// Content researched from official Bybit EU / Bybit.com sources.
// ---------------------------------------------------------------------------

export const BYBIT_KNOWLEDGE: KnowledgeEntry[] = BYBIT_KNOWLEDGE_DATA;
