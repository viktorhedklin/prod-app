import { useState, useMemo, useEffect } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import Fade from '@mui/material/Fade';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useApp } from '../AppContext';
import { computeWeightedGrade, formatTierLabel, computeRollingAverage, computeTaskHoursBacklog, getOpenShiftItems } from '../grading';
import { generateReflectionQuestions, generateReflectionTips } from '../ai';
import StatCard from '../components/StatCard';
import TierChip from '../components/TierChip';
import MoodSelector, { moodEmoji, moodLabel } from '../components/MoodSelector';
import type { AiTip, MoodType } from '../types';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

type Phase = 'prereq' | 'questions' | 'tips' | 'done';

export default function Reflection() {
  const {
    entries, targets, tasks, escalations,
    saveReflection, getReflection, addMoodCheckIn, getMoodForDate,
    notify, refreshInsights, remember, coachMemories,
  } = useApp();
  const date = today();
  const entry = entries[date];
  const existingReflection = getReflection(date);

  const [phase, setPhase] = useState<Phase>(
    existingReflection ? 'done' : 'prereq',
  );
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [loadingTips, setLoadingTips] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<string[]>(existingReflection?.questions ?? []);
  const [answers, setAnswers] = useState<string[]>(existingReflection?.answers ?? []);
  const [tips, setTips] = useState<AiTip[]>(existingReflection?.ai_tips ?? []);
  const [aiSummary, setAiSummary] = useState<string | null>(existingReflection?.ai_summary ?? null);
  const [reflectionMood, setReflectionMood] = useState<MoodType | null>(
    getMoodForDate(date, 'reflection')?.mood ?? null,
  );

  const prereqCheck = useMemo(() => {
    const { pendingTasks, openEscalations } = getOpenShiftItems(tasks, escalations);
    const backlog = computeTaskHoursBacklog(entry ? [entry] : []);
    const hasData = entry && (entry.chats_handled > 0 || entry.emails_handled > 0 || entry.tasks_handled > 0);
    return {
      hasData: !!hasData,
      pendingTasks: pendingTasks.filter((t) => t.linked_date === date),
      openEscalations: openEscalations.filter((e) => e.linked_date === date),
      backlog: backlog.backlog,
      ready: !!hasData && pendingTasks.filter((t) => t.linked_date === date).length === 0 && openEscalations.filter((e) => e.linked_date === date).length === 0,
    };
  }, [tasks, escalations, entry, date]);

  const { score, grade } = useMemo(
    () => computeWeightedGrade(entry ? [entry] : [], targets),
    [entry, targets],
  );

  const rollingAvg = useMemo(() => {
    const rolling = computeRollingAverage(entries, targets, 7);
    const scores = rolling.filter((r) => r.score !== null).map((r) => r.score as number);
    if (scores.length === 0) return null;
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }, [entries, targets]);


  const handleStartReflection = async () => {
    setError(null);
    setLoadingQuestions(true);
    try {
      const generatedQuestions = await generateReflectionQuestions(entry!, targets, coachMemories);
      setQuestions(generatedQuestions);
      setAnswers(new Array(generatedQuestions.length).fill(''));
      setPhase('questions');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate questions. Please check your OpenAI API key in Growth Profile settings.');
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleMoodSelect = (mood: MoodType) => {
    setReflectionMood(mood);
    addMoodCheckIn(mood, 'reflection');
  };

  const handleAnswerChange = (index: number, value: string) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleSubmitAnswers = async () => {
    setError(null);
    setLoadingTips(true);
    try {
      const result = await generateReflectionTips(entry!, targets, questions, answers, score, grade, coachMemories);
      setTips(result.tips);
      setAiSummary(result.summary);
      if (result.memory) remember(result.memory, 'reflection');
      setPhase('tips');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate tips.');
      setPhase('questions');
    } finally {
      setLoadingTips(false);
    }
  };

  const handleComplete = () => {
    saveReflection(date, {
      entry_date: date,
      questions,
      answers,
      ai_tips: tips,
      ai_summary: aiSummary,
      score,
      grade,
    });
    setPhase('done');
    notify('Reflection saved! Great job taking time to reflect.', 'success');
    refreshInsights();
  };

  // Auto-refresh streak and achievements on done
  useEffect(() => {
    if (phase === 'done') {
      refreshInsights();
    }
  }, [phase, refreshInsights]);

  // --- DONE PHASE: show saved reflection ---
  if (phase === 'done' && existingReflection) {
    return <ReflectionView date={date} reflection={existingReflection} grade={existingReflection.grade} />;
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 900, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          End-of-Day Reflection
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {formatDate(date)}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* PREREQ PHASE */}
      {phase === 'prereq' && (
        <Fade in timeout={300}>
          <Box>
            <StatCard title="Before You Reflect">
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Complete these items to unlock your reflection. This 20-30 minute process helps you understand your day and get personalized coaching.
              </Typography>
              <PrereqItem
                done={prereqCheck.hasData}
                label="Log your daily metrics"
                hint="Go to the Today tab and enter your chats, emails, CSAT, QA, and other metrics"
              />
              <PrereqItem
                done={prereqCheck.pendingTasks.length === 0}
                label={`Submit all tasks (${prereqCheck.pendingTasks.length} pending)`}
                hint="Mark all tasks as submitted in the Tasks tab"
              />
              <PrereqItem
                done={prereqCheck.openEscalations.length === 0}
                label={`Resolve all escalations (${prereqCheck.openEscalations.length} open)`}
                hint="Advance all escalations to resolved in the Escalations tab"
              />
              <PrereqItem
                done={entry ? entry.task_hours_submitted >= entry.task_hours_logged : false}
                label="Submit all task hours"
                hint={`Logged: ${entry?.task_hours_logged ?? 0}h, Submitted: ${entry?.task_hours_submitted ?? 0}h`}
              />
            </StatCard>

            {prereqCheck.ready && (
              <Fade in timeout={400}>
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={handleStartReflection}
                    startIcon={<LightbulbIcon />}
                    sx={{ borderRadius: 3, py: 1.5, px: 4, fontSize: '1rem', fontWeight: 600 }}
                  >
                    Start Reflection
                  </Button>
                </Box>
              </Fade>
            )}
          </Box>
        </Fade>
      )}

      {/* MOOD SECTION (shown during questions loading) */}
      {loadingQuestions && (
        <Fade in timeout={300}>
          <Box>
            <StatCard title="How are you feeling right now?">
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Your emotional state at the end of the day matters. Pick your mood while I prepare your questions.
              </Typography>
              <MoodSelector selected={reflectionMood} onSelect={handleMoodSelect} />
              <Box sx={{ mt: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={20} />
                <Typography variant="body2" color="text.secondary">
                  Generating your questions...
                </Typography>
              </Box>
            </StatCard>
          </Box>
        </Fade>
      )}

      {/* QUESTIONS PHASE */}
      {phase === 'questions' && (
        <Fade in timeout={300}>
          <Box>
            <StatCard title="Reflection Questions">
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Take your time with these. Your answers shape the personalized tips you'll receive.
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                {questions.map((q, i) => (
                  <Box key={i}>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                      {i + 1}. {q}
                    </Typography>
                    <TextField
                      value={answers[i] ?? ''}
                      onChange={(e) => handleAnswerChange(i, e.target.value)}
                      multiline
                      minRows={2}
                      fullWidth
                      size="small"
                      placeholder="Type your reflection here..."
                    />
                  </Box>
                ))}
              </Box>
            </StatCard>

            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              {loadingTips ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={20} />
                  <Typography variant="body2" color="text.secondary">
                    Analyzing your day and generating tips...
                  </Typography>
                </Box>
              ) : (
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleSubmitAnswers}
                  endIcon={<ArrowForwardIcon />}
                  sx={{ fontWeight: 600, borderRadius: 3, py: 1.2, px: 3 }}
                >
                  Get My Tips
                </Button>
              )}
            </Box>
          </Box>
        </Fade>
      )}

      {/* TIPS PHASE */}
      {phase === 'tips' && (
        <Fade in timeout={300}>
          <Box>
            {aiSummary && (
              <Box
                sx={{
                  mb: 2,
                  p: 2.5,
                  borderRadius: 3,
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  position: 'relative',
                  overflow: 'hidden',
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
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, position: 'relative', zIndex: 1 }}>
                  Your Day Summary
                </Typography>
                <Typography variant="body2" sx={{ position: 'relative', zIndex: 1, opacity: 0.9 }}>
                  {aiSummary}
                </Typography>
              </Box>
            )}

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 7 }}>
                <StatCard title="Personalized Tips for Tomorrow">
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {tips.map((tip, i) => (
                      <Box
                        key={i}
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          bgcolor: tip.priority === 'high' ? 'error.light' : tip.priority === 'medium' ? 'warning.light' : 'action.selected',
                          border: '1px solid',
                          borderColor: tip.priority === 'high' ? 'error.main' : tip.priority === 'medium' ? 'warning.main' : 'divider',
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <LightbulbIcon
                            sx={{
                              fontSize: 18,
                              color: tip.priority === 'high' ? 'error.main' : tip.priority === 'medium' ? 'warning.main' : 'text.secondary',
                            }}
                          />
                          <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            {tip.metric}
                          </Typography>
                          <Box
                            sx={{
                              ml: 'auto',
                              px: 1,
                              py: 0.25,
                              borderRadius: 1,
                              bgcolor: tip.priority === 'high' ? 'error.main' : tip.priority === 'medium' ? 'warning.main' : 'text.secondary',
                              color: 'common.white',
                              fontSize: '0.65rem',
                              fontWeight: 600,
                              textTransform: 'uppercase',
                            }}
                          >
                            {tip.priority}
                          </Box>
                        </Box>
                        <Typography variant="body2">
                          {tip.tip}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </StatCard>
              </Grid>

              <Grid size={{ xs: 12, md: 5 }}>
                <StatCard title="Your Day at a Glance">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Box
                      sx={{
                        width: 64,
                        height: 64,
                        borderRadius: 3,
                        bgcolor: grade === 'S' || grade === 'A_plus' || grade === 'A' ? 'success.light' : grade === 'B' ? 'warning.light' : 'error.light',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Typography sx={{ fontSize: '1.75rem', fontWeight: 700 }}>
                        {grade ? formatTierLabel(grade) : '—'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, lineHeight: 1 }}>
                        {score !== null ? score.toFixed(2) : '—'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        out of 5.00
                      </Typography>
                    </Box>
                  </Box>
                  {rollingAvg !== null && (
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        7-day average: <strong>{rollingAvg.toFixed(2)}</strong>
                      </Typography>
                      {score !== null && (
                        <Typography variant="body2" color={score > rollingAvg ? 'success.main' : 'error.main'} sx={{ fontWeight: 600 }}>
                          {score > rollingAvg ? '▲' : '▼'} {Math.abs(score - rollingAvg).toFixed(2)} vs average
                        </Typography>
                      )}
                    </Box>
                  )}
                  {reflectionMood && (
                    <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="body2" color="text.secondary">
                        Mood: {moodEmoji(reflectionMood)} {moodLabel(reflectionMood)}
                      </Typography>
                    </Box>
                  )}
                </StatCard>

                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={handleComplete}
                    startIcon={<CheckCircleIcon />}
                    fullWidth
                    sx={{ fontWeight: 600, borderRadius: 3, py: 1.5 }}
                  >
                    Complete Reflection
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </Fade>
      )}
    </Box>
  );
}

function PrereqItem({ done, label, hint }: { done: boolean; label: string; hint: string }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.5,
        py: 1.5,
        borderBottom: '1px solid',
        borderColor: 'divider',
        '&:last-child': { borderBottom: 'none' },
      }}
    >
      <CheckCircleIcon
        sx={{
          color: done ? 'success.main' : 'text.disabled',
          fontSize: 20,
          mt: 0.2,
          flexShrink: 0,
        }}
      />
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 600, color: done ? 'text.primary' : 'text.secondary' }}>
          {label}
        </Typography>
        {!done && (
          <Typography variant="caption" color="text.secondary">
            {hint}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

function ReflectionView({
  date,
  reflection,
  grade,
}: {
  date: string;
  reflection: { questions: string[]; answers: string[]; ai_tips: AiTip[]; ai_summary: string | null };
  grade: import('../types').Tier | null;
}) {
  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 900, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Reflection — {formatDate(date)}
        </Typography>
        {grade && <TierChip tier={grade} size="medium" />}
      </Box>

      {reflection.ai_summary && (
        <Box
          sx={{
            mb: 2,
            p: 2.5,
            borderRadius: 3,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
            Summary
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            {reflection.ai_summary}
          </Typography>
        </Box>
      )}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 7 }}>
          <StatCard title="Your Reflection">
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {reflection.questions.map((q, i) => (
                <Box key={i}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    {i + 1}. {q}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ pl: 2 }}>
                    {reflection.answers[i] || '(no answer)'}
                  </Typography>
                  {i < reflection.questions.length - 1 && <Divider sx={{ mt: 2 }} />}
                </Box>
              ))}
            </Box>
          </StatCard>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <StatCard title="Tips Received">
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {reflection.ai_tips.map((tip, i) => (
                <Box
                  key={i}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: tip.priority === 'high' ? 'error.light' : tip.priority === 'medium' ? 'warning.light' : 'action.selected',
                  }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                    {tip.metric}
                  </Typography>
                  <Typography variant="body2">{tip.tip}</Typography>
                </Box>
              ))}
            </Box>
          </StatCard>
        </Grid>
      </Grid>
    </Box>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}
