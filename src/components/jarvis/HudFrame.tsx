import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import type { SxProps, Theme } from '@mui/material/styles';

export interface HudFrameProps {
  children: React.ReactNode;
  label?: string;
  statusDot?: 'ok' | 'warn' | 'danger';
  sx?: SxProps<Theme>;
}

const DOT_COLORS: Record<'ok' | 'warn' | 'danger', string> = {
  ok: '#10B981',
  warn: '#F59E0B',
  danger: '#EF4444',
};

export const HudFrame: React.FC<HudFrameProps> = ({
  children,
  label,
  statusDot,
  sx,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const borderColor = isDark ? 'rgba(20, 184, 166, 0.35)' : 'rgba(20, 184, 166, 0.45)';
  const glowColor = isDark ? '0 0 12px rgba(20, 184, 166, 0.15)' : 'none';
  const cornerColor = '#14B8A6';

  const hasHeader = Boolean(label || statusDot);

  return (
    <Box
      sx={{
        position: 'relative',
        borderRadius: 2,
        border: '1px solid',
        borderColor,
        boxShadow: glowColor,
        bgcolor: isDark ? 'rgba(15, 23, 42, 0.6)' : 'transparent',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
        '&:hover': {
          borderColor: 'rgba(20, 184, 166, 0.6)',
          boxShadow: isDark ? '0 0 16px rgba(20, 184, 166, 0.25)' : 'none',
        },
        ...sx,
      }}
    >
      {/* Sci-Fi Cut Corner Brackets (L-shaped accents in 4 corners) */}
      <Box
        sx={{
          position: 'absolute',
          top: -2,
          left: -2,
          width: 10,
          height: 10,
          borderTop: `2px solid ${cornerColor}`,
          borderLeft: `2px solid ${cornerColor}`,
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          top: -2,
          right: -2,
          width: 10,
          height: 10,
          borderTop: `2px solid ${cornerColor}`,
          borderRight: `2px solid ${cornerColor}`,
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: -2,
          left: -2,
          width: 10,
          height: 10,
          borderBottom: `2px solid ${cornerColor}`,
          borderLeft: `2px solid ${cornerColor}`,
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: -2,
          right: -2,
          width: 10,
          height: 10,
          borderBottom: `2px solid ${cornerColor}`,
          borderRight: `2px solid ${cornerColor}`,
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />

      {/* Optional Top Header Bar */}
      {hasHeader && (
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{
            px: 1.5,
            pt: 1,
            pb: 0.5,
            borderBottom: '1px solid',
            borderColor: isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(226, 232, 240, 0.8)',
          }}
        >
          {label ? (
            <Typography
              variant="caption"
              sx={{
                fontFamily: 'monospace',
                fontSize: '0.68rem',
                fontWeight: 800,
                color: '#14B8A6',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                lineHeight: 1,
              }}
            >
              {label}
            </Typography>
          ) : (
            <Box />
          )}

          {statusDot && (
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: DOT_COLORS[statusDot],
                boxShadow: `0 0 8px ${DOT_COLORS[statusDot]}`,
                animation: 'jarvisHudDotPulse 1.8s infinite ease-in-out',
                '@keyframes jarvisHudDotPulse': {
                  '0%, 100%': { opacity: 1, transform: 'scale(1)' },
                  '50%': { opacity: 0.4, transform: 'scale(0.8)' },
                },
              }}
            />
          )}
        </Stack>
      )}

      {/* Children content area */}
      <Box sx={{ width: '100%' }}>{children}</Box>
    </Box>
  );
};

export default HudFrame;
