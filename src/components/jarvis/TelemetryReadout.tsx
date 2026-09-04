import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';

export interface TelemetryReadoutProps {
  label: string;
  value: string;
  delta?: number | null;
}

/**
 * Ambient HUD readout — plain text floating over the reactor scene, NOT a
 * boxed card. This is the anti-clutter version of StatusReadout: the exact
 * same data, with zero chrome (no border/bg/padding), designed to sit
 * directly on the AI Core's scrimmed floor as part of one unified panel
 * instead of a separate stacked "telemetry" box.
 */
export const TelemetryReadout: React.FC<TelemetryReadoutProps> = ({ label, value, delta }) => {
  const renderDelta = () => {
    if (delta === null || delta === undefined || delta === 0) return null;
    const isPositive = delta > 0;
    const color = isPositive ? '#2DD4BF' : '#F87171';
    const arrow = isPositive ? '▲' : '▼';
    return (
      <Typography
        component="span"
        sx={{
          fontFamily: 'monospace',
          fontSize: '0.62rem',
          fontWeight: 700,
          color,
          textShadow: `0 0 6px ${color}99`,
          ml: 0.5,
        }}
      >
        {arrow}{Math.abs(delta).toFixed(1)}
      </Typography>
    );
  };

  return (
    <Stack alignItems="center" spacing={0.25} sx={{ minWidth: { xs: 52, sm: 64 } }}>
      <Typography
        sx={{
          fontFamily: 'monospace',
          fontSize: { xs: '0.95rem', sm: '1.15rem' },
          fontWeight: 800,
          color: '#E2E8F0',
          letterSpacing: '-0.01em',
          lineHeight: 1,
          textShadow: '0 0 10px rgba(148, 163, 184, 0.35)',
        }}
      >
        {value}
        {renderDelta()}
      </Typography>
      <Box
        component="span"
        sx={{
          fontFamily: 'monospace',
          fontSize: { xs: '0.56rem', sm: '0.62rem' },
          fontWeight: 700,
          letterSpacing: '0.14em',
          color: 'rgba(148, 163, 184, 0.75)',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Box>
    </Stack>
  );
};

export default TelemetryReadout;
