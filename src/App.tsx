import { useMemo, useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Fade from '@mui/material/Fade';
import Badge from '@mui/material/Badge';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import LinearProgress from '@mui/material/LinearProgress';
import theme from './theme';
import { AppProvider, useApp } from './AppContext';
import Dashboard from './screens/Dashboard';
import Today from './screens/Today';
import Tasks from './screens/Tasks';
import Escalations from './screens/Escalations';
import Reflection from './screens/Reflection';
import Growth from './screens/Growth';
import QaReview from './screens/QaReview';
import BottomNav, { type AppTab } from './components/BottomNav';
import ErrorBoundary from './components/ErrorBoundary';
import { todayLocal } from './dates';
import { getOpenShiftItems } from './grading';
import { endShiftSession, loadShiftSession, startShiftSession } from './shiftSession';

const TABS: Array<{ id: AppTab; label: string }> = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'today', label: 'Log' },
  { id: 'tasks', label: 'Shift Todo' },
  { id: 'escalations', label: 'Escalations' },
  { id: 'reflection', label: 'Reflect' },
  { id: 'qa', label: 'QA Review' },
  { id: 'growth', label: 'My Growth' },
];

function Nav({
  active,
  onChange,
  pendingTasks,
  openEscalations,
  reflectionMissing,
  onEndShift,
  shiftEnded,
}: {
  active: AppTab;
  onChange: (t: AppTab) => void;
  pendingTasks: number;
  openEscalations: number;
  reflectionMissing: boolean;
  onEndShift: () => void;
  shiftEnded: boolean;
}) {
  const badgeFor = (id: AppTab): number | 'dot' | null => {
    if (id === 'tasks' && pendingTasks > 0) return pendingTasks;
    if (id === 'escalations' && openEscalations > 0) return openEscalations;
    if (id === 'reflection' && reflectionMissing) return 'dot';
    return null;
  };

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
        gap: 1.5,
        flexWrap: 'wrap',
      }}
    >
      <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem' }}>Productivity Grader</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Box sx={{ display: { xs: 'none', md: 'flex' }, bgcolor: '#F3F3F3', borderRadius: 2, p: 0.375, gap: 0.25 }}>
          {TABS.map((tab) => {
            const badge = badgeFor(tab.id);
            return (
              <Badge key={tab.id} badgeContent={badge === 'dot' ? undefined : badge} variant={badge === 'dot' ? 'dot' : 'standard'} color="error" invisible={!badge} overlap="rectangular">
                <Button
                  onClick={() => onChange(tab.id)}
                  size="small"
                  disableRipple
                  sx={{
                    px: 2,
                    py: 0.5,
                    minWidth: 0,
                    fontSize: '0.8125rem',
                    fontWeight: active === tab.id ? 600 : 400,
                    bgcolor: active === tab.id ? 'background.paper' : 'transparent',
                    color: active === tab.id ? 'primary.main' : 'text.secondary',
                    border: active === tab.id ? '1px solid' : '1px solid transparent',
                    borderColor: active === tab.id ? 'divider' : 'transparent',
                    borderRadius: 1.5,
                    boxShadow: active === tab.id ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                  }}
                >
                  {tab.label}
                </Button>
              </Badge>
            );
          })}
        </Box>
        <Button size="small" variant={shiftEnded ? 'outlined' : 'contained'} onClick={onEndShift} disabled={shiftEnded} sx={{ fontWeight: 600 }}>
          {shiftEnded ? 'Shift closed' : 'End Shift'}
        </Button>
      </Box>
    </Box>
  );
}

function App() {
  const { tasks, escalations, reflections, notify } = useApp();
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const [gateOpen, setGateOpen] = useState(false);
  const [shiftTick, setShiftTick] = useState(0);
  const today = todayLocal();
  const shift = useMemo(() => loadShiftSession(today), [today, shiftTick]);
  const { pendingTasks, openEscalations } = useMemo(() => getOpenShiftItems(tasks, escalations, today), [tasks, escalations, today]);
  const pendingCount = pendingTasks.length;
  const totalToday = tasks.filter((t) => t.linked_date === today || t.completion_date === today).length;
  const doneCount = Math.max(0, totalToday - pendingCount);
  const progress = totalToday === 0 ? 100 : Math.round((doneCount / totalToday) * 100);

  const handleEndShift = () => {
    startShiftSession(today);
    if (pendingCount > 0) {
      setGateOpen(true);
      notify('Finish every shift todo before logging out', 'warning');
      return;
    }
    endShiftSession(today);
    setShiftTick((n) => n + 1);
    notify('Shift closed. All todos submitted.');
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: { xs: 9, md: 0 } }}>
      <Nav
        active={activeTab}
        onChange={setActiveTab}
        pendingTasks={pendingCount}
        openEscalations={openEscalations.length}
        reflectionMissing={!reflections[today]}
        onEndShift={handleEndShift}
        shiftEnded={!!shift.ended_at}
      />
      <Box sx={{ py: { xs: 1, md: 1.5 } }}>
        <ErrorBoundary>
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
        </ErrorBoundary>
      </Box>
      <BottomNav
        active={activeTab}
        onChange={setActiveTab}
        pendingTasks={pendingCount}
        openEscalations={openEscalations.length}
        reflectionMissing={!reflections[today]}
      />
      <Dialog open={gateOpen} onClose={() => setGateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Shift todos must be 100% done</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {pendingCount} item{pendingCount === 1 ? '' : 's'} still open. Pending task hours do not count until submitted.
          </Typography>
          <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 4, mb: 2 }} />
          {pendingTasks.map((task) => (
            <Box key={task.task_id} sx={{ py: 0.75 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{task.brief_explanation}</Typography>
              <Typography variant="caption" color="text.secondary">
                {task.task_hours ?? 0}h · submit to {task.submit_to} · due {task.completion_date}
              </Typography>
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGateOpen(false)}>Keep working</Button>
          <Button variant="contained" onClick={() => { setGateOpen(false); setActiveTab('tasks'); }}>Open Shift Todo</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default function Root() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppProvider>
        <App />
      </AppProvider>
    </ThemeProvider>
  );
}
