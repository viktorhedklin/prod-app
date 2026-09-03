import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';

export type AiCoreState = 'idle' | 'listening' | 'thinking' | 'speaking';

export interface AiCoreProps {
  state?: AiCoreState;
  size?: number;
  label?: string;
}

const STATE_CONFIG: Record<
  AiCoreState,
  {
    outerDuration: string;
    innerDuration: string;
    pulseDuration: string;
    glowOpacity: number;
    colorMain: string;
    colorSecondary: string;
    waveHeights: number[];
  }
> = {
  idle: {
    outerDuration: '18s',
    innerDuration: '12s',
    pulseDuration: '3.5s',
    glowOpacity: 0.6,
    colorMain: '#14B8A6',
    colorSecondary: '#06B6D4',
    waveHeights: [8, 14, 10, 18, 12, 16, 8],
  },
  listening: {
    outerDuration: '8s',
    innerDuration: '5s',
    pulseDuration: '1.8s',
    glowOpacity: 0.85,
    colorMain: '#22D3EE',
    colorSecondary: '#14B8A6',
    waveHeights: [14, 26, 20, 32, 22, 28, 16],
  },
  thinking: {
    outerDuration: '3s',
    innerDuration: '2s',
    pulseDuration: '0.8s',
    glowOpacity: 0.95,
    colorMain: '#2DD4BF',
    colorSecondary: '#06B6D4',
    waveHeights: [20, 12, 28, 16, 30, 14, 24],
  },
  speaking: {
    outerDuration: '5s',
    innerDuration: '3.5s',
    pulseDuration: '1.2s',
    glowOpacity: 1.0,
    colorMain: '#38BDF8',
    colorSecondary: '#14B8A6',
    waveHeights: [16, 32, 22, 36, 24, 30, 18],
  },
};

export const AiCore: React.FC<AiCoreProps> = ({
  state = 'idle',
  size = 220,
  label,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const config = STATE_CONFIG[state] || STATE_CONFIG.idle;

  const svgSize = Math.max(120, size);
  const waveBarCount = 7;

  return (
    <Stack
      alignItems="center"
      justifyContent="center"
      spacing={1.5}
      sx={{
        position: 'relative',
        display: 'inline-flex',
        userSelect: 'none',
      }}
    >
      {/* Central Rotating Arc Reactor SVG Core */}
      <Box
        sx={{
          position: 'relative',
          width: svgSize,
          height: svgSize,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          width={svgSize}
          height={svgSize}
          viewBox="0 0 200 200"
          style={{ overflow: 'visible' }}
        >
          <defs>
            <radialGradient id="jarvisCoreGlowGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={config.colorMain} stopOpacity="1" />
              <stop offset="50%" stopColor={config.colorSecondary} stopOpacity="0.6" />
              <stop offset="100%" stopColor={config.colorMain} stopOpacity="0" />
            </radialGradient>

            <linearGradient id="jarvisRingGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={config.colorMain} />
              <stop offset="100%" stopColor={config.colorSecondary} />
            </linearGradient>

            <filter id="jarvisCoreFilter" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation={isDark ? '4' : '2'} result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Outer Dashed Rotating Ring (Clockwise) */}
          <g
            style={{
              transformOrigin: '100px 100px',
              animation: `jarvisRotateCW ${config.outerDuration} linear infinite`,
            }}
          >
            <circle
              cx="100"
              cy="100"
              r="88"
              fill="none"
              stroke="url(#jarvisRingGrad1)"
              strokeWidth="2"
              strokeDasharray="12 8 4 8"
              strokeOpacity={isDark ? config.glowOpacity : 0.75}
            />
            {/* Tick Marks on outer ring */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
              <line
                key={deg}
                x1="100"
                y1="8"
                x2="100"
                y2="14"
                stroke={config.colorMain}
                strokeWidth="2"
                transform={`rotate(${deg} 100 100)`}
                strokeOpacity="0.8"
              />
            ))}
          </g>

          {/* Inner Counter-Rotating Ring (Counter-Clockwise) */}
          <g
            style={{
              transformOrigin: '100px 100px',
              animation: `jarvisRotateCCW ${config.innerDuration} linear infinite`,
            }}
          >
            <circle
              cx="100"
              cy="100"
              r="68"
              fill="none"
              stroke={config.colorSecondary}
              strokeWidth="1.5"
              strokeDasharray="24 16"
              strokeOpacity={isDark ? config.glowOpacity * 0.9 : 0.65}
            />
            {/* Corner Bracket Accents on inner ring */}
            {[30, 120, 210, 300].map((deg) => (
              <rect
                key={deg}
                x="97"
                y="30"
                width="6"
                height="3"
                fill={config.colorMain}
                transform={`rotate(${deg} 100 100)`}
              />
            ))}
          </g>

          {/* Radar Sweep Line */}
          <g
            style={{
              transformOrigin: '100px 100px',
              animation: `jarvisRotateCW ${config.outerDuration} linear infinite`,
            }}
          >
            <line
              x1="100"
              y1="100"
              x2="100"
              y2="16"
              stroke={config.colorMain}
              strokeWidth="1.5"
              strokeOpacity="0.4"
              strokeDasharray="4 2"
            />
          </g>

          {/* Core Pulsing Arc Reactor Orb */}
          <circle
            cx="100"
            cy="100"
            r="44"
            fill="url(#jarvisCoreGlowGrad)"
            filter="url(#jarvisCoreFilter)"
            style={{
              transformOrigin: '100px 100px',
              animation: `jarvisPulseCore ${config.pulseDuration} ease-in-out infinite alternate`,
            }}
          />

          {/* Central Reactor Nodes */}
          <circle
            cx="100"
            cy="100"
            r="26"
            fill="none"
            stroke={config.colorMain}
            strokeWidth="2"
            strokeOpacity="0.9"
          />
          <circle
            cx="100"
            cy="100"
            r="12"
            fill={config.colorMain}
            style={{
              transformOrigin: '100px 100px',
              animation: `jarvisPulseCore ${config.pulseDuration} ease-in-out infinite alternate`,
            }}
          />
          <circle cx="100" cy="100" r="4" fill="#FFFFFF" />
        </svg>

        {/* Global Keyframes definitions scoped inline via style tag */}
        <style>
          {`
            @keyframes jarvisRotateCW {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            @keyframes jarvisRotateCCW {
              0% { transform: rotate(360deg); }
              100% { transform: rotate(0deg); }
            }
            @keyframes jarvisPulseCore {
              0% { transform: scale(0.92); opacity: 0.8; }
              100% { transform: scale(1.08); opacity: 1; }
            }
            @keyframes jarvisWaveBar {
              0%, 100% { transform: scaleY(0.4); }
              50% { transform: scaleY(1.15); }
            }
          `}
        </style>
      </Box>

      {/* Waveform / Equalizer Bar Cluster */}
      <Stack
        direction="row"
        spacing={0.6}
        alignItems="flex-end"
        justifyContent="center"
        sx={{
          height: 28,
          px: 1,
          py: 0.2,
        }}
      >
        {Array.from({ length: waveBarCount }).map((_, i) => {
          const baseHeight = config.waveHeights[i % config.waveHeights.length];
          const animDelay = `${(i * 120) % 600}ms`;
          const barDuration = state === 'thinking' ? '0.5s' : state === 'speaking' ? '0.7s' : '1.4s';

          return (
            <Box
              key={i}
              sx={{
                width: 4,
                height: baseHeight,
                maxHeight: 28,
                borderRadius: 2,
                bgcolor: config.colorMain,
                backgroundImage: `linear-gradient(to top, ${config.colorMain}, ${config.colorSecondary})`,
                boxShadow: isDark ? `0 0 6px ${config.colorMain}` : 'none',
                transformOrigin: 'bottom',
                animation: `jarvisWaveBar ${barDuration} ease-in-out ${animDelay} infinite alternate`,
              }}
            />
          );
        })}
      </Stack>

      {/* Monospace Uppercase Label */}
      {label && (
        <Typography
          sx={{
            fontFamily: 'monospace',
            fontWeight: 800,
            fontSize: '0.72rem',
            letterSpacing: '0.12em',
            color: isDark ? config.colorMain : theme.palette.text.primary,
            textShadow: isDark ? `0 0 10px ${config.colorMain}` : 'none',
            textTransform: 'uppercase',
            textAlign: 'center',
          }}
        >
          {label}
        </Typography>
      )}
    </Stack>
  );
};

export default AiCore;
