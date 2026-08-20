import { createTheme } from '@mui/material/styles';
import type { ThemeOptions, Theme } from '@mui/material/styles';
import type { Tier } from './types';

export type StatusTone = 'ok' | 'warn' | 'danger' | 'neutral';

export const TIER_TONE: Record<Tier, StatusTone> = {
  S: 'ok',
  A_plus: 'ok',
  A: 'ok',
  B: 'warn',
  C: 'danger',
  PIP: 'danger',
};

export function toneStyle(tone: StatusTone, theme: Theme): { bg: string; color: string; border: string } {
  if (tone === 'neutral') {
    return {
      bg: theme.palette.action.selected,
      color: theme.palette.text.secondary,
      border: theme.palette.divider,
    };
  }
  const key = tone === 'ok' ? 'success' : tone === 'warn' ? 'warning' : 'error';
  const p = theme.palette[key];
  return {
    bg: p.light,
    color: p.main,
    border: theme.palette.mode === 'dark' ? `${p.main}55` : `${p.main}38`,
  };
}

// Deep Teal brand palette (option A)
const BRAND = {
  main: '#0D9488',
  light: '#14B8A6',
  dark: '#0F766E',
  contrastText: '#FFFFFF',
  tint: '#E6F4F2',
  gradient: 'linear-gradient(135deg, #0F766E 0%, #0D9488 55%, #14B8A6 100%)',
};

const TIERS = {
  ok: '#15803D',
  okBg: '#EAF6EF',
  okBorder: 'rgba(21,128,61,0.22)',
  warn: '#B45309',
  warnBg: '#FEF3C7',
  warnBorder: 'rgba(180,83,9,0.22)',
  danger: '#B91C1C',
  dangerBg: '#FDECEC',
  dangerBorder: 'rgba(185,28,28,0.22)',
};

// Shared component overrides that adapt to both light and dark themes via tokens
const componentOverrides = (mode: 'light' | 'dark'): ThemeOptions['components'] => {
  const divider = mode === 'dark' ? 'rgba(255,255,255,0.12)' : '#E4E4E4';
  return {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          transition: 'background-color 0.25s ease, color 0.25s ease',
        },
        '@keyframes fadeInUp': {
          '0%': { opacity: 0, transform: 'translateY(8px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        '@keyframes fadeInScale': {
          '0%': { opacity: 0, transform: 'scale(0.96)' },
          '100%': { opacity: 1, transform: 'scale(1)' },
        },
        '@keyframes pulseGlow': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(13,148,136,0.18)' },
          '50%': { boxShadow: '0 0 0 7px rgba(13,148,136,0)' },
        },
        '@keyframes shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: `1px solid ${divider}`,
          borderRadius: 16,
          transition: 'box-shadow 0.25s ease, transform 0.25s ease, border-color 0.25s ease',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: `1px solid ${divider}`,
          borderRadius: 16,
          boxShadow: 'none',
          transition: 'box-shadow 0.25s ease, transform 0.25s ease, border-color 0.25s ease',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 10,
          boxShadow: 'none',
          transition: 'background-color 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease',
          '&:focus-visible': {
            outline: `2px solid ${BRAND.main}`,
            outlineOffset: 2,
          },
          '&:active': {
            transform: 'scale(0.97)',
          },
        },
        contained: {
          '&:hover': {
            boxShadow: '0 6px 18px rgba(13,148,136,0.28)',
          },
        },
        containedPrimary: {
          background: BRAND.gradient,
          '&:hover': {
            background: BRAND.gradient,
            filter: 'brightness(1.05)',
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          transition: 'background-color 0.2s ease, transform 0.15s ease, color 0.2s ease',
          '&:focus-visible': {
            outline: `2px solid ${BRAND.main}`,
            outlineOffset: 2,
          },
          '&:active': {
            transform: 'scale(0.9)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
          fontSize: '0.75rem',
          transition: 'transform 0.15s ease, background-color 0.2s ease',
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        size: 'small',
      },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
            transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
            '&:focus-within': {
              boxShadow: '0 0 0 3px rgba(13,148,136,0.15)',
            },
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: divider,
          fontSize: '0.875rem',
          padding: '10px 16px',
          transition: 'background-color 0.2s ease',
        },
        head: {
          fontWeight: 700,
          color: mode === 'dark' ? 'rgba(255,255,255,0.6)' : '#6B6B6B',
          fontSize: '0.72rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: { borderColor: divider },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: 'background-color 0.2s ease',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: 8,
          fontSize: '0.75rem',
          fontWeight: 500,
        },
      },
    },
  };
};

const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: BRAND,
    secondary: {
      main: '#6B6B6B',
    },
    background: {
      default: '#F8F9F7',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#16211F',
      secondary: '#5D6B68',
    },
    error: {
      main: TIERS.danger,
      light: TIERS.dangerBg,
    },
    success: {
      main: TIERS.ok,
      light: TIERS.okBg,
    },
    warning: {
      main: TIERS.warn,
      light: TIERS.warnBg,
    },
    divider: '#E4E4E4',
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: '"Roboto", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 700,
    h1: { fontWeight: 800, letterSpacing: '-0.02em' },
    h2: { fontWeight: 800, letterSpacing: '-0.02em' },
    h3: { fontWeight: 800, letterSpacing: '-0.02em' },
    h4: { fontWeight: 700, letterSpacing: '-0.015em' },
    h5: { fontWeight: 700, letterSpacing: '-0.015em' },
    h6: { fontWeight: 700, letterSpacing: '-0.01em' },
    body1: { fontSize: '0.9375rem' },
    body2: { fontSize: '0.875rem' },
    caption: { fontSize: '0.75rem', color: '#5D6B68' },
  },
  shadows: [
    'none',
    '0 1px 2px rgba(22,33,31,0.05)',
    '0 2px 4px rgba(22,33,31,0.06)',
    '0 4px 12px rgba(22,33,31,0.07)',
    '0 6px 16px rgba(22,33,31,0.08)',
    '0 8px 24px rgba(22,33,31,0.09)',
    '0 10px 28px rgba(22,33,31,0.1)',
    '0 12px 32px rgba(22,33,31,0.11)',
    '0 14px 36px rgba(22,33,31,0.12)',
    '0 16px 40px rgba(22,33,31,0.12)',
    '0 18px 44px rgba(22,33,31,0.13)',
    '0 20px 48px rgba(22,33,31,0.13)',
    '0 22px 52px rgba(22,33,31,0.14)',
    '0 24px 56px rgba(22,33,31,0.14)',
    '0 26px 60px rgba(22,33,31,0.15)',
    '0 28px 64px rgba(22,33,31,0.15)',
    '0 30px 68px rgba(22,33,31,0.16)',
    '0 32px 72px rgba(22,33,31,0.16)',
    '0 34px 76px rgba(22,33,31,0.17)',
    '0 36px 80px rgba(22,33,31,0.17)',
    '0 38px 84px rgba(22,33,31,0.18)',
    '0 40px 88px rgba(22,33,31,0.18)',
    '0 42px 92px rgba(22,33,31,0.19)',
    '0 44px 96px rgba(22,33,31,0.19)',
    '0 46px 100px rgba(22,33,31,0.2)',
  ],
  components: componentOverrides('light'),
});

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: BRAND,
    secondary: {
      main: '#A6B3B0',
    },
    background: {
      default: '#0E1312',
      paper: '#161D1B',
    },
    text: {
      primary: '#E8EFED',
      secondary: '#9AA9A6',
    },
    error: {
      main: '#F87171',
      light: 'rgba(248,113,113,0.14)',
    },
    success: {
      main: '#34D399',
      light: 'rgba(52,211,153,0.14)',
    },
    warning: {
      main: '#FBBF24',
      light: 'rgba(251,191,36,0.14)',
    },
    divider: 'rgba(255,255,255,0.1)',
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: '"Roboto", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 700,
    h1: { fontWeight: 800, letterSpacing: '-0.02em' },
    h2: { fontWeight: 800, letterSpacing: '-0.02em' },
    h3: { fontWeight: 800, letterSpacing: '-0.02em' },
    h4: { fontWeight: 700, letterSpacing: '-0.015em' },
    h5: { fontWeight: 700, letterSpacing: '-0.015em' },
    h6: { fontWeight: 700, letterSpacing: '-0.01em' },
    body1: { fontSize: '0.9375rem' },
    body2: { fontSize: '0.875rem' },
    caption: { fontSize: '0.75rem', color: '#9AA9A6' },
  },
  shadows: [
    'none',
    '0 1px 2px rgba(0,0,0,0.4)',
    '0 2px 4px rgba(0,0,0,0.45)',
    '0 4px 12px rgba(0,0,0,0.5)',
    '0 6px 16px rgba(0,0,0,0.5)',
    '0 8px 24px rgba(0,0,0,0.55)',
    '0 10px 28px rgba(0,0,0,0.55)',
    '0 12px 32px rgba(0,0,0,0.6)',
    '0 14px 36px rgba(0,0,0,0.6)',
    '0 16px 40px rgba(0,0,0,0.6)',
    '0 18px 44px rgba(0,0,0,0.65)',
    '0 20px 48px rgba(0,0,0,0.65)',
    '0 22px 52px rgba(0,0,0,0.65)',
    '0 24px 56px rgba(0,0,0,0.7)',
    '0 26px 60px rgba(0,0,0,0.7)',
    '0 28px 64px rgba(0,0,0,0.7)',
    '0 30px 68px rgba(0,0,0,0.75)',
    '0 32px 72px rgba(0,0,0,0.75)',
    '0 34px 76px rgba(0,0,0,0.75)',
    '0 36px 80px rgba(0,0,0,0.8)',
    '0 38px 84px rgba(0,0,0,0.8)',
    '0 40px 88px rgba(0,0,0,0.8)',
    '0 42px 92px rgba(0,0,0,0.85)',
    '0 44px 96px rgba(0,0,0,0.85)',
    '0 46px 100px rgba(0,0,0,0.85)',
  ],
  components: componentOverrides('dark'),
});

export { lightTheme, darkTheme, BRAND, TIERS };

export default lightTheme;