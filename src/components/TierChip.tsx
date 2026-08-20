import Chip from '@mui/material/Chip';
import type { Tier } from '../types';
import { formatTierLabel } from '../grading';

interface Props {
  tier: Tier;
  size?: 'small' | 'medium';
}

const TIER_STYLES: Record<Tier, { bg: string; color: string; border: string }> = {
  S: { bg: '#EAF6EF', color: '#15803D', border: 'rgba(21,128,61,0.22)' },
  A_plus: { bg: '#EAF6EF', color: '#15803D', border: 'rgba(21,128,61,0.22)' },
  A: { bg: '#EAF6EF', color: '#15803D', border: 'rgba(21,128,61,0.22)' },
  B: { bg: '#FEF3C7', color: '#B45309', border: 'rgba(180,83,9,0.22)' },
  C: { bg: '#FDECEC', color: '#B91C1C', border: 'rgba(185,28,28,0.22)' },
  PIP: { bg: '#FDECEC', color: '#B91C1C', border: 'rgba(185,28,28,0.22)' },
};

export default function TierChip({ tier, size = 'small' }: Props) {
  const styles = TIER_STYLES[tier];
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
