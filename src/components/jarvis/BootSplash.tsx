import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';

const BOOT_SESSION_KEY = 'vesper_hud_booted';

export const BootSplash: React.FC = () => {
  const [visible, setVisible] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(BOOT_SESSION_KEY) !== 'true';
    } catch {
      return true;
    }
  });

  const [progress, setProgress] = useState<number>(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [stepText, setStepText] = useState<string>('INITIALIZING VESPER CORE...');

  const dismiss = () => {
    try {
      sessionStorage.setItem(BOOT_SESSION_KEY, 'true');
    } catch {
      // ignore
    }
    setVisible(false);
  };

  useEffect(() => {
    if (!visible) return;

    const timeline: { time: number; progress: number; log?: string; stepText?: string }[] = [
      { time: 150, progress: 15, log: '[00:00:01] CORE SYSTEM LOADED', stepText: 'INITIALIZING VESPER CORE...' },
      { time: 450, progress: 40, log: '[00:00:02] HEURISTICS ENGINE ONLINE', stepText: 'LOADING HEURISTICS MODULES...' },
      { time: 850, progress: 68, log: '[00:00:03] NEURAL PATHWAYS SYNCED', stepText: 'ESTABLISHING NEURAL LINK...' },
      { time: 1350, progress: 90, log: '[00:00:04] HUD OVERLAY ACTIVE', stepText: 'CALIBRATING HUD DISPLAY...' },
      { time: 1850, progress: 100, log: '[00:00:05] SYSTEM READY // JARVIS ONLINE', stepText: 'ALL SYSTEMS OPERATIONAL' },
    ];

    const timers: ReturnType<typeof setTimeout>[] = [];

    timeline.forEach((item) => {
      const t = setTimeout(() => {
        setProgress(item.progress);
        if (item.stepText) setStepText(item.stepText);
        if (item.log) {
          setLogs((prev) => [...prev, item.log!]);
        }
      }, item.time);
      timers.push(t);
    });

    const finishTimer = setTimeout(() => {
      dismiss();
    }, 2300);
    timers.push(finishTimer);

    return () => {
      timers.forEach((t) => clearTimeout(t));
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <Box
      onClick={dismiss}
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#020617',
        color: '#E2E8F0',
        cursor: 'pointer',
        userSelect: 'none',
        overflow: 'hidden',
        animation: 'jarvisSplashFade 2.3s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        '@keyframes jarvisSplashFade': {
          '0%': { opacity: 0 },
          '10%': { opacity: 1 },
          '85%': { opacity: 1 },
          '100%': { opacity: 0, pointerEvents: 'none' },
        },
        backgroundImage: `linear-gradient(rgba(20, 184, 166, 0.04) 1px, transparent 1px)`,
        backgroundSize: '100% 4px',
      }}
    >
      <Box
        sx={{
          position: 'relative',
          width: { xs: '90%', sm: 460 },
          p: 4,
          borderRadius: 2,
          bgcolor: 'rgba(15, 23, 42, 0.85)',
          border: '1px solid rgba(20, 184, 166, 0.3)',
          boxShadow: '0 0 40px rgba(20, 184, 166, 0.15), inset 0 0 20px rgba(20, 184, 166, 0.05)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <Box sx={{ position: 'absolute', top: -2, left: -2, width: 14, height: 14, borderTop: '3px solid #14B8A6', borderLeft: '3px solid #14B8A6' }} />
        <Box sx={{ position: 'absolute', top: -2, right: -2, width: 14, height: 14, borderTop: '3px solid #14B8A6', borderRight: '3px solid #14B8A6' }} />
        <Box sx={{ position: 'absolute', bottom: -2, left: -2, width: 14, height: 14, borderBottom: '3px solid #14B8A6', borderLeft: '3px solid #14B8A6' }} />
        <Box sx={{ position: 'absolute', bottom: -2, right: -2, width: 14, height: 14, borderBottom: '3px solid #14B8A6', borderRight: '3px solid #14B8A6' }} />

        <Stack spacing={3} alignItems="center">
          <Box
            sx={{
              position: 'relative',
              width: 80,
              height: 80,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: '2px dashed #14B8A6',
                animation: 'jarvisSplashRotate 8s linear infinite',
                '@keyframes jarvisSplashRotate': {
                  '0%': { transform: 'rotate(0deg)' },
                  '100%': { transform: 'rotate(360deg)' },
                },
              }}
            />
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                bgcolor: 'rgba(20, 184, 166, 0.2)',
                border: '2px solid #06B6D4',
                boxShadow: '0 0 25px #06B6D4, inset 0 0 15px #14B8A6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'jarvisSplashPulse 1.2s ease-in-out infinite alternate',
                '@keyframes jarvisSplashPulse': {
                  '0%': { transform: 'scale(0.92)', boxShadow: '0 0 15px #14B8A6' },
                  '100%': { transform: 'scale(1.08)', boxShadow: '0 0 35px #06B6D4' },
                },
              }}
            >
              <Box
                sx={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  bgcolor: '#22D3EE',
                  boxShadow: '0 0 12px #22D3EE',
                }}
              />
            </Box>
          </Box>

          <Box sx={{ textAlign: 'center' }}>
            <Typography
              sx={{
                fontFamily: 'monospace',
                fontWeight: 800,
                fontSize: { xs: '0.95rem', sm: '1.1rem' },
                letterSpacing: '0.14em',
                color: '#14B8A6',
                textShadow: '0 0 12px rgba(20, 184, 166, 0.6)',
                textTransform: 'uppercase',
              }}
            >
              {stepText}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                fontFamily: 'monospace',
                fontSize: '0.68rem',
                color: '#94A3B8',
                letterSpacing: '0.1em',
                mt: 0.5,
                display: 'block',
              }}
            >
              VESPER HUD // JARVIS SYSTEM v2.4
            </Typography>
          </Box>

          <Box sx={{ width: '100%' }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                mb: 0.8,
                fontFamily: 'monospace',
                fontSize: '0.7rem',
                color: '#06B6D4',
                fontWeight: 700,
              }}
            >
              <span>BOOT SEQUENCE</span>
              <span>{progress}%</span>
            </Box>
            <Box
              sx={{
                width: '100%',
                height: 6,
                bgcolor: 'rgba(148, 163, 184, 0.15)',
                borderRadius: 1,
                overflow: 'hidden',
                p: '1px',
                border: '1px solid rgba(20, 184, 166, 0.3)',
              }}
            >
              <Box
                sx={{
                  height: '100%',
                  width: `${progress}%`,
                  bgcolor: '#14B8A6',
                  backgroundImage: 'linear-gradient(90deg, #14B8A6 0%, #06B6D4 100%)',
                  boxShadow: '0 0 10px #06B6D4',
                  borderRadius: 0.5,
                  transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              />
            </Box>
          </Box>

          <Box
            sx={{
              width: '100%',
              minHeight: 56,
              maxHeight: 70,
              bgcolor: 'rgba(2, 6, 23, 0.8)',
              border: '1px solid rgba(148, 163, 184, 0.15)',
              borderRadius: 1,
              p: 1,
              fontFamily: 'monospace',
              fontSize: '0.66rem',
              color: '#34D399',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              overflow: 'hidden',
            }}
          >
            {logs.slice(-3).map((line, idx) => (
              <Typography
                key={idx}
                sx={{
                  fontFamily: 'monospace',
                  fontSize: '0.66rem',
                  color: idx === logs.length - 1 ? '#22D3EE' : 'rgba(52, 211, 153, 0.7)',
                  lineHeight: 1.3,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {line}
              </Typography>
            ))}
          </Box>

          <Typography
            variant="caption"
            sx={{
              fontFamily: 'monospace',
              fontSize: '0.6rem',
              color: 'rgba(148, 163, 184, 0.5)',
              letterSpacing: '0.08em',
            }}
          >
            CLICK ANYWHERE TO SKIP
          </Typography>
        </Stack>
      </Box>
    </Box>
  );
};

export default BootSplash;