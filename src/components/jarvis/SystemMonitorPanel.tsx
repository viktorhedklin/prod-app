import React, { useEffect, useState, useRef, useId } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import { BRAND } from '../../theme';

export interface SystemMetric {
  label: string;
  value: number;
  max?: number;
  tone?: 'ok' | 'warn' | 'danger';
}

export interface SystemMonitorPanelProps {
  metrics: SystemMetric[];
}

const TONE_COLORS = {
  ok: '#14B8A6',
  warn: '#F59E0B',
  danger: '#EF4444',
};

// Single Animated Mini Gauge Component
const MiniRadialGauge: React.FC<{ metric: SystemMetric; index: number }> = ({ metric }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const rawId = useId();
  const uniqueId = rawId.replace(/:/g, '');

  const maxVal = metric.max && metric.max > 0 ? metric.max : 100;
  const clampedVal = Math.min(maxVal, Math.max(0, isNaN(metric.value) ? 0 : metric.value));
  const pct = (clampedVal / maxVal) * 100;

  // Determine tone
  const tone = metric.tone || (pct >= 75 ? 'ok' : pct >= 40 ? 'warn' : 'danger');
  const mainColor = TONE_COLORS[tone] || BRAND.main;

  // Animated display count
  const [dispVal, setDispVal] = useState(0);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const duration = 750;
    const startVal = dispVal;
    const endVal = clampedVal;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDispVal(startVal + (endVal - startVal) * eased);

      if (progress < 1) {
        animRef.current = requestAnimationFrame(step);
      }
    };

    animRef.current = requestAnimationFrame(step);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [clampedVal]);

  // SVG parameters
  const size = 90;
  const viewBoxSize = 100;
  const center = viewBoxSize / 2;
  const radius = 35;
  const strokeWidth = 5;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - pct / 100);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 1.5,
        borderRadius: 2,
        bgcolor: isDark ? 'rgba(2, 6, 23, 0.5)' : 'rgba(248, 250, 252, 0.8)',
        border: '1px solid',
        borderColor: isDark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(226, 232, 240, 0.8)',
        transition: 'all 0.2s ease',
        '&:hover': {
          borderColor: mainColor,
          boxShadow: isDark ? `0 0 12px ${mainColor}20` : '0 2px 8px rgba(0,0,0,0.05)',
        },
      }}
    >
      <Box sx={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}>
          <defs>
            <linearGradient id={`miniGrad-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={mainColor} />
              <stop offset="100%" stopColor={tone === 'ok' ? '#06B6D4' : mainColor} />
            </linearGradient>
          </defs>

          {/* Track Circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={isDark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(0,0,0,0.08)'}
            strokeWidth={strokeWidth}
          />

          {/* Progress Arc */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={`url(#miniGrad-${uniqueId})`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${center} ${center})`}
            style={{
              transition: 'stroke-dashoffset 0.75s ease-out',
              filter: isDark ? `drop-shadow(0px 0px 5px ${mainColor}88)` : 'none',
            }}
          />

          {/* Inner Accent Ring */}
          <circle
            cx={center}
            cy={center}
            r={radius - 8}
            fill="none"
            stroke={isDark ? 'rgba(20, 184, 166, 0.15)' : 'rgba(0,0,0,0.05)'}
            strokeWidth={1}
            strokeDasharray="2 3"
          />
        </svg>

        {/* Center Value */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography
            sx={{
              fontFamily: 'monospace',
              fontSize: '1.05rem',
              fontWeight: 800,
              color: mainColor,
              lineHeight: 1,
              textShadow: isDark ? `0 0 6px ${mainColor}66` : 'none',
            }}
          >
            {Math.round(dispVal)}
          </Typography>
          {metric.max && (
            <Typography
              sx={{
                fontFamily: 'monospace',
                fontSize: '0.58rem',
                color: 'text.secondary',
                mt: 0.2,
              }}
            >
              /{metric.max}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Metric Label */}
      <Typography
        sx={{
          fontFamily: 'monospace',
          fontSize: '0.65rem',
          fontWeight: 700,
          color: 'text.secondary',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          textAlign: 'center',
          mt: 0.8,
        }}
      >
        {metric.label}
      </Typography>
    </Box>
  );
};

export const SystemMonitorPanel: React.FC<SystemMonitorPanelProps> = ({ metrics }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box
      sx={{
        borderRadius: 2.5,
        bgcolor: isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.95)',
        border: '1px solid',
        borderColor: isDark ? 'rgba(148, 163, 184, 0.15)' : 'rgba(226, 232, 240, 0.9)',
        p: 2,
        backdropFilter: 'blur(8px)',
        boxShadow: isDark ? '0 0 20px rgba(20, 184, 166, 0.05)' : '0 2px 10px rgba(0,0,0,0.04)',
      }}
    >
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: '#14B8A6',
            boxShadow: '0 0 8px #14B8A6',
          }}
        />
        <Typography
          sx={{
            fontFamily: 'monospace',
            fontSize: '0.75rem',
            fontWeight: 800,
            letterSpacing: '0.1em',
            color: isDark ? '#2DD4BF' : '#0F766E',
            textTransform: 'uppercase',
          }}
        >
          SYSTEM PERFORMANCE MONITOR
        </Typography>
      </Stack>

      {/* Mini Gauges Row / Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, 1fr)',
            sm: `repeat(${Math.min(metrics.length, 4)}, 1fr)`,
          },
          gap: 1.5,
        }}
      >
        {metrics.map((metric, idx) => (
          <MiniRadialGauge key={`${metric.label}-${idx}`} metric={metric} index={idx} />
        ))}
      </Box>
    </Box>
  );
};

export default SystemMonitorPanel;
