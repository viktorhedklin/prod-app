import { useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Fade from '@mui/material/Fade';
import theme from './theme';
import { AppProvider } from './AppContext';
import Dashboard from './screens/Dashboard';
import Today from './screens/Today';
import Tasks from './screens/Tasks';
import Escalations from './screens/Escalations';
import Reflection from './screens/Reflection';
import Growth from './screens/Growth';
import QaReview from './screens/QaReview';

type Tab = 'dashboard' | 'today' | 'tasks' | 'escalations' | 'reflection' | 'growth' | 'qa';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'today', label: 'Today' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'escalations', label: 'Escalations' },
  { id: 'reflection', label: 'Reflect' },
  { id: 'qa', label: 'QA Review' },
  { id: 'growth', label: 'My Growth' },
];

function Nav({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <Box
      component="nav"
      sx={{
        bgcolor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
        px: { xs: 2, md: 3 },
        py: 1.25,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 1100,
      }}
    >
      <Typography
        sx={{
          fontWeight: 700,
          fontSize: '0.9375rem',
          color: 'text.primary',
          letterSpacing: '-0.01em',
        }}
      >
        Productivity Grader
      </Typography>
      <Box
        sx={{
          display: 'flex',
          bgcolor: '#F3F3F3',
          borderRadius: 2,
          p: 0.375,
          gap: 0.25,
        }}
      >
        {TABS.map((tab) => (
          <Button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            size="small"
            disableRipple
            sx={{
              px: { xs: 1.25, md: 2 },
              py: 0.5,
              minWidth: 0,
              fontSize: { xs: '0.75rem', md: '0.8125rem' },
              fontWeight: active === tab.id ? 600 : 400,
              bgcolor: active === tab.id ? 'background.paper' : 'transparent',
              color: active === tab.id ? 'primary.main' : 'text.secondary',
              border: active === tab.id ? '1px solid' : '1px solid transparent',
              borderColor: active === tab.id ? 'divider' : 'transparent',
              borderRadius: 1.5,
              boxShadow: active === tab.id ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 150ms ease',
              '&:hover': {
                bgcolor: active === tab.id ? 'background.paper' : 'rgba(0,0,0,0.04)',
                boxShadow: active === tab.id ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              },
            }}
          >
            {tab.label}
          </Button>
        ))}
      </Box>
    </Box>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <Nav active={activeTab} onChange={setActiveTab} />
        <Box sx={{ py: { xs: 1, md: 1.5 } }}>
          <Fade in key={activeTab} timeout={250}>
            <Box>
              {activeTab === 'dashboard' && <Dashboard onNavigate={setActiveTab} />}
              {activeTab === 'today' && <Today />}
              {activeTab === 'tasks' && <Tasks />}
              {activeTab === 'escalations' && <Escalations />}
              {activeTab === 'reflection' && <Reflection />}
              {activeTab === 'qa' && <QaReview />}
              {activeTab === 'growth' && <Growth />}
            </Box>
          </Fade>
        </Box>
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
