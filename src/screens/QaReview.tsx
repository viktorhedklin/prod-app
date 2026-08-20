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
import Chip from '@mui/material/Chip';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ImageIcon from '@mui/icons-material/Image';
import CircularProgress from '@mui/material/CircularProgress';
import CloseIcon from '@mui/icons-material/Close';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { useApp } from '../AppContext';
import StatCard from '../components/StatCard';
import TierChip from '../components/TierChip';
import type { Tier } from '../types';
import { extractQaFromScreenshots } from '../ai';

const QA_TARGET = 93;

const CATEGORY_OPTIONS = [
  'Accuracy',
  'Empathy',
  'Grammar',
  'Resolution',
  'Compliance',
  'Punctuality',
  'Ownership',
  'Communication',
];

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

function computeQaStreak(sortedEntries: { week_start: string }[]): number {
  if (sortedEntries.length === 0) return 0;
  let streak = 0;
  let cursor = new Date(getWeekStart(new Date()));
  for (const entry of sortedEntries) {
    const weekStart = new Date(entry.week_start + 'T00:00:00');
    if (weekStart.getTime() === cursor.getTime()) {
      streak++;
      cursor = new Date(cursor);
      cursor.setDate(cursor.getDate() - 7);
    } else {
      break;
    }
  }
  return streak;
}

export default function QaReview() {
  const { qaEntries, upsertQaEntry, removeQaEntry } = useApp();
  const todayWeek = getWeekStart(new Date());
  const [selectedWeek, setSelectedWeek] = useState(todayWeek);
  const [cases, setCases] = useState('');
  const [pct, setPct] = useState('');
  const [notes, setNotes] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [pendingScreenshots, setPendingScreenshots] = useState<string[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState('');

  const sortedEntries = useMemo(
    () => Object.values(qaEntries).sort((a, b) => b.week_start.localeCompare(a.week_start)),
    [qaEntries],
  );

  const currentEntry = qaEntries[selectedWeek];
  const latestEntry = sortedEntries[0];

  const avgPct = sortedEntries.length > 0
    ? sortedEntries.reduce((s, e) => s + e.qa_percentage, 0) / sortedEntries.length
    : 0;

  const streak = useMemo(() => computeQaStreak(sortedEntries), [sortedEntries]);

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

  const chartData = useMemo(
    () =>
      sortedEntries
        .slice()
        .sort((a, b) => a.week_start.localeCompare(b.week_start))
        .map((e) => ({
          label: getWeekLabel(e.week_start),
          pct: e.qa_percentage,
          target: QA_TARGET,
        })),
    [sortedEntries],
  );

  const categoryFrequency = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of sortedEntries) {
      for (const cat of e.categories ?? []) {
        counts[cat] = (counts[cat] ?? 0) + 1;
      }
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
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
      categories,
    });
    setCases('');
    setPct('');
    setNotes('');
    setCategories([]);
  };

  const handleSelectWeek = (weekStart: string) => {
    setSelectedWeek(weekStart);
    const e = qaEntries[weekStart];
    if (e) {
      setCases(String(e.cases_reviewed));
      setPct(String(e.qa_percentage));
      setNotes(e.notes ?? '');
      setCategories(e.categories ?? []);
    } else {
      setCases('');
      setPct('');
      setNotes('');
      setCategories([]);
    }
  };

  const toggleCategory = (cat: string) => {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setExtractError('');
    const readers: Promise<string>[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      readers.push(
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
          reader.readAsDataURL(file);
        }),
      );
    }
    Promise.all(readers).then((urls) => {
      setPendingScreenshots((prev) => [...prev, ...urls].slice(0, 10));
    });
  };

  const handleExtract = async () => {
    if (pendingScreenshots.length === 0) return;
    setExtracting(true);
    setExtractError('');
    try {
      const result = await extractQaFromScreenshots(pendingScreenshots);
      setCases(String(result.cases_reviewed));
      setPct(String(result.qa_percentage));
      setNotes(result.notes ?? '');
      const validCats = result.categories.filter((c) => CATEGORY_OPTIONS.includes(c));
      setCategories((prev) => Array.from(new Set([...prev, ...validCats])));
      setPendingScreenshots([]);
    } catch (e) {
      setExtractError(e instanceof Error ? e.message : 'Could not read the screenshot(s).');
    } finally {
      setExtracting(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 900, mx: 'auto' }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
        Weekly QA Review
      </Typography>

      {/* Summary cards */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, sm: 3 }}>
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
        <Grid size={{ xs: 12, sm: 3 }}>
          <StatCard title="Average QA Score">
            <Typography sx={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1 }}>
              {sortedEntries.length > 0 ? avgPct.toFixed(1) : '—'}%
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              Across {sortedEntries.length} week{sortedEntries.length !== 1 ? 's' : ''}
            </Typography>
          </StatCard>
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
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
        <Grid size={{ xs: 12, sm: 3 }}>
          <StatCard title="Weekly Streak">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LocalFireDepartmentIcon
                sx={{
                  fontSize: 26,
                  color: streak > 0 ? 'warning.main' : 'text.disabled',
                }}
              />
              <Typography sx={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1 }}>
                {streak}
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              week{streak === 1 ? '' : 's'} logged in a row
            </Typography>
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

      {/* Trend chart */}
      {chartData.length >= 2 && (
        <Box sx={{ mb: 2 }}>
          <StatCard title="QA Trend">
            <Box sx={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 4, right: 12, bottom: 0, left: -18 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E4" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6B6B6B' }} axisLine={{ stroke: '#E4E4E4' }} tickLine={false} />
                  <YAxis domain={[70, 100]} tick={{ fontSize: 11, fill: '#6B6B6B' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      border: '1px solid #E4E4E4',
                      borderRadius: 8,
                      fontSize: 12,
                      boxShadow: 'none',
                    }}
                    formatter={(v: unknown) => [typeof v === 'number' ? `${v.toFixed(1)}%` : '—', 'QA']}
                  />
                  <Line type="monotone" dataKey="pct" stroke="#2952A3" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls={false} />
                  <Line type="monotone" dataKey="target" stroke="#4C8C6B" strokeWidth={1.5} strokeDasharray="5 4" dot={false} activeDot={false} />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </StatCard>
        </Box>
      )}

      {/* Category tags */}
      {categoryFrequency.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <StatCard title="Categories Mentioned">
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {categoryFrequency.map(([cat, count]) => (
                <Chip
                  key={cat}
                  label={`${cat} (${count})`}
                  size="small"
                  sx={{ bgcolor: 'warning.light', color: 'warning.main', fontWeight: 600 }}
                />
              ))}
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

          {/* Screenshot upload → data */}
          <Box
            component="label"
            htmlFor="qa-screenshot-upload"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              p: 2,
              mb: 2,
              borderRadius: 2,
              border: '1.5px dashed',
              borderColor: 'primary.main',
              bgcolor: 'primary.light',
              cursor: 'pointer',
              transition: 'background-color 0.15s',
              '&:hover': { bgcolor: 'primary.light', opacity: 0.85 },
            }}
          >
            <UploadFileIcon sx={{ color: 'primary.main' }} />
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Upload QA report screenshot(s)
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Take a screenshot of your QA results and the app will read the overall score for you.
              </Typography>
            </Box>
          </Box>
          <input
            id="qa-screenshot-upload"
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = '';
            }}
          />
          {pendingScreenshots.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
              {pendingScreenshots.map((url, idx) => (
                <Box
                  key={idx}
                  sx={{ position: 'relative', width: 64, height: 64, borderRadius: 1, overflow: 'hidden' }}
                >
                  <img src={url} alt={`QA screenshot ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <IconButton
                    size="small"
                    onClick={() =>
                      setPendingScreenshots((prev) => prev.filter((_, i) => i !== idx))
                    }
                    sx={{
                      position: 'absolute',
                      top: 0,
                      right: 0,
                      bgcolor: 'rgba(0,0,0,0.6)',
                      color: '#fff',
                      p: 0.2,
                      '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
                    }}
                  >
                    <CloseIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Box>
              ))}
            </Box>
          )}
          {(pendingScreenshots.length > 0 || extracting) && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={extracting ? <CircularProgress size={14} /> : <ImageIcon />}
                disabled={extracting}
                onClick={handleExtract}
                sx={{ fontWeight: 600 }}
              >
                {extracting ? 'Reading...' : `Extract QA from ${pendingScreenshots.length} screenshot${pendingScreenshots.length === 1 ? '' : 's'}`}
              </Button>
              {extractError && (
                <Typography variant="caption" color="error.main" sx={{ flex: 1 }}>
                  {extractError}
                </Typography>
              )}
            </Box>
          )}

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
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            Categories to improve (optional)
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
            {CATEGORY_OPTIONS.map((cat) => (
              <Chip
                key={cat}
                label={cat}
                size="small"
                onClick={() => toggleCategory(cat)}
                sx={{
                  fontWeight: 500,
                  bgcolor: categories.includes(cat) ? 'primary.main' : 'action.selected',
                  color: categories.includes(cat) ? 'primary.contrastText' : 'text.secondary',
                  '&:hover': { bgcolor: categories.includes(cat) ? 'primary.dark' : 'action.hover' },
                }}
              />
            ))}
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
                  setCategories([]);
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
                <TableCell>Categories</TableCell>
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
                    <TableCell>
                      {(e.categories ?? []).length > 0 && (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.25 }}>
                          {e.categories.slice(0, 3).map((c) => (
                            <Chip key={c} label={c} size="small" sx={{ height: 18, fontSize: '0.6rem' }} />
                          ))}
                          {e.categories.length > 3 && (
                            <Chip label={`+${e.categories.length - 3}`} size="small" sx={{ height: 18, fontSize: '0.6rem' }} />
                          )}
                        </Box>
                      )}
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