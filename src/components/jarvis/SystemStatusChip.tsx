import React from 'react';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';

export type SystemStatusType = 'nominal' | 'attention' | 'critical';

export interface SystemStatusChipProps {
  status: SystemStatusType;
}

const STATUS_CONFIG: Record<
  SystemStatusType,
  { label: string; color: string; bgAlpha: string; borderAlpha: string }
> = {
  nominal: {
    label: 'SYSTEMS NOMINAL',
    color: '#14B8A6',
    bgAlpha: 'rgba(20, 184, 166, 0.12)',
    borderAlpha: 'rgba(20, 184, 166, 0.35)',
  },
  attention: {
    label: 'ATTENTION REQUIRED',
    color: '#FBBF24',
    bgAlpha: 'rgba(251, 191, 36, 0.12)',
    borderAlpha: 'rgba(251, 191, 36, 0.35)',
  },
  critical: {
    label: 'CRITICAL ALERT',
    color: '#F87171',
    bgAlpha: 'rgba(248, 113, 113, 0.15)',
    borderAlpha: 'rgba(248, 113, 113, 0.4)',
  },
};

export const SystemStatusChip: React.FC<SystemStatusChipProps> = ({ status }) => {
  const theme = useTheme();
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.nominal;
  const isDark = theme.palette.mode === 'dark';

  return (
    <Chip
      size="small"
      icon={
        <Box
          component="span"
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: config.color,
            color: config.color,
            ml: 1,
            mr: 0.5,
            display: 'inline-block',
            animation: 'jarvisPulseDot 1.8s infinite ease-in-out',
            '@keyframes jarvisPulseDot': {
              '0%, 100%': {
                transform: 'scale(1)',
                opacity: 1,
                boxShadow: `0 0 10px ${config.color}`,
              },
              '50%': {
                transform: 'scale(0.7)',
                opacity: 0.4,
                boxShadow: `0 0 2px ${config.color}`,
              },
            },
          }}
        />
      }
      label={config.label}
      sx={{
        bgcolor: config.bgAlpha,
        color: config.color,
        border: '1px solid',
        borderColor: config.borderAlpha,
        fontWeight: 700,
        fontSize: '0.7rem',
        letterSpacing: '0.08em',
        fontFamily: 'monospace',
        textTransform: 'uppercase',
        px: 0.5,
        height: 26,
        backdropFilter: 'blur(4px)',
        '& .MuiChip-label': {
          px: 1,
        },
        boxShadow: isDark ? `0 0 12px ${config.bgAlpha}` : 'none',
      }}
    />
  );
};

export default SystemStatusChip;
