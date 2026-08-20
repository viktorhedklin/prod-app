import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  Tabs,
  Tab,
} from '@mui/material';
import {
  TrendingUp,
  EmojiEvents,
  Lightbulb,
  Psychology,
  CalendarMonth,
  Star,
  ArrowBack,
  ArrowForward,
} from '@mui/icons-material';
import { useApp } from '../useApp';
import { computeWeeklyGrade, formatTierLabel } from '../grading';
import { checkAchievements } from '../insights';
import { startOfWeekLocal, addDays, formatLongDate } from '../dateUtils';
import TierChip from '../components/TierChip';

interface Props {
  open: boolean;
  onClose: () => void;
  weekStart?: string;
}

export default function WeeklyReviewDialog({ open, onClose, weekStart: initialWeekStart }: Props) {
  const {
    entries, targets, reflections, weeklyEntries, insights, achievements, moodCheckins,
  } = useApp();

  const [weekStart, setWeekStart] = useState(initialWeekStart || startOfWeekLocal(new Date()));
  const [tabIndex, setTabIndex] = useState(0);

  const weekData = useMemo(() => {
    const ws = weekStart;
    const weekEnd = addDays(ws, 6);
    const days: string[] = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(ws, i));
    }
    return { weekStart: ws, weekEnd, days };
  }, [weekStart]);

  const dailyEntries = useMemo(() => {
    return weekData.days.map((d) => entries[d]).filter(Boolean);
  }, [entries, weekData.days]);

  const weeklyEntry = weeklyEntries[weekStart];
  const weekReflections = weekData.days.map((d) => reflections[d]).filter(Boolean);
  const weekInsights = insights.filter((i) => {
    const idate = i.created_at.split('T')[0];
    return weekData.days.includes(idate);
  });
  const weekMoods = moodCheckins.filter((m) => weekData.days.includes(m.entry_date));
  const weekAchievements = achievements.filter((a) => weekData.days.includes(a.unlocked_at.split('T')[0]));

  const gradeResult = useMemo(() => {
    return computeWeeklyGrade(weekStart, dailyEntries, weeklyEntry, targets, null);
  }, [weekStart, dailyEntries, weeklyEntry, targets]);

  const streak = useMemo(() => {
    const allReflections = Object.values(reflections).sort((a, b) => b.entry_date.localeCompare(a.entry_date));
    let streak = 0;
    let cursor = new Date(startOfWeekLocal(new Date()));
    for (const r of allReflections) {
      if (new Date(r.entry_date + 'T00:00:00').getTime() === cursor.getTime()) {
        streak++;
        cursor.setDate(cursor.getDate() - 7);
      } else break;
    }
    return streak;
  }, [reflections]);

  const newAchievements = useMemo(() => checkAchievements(reflections, entries, [], moodCheckins, new Set(achievements.map((a) => a.achievement_key))), [reflections, entries, moodCheckins, achievements]);

  const dominantMood = useMemo(() => {
    if (!moodCheckins.length) return null;
    const counts = weekMoods.reduce((acc, m) => { acc[m.mood] = (acc[m.mood] || 0) + 1; return acc; }, {} as Record<string, number>);
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  }, [weekMoods]);

  const handlePrevWeek = () => setWeekStart((ws) => addDays(ws, -7));
  const handleNextWeek = () => setWeekStart((ws) => addDays(ws, 7));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{ sx: { maxHeight: '90vh', overflow: 'auto' } }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 3, py: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button onClick={handlePrevWeek} size="small" aria-label="Previous week" startIcon={<ArrowBack fontSize="small" />}>
            Prev
          </Button>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Weekly Review
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {formatLongDate(weekStart)} – {formatLongDate(addDays(weekStart, 6))}
            </Typography>
          </Box>
          <Button onClick={handleNextWeek} size="small" aria-label="Next week" endIcon={<ArrowForward fontSize="small" />}>
            Next
          </Button>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button variant="outlined" size="small" onClick={() => setWeekStart(startOfWeekLocal(new Date()))} startIcon={<CalendarMonth fontSize="small" />}>
            This Week
          </Button>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 3, pt: 2 }}>
        <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Overview" icon={<TrendingUp fontSize="small" />} />
          <Tab label="Reflections" icon={<Psychology fontSize="small" />} />
          <Tab label="Insights" icon={<Lightbulb fontSize="small" />} />
          <Tab label="Achievements" icon={<EmojiEvents fontSize="small" />} />
        </Tabs>

        {tabIndex === 0 && (
          <Box>
            {/* Overview Tab */}
            <Grid container spacing={3} sx={{ mt: 2 }}>
              <Grid size={{ xs: 12, md: 3 }}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 600 }}>
                      Weekly Grade
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      {gradeResult.grade ? (
                        <TierChip tier={gradeResult.grade} size="medium" />
                      ) : (
                        <Typography variant="h4" color="text.secondary">—</Typography>
                      )}
                      <Box>
                        <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1 }}>
                          {gradeResult.score !== null ? gradeResult.score.toFixed(2) : '—'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">out of 5.00</Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, md: 3 }}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 600 }}>
                      Reflection Streak
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ bgcolor: 'warning.light', color: 'warning.main', width: 48, height: 48 }}>
                        <Star fontSize="large" />
                      </Avatar>
                      <Typography variant="h3" sx={{ fontWeight: 700, lineHeight: 1 }}>{streak}</Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">weeks in a row</Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, md: 3 }}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 600 }}>
                      Dominant Mood
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.contrastText', width: 48, height: 48 }}>
                        {dominantMood === 'great' ? '😄' : dominantMood === 'good' ? '🙂' : dominantMood === 'okay' ? '😐' : dominantMood === 'stressed' ? '😟' : '😫'}
                      </Avatar>
                      <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1, textTransform: 'capitalize' }}>
                        {dominantMood ?? '—'}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, md: 3 }}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 600 }}>
                      Reflections This Week
                    </Typography>
                    <Typography variant="h3" sx={{ fontWeight: 700, lineHeight: 1 }}>
                      {weekReflections.length}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">out of 7 days</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Metric Breakdown */}
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>Metric Breakdown</Typography>
              {gradeResult.breakdown.length > 0 ? (
                <Grid container spacing={2}>
                  {gradeResult.breakdown.map((row) => (
                    <Grid key={row.metric_key} size={{ xs: 6, md: 3 }}>
                      <Card>
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>{row.label}</Typography>
                            {row.tier && <TierChip tier={row.tier} />}
                          </Box>
                          <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1 }}>
                            {row.aggregated_value !== null ? row.aggregated_value.toFixed(row.metric_key === 'csat' ? 2 : row.metric_key === 'esc_rate' || row.metric_key === 'esc_accuracy' ? 1 : 0) : '—'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Weight: {(row.weight_used * 100).toFixed(0)}%
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Typography variant="body2" color="text.secondary">No data for this week yet.</Typography>
              )}
            </Box>
          </Box>
        )}

        {tabIndex === 1 && (
          <Box sx={{ mt: 2 }}>
            {/* Reflections Tab */}
            {weekReflections.length > 0 ? (
              <List>
                {weekReflections.map((r) => (
                  <ListItem key={r.entry_date} sx={{ py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
                    <ListItemIcon>
                      <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.contrastText', width: 40, height: 40, minWidth: 40 }}>
                        {r.grade ? formatTierLabel(r.grade) : '?'}
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={<Typography variant="body1" sx={{ fontWeight: 600 }}>{formatLongDate(r.entry_date)}</Typography>}
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5 }}>
                          {r.grade && <TierChip tier={r.grade} size="small" />}
                          {r.score !== null && <Typography variant="caption" sx={{ fontWeight: 600 }}>{r.score.toFixed(2)}</Typography>}
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No reflections this week
              </Typography>
            )}
          </Box>
        )}

        {tabIndex === 2 && (
          <Box sx={{ mt: 2 }}>
            {/* Insights Tab */}
            {weekInsights.length > 0 ? (
              <List>
                {weekInsights.map((i) => (
                  <ListItem key={i.id} sx={{ py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
                    <ListItemIcon>
                      <Avatar sx={{ 
                        bgcolor: i.severity === 'warning' ? 'warning.light' : 'info.light',
                        color: i.severity === 'warning' ? 'warning.main' : 'info.main',
                        width: 40, height: 40, minWidth: 40 
                      }}>
                        {i.severity === 'warning' ? <Lightbulb fontSize="small" /> : <TrendingUp fontSize="small" />}
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={<Typography variant="body1" sx={{ fontWeight: 600 }}>{i.title}</Typography>}
                      secondary={<Typography variant="body2" color="text.secondary">{i.body}</Typography>}
                    />
                    <Chip label={i.severity} size="small" color={i.severity === 'warning' ? 'warning' : 'info'} />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No insights this week
              </Typography>
            )}
          </Box>
        )}

        {tabIndex === 3 && (
          <Box sx={{ mt: 2 }}>
            {/* Achievements Tab */}
            {(weekAchievements.length > 0 || newAchievements.length > 0) ? (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {newAchievements.map((a) => (
                  <Box key={a.achievement_key} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5, borderRadius: 2, bgcolor: 'success.light', border: '1px solid', borderColor: 'success.main' }}>
                    <Avatar sx={{ bgcolor: 'success.main', color: 'success.contrastText', width: 36, height: 36, minWidth: 36 }}>
                      <EmojiEvents fontSize="small" />
                    </Avatar>
<Box>
  <Typography variant="body2" sx={{ fontWeight: 700, display: 'block' }}>
    {a.title}{' '}
    <Typography variant="body2" sx={{ fontWeight: 400, color: 'text.secondary' }}>
      (NEW)
    </Typography>
  </Typography>
  <Typography variant="caption" color="text.secondary">{a.description}</Typography>
</Box>
                  </Box>
                ))}
                {weekAchievements.map((a) => (
                  <Box key={a.achievement_key} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, borderRadius: 2, bgcolor: 'warning.light', border: '1px solid', borderColor: 'warning.main' }}>
                    <Avatar sx={{ bgcolor: 'warning.main', color: 'warning.contrastText', width: 32, height: 32, minWidth: 32 }}>
                      <EmojiEvents fontSize="small" />
                    </Avatar>
                    <Box>
                      <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>{a.title}</Typography>
                      <Typography variant="caption" color="text.secondary">{a.description}</Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No achievements this week
              </Typography>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider' }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}