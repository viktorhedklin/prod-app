import { useState, useMemo, useRef, useEffect } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TuneIcon from '@mui/icons-material/Tune';

import IconButton from '@mui/material/IconButton';
import SendIcon from '@mui/icons-material/Send';
import SettingsIcon from '@mui/icons-material/Settings';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { useApp } from '../useApp';
import { computeRollingAverage } from '../grading';
import { generateJournalResponse, generateWeeklyRecap } from '../ai';
import { computeReflectionStreak } from '../insights';
import StatCard from '../components/StatCard';
import PageHeader from '../components/PageHeader';
import TierChip from '../components/TierChip';
import CoachAvatar from '../components/CoachAvatar';
import StreakCalendar from '../components/StreakCalendar';
import { todayLocal } from '../dateUtils';
import { loadAiApiKey, saveAiApiKey } from '../storage';
import EmptyState from '../components/EmptyState';
import { useTheme } from '@mui/material/styles';
import { toneStyle } from '../theme';
import type { JournalCategory, JournalEntry, KPITarget, Thresholds } from '../types';

const CATEGORY_TONE: Record<JournalCategory, 'ok' | 'warn' | 'danger' | 'neutral'> = {
  stress: 'danger',
  strength: 'ok',
  weakness: 'warn',
  win: 'ok',
  concern: 'neutral',
  general: 'neutral',
};

function today(): string {
  return todayLocal();
}

export default function Growth() {
  const {
    entries, targets, reflections, journal, achievements,
    insights, moodCheckins, addJournalEntry, updateJournalEntry,
    dismissInsight, notify, refreshInsights, saveTargetsAndUpdate,
    remember, coachMemories,
  } = useApp();

  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState(loadAiApiKey());
  const [journalInput, setJournalInput] = useState('');
  const [journalLoading, setJournalLoading] = useState(false);
  const [journalError, setJournalError] = useState<string | null>(null);
  const [recapLoading, setRecapLoading] = useState(false);
  const [weeklyRecap, setWeeklyRecap] = useState<{ title: string; body: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [showTargets, setShowTargets] = useState(false);
  const [targetEdits, setTargetEdits] = useState<KPITarget[]>(targets);

  const entryList = useMemo(() => Object.values(entries).sort((a, b) => a.date.localeCompare(b.date)), [entries]);
  const reflectionList = useMemo(() => Object.values(reflections).sort((a, b) => b.entry_date.localeCompare(a.entry_date)), [reflections]);
  const streak = useMemo(() => computeReflectionStreak(reflections), [reflections]);
  const rollingAvg = useMemo(() => {
    const rolling = computeRollingAverage(entries, targets, 7);
    const scores = rolling.filter((r) => r.score !== null).map((r) => r.score as number);
    if (scores.length === 0) return null;
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }, [entries, targets]);

  const recentJournal = useMemo(() => journal.slice(-20), [journal]);
  const activeInsights = useMemo(() => insights.filter((i) => !i.dismissed).slice(0, 5), [insights]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [recentJournal.length, journalLoading]);

  const handleSaveKey = () => {
    saveAiApiKey(apiKey.trim());
    notify('API key saved', 'success');
    setShowSettings(false);
  };

  const openTargetEditor = () => {
    setTargetEdits(targets);
    setShowTargets(true);
  };

  const updateTargetEdit = (metricKey: string, patch: Partial<KPITarget>) => {
    setTargetEdits((prev) =>
      prev.map((t) => (t.metric_key === metricKey ? { ...t, ...patch } : t)),
    );
  };

  const updateThreshold = (metricKey: string, tier: keyof Thresholds, value: string) => {
    setTargetEdits((prev) =>
      prev.map((t) =>
        t.metric_key === metricKey
          ? { ...t, thresholds: { ...t.thresholds, [tier]: parseFloat(value) || 0 } }
          : t,
      ),
    );
  };

  const resetTargets = () => {
    setTargetEdits(targets);
  };

  const saveTargetEdits = () => {
    saveTargetsAndUpdate(targetEdits);
    setShowTargets(false);
    notify('KPI targets updated', 'success');
  };

  const handleSendJournal = async () => {
    const msg = journalInput.trim();
    if (!msg || journalLoading) return;

    setJournalError(null);
    setJournalInput('');

    const tempEntry = addJournalEntry({
      entry_date: today(),
      user_message: msg,
      ai_response: null,
      category: null,
      linked_entry_date: entryList.length > 0 ? entryList[entryList.length - 1].date : null,
    });

    setJournalLoading(true);
    try {
      const result = await generateJournalResponse(msg, journal, entryList.slice(-7), targets, coachMemories);
      updateJournalEntry(tempEntry.id, {
        ai_response: result.response,
        category: result.category as JournalCategory,
      });
      if (result.memory) remember(result.memory, 'journal');
      refreshInsights();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Failed to get a response.';
      setJournalError(errMsg);
      updateJournalEntry(tempEntry.id, {
        ai_response: `Sorry, I couldn't respond right now. ${errMsg}`,
        category: 'general',
      });
    } finally {
      setJournalLoading(false);
    }
  };

  const handleGenerateRecap = async () => {
    setRecapLoading(true);
    try {
      const weekEntries = entryList.slice(-7);
      const recap = await generateWeeklyRecap(weekEntries, targets, reflections, journal);
      setWeeklyRecap(recap);
    } catch (err) {
      setJournalError(err instanceof Error ? err.message : 'Failed to generate recap.');
    } finally {
      setRecapLoading(false);
    }
  };

  const hasKey = !!loadAiApiKey();

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 900, mx: 'auto' }}>
      <PageHeader
        title="My Growth Profile"
        subtitle="Your targets, achievements, and insights at a glance."
        action={
          <IconButton
            onClick={() => setShowSettings(!showSettings)}
            size="small"
            aria-label="Settings"
            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
          >
            <SettingsIcon fontSize="small" />
          </IconButton>
        }
      />

      {/* KPI Targets editor */}
      <Box sx={{ mb: 2 }}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<TuneIcon />}
          onClick={() => (showTargets ? setShowTargets(false) : openTargetEditor())}
          sx={{ fontWeight: 600 }}
        >
          {showTargets ? 'Close Target Editor' : 'Adjust KPI Targets'}
        </Button>
        {showTargets && (
          <Box sx={{ mt: 1 }}>
            <StatCard title="KPI Targets & Thresholds">
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Tune how each metric is weighted and what score earns each tier. Lower-is-better metrics (e.g. escalation rate) use the same thresholds as a cap.
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Metric</TableCell>
                  <TableCell align="right" sx={{ minWidth: 80 }}>Weight</TableCell>
                  <TableCell align="center" sx={{ minWidth: 60 }}>S</TableCell>
                  <TableCell align="center" sx={{ minWidth: 60 }}>A+</TableCell>
                  <TableCell align="center" sx={{ minWidth: 60 }}>A</TableCell>
                  <TableCell align="center" sx={{ minWidth: 60 }}>B</TableCell>
                  <TableCell align="center" sx={{ minWidth: 60 }}>C</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {targetEdits.map((t) => (
                  <TableRow key={t.metric_key}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{t.label}</Typography>
                      <Typography variant="caption" color="text.secondary">{t.metric_key}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        value={t.weight}
                        type="number"
                        size="small"
                        slotProps={{ htmlInput: { min: 0, max: 1, step: 0.05 } }}
                        onChange={(e) => updateTargetEdit(t.metric_key, { weight: parseFloat(e.target.value) || 0 })}
                        sx={{ width: 90 }}
                      />
                    </TableCell>
                    {(['S', 'A_plus', 'A', 'B', 'C'] as Array<keyof Thresholds>).map((tier) => (
                      <TableCell align="center" key={tier}>
                        <TextField
                          value={t.thresholds[tier]}
                          type="number"
                          size="small"
                          slotProps={{ htmlInput: { step: '0.1' } }}
                          onChange={(e) => updateThreshold(t.metric_key, tier, e.target.value)}
                          sx={{ width: 80 }}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
              <Button variant="contained" size="small" onClick={saveTargetEdits} sx={{ fontWeight: 600 }}>
                Save Targets
              </Button>
              <Button variant="text" size="small" onClick={resetTargets} sx={{ color: 'text.secondary' }}>
                Reset
              </Button>
            </Box>
            </StatCard>
          </Box>
        )}
      </Box>

      {showSettings && (
        <StatCard title="AI Engine API Key">
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Add the API key for your AI engine to power reflections, journaling, and weekly recaps. It's stored locally in your browser only.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              type="password"
              fullWidth
              size="small"
              placeholder="Paste your API key"
            />
            <Button variant="contained" onClick={handleSaveKey} sx={{ flexShrink: 0 }}>
              Save
            </Button>
          </Box>
        </StatCard>
      )}

      {!hasKey && !showSettings && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }} action={
          <Button color="inherit" size="small" onClick={() => setShowSettings(true)}>Add Key</Button>
        }>
          Add your AI Engine API key to enable AI-powered journaling and reflection tips.
        </Alert>
      )}

      {/* Stats Row */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard title="Reflection Streak">
            <Typography sx={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1 }}>
              {streak}
            </Typography>
            <Typography variant="caption" color="text.secondary">days in a row</Typography>
          </StatCard>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard title="Total Reflections">
            <Typography sx={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1 }}>
              {reflectionList.length}
            </Typography>
            <Typography variant="caption" color="text.secondary">completed</Typography>
          </StatCard>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard title="7-Day Avg Score">
            <Typography sx={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1 }}>
              {rollingAvg !== null ? rollingAvg.toFixed(2) : '—'}
            </Typography>
            <Typography variant="caption" color="text.secondary">out of 5.00</Typography>
          </StatCard>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard title="Badges Earned">
            <Typography sx={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1 }}>
              {achievements.length}
            </Typography>
            <Typography variant="caption" color="text.secondary">unlocked</Typography>
          </StatCard>
        </Grid>
      </Grid>

      {/* Insights */}
      {activeInsights.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <StatCard title="Smart Insights">
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {activeInsights.map((insight) => (
                <Box
                  key={insight.id}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: insight.severity === 'positive' ? 'success.light' : insight.severity === 'warning' ? 'warning.light' : 'action.selected',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1,
                  }}
                >
                  <LightbulbIcon sx={{ fontSize: 18, color: 'text.secondary', mt: 0.2, flexShrink: 0 }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{insight.title}</Typography>
                    <Typography variant="caption" color="text.secondary">{insight.body}</Typography>
                  </Box>
                  <Button size="small" onClick={() => dismissInsight(insight.id)} sx={{ flexShrink: 0, fontSize: '0.7rem' }}>
                    Dismiss
                  </Button>
                </Box>
              ))}
            </Box>
          </StatCard>
        </Box>
      )}

      <Grid container spacing={2}>
        {/* Conversational Journal */}
        <Grid size={{ xs: 12, md: 7 }}>
          <StatCard
            title="Growth Journal"
            action={
              <Typography variant="caption" color="text.secondary">
                {journal.length} entries
              </Typography>
            }
          >
            <Box
              sx={{
                height: 360,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
                p: 1,
                mb: 1,
                borderRadius: 2,
                bgcolor: 'background.default',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              {recentJournal.length === 0 && !journalLoading && (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', maxWidth: 280 }}>
                    Share what's on your mind — a win, a struggle, a question. Your AI coach will listen and respond.
                  </Typography>
                </Box>
              )}
              {recentJournal.map((entry) => (
                <JournalBubble key={entry.id} entry={entry} />
              ))}
              {journalLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                  <CircularProgress size={20} />
                </Box>
              )}
              <div ref={messagesEndRef} />
            </Box>
            {journalError && (
              <Alert severity="error" sx={{ mb: 1, borderRadius: 2 }} onClose={() => setJournalError(null)}>
                {journalError}
              </Alert>
            )}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                value={journalInput}
                onChange={(e) => setJournalInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendJournal(); } }}
                placeholder="Write to your coach..."
                fullWidth
                size="small"
                multiline
                maxRows={3}
                disabled={journalLoading}
              />
              <IconButton
                onClick={handleSendJournal}
                disabled={!journalInput.trim() || journalLoading}
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
                <SendIcon fontSize="small" />
              </IconButton>
            </Box>
          </StatCard>

          {/* Weekly Recap */}
          <Box sx={{ mt: 2 }}>
            <StatCard title="Weekly Recap">
              {weeklyRecap ? (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>{weeklyRecap.title}</Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>{weeklyRecap.body}</Typography>
                </Box>
              ) : (
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    Generate an AI-powered summary of your week.
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleGenerateRecap}
                    disabled={recapLoading || entryList.length === 0}
                    startIcon={recapLoading ? <CircularProgress size={16} /> : <TrendingUpIcon fontSize="small" />}
                  >
                    {recapLoading ? 'Generating...' : 'Generate Recap'}
                  </Button>
                </Box>
              )}
            </StatCard>
          </Box>
        </Grid>

        {/* Streak Calendar */}
        <Grid size={{ xs: 12, md: 5 }}>
          <StatCard title="Activity Streak" delay={100}>
            <StreakCalendar reflections={reflections} moodCheckins={moodCheckins} entries={entries} months={12} />
          </StatCard>
        </Grid>

        {/* Achievements + Recent Reflections */}
        <Grid size={{ xs: 12, md: 5 }}>
          <StatCard title="Achievement Badges">
            {achievements.length === 0 ? (
              <EmptyState
                title="No badges yet"
                hint="Complete reflections and log data to unlock badges."
              />
            ) : (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {achievements.map((a) => (
                  <Box
                    key={a.achievement_key}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      p: 1,
                      borderRadius: 2,
                      bgcolor: 'warning.light',
                      border: '1px solid',
                      borderColor: 'warning.main',
                    }}
                  >
                    <EmojiEventsIcon sx={{ fontSize: 20, color: 'warning.main' }} />
                    <Box>
                      <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>{a.title}</Typography>
                      <Typography variant="caption" color="text.secondary">{a.description}</Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </StatCard>

          <Box sx={{ mt: 2 }}>
            <StatCard title="Recent Reflections">
              {reflectionList.length === 0 ? (
                <EmptyState
                  title="No reflections yet"
                  hint="Complete your first one from the Reflection tab."
                />
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {reflectionList.slice(0, 5).map((r) => (
                    <Box key={r.entry_date} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                        {r.entry_date.slice(5)}
                      </Typography>
                      {r.grade && <TierChip tier={r.grade} />}
                      {r.score !== null && (
                        <Typography variant="caption" sx={{ ml: 'auto', fontWeight: 600 }}>
                          {r.score.toFixed(2)}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>
              )}
            </StatCard>
          </Box>

          {moodCheckins.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <StatCard title="Mood History">
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {moodCheckins.slice(-10).reverse().map((m) => (
                    <Chip
                      key={m.id}
                      label={`${moodEmojiFor(m.mood)} ${m.entry_date.slice(5)}`}
                      size="small"
                      sx={{ bgcolor: 'action.selected', fontSize: '0.7rem' }}
                    />
                  ))}
                </Box>
              </StatCard>
            </Box>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}

function JournalBubble({ entry }: { entry: JournalEntry }) {
  const theme = useTheme();
  const cat = entry.category;
  const catStyle = cat ? toneStyle(CATEGORY_TONE[cat], theme) : null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      <Box sx={{ alignSelf: 'flex-end', maxWidth: '80%' }}>
        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            borderTopRightRadius: 4,
          }}
        >
          <Typography variant="body2">{entry.user_message}</Typography>
        </Box>
      </Box>
      {entry.ai_response && (
        <Box sx={{ alignSelf: 'flex-start', maxWidth: '80%', display: 'flex', gap: 1 }}>
          <CoachAvatar state="idle" size={28} />
          <Box>
            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                borderTopLeftRadius: 4,
              }}
            >
              <Typography variant="body2">{entry.ai_response}</Typography>
            </Box>
            {catStyle && (
              <Chip
                label={entry.category}
                size="small"
                sx={{
                  mt: 0.5,
                  bgcolor: catStyle.bg,
                  color: catStyle.color,
                  fontSize: '0.65rem',
                  height: 18,
                }}
              />
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
}

function moodEmojiFor(mood: string): string {
  const map: Record<string, string> = {
    great: '😄', good: '🙂', okay: '😐', stressed: '😟', overwhelmed: '😫',
  };
  return map[mood] ?? '—';
}
