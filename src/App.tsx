import { useState, useEffect, Suspense, lazy } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Fade from '@mui/material/Fade';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import useMediaQuery from '@mui/material/useMediaQuery';
import DashboardIcon from '@mui/icons-material/Dashboard';
import TodayIcon from '@mui/icons-material/Today';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import ReportIcon from '@mui/icons-material/Report';
import PsychologyIcon from '@mui/icons-material/Psychology';
import VerifiedIcon from '@mui/icons-material/Verified';
import SchoolIcon from '@mui/icons-material/School';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import { lightTheme, darkTheme } from './theme';
import { AppProvider } from './AppContext';

const Dashboard = lazy(() => import('./screens/Dashboard'));
const Today = lazy(() => import('./screens/Today'));
const Tasks = lazy(() => import('./screens/Tasks'));
const Escalations = lazy(() => import('./screens/Escalations'));
const Reflection = lazy(() => import('./screens/Reflection'));
const Growth = lazy(() => import('./screens/Growth'));
const QaReview = lazy(() => import('./screens/QaReview'));
const Coaching = lazy(() => import('./screens/Coaching'));

type Tab = 'dashboard' | 'today' | 'tasks' | 'escalations' | 'reflection' | 'growth' | 'qa' | 'coaching';

const TABS: Array<{ id: Tab; label: string; icon: typeof DashboardIcon }> = [
  { id: 'dashboard', label: 'Dashboard', icon: DashboardIcon },
  { id: 'today', label: 'Today', icon: TodayIcon },
  { id: 'tasks', label: 'Tasks', icon: TaskAltIcon },
  { id: 'escalations', label: 'Escalations', icon: ReportIcon },
  { id: 'reflection', label: 'Reflect', icon: PsychologyIcon },
  { id: 'qa', label: 'QA Review', icon: VerifiedIcon },
  { id: 'coaching', label: 'Coaching', icon: SchoolIcon },
  { id: 'growth', label: 'My Growth', icon: TrendingUpIcon },
];

function Nav({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <Box
      component="nav"
      sx={{
        bgcolor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
        px: { xs: 1.5, md: 3 },
        py: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        position: 'sticky',
        top: 0,
        zIndex: 1100,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
        <Box
          sx={{
            width: 30,
            height: 30,
            borderRadius: 2,
            background: 'linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 3px 8px rgba(13,148,136,0.3)',
          }}
        >
          <TrendingUpIcon sx={{ fontSize: 18 }} />
        </Box>
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: { xs: '0.875rem', md: '1rem' },
            color: 'text.primary',
            letterSpacing: '-0.02em',
            fontFamily: '"Plus Jakarta Sans Variable", "Roboto", sans-serif',
          }}
        >
          Productivity Grader
        </Typography>
      </Box>
      <Box
        sx={{
          display: 'flex',
          bgcolor: 'background.default',
          borderRadius: 2,
          p: 0.375,
          gap: 0.25,
          minWidth: 0,
          maxWidth: '100%',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <Button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              size="small"
              disableRipple
              startIcon={<Icon sx={{ fontSize: 17 }} />}
              sx={{
                px: { xs: 1, md: 1.5 },
                py: 0.6,
                minWidth: 0,
                flexShrink: 0,
                whiteSpace: 'nowrap',
                fontSize: { xs: '0.75rem', md: '0.8125rem' },
                fontWeight: active === tab.id ? 700 : 500,
                bgcolor: active === tab.id ? 'background.paper' : 'transparent',
                color: active === tab.id ? 'primary.main' : 'text.secondary',
                border: active === tab.id ? '1px solid' : '1px solid transparent',
                borderColor: active === tab.id ? 'divider' : 'transparent',
                borderRadius: 1.5,
                boxShadow: active === tab.id ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 150ms ease',
                '&:hover': {
                  bgcolor: active === tab.id ? 'background.paper' : 'rgba(0,0,0,0.04)',
                  color: active === tab.id ? 'primary.main' : 'text.primary',
                },
              }}
            >
              {tab.label}
            </Button>
          );
        })}
      </Box>
    </Box>
  );
}

function MobileNav({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const primaryTabs = TABS.slice(0, 6);
  const overflowTabs = TABS.slice(6);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const overflowActive = overflowTabs.some((t) => t.id === active);

  const handlePick = (id: Tab) => {
    onChange(id);
    setMenuAnchor(null);
  };

  return (
    <>
      <Box
        component="nav"
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1200,
          bgcolor: 'background.paper',
          borderTop: '1px solid',
          borderColor: 'divider',
          px: 1,
          pt: 0.5,
          pb: 'calc(0.5rem + env(safe-area-inset-bottom))',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        {primaryTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.id;
          return (
            <Tooltip key={tab.id} title={tab.label} placement="top">
              <IconButton
                onClick={() => onChange(tab.id)}
                aria-label={tab.label}
                sx={{
                  flex: 1,
                  minWidth: 48,
                  py: 0.5,
                  borderRadius: 2,
                  color: isActive ? 'primary.main' : 'text.secondary',
                  '&:hover': { bgcolor: 'background.default' },
                }}
              >
                <Icon sx={{ fontSize: 24, transition: 'transform 150ms ease' }} />
              </IconButton>
            </Tooltip>
          );
        })}
        <Tooltip title="More" placement="top">
          <IconButton
            onClick={(e) => setMenuAnchor(e.currentTarget)}
            aria-label="More"
            aria-haspopup="menu"
            aria-expanded={!!menuAnchor}
            sx={{
              flex: 1,
              minWidth: 48,
              py: 0.5,
              borderRadius: 2,
              color: overflowActive ? 'primary.main' : 'text.secondary',
              '&:hover': { bgcolor: 'background.default' },
            }}
          >
            <MoreHorizIcon sx={{ fontSize: 24, transition: 'transform 150ms ease' }} />
          </IconButton>
        </Tooltip>
      </Box>
      <Menu
        anchorEl={menuAnchor}
        open={!!menuAnchor}
        onClose={() => setMenuAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        slotProps={{ paper: { sx: { minWidth: 180, mt: -0.5 } } }}
      >
        {overflowTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.id;
          return (
            <MenuItem
              key={tab.id}
              onClick={() => handlePick(tab.id)}
              selected={isActive}
              sx={{
                gap: 1.5,
                py: 1,
                color: isActive ? 'primary.main' : 'text.primary',
                '& .MuiSvgIcon-root': { fontSize: 20 },
              }}
            >
              <Icon />
              {tab.label}
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem('theme-mode');
    if (saved) return saved === 'dark';
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  });

  useEffect(() => {
    localStorage.setItem('theme-mode', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const theme = darkMode ? darkTheme : lightTheme;
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: isMobile ? 8 : 0 }}>
        <Nav active={activeTab} onChange={setActiveTab} />
        <Box sx={{ position: 'fixed', top: 64, right: 16, zIndex: 1300 }}>
          <IconButton
            onClick={() => setDarkMode((m) => !m)}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            sx={{
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              color: darkMode ? 'warning.main' : 'text.secondary',
              boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
              '&:hover': { bgcolor: 'background.default' },
            }}
          >
            {darkMode ? <LightModeIcon sx={{ fontSize: 20 }} /> : <DarkModeIcon sx={{ fontSize: 20 }} />}
          </IconButton>
        </Box>
        <Box sx={{ py: { xs: 2, md: 2.5 }, px: { xs: 1.5, md: 0 } }}>
          <Fade in key={activeTab} timeout={250}>
            <Box>
              {activeTab === 'dashboard' && (
                <Suspense fallback={<Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>Loading…</Box>}>
                  <Dashboard onNavigate={setActiveTab} />
                </Suspense>
              )}
              {activeTab === 'today' && (
                <Suspense fallback={<Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>Loading…</Box>}>
                  <Today />
                </Suspense>
              )}
              {activeTab === 'tasks' && (
                <Suspense fallback={<Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>Loading…</Box>}>
                  <Tasks />
                </Suspense>
              )}
              {activeTab === 'escalations' && (
                <Suspense fallback={<Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>Loading…</Box>}>
                  <Escalations />
                </Suspense>
              )}
              {activeTab === 'reflection' && (
                <Suspense fallback={<Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>Loading…</Box>}>
                  <Reflection />
                </Suspense>
              )}
              {activeTab === 'qa' && (
                <Suspense fallback={<Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>Loading…</Box>}>
                  <QaReview />
                </Suspense>
              )}
              {activeTab === 'coaching' && (
                <Suspense fallback={<Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>Loading…</Box>}>
                  <Coaching />
                </Suspense>
              )}
              {activeTab === 'growth' && (
                <Suspense fallback={<Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>Loading…</Box>}>
                  <Growth />
                </Suspense>
              )}
            </Box>
          </Fade>
        </Box>
        {isMobile && <MobileNav active={activeTab} onChange={setActiveTab} />}
      </Box>
    </ThemeProvider>
  );
}

export default function Root() {
  return (
    <AppProvider>
      <App />
    </AppProvider>
  );
}