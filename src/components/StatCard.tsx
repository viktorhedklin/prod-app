import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

interface Props {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  interactive?: boolean;
  delay?: number;
}

export default function StatCard({ title, children, action, interactive = false, delay = 0 }: Props) {
  return (
    <Card
      elevation={0}
      sx={{
        animation: 'fadeInUp 0.4s ease both',
        animationDelay: `${delay}ms`,
        '&:hover': interactive
          ? {
              borderColor: 'primary.main',
              boxShadow: '0 4px 16px rgba(41,82,163,0.08)',
              transform: 'translateY(-2px)',
            }
          : undefined,
      }}
    >
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            mb: 1.5,
            fontWeight: 600,
            color: 'text.secondary',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            fontSize: '0.7rem',
          }}
        >
          {title}
          {action && (
            <span style={{ float: 'right', textTransform: 'none', letterSpacing: 0 }}>
              {action}
            </span>
          )}
        </Typography>
        {children}
      </CardContent>
    </Card>
  );
}
