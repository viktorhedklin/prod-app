import { useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import { useTheme } from '@mui/material/styles';
import type { Reflection, MoodCheckIn, Tier } from '../types';

interface Props {
  reflections: Record<string, Reflection>;
  moodCheckins: MoodCheckIn[];
  entries?: Record<string, any>;
  months?: number;
}

export default function StreakCalendar({ reflections, moodCheckins, entries, months = 12 }: Props) {
  const theme = useTheme();
  const today = new Date();

  const dayData = useMemo(() => {
    const data: Record<string, { count: number; hasReflection: boolean; hasMood: boolean; hasEntry: boolean; grade?: Tier | null }> = {};

    Object.entries(reflections).forEach(([date, r]) => {
      if (!data[date]) data[date] = { count: 0, hasReflection: false, hasMood: false, hasEntry: false };
      data[date].hasReflection = true;
      data[date].grade = r.grade;
      data[date].count++;
    });

    moodCheckins.forEach((m) => {
      if (!data[m.entry_date]) data[m.entry_date] = { count: 0, hasReflection: false, hasMood: false, hasEntry: false };
      data[m.entry_date].hasMood = true;
      data[m.entry_date].count++;
    });

    if (entries) {
      Object.keys(entries).forEach((date) => {
        if (!data[date]) data[date] = { count: 0, hasReflection: false, hasMood: false, hasEntry: false };
        data[date].hasEntry = true;
        data[date].count++;
      });
    }

    return data;
  }, [reflections, moodCheckins, entries]);

  const getIntensity = (dateStr: string): number => {
    const d = dayData[dateStr];
    if (!d) return 0;
    if (d.hasReflection && d.grade === 'S') return 4;
    if (d.hasReflection && d.grade === 'A_plus') return 3.5;
    if (d.hasReflection && d.grade === 'A') return 3;
    if (d.hasReflection) return 2;
    if (d.hasMood && d.hasEntry) return 2;
    if (d.hasMood || d.hasEntry) return 1;
    return 0;
  };

  const getColor = (intensity: number): string => {
    if (intensity === 0) return theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(13,148,136,0.08)';
    const base = theme.palette.primary.main;
    const alphas = [0, 0.15, 0.3, 0.55, 0.85];
    return base + Math.round(alphas[intensity] * 255).toString(16).padStart(2, '0');
  };

  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  const weeks = useMemo(() => {
    const result: Date[][] = [];
    const end = new Date(today);
    end.setDate(end.getDate() + 1);
    const start = new Date(end);
    start.setDate(start.getDate() - months * 30);
    start.setDate(start.getDate() - start.getDay());

    let current = new Date(start);
    while (current <= end) {
      const week: Date[] = [];
      for (let i = 0; i < 7; i++) {
        week.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
      result.push(week);
    }
    return result;
  }, [today, months]);

  const monthLabels = useMemo(() => {
    const labels: { month: string; weekIndex: number }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, i) => {
      const month = week[0].getMonth();
      if (month !== lastMonth) {
        labels.push({ month: week[0].toLocaleString('default', { month: 'short' }), weekIndex: i });
        lastMonth = month;
      }
    });
    return labels;
  }, [weeks]);

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
        Activity Calendar
      </Typography>

      <Box sx={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 32 }}>
          {dayLabels.map((d) => (
            <Typography key={d} variant="caption" sx={{ textAlign: 'right', pr: 1, color: 'text.secondary', fontSize: '0.6rem', fontWeight: 600 }}>
              {d}
            </Typography>
          ))}
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {monthLabels.map(({ month, weekIndex }) => (
            <Typography key={month} variant="caption" sx={{ position: 'absolute', left: -40, top: weekIndex * 16 + 8, color: 'text.secondary', fontSize: '0.65rem', fontWeight: 500 }}>
              {month}
            </Typography>
          ))}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, position: 'relative' }}>
            {weeks.map((week, w) => (
              <Box key={w} sx={{ display: 'flex', flexDirection: 'row', gap: 2 }}>
                {week.map((day) => {
                  const dateStr = formatDate(day);
                  const intensity = getIntensity(dateStr);
                  const isFuture = day > today;
                  const data = dayData[dateStr];
                  const tooltipContent = data
                    ? `Reflection: ${data.hasReflection ? '✓' : '✗'} ${data.grade ? `(${data.grade})` : ''}\nMood: ${data.hasMood ? '✓' : '✗'}\nEntry: ${data.hasEntry ? '✓' : '✗'}`
                    : 'No activity';

                  return (
                    <Tooltip key={dateStr} title={tooltipContent} placement="top" disableHoverListener={isFuture}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: 2,
                          bgcolor: isFuture ? 'transparent' : getColor(intensity),
                          border: isFuture ? '1px dashed' : 'none',
                          borderColor: 'divider',
                          cursor: isFuture ? 'default' : 'pointer',
                          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                          '&:hover': isFuture ? {} : { transform: 'scale(1.3)', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', zIndex: 10 },
                        }}
                      />
                    </Tooltip>
                  );
                })}
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 12, height: 12, borderRadius: 2, bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(13,148,136,0.08)', border: '1px solid', borderColor: 'divider' }} />
          <Typography variant="caption" color="text.secondary">None</Typography>
        </Box>
        {[1, 2, 3, 4].map((i) => (
          <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: 2, bgcolor: theme.palette.primary.main + Math.round([0.15, 0.3, 0.55, 0.85][i - 1] * 255).toString(16).padStart(2, '0') }} />
            <Typography variant="caption" color="text.secondary">{i === 4 ? 'S-tier' : i === 3 ? 'A-tier' : i === 2 ? 'Activity' : 'Light'}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}