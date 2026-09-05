import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import Box from '@mui/material/Box';
import useMediaQuery from '@mui/material/useMediaQuery';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import Skeleton from '@mui/material/Skeleton';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Divider from '@mui/material/Divider';
import { useTheme } from '@mui/material/styles';

// Icons
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import PsychologyIcon from '@mui/icons-material/Psychology';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import TodayIcon from '@mui/icons-material/Today';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import RefreshIcon from '@mui/icons-material/Refresh';
import ScheduleIcon from '@mui/icons-material/Schedule';
import AssessmentIcon from '@mui/icons-material/Assessment';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CloseIcon from '@mui/icons-material/Close';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import SpeedIcon from '@mui/icons-material/Speed';

// Recharts
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from 'recharts';

// Internal imports
import { useApp } from '../useApp';
import {
  SystemStatusChip,
  HudGauge,
  TelemetryReadout,
  BootSplash,
  HudFrame,
  SystemMonitorPanel,
  LiveIntelligenceFeed,
  ProviderStatusGrid,
  MemoryInsightWidget,
} from '../components/jarvis';
import type { LiveIntelligenceFeedItem } from '../components/jarvis';
import { getKnowledgeGraph } from '../orbStore';
import { lazy, Suspense } from 'react';
import { JarvisStateProvider } from '../components/jarvis3d';
const NuclearCore = lazy(() => import('../components/jarvis3d').then((m) => ({ default: m.NuclearCore })));
import type { JarvisStateName } from '../jarvisState';
import { useJarvisEngagement } from '../jarvisEngagementStore';
import { runIntelligencePipeline, type GradeForecast } from '../intelligence';
import type { Tier, DailyEntry } from '../types';
import {
  computeWeightedGrade,
  computeWeeklyGrade,
  computeTaskHoursBacklog,
  formatTierLabel,
  scoreToGrade,
  aggregateEntries,
} from '../grading';
import {
  startOfWeekLocal,
  workDateLocal,
  dateKeyFromDate,
  dateFromKey,
  addDays,
} from '../dateUtils';
import { generateDailyFocus } from '../ai';
import { computeReflectionStreak, generateRuleBasedInsights } from '../insights';
import TierChip from '../components/TierChip';
import { toneStyle, TIER_TONE } from '../theme';

interface SmartDashboardProps {
  onNavigate?: (tab: string) => void;
}

const GRADE_STYLES: Record<Tier, { bg: string; color: string }> = {
  S: { bg: 'success.light', color: 'success.main' },
  A_plus: { bg: 'success.light', color: 'success.main' },
  A: { bg: 'success.light', color: 'success.main' },
  B: { bg: 'warning.light', color: 'warning.main' },
  C: { bg: 'error.light', color: 'error.main' },
  PIP: { bg: 'error.light', color: 'error.main' },
};

// Count up animation hook
function useCountUp(target: number, duration = 750) {
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

// Hero Score Ring component
function HeroScoreRing({
  score,
  grade,
  size = 96,
  light = false,
}: {
  score: number | null;
  grade: Tier | null;
  size?: number;
  light?: boolean;
}) {
  const pct = score !== null ? Math.min((score / 5) * 100, 100) : 0;
  const displayPct = useCountUp(pct, 900);
  const theme = useTheme();

  const primaryColor = grade
    ? theme.palette[GRADE_STYLES[grade].color.split('.')[0] as 'success' | 'warning' | 'error']?.main || theme.palette.primary.main
    : theme.palette.text.secondary;

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {/* Outer subtle glow */}
      <Box
        sx={{
          position: 'absolute',
          width: size + 12,
          height: size + 12,
          borderRadius: '50%',
          bgcolor: light ? 'rgba(255,255,255,0.08)' : `${primaryColor}15`,
          filter: 'blur(8px)',
        }}
      />
      {/* Background Track Circle */}
      <CircularProgress
        variant="determinate"
        value={100}
        size={size}
        thickness={5.5}
        sx={{
          color: light ? 'rgba(255,255,255,0.18)' : theme.palette.action.hover,
          position: 'absolute',
        }}
      />
      {/* Value Progress Circle */}
      <CircularProgress
        variant="determinate"
        value={displayPct}
        size={size}
        thickness={5.5}
        sx={{
          color: light ? '#FFFFFF' : primaryColor,
          strokeLinecap: 'round',
          transition: 'all 0.6s cubic-bezier(0.4,0,0.2,1)',
        }}
      />
      {/* Inner Text Overlay */}
      <Box
        sx={{
          position: 'absolute',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}
      >
        <Typography
          sx={{
            fontSize: size > 80 ? '1.85rem' : '1.35rem',
            fontWeight: 800,
            color: light ? '#FFFFFF' : primaryColor,
            lineHeight: 1,
            letterSpacing: '-0.02em',
            fontFamily: '"Plus Jakarta Sans Variable", "Roboto", sans-serif',
          }}
        >
          {grade ? formatTierLabel(grade) : '—'}
        </Typography>
        {score !== null && (
          <Typography
            sx={{
              fontSize: size > 80 ? '0.78rem' : '0.68rem',
              color: light ? 'rgba(255,255,255,0.85)' : 'text.secondary',
              fontWeight: 600,
              mt: 0.3,
            }}
          >
            {score.toFixed(2)} / 5.0
          </Typography>
        )}
      </Box>
    </Box>
  );
}

// Custom Tooltip for Recharts
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number | null;
    payload: {
      dateLabel: string;
      fullDate: string;
      actualScore: number | null;
      projectedScore: number | null;
      isProjection: boolean;
    };
  }>;
  label?: string;
}

function CustomChartTooltip({ active, payload }: CustomTooltipProps) {
  const theme = useTheme();
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  const val = data.isProjection ? data.projectedScore : data.actualScore;
  const grade = val !== null ? scoreToGrade(val) : null;

  return (
    <Paper
      elevation={4}
      sx={{
        p: 1.5,
        bgcolor: theme.palette.mode === 'dark' ? '#1E2927' : '#FFFFFF',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        minWidth: 150,
      }}
    >
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.5 }}>
        {data.fullDate} {data.isProjection ? '(Projected)' : ''}
      </Typography>
      {val !== null ? (
        <Stack direction="row" alignItems="center" spacing={1}>
          {grade && <TierChip tier={grade} size="small" />}
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {val.toFixed(2)} / 5.0
          </Typography>
        </Stack>
      ) : (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          No data recorded
        </Typography>
      )}
    </Paper>
  );
}

// Helper to format values for metrics
function formatMetricValue(key: string, val: number | null): string {
  if (val === null || val === undefined) return '—';
  if (key === 'productivity') return `${Math.round(val)} pts`;
  if (key === 'csat') return val.toFixed(2);
  if (key === 'qa') return `${val.toFixed(1)}%`;
  if (key === 'esc_rate') return `${val.toFixed(1)}%`;
  if (key === 'esc_accuracy') return `${val.toFixed(1)}%`;
  return val.toFixed(1);
}

// AI Commentary helper generator for weakest metric
function generateWeakestMetricCommentary(
  metricKey: string,
  val: number | null,
  tier: Tier | null,
): { title: string; body: string; tip: string } {
  const label = metricKey === 'productivity' ? 'Productivity Composite'
    : metricKey === 'csat' ? 'CSAT Average'
    : metricKey === 'qa' ? 'QA Review'
    : metricKey === 'esc_rate' ? 'Escalation Rate'
    : metricKey === 'esc_accuracy' ? 'Escalation Accuracy'
    : 'Primary Focus Metric';

  const tierLabel = tier ? formatTierLabel(tier) : 'Unranked';

  switch (metricKey) {
    case 'csat':
      return {
        title: `CSAT is your key leverage point (Tier ${tierLabel})`,
        body: `Your current CSAT average is ${val !== null ? val.toFixed(2) : 'N/A'}. CSAT carries significant weight in your composite score.`,
        tip: 'Focus on warm, clear closing statements and verifying customer resolution before ending chats.',
      };
    case 'esc_rate':
      return {
        title: `Escalation Rate requires adjustment (Tier ${tierLabel})`,
        body: `Escalation rate stands at ${val !== null ? val.toFixed(1) : 'N/A'}%. Higher rates indicate opportunities to resolve tickets directly.`,
        tip: 'Double-check internal knowledge bases and tier-2 guidelines before escalating cases.',
      };
    case 'productivity':
      return {
        title: `Productivity volume is below target (Tier ${tierLabel})`,
        body: `Total productivity volume is ${val !== null ? Math.round(val) : 'N/A'} points. Unsubmitted task hours or slow chat transitions may be holding you back.`,
        tip: 'Submit pending task hours promptly and keep idle time minimal between handled cases.',
      };
    case 'qa':
      return {
        title: `QA compliance needs attention (Tier ${tierLabel})`,
        body: `QA review score stands at ${val !== null ? val.toFixed(1) : 'N/A'}%. Aligning with review rubric criteria will quickly lift your composite tier.`,
        tip: 'Review recent QA feedback notes and checklist requirements on your active cases.',
      };
    case 'esc_accuracy':
      return {
        title: `Escalation Accuracy focus (Tier ${tierLabel})`,
        body: `Escalation accuracy is ${val !== null ? val.toFixed(1) : 'N/A'}%. Improperly formatted or incomplete escalation logs penalize your grade.`,
        tip: 'Ensure required escalation templates and log fields are fully populated prior to transfer.',
      };
    default:
      return {
        title: `${label} needs attention (Tier ${tierLabel})`,
        body: `Your current aggregated metric value is ${val !== null ? val.toFixed(1) : 'N/A'}.`,
        tip: 'Consistently logging shift metrics will provide clearer predictive insights.',
      };
  }
}

export default function SmartDashboard({ onNavigate }: SmartDashboardProps) {
  const theme = useTheme();
  const isMobileHud = useMediaQuery(theme.breakpoints.down('sm'));
  const {
    entries,
    weeklyEntries,
    targets,
    reflections,
    qaEntries,
    coachMemories,
    insights,
    dismissInsight,
    tasks,
    escalations,
  } = useApp();

  const [dailyFocus, setDailyFocus] = useState<string | null>(null);
  const [focusLoading, setFocusLoading] = useState<boolean>(true);

  const todayKey = workDateLocal();
  const currentWeekStart = startOfWeekLocal(todayKey);

  // 1. Calculate current week & last week performance
  // Each week's QA % must come from *that week's own* QA entry. Using the single
  // most-recently-filed QA % for every week (the previous `latestQa` global lookup)
  // silently rewrote historical grades whenever a new QA review was filed -- see
  // docs/reviews/FUNCTIONS_INTELLIGENCE_REVIEW.md, Risk #3.
  const qaForWeek = useCallback(
    (weekStart: string): number | null => qaEntries[weekStart]?.qa_percentage ?? null,
    [qaEntries],
  );

  // Current week grade calculation
  const currentWeekGrade = useMemo(() => {
    // Get entries for current week
    const realEntries: DailyEntry[] = [];
    for (let i = 0; i < 7; i++) {
      const dayKey = addDays(currentWeekStart, i);
      if (dayKey > todayKey) break;
      if (entries[dayKey]) realEntries.push(entries[dayKey]);
    }
    return computeWeeklyGrade(
      currentWeekStart,
      realEntries,
      weeklyEntries[currentWeekStart],
      targets,
      qaForWeek(currentWeekStart),
    );
  }, [entries, currentWeekStart, todayKey, weeklyEntries, targets, qaForWeek]);

  // Previous week grade calculation for comparison
  const lastWeekStart = useMemo(() => addDays(currentWeekStart, -7), [currentWeekStart]);

  const lastWeekGrade = useMemo(() => {
    const realEntries: DailyEntry[] = [];
    for (let i = 0; i < 7; i++) {
      const dayKey = addDays(lastWeekStart, i);
      if (entries[dayKey]) realEntries.push(entries[dayKey]);
    }
    return computeWeeklyGrade(
      lastWeekStart,
      realEntries,
      weeklyEntries[lastWeekStart],
      targets,
      qaForWeek(lastWeekStart),
    );
  }, [entries, lastWeekStart, weeklyEntries, targets, qaForWeek]);

  // Score comparison stats
  const scoreDiff = useMemo(() => {
    if (currentWeekGrade.score === null || lastWeekGrade.score === null) return 0;
    return currentWeekGrade.score - lastWeekGrade.score;
  }, [currentWeekGrade.score, lastWeekGrade.score]);

  const pctDiff = useMemo(() => {
    if (!lastWeekGrade.score || lastWeekGrade.score === 0 || currentWeekGrade.score === null) return 0;
    return ((currentWeekGrade.score - lastWeekGrade.score) / lastWeekGrade.score) * 100;
  }, [currentWeekGrade.score, lastWeekGrade.score]);

  // AI summary headline text
  const heroAiSummary = useMemo(() => {
    if (currentWeekGrade.score === null) {
      return "Start logging today's metrics to unleash AI predictions and tracking.";
    }
    if (lastWeekGrade.score === null) {
      return `Solid start this week with a ${currentWeekGrade.score.toFixed(2)} score (${formatTierLabel(currentWeekGrade.grade || 'A')} Tier). Keep logging to build momentum!`;
    }
    const absPct = Math.abs(Math.round(pctDiff));
    if (scoreDiff >= 0) {
      return `You're trending ${absPct > 0 ? `${absPct}%` : 'steadily'} above last week — keep up the pace to lock in Tier ${formatTierLabel(currentWeekGrade.grade || 'S')}!`;
    } else {
      return `Running ${absPct}% behind last week's score pace. A quick focus on your weakest metric will bridge the gap.`;
    }
  }, [currentWeekGrade.score, currentWeekGrade.grade, lastWeekGrade.score, pctDiff, scoreDiff]);

  // 2. Predictive Cards Calculations
  const backlogInfo = useMemo(() => computeTaskHoursBacklog(Object.values(entries)), [entries]);
  const streak = useMemo(() => computeReflectionStreak(reflections), [reflections]);
  const isLoggedToday = useMemo(() => !!entries[todayKey] || !!reflections[todayKey], [entries, reflections, todayKey]);

  // ── JARVIS INTELLIGENCE: forecast, patterns, proactive triggers ──────────
  const intel = useMemo(
    () => runIntelligencePipeline({ entries, tasks, escalations, targets }),
    [entries, tasks, escalations, targets],
  );
  const forecast: GradeForecast | null = intel.forecast;

  const weekEntriesList = useMemo(() => {
    const list: DailyEntry[] = [];
    for (let i = 0; i < 7; i++) {
      const dayKey = addDays(currentWeekStart, i);
      if (dayKey > todayKey) break;
      if (entries[dayKey]) list.push(entries[dayKey]);
    }
    return list;
  }, [entries, currentWeekStart, todayKey]);

  const todayEntry = entries[todayKey];
  const systemStatus: 'nominal' | 'attention' | 'critical' = useMemo(() => {
    if (backlogInfo.backlog > 5) return 'critical';
    if (forecast?.trend === 'falling' || !isLoggedToday) return 'attention';
    return 'nominal';
  }, [backlogInfo.backlog, forecast, isLoggedToday]);

  const weekCsat = useMemo(() => {
    const ratings = weekEntriesList.flatMap((e) => e.csat_ratings ?? []);
    if (!ratings.length) return null;
    return ratings.reduce((a, b) => a + b, 0) / ratings.length;
  }, [weekEntriesList]);

  const todayVolume = (todayEntry?.chats_handled ?? 0) + (todayEntry?.emails_handled ?? 0);
  const pendingTasks = tasks.filter((t) => t.status === 'pending').length;

  // Week projection prediction -- sourced from the real OLS forecast engine
  // (src/intelligence/forecast.ts) instead of copying the current week's score under
  // a "projection" label. See docs/reviews/FUNCTIONS_INTELLIGENCE_REVIEW.md, Risk #2.
  const weekProjection = useMemo(() => {
    // Days elapsed in current week
    const dateToday = dateFromKey(todayKey);
    const dateStart = dateFromKey(currentWeekStart);
    const dayIndex = Math.max(1, Math.min(7, Math.floor((dateToday.getTime() - dateStart.getTime()) / (1000 * 60 * 60 * 24)) + 1));

    if (forecast) {
      const projected = Math.min(5.0, Math.max(0.0, forecast.projectedScore));
      return {
        projectedScore: projected,
        projectedGrade: scoreToGrade(projected),
        dayIndex,
      };
    }

    if (currentWeekGrade.score === null) {
      return { projectedScore: 3.5, projectedGrade: 'A' as Tier, dayIndex };
    }

    // No forecast available yet (e.g. nothing logged this week) -- fall back to the
    // current week's own score rather than inventing a number.
    const projected = Math.min(5.0, Math.max(0.0, currentWeekGrade.score));
    return {
      projectedScore: projected,
      projectedGrade: scoreToGrade(projected),
      dayIndex,
    };
  }, [forecast, currentWeekGrade.score, todayKey, currentWeekStart]);

  // 3. AI Focus of the Day Loading
  const refreshFocus = useCallback(() => {
    setFocusLoading(true);
    const entryList = Object.values(entries).sort((a, b) => a.date.localeCompare(b.date));
    generateDailyFocus(entryList.slice(-7), targets, coachMemories)
      .then((res) => {
        setDailyFocus(res);
        setFocusLoading(false);
      })
      .catch(() => {
        setDailyFocus("Prioritize clearing unsubmitted task hours and maintaining high CSAT response quality.");
        setFocusLoading(false);
      });
  }, [entries, targets, coachMemories]);

  useEffect(() => {
    refreshFocus();
  }, [refreshFocus]);

  // 4. Smart Metrics Grid & Weakest Metric Identification
  const weakestMetric = useMemo(() => {
    if (!currentWeekGrade.breakdown || currentWeekGrade.breakdown.length === 0) {
      return null;
    }
    // Sort breakdown by tier rank (PIP < C < B < A < A_plus < S)
    const tierRank: Record<Tier, number> = { PIP: 0, C: 1, B: 2, A: 3, A_plus: 4, S: 5 };
    const validItems = currentWeekGrade.breakdown.filter((item) => item.tier !== null);
    if (validItems.length === 0) return currentWeekGrade.breakdown[0] || null;

    validItems.sort((a, b) => {
      const rankA = a.tier ? tierRank[a.tier] : 99;
      const rankB = b.tier ? tierRank[b.tier] : 99;
      return rankA - rankB;
    });

    return validItems[0];
  }, [currentWeekGrade.breakdown]);

  const weakestCommentary = useMemo(() => {
    if (!weakestMetric) {
      return generateWeakestMetricCommentary('productivity', 0, 'B');
    }
    return generateWeakestMetricCommentary(
      weakestMetric.metric_key,
      weakestMetric.aggregated_value,
      weakestMetric.tier,
    );
  }, [weakestMetric]);

  // Metric trend calculation helper
  const getMetricTrendData = useCallback(
    (metricKey: string) => {
      const recentList = Object.values(entries)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-7);

      if (recentList.length < 2) {
        return { diff: 0, text: 'Stable', isPositive: true };
      }

      const half = Math.floor(recentList.length / 2);
      const older = recentList.slice(0, half);
      const newer = recentList.slice(half);

      const olderVal = aggregateEntries(older)[metricKey];
      const newerVal = aggregateEntries(newer)[metricKey];

      if (olderVal === null || newerVal === null || olderVal === undefined || newerVal === undefined) {
        return { diff: 0, text: 'No trend', isPositive: true };
      }

      const diff = newerVal - olderVal;
      const target = targets.find((t) => t.metric_key === metricKey);
      const higherIsBetter = target ? target.direction === 'higher_is_better' : true;
      const isPositive = higherIsBetter ? diff >= 0 : diff <= 0;

      const formatted = Math.abs(diff).toFixed(1);
      const sign = diff >= 0 ? '+' : '-';

      return {
        diff,
        text: `${sign}${formatted}`,
        isPositive,
      };
    },
    [entries, targets],
  );

  // 5. Trend Chart Data (14-day window: past 10 days + remaining projection)
  const chartData = useMemo(() => {
    const list = [];
    const dateToday = dateFromKey(todayKey);

    // 10 past days up to today
    for (let i = 9; i >= 0; i--) {
      const d = new Date(dateToday);
      d.setDate(d.getDate() - i);
      const key = dateKeyFromDate(d);
      const entry = entries[key];

      let score: number | null = null;
      if (entry) {
        // Use *this day's own week* QA %, not whatever week's QA was filed most recently.
        score = computeWeightedGrade([entry], targets, qaForWeek(startOfWeekLocal(key))).score;
      }

      const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      list.push({
        dateLabel: monthDay,
        fullDate: dateKeyFromDate(d),
        actualScore: score,
        projectedScore: score,
        isProjection: false,
      });
    }

    // Projections for next 4 remaining days of the week: extend the *real* OLS
    // regression line the forecast engine already fit to this week's logged entries
    // (src/intelligence/forecast.ts), instead of adding fabricated +/-variance noise.
    // See docs/reviews/FUNCTIONS_INTELLIGENCE_REVIEW.md, Risk #5.
    const currentScoreAvg = currentWeekGrade.score ?? 3.8;
    for (let i = 1; i <= 4; i++) {
      const d = new Date(dateToday);
      d.setDate(d.getDate() + i);
      const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      let projScore: number;
      if (forecast) {
        const dayIndex = Math.round((d.getTime() - dateFromKey(forecast.weekStart).getTime()) / (1000 * 60 * 60 * 24));
        projScore = Math.min(5.0, Math.max(0, forecast.slope * dayIndex + forecast.intercept));
      } else {
        projScore = Math.min(5.0, Math.max(0, currentScoreAvg));
      }

      list.push({
        dateLabel: monthDay,
        fullDate: dateKeyFromDate(d),
        actualScore: null,
        projectedScore: Number(projScore.toFixed(2)),
        isProjection: true,
      });
    }

    // Ensure connection point at today
    if (list[9]) {
      list[9].projectedScore = list[9].actualScore ?? currentScoreAvg;
    }

    return list;
  }, [entries, todayKey, targets, qaForWeek, currentWeekGrade.score, forecast]);

  // 6. Rule-based Proactive Insights
  const activeInsights = useMemo(() => {
    const generated = generateRuleBasedInsights(
      entries,
      targets,
      reflections,
      [],
      [],
      new Set(insights.map((i) => i.title)),
    );
    const combined = [...insights, ...generated];
    return combined.filter((i) => !i.dismissed).slice(0, 4);
  }, [entries, targets, reflections, insights]);

  // JARVIS Mind stats — knowledge graph node/edge counts for the Memory Insight widget
  const mindStats = useMemo(() => {
    const graph = getKnowledgeGraph();
    return { nodeCount: graph.nodes.length, edgeCount: graph.edges.length };
  }, []);

  // JARVIS Live Intelligence Feed — merges proactive triggers + active insights + open escalations
  const liveFeedItems = useMemo<LiveIntelligenceFeedItem[]>(() => {
    const items: LiveIntelligenceFeedItem[] = [];
    intel.triggers.forEach((t) => {
      items.push({
        id: t.id,
        text: t.userMessage,
        tone: t.priority === 'high' ? 'critical' : t.priority === 'medium' ? 'warning' : 'info',
      });
    });
    activeInsights.forEach((i) => {
      items.push({
        id: i.id,
        text: i.title,
        tone: i.severity === 'warning' ? 'warning' : i.severity === 'positive' ? 'info' : 'info',
      });
    });
    const openEscalations = escalations.filter((e) => e.status !== 'resolved').slice(0, 3);
    openEscalations.forEach((e) => {
      items.push({
        id: e.escalation_id,
        text: `Open escalation: ${e.case_number || e.escalation_id} — ${e.reason}`,
        tone: 'warning',
      });
    });
    return items.slice(0, 8);
  }, [intel.triggers, activeInsights, escalations]);

  const AI_PROVIDERS = useMemo(
    () => [
      { name: 'Groq', connected: true },
      { name: 'xAI / Grok', connected: true },
    ],
    [],
  );

  // Ambient state derived from overall system health (backlog, alerts).
  const ambientJarvisState: JarvisStateName = useMemo(() => {
    if (systemStatus === 'critical') return 'error';
    if (systemStatus === 'attention') return 'thinking';
    return 'idle';
  }, [systemStatus]);
  const ambientCognitiveLoad = useMemo(
    () => Math.min(1, (pendingTasks + backlogInfo.backlog) / 12),
    [pendingTasks, backlogInfo.backlog],
  );

  // Live copilot engagement (voice/agent-loop activity) always takes
  // precedence over ambient system health — the core should react instantly
  // when VESPER is genuinely listening/thinking/erroring, anywhere in the app.
  const engagement = useJarvisEngagement();
  const jarvisCoreState: JarvisStateName = engagement.state ?? ambientJarvisState;
  const jarvisCognitiveLoad = engagement.state ? engagement.cognitiveLoad : ambientCognitiveLoad;

  return (
    <Box sx={{ maxWidth: 1280, mx: 'auto', p: { xs: 2, sm: 3, md: 4 } }}>
      <Stack spacing={3}>
        {/* 1. HERO SECTION */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2.5, sm: 3.5 },
              borderRadius: 4,
              background:
                theme.palette.mode === 'dark'
                  ? 'linear-gradient(135deg, #0F201D 0%, #162B28 50%, #0E1A18 100%)'
                  : 'linear-gradient(135deg, #0D9488 0%, #0F766E 55%, #14B8A6 100%)',
              color: '#FFFFFF',
              position: 'relative',
              overflow: 'hidden',
              boxShadow:
                theme.palette.mode === 'dark'
                  ? '0 8px 32px rgba(0,0,0,0.4)'
                  : '0 12px 32px rgba(13,148,136,0.25)',
              border: '1px solid',
              borderColor:
                theme.palette.mode === 'dark'
                  ? 'rgba(20,184,166,0.25)'
                  : 'rgba(255,255,255,0.2)',
            }}
          >
            {/* Background ambient light */}
            <Box
              sx={{
                position: 'absolute',
                top: -60,
                right: -60,
                width: 240,
                height: 240,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 70%)',
                pointerEvents: 'none',
              }}
            />

            <Grid container spacing={3} alignItems="center">
              {/* Left Column: Greeting & Summary */}
              <Grid size={{ xs: 12, md: 8 }}>
                <Stack spacing={1.5}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      icon={<AutoAwesomeIcon sx={{ fontSize: 16, color: '#FFFFFF !important' }} />}
                      label="AI Predictive Intelligence"
                      size="small"
                      sx={{
                        bgcolor: 'rgba(255,255,255,0.18)',
                        color: '#FFFFFF',
                        fontWeight: 700,
                        fontSize: '0.72rem',
                        backdropFilter: 'blur(4px)',
                        px: 0.5,
                      }}
                    />
                    <Typography
                      variant="caption"
                      sx={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}
                    >
                      Updated Live
                    </Typography>
                  </Box>

                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 800,
                      letterSpacing: '-0.02em',
                      color: '#FFFFFF',
                      fontSize: { xs: '1.5rem', sm: '1.85rem', md: '2.1rem' },
                      fontFamily: '"Plus Jakarta Sans Variable", "Roboto", sans-serif',
                    }}
                  >
                    Smart Dashboard
                  </Typography>

                  <Typography
                    variant="body1"
                    sx={{
                      color: 'rgba(255,255,255,0.92)',
                      fontWeight: 500,
                      fontSize: { xs: '0.93rem', sm: '1.02rem' },
                      maxWidth: 620,
                      lineHeight: 1.5,
                    }}
                  >
                    {heroAiSummary}
                  </Typography>

                  <Stack direction="row" spacing={2} sx={{ pt: 1 }} flexWrap="wrap" gap={1}>
                    <Box
                      sx={{
                        bgcolor: 'rgba(0,0,0,0.18)',
                        borderRadius: 2,
                        px: 1.75,
                        py: 0.75,
                        backdropFilter: 'blur(6px)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                      }}
                    >
                      <SpeedIcon sx={{ fontSize: 18, color: '#5EEAD4' }} />
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
                        Current Pace:{' '}
                        <strong>
                          {currentWeekGrade.score ? `${currentWeekGrade.score.toFixed(2)} / 5.0` : '—'}
                        </strong>
                      </Typography>
                    </Box>

                    <Box
                      sx={{
                        bgcolor: 'rgba(0,0,0,0.18)',
                        borderRadius: 2,
                        px: 1.75,
                        py: 0.75,
                        backdropFilter: 'blur(6px)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                      }}
                    >
                      <LocalFireDepartmentIcon sx={{ fontSize: 18, color: '#FDBA74' }} />
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
                        Streak: <strong>{streak} Days Active</strong>
                      </Typography>
                    </Box>
                  </Stack>
                </Stack>
              </Grid>

              {/* Right Column: Score Ring */}
              <Grid
                size={{ xs: 12, md: 4 }}
                sx={{
                  display: 'flex',
                  justifyContent: { xs: 'flex-start', md: 'flex-end' },
                  alignItems: 'center',
                }}
              >
                <Stack direction="row" alignItems="center" spacing={2.5}>
                  <HeroScoreRing
                    score={currentWeekGrade.score}
                    grade={currentWeekGrade.grade}
                    size={104}
                    light={true}
                  />
                  <Box>
                    <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.75)', fontWeight: 700, letterSpacing: '0.08em' }}>
                      THIS WEEK
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: '#FFFFFF', lineHeight: 1.1 }}>
                      Tier {currentWeekGrade.grade ? formatTierLabel(currentWeekGrade.grade) : '—'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)', fontWeight: 500, display: 'block', mt: 0.5 }}>
                      Weighted Composite Score
                    </Typography>
                  </Box>
                </Stack>
              </Grid>
            </Grid>
          </Paper>
        </motion.div>

        {/* JARVIS AI CORE — one unified cockpit: reactor + telemetry overlaid AS a HUD,
            not stacked as separate boxes. Everything anchors to the single reactor scene. */}
        <BootSplash />

        <HudFrame label="AI CORE" statusDot={systemStatus === 'critical' ? 'danger' : systemStatus === 'attention' ? 'warn' : 'ok'}>
          <Box
            sx={{
              height: { xs: 320, sm: 380, md: 420 },
              position: 'relative',
              bgcolor: '#020617',
              borderRadius: 1,
              overflow: 'hidden',
            }}
          >
            {/* Reactor fills the entire frame — the single dominant visual */}
            <JarvisStateProvider state={jarvisCoreState} cognitiveLoad={jarvisCognitiveLoad}>
              <Suspense fallback={<Box sx={{ width: '100%', height: '100%' }} />}>
                <NuclearCore />
              </Suspense>
            </JarvisStateProvider>

            {/* Status chip — floats top-left over the scene, no box beneath it */}
            <Box sx={{ position: 'absolute', top: 12, left: { xs: 10, sm: 16 }, zIndex: 5, pointerEvents: 'none' }}>
              <SystemStatusChip status={systemStatus} />
            </Box>

            {/* Score gauge — floats mid-left, part of the reactor scene, not a separate card */}
            <Box
              sx={{
                position: 'absolute',
                left: { xs: 4, sm: 16, md: 28 },
                top: { xs: '38%', sm: '42%' },
                transform: 'translateY(-50%)',
                zIndex: 5,
                pointerEvents: 'none',
              }}
            >
              <HudGauge
                score={(currentWeekGrade.score ?? 0) * 20}
                label="CURRENT SCORE"
                tier={currentWeekGrade.grade ? formatTierLabel(currentWeekGrade.grade) : undefined}
                size={isMobileHud ? 76 : 104}
              />
            </Box>

            {/* Forecast gauge — mirrors on the right */}
            <Box
              sx={{
                position: 'absolute',
                right: { xs: 4, sm: 16, md: 28 },
                top: { xs: '38%', sm: '42%' },
                transform: 'translateY(-50%)',
                zIndex: 5,
                pointerEvents: 'none',
              }}
            >
              <HudGauge
                score={(forecast?.projectedScore ?? 0) * 20}
                label="EOW FORECAST"
                tier={forecast ? forecast.trend.toUpperCase() : undefined}
                size={isMobileHud ? 76 : 104}
              />
            </Box>

            {/* Bottom telemetry strip — thin ambient readouts scrimmed over the reactor's
                floor, no card chrome. This IS the "cockpit telemetry" now, integrated. */}
            <Box
              sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 5,
                pt: 5,
                pb: { xs: 1.25, sm: 1.5 },
                px: { xs: 1.5, sm: 3 },
                background: 'linear-gradient(to top, rgba(2, 6, 23, 0.94) 0%, rgba(2, 6, 23, 0.55) 55%, rgba(2, 6, 23, 0) 100%)',
                pointerEvents: 'none',
              }}
            >
              <Stack
                direction="row"
                justifyContent="center"
                alignItems="center"
                spacing={{ xs: 2, sm: 4 }}
                divider={<Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(148, 163, 184, 0.18)', my: 0.25 }} />}
              >
                <TelemetryReadout label="VOLUME" value={String(todayVolume)} />
                <TelemetryReadout
                  label="CSAT"
                  value={weekCsat !== null ? weekCsat.toFixed(2) : '—'}
                  delta={scoreDiff !== 0 ? Number((scoreDiff * 10).toFixed(1)) : null}
                />
                <TelemetryReadout label="BACKLOG" value={`${backlogInfo.backlog.toFixed(1)}h`} />
                <TelemetryReadout label="PENDING" value={String(pendingTasks)} />
              </Stack>
            </Box>
          </Box>
        </HudFrame>

        {/* 1.6 JARVIS INTELLIGENCE ROW — system load, AI providers, memory graph, live feed */}
        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, md: 5 }}>
            <Stack spacing={2}>
              <HudFrame label="SYSTEM LOAD">
                <Box sx={{ p: 2 }}>
                  <SystemMonitorPanel
                    metrics={[
                      { label: 'Backlog', value: backlogInfo.backlog, max: 8, tone: backlogInfo.backlog > 5 ? 'danger' : backlogInfo.backlog > 2 ? 'warn' : 'ok' },
                      { label: 'Volume', value: todayVolume, max: Math.max(todayVolume, 20), tone: 'ok' },
                      { label: 'Pending', value: pendingTasks, max: Math.max(pendingTasks, 10), tone: pendingTasks > 5 ? 'warn' : 'ok' },
                    ]}
                  />
                </Box>
              </HudFrame>
              <HudFrame label="AI PROVIDERS">
                <Box sx={{ p: 2 }}>
                  <ProviderStatusGrid providers={AI_PROVIDERS} />
                </Box>
              </HudFrame>
              <Box onClick={() => onNavigate?.('mind')} sx={{ cursor: 'pointer' }}>
                <MemoryInsightWidget
                  nodeCount={mindStats.nodeCount}
                  edgeCount={mindStats.edgeCount}
                  sessionLabel="MEMORY & REASONING"
                  onClick={() => onNavigate?.('mind')}
                />
              </Box>
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, md: 7 }}>
            <HudFrame label="LIVE INTELLIGENCE FEED" statusDot="ok">
              <Box sx={{ p: 2 }}>
                <LiveIntelligenceFeed items={liveFeedItems} emptyLabel="All clear — no active alerts." />
              </Box>
            </HudFrame>
          </Grid>
        </Grid>

        {/* 2. PREDICTIVE CARDS */}
        <Grid container spacing={2.5}>
          {/* Predictive Card 1: Week Projection */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.05 }}>
              <Card elevation={0} sx={{ height: '100%', transition: 'all 0.2s ease', '&:hover': { transform: 'translateY(-3px)' } }}>
                <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      WEEK PROJECTION
                    </Typography>
                    <AssessmentIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                  </Stack>

                  <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mb: 1 }}>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary' }}>
                      {weekProjection.projectedScore.toFixed(2)}
                    </Typography>
                    <TierChip tier={weekProjection.projectedGrade} size="small" />
                  </Stack>

                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, (weekProjection.projectedScore / 5) * 100)}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      bgcolor: 'action.hover',
                      mb: 1.5,
                      '& .MuiLinearProgress-bar': {
                        bgcolor: 'primary.main',
                        borderRadius: 3,
                      },
                    }}
                  />

                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                    Projected end-of-week grade based on current daily pace.
                  </Typography>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>

          {/* Predictive Card 2: Pace vs Last Week */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1 }}>
              <Card elevation={0} sx={{ height: '100%', transition: 'all 0.2s ease', '&:hover': { transform: 'translateY(-3px)' } }}>
                <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      PACE VS LAST WEEK
                    </Typography>
                    {scoreDiff >= 0 ? (
                      <TrendingUpIcon sx={{ fontSize: 20, color: 'success.main' }} />
                    ) : (
                      <TrendingDownIcon sx={{ fontSize: 20, color: 'error.main' }} />
                    )}
                  </Stack>

                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: scoreDiff >= 0 ? 'success.main' : 'error.main' }}>
                      {scoreDiff >= 0 ? '+' : ''}{Math.abs(pctDiff).toFixed(1)}%
                    </Typography>
                    <Chip
                      size="small"
                      icon={scoreDiff >= 0 ? <ArrowUpwardIcon sx={{ fontSize: '12px !important' }} /> : <ArrowDownwardIcon sx={{ fontSize: '12px !important' }} />}
                      label={scoreDiff >= 0 ? 'Ahead' : 'Behind'}
                      color={scoreDiff >= 0 ? 'success' : 'error'}
                      variant="outlined"
                      sx={{ fontWeight: 700, height: 22 }}
                    />
                  </Stack>

                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500, display: 'block', mt: 1.5 }}>
                    Last week avg score: {lastWeekGrade.score ? lastWeekGrade.score.toFixed(2) : '—'}
                  </Typography>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>

          {/* Predictive Card 3: Streak Status */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.15 }}>
              <Card elevation={0} sx={{ height: '100%', transition: 'all 0.2s ease', '&:hover': { transform: 'translateY(-3px)' } }}>
                <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      STREAK STATUS
                    </Typography>
                    <LocalFireDepartmentIcon sx={{ fontSize: 20, color: streak > 0 ? 'warning.main' : 'text.disabled' }} />
                  </Stack>

                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary' }}>
                      {streak} Days
                    </Typography>
                    <Chip
                      size="small"
                      label={isLoggedToday ? 'Safe' : 'At Risk'}
                      color={isLoggedToday ? 'success' : 'warning'}
                      sx={{ fontWeight: 700, height: 22 }}
                    />
                  </Stack>

                  <Typography variant="caption" sx={{ color: isLoggedToday ? 'success.main' : 'warning.main', fontWeight: 600, display: 'block', mt: 1.5 }}>
                    {isLoggedToday ? '✓ Logged today' : '⚠️ Reflection or log pending for today'}
                  </Typography>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>

          {/* Predictive Card 4: Task Backlog */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.2 }}>
              <Card elevation={0} sx={{ height: '100%', transition: 'all 0.2s ease', '&:hover': { transform: 'translateY(-3px)' } }}>
                <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      TASK BACKLOG
                    </Typography>
                    <ScheduleIcon sx={{ fontSize: 20, color: backlogInfo.backlog > 0 ? 'warning.main' : 'success.main' }} />
                  </Stack>

                  <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mb: 1 }}>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: backlogInfo.backlog > 0 ? 'warning.main' : 'text.primary' }}>
                      {backlogInfo.backlog.toFixed(1)} hrs
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                      unsubmitted
                    </Typography>
                  </Stack>

                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500, display: 'block', mt: 1.5 }}>
                    {backlogInfo.logged.toFixed(1)}h logged vs {backlogInfo.submitted.toFixed(1)}h submitted.
                  </Typography>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        </Grid>

        {/* 3. AI FOCUS OF THE DAY */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.25 }}>
          <Card
            elevation={0}
            sx={{
              p: { xs: 2.5, sm: 3 },
              border: '1px solid',
              borderColor: 'primary.main',
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(13,148,136,0.08)' : 'rgba(13,148,136,0.04)',
              borderRadius: 3.5,
              position: 'relative',
            }}
          >
            <Stack spacing={2}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 2,
                      bgcolor: 'primary.main',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <PsychologyIcon sx={{ fontSize: 22 }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.05rem', lineHeight: 1.2 }}>
                      AI Focus of the Day
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                      Personalized daily recommendation generated from your KPI patterns
                    </Typography>
                  </Box>
                </Stack>

                <Tooltip title="Regenerate focus with latest data">
                  <IconButton size="small" onClick={refreshFocus} disabled={focusLoading}>
                    <RefreshIcon sx={{ 
              fontSize: 18, 
              animation: focusLoading ? 'spin 1s infinite linear' : 'none',
              '@keyframes spin': {
                '0%': { transform: 'rotate(0deg)' },
                '100%': { transform: 'rotate(360deg)' },
              },
            }} />
                  </IconButton>
                </Tooltip>
              </Stack>

              <Divider />

              {focusLoading ? (
                <Stack spacing={1}>
                  <Skeleton variant="text" height={28} width="80%" />
                  <Skeleton variant="text" height={20} width="60%" />
                </Stack>
              ) : (
                <Stack spacing={1.5}>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.98rem' }}>
                    💡 {dailyFocus}
                  </Typography>

                  {/* Actionable Action Plan Cards */}
                  <Grid container spacing={1.5} sx={{ pt: 0.5 }}>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Paper
                        elevation={0}
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          bgcolor: 'background.paper',
                          border: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main', display: 'block', mb: 0.5 }}>
                          1. METRIC GUARDRAIL
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.82rem' }}>
                          Target {weakestMetric?.label || 'Weakest Area'} to lift your weekly score.
                        </Typography>
                      </Paper>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Paper
                        elevation={0}
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          bgcolor: 'background.paper',
                          border: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main', display: 'block', mb: 0.5 }}>
                          2. HYGIENE & SUBMISSIONS
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.82rem' }}>
                          Clear {backlogInfo.backlog.toFixed(1)} hours of unsubmitted task logs before end of shift.
                        </Typography>
                      </Paper>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Paper
                        elevation={0}
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          bgcolor: 'background.paper',
                          border: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main', display: 'block', mb: 0.5 }}>
                          3. REFLECTION STREAK
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.82rem' }}>
                          Log evening reflection to keep your {streak}-day active streak alive.
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </Stack>
              )}
            </Stack>
          </Card>
        </motion.div>

        {/* 4. SMART METRICS GRID & WEAKEST METRIC COMMENTARY */}
        <Grid container spacing={3}>
          {/* Smart Metrics Grid */}
          <Grid size={{ xs: 12, lg: 7 }}>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.3 }}>
              <Card elevation={0} sx={{ height: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2.5 }}>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.1rem' }}>
                        Smart KPI Metrics Grid
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                        Real-time tracking with trend indicators vs previous period
                      </Typography>
                    </Box>
                    <Chip label="This Week" size="small" variant="outlined" sx={{ fontWeight: 700 }} />
                  </Stack>

                  <Stack spacing={2.2}>
                    {targets.map((target) => {
                      const item = currentWeekGrade.breakdown.find((b) => b.metric_key === target.metric_key);
                      const val = item?.aggregated_value ?? null;
                      const tier = item?.tier ?? null;
                      const trend = getMetricTrendData(target.metric_key);

                      return (
                        <Box key={target.metric_key} sx={{ p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
                          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                {target.label}
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                                (Weight {(target.weight * 100).toFixed(0)}%)
                              </Typography>
                            </Box>

                            <Stack direction="row" alignItems="center" spacing={1}>
                              {/* Trend Indicator */}
                              <Chip
                                size="small"
                                icon={
                                  trend.diff === 0 ? (
                                    <TrendingFlatIcon sx={{ fontSize: '14px !important' }} />
                                  ) : trend.isPositive ? (
                                    <TrendingUpIcon sx={{ fontSize: '14px !important' }} />
                                  ) : (
                                    <TrendingDownIcon sx={{ fontSize: '14px !important' }} />
                                  )
                                }
                                label={trend.text}
                                color={trend.diff === 0 ? 'default' : trend.isPositive ? 'success' : 'error'}
                                variant="outlined"
                                sx={{ height: 22, fontWeight: 700, fontSize: '0.7rem' }}
                              />

                              {tier && <TierChip tier={tier} size="small" />}

                              <Typography variant="subtitle2" sx={{ fontWeight: 800, minWidth: 50, textAlign: 'right' }}>
                                {formatMetricValue(target.metric_key, val)}
                              </Typography>
                            </Stack>
                          </Stack>

                          {/* Progress bar towards Tier S */}
                          <LinearProgress
                            variant="determinate"
                            value={
                              val !== null && target.thresholds.S
                                ? Math.min(100, Math.max(0, (val / target.thresholds.S) * 100))
                                : 0
                            }
                            sx={{
                              height: 6,
                              borderRadius: 3,
                              bgcolor: 'background.paper',
                              '& .MuiLinearProgress-bar': {
                                bgcolor: tier ? toneStyle(TIER_TONE[tier], theme).color : 'primary.main',
                                borderRadius: 3,
                              },
                            }}
                          />
                        </Box>
                      );
                    })}
                  </Stack>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>

          {/* AI Commentary on Weakest Metric */}
          <Grid size={{ xs: 12, lg: 5 }}>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.35 }}>
              <Card
                elevation={0}
                sx={{
                  height: '100%',
                  bgcolor: theme.palette.mode === 'dark' ? '#182421' : '#F0FDFA',
                  border: '1px solid',
                  borderColor: 'primary.light',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <CardContent sx={{ p: 3, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <Stack spacing={2}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <LightbulbOutlinedIcon sx={{ color: 'warning.main', fontSize: 24 }} />
                      <Typography variant="overline" sx={{ fontWeight: 800, color: 'primary.main', letterSpacing: '0.08em' }}>
                        AI DIAGNOSTIC HIGHLIGHT
                      </Typography>
                    </Stack>

                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 800, mb: 1, color: 'text.primary' }}>
                        {weakestCommentary.title}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6, mb: 2 }}>
                        {weakestCommentary.body}
                      </Typography>
                    </Box>

                    <Alert severity="info" variant="outlined" sx={{ borderRadius: 2, bgcolor: 'background.paper' }}>
                      <AlertTitle sx={{ fontWeight: 700, fontSize: '0.85rem' }}>Actionable AI Coaching Tip</AlertTitle>
                      <Typography variant="body2" sx={{ fontSize: '0.82rem' }}>
                        {weakestCommentary.tip}
                      </Typography>
                    </Alert>
                  </Stack>

                  <Box sx={{ pt: 2.5 }}>
                    <Button
                      fullWidth
                      variant="contained"
                      color="primary"
                      endIcon={<ArrowForwardIcon />}
                      onClick={() => onNavigate?.('today')}
                      sx={{ py: 1.2 }}
                    >
                      Focus on {weakestMetric?.label || 'Metrics'} Now
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        </Grid>

        {/* 5. TREND CHART WITH PROJECTED DASHED LINE */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.4 }}>
          <Card elevation={0}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1} sx={{ mb: 3 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.1rem' }}>
                    14-Day Performance Trend & Forecast
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                    Solid line indicates historical composite score; dashed line shows projected trajectory
                  </Typography>
                </Box>

                <Stack direction="row" spacing={2} alignItems="center">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Box sx={{ width: 12, height: 3, bgcolor: 'primary.main', borderRadius: 1 }} />
                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                      Actual Score
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Box sx={{ width: 12, height: 2, borderTop: '2px dashed', borderColor: 'primary.light' }} />
                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                      Projected Line
                    </Typography>
                  </Box>
                </Stack>
              </Stack>

              <Box sx={{ width: '100%', height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.35} />
                        <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} vertical={false} />
                    <XAxis
                      dataKey="dateLabel"
                      tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
                      axisLine={{ stroke: theme.palette.divider }}
                    />
                    <YAxis
                      domain={[0, 5]}
                      ticks={[1, 2, 3, 4, 5]}
                      tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
                      axisLine={{ stroke: theme.palette.divider }}
                    />
                    <RechartsTooltip content={<CustomChartTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="actualScore"
                      stroke={theme.palette.primary.main}
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#scoreGradient)"
                      name="Actual Score"
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey="projectedScore"
                      stroke={theme.palette.primary.light}
                      strokeWidth={2.5}
                      strokeDasharray="6 6"
                      dot={{ r: 4, fill: theme.palette.primary.light }}
                      name="Projected"
                      connectNulls
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </motion.div>

        {/* 6. QUICK ACTIONS BAR */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.45 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: 'text.secondary', textTransform: 'uppercase' }}>
              QUICK ACTIONS
            </Typography>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  startIcon={<TodayIcon />}
                  onClick={() => onNavigate?.('today')}
                  sx={{ py: 1.2, borderRadius: 2.5 }}
                >
                  Log Today&apos;s Metrics
                </Button>
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <Button
                  fullWidth
                  variant="outlined"
                  color="primary"
                  startIcon={<TaskAltIcon />}
                  onClick={() => onNavigate?.('tasks')}
                  sx={{ py: 1.2, borderRadius: 2.5 }}
                >
                  Manage & Add Tasks
                </Button>
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <Button
                  fullWidth
                  variant="outlined"
                  color="secondary"
                  startIcon={<PsychologyIcon />}
                  onClick={() => onNavigate?.('reflection')}
                  sx={{ py: 1.2, borderRadius: 2.5 }}
                >
                  Start Daily Reflection
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </motion.div>

        {/* 7. PROACTIVE INSIGHTS */}
        {activeInsights.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.5 }}>
            <Stack spacing={1.5}>
              <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.05rem' }}>
                Proactive Performance Insights ({activeInsights.length})
              </Typography>

              <Grid container spacing={2}>
                {activeInsights.map((insight) => {
                  const isWarning = insight.severity === 'warning';
                  const isPositive = insight.severity === 'positive';

                  const borderColor = isWarning
                    ? theme.palette.warning.main
                    : isPositive
                    ? theme.palette.success.main
                    : theme.palette.primary.main;

                  const bgColor = isWarning
                    ? theme.palette.mode === 'dark'
                      ? 'rgba(251,191,36,0.08)'
                      : '#FEF3C7'
                    : isPositive
                    ? theme.palette.mode === 'dark'
                      ? 'rgba(52,211,153,0.08)'
                      : '#EAF6EF'
                    : theme.palette.mode === 'dark'
                    ? 'rgba(13,148,136,0.08)'
                    : '#E6F4F2';

                  return (
                    <Grid key={insight.id} size={{ xs: 12, md: 6 }}>
                      <motion.div layout initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
                        <Paper
                          elevation={0}
                          sx={{
                            p: 2,
                            borderRadius: 2.5,
                            bgcolor: bgColor,
                            border: `1px solid ${borderColor}44`,
                            position: 'relative',
                          }}
                        >
                          <Stack direction="row" spacing={1.5} alignItems="flex-start">
                            <Box sx={{ mt: 0.2 }}>
                              {isWarning ? (
                                <WarningAmberIcon sx={{ color: 'warning.main', fontSize: 22 }} />
                              ) : isPositive ? (
                                <CheckCircleOutlineIcon sx={{ color: 'success.main', fontSize: 22 }} />
                              ) : (
                                <InfoOutlinedIcon sx={{ color: 'primary.main', fontSize: 22 }} />
                              )}
                            </Box>

                            <Box sx={{ flex: 1, pr: 2 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                                {insight.title}
                              </Typography>
                              <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.82rem', lineHeight: 1.5 }}>
                                {insight.body}
                              </Typography>
                            </Box>

                            <IconButton
                              size="small"
                              onClick={() => dismissInsight(insight.id)}
                              sx={{ position: 'absolute', top: 8, right: 8, color: 'text.secondary' }}
                            >
                              <CloseIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Stack>
                        </Paper>
                      </motion.div>
                    </Grid>
                  );
                })}
              </Grid>
            </Stack>
          </motion.div>
        )}
      </Stack>
    </Box>
  );
}