import React, { useEffect, useState, useRef, useId } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { BRAND } from '../../theme';

export interface HudGaugeProps {
  score: number; // 0-100
  label?: string;
  tier?: string;
  size?: number;
  color?: string;
  showTicks?: boolean;
}

export const HudGauge: React.FC<HudGaugeProps> = ({
  score,
  label = 'SCORE',
  tier,
  size = 120,
  color,
  showTicks = true,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const rawId = useId();
  const uniqueId = rawId.replace(/:/g, '');

  // Clamp score strictly between 0 and 100
  const clampedScore = Math.min(100, Math.max(0, isNaN(score) ? 0 : score));

  // Count-up animation state
  const [displayScore, setDisplayScore] = useState(0);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const duration = 800; // ms
    const initialVal = displayScore;
    const targetVal = clampedScore;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Ease out cubic
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const current = initialVal + (targetVal - initialVal) * easedProgress;
      setDisplayScore(current);

      if (progress < 1) {
        animRef.current = requestAnimationFrame(step);
      }
    };

    animRef.current = requestAnimationFrame(step);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [clampedScore]);

  // Determine primary tone color based on tier or score if custom color isn't provided
  const getGaugeColor = () => {
    if (color) return color;
    if (tier) {
      const upper = tier.toUpperCase();
      if (['S', 'A+', 'A_PLUS', 'A'].includes(upper)) return BRAND.main;
      if (['B'].includes(upper)) return '#F59E0B'; // amber
      if (['C', 'PIP'].includes(upper)) return '#EF4444'; // red
    }
    if (clampedScore >= 75) return BRAND.main;
    if (clampedScore >= 50) return '#F59E0B';
    return '#EF4444';
  };

  const gaugeColor = getGaugeColor();
  const secondaryColor = gaugeColor === BRAND.main ? '#06B6D4' : gaugeColor;

  // SVG Geometry
  const viewBoxSize = 120;
  const center = viewBoxSize / 2;
  const radius = 39;
  const strokeWidth = 6;
  const circumference = 2 * Math.PI * radius;
  const arcSweepDeg = 270;
  const arcLength = circumference * (arcSweepDeg / 360);
  const strokeDashoffset = arcLength * (1 - clampedScore / 100);

  // Tick marks geometry
  const tickCount = 25;
  const tickInnerR = radius + 6;
  const tickOuterR = radius + 10;
  const ticks = [];

  for (let i = 0; i < tickCount; i++) {
    const fraction = i / (tickCount - 1);
    const angleDeg = 135 + fraction * arcSweepDeg;
    const angleRad = (angleDeg * Math.PI) / 180;
    const isTickActive = fraction <= displayScore / 100;

    const x1 = center + tickInnerR * Math.cos(angleRad);
    const y1 = center + tickInnerR * Math.sin(angleRad);
    const x2 = center + tickOuterR * Math.cos(angleRad);
    const y2 = center + tickOuterR * Math.sin(angleRad);

    ticks.push(
      <line
        key={i}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={
          isTickActive
            ? gaugeColor
            : isDark
            ? 'rgba(148, 163, 184, 0.25)'
            : 'rgba(0, 0, 0, 0.15)'
        }
        strokeWidth={i % 3 === 0 ? 1.8 : 1}
        opacity={isTickActive ? 0.9 : 0.4}
      />
    );
  }

  // Filter & glow style
  const glowFilterStyle = isDark
    ? `drop-shadow(0px 0px 8px ${gaugeColor})`
    : `drop-shadow(0px 0px 4px ${gaugeColor}88)`;

  return (
    <Box
      sx={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        width: size,
      }}
    >
      <Box
        sx={{
          position: 'relative',
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
          style={{ overflow: 'visible' }}
        >
          <defs>
            <linearGradient id={`hudGrad-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={gaugeColor} />
              <stop offset="100%" stopColor={secondaryColor} />
            </linearGradient>
          </defs>

          {/* Background Arc Track (270deg sweep) */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={isDark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(0, 0, 0, 0.08)'}
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
            transform={`rotate(135 ${center} ${center})`}
          />

          {/* Active Glowing Arc Track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={`url(#hudGrad-${uniqueId})`}
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(135 ${center} ${center})`}
            style={{
              filter: glowFilterStyle,
              transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />

          {/* Radial Tick Marks */}
          {showTicks && <g>{ticks}</g>}

          {/* Inner Decorative Sci-Fi Ring */}
          <circle
            cx={center}
            cy={center}
            r={radius - strokeWidth - 4}
            fill="none"
            stroke={isDark ? 'rgba(20, 184, 166, 0.18)' : 'rgba(20, 184, 166, 0.12)'}
            strokeWidth={1}
            strokeDasharray="2 4"
          />
        </svg>

        {/* Center Text Readout */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            pt: 0.5,
          }}
        >
          <Typography
            sx={{
              fontFamily: 'monospace',
              fontWeight: 800,
              fontSize: size > 100 ? '1.45rem' : '1.15rem',
              color: gaugeColor,
              lineHeight: 1,
              letterSpacing: '-0.02em',
              textShadow: isDark ? `0 0 10px ${gaugeColor}80` : `0 0 4px ${gaugeColor}40`,
            }}
          >
            {Math.round(displayScore)}
          </Typography>
          {tier && (
            <Typography
              sx={{
                fontSize: size > 100 ? '0.68rem' : '0.6rem',
                fontWeight: 700,
                color: secondaryColor,
                letterSpacing: '0.06em',
                mt: 0.2,
                textTransform: 'uppercase',
                fontFamily: 'monospace',
              }}
            >
              TIER {tier}
            </Typography>
          )}
        </Box>
      </Box>

      {label && (
        <Typography
          variant="caption"
          sx={{
            mt: -0.5,
            fontSize: '0.65rem',
            fontWeight: 700,
            color: 'text.secondary',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontFamily: 'monospace',
            textAlign: 'center',
          }}
        >
          {label}
        </Typography>
      )}
    </Box>
  );
};

export default HudGauge;
