import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';

export interface ProviderStatus {
  name: string;
  connected: boolean;
}

export interface ProviderStatusGridProps {
  providers: ProviderStatus[];
}

export const ProviderStatusGrid: React.FC<ProviderStatusGridProps> = ({ providers }) => {
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
        boxShadow: isDark ? '0 0 20px rgba(6, 182, 212, 0.05)' : '0 2px 10px rgba(0, 0, 0, 0.04)',
      }}
    >
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: '#06B6D4',
            boxShadow: '0 0 8px #06B6D4',
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
          AI PROVIDER MATRIX
        </Typography>
      </Stack>

      {/* Grid of Provider Chips */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, 1fr)',
            sm: 'repeat(3, 1fr)',
            md: 'repeat(auto-fill, minmax(130px, 1fr))',
          },
          gap: 1.2,
        }}
      >
        {providers.map((provider) => {
          const isConn = provider.connected;
          const statusColor = isConn ? '#14B8A6' : isDark ? '#64748B' : '#94A3B8';
          const statusBg = isConn
            ? 'rgba(20, 184, 166, 0.12)'
            : isDark
            ? 'rgba(148, 163, 184, 0.06)'
            : 'rgba(241, 245, 249, 0.8)';
          const statusBorder = isConn
            ? 'rgba(20, 184, 166, 0.35)'
            : isDark
            ? 'rgba(148, 163, 184, 0.15)'
            : 'rgba(226, 232, 240, 0.8)';

          return (
            <Box
              key={provider.name}
              sx={{
                p: 1.2,
                borderRadius: 1.8,
                bgcolor: statusBg,
                border: '1px solid',
                borderColor: statusBorder,
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                '&:hover': {
                  borderColor: statusColor,
                  boxShadow: isConn && isDark ? '0 0 12px rgba(20, 184, 166, 0.25)' : 'none',
                },
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1} sx={{ overflow: 'hidden' }}>
                {/* Status Dot */}
                <Box
                  sx={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    bgcolor: statusColor,
                    boxShadow: isConn ? `0 0 8px ${statusColor}` : 'none',
                    animation: isConn ? 'providerPulseDot 2s infinite ease-in-out' : 'none',
                    '@keyframes providerPulseDot': {
                      '0%, 100%': { opacity: 1 },
                      '50%': { opacity: 0.5 },
                    },
                    flexShrink: 0,
                  }}
                />

                <Typography
                  sx={{
                    fontFamily: 'monospace',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: isConn ? 'text.primary' : 'text.secondary',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {provider.name}
                </Typography>
              </Stack>

              <Typography
                sx={{
                  fontFamily: 'monospace',
                  fontSize: '0.58rem',
                  fontWeight: 800,
                  color: statusColor,
                  letterSpacing: '0.05em',
                  ml: 0.5,
                  flexShrink: 0,
                }}
              >
                {isConn ? 'ONLINE' : 'OFFLINE'}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default ProviderStatusGrid;
