import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2952A3',
      light: '#5B7BC0',
      dark: '#1A3D7A',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#6B6B6B',
    },
    background: {
      default: '#FAFAFA',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1A1A1A',
      secondary: '#6B6B6B',
    },
    error: {
      main: '#C4554D',
      light: '#FBEAE8',
    },
    success: {
      main: '#4C8C6B',
      light: '#EAF5EF',
    },
    warning: {
      main: '#B45309',
      light: '#FEF3C7',
    },
    divider: '#E4E4E4',
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: '"Roboto", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 700,
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    body1: { fontSize: '0.9375rem' },
    body2: { fontSize: '0.875rem' },
    caption: { fontSize: '0.75rem', color: '#6B6B6B' },
  },
  shadows: [
    'none',
    '0 1px 2px rgba(0,0,0,0.04), 0 0 0 1px #E4E4E4',
    '0 2px 4px rgba(0,0,0,0.05), 0 0 0 1px #E4E4E4',
    '0 2px 8px rgba(0,0,0,0.06), 0 0 0 1px #E4E4E4',
    '0 4px 12px rgba(0,0,0,0.07), 0 0 0 1px #E4E4E4',
    '0 4px 16px rgba(0,0,0,0.08), 0 0 0 1px #E4E4E4',
    '0 4px 20px rgba(0,0,0,0.08), 0 0 0 1px #E4E4E4',
    '0 6px 24px rgba(0,0,0,0.09), 0 0 0 1px #E4E4E4',
    '0 8px 28px rgba(0,0,0,0.1), 0 0 0 1px #E4E4E4',
    '0 8px 32px rgba(0,0,0,0.1), 0 0 0 1px #E4E4E4',
    '0 10px 36px rgba(0,0,0,0.1), 0 0 0 1px #E4E4E4',
    '0 10px 40px rgba(0,0,0,0.11), 0 0 0 1px #E4E4E4',
    '0 12px 44px rgba(0,0,0,0.11), 0 0 0 1px #E4E4E4',
    '0 12px 48px rgba(0,0,0,0.12), 0 0 0 1px #E4E4E4',
    '0 14px 52px rgba(0,0,0,0.12), 0 0 0 1px #E4E4E4',
    '0 14px 56px rgba(0,0,0,0.12), 0 0 0 1px #E4E4E4',
    '0 16px 60px rgba(0,0,0,0.13), 0 0 0 1px #E4E4E4',
    '0 16px 64px rgba(0,0,0,0.13), 0 0 0 1px #E4E4E4',
    '0 18px 68px rgba(0,0,0,0.13), 0 0 0 1px #E4E4E4',
    '0 18px 72px rgba(0,0,0,0.14), 0 0 0 1px #E4E4E4',
    '0 20px 76px rgba(0,0,0,0.14), 0 0 0 1px #E4E4E4',
    '0 20px 80px rgba(0,0,0,0.14), 0 0 0 1px #E4E4E4',
    '0 22px 84px rgba(0,0,0,0.15), 0 0 0 1px #E4E4E4',
    '0 22px 88px rgba(0,0,0,0.15), 0 0 0 1px #E4E4E4',
    '0 24px 92px rgba(0,0,0,0.15), 0 0 0 1px #E4E4E4',
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#FAFAFA',
        },
        '@keyframes fadeInUp': {
          '0%': { opacity: 0, transform: 'translateY(8px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        '@keyframes pulseGlow': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(41,82,163,0.12)' },
          '50%': { boxShadow: '0 0 0 6px rgba(41,82,163,0)' },
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
          border: '1px solid #E4E4E4',
          borderRadius: 12,
          transition: 'box-shadow 0.25s ease, transform 0.25s ease, border-color 0.25s ease',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: '1px solid #E4E4E4',
          borderRadius: 12,
          boxShadow: 'none',
          transition: 'box-shadow 0.25s ease, transform 0.25s ease, border-color 0.25s ease',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          borderRadius: 8,
          boxShadow: 'none',
          transition: 'background-color 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease',
          '&:active': {
            transform: 'scale(0.97)',
          },
        },
        contained: {
          '&:hover': {
            boxShadow: '0 4px 12px rgba(41,82,163,0.2)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 500,
          fontSize: '0.75rem',
          transition: 'transform 0.15s ease',
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        size: 'small',
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: '#E4E4E4',
          fontSize: '0.875rem',
          padding: '10px 16px',
          transition: 'background-color 0.2s ease',
        },
        head: {
          fontWeight: 600,
          color: '#6B6B6B',
          fontSize: '0.75rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: '#E4E4E4',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          transition: 'background-color 0.2s ease, transform 0.15s ease, color 0.2s ease',
          '&:active': {
            transform: 'scale(0.9)',
          },
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: 'background-color 0.2s ease',
        },
      },
    },
  },
});

export default theme;
