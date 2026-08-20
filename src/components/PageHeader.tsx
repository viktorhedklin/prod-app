import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

interface Props {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export default function PageHeader({ title, subtitle, action }: Props) {
  return (
    <Box
      sx={{
        mb: 2,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 1,
      }}
    >
      <Box>
        <Typography
          sx={{
            fontSize: { xs: '1.35rem', md: '1.6rem' },
            fontWeight: 800,
            letterSpacing: '-0.02em',
            fontFamily: '"Plus Jakarta Sans Variable", "Roboto", sans-serif',
          }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {action}
    </Box>
  );
}