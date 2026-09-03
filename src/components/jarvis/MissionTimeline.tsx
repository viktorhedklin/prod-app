import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';

export interface MissionTimelineItem {
  id: string;
  time: string;
  label: string;
  status?: 'done' | 'active' | 'upcoming';
}

export interface MissionTimelineProps {
  items: MissionTimelineItem[];
}

export const MissionTimeline: React.FC<MissionTimelineProps> = ({ items }) => {
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
        position: 'relative',
        boxShadow: isDark ? '0 0 20px rgba(20, 184, 166, 0.05)' : '0 2px 10px rgba(0, 0, 0, 0.04)',
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
          MISSION TIMELINE
        </Typography>
      </Stack>

      {/* Timeline Items */}
      <Box sx={{ position: 'relative', pl: 1 }}>
        {/* Connecting Vertical Line */}
        {items.length > 1 && (
          <Box
            sx={{
              position: 'absolute',
              left: 11,
              top: 14,
              bottom: 18,
              width: '2px',
              background: isDark
                ? 'linear-gradient(180deg, #06B6D4 0%, #14B8A6 50%, rgba(148, 163, 184, 0.2) 100%)'
                : 'linear-gradient(180deg, #0891B2 0%, #0F766E 50%, rgba(203, 213, 225, 0.8) 100%)',
            }}
          />
        )}

        <Stack spacing={2}>
          {items.map((item) => {
            const status = item.status || 'upcoming';
            const isActive = status === 'active';
            const isDone = status === 'done';

            return (
              <Stack key={item.id} direction="row" alignItems="flex-start" spacing={2} sx={{ position: 'relative' }}>
                {/* Timeline Dot Indicator */}
                <Box
                  sx={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: isDark ? '#0F172A' : '#FFFFFF',
                    border: '2px solid',
                    borderColor: isActive
                      ? '#14B8A6'
                      : isDone
                      ? '#06B6D4'
                      : isDark
                      ? 'rgba(148, 163, 184, 0.3)'
                      : 'rgba(203, 213, 225, 1)',
                    boxShadow: isActive
                      ? '0 0 12px #14B8A6'
                      : isDone
                      ? '0 0 6px rgba(6, 182, 212, 0.4)'
                      : 'none',
                    zIndex: 2,
                    flexShrink: 0,
                    mt: 0.2,
                  }}
                >
                  <Box
                    sx={{
                      width: isActive ? 8 : isDone ? 6 : 4,
                      height: isActive ? 8 : isDone ? 6 : 4,
                      borderRadius: '50%',
                      bgcolor: isActive
                        ? '#14B8A6'
                        : isDone
                        ? '#06B6D4'
                        : isDark
                        ? 'rgba(148, 163, 184, 0.4)'
                        : 'rgba(148, 163, 184, 0.6)',
                      animation: isActive ? 'timelineActivePulse 1.6s infinite ease-in-out' : 'none',
                      '@keyframes timelineActivePulse': {
                        '0%, 100%': { transform: 'scale(1)', opacity: 1 },
                        '50%': { transform: 'scale(1.3)', opacity: 0.6 },
                      },
                    }}
                  />
                </Box>

                {/* Content Box */}
                <Box
                  sx={{
                    flexGrow: 1,
                    p: 1.2,
                    borderRadius: 1.5,
                    bgcolor: isActive
                      ? isDark
                        ? 'rgba(20, 184, 166, 0.12)'
                        : 'rgba(20, 184, 166, 0.08)'
                      : isDark
                      ? 'rgba(2, 6, 23, 0.4)'
                      : 'rgba(248, 250, 252, 0.8)',
                    border: '1px solid',
                    borderColor: isActive
                      ? 'rgba(20, 184, 166, 0.4)'
                      : isDark
                      ? 'rgba(148, 163, 184, 0.12)'
                      : 'rgba(226, 232, 240, 0.8)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ mb: 0.4 }}>
                    <Typography
                      sx={{
                        fontFamily: 'monospace',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        color: isActive ? '#14B8A6' : isDone ? '#06B6D4' : 'text.secondary',
                        letterSpacing: '0.06em',
                      }}
                    >
                      {item.time}
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: 'monospace',
                        fontSize: '0.6rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        color: isActive ? '#14B8A6' : isDone ? '#06B6D4' : 'text.secondary',
                        letterSpacing: '0.08em',
                        px: 0.6,
                        py: 0.1,
                        borderRadius: 0.8,
                        bgcolor: isActive
                          ? 'rgba(20, 184, 166, 0.15)'
                          : isDone
                          ? 'rgba(6, 182, 212, 0.12)'
                          : 'transparent',
                      }}
                    >
                      {status}
                    </Typography>
                  </Stack>

                  <Typography
                    sx={{
                      fontSize: '0.82rem',
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? 'text.primary' : isDone ? 'text.secondary' : 'text.secondary',
                      textDecoration: isDone ? 'line-through' : 'none',
                      lineHeight: 1.35,
                    }}
                  >
                    {item.label}
                  </Typography>
                </Box>
              </Stack>
            );
          })}
        </Stack>
      </Box>
    </Box>
  );
};

export default MissionTimeline;
