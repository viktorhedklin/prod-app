import React, { useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';

export interface MemoryInsightWidgetProps {
  nodeCount: number;
  edgeCount: number;
  sessionLabel?: string;
  onClick?: () => void;
}

interface ConstellationDot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
}

export const MemoryInsightWidget: React.FC<MemoryInsightWidgetProps> = ({
  nodeCount,
  edgeCount,
  sessionLabel = 'MEMORY & REASONING',
  onClick,
}) => {
  const theme = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Animated constellation thumbnail loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 72;
    const height = 72;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    // Seed 8 floating constellation particles
    const colors = ['#14B8A6', '#06B6D4', '#2DD4BF', '#38BDF8'];
    const dots: ConstellationDot[] = Array.from({ length: 8 }, () => ({
      x: 10 + Math.random() * (width - 20),
      y: 10 + Math.random() * (height - 20),
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      radius: 2 + Math.random() * 2,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));

    let animId: number;

    const draw = () => {
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // Deep dark thumbnail background
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, width, height);

      // Update positions
      for (const d of dots) {
        d.x += d.vx;
        d.y += d.vy;
        if (d.x < 6 || d.x > width - 6) d.vx *= -1;
        if (d.y < 6 || d.y > height - 6) d.vy *= -1;
      }

      // Draw connecting lines
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dx = dots[j].x - dots[i].x;
          const dy = dots[j].y - dots[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 32) {
            ctx.beginPath();
            ctx.moveTo(dots[i].x, dots[i].y);
            ctx.lineTo(dots[j].x, dots[j].y);
            ctx.strokeStyle = '#06B6D4';
            ctx.globalAlpha = Math.max(0.1, (1 - dist / 32) * 0.6);
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      // Draw glowing dots
      for (const d of dots) {
        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.shadowBlur = 8;
        ctx.shadowColor = d.color;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2);
        ctx.fillStyle = d.color;
        ctx.fill();
        ctx.restore();
      }

      ctx.restore();
      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <Paper
      elevation={2}
      onClick={onClick}
      sx={{
        p: 1.75,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        borderRadius: 3,
        bgcolor: theme.palette.mode === 'dark' ? '#0F172A' : '#FFFFFF',
        border: '1px solid',
        borderColor:
          theme.palette.mode === 'dark'
            ? 'rgba(20, 184, 166, 0.25)'
            : 'rgba(20, 184, 166, 0.35)',
        boxShadow:
          theme.palette.mode === 'dark'
            ? '0 0 16px rgba(20, 184, 166, 0.08)'
            : '0 4px 16px rgba(0, 0, 0, 0.06)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
        '&:hover': onClick
          ? {
              transform: 'translateY(-2px)',
              borderColor: 'primary.main',
              boxShadow: '0 0 20px rgba(20, 184, 166, 0.25)',
            }
          : undefined,
      }}
    >
      {/* Constellation Canvas Thumbnail */}
      <Box
        sx={{
          width: 72,
          height: 72,
          borderRadius: 2,
          overflow: 'hidden',
          border: '1px solid rgba(20, 184, 166, 0.3)',
          flexShrink: 0,
          position: 'relative',
        }}
      >
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%', display: 'block' }}
        />
      </Box>

      {/* Stats & Session Label */}
      <Box sx={{ minWidth: 160 }}>
        <Typography
          variant="overline"
          sx={{
            display: 'block',
            fontSize: '0.68rem',
            letterSpacing: '0.08em',
            fontWeight: 800,
            color: 'primary.main',
            lineHeight: 1.2,
            mb: 0.75,
          }}
        >
          {sessionLabel}
        </Typography>

        <Stack direction="row" spacing={2} alignItems="center">
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1, fontSize: '1.15rem' }}>
              {nodeCount}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em' }}
            >
              NODES
            </Typography>
          </Box>

          <Box sx={{ width: '1px', height: 24, bgcolor: 'divider' }} />

          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1, fontSize: '1.15rem' }}>
              {edgeCount}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em' }}
            >
              LINKS
            </Typography>
          </Box>

          <Box sx={{ width: '1px', height: 24, bgcolor: 'divider' }} />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box
              sx={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                bgcolor: '#14B8A6',
                boxShadow: '0 0 8px #14B8A6',
              }}
            />
            <Typography
              variant="caption"
              sx={{ fontSize: '0.65rem', fontWeight: 700, color: 'primary.main', letterSpacing: '0.05em' }}
            >
              ACTIVE
            </Typography>
          </Box>
        </Stack>
      </Box>
    </Paper>
  );
};

export default MemoryInsightWidget;
