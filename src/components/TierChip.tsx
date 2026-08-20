import Chip from '@mui/material/Chip';
import { useTheme } from '@mui/material/styles';
import type { Tier } from '../types';
import { formatTierLabel } from '../grading';
import { TIER_TONE, toneStyle } from '../theme';

interface Props {
  tier: Tier;
  size?: 'small' | 'medium';
}

export default function TierChip({ tier, size = 'small' }: Props) {
  const theme = useTheme();
  const styles = toneStyle(TIER_TONE[tier], theme);
  return (
    <Chip
      label={formatTierLabel(tier)}
      size={size}
      sx={{
        bgcolor: styles.bg,
        color: styles.color,
        fontWeight: 700,
        border: `1px solid ${styles.border}`,
        height: size === 'small' ? 22 : 28,
        animation: 'fadeInUp 0.3s ease both',
        '&:hover': {
          transform: 'scale(1.08)',
          boxShadow: `0 2px 8px ${styles.border}`,
        },
        '& .MuiChip-label': {
          px: 1,
        },
      }}
    />
  );
}
