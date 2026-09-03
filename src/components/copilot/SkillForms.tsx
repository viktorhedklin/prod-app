import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import Collapse from '@mui/material/Collapse';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';

// MUI Icons
import EmailIcon from '@mui/icons-material/Email';
import EditNoteIcon from '@mui/icons-material/EditNote';
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import TimelineIcon from '@mui/icons-material/Timeline';
import SchoolIcon from '@mui/icons-material/School';
import PsychologyIcon from '@mui/icons-material/Psychology';
import SparklesIcon from '@mui/icons-material/AutoAwesome';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

import type { AppContextValue } from '../../AppContext';
import { workDateLocal } from '../../dateUtils';

export const SKILL_ITEMS = [
  { id: 'draft_email', label: 'Draft Email', icon: EmailIcon, description: 'Draft client or internal email' },
  { id: 'log_today', label: 'Log Today', icon: EditNoteIcon, description: 'Quick log volume & hours' },
  { id: 'analyze_week', label: 'Analyze Week', icon: QueryStatsIcon, description: 'Deep performance breakdown' },
  { id: 'predict_score', label: 'Predict Score', icon: TimelineIcon, description: 'End of week grade forecast' },
  { id: 'coach_me', label: 'Coach Me', icon: SchoolIcon, description: 'Personalized action guidance' },
  { id: 'find_patterns', label: 'Find Patterns', icon: PsychologyIcon, description: 'Detect CSAT & volume trends' },
];

interface SkillFormsProps {
  activeSkillId: string | null;
  setActiveSkillId: (id: string | null) => void;
  onSendMessage: (text: string, skillTag?: string) => void;
  isLoading: boolean;
  ctx: AppContextValue;
}

export const SkillForms: React.FC<SkillFormsProps> = ({
  activeSkillId,
  setActiveSkillId,
  onSendMessage,
  isLoading,
  ctx,
}) => {
  // Draft Email mini-form state
  const [emailRecipient, setEmailRecipient] = useState('');
  const [emailTopic, setEmailTopic] = useState('');
  const [emailTone, setEmailTone] = useState('Professional');

  // Log Today mini-form state
  const [logChats, setLogChats] = useState('');
  const [logEmails, setLogEmails] = useState('');
  const [logHoursLogged, setLogHoursLogged] = useState('');
  const [logHoursSubmitted, setLogHoursSubmitted] = useState('');

  const today = workDateLocal();
  const todayEntry = ctx.entries[today];

  // Pre-fill Log Today fields when activeSkillId becomes 'log_today'
  useEffect(() => {
    if (activeSkillId === 'log_today' && todayEntry) {
      setLogChats(todayEntry.chats_handled !== undefined ? String(todayEntry.chats_handled) : '');
      setLogEmails(todayEntry.emails_handled !== undefined ? String(todayEntry.emails_handled) : '');
      setLogHoursLogged(todayEntry.task_hours_logged !== undefined ? String(todayEntry.task_hours_logged) : '');
      setLogHoursSubmitted(todayEntry.task_hours_submitted !== undefined ? String(todayEntry.task_hours_submitted) : '');
    }
  }, [activeSkillId, todayEntry]);

  // Handle Quick Skill Chip execution
  const handleSkillClick = (skillId: string) => {
    if (activeSkillId === skillId) {
      setActiveSkillId(null);
      return;
    }

    if (skillId === 'draft_email' || skillId === 'log_today') {
      setActiveSkillId(skillId);
    } else if (skillId === 'analyze_week') {
      onSendMessage('Please provide a comprehensive 7-day performance analysis with metric breakdowns, bottlenecks, and wins.', 'Analyze Week');
    } else if (skillId === 'predict_score') {
      onSendMessage('Predict my composite score and tier grade for the end of this week based on my current trajectory, tasks, and historical output.', 'Predict Score');
    } else if (skillId === 'coach_me') {
      onSendMessage('Give me 3 high-impact, actionable coaching recommendations for today based on my current performance and struggles.', 'Coach Me');
    } else if (skillId === 'find_patterns') {
      onSendMessage('Analyze my metrics to detect trends, volume-CSAT correlations, and productivity patterns.', 'Find Patterns');
    }
  };

  // Handle Draft Email Mini-form submission
  const handleDraftEmailSubmit = () => {
    if (!emailTopic.trim()) return;
    const prompt = `Draft a ${emailTone} email to ${emailRecipient || 'a client/colleague'} regarding: "${emailTopic}". Structure it professionally with clear points.`;
    onSendMessage(prompt, 'Draft Email');
    setEmailRecipient('');
    setEmailTopic('');
  };

  // Handle Log Today Mini-form submission
  const handleLogTodaySubmit = () => {
    const chats = Math.max(0, parseInt(logChats) || 0);
    const emails = Math.max(0, parseInt(logEmails) || 0);
    const hoursLogged = Math.max(0, parseFloat(logHoursLogged) || 0);
    const hoursSubmitted = Math.max(0, parseFloat(logHoursSubmitted) || 0);

    ctx.updateEntry(today, {
      chats_handled: chats,
      emails_handled: emails,
      task_hours_logged: hoursLogged,
      task_hours_submitted: hoursSubmitted,
    });

    ctx.notify('Today’s metrics updated successfully!', 'success');

    const prompt = `I have logged today's metrics: ${chats} chats, ${emails} emails, ${hoursLogged}h logged, and ${hoursSubmitted}h submitted. Please evaluate my updated score and highlight any recommendations.`;
    onSendMessage(prompt, 'Log Today');
  };

  return (
    <>
      {/* Interactive Skill Mini-Form Panel (Expandable) */}
      <Collapse in={!!activeSkillId}>
        <Box
          sx={{
            bgcolor: 'background.paper',
            borderTop: '1px solid',
            borderColor: 'divider',
            px: { xs: 2, sm: 3 },
            py: 2,
            boxShadow: '0 -4px 16px rgba(0,0,0,0.05)',
          }}
        >
          {activeSkillId === 'draft_email' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EmailIcon color="primary" sx={{ fontSize: 18 }} /> Quick Email Drafter
                </Typography>
                <IconButton size="small" onClick={() => setActiveSkillId(null)}>
                  <CloseIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>

              <Box sx={{ display: 'flex', gap: 1.5, flexDirection: { xs: 'column', sm: 'row' } }}>
                <TextField
                  size="small"
                  label="Recipient / Subject"
                  placeholder="e.g. Customer support follow-up"
                  value={emailRecipient}
                  onChange={(e) => setEmailRecipient(e.target.value)}
                  sx={{ flex: 1 }}
                />
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel>Tone</InputLabel>
                  <Select value={emailTone} label="Tone" onChange={(e) => setEmailTone(e.target.value)}>
                    <MenuItem value="Professional">Professional</MenuItem>
                    <MenuItem value="Friendly & Warm">Friendly & Warm</MenuItem>
                    <MenuItem value="Direct & Firm">Direct & Firm</MenuItem>
                    <MenuItem value="Concise">Concise</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <TextField
                size="small"
                multiline
                rows={2}
                label="Key Points / Context"
                placeholder="Describe what you want to communicate..."
                value={emailTopic}
                onChange={(e) => setEmailTopic(e.target.value)}
              />

              <Button
                variant="contained"
                size="small"
                onClick={handleDraftEmailSubmit}
                disabled={!emailTopic.trim() || isLoading}
                startIcon={<SparklesIcon />}
                sx={{ alignSelf: 'flex-end', borderRadius: 2 }}
              >
                Generate Email Draft
              </Button>
            </Box>
          )}

          {activeSkillId === 'log_today' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EditNoteIcon color="primary" sx={{ fontSize: 18 }} /> Quick Metric Logger
                </Typography>
                <IconButton size="small" onClick={() => setActiveSkillId(null)}>
                  <CloseIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr 1fr' }, gap: 1.5 }}>
                <TextField
                  size="small"
                  type="number"
                  label="Chats Handled"
                  value={logChats}
                  onChange={(e) => setLogChats(e.target.value)}
                />
                <TextField
                  size="small"
                  type="number"
                  label="Emails Handled"
                  value={logEmails}
                  onChange={(e) => setLogEmails(e.target.value)}
                />
                <TextField
                  size="small"
                  type="number"
                  label="Hours Logged"
                  value={logHoursLogged}
                  onChange={(e) => setLogHoursLogged(e.target.value)}
                />
                <TextField
                  size="small"
                  type="number"
                  label="Hours Submitted"
                  value={logHoursSubmitted}
                  onChange={(e) => setLogHoursSubmitted(e.target.value)}
                />
              </Box>

              <Button
                variant="contained"
                size="small"
                onClick={handleLogTodaySubmit}
                startIcon={<CheckCircleOutlineIcon />}
                sx={{ alignSelf: 'flex-end', borderRadius: 2 }}
              >
                Save & Analyze Log
              </Button>
            </Box>
          )}
        </Box>
      </Collapse>

      {/* Quick Skills Bar (Above Input) */}
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderTop: '1px solid',
          borderColor: 'divider',
          px: { xs: 1.5, sm: 2.5 },
          py: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          overflowX: 'auto',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', flexShrink: 0, mr: 0.5 }}>
          SKILLS:
        </Typography>

        {SKILL_ITEMS.map((skill) => {
          const Icon = skill.icon;
          const isActive = activeSkillId === skill.id;
          return (
            <Tooltip key={skill.id} title={skill.description} placement="top">
              <Chip
                icon={<Icon sx={{ fontSize: '15px !important' }} />}
                label={skill.label}
                onClick={() => handleSkillClick(skill.id)}
                size="small"
                sx={{
                  height: 28,
                  fontSize: '0.75rem',
                  fontWeight: isActive ? 700 : 500,
                  bgcolor: isActive ? 'primary.main' : 'background.default',
                  color: isActive ? '#fff' : 'text.primary',
                  border: '1px solid',
                  borderColor: isActive ? 'primary.main' : 'divider',
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    bgcolor: isActive ? 'primary.dark' : 'action.hover',
                  },
                }}
              />
            </Tooltip>
          );
        })}
      </Box>
    </>
  );
};

export default SkillForms;
