with open('src/agentTools.ts', 'r') as f:
    content = f.read()

# 1. Update import
old_import = '''import {
  addKnowledgeNode,
  connectKnowledgeNodes,
  editKnowledgeNode,
  queryKnowledge,
  getKnowledgeGraph,
  reinforceKnowledge,
} from './orbStore';'''

new_import = '''import {
  addKnowledgeNode,
  connectKnowledgeNodes,
  editKnowledgeNode,
  removeKnowledgeNode,
  queryKnowledge,
  getKnowledgeGraph,
  reinforceKnowledge,
} from './orbStore';'''

assert old_import in content, 'old import not found'
content = content.replace(old_import, new_import, 1)

# 2. Update VESPER_TOOLS schemas
old_tools = '''  {
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
];'''

new_tools = '''  {
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
  {
    type: 'function',
    function: {
      name: 'orb_remove',
      description: 'Remove/delete a node from your Knowledge Orb by its label or ID.',
      parameters: {
        type: 'object',
        properties: {
          label: { type: 'string', description: 'Label or ID of the node to remove' },
        },
        required: ['label'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'orb_reinforce',
      description: 'Reinforce a Knowledge Orb node by increasing its strength counter when used or confirmed.',
      parameters: {
        type: 'object',
        properties: {
          label: { type: 'string', description: 'Label or ID of the node to reinforce' },
          amount: { type: 'number', description: 'Reinforcement increment (default 1)' },
        },
        required: ['label'],
      },
    },
  },
];'''

assert old_tools in content, 'old tools not found'
content = content.replace(old_tools, new_tools, 1)

# 3. Update findNodeByLabel
old_fn = '''function findNodeByLabel(label: string) {
  const { nodes } = getKnowledgeGraph();
  const lower = label.toLowerCase().trim();
  return (
    nodes.find((n) => n.label.toLowerCase() === lower) ??
    nodes.find((n) => n.label.toLowerCase().includes(lower))
  );
}'''

new_fn = '''function findNodeByLabel(label: string) {
  const { nodes } = getKnowledgeGraph();
  const lower = label.toLowerCase().trim();
  return (
    nodes.find((n) => n.label.toLowerCase() === lower) ??
    nodes.find((n) => n.id.toLowerCase() === lower) ??
    nodes.find((n) => n.label.toLowerCase().includes(lower)) ??
    nodes.find((n) => lower.includes(n.label.toLowerCase()))
  );
}'''

assert old_fn in content, 'old fn not found'
content = content.replace(old_fn, new_fn, 1)

# 4. Update executeTool switch cases
old_switch = '''      case 'orb_search': {
        const hits = queryKnowledge(String(args.query ?? ''), 5);
        if (hits.length === 0) return 'No matching knowledge in the orb.';
        hits.forEach((h) => reinforceKnowledge(h.id, 1));
        return hits
          .map((h) => `[${h.type}] ${h.label}: ${h.content.slice(0, 200)}`)
          .join('\\n');
      }'''

new_switch = '''      case 'orb_search': {
        const hits = queryKnowledge(String(args.query ?? ''), 5);
        if (hits.length === 0) return 'No matching knowledge in the orb.';
        hits.forEach((h) => reinforceKnowledge(h.id, 1));
        return hits
          .map((h) => `[${h.type}] ${h.label}: ${h.content.slice(0, 200)}`)
          .join('\\n');
      }
      case 'orb_remove': {
        const queryLabel = String(args.label ?? '');
        const node = findNodeByLabel(queryLabel);
        if (!node) return `Error: node "${queryLabel}" not found in Knowledge Orb.`;
        const removed = removeKnowledgeNode(node.id);
        if (!removed) return `Error: failed to remove node "${node.label}".`;
        return `Knowledge Orb: node "${node.label}" removed from graph.`;
      }
      case 'orb_reinforce': {
        const queryLabel = String(args.label ?? '');
        const node = findNodeByLabel(queryLabel);
        if (!node) return `Error: node "${queryLabel}" not found in Knowledge Orb.`;
        const amt = Number(args.amount) || 1;
        reinforceKnowledge(node.id, amt);
        return `Knowledge Orb: node "${node.label}" reinforced (+${amt}).`;
      }'''

assert old_switch in content, 'old switch not found'
content = content.replace(old_switch, new_switch, 1)

with open('src/agentTools.ts', 'w') as f:
    f.write(content)

print('Updated src/agentTools.ts successfully!')
