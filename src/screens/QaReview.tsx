import { useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import IconButton from '@mui/material/IconButton';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { useApp } from '../AppContext';
import StatCard from '../components/StatCard';
import TierChip from '../components/TierChip';
import type { Tier } from '../types';

const QA_TARGET = 93;

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

function getWeekLabel(weekStart: string): string {
  const d = new Date(weekStart + 'T00:00:00');
  const end = new Date(d);
  end.setDate(end.getDate() + 6);
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

function qaGrade(pct: number): Tier {
  if (pct >= 95) return 'S';
  if (pct >= 93) return 'A_plus';
  if (pct >= 90) return 'A';
  if (pct >= 85) return 'B';
  if (pct >= 80) return 'C';
  return 'PIP';
}

export default function QaReview() {
  const { qaEntries, upsertQaEntry, removeQaEntry } = useApp();
  const todayWeek = getWeekStart(new Date());
  const [selectedWeek, setSelectedWeek] = useState(todayWeek);
  const [cases, setCases] = useState('');
  const [pct, setPct] = useState('');
  const [notes, setNotes] = useState('');

  const sortedEntries = useMemo(
    () => Object.values(qaEntries).sort((a, b) => b.week_start.localeCompare(a.week_start)),
    [qaEntries],
  );

  const currentEntry = qaEntries[selectedWeek];
  const latestEntry = sortedEntries[0];

  const avgPct = sortedEntries.length > 0
    ? sortedEntries.reduce((s, e) => s + e.qa_percentage, 0) / sortedEntries.length
    : 0;

  const trendData = useMemo(() => {
    if (sortedEntries.length < 2) return null;
    const recent = sortedEntries.slice(0, 4).reverse();
    if (recent.length < 2) return null;
    const firstHalf = recent.slice(0, Math.floor(recent.length / 2));
    const secondHalf = recent.slice(Math.floor(recent.length / 2));
    const avgFirst = firstHalf.reduce((s, e) => s + e.qa_percentage, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((s, e) => s + e.qa_percentage, 0) / secondHalf.length;
    return { diff: avgSecond - avgFirst, avgSecond, avgFirst };
  }, [sortedEntries]);

  const handleSubmit = () => {
    const casesNum = parseInt(cases, 10) || 0;
    const pctNum = parseFloat(pct) || 0;
    if (casesNum === 0 && pctNum === 0) return;
    upsertQaEntry(selectedWeek, {
      week_start: selectedWeek,
      cases_reviewed: casesNum,
      qa_percentage: pctNum,
      notes: notes.trim() || null,
    });
    setCases('');
    setPct('');
    setNotes('');
  };

  const handleSelectWeek = (weekStart: string) => {
    setSelectedWeek(weekStart);
    const e = qaEntries[weekStart];
    if (e) {
      setCases(String(e.cases_reviewed));
      setPct(String(e.qa_percentage));
      setNotes(e.notes ?? '');
    } else {
      setCases('');
      setPct('');
      setNotes('');
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 900, mx: 'auto' }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
        Weekly QA Review
      </Typography>

      {/* Summary cards */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard title="Latest QA Score">
            {latestEntry ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography sx={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1 }}>
                  {latestEntry.qa_percentage.toFixed(1)}%
                </Typography>
                <TierChip tier={qaGrade(latestEntry.qa_percentage)} />
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">No data yet</Typography>
            )}
            {latestEntry && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Week of {getWeekLabel(latestEntry.week_start)}
              </Typography>
            )}
          </StatCard>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard title="Average QA Score">
            <Typography sx={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1 }}>
              {sortedEntries.length > 0 ? avgPct.toFixed(1) : '—'}%
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              Across {sortedEntries.length} week{sortedEntries.length !== 1 ? 's' : ''}
            </Typography>
          </StatCard>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard title="Target">
            <Typography sx={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1, color: 'primary.main' }}>
              {QA_TARGET}%
            </Typography>
            {latestEntry && (
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  mt: 0.5,
                  color: latestEntry.qa_percentage >= QA_TARGET ? 'success.main' : 'error.main',
                  fontWeight: 600,
                }}
              >
                {latestEntry.qa_percentage >= QA_TARGET
                  ? `${(latestEntry.qa_percentage - QA_TARGET).toFixed(1)}% above target`
                  : `${(QA_TARGET - latestEntry.qa_percentage).toFixed(1)}% below target`}
              </Typography>
            )}
          </StatCard>
        </Grid>
      </Grid>

      {/* Trend insight */}
      {trendData && trendData.diff !== 0 && (
        <Box sx={{ mb: 2 }}>
          <StatCard title="Trend">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TrendingUpIcon
                sx={{
                  color: trendData.diff > 0 ? 'success.main' : 'error.main',
                  transform: trendData.diff < 0 ? 'rotate(180deg)' : 'none',
                }}
              />
              <Typography variant="body2">
                QA is {trendData.diff > 0 ? 'improving' : 'declining'} by{' '}
                <strong>{Math.abs(trendData.diff).toFixed(1)}%</strong> over the last few weeks.
              </Typography>
            </Box>
          </StatCard>
        </Box>
      )}

      {/* Entry form */}
      <Card elevation={0} sx={{ mb: 2 }}>
        <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
            {currentEntry ? `Edit Week of ${getWeekLabel(selectedWeek)}` : `Log QA for Week of ${getWeekLabel(selectedWeek)}`}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
            <TextField
              label="Cases Reviewed"
              type="number"
              size="small"
              value={cases}
              onChange={(e) => setCases(e.target.value)}
              sx={{ width: 160 }}
              slotProps={{ htmlInput: { min: 0 } }}
            />
            <TextField
              label="QA Percentage"
              type="number"
              size="small"
              value={pct}
              onChange={(e) => setPct(e.target.value)}
              sx={{ width: 160 }}
              slotProps={{ htmlInput: { min: 0, max: 100, step: '0.1' } }}
            />
            <TextField
              label="Notes (optional)"
              size="small"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              sx={{ width: 300 }}
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              size="small"
              onClick={handleSubmit}
              startIcon={<CheckCircleIcon />}
              sx={{ fontWeight: 600 }}
            >
              {currentEntry ? 'Update' : 'Save QA Entry'}
            </Button>
            {currentEntry && (
              <IconButton
                size="small"
                onClick={() => {
                  removeQaEntry(selectedWeek);
                  setCases('');
                  setPct('');
                  setNotes('');
                }}
                sx={{ color: 'error.main' }}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* History table */}
      {sortedEntries.length > 0 && (
        <StatCard title="QA History">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Week</TableCell>
                <TableCell align="right">Cases</TableCell>
                <TableCell align="right">QA %</TableCell>
                <TableCell align="center">Tier</TableCell>
                <TableCell align="center">vs Target</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedEntries.map((e) => {
                const grade = qaGrade(e.qa_percentage);
                const vsTarget = e.qa_percentage - QA_TARGET;
                return (
                  <TableRow
                    key={e.week_start}
                    hover
                    onClick={() => handleSelectWeek(e.week_start)}
                    sx={{ cursor: 'pointer', bgcolor: e.week_start === selectedWeek ? 'action.hover' : 'inherit' }}
                  >
                    <TableCell>{getWeekLabel(e.week_start)}</TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {e.cases_reviewed}
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {e.qa_percentage.toFixed(1)}%
                    </TableCell>
                    <TableCell align="center">
                      <TierChip tier={grade} />
                    </TableCell>
                    <TableCell align="center">
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 600,
                          color: vsTarget >= 0 ? 'success.main' : 'error.main',
                        }}
                      >
                        {vsTarget >= 0 ? '+' : ''}{vsTarget.toFixed(1)}%
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={(event) => {
                          event.stopPropagation();
                          removeQaEntry(e.week_start);
                        }}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </StatCard>
      )}
    </Box>
  );
}
