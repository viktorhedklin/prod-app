import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import MenuItem from '@mui/material/MenuItem';
import SendIcon from '@mui/icons-material/Send';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import ScheduleIcon from '@mui/icons-material/Schedule';
import { useApp } from '../AppContext';
import StatCard from '../components/StatCard';
import {
  generateCoachingPlan,
  generateCoachingFollowUp,
  type CoachingPlanDraft,
} from '../ai';
import { addDays, todayLocal } from '../dateUtils';
import type { CoachingPlan } from '../types';

function daysUntil(dateKey: string | null | undefined): number | null {
  if (!dateKey) return null;
  const today = todayLocal();
  if (dateKey <= today) return 0;
  let days = 0;
  let cursor = today;
  while (cursor < dateKey) {
    cursor = addDays(cursor, 1);
    days++;
  }
  return days;
}

function genId(): string {
  return `coach-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function Coaching() {
  const {
    entries, targets, reflections, journal, coachingPlans,
    upsertCoachingPlan, removeCoachingPlan, notify,
  } = useApp();

  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<CoachingPlanDraft | null>(null);
  const [editingSteps, setEditingSteps] = useState<string[]>([]);
  const [editingCadence, setEditingCadence] = useState(3);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [responding, setResponding] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const entryList = useMemo(() => Object.values(entries).sort((a, b) => a.date.localeCompare(b.date)), [entries]);
  const sortedPlans = useMemo(
    () => [...coachingPlans].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? '')),
    [coachingPlans],
  );

  const duePlans = sortedPlans.filter(
    (p) => p.status === 'active' && p.next_follow_up_date && p.next_follow_up_date <= todayLocal(),
  );

  const handleGenerate = async () => {
    setError(null);
    setCreating(true);
    try {
      const plan = await generateCoachingPlan(entryList.slice(-14), targets, reflections, journal);
      setDraft(plan);
      setEditingSteps(plan.action_steps);
      setEditingCadence(plan.cadence_days);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate a coaching plan.');
    } finally {
      setCreating(false);
    }
  };

  const handleSavePlan = () => {
    if (!draft) return;
    const today = todayLocal();
    const plan: CoachingPlan = {
      id: genId(),
      status: 'active',
      focus_area: draft.focus_area,
      goal: draft.goal,
      why_it_matters: draft.why_it_matters,
      action_steps: editingSteps.filter((s) => s.trim().length > 0),
      cadence_days: Math.max(1, Math.min(14, editingCadence)),
      next_follow_up_date: addDays(today, Math.max(1, Math.min(14, editingCadence))),
      last_check_in_date: null,
      follow_up_prompt: draft.follow_up_prompt,
      check_in_history: [],
      source_metric: draft.source_metric,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    upsertCoachingPlan(plan);
    setDraft(null);
    setEditingSteps([]);
    setEditingCadence(3);
    notify('Coaching plan created. I will follow up automatically on your schedule.');
  };

  const handleRespond = async (plan: CoachingPlan) => {
    const text = (responses[plan.id] ?? '').trim();
    if (!text || responding[plan.id]) return;
    setResponding((prev) => ({ ...prev, [plan.id]: true }));
    setError(null);
    try {
      const planDraft: CoachingPlanDraft = {
        focus_area: plan.focus_area,
        goal: plan.goal,
        why_it_matters: plan.why_it_matters,
        action_steps: plan.action_steps,
        cadence_days: plan.cadence_days,
        follow_up_prompt: plan.follow_up_prompt,
        source_metric: plan.source_metric,
      };
      const result = await generateCoachingFollowUp(planDraft, entryList.slice(-7), text);
      const now = new Date().toISOString();
      const nextDate = addDays(todayLocal(), Math.max(1, Math.min(14, result.next_follow_up_days)));
      const updated: CoachingPlan = {
        ...plan,
        status: result.status,
        next_follow_up_date: nextDate,
        last_check_in_date: now,
        follow_up_prompt: result.coach_response,
        check_in_history: [
          ...plan.check_in_history,
          {
            checked_at: now,
            prompt: plan.follow_up_prompt,
            user_response: text,
            coach_response: result.coach_response,
          },
        ],
        updated_at: now,
      };
      upsertCoachingPlan(updated);
      setResponses((prev) => ({ ...prev, [plan.id]: '' }));
      notify(
        result.status === 'completed'
          ? 'Plan marked complete — great work staying on it!'
          : result.status === 'paused'
            ? 'Plan paused. Follow-ups will stop until you resume.'
            : 'Follow-up recorded. Next check-in scheduled.',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get a follow-up response.');
    } finally {
      setResponding((prev) => ({ ...prev, [plan.id]: false }));
    }
  };

  const setStatus = (plan: CoachingPlan, status: CoachingPlan['status']) => {
    upsertCoachingPlan({
      ...plan,
      status,
      updated_at: new Date().toISOString(),
    });
    notify(status === 'completed' ? 'Plan marked complete' : status === 'paused' ? 'Plan paused' : 'Plan resumed');
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 900, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Coaching
        </Typography>
        <Button
          variant="contained"
          size="small"
          onClick={handleGenerate}
          disabled={creating}
          startIcon={creating ? <CircularProgress size={16} /> : <AddIcon />}
          sx={{ fontWeight: 600 }}
        >
          {creating ? 'Analyzing...' : 'New Coaching Plan'}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {duePlans.length > 0 && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
          <strong>{duePlans.length} coaching plan{duePlans.length === 1 ? '' : 's'}</strong> waiting for a
          check-in. Respond below to keep the momentum going.
        </Alert>
      )}

      {!draft && sortedPlans.length === 0 && (
        <Box sx={{ mb: 2 }}>
          <StatCard title="Your coaching plans">
            <Typography variant="body2" color="text.secondary">
              Generate a plan based on your recent performance. I'll suggest one area to work on, set
              concrete steps, and follow up with you automatically so you stay accountable.
            </Typography>
          </StatCard>
        </Box>
      )}

      {/* Draft / Create flow */}
      {draft && (
        <Box sx={{ mb: 2 }}>
          <StatCard title="New Coaching Plan — review & customize">
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <TextField
                label="Focus area"
                value={draft.focus_area}
                onChange={(e) => setDraft({ ...draft, focus_area: e.target.value })}
                fullWidth
                size="small"
              />
              <TextField
                label="Goal"
                value={draft.goal}
                onChange={(e) => setDraft({ ...draft, goal: e.target.value })}
                fullWidth
                size="small"
              />
              <TextField
                label="Why it matters"
                value={draft.why_it_matters}
                onChange={(e) => setDraft({ ...draft, why_it_matters: e.target.value })}
                fullWidth
                size="small"
                multiline
                minRows={2}
              />
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  Action steps
                </Typography>
                {editingSteps.map((step, i) => (
                  <Box key={i} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                    <TextField
                      value={step}
                      onChange={(e) => {
                        const next = [...editingSteps];
                        next[i] = e.target.value;
                        setEditingSteps(next);
                      }}
                      fullWidth
                      size="small"
                    />
                    <IconButton
                      size="small"
                      onClick={() => setEditingSteps(editingSteps.filter((_, idx) => idx !== i))}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setEditingSteps([...editingSteps, ''])}
                >
                  + Add step
                </Button>
              </Box>
              <TextField
                select
                label="Follow-up cadence"
                value={editingCadence}
                onChange={(e) => setEditingCadence(Number(e.target.value))}
                size="small"
                sx={{ maxWidth: 240 }}
              >
                {[1, 2, 3, 4, 5, 7, 14].map((days) => (
                  <MenuItem key={days} value={days}>
                    Every {days} day{days === 1 ? '' : 's'}
                  </MenuItem>
                ))}
              </TextField>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="contained" onClick={handleSavePlan} sx={{ fontWeight: 600 }}>
                  Create Plan
                </Button>
                <Button variant="text" onClick={() => setDraft(null)} sx={{ color: 'text.secondary' }}>
                  Cancel
                </Button>
              </Box>
            </Box>
          </StatCard>
        </Box>
      )}

      {/* Plan cards */}
      {sortedPlans.map((plan) => {
        const days = daysUntil(plan.next_follow_up_date);
        const isDue = days === 0;
        const response = responses[plan.id] ?? '';
        const isLoading = responding[plan.id];
        return (
          <Box key={plan.id} sx={{ mb: 2 }}>
            <StatCard
              title={plan.focus_area}
              action={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Chip
                    label={plan.status.charAt(0).toUpperCase() + plan.status.slice(1)}
                    size="small"
                    sx={{
                      height: 20,
                      fontWeight: 600,
                      fontSize: '0.65rem',
                      bgcolor:
                        plan.status === 'active' ? 'success.light' : plan.status === 'paused' ? 'warning.light' : 'action.selected',
                      color:
                        plan.status === 'active' ? 'success.main' : plan.status === 'paused' ? 'warning.main' : 'text.secondary',
                    }}
                  />
                  {plan.status === 'active' && (
                    <IconButton size="small" onClick={() => setStatus(plan, 'paused')} aria-label="Pause plan">
                      <PauseIcon fontSize="small" />
                    </IconButton>
                  )}
                  {plan.status === 'paused' && (
                    <IconButton size="small" onClick={() => setStatus(plan, 'active')} aria-label="Resume plan">
                      <PlayArrowIcon fontSize="small" />
                    </IconButton>
                  )}
                  {plan.status === 'active' && (
                    <IconButton size="small" onClick={() => setStatus(plan, 'completed')} aria-label="Complete plan">
                      <CheckCircleIcon fontSize="small" />
                    </IconButton>
                  )}
                  <IconButton size="small" onClick={() => removeCoachingPlan(plan.id)} aria-label="Delete plan">
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Box>
              }
            >
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                {plan.goal}
              </Typography>
              {plan.why_it_matters && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                  {plan.why_it_matters}
                </Typography>
              )}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mb: 1.5 }}>
                {plan.action_steps.map((step, i) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                    <Typography variant="body2" color="text.secondary">
                      {step}
                    </Typography>
                  </Box>
                ))}
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
                {isDue && plan.status === 'active' ? (
                  <Chip
                    icon={<NotificationsActiveIcon />}
                    label="Due today — check in"
                    size="small"
                    sx={{ bgcolor: 'warning.light', color: 'warning.main', fontWeight: 600, height: 22 }}
                  />
                ) : (
                  <Chip
                    icon={<ScheduleIcon />}
                    label={
                      days === null
                        ? 'Schedule TBD'
                        : days === 0
                          ? 'Due today'
                          : `Next check-in in ${days} day${days === 1 ? '' : 's'}`
                    }
                    size="small"
                    sx={{ bgcolor: 'action.selected', height: 22 }}
                  />
                )}
                {plan.check_in_history.length > 0 && (
                  <Typography variant="caption" color="text.secondary">
                    {plan.check_in_history.length} check-in{plan.check_in_history.length === 1 ? '' : 's'}
                  </Typography>
                )}
              </Box>

              {/* Follow-up response */}
              {isDue && plan.status === 'active' && (
                <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                    }}
                  >
                    <Typography variant="body2">{plan.follow_up_prompt}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                      value={response}
                      onChange={(e) => setResponses((prev) => ({ ...prev, [plan.id]: e.target.value }))}
                      placeholder="How's it going? What have you done, what do you need?"
                      fullWidth
                      size="small"
                      multiline
                      maxRows={3}
                      disabled={isLoading}
                    />
                    <IconButton
                      onClick={() => handleRespond(plan)}
                      disabled={!response.trim() || isLoading}
                      color="primary"
                      sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 2,
                        alignSelf: 'flex-end',
                        width: 40,
                        height: 40,
                      }}
                    >
                      {isLoading ? <CircularProgress size={16} /> : <SendIcon fontSize="small" />}
                    </IconButton>
                  </Box>
                </Box>
              )}

              {/* Check-in history */}
              {plan.check_in_history.length > 0 && (
                <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {plan.check_in_history.slice(-3).reverse().map((c, idx) => (
                    <Box
                      key={`${c.checked_at}-${idx}`}
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: 'background.default',
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        {new Date(c.checked_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.25 }}>
                        {c.user_response}
                      </Typography>
                      <Box
                        sx={{
                          mt: 0.75,
                          p: 1,
                          borderRadius: 1.5,
                          bgcolor: 'success.light',
                        }}
                      >
                        <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 500 }}>
                          {c.coach_response}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </StatCard>
          </Box>
        );
      })}
    </Box>
  );
}