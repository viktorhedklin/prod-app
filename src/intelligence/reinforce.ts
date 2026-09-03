import type { OrbNode } from '../orbStore';
import { getKnowledgeGraph, reinforceKnowledge } from '../orbStore';

export function reinforceOrbNodes(query: string): void {
  if (!query || !query.trim()) return;

  const { nodes } = getKnowledgeGraph();
  const stopWords = new Set([
    'the',
    'and',
    'for',
    'with',
    'your',
    'you',
    'how',
    'what',
    'when',
    'are',
    'can',
    'from',
    'that',
    'this',
    'have',
    'has',
    'not',
    'use',
    'using',
  ]);

  const tokens = query
    .toLowerCase()
    .split(/[^a-z0-9äöüß]+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));

  if (tokens.length === 0) return;

  for (const node of nodes) {
    const fullText = `${node.label} ${node.content}`.toLowerCase();
    let hits = 0;
    for (const token of tokens) {
      if (fullText.includes(token)) {
        hits++;
      }
    }

    if (hits > 0) {
      const currentStrength = node.strength ?? 1;
      if (currentStrength < 100) {
        const boost = Math.min(hits, 100 - currentStrength);
        reinforceKnowledge(node.id, boost);
      }
    }
  }
}

export function applyForgettingCurveDecay(
  nodes: OrbNode[],
  daysPassed = 7,
): OrbNode[] {
  const factor = Math.pow(0.5, daysPassed / 7);
  return nodes.map((node) => {
    const rawStrength = (node.strength ?? 1) * factor;
    const decayedStrength = Math.max(1, Math.floor(rawStrength * 100) / 100);
    return {
      ...node,
      strength: decayedStrength,
    };
  });
}
