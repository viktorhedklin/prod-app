import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import { useTheme } from '@mui/material/styles';

export interface LiveIntelligenceFeedItem {
  id: string;
  text: string;
  tone?: 'info' | 'warning' | 'critical';
  timestamp?: string;
}

export interface LiveIntelligenceFeedProps {
  items: LiveIntelligenceFeedItem[];
  maxVisible?: number;
  emptyLabel?: string;
}

const TONE_CONFIG = {
  info: {
    color: '#06B6D4',
    bg: 'rgba(6, 182, 212, 0.1)',
    border: 'rgba(6, 182, 212, 0.3)',
    tag: 'INFO',
  },
  warning: {
    color: '#FBBF24',
    bg: 'rgba(251, 191, 36, 0.1)',
    border: 'rgba(251, 191, 36, 0.3)',
    tag: 'WARN',
  },
  critical: {
    color: '#F87171',
    bg: 'rgba(248, 113, 113, 0.12)',
    border: 'rgba(248, 113, 113, 0.35)',
    tag: 'CRIT',
  },
};

export const LiveIntelligenceFeed: React.FC<LiveIntelligenceFeedProps> = ({
  items,
  maxVisible = 5,
  emptyLabel = 'NO ACTIVE INTEL ALERTS',
}) => {
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
        boxShadow: isDark ? '0 0 20px rgba(6, 182, 212, 0.05)' : '0 2px 10px rgba(0, 0, 0, 0.04)',
      }}
    >
      {/* HUD Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: '#06B6D4',
              boxShadow: '0 0 8px #06B6D4',
              animation: 'intelPulse 2s infinite ease-in-out',
              '@keyframes intelPulse': {
                '0%, 100%': { opacity: 1, transform: 'scale(1)' },
                '50%': { opacity: 0.4, transform: 'scale(0.8)' },
              },
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
            LIVE INTELLIGENCE FEED
          </Typography>
        </Stack>

        <Typography
          sx={{
            fontFamily: 'monospace',
            fontSize: '0.65rem',
            fontWeight: 700,
            color: 'text.secondary',
            letterSpacing: '0.05em',
          }}
        >
          {items.length} EVENT{items.length !== 1 ? 'S' : ''}
        </Typography>
      </Stack>

      {/* Feed Items Container */}
      <Stack
        spacing={1}
        sx={{
          maxHeight: maxVisible ? `${maxVisible * 54}px` : 'none',
          overflowY: 'auto',
          pr: 0.5,
          '&::-webkit-scrollbar': {
            width: '4px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: isDark ? 'rgba(20, 184, 166, 0.3)' : 'rgba(0, 0, 0, 0.15)',
            borderRadius: '2px',
          },
        }}
      >
        {items.length === 0 ? (
          <Box
            sx={{
              p: 2,
              textAlign: 'center',
              borderRadius: 1.5,
              bgcolor: isDark ? 'rgba(2, 6, 23, 0.4)' : 'rgba(241, 245, 249, 0.6)',
              border: '1px dashed',
              borderColor: isDark ? 'rgba(148, 163, 184, 0.15)' : 'rgba(203, 213, 225, 0.8)',
            }}
          >
            <Typography
              sx={{
                fontFamily: 'monospace',
                fontSize: '0.72rem',
                color: 'text.secondary',
                letterSpacing: '0.06em',
              }}
            >
              {emptyLabel}
            </Typography>
          </Box>
        ) : (
          items.map((item, index) => {
            const toneConfig = TONE_CONFIG[item.tone || 'info'];
            return (
              <Box
                key={item.id}
                sx={{
                  p: 1.2,
                  borderRadius: 1.5,
                  bgcolor: isDark ? toneConfig.bg : 'rgba(248, 250, 252, 0.9)',
                  border: '1px solid',
                  borderColor: isDark ? toneConfig.border : 'rgba(226, 232, 240, 0.9)',
                  transition: 'all 0.2s ease',
                  animation: 'fadeInUp 0.35s ease-out forwards',
                  animationDelay: `${index * 0.05}s`,
                  '&:hover': {
                    borderColor: toneConfig.color,
                    boxShadow: isDark ? `0 0 12px ${toneConfig.color}25` : '0 2px 6px rgba(0,0,0,0.05)',
                  },
                }}
              >
                <Stack direction="row" alignItems="flex-start" spacing={1}>
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      bgcolor: toneConfig.color,
                      boxShadow: `0 0 6px ${toneConfig.color}`,
                      mt: 0.8,
                      flexShrink: 0,
                    }}
                  />
                  <Chip
                    label={toneConfig.tag}
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: '0.62rem',
                      fontFamily: 'monospace',
                      fontWeight: 800,
                      color: toneConfig.color,
                      bgcolor: 'transparent',
                      border: `1px solid ${toneConfig.border}`,
                      '& .MuiChip-label': { px: 0.8 },
                      flexShrink: 0,
                    }}
                  />
                  <Typography
                    sx={{
                      fontFamily: 'monospace',
                      fontSize: '0.78rem',
                      color: 'text.primary',
                      flexGrow: 1,
                      lineHeight: 1.4,
                      wordBreak: 'break-word',
                    }}
                  >
                    {item.text}
                  </Typography>
                  {item.timestamp && (
                    <Typography
                      sx={{
                        fontFamily: 'monospace',
                        fontSize: '0.65rem',
                        color: 'text.secondary',
                        flexShrink: 0,
                        ml: 1,
                      }}
                    >
                      {item.timestamp}
                    </Typography>
                  )}
                </Stack>
              </Box>
            );
          })
        )}
      </Stack>
    </Box>
  );
};

export default LiveIntelligenceFeed;
