import { useMemo, useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Fade from '@mui/material/Fade';
import LinearProgress from '@mui/material/LinearProgress';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import CloseIcon from '@mui/icons-material/Close';
import { useApp } from '../AppContext';
import { makeEmptyEntry } from '../defaults';
import { computeWeightedGrade, tierFromValue, aggregateEntries, formatTierLabel, computeProductivityPoints, getOpenShiftItems } from '../grading';
import StatCard from '../components/StatCard';
import TierChip from '../components/TierChip';
import DateNav from '../components/DateNav';
import type { DailyEntry } from '../types';
import type { Tier } from '../types';
import { todayLocal } from '../dates';

const STEPPER_FIELDS: Array<{ key: keyof DailyEntry; label: string; hint?: string; min?: number }> = [
  { key: 'chats_handled', label: 'Chats', hint: '1 point each', min: 0 },
  { key: 'emails_handled', label: 'Emails', hint: '1 point each', min: 0 },
  { key: 'internal_notes', label: 'Internal Notes', hint: '0.5 points each', min: 0 },
  { key: 'escalations_raised', label: 'Escalations Raised', hint: 'Used for escalation rate', min: 0 },
];

function StepperRow({
  label,
  hint,
  value,
  onIncrement,
  onDecrement,
  min,
}: {
  label: string;
  hint?: string;
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  min?: number;
}) {
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);

  const handleFlash = (direction: 'up' | 'down', fn: () => void) => {
    fn();
    setFlash(direction);
    setTimeout(() => setFlash(null), 300);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        py: 1,
        borderBottom: '1px solid',
        borderColor: 'divider',
        '&:last-child': { borderBottom: 'none' },
        '&:hover': { bgcolor: 'action.hover' },
      }}
    >
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>{label}</Typography>
        {hint && <Typography variant="caption" color="text.secondary">{hint}</Typography>}
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <IconButton
          size="small"
          onClick={() => handleFlash('down', onDecrement)}
          disabled={min !== undefined && value <= min}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            width: 28,
            height: 28,
          }}
        >
          <RemoveIcon sx={{ fontSize: 14 }} />
        </IconButton>
        <Fade in={flash !== null} key={flash ?? 'idle'} timeout={150}>
          <Typography
            sx={{
              width: 36,
              textAlign: 'center',
              fontWeight: 700,
              fontSize: '0.9375rem',
              fontVariantNumeric: 'tabular-nums',
              color: flash === 'up' ? 'success.main' : flash === 'down' ? 'error.main' : 'text.primary',
            }}
          >
            {value}
          </Typography>
        </Fade>
        <IconButton
          size="small"
          onClick={() => handleFlash('up', onIncrement)}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            width: 28,
            height: 28,
          }}
        >
          <AddIcon sx={{ fontSize: 14 }} />
        </IconButton>
      </Box>
    </Box>
  );
}

function CsatRatingInput({
  ratings,
  onAdd,
  onRemove,
}: {
  ratings: number[];
  onAdd: (rating: number) => void;
  onRemove: (index: number) => void;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const avg = ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2) : '—';

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>CSAT Ratings</Typography>
        <Typography variant="caption" color="text.secondary">
          Avg: <strong>{avg}</strong> ({ratings.length} {ratings.length === 1 ? 'response' : 'responses'})
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <IconButton
            key={star}
            size="small"
            onClick={() => onAdd(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(null)}
            sx={{ p: 0.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
          >
            {(hovered !== null ? star <= hovered : false) ? (
              <StarIcon sx={{ fontSize: 18, color: 'warning.main' }} />
            ) : (
              <StarBorderIcon sx={{ fontSize: 18 }} />
            )}
          </IconButton>
        ))}
      </Box>
      <Fade in={ratings.length > 0}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {ratings.map((r, i) => (
            <Chip
              key={`${r}-${i}`}
              label={`${r}★`}
              size="small"
              onDelete={() => onRemove(i)}
              deleteIcon={<CloseIcon sx={{ fontSize: 14 }} />}
              sx={{ bgcolor: 'action.selected', fontSize: '0.75rem', height: 24 }}
            />
          ))}
        </Box>
      </Fade>
    </Box>
  );
}

function LiveScoreRing({ score }: { score: number | null; grade?: Tier | null }) {
  const pct = score !== null ? Math.min((score / 5) * 100, 100) : 0;
  const [displayPct, setDisplayPct] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setDisplayPct(pct), 100);
    return () => clearTimeout(timer);
  }, [pct]);

  return (
    <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <CircularProgress
        variant="determinate"
        value={score === null ? 0 : displayPct}
        size={74}
        thickness={5}
        sx={{ color: 'common.white', opacity: score === null ? 0.35 : 1 }}
      />
      <Typography sx={{ position: 'absolute', fontWeight: 700, fontSize: '1.1rem', color: 'common.white' }}>
        {score === null ? '—' : score.toFixed(1)}
      </Typography>
    </Box>
  );
}

export default function Today() {
  const { entries, targets, updateEntry, notify, qaEntries, tasks, escalations } = useApp();
  const [date, setDate] = useState(todayLocal());
  const rawEntry = entries[date] ?? makeEmptyEntry(date);
  const entry: DailyEntry = {
    ...makeEmptyEntry(date),
    ...rawEntry,
    internal_notes: rawEntry.internal_notes ?? rawEntry.seek_feedback ?? 0,
    csat_ratings: Array.isArray(rawEntry.csat_ratings) ? rawEntry.csat_ratings : [],
  };

  const datesWithData = useMemo(() => {
    return new Set(
      Object.values(entries)
        .filter((e) => e.chats_handled + e.emails_handled + e.internal_notes + e.task_hours_submitted + e.csat_ratings.length > 0)
        .map((e) => e.date),
    );
  }, [entries]);

  const latestQa = useMemo(() => {
    const sorted = Object.values(qaEntries).sort((a, b) => b.week_start.localeCompare(a.week_start));
    return sorted[0]?.qa_percentage ?? null;
  }, [qaEntries]);

  const { pendingTasks } = useMemo(() => getOpenShiftItems(tasks, escalations, date), [tasks, escalations, date]);
  const dayTodos = tasks.filter((t) => t.linked_date === date || t.completion_date === date);
  const todoProgress = dayTodos.length === 0 ? 100 : Math.round((dayTodos.filter((t) => t.status === 'submitted').length / dayTodos.length) * 100);

  const handleStep = (key: keyof DailyEntry, delta: number, min?: number) => {
    const current = Number(entry[key] ?? 0);
    const next = current + delta;
    if (min !== undefined && next < min) return;
    updateEntry(date, { [key]: next });
  };

  const handlePrecise = (key: keyof DailyEntry, raw: string) => {
    if (raw === '') {
      updateEntry(date, { [key]: key === 'escalation_accuracy_pct' ? null : 0 });
      return;
    }
    const val = parseFloat(raw);
    if (!isNaN(val)) updateEntry(date, { [key]: val });
  };

  const handleAddCsatRating = (rating: number) => {
    updateEntry(date, { csat_ratings: [...entry.csat_ratings, rating] });
    notify(`${rating}-star CSAT rating added`);
  };

  const handleRemoveCsatRating = (index: number) => {
    updateEntry(date, { csat_ratings: entry.csat_ratings.filter((_, i) => i !== index) });
  };

  const aggregated = useMemo(() => aggregateEntries([entry], latestQa), [entry, latestQa]);
  const points = useMemo(() => computeProductivityPoints(entry), [entry]);
  const liveTiers = useMemo(() => {
    return targets.map((t) => {
      const val = aggregated[t.metric_key];
      const tier = tierFromValue(typeof val === 'number' ? val : null, t.thresholds, t.direction);
      return { label: t.label, metric_key: t.metric_key, tier };
    });
  }, [aggregated, targets]);
  const { score, grade } = useMemo(() => computeWeightedGrade([entry], targets, latestQa), [entry, targets, latestQa]);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 900, mx: 'auto' }}>
      <DateNav date={date} onChange={setDate} datesWithData={datesWithData} />

      <Box
        sx={{
          mb: 2,
          p: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          borderRadius: 3,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <LiveScoreRing score={score} grade={grade} />
        <Box sx={{ position: 'relative', zIndex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {score === null ? 'Start this day' : `Tracking ${formatTierLabel(grade ?? 'PIP')} · ${points.total.toFixed(1)} prod pts`}
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.78)' }}>
            chats + emails + notes×0.5 + submitted hours×10. Pending todos do not count.
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <StatCard title="Volume" interactive delay={50}>
            {STEPPER_FIELDS.map((f) => (
              <StepperRow
                key={f.key}
                label={f.label}
                hint={f.hint}
                value={Number(entry[f.key] ?? 0)}
                onIncrement={() => handleStep(f.key, 1, f.min)}
                onDecrement={() => handleStep(f.key, -1, f.min)}
                min={f.min}
              />
            ))}
          </StatCard>

          <Box sx={{ mt: 2 }}>
            <StatCard title="Productivity Breakdown" delay={80}>
              <PointRow label="Chats" value={points.chats} />
              <PointRow label="Emails" value={points.emails} />
              <PointRow label={`Internal notes (${entry.internal_notes} × 0.5)`} value={points.notes} />
              <PointRow label={`Submitted task hours (${entry.task_hours_submitted} × 10)`} value={points.taskHours} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1, mt: 0.5, borderTop: '1px solid', borderColor: 'divider' }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>Total</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{points.total.toFixed(1)}</Typography>
              </Box>
            </StatCard>
          </Box>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <StatCard title="Quality & Escalation" interactive delay={100}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <TextField
                label="Escalation Accuracy %"
                type="number"
                value={entry.escalation_accuracy_pct ?? ''}
                placeholder="0–100"
                onChange={(e) => handlePrecise('escalation_accuracy_pct', e.target.value)}
                fullWidth
                size="small"
                helperText="Per-shift accuracy. Still counted in your grade."
                slotProps={{ input: { endAdornment: <InputAdornment position="end">%</InputAdornment> } }}
              />
              <TextField
                label="Submitted task hours"
                type="number"
                value={entry.task_hours_submitted || ''}
                onChange={(e) => handlePrecise('task_hours_submitted', e.target.value)}
                fullWidth
                size="small"
                helperText="Only submitted hours count. Completing a Shift Todo adds hours here automatically."
                slotProps={{ input: { endAdornment: <InputAdornment position="end">h</InputAdornment> } }}
              />
            </Box>
          </StatCard>

          <Box sx={{ mt: 2 }}>
            <StatCard title="CSAT Ratings" interactive delay={150}>
              <CsatRatingInput ratings={entry.csat_ratings} onAdd={handleAddCsatRating} onRemove={handleRemoveCsatRating} />
            </StatCard>
          </Box>

          <Box sx={{ mt: 2 }}>
            <StatCard title="Shift Todo Progress" delay={180}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {dayTodos.length === 0 ? 'No todos for this day' : `${dayTodos.length - pendingTasks.length}/${dayTodos.length} submitted`}
                </Typography>
                <Typography variant="caption" color={todoProgress === 100 ? 'success.main' : 'warning.main'}>
                  {todoProgress}%
                </Typography>
              </Box>
              <LinearProgress variant="determinate" value={todoProgress} sx={{ height: 8, borderRadius: 4 }} />
              {pendingTasks.length > 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  {pendingTasks.length} open. End Shift stays locked until this is 100%.
                </Typography>
              )}
            </StatCard>
          </Box>

          <Box sx={{ mt: 2 }}>
            <StatCard title="Live Tiers" delay={200}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {liveTiers.map((lt) => (
                  <Box key={lt.metric_key} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                      {lt.label}:
                    </Typography>
                    {lt.tier ? <TierChip tier={lt.tier} /> : <Typography variant="caption" color="text.secondary">—</Typography>}
                  </Box>
                ))}
              </Box>
            </StatCard>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}

function PointRow({ label, value }: { label: string; value: number }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.4 }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
        {value.toFixed(1)}
      </Typography>
    </Box>
  );
}
