import { useState, useMemo, useEffect } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import Fade from '@mui/material/Fade';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Area,
  AreaChart,
} from 'recharts';
import { useApp } from '../useApp';
import type { PeriodType, KPITarget } from '../types';
import {
  computeWeightedGrade,
  computeRollingAverage,
  computeTaskHoursBacklog,
  getOpenShiftItems,
  formatTierLabel,
  computeWeeklyGrade,
} from '../grading';
import { startOfWeekLocal, todayLocal, dateKeyFromDate } from '../dateUtils';
import { generateDailyFocus } from '../ai';
import { computeReflectionStreak } from '../insights';
import TierChip from '../components/TierChip';
import StatCard from '../components/StatCard';
import EmptyState from '../components/EmptyState';
import type { Tier } from '../types';

function getPeriodEntries(
  entries: Record<string, import('../types').DailyEntry>,
  period: PeriodType,
): import('../types').DailyEntry[] {
  const today = new Date();

  if (period === 'today') {
    const todayStr = todayLocal(today);
    const e = entries[todayStr];
    return e ? [e] : [];
  }

  if (period === 'week') {
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const ds = dateKeyFromDate(d);
      if (entries[ds]) result.push(entries[ds]);
    }
    return result;
  }

  if (period === 'month') {
    const result = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const ds = dateKeyFromDate(d);
      if (entries[ds]) result.push(entries[ds]);
    }
    return result;
  }

  return [];
}

const GRADE_STYLES: Record<Tier, { bg: string; color: string }> = {
  S: { bg: 'success.light', color: 'success.main' },
  A_plus: { bg: 'success.light', color: 'success.main' },
  A: { bg: 'success.light', color: 'success.main' },
  B: { bg: 'warning.light', color: 'warning.main' },
  C: { bg: 'error.light', color: 'error.main' },
  PIP: { bg: 'error.light', color: 'error.main' },
};

function ScoreRing({ score, grade, size = 72, light = false }: { score: number | null; grade: Tier | null; size?: number; light?: boolean }) {
  const pct = score !== null ? Math.min((score / 5) * 100, 100) : 0;
  const displayPct = useCountUp(pct, 800);
  const styles = grade ? GRADE_STYLES[grade] : { bg: '#F5F5F5', color: light ? 'rgba(255,255,255,0.85)' : '#6B6B6B' };
  return (
    <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <CircularProgress
        variant="determinate"
        value={displayPct}
        size={size}
        thickness={5}
        sx={{
          color: light ? '#FFFFFF' : styles.color,
          '& .MuiCircularProgress-circle': {
            strokeLinecap: 'round',
          },
          '& .MuiCircularProgress-root': {
            color: light ? 'rgba(255,255,255,0.2)' : undefined,
          },
          transition: 'all 0.6s cubic-bezier(0.4,0,0.2,1)',
          animation: 'fadeInUp 0.5s ease both',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography sx={{ fontSize: size > 60 ? '1.5rem' : '1.1rem', fontWeight: 800, color: light ? '#FFFFFF' : styles.color, lineHeight: 1, fontFamily: '"Plus Jakarta Sans Variable", "Roboto", sans-serif' }}>
          {grade ? formatTierLabel(grade) : '—'}
        </Typography>
        {score !== null && (
          <Typography sx={{ fontSize: size > 60 ? '0.75rem' : '0.65rem', color: light ? 'rgba(255,255,255,0.8)' : 'text.secondary', fontWeight: 500, mt: 0.25 }}>
            {score.toFixed(2)}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

const PERIOD_LABELS: Record<PeriodType, string> = {
  today: 'Today',
  week: 'This Week',
  month: 'This Month',
};

function ShiftItemRow({
  children,
  overdue,
}: {
  children: React.ReactNode;
  overdue: boolean;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        py: 1,
        px: 1.5,
        borderRadius: 1.5,
        bgcolor: overdue ? 'error.light' : 'action.hover',
        mb: 0.75,
        gap: 2,
        transition: 'background-color 0.2s ease, transform 0.2s ease',
        '&:hover': {
          bgcolor: overdue ? 'error.light' : 'action.selected',
          transform: 'translateX(2px)',
        },
      }}
    >
      {children}
    </Box>
  );
}

// Animated count-up for the hero score
function useCountUp(target: number, duration = 700) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const from = display;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (target - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return display;
}

function MetricBar({ label, value, tier, weight, metricKey, target }: {
  label: string;
  value: number | null;
  tier: Tier | null;
  weight: number;
  metricKey: string;
  target?: KPITarget;
}) {
  const tierStyles = tier ? GRADE_STYLES[tier] : { bg: 'action.hover', color: 'text.secondary' };
  const pct = useMemo(() => {
    if (value === null || !target) return 0;
    const S = target.thresholds.S;
    if (!S) return 0;
    if (target.direction === 'lower_is_better') {
      return Math.min((S / Math.max(value, 0.001)) * 100, 100);
    }
    return Math.min((value / S) * 100, 100);
  }, [value, target]);
  return (
    <Box sx={{ mb: 1.5, '&:last-child': { mb: 0 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>{label}</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {tier && <TierChip tier={tier} />}
          <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', minWidth: 40, textAlign: 'right' }}>
            {value !== null ? formatValue(metricKey, value) : '—'}
          </Typography>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <LinearProgress
          variant="determinate"
          value={pct}
          sx={{
            flex: 1,
            height: 6,
            borderRadius: 3,
            bgcolor: 'action.hover',
            '& .MuiLinearProgress-bar': {
              bgcolor: tierStyles.color,
              borderRadius: 3,
              transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
            },
          }}
        />
        <Typography variant="caption" sx={{ color: 'text.secondary', minWidth: 32, textAlign: 'right' }}>
          {weight > 0 ? `${(weight * 100).toFixed(0)}%` : '—'}
        </Typography>
      </Box>
    </Box>
  );
}

export default function Dashboard({ onNavigate }: { onNavigate?: (tab: 'dashboard' | 'today' | 'tasks' | 'escalations' | 'reflection' | 'growth') => void }) {
  const { entries, tasks, escalations, targets, reflections, qaEntries, coachMemories, weeklyEntries } = useApp();
  const { updateTask, updateEscalation } = useApp();
  const [period, setPeriod] = useState<PeriodType>('today');
  const [dismissedItems, setDismissedItems] = useState<Set<string>>(new Set());
  const [dailyFocus, setDailyFocus] = useState<string | null>(null);
  const [focusLoading, setFocusLoading] = useState(false);

  const today = todayLocal();
  const streak = useMemo(() => computeReflectionStreak(reflections), [reflections]);
  const todayReflection = reflections[today];
  const recentReflections = useMemo(
    () => Object.values(reflections).sort((a, b) => b.entry_date.localeCompare(a.entry_date)).slice(0, 3),
    [reflections],
  );

  useEffect(() => {
    const entryList = Object.values(entries).sort((a, b) => a.date.localeCompare(b.date));
    if (entryList.length === 0) return;
    let cancelled = false;
    setFocusLoading(true);
    generateDailyFocus(entryList.slice(-7), targets, coachMemories)
      .then((focus) => { if (!cancelled) { setDailyFocus(focus); setFocusLoading(false); } })
      .catch(() => { if (!cancelled) { setDailyFocus('Log your metrics to receive a personalized focus area.'); setFocusLoading(false); } });
    return () => { cancelled = true; };
  }, [entries, targets]);

  const latestQa = useMemo(() => {
    const sorted = Object.values(qaEntries).sort((a, b) => b.week_start.localeCompare(a.week_start));
    return sorted[0]?.qa_percentage ?? null;
  }, [qaEntries]);

  const periodEntries = useMemo(
    () => getPeriodEntries(entries, period),
    [entries, period],
  );

  const { score, grade, breakdown } = useMemo(
    () => {
      if (period === 'week') {
        return computeWeeklyGrade(startOfWeekLocal(), getPeriodEntries(entries, 'week'), weeklyEntries[startOfWeekLocal()], targets, latestQa);
      }
      return computeWeightedGrade(periodEntries, targets, latestQa);
    },
    [period, periodEntries, entries, weeklyEntries, targets, latestQa],
  );

  const rollingData = useMemo(
    () => computeRollingAverage(entries, targets, 7, latestQa),
    [entries, targets, latestQa],
  );

  const backlog = useMemo(
    () => computeTaskHoursBacklog(Object.values(entries)),
    [entries],
  );

  const { pendingTasks, openEscalations } = useMemo(
    () => getOpenShiftItems(tasks, escalations),
    [tasks, escalations],
  );

  const visibleTasks = pendingTasks.filter((t) => !dismissedItems.has(t.task_id));
  const visibleEscalations = openEscalations.filter(
    (e) => !dismissedItems.has(e.escalation_id),
  );

  const handleMarkSubmitted = (taskId: string) => {
    updateTask(taskId, { status: 'submitted', submitted_at: new Date().toISOString() });
    setDismissedItems((prev) => new Set([...prev, taskId]));
  };

  const handleAdvanceEscalation = (escId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'open' ? 'escalated' : 'resolved';
    const patch: Partial<import('../types').EscalationItem> = { status: nextStatus as 'escalated' | 'resolved' };
    if (nextStatus === 'escalated') patch.escalated_at = new Date().toISOString();
    updateEscalation(escId, patch);
    if (nextStatus === 'resolved') {
      setDismissedItems((prev) => new Set([...prev, escId]));
    }
  };

  const chartData = rollingData.map((d) => ({
    date: d.date.slice(5),
    score: d.score,
  }));

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 900, mx: 'auto' }}>
      {/* Page header */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography
            sx={{
              fontSize: { xs: '1.35rem', md: '1.6rem' },
              fontWeight: 800,
              letterSpacing: '-0.02em',
              fontFamily: '"Plus Jakarta Sans Variable", "Roboto", sans-serif',
            }}
          >
            Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            Your performance at a glance — check in, spot trends, and close out your shift.
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
        </Typography>
      </Box>

      {/* Grade + Period toggle */}
      <Card elevation={0} sx={{ mb: 2, overflow: 'hidden', border: 'none', animation: 'fadeInUp 0.4s ease both' }}>
        <Box
          sx={{
            background: 'linear-gradient(135deg, #0F766E 0%, #0D9488 55%, #14B8A6 100%)',
            px: { xs: 2.5, md: 3 },
            py: 2.5,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <ScoreRing score={score} grade={grade} size={72} light />
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.75)' }}>
                  Current Score
                </Typography>
                <Typography sx={{ fontSize: '1.75rem', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.1, fontFamily: '"Plus Jakarta Sans Variable", "Roboto", sans-serif' }}>
                  {score !== null ? score.toFixed(2) : '—'}
                  <Typography component="span" variant="body2" sx={{ fontWeight: 400, ml: 0.5, color: 'rgba(255,255,255,0.7)' }}>/ 5.00</Typography>
                </Typography>
              </Box>
            </Box>
            <ButtonGroup size="small" variant="outlined" sx={{ flexShrink: 0 }}>
              {(['today', 'week', 'month'] as PeriodType[]).map((p) => (
                <Button
                  key={p}
                  onClick={() => setPeriod(p)}
                  sx={{
                    px: 2,
                    fontWeight: period === p ? 700 : 500,
                    bgcolor: period === p ? '#FFFFFF' : 'rgba(255,255,255,0.12)',
                    color: period === p ? 'primary.main' : '#FFFFFF',
                    borderColor: 'rgba(255,255,255,0.35)',
                    '&:hover': {
                      bgcolor: period === p ? '#FFFFFF' : 'rgba(255,255,255,0.2)',
                    },
                  }}
                >
                  {PERIOD_LABELS[p]}
                </Button>
              ))}
            </ButtonGroup>
          </Box>
        </Box>
      </Card>

      {/* Score Summary: Today / Week / Month */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {(['today', 'week', 'month'] as PeriodType[]).map((p, i) => {
          const pEntries = getPeriodEntries(entries, p);
          const weekCard = p === 'week'
            ? computeWeeklyGrade(startOfWeekLocal(), pEntries, weeklyEntries[startOfWeekLocal()], targets, latestQa)
            : null;
          const { score: s, grade: g } = weekCard ?? computeWeightedGrade(pEntries, targets, latestQa);
          return (
            <Grid size={{ xs: 12, sm: 4 }} key={p}>
              <StatCard title={PERIOD_LABELS[p]} interactive delay={i * 60}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5 }}>
                  <ScoreRing score={s} grade={g} size={48} />
                </Box>
              </StatCard>
            </Grid>
          );
        })}
      </Grid>

      {/* Daily Focus + Streak + CTA */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <StatCard title="Today's Focus" delay={200}>
            {focusLoading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
                <CircularProgress size={18} />
                <Typography variant="body2" color="text.secondary">Analyzing your data...</Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <LightbulbIcon sx={{ fontSize: 20, color: 'primary.main', mt: 0.1, flexShrink: 0, animation: 'pulseGlow 2s ease-in-out infinite' }} />
                <Typography variant="body2">{dailyFocus ?? 'Log your metrics to receive a personalized focus area.'}</Typography>
              </Box>
            )}
          </StatCard>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <StatCard title="Reflection Streak" delay={250}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <LocalFireDepartmentIcon
                  sx={{
                    fontSize: 28,
                    color: streak > 0 ? 'warning.main' : 'text.disabled',
                    animation: streak > 0 ? 'pulseGlow 1.5s ease-in-out infinite' : 'none',
                  }}
                />
                <Typography sx={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1 }}>{streak}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>days</Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                {todayReflection ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main' }} />
                    <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>
                      Done for today!
                    </Typography>
                  </Box>
                ) : (
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => onNavigate?.('reflection')}
                    endIcon={<ArrowForwardIcon />}
                    sx={{ fontWeight: 600 }}
                  >
                    Reflect Now
                  </Button>
                )}
              </Box>
            </Box>
          </StatCard>
        </Grid>
      </Grid>

      {/* Recent Reflections */}
      {recentReflections.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <StatCard title="Recent Reflections" delay={300}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {recentReflections.map((r) => (
                <Box
                  key={r.entry_date}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    py: 0.5,
                    px: 1,
                    borderRadius: 1,
                    transition: 'background-color 0.2s ease',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0, width: 50 }}>
                    {r.entry_date.slice(5)}
                  </Typography>
                  {r.grade && <TierChip tier={r.grade} />}
                  {r.score !== null && (
                    <Typography variant="caption" sx={{ ml: 'auto', fontWeight: 600 }}>
                      {r.score.toFixed(2)}
                    </Typography>
                  )}
                  {r.ai_summary && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', md: 'block' }, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.ai_summary}
                    </Typography>
                  )}
                </Box>
              ))}
            </Box>
          </StatCard>
        </Box>
      )}

      {/* End of Shift */}
      <Box sx={{ mb: 2 }}>
        <StatCard title="End of Shift Checklist" delay={350}>
          {visibleTasks.length === 0 && visibleEscalations.length === 0 ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircleIcon sx={{ fontSize: 20, color: 'success.main' }} />
              <Typography variant="body2" color="text.secondary">
                Nothing pending — you're clear to close out.
              </Typography>
            </Box>
          ) : (
            <Box>
              {visibleTasks.map((task) => {
                const overdue = task.linked_date !== today;
                return (
                  <Fade in key={task.task_id} timeout={200}>
                    <ShiftItemRow overdue={overdue}>
                      <Typography variant="body2" sx={{ flex: 1, color: 'text.primary' }}>
                        Before ending your shift, submit{' '}
                        <strong>{task.task_hours !== null ? `${task.task_hours} task hours` : 'task hours'}</strong> to{' '}
                        <strong>{task.submit_to}</strong> for{' '}
                        <strong>{task.task_id}</strong> — {task.brief_explanation}
                        {task.amount !== null ? ` (${task.amount})` : ''}
                        {overdue && (
                          <Typography
                            component="span"
                            variant="caption"
                            sx={{ ml: 1, color: 'error.main', fontWeight: 600 }}
                          >
                            OVERDUE
                          </Typography>
                        )}
                      </Typography>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleMarkSubmitted(task.task_id)}
                        sx={{
                          flexShrink: 0,
                          fontSize: '0.75rem',
                          borderColor: '#E4E4E4',
                          color: 'text.secondary',
                          '&:hover': { borderColor: 'primary.main', color: 'primary.main', bgcolor: 'primary.main' + '08' },
                        }}
                      >
                        Mark Submitted
                      </Button>
                    </ShiftItemRow>
                  </Fade>
                );
              })}
              {visibleEscalations.map((esc) => {
                const overdue = esc.linked_date !== today;
                return (
                  <Fade in key={esc.escalation_id} timeout={200}>
                    <ShiftItemRow overdue={overdue}>
                      <Typography variant="body2" sx={{ flex: 1, color: 'text.primary' }}>
                        Escalate case <strong>{esc.case_number}</strong> to{' '}
                        <strong>{esc.escalate_to}</strong> — {esc.reason}
                        {overdue && (
                          <Typography
                            component="span"
                            variant="caption"
                            sx={{ ml: 1, color: 'error.main', fontWeight: 600 }}
                          >
                            OVERDUE
                          </Typography>
                        )}
                      </Typography>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleAdvanceEscalation(esc.escalation_id, esc.status)}
                        sx={{
                          flexShrink: 0,
                          fontSize: '0.75rem',
                          borderColor: '#E4E4E4',
                          color: 'text.secondary',
                          '&:hover': { borderColor: 'primary.main', color: 'primary.main', bgcolor: 'primary.main' + '08' },
                        }}
                      >
                        {esc.status === 'open' ? 'Mark Escalated' : 'Mark Resolved'}
                      </Button>
                    </ShiftItemRow>
                  </Fade>
                );
              })}
            </Box>
          )}
        </StatCard>
      </Box>

      <Box sx={{ mt: 2 }}>
        <Grid container spacing={2}>
          {/* Metric Breakdown */}
          <Grid size={{ xs: 12, md: 7 }}>
            <StatCard title="Metric Breakdown" delay={400}>
              {breakdown.length === 0 ? (
                <EmptyState title="No data for this period yet." />
              ) : (
                <Box>
                  {breakdown.map((row) => (
                    <MetricBar
                      key={row.metric_key}
                      label={row.label}
                      value={row.aggregated_value}
                      tier={row.tier}
                      weight={row.weight_used}
                      metricKey={row.metric_key}
                      target={targets.find((t) => t.metric_key === row.metric_key)}
                    />
                  ))}
                </Box>
              )}
            </StatCard>
          </Grid>

          {/* 7-Day Trend */}
          <Grid size={{ xs: 12, md: 5 }}>
            <StatCard title="7-Day Score Trend" delay={450}>
              <Box sx={{ height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                    <defs>
                      <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0D9488" stopOpacity={0.22} />
                        <stop offset="100%" stopColor="#0D9488" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E4" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: '#6B6B6B' }}
                      axisLine={{ stroke: '#E4E4E4' }}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 5]}
                      ticks={[0, 1, 2, 3, 4, 5]}
                      tick={{ fontSize: 11, fill: '#6B6B6B' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        border: '1px solid #E4E4E4',
                        borderRadius: 8,
                        fontSize: 12,
                        boxShadow: 'none',
                      }}
                      formatter={(v: unknown) => [typeof v === 'number' ? v.toFixed(2) : '—', 'Score']}
                    />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="#0D9488"
                      strokeWidth={2}
                      fill="url(#scoreGradient)"
                      dot={{ fill: '#0D9488', r: 3 }}
                      activeDot={{ r: 5, stroke: '#0D9488', strokeWidth: 2, fill: '#fff' }}
                      connectNulls={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </StatCard>

            {/* Task Hours Backlog */}
            <Box sx={{ mt: 2 }}>
              <StatCard title="Task Hours Backlog" delay={500}>
                <Box sx={{ display: 'flex', gap: 3, mb: 1 }}>
                  <BacklogStat label="Logged" value={backlog.logged} />
                  <BacklogStat label="Submitted" value={backlog.submitted} />
                  <BacklogStat
                    label="Backlog"
                    value={backlog.backlog}
                    highlight={
                      backlog.backlog > 0 ? 'red' : backlog.backlog <= 0 ? 'green' : undefined
                    }
                  />
                </Box>
                {backlog.backlog > 0 && (
                  <Typography
                    variant="caption"
                    sx={{ color: 'error.main', display: 'block', mt: 0.5 }}
                  >
                    You have unsubmitted task hours — clear these before end of shift.
                  </Typography>
                )}
              </StatCard>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}

function BacklogStat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: 'red' | 'green';
}) {
  const color =
    highlight === 'red' ? 'error.main' : highlight === 'green' ? 'success.main' : 'text.primary';
  return (
    <Box>
      <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, color, lineHeight: 1, transition: 'color 0.3s ease' }}>
        {value.toFixed(1)}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </Box>
  );
}

function formatValue(metricKey: string, value: number): string {
  if (metricKey === 'csat') return value.toFixed(2);
  if (metricKey === 'esc_rate' || metricKey === 'esc_accuracy') return `${value.toFixed(1)}%`;
  if (metricKey === 'punctuality') return value.toFixed(1);
  return value.toFixed(0);
}
