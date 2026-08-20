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
import KeyIcon from '@mui/icons-material/Key';
import WavingHandIcon from '@mui/icons-material/WavingHand';
import EditIcon from '@mui/icons-material/Edit';
import { useApp } from '../AppContext';
import StatCard from '../components/StatCard';
import PageHeader from '../components/PageHeader';
import {
  generateCoachingPlan,
  generateCoachingFollowUp,
  type CoachingPlanDraft,
} from '../ai';
import { addDays, todayLocal } from '../dateUtils';
import type { CoachingPlan, CoachProfile } from '../types';
import { loadAiApiKey, saveAiApiKey, loadCoachProfile, saveCoachProfile } from '../storage';

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
    remember, coachMemories, coachProfile, updateCoachProfile,
  } = useApp();

  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<CoachingPlanDraft | null>(null);
  const [editingSteps, setEditingSteps] = useState<string[]>([]);
  const [editingCadence, setEditingCadence] = useState(3);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [responding, setResponding] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const [profile, setProfile] = useState<CoachProfile | null>(coachProfile ?? loadCoachProfile());
  const [editingProfile, setEditingProfile] = useState<CoachProfile | null>(null);
  const [apiKey, setApiKey] = useState(() => loadAiApiKey());
  const [showKey, setShowKey] = useState(false);

  const hasProfile = !!profile && profile.onboarding_complete;
  const needsProfile = !hasProfile;
  const needsKey = !apiKey.trim();

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
      const plan = await generateCoachingPlan(entryList.slice(-14), targets, reflections, journal, coachMemories);
      setDraft(plan);
      setEditingSteps(plan.action_steps);
      setEditingCadence(plan.cadence_days);
      if (plan.memory) remember(plan.memory, 'coaching');
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
      const result = await generateCoachingFollowUp(planDraft, entryList.slice(-7), text, coachMemories);
      if (result.memory) remember(result.memory, 'coaching');
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

  const startOnboarding = () => {
    setEditingProfile(
      profile ?? {
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
      },
    );
  };

  const saveProfile = () => {
    if (!editingProfile) return;
    const updated: CoachProfile = {
      ...editingProfile,
      onboarding_complete: true,
      updated_at: new Date().toISOString(),
    };
    saveCoachProfile(updated);
    updateCoachProfile(updated);
    setProfile(updated);
    setEditingProfile(null);
    if (!hasProfile) {
      const facts = [
        updated.main_goal ? `Main goal right now: ${updated.main_goal}` : '',
        updated.big_goal ? `Bigger ambition: ${updated.big_goal}` : '',
        updated.struggles ? `Struggles with: ${updated.struggles}` : '',
        updated.stress_sources ? `Stressed by: ${updated.stress_sources}` : '',
        updated.motivation ? `Motivated by: ${updated.motivation}` : '',
        updated.coaching_style ? `Prefers coaching that: ${updated.coaching_style === 'push' ? 'pushes hard' : updated.coaching_style === 'encourage' ? 'encourages gently' : 'balances push and encouragement'}` : '',
      ].filter(Boolean);
      if (facts.length > 0) remember(facts.join('. '), 'profile');
    }
    notify(hasProfile ? 'Coach profile updated — I will coach to that from now on.' : "Thanks! Now I know you. I'll personalize every coaching plan and message to you.", 'success');
  };

  const saveKey = () => {
    saveAiApiKey(apiKey);
    setShowKey(false);
    notify('AI provider key saved — coaching is live.', 'success');
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 900, mx: 'auto' }}>
      <PageHeader
        title="Coaching"
        subtitle="Personalized plans and follow-ups built from your real data."
        action={
          <Box sx={{ display: 'flex', gap: 1 }}>
            {hasProfile && (
              <Button size="small" variant="outlined" onClick={startOnboarding} startIcon={<EditIcon />} sx={{ fontWeight: 600 }}>
                My Profile
              </Button>
            )}
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
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {needsKey && (
        <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }} icon={<KeyIcon />} action={
          <Button color="inherit" size="small" onClick={() => setShowKey(true)}>
            {showKey ? 'Hide' : 'Add Key'}
          </Button>
        }>
          Add your AI provider key to enable live coaching.
        </Alert>
      )}

      {showKey && (
        <Box sx={{ mb: 2 }}>
          <StatCard title="AI Provider Key">
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Paste your OpenAI-compatible API key. It's stored only in this browser and used to power your coach's responses, coaching plans, follow-ups, and insights.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                type="password"
                fullWidth
                size="small"
                placeholder="sk-..."
              />
              <Button variant="contained" onClick={saveKey} sx={{ flexShrink: 0 }} disabled={!apiKey.trim()}>
                Save
              </Button>
            </Box>
          </StatCard>
        </Box>
      )}

      {editingProfile && (
        <Box sx={{ mb: 2 }}>
          <StatCard
            title={hasProfile ? 'My Coaching Profile' : "Let's get to know each other"}
            action={
              hasProfile ? (
                <IconButton size="small" onClick={() => setEditingProfile(null)} aria-label="Close">
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              ) : undefined
            }
          >
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              {hasProfile
                ? 'Update anything and your coach will adapt.'
                : "Answer whatever you can — even a few lines help me coach you properly. I'll use this to push, encourage, and motivate you toward real success."}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
              <TextField label="Your role / what you do at work" value={editingProfile.role} onChange={(e) => setEditingProfile({ ...editingProfile, role: e.target.value })} fullWidth size="small" />
              <TextField label="What does success look like for you right now?" value={editingProfile.main_goal} onChange={(e) => setEditingProfile({ ...editingProfile, main_goal: e.target.value })} fullWidth size="small" />
              <TextField label="Your bigger ambition (months ahead)" value={editingProfile.big_goal} onChange={(e) => setEditingProfile({ ...editingProfile, big_goal: e.target.value })} fullWidth size="small" />
              <TextField label="Your strengths — what you're naturally good at" value={editingProfile.strengths} onChange={(e) => setEditingProfile({ ...editingProfile, strengths: e.target.value })} fullWidth size="small" />
              <TextField label="What you struggle with most" value={editingProfile.struggles} onChange={(e) => setEditingProfile({ ...editingProfile, struggles: e.target.value })} fullWidth size="small" />
              <TextField label="What stresses you out at work" value={editingProfile.stress_sources} onChange={(e) => setEditingProfile({ ...editingProfile, stress_sources: e.target.value })} fullWidth size="small" />
              <TextField label="What motivates you" value={editingProfile.motivation} onChange={(e) => setEditingProfile({ ...editingProfile, motivation: e.target.value })} fullWidth size="small" />
              <TextField label="What demotivates or blocks you" value={editingProfile.demotivators} onChange={(e) => setEditingProfile({ ...editingProfile, demotivators: e.target.value })} fullWidth size="small" />
              <TextField select label="How do you like to be coached?" value={editingProfile.coaching_style} onChange={(e) => setEditingProfile({ ...editingProfile, coaching_style: e.target.value as CoachProfile['coaching_style'] })} size="small" sx={{ maxWidth: 300 }}>
                <MenuItem value="push">Push me hard — don't let me coast</MenuItem>
                <MenuItem value="encourage">Encourage me gently</MenuItem>
                <MenuItem value="balanced">Balance both</MenuItem>
              </TextField>
              <TextField label="Anything else you want me to know about you?" value={editingProfile.context} onChange={(e) => setEditingProfile({ ...editingProfile, context: e.target.value })} fullWidth size="small" multiline minRows={2} />
            </Box>
            <Button variant="contained" onClick={saveProfile} sx={{ mt: 1.5 }} startIcon={<WavingHandIcon />}>
              {hasProfile ? 'Save Profile' : 'Start Coaching'}
            </Button>
          </StatCard>
        </Box>
      )}

      {needsProfile && !editingProfile && (
        <Box sx={{ mb: 2 }}>
          <StatCard title="Your coach wants to know you">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <WavingHandIcon sx={{ fontSize: 32, color: 'primary.main' }} />
              <Box sx={{ flex: 1, minWidth: 220 }}>
                <Typography variant="body2" color="text.secondary">
                  To coach you properly I need to understand your role, your struggles, what stresses you, what drives you, and how you like to be coached. It only takes a couple of minutes.
                </Typography>
              </Box>
              <Button variant="contained" onClick={startOnboarding} sx={{ fontWeight: 600 }}>
                Get to Know Me
              </Button>
            </Box>
          </StatCard>
        </Box>
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