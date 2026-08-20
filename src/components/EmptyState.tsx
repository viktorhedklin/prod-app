import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

interface Props {
  icon?: ReactNode;
  title: string;
  hint?: string;
}

export default function EmptyState({ icon, title, hint }: Props) {
  return (
    <Box
      sx={{
        py: 4,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1,
        textAlign: 'center',
      }}
    >
      {icon && <Box sx={{ color: 'success.light', display: 'flex' }}>{icon}</Box>}
      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
      {hint && (
        <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 320 }}>
          {hint}
        </Typography>
      )}
    </Box>
  );
}