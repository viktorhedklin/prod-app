import { useMemo, useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Fade from '@mui/material/Fade';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import CloseIcon from '@mui/icons-material/Close';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useApp } from '../AppContext';
import { makeEmptyEntry } from '../defaults';
import { computeWeightedGrade, tierFromValue, aggregateEntries, formatTierLabel, computeWeeklyGrade } from '../grading';
import StatCard from '../components/StatCard';
import TierChip from '../components/TierChip';
import DateNav from '../components/DateNav';
import PageHeader from '../components/PageHeader';
import type { DailyEntry, WeeklyEntry } from '../types';
import { todayLocal, dateFromKey, addDays, startOfWeekLocal } from '../dateUtils';

const STEPPER_FIELDS: Array<{ key: keyof DailyEntry; label: string; min?: number; max?: number; points?: string }> = [
  { key: 'chats_handled', label: 'Chats Handled', min: 0, points: '×1' },
  { key: 'emails_handled', label: 'Emails Handled', min: 0, points: '×1' },
  { key: 'tasks_handled', label: 'Tasks Handled', min: 0 },
  { key: 'internal_notes', label: 'Internal Notes', min: 0, points: '×0.5' },
];

const PRECISE_FIELDS: Array<{
  key: keyof DailyEntry;
  label: string;
  min?: number;
  max?: number;
  step?: string;
  placeholder?: string;
  adornment?: string;
}> = [
  { key: 'escalation_accuracy_pct', label: 'Escalation Accuracy %', min: 0, max: 100, step: '0.1', placeholder: '0–100', adornment: '%' },
];

function StepperRow({
  label,
  value,
  points,
  onIncrement,
  onDecrement,
  min,
  max,
}: {
  label: string;
  value: number;
  points?: string;
  onIncrement: () => void;
  onDecrement: () => void;
  min?: number;
  max?: number;
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
        transition: 'background-color 0.2s ease',
        '&:hover': { bgcolor: 'action.hover' },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {label}
        </Typography>
        {points && (
          <Chip label={points} size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: 'action.selected' }} />
        )}
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
            color: 'text.secondary',
            transition: 'all 0.2s ease',
            '&:hover': {
              borderColor: 'error.main',
              color: 'error.main',
              bgcolor: 'error.light',
            },
            '&:active': { transform: 'scale(0.85)' },
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
              transition: 'color 0.3s ease',
            }}
          >
            {value}
          </Typography>
        </Fade>
        <IconButton
          size="small"
          onClick={() => handleFlash('up', onIncrement)}
          disabled={max !== undefined && value >= max}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            width: 28,
            height: 28,
            color: 'text.secondary',
            transition: 'all 0.2s ease',
            '&:hover': {
              borderColor: 'primary.main',
              color: 'primary.main',
              bgcolor: 'primary.main' + '0A',
            },
            '&:active': { transform: 'scale(0.85)' },
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

  const avg =
    ratings.length > 0
      ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2)
      : '—';

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          CSAT Ratings
        </Typography>
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
            sx={{
              p: 0.5,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              color: 'text.secondary',
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: 'warning.main',
                color: 'warning.main',
                bgcolor: 'warning.light',
                transform: 'scale(1.15)',
              },
            }}
          >
            {(hovered !== null ? star <= hovered : false) ? (
              <StarIcon sx={{ fontSize: 18, color: 'warning.main', animation: 'fadeInUp 0.2s ease both' }} />
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
              sx={{
                bgcolor: 'action.selected',
                fontSize: '0.75rem',
                height: 24,
                animation: 'fadeInUp 0.3s ease both',
                animationDelay: `${i * 30}ms`,
                '&:hover': { transform: 'scale(1.05)' },
                '& .MuiChip-deleteIcon': { fontSize: 14, color: 'text.secondary', '&:hover': { color: 'error.main' } },
              }}
            />
          ))}
        </Box>
      </Fade>
    </Box>
  );
}

function LiveScoreRing({ score }: { score: number | null }) {
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
        sx={{
          color: 'common.white',
          opacity: score === null ? 0.35 : 1,
          transition: 'all 0.8s cubic-bezier(0.4,0,0.2,1)',
        }}
      />
      <Typography
        sx={{
          position: 'absolute',
          fontWeight: 700,
          fontSize: '1.1rem',
          color: 'common.white',
          transition: 'all 0.3s ease',
        }}
      >
        {score === null ? '—' : score.toFixed(1)}
      </Typography>
    </Box>
  );
}

function productivityPoints(entry: DailyEntry): number {
  return (
    entry.chats_handled +
    entry.emails_handled +
    entry.task_hours_submitted * 10 +
    entry.internal_notes * 0.5
  );
}

export default function Today() {
  const { entries, targets, updateEntry, notify, qaEntries, weeklyEntries, saveWeeklyEntry, deleteWeeklyEntry } = useApp();
  const [mode, setMode] = useState<'daily' | 'weekly'>('daily');
  const [date, setDate] = useState(todayLocal());
  const [weekStart, setWeekStart] = useState(startOfWeekLocal());
  const rawEntry = entries[date] ?? makeEmptyEntry(date);
  const entry = useMemo<DailyEntry>(
    () => ({
      ...makeEmptyEntry(date),
      ...rawEntry,
      csat_ratings: Array.isArray(rawEntry.csat_ratings) ? rawEntry.csat_ratings : [],
    }),
    [date, rawEntry],
  );

  const datesWithData = useMemo(() => new Set(Object.keys(entries)), [entries]);
  const weekly = weeklyEntries[weekStart];

  const weekLabel = useMemo(() => {
    const end = addDays(weekStart, 6);
    const s = dateFromKey(weekStart);
    const e = dateFromKey(end);
    const fmt = (d: Date) =>
      d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${fmt(s)} – ${fmt(e)}`;
  }, [weekStart]);

  const latestQa = useMemo(() => {
    const sorted = Object.values(qaEntries).sort((a, b) => b.week_start.localeCompare(a.week_start));
    return sorted[0]?.qa_percentage ?? null;
  }, [qaEntries]);

  const weeklyTier = useMemo(() => {
    if (!weekly) return null;
    const realInWeek = Object.entries(entries)
      .filter(([date]) => date >= weekStart && date <= addDays(weekStart, 6))
      .map(([, e]) => e);
    const { grade } = computeWeeklyGrade(weekStart, realInWeek, weekly, targets, latestQa);
    return grade;
  }, [weekly, weekStart, targets, latestQa, entries]);

  const handleStep = (key: keyof DailyEntry, delta: number, min?: number, max?: number) => {
    const current = entry[key] as number;
    const next = current + delta;
    if (min !== undefined && next < min) return;
    if (max !== undefined && next > max) return;
    updateEntry(date, { [key]: next });
  };

  const handlePrecise = (key: keyof DailyEntry, raw: string) => {
    if (raw === '' || raw === null) {
      updateEntry(date, { [key]: null });
      return;
    }
    const val = parseFloat(raw);
    if (!isNaN(val)) {
      updateEntry(date, { [key]: val });
    }
  };

  const handleAddCsatRating = (rating: number) => {
    updateEntry(date, { csat_ratings: [...entry.csat_ratings, rating] });
    notify(`${rating}-star CSAT rating added`);
  };

  const handleRemoveCsatRating = (index: number) => {
    updateEntry(date, { csat_ratings: entry.csat_ratings.filter((_, i) => i !== index) });
  };

  const weeklyFields = useMemo(
    () => [
      { key: 'chats_handled' as const, label: 'Chats Handled (week)' },
      { key: 'emails_handled' as const, label: 'Emails Handled (week)' },
      { key: 'tasks_handled' as const, label: 'Tasks Handled (week)' },
      { key: 'internal_notes' as const, label: 'Internal Notes (week)' },
    ],
    [],
  );

  const handleWeeklyStep = (key: keyof WeeklyEntry, delta: number) => {
    const current = (weekly?.[key] as number) ?? 0;
    const next = Math.max(0, current + delta);
    const base: Omit<WeeklyEntry, 'created_at' | 'updated_at'> = weekly
      ? { ...weekly }
      : {
          week_start: weekStart,
          chats_handled: 0,
          emails_handled: 0,
          seek_feedback: 0,
          tasks_handled: 0,
          task_hours_logged: 0,
          task_hours_submitted: 0,
          internal_notes: 0,
          csat_ratings: [],
          escalations_raised: 0,
          escalation_accuracy_pct: null,
        };
    saveWeeklyEntry(weekStart, { ...base, [key]: next });
  };

  const handleWeeklyPrecise = (raw: string) => {
    const val = parseFloat(raw);
    const base: Omit<WeeklyEntry, 'created_at' | 'updated_at'> = weekly
      ? { ...weekly }
      : {
          week_start: weekStart,
          chats_handled: 0,
          emails_handled: 0,
          seek_feedback: 0,
          tasks_handled: 0,
          task_hours_logged: 0,
          task_hours_submitted: 0,
          internal_notes: 0,
          csat_ratings: [],
          escalations_raised: 0,
          escalation_accuracy_pct: null,
        };
    if (!isNaN(val)) {
      saveWeeklyEntry(weekStart, { ...base, escalation_accuracy_pct: val });
    }
  };

  const handleWeeklyCsat = (rating: number) => {
    const base: Omit<WeeklyEntry, 'created_at' | 'updated_at'> = weekly
      ? { ...weekly }
      : {
          week_start: weekStart,
          chats_handled: 0,
          emails_handled: 0,
          seek_feedback: 0,
          tasks_handled: 0,
          task_hours_logged: 0,
          task_hours_submitted: 0,
          internal_notes: 0,
          csat_ratings: [],
          escalations_raised: 0,
          escalation_accuracy_pct: null,
        };
    saveWeeklyEntry(weekStart, { ...base, csat_ratings: [...(base.csat_ratings ?? []), rating] });
    notify(`${rating}-star weekly CSAT rating added`);
  };

  const handleWeeklyCsatRemove = (index: number) => {
    if (!weekly) return;
    saveWeeklyEntry(weekStart, {
      ...weekly,
      csat_ratings: weekly.csat_ratings.filter((_, i) => i !== index),
    });
  };

  const handleDeleteWeek = () => {
    deleteWeeklyEntry(weekStart);
    notify('Weekly data deleted for this week', 'info');
  };

  const aggregated = useMemo(() => aggregateEntries([entry], latestQa), [entry, latestQa]);

  const liveTiers = useMemo(() => {
    return targets.map((t) => {
      const val = aggregated[t.metric_key];
      const tier = tierFromValue(
        typeof val === 'number' ? val : null,
        t.thresholds,
        t.direction,
      );
      return { label: t.label, metric_key: t.metric_key, tier };
    });
  }, [aggregated, targets]);

  const { score, grade } = useMemo(() => computeWeightedGrade([entry], targets, latestQa), [entry, targets, latestQa]);

  const points = productivityPoints(entry);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 900, mx: 'auto' }}>
      <PageHeader
        title={mode === 'daily' ? 'Today' : 'Weekly Entry'}
        subtitle={
          mode === 'daily'
            ? 'Log each day\'s metrics — use the steppers or tap the numbers to type.'
            : 'Add totals for a whole week at once — past weeks too. These fill the daily trend.'
        }
        action={
          <ToggleButtonGroup
            value={mode}
            exclusive
            onChange={(_, v) => { if (v) setMode(v); }}
            size="small"
            sx={{ bgcolor: 'background.paper', '& .MuiToggleButton-root': { textTransform: 'none', fontWeight: 600, px: 2 } }}
          >
            <ToggleButton value="daily">Daily</ToggleButton>
            <ToggleButton value="weekly">Weekly</ToggleButton>
          </ToggleButtonGroup>
        }
      />

      {mode === 'weekly' ? (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <IconButton size="small" onClick={() => setWeekStart(addDays(weekStart, -7))} aria-label="Previous week">
              <ChevronLeftIcon />
            </IconButton>
            <Typography sx={{ fontWeight: 700, flex: 1, textAlign: 'center' }}>
              Week of {weekLabel}
            </Typography>
            <IconButton size="small" onClick={() => setWeekStart(addDays(weekStart, 7))} aria-label="Next week">
              <ChevronRightIcon />
            </IconButton>
            <Button size="small" variant="outlined" onClick={() => setWeekStart(startOfWeekLocal())} sx={{ ml: 1, fontWeight: 600 }}>
              This Week
            </Button>
          </Box>

          {weeklyTier && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Week score: <strong>{formatTierLabel(weeklyTier)}</strong>
              </Typography>
            </Box>
          )}

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <StatCard title="Weekly Productivity Totals" interactive>
                {weeklyFields.map((f) => (
                  <StepperRow
                    key={f.key}
                    label={f.label}
                    value={(weekly?.[f.key] as number) ?? 0}
                    onIncrement={() => handleWeeklyStep(f.key, 1)}
                    onDecrement={() => handleWeeklyStep(f.key, -1)}
                    min={0}
                  />
                ))}
                <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="caption" color="text.secondary">
                    Task hours come from your shift todo list (submitted ×10).
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                    {weekly
                      ? (weekly.chats_handled + weekly.emails_handled + weekly.task_hours_submitted * 10 + weekly.internal_notes * 0.5).toFixed(1)
                      : '0.0'} pts
                  </Typography>
                </Box>
              </StatCard>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <StatCard title="Weekly Precise Metrics" interactive>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <TextField
                    label="Escalation Accuracy % (week avg)"
                    type="number"
                    defaultValue={weekly?.escalation_accuracy_pct !== null && weekly?.escalation_accuracy_pct !== undefined ? String(weekly.escalation_accuracy_pct) : ''}
                    placeholder="0–100"
                    inputProps={{ min: 0, max: 100, step: 0.1 }}
                    onChange={(e) => handleWeeklyPrecise(e.target.value)}
                    fullWidth
                    size="small"
                    slotProps={{ input: { endAdornment: <InputAdornment position="end">%</InputAdornment> } }}
                  />
                </Box>
              </StatCard>

              <Box sx={{ mt: 2 }}>
                <StatCard title="Weekly CSAT Ratings" interactive>
                  <CsatRatingInput
                    ratings={weekly?.csat_ratings ?? []}
                    onAdd={handleWeeklyCsat}
                    onRemove={handleWeeklyCsatRemove}
                  />
                </StatCard>
              </Box>

              {weekly && (
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button size="small" color="error" variant="outlined" onClick={handleDeleteWeek}>
                    Delete this week's data
                  </Button>
                </Box>
              )}
            </Grid>
          </Grid>
        </Box>
      ) : (
        <>
      <DateNav date={date} onChange={setDate} datesWithData={datesWithData} />

      {score !== null && grade !== null && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {date === todayLocal() ? "Today's" : 'Day'} score:{' '}
            <strong>{score.toFixed(2)}</strong>
          </Typography>
        </Box>
      )}

      <Box
        sx={{
          mb: 2,
          p: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          borderRadius: 3,
          background: 'linear-gradient(135deg, #0F766E 0%, #0D9488 55%, #14B8A6 100%)',
          color: '#FFFFFF',
          overflow: 'hidden',
          position: 'relative',
          animation: 'fadeInUp 0.4s ease both',
          '&::after': {
            content: '""',
            position: 'absolute',
            width: 180,
            height: 180,
            borderRadius: '50%',
            right: -70,
            top: -90,
            bgcolor: 'rgba(255,255,255,0.08)',
          },
          '&::before': {
            content: '""',
            position: 'absolute',
            width: 120,
            height: 120,
            borderRadius: '50%',
            right: 20,
            bottom: -60,
            bgcolor: 'rgba(255,255,255,0.05)',
          },
        }}
      >
        <LiveScoreRing score={score} />
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {score === null ? 'Start your score' : `You're tracking ${formatTierLabel(grade ?? 'PIP')}`}
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.78)' }}>
            Add volume, quality, and customer ratings to bring this day to life.
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <StatCard title="Productivity" interactive delay={50}>
            {STEPPER_FIELDS.map((f) => (
              <StepperRow
                key={f.key}
                label={f.label}
                value={entry[f.key] as number}
                points={f.points}
                onIncrement={() => handleStep(f.key, 1, f.min, f.max)}
                onDecrement={() => handleStep(f.key, -1, f.min, f.max)}
                min={f.min}
                max={f.max}
              />
            ))}
            <Box
              sx={{
                mt: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                pt: 1,
                borderTop: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography variant="caption" color="text.secondary">
                Task hours come from your shift todo list (×10 each, submitted only)
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                {points.toFixed(1)} pts
              </Typography>
            </Box>
          </StatCard>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <StatCard title="Precise Metrics" interactive delay={100}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {PRECISE_FIELDS.map((f) => {
                const raw = entry[f.key];
                const displayVal = raw !== null && raw !== undefined ? String(raw) : '';
                return (
                  <TextField
                    key={f.key}
                    label={f.label}
                    type="number"
                    defaultValue={displayVal}
                    placeholder={f.placeholder}
                    inputProps={{ min: f.min, max: f.max, step: f.step }}
                    onBlur={(e) => handlePrecise(f.key, e.target.value)}
                    onChange={(e) => handlePrecise(f.key, e.target.value)}
                    fullWidth
                    size="small"
                    slotProps={{
                      input: f.adornment
                        ? { endAdornment: <InputAdornment position="end">{f.adornment}</InputAdornment> }
                        : undefined,
                    }}
                  />
                );
              })}
            </Box>
          </StatCard>

          <Box sx={{ mt: 2 }}>
            <StatCard title="CSAT Ratings" interactive delay={150}>
              <CsatRatingInput
                ratings={entry.csat_ratings}
                onAdd={handleAddCsatRating}
                onRemove={handleRemoveCsatRating}
              />
            </StatCard>
          </Box>

          <Box sx={{ mt: 2 }}>
            <StatCard title="Day's Live Tiers" delay={200}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {liveTiers.map((lt) => (
                  <Box key={lt.metric_key} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                      {lt.label}:
                    </Typography>
                    {lt.tier ? (
                      <TierChip tier={lt.tier} />
                    ) : (
                      <Typography variant="caption" color="text.secondary">—</Typography>
                    )}
                  </Box>
                ))}
              </Box>
            </StatCard>
          </Box>
        </Grid>
      </Grid>
        </>
      )}
    </Box>
  );
}