import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';

export interface StatusReadoutProps {
  label: string;
  value: string;
  delta?: number | null;
}

export const StatusReadout: React.FC<StatusReadoutProps> = ({
  label,
  value,
  delta,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const renderDelta = () => {
    if (delta === null || delta === undefined || delta === 0) return null;

    const isPositive = delta > 0;
    const color = isPositive ? '#14B8A6' : '#F87171';
    const glowColor = isPositive ? 'rgba(20, 184, 166, 0.4)' : 'rgba(248, 113, 113, 0.4)';
    const arrow = isPositive ? '▲' : '▼';
    const formattedVal = Math.abs(delta).toFixed(1);

    return (
      <Typography
        component="span"
        sx={{
          fontFamily: 'monospace',
          fontSize: '0.72rem',
          fontWeight: 700,
          color,
          ml: 1,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.3,
          px: 0.6,
          py: 0.2,
          borderRadius: 1,
          bgcolor: isPositive ? 'rgba(20, 184, 166, 0.1)' : 'rgba(248, 113, 113, 0.1)',
          border: `1px solid ${isPositive ? 'rgba(20, 184, 166, 0.25)' : 'rgba(248, 113, 113, 0.25)'}`,
          boxShadow: isDark ? `0 0 8px ${glowColor}` : 'none',
          textShadow: isDark ? `0 0 6px ${glowColor}` : 'none',
        }}
      >
        <span>{arrow}</span>
        <span>{isPositive ? `+${formattedVal}` : `-${formattedVal}`}</span>
      </Typography>
    );
  };

  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 2,
        bgcolor: isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(248, 250, 252, 0.9)',
        border: '1px solid',
        borderColor: isDark ? 'rgba(148, 163, 184, 0.14)' : 'rgba(226, 232, 240, 0.9)',
        backdropFilter: 'blur(6px)',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.25s ease',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          width: '3px',
          height: '100%',
          bgcolor: isDark ? '#14B8A6' : '#0F766E',
          opacity: 0.6,
        },
        '&:hover': {
          borderColor: 'rgba(20, 184, 166, 0.4)',
          boxShadow: isDark ? '0 0 16px rgba(20, 184, 166, 0.15)' : '0 2px 8px rgba(0, 0, 0, 0.05)',
          transform: 'translateY(-1px)',
        },
      }}
    >
      <Typography
        variant="caption"
        sx={{
          color: 'text.secondary',
          fontWeight: 700,
          fontSize: '0.66rem',
          letterSpacing: '0.09em',
          textTransform: 'uppercase',
          fontFamily: 'monospace',
          display: 'block',
          mb: 0.5,
          pl: 0.5,
        }}
      >
        {label}
      </Typography>

      <Stack direction="row" alignItems="baseline" justifyContent="space-between" sx={{ pl: 0.5 }}>
        <Typography
          sx={{
            fontFamily: 'monospace',
            fontSize: '1.2rem',
            fontWeight: 800,
            color: 'text.primary',
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
            textShadow: isDark ? '0 0 8px rgba(255, 255, 255, 0.15)' : 'none',
          }}
        >
          {value}
        </Typography>

        {renderDelta()}
      </Stack>
    </Box>
  );
};

export default StatusReadout;
