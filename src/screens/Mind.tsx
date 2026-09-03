import { useState, useMemo, useCallback } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';

import HubIcon from '@mui/icons-material/Hub';
import PsychologyIcon from '@mui/icons-material/Psychology';
import AddIcon from '@mui/icons-material/Add';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

import PageHeader from '../components/PageHeader';
import OrbGraph3D from '../components/OrbGraph3D';
import OrbDetailPanel from '../components/OrbDetailPanel';
import { useApp } from '../useApp';

import type { OrbNode, OrbEdge, OrbNodeType } from '../orbStore';
import {
  getKnowledgeGraph,
  getReasoningGraph,
  addKnowledgeNode,
  editKnowledgeNode,
  removeKnowledgeNode,
  connectKnowledgeNodes,
} from '../orbStore';

type OrbMode = 'knowledge' | 'reasoning';

export default function Mind() {
  const theme = useTheme();
  const { notify } = useApp();
  const [mode, setMode] = useState<OrbMode>('knowledge');
  const [graphTick, setGraphTick] = useState<number>(0);
  const [selectedNode, setSelectedNode] = useState<OrbNode | null>(null);

  // Add node dialog state
  const [addDialogOpen, setAddDialogOpen] = useState<boolean>(false);
  const [addForm, setAddForm] = useState<{
    label: string;
    type: OrbNodeType;
    content: string;
  }>({
    label: '',
    type: 'learned',
    content: '',
  });

  // Get current graph data (re-computed when mode or graphTick changes)
  const graphData = useMemo<{ nodes: OrbNode[]; edges: OrbEdge[] }>(() => {
    // Force re-fetch when graphTick updates
    void graphTick;
    return mode === 'knowledge' ? getKnowledgeGraph() : getReasoningGraph();
  }, [mode, graphTick]);

  // Keep selectedNode in sync with current graph data
  const currentSelectedNode = useMemo(() => {
    if (!selectedNode) return null;
    return graphData.nodes.find((n) => n.id === selectedNode.id) ?? selectedNode;
  }, [selectedNode, graphData.nodes]);

  // Stats computation
  const stats = useMemo(() => {
    const nodes = graphData.nodes;
    const edges = graphData.edges;
    let strongest: OrbNode | null = null;
    for (const n of nodes) {
      if (!strongest || n.strength > strongest.strength) {
        strongest = n;
      }
    }
    return {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      strongestNode: strongest,
    };
  }, [graphData]);

  // Handlers
  const handleModeChange = (_: React.MouseEvent<HTMLElement>, newMode: OrbMode | null) => {
    if (newMode && newMode !== mode) {
      setMode(newMode);
      setSelectedNode(null);
    }
  };

  const handleAddNodeSubmit = () => {
    if (!addForm.label.trim() || !addForm.content.trim()) return;

    const created = addKnowledgeNode({
      label: addForm.label.trim(),
      type: addForm.type,
      content: addForm.content.trim(),
    });

    setGraphTick((t) => t + 1);
    setSelectedNode(created);
    notify('Node added to Knowledge Orb', 'success');
    setAddDialogOpen(false);
    setAddForm({ label: '', type: 'learned', content: '' });
  };

  const handleEditNode = useCallback(
    (label: string, content: string) => {
      if (!currentSelectedNode) return;
      editKnowledgeNode(currentSelectedNode.id, { label, content });
      setGraphTick((t) => t + 1);
      setSelectedNode((prev) => (prev ? { ...prev, label, content } : null));
      notify('Knowledge node updated', 'success');
    },
    [currentSelectedNode, notify],
  );

  const handleDeleteNode = useCallback(() => {
    if (!currentSelectedNode) return;
    removeKnowledgeNode(currentSelectedNode.id);
    setGraphTick((t) => t + 1);
    setSelectedNode(null);
    notify('Knowledge node removed from graph', 'info');
  }, [currentSelectedNode, notify]);

  const handleConnectNode = useCallback(
    (targetId: string, relation: string) => {
      if (!currentSelectedNode) return;
      connectKnowledgeNodes(currentSelectedNode.id, targetId, relation);
      setGraphTick((t) => t + 1);
      notify('Connected nodes successfully', 'success');
    },
    [currentSelectedNode, notify],
  );

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      <PageHeader
        title="MIND ORB"
        subtitle="3D Force-Directed Knowledge & Reasoning Matrix"
      />

      {/* Controls & Stats Bar */}
      <Stack spacing={2} sx={{ mb: 2.5 }}>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1.5,
          }}
        >
          <ToggleButtonGroup
            value={mode}
            exclusive
            onChange={handleModeChange}
            size="small"
            sx={{
              bgcolor: 'background.paper',
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              p: 0.5,
            }}
          >
            <ToggleButton
              value="knowledge"
              sx={{
                px: 2,
                py: 0.75,
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                fontSize: '0.75rem',
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: '#ffffff',
                  boxShadow: '0 0 12px rgba(20, 184, 166, 0.4)',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  },
                },
              }}
            >
              <HubIcon sx={{ mr: 1, fontSize: 18 }} />
              Knowledge Orb
            </ToggleButton>
            <ToggleButton
              value="reasoning"
              sx={{
                px: 2,
                py: 0.75,
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                fontSize: '0.75rem',
                '&.Mui-selected': {
                  bgcolor: 'secondary.main',
                  color: '#ffffff',
                  boxShadow: '0 0 12px rgba(6, 186, 212, 0.4)',
                  '&:hover': {
                    bgcolor: 'secondary.dark',
                  },
                },
              }}
            >
              <PsychologyIcon sx={{ mr: 1, fontSize: 18 }} />
              Reasoning Map
            </ToggleButton>
          </ToggleButtonGroup>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              label={`NODES: ${stats.totalNodes}`}
              size="small"
              variant="outlined"
              sx={{
                fontWeight: 700,
                letterSpacing: '0.05em',
                borderColor: 'primary.main',
                color: 'text.primary',
              }}
            />
            <Chip
              label={`EDGES: ${stats.totalEdges}`}
              size="small"
              variant="outlined"
              sx={{
                fontWeight: 700,
                letterSpacing: '0.05em',
                borderColor: 'secondary.main',
                color: 'text.primary',
              }}
            />
            {stats.strongestNode && (
              <Chip
                icon={<AutoAwesomeIcon sx={{ fontSize: '14px !important', color: 'primary.main' }} />}
                label={`CORE: ${stats.strongestNode.label.toUpperCase()} (${stats.strongestNode.strength.toFixed(0)})`}
                color="primary"
                variant="outlined"
                size="small"
                sx={{
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  boxShadow: '0 0 10px rgba(20, 184, 166, 0.2)',
                }}
              />
            )}
            {mode === 'knowledge' && (
              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={() => setAddDialogOpen(true)}
                sx={{
                  ml: 0.5,
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                Add Node
              </Button>
            )}
          </Box>
        </Box>

        <Alert
          severity="info"
          icon={<AutoAwesomeIcon fontSize="small" />}
          sx={{
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'primary.main',
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(20, 184, 166, 0.08)' : 'rgba(20, 184, 166, 0.06)',
          }}
        >
          {mode === 'knowledge'
            ? 'JARVIS Knowledge Web: semantic network of researched facts, user memories, and self-learned insights.'
            : 'Live Reasoning Traces: copilot goal decomposition, tool executions, and analytical outcomes.'}
        </Alert>
      </Stack>

      {/* Main 3D Graph + Detail Panel Layout */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 2.5,
          alignItems: 'stretch',
        }}
      >
        {/* Dark Space HUD Hero Panel */}
        <Box
          sx={{
            flex: 1,
            minHeight: { xs: 400, md: 550 },
            bgcolor: '#020617',
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'rgba(20, 184, 166, 0.25)',
            boxShadow: '0 0 25px rgba(20, 184, 166, 0.1)',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <OrbGraph3D
            nodes={graphData.nodes}
            edges={graphData.edges}
            selectedNodeId={currentSelectedNode?.id ?? undefined}
            onSelect={(node: OrbNode) => setSelectedNode(node)}
          />
        </Box>

        {/* Right Detail / Inspector Panel */}
        <Box
          sx={{
            width: { xs: '100%', md: 360 },
            flexShrink: 0,
          }}
        >
          <OrbDetailPanel
            node={currentSelectedNode}
            siblingNodes={graphData.nodes}
            onClose={() => setSelectedNode(null)}
            onEdit={handleEditNode}
            onDelete={handleDeleteNode}
            onConnect={handleConnectNode}
          />
        </Box>
      </Box>

      {/* Add Knowledge Node Dialog */}
      <Dialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3, border: '1px solid', borderColor: 'primary.main' },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '0.05em' }}>
          ADD KNOWLEDGE NODE
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Node Title / Label"
              value={addForm.label}
              onChange={(e) => setAddForm((f) => ({ ...f, label: e.target.value }))}
              fullWidth
              required
            />
            <FormControl fullWidth size="small">
              <InputLabel>Type</InputLabel>
              <Select
                value={addForm.type}
                label="Type"
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, type: e.target.value as OrbNodeType }))
                }
              >
                <MenuItem value="fact">Fact</MenuItem>
                <MenuItem value="memory">Memory</MenuItem>
                <MenuItem value="learned">Learned</MenuItem>
                <MenuItem value="goal">Goal</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Content / Details"
              value={addForm.content}
              onChange={(e) => setAddForm((f) => ({ ...f, content: e.target.value }))}
              multiline
              rows={3}
              fullWidth
              required
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddNodeSubmit}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
