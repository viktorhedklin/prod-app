import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import LinearProgress from '@mui/material/LinearProgress';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';

import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddLinkIcon from '@mui/icons-material/AddLink';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import HubIcon from '@mui/icons-material/Hub';
import PsychologyIcon from '@mui/icons-material/Psychology';

import type { OrbNode, OrbNodeType } from '../orbStore';

export interface OrbDetailPanelProps {
  node: OrbNode | null;
  siblingNodes: OrbNode[];
  onClose: () => void;
  onEdit?: (label: string, content: string) => void;
  onDelete?: () => void;
  onConnect?: (targetId: string, relation: string) => void;
  readOnly?: boolean;
}

function getTypeChipColor(type: OrbNodeType): 'primary' | 'secondary' | 'info' | 'warning' | 'success' | 'default' {
  switch (type) {
    case 'bybit':
      return 'primary';
    case 'learned':
      return 'secondary';
    case 'memory':
      return 'info';
    case 'insight':
      return 'warning';
    case 'reasoning_goal':
      return 'primary';
    case 'reasoning_step':
    case 'reasoning_tool':
    case 'reasoning_outcome':
      return 'success';
    default:
      return 'default';
  }
}

export const OrbDetailPanel: React.FC<OrbDetailPanelProps> = ({
  node,
  siblingNodes,
  onClose,
  onEdit,
  onDelete,
  onConnect,
  readOnly = false,
}) => {
  // Inline edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState('');
  const [editContent, setEditContent] = useState('');

  // Connect state
  const [connectTargetId, setConnectTargetId] = useState('');
  const [relation, setRelation] = useState('linked');

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Sync state when selected node changes
  useEffect(() => {
    if (node) {
      setEditLabel(node.label);
      setEditContent(node.content);
      setIsEditing(false);
      setConnectTargetId('');
      setRelation('linked');
      setDeleteDialogOpen(false);
    }
  }, [node]);

  if (!node) {
    return (
      <Paper
        elevation={3}
        sx={{
          p: 3,
          height: '100%',
          minHeight: 320,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 3,
        }}
      >
        <HubIcon sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.5, mb: 1.5 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No Node Selected
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 260 }}>
          Click or tap any node in the 3D Orb graph to view its content, connections, and metadata.
        </Typography>
      </Paper>
    );
  }

  const availableSiblings = siblingNodes.filter((s) => s.id !== node.id);

  const handleSaveEdit = () => {
    if (!editLabel.trim() || !editContent.trim()) return;
    if (onEdit) {
      onEdit(editLabel.trim(), editContent.trim());
    }
    setIsEditing(false);
  };

  const handleConnect = () => {
    if (!connectTargetId) return;
    if (onConnect) {
      onConnect(connectTargetId, relation.trim() || 'linked');
    }
    setConnectTargetId('');
  };

  const handleConfirmDelete = () => {
    setDeleteDialogOpen(false);
    if (onDelete) {
      onDelete();
    }
  };

  const formattedDate = new Date(node.createdAt).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <Paper
      elevation={4}
      sx={{
        p: 2.5,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 3,
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Chip
          label={node.type}
          color={getTypeChipColor(node.type)}
          size="small"
          sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.68rem' }}
        />
        <IconButton size="small" onClick={onClose} aria-label="Close detail panel">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Edit Mode vs Display Mode */}
      {isEditing ? (
        <Stack spacing={2} sx={{ mt: 1, flex: 1 }}>
          <TextField
            label="Node Label"
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            fullWidth
            size="small"
          />
          <TextField
            label="Content"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            fullWidth
            multiline
            minRows={5}
            size="small"
          />
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 1 }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<CancelIcon />}
              onClick={() => {
                setEditLabel(node.label);
                setEditContent(node.content);
                setIsEditing(false);
              }}
            >
              Cancel
            </Button>
            <Button
              size="small"
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSaveEdit}
              disabled={!editLabel.trim() || !editContent.trim()}
            >
              Save
            </Button>
          </Box>
        </Stack>
      ) : (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Label */}
          <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.3 }}>
            {node.label}
          </Typography>

          {/* Strength Meter */}
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                Strength Counter
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main' }}>
                {node.strength.toFixed(1)}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={Math.min((node.strength / 10) * 100, 100)}
              sx={{
                height: 6,
                borderRadius: 3,
                bgcolor: 'action.hover',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 3,
                },
              }}
            />
          </Box>

          <Typography variant="caption" color="text.secondary">
            Created: <strong>{formattedDate}</strong>
          </Typography>

          <Divider />

          {/* Content */}
          <Box sx={{ whiteSpace: 'pre-wrap', fontSize: '0.875rem', lineHeight: 1.6, color: 'text.primary' }}>
            {node.content}
          </Box>

          {/* Sources */}
          {node.sources && node.sources.length > 0 && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
                Sources & References
              </Typography>
              <Stack spacing={0.5}>
                {node.sources.map((src, idx) => (
                  <Link
                    key={idx}
                    href={src}
                    target="_blank"
                    rel="noopener noreferrer"
                    underline="hover"
                    variant="caption"
                    sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, wordBreak: 'break-all' }}
                  >
                    <OpenInNewIcon sx={{ fontSize: 12 }} />
                    {src}
                  </Link>
                ))}
              </Stack>
            </Box>
          )}

          {readOnly ? (
            <Box sx={{ mt: 'auto', pt: 2 }}>
              <Chip
                icon={<PsychologyIcon fontSize="small" />}
                label="Read-Only Reasoning Trace"
                variant="outlined"
                color="info"
                size="small"
                sx={{ width: '100%' }}
              />
            </Box>
          ) : (
            <Box sx={{ mt: 'auto', pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Divider />

              {/* Edit & Delete Action Buttons */}
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<EditIcon />}
                  onClick={() => setIsEditing(true)}
                  fullWidth
                >
                  Edit
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  startIcon={<DeleteIcon />}
                  onClick={() => setDeleteDialogOpen(true)}
                  fullWidth
                >
                  Delete
                </Button>
              </Box>

              {/* Connect Section */}
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: 'action.hover',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.5,
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                  Connect to Sibling Node
                </Typography>

                <FormControl size="small" fullWidth>
                  <InputLabel id="connect-sibling-label">Target Node</InputLabel>
                  <Select
                    labelId="connect-sibling-label"
                    value={connectTargetId}
                    label="Target Node"
                    onChange={(e) => setConnectTargetId(e.target.value)}
                  >
                    {availableSiblings.map((s) => (
                      <MenuItem key={s.id} value={s.id}>
                        {s.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  label="Relation"
                  value={relation}
                  onChange={(e) => setRelation(e.target.value)}
                  size="small"
                  fullWidth
                  placeholder="linked"
                />

                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AddLinkIcon />}
                  onClick={handleConnect}
                  disabled={!connectTargetId}
                  fullWidth
                >
                  Connect
                </Button>
              </Box>
            </Box>
          )}
        </Box>
      )}

      {/* Confirmation Dialog before Delete */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Delete Node</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>"{node.label}"</strong> from the knowledge graph?
            This operation cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleConfirmDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default OrbDetailPanel;
