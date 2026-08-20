import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import LinearProgress from '@mui/material/LinearProgress';
import IconButton from '@mui/material/IconButton';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useApp } from '../useApp';
import StatCard from '../components/StatCard';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import type { TaskItem } from '../types';
import { todayLocal } from '../dateUtils';

type FilterStatus = 'all' | 'pending' | 'submitted';

const TEMPLATES = [
  { name: 'Daily report', hours: 0.5, submit_to: 'TL' },
  { name: 'Case follow-up', hours: 1, submit_to: 'Queue' },
  { name: 'QA sample review', hours: 0.5, submit_to: 'QA' },
];

function TaskRow({
  task,
  onMarkSubmitted,
  onRemove,
}: {
  task: TaskItem;
  onMarkSubmitted: () => void;
  onRemove: () => void;
}) {
  const overdue =
    task.status === 'pending' && task.completion_date && task.completion_date < todayLocal();
  return (
    <Box
      sx={{
        py: 1.5,
        borderBottom: '1px solid',
        borderColor: 'divider',
        '&:last-child': { borderBottom: 'none' },
        opacity: task.status === 'submitted' ? 0.65 : 1,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25, flexWrap: 'wrap' }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {task.brief_explanation}
            </Typography>
            {overdue && (
              <Chip
                label="Overdue"
                size="small"
                sx={{ bgcolor: 'error.light', color: 'error.main', fontWeight: 600, height: 18, fontSize: '0.65rem' }}
              />
            )}
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Task ID: <strong>{task.source_task_id || task.task_id}</strong>
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Submit to: <strong>{task.submit_to}</strong>
            </Typography>
            {task.task_hours !== null && (
              <Typography variant="caption" color="text.secondary">
                Hours: <strong>{task.task_hours}h</strong>
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary">
              Due: <strong>{task.completion_date ?? task.linked_date}</strong>
            </Typography>
          </Box>
          {task.additional_info && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              {task.additional_info}
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
          <Chip
            label={task.status === 'pending' ? 'Pending' : 'Submitted'}
            size="small"
            sx={
              task.status === 'pending'
                ? { bgcolor: 'warning.main', color: 'warning.contrastText', fontWeight: 600 }
                : { bgcolor: 'success.main', color: 'success.contrastText', fontWeight: 600 }
            }
          />
          {task.status === 'pending' && (
            <Button size="small" variant="outlined" onClick={onMarkSubmitted} sx={{ fontSize: '0.75rem' }}>
              Mark Submitted
            </Button>
          )}
          <IconButton size="small" onClick={onRemove} aria-label="Delete task">
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
}

export default function Tasks() {
  const { tasks, addTask, updateTask, removeTask, notify } = useApp();
  const today = todayLocal();
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [form, setForm] = useState({
    brief_explanation: '',
    source_task_id: '',
    submit_to: '',
    task_hours: '',
    completion_date: today,
    additional_info: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const stats = useMemo(() => {
    const pending = tasks.filter((t) => t.status === 'pending');
    const submitted = tasks.filter((t) => t.status === 'submitted');
    return {
      pending: pending.length,
      submitted: submitted.length,
      total: tasks.length,
      pendingHours: pending.reduce((s, t) => s + (t.task_hours ?? 0), 0),
      submittedHours: submitted.reduce((s, t) => s + (t.task_hours ?? 0), 0),
    };
  }, [tasks]);

  const progress = stats.total === 0 ? 100 : Math.round((stats.submitted / stats.total) * 100);
  const allDone = stats.pending === 0;

  const handleSubmit = () => {
    const errs: Record<string, string> = {};
    if (!form.brief_explanation.trim()) errs.brief_explanation = 'Required';
    if (!form.submit_to.trim()) errs.submit_to = 'Required';
    if (!form.completion_date) errs.completion_date = 'Required';
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    addTask({
      brief_explanation: form.brief_explanation.trim(),
      source_task_id: form.source_task_id.trim() || null,
      submit_to: form.submit_to.trim(),
      amount: null,
      task_hours: form.task_hours !== '' ? parseFloat(form.task_hours) : null,
      status: 'pending',
      linked_date: today,
      completion_date: form.completion_date,
      additional_info: form.additional_info.trim() || null,
    });

    setForm({
      brief_explanation: '',
      source_task_id: '',
      submit_to: form.submit_to,
      task_hours: '',
      completion_date: today,
      additional_info: '',
    });
    setErrors({});
    notify('Added to your shift todo list. Hours count only after you submit it.');
  };

  const applyTemplate = (template: (typeof TEMPLATES)[number]) => {
    setForm((f) => ({
      ...f,
      brief_explanation: template.name,
      task_hours: String(template.hours),
      submit_to: f.submit_to || template.submit_to,
    }));
  };

  const filtered = tasks.filter((t) => (filter === 'all' ? true : t.status === filter));

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 900, mx: 'auto' }}>
      <PageHeader
        title="Tasks"
        subtitle="Track what you need to submit before your shift ends."
      />
      {/* Shift progress / logout gate */}
      <StatCard title="Shift progress">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {stats.submitted}/{stats.total} tasks done
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {stats.submittedHours.toFixed(1)}h submitted · {stats.pendingHours.toFixed(1)}h pending
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: 8,
            borderRadius: 4,
            bgcolor: 'action.hover',
            '& .MuiLinearProgress-bar': {
              bgcolor: allDone ? 'success.main' : 'warning.main',
              borderRadius: 4,
              transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)',
            },
          }}
        />
        <Box
          sx={{
            mt: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            borderRadius: 2,
            p: 1.5,
            bgcolor: allDone ? 'success.light' : 'warning.light',
            border: '1px solid',
            borderColor: allDone ? 'success.main' : 'warning.main',
          }}
        >
          {allDone ? (
            <>
              <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main' }} />
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main' }}>
                Your shift todo list is 100% complete — you're clear to log out.
              </Typography>
            </>
          ) : (
            <>
              <WarningAmberIcon sx={{ fontSize: 18, color: 'warning.main' }} />
              <Typography variant="body2" sx={{ color: 'warning.main' }}>
                {stats.pending} task{stats.pending === 1 ? '' : 's'} still pending. All tasks must be
                submitted before you can log out.
              </Typography>
            </>
          )}
        </Box>
      </StatCard>

      {/* New Task Form */}
      <Box sx={{ mt: 2 }}>
        <StatCard title="Add to shift todo list">
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              <TextField
                label="Task / work name"
                value={form.brief_explanation}
                onChange={(e) => setForm((f) => ({ ...f, brief_explanation: e.target.value }))}
                error={!!errors.brief_explanation}
                helperText={errors.brief_explanation}
                sx={{ flex: 2, minWidth: 200 }}
                size="small"
              />
              <TextField
                label="Task ID (official)"
                value={form.source_task_id}
                onChange={(e) => setForm((f) => ({ ...f, source_task_id: e.target.value }))}
                placeholder="e.g. TSK-12345"
                sx={{ flex: 1, minWidth: 130 }}
                size="small"
              />
              <TextField
                label="Submit To"
                value={form.submit_to}
                onChange={(e) => setForm((f) => ({ ...f, submit_to: e.target.value }))}
                error={!!errors.submit_to}
                helperText={errors.submit_to}
                sx={{ flex: 1, minWidth: 130 }}
                size="small"
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              <TextField
                label="Task Hours"
                type="number"
                value={form.task_hours}
                onChange={(e) => setForm((f) => ({ ...f, task_hours: e.target.value }))}
                sx={{ flex: 1, minWidth: 120 }}
                size="small"
                inputProps={{ min: 0, step: '0.5' }}
                slotProps={{ input: { endAdornment: <InputAdornment position="end">h</InputAdornment> } }}
              />
              <TextField
                label="Completion Date"
                type="date"
                value={form.completion_date}
                onChange={(e) => setForm((f) => ({ ...f, completion_date: e.target.value }))}
                error={!!errors.completion_date}
                helperText={errors.completion_date}
                sx={{ flex: 1, minWidth: 150 }}
                size="small"
              />
            </Box>
            <TextField
              label="Details — what you did (optional)"
              value={form.additional_info}
              onChange={(e) => setForm((f) => ({ ...f, additional_info: e.target.value }))}
              multiline
              minRows={2}
              size="small"
              fullWidth
            />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Button variant="contained" onClick={handleSubmit} sx={{ fontWeight: 600 }}>
                + Add Task
              </Button>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                <Typography variant="caption" color="text.secondary">
                  Quick add:
                </Typography>
                {TEMPLATES.map((t) => (
                  <Button key={t.name} size="small" variant="outlined" onClick={() => applyTemplate(t)} sx={{ fontSize: '0.7rem' }}>
                    {t.name}
                  </Button>
                ))}
              </Box>
            </Box>
          </Box>
        </StatCard>
      </Box>

      {/* Task List */}
      <Box sx={{ mt: 2 }}>
        <Card elevation={0}>
          <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 600,
                  color: 'text.secondary',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  fontSize: '0.7rem',
                }}
              >
                All Tasks ({filtered.length})
              </Typography>
              <ButtonGroup size="small" variant="outlined">
                {(['all', 'pending', 'submitted'] as FilterStatus[]).map((s) => (
                  <Button
                    key={s}
                    onClick={() => setFilter(s)}
                    sx={{
                      px: 1.5,
                      fontSize: '0.75rem',
                      fontWeight: filter === s ? 600 : 400,
                      bgcolor: filter === s ? 'primary.main' : 'transparent',
                      color: filter === s ? 'primary.contrastText' : 'text.secondary',
                      borderColor: 'divider',
                      textTransform: 'capitalize',
                      '&:hover': {
                        bgcolor: filter === s ? 'primary.dark' : 'action.hover',
                      },
                    }}
                  >
                    {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                  </Button>
                ))}
              </ButtonGroup>
            </Box>
            <Divider sx={{ mb: 1 }} />
            {filtered.length === 0 ? (
              <EmptyState
                icon={<CheckCircleIcon sx={{ fontSize: 40 }} />}
                title={filter === 'all' ? 'No tasks yet.' : `No ${filter} tasks.`}
                hint={
                  filter === 'all'
                    ? 'Add your shift work above to start tracking task hours.'
                    : 'Try a different filter, or add new tasks above.'
                }
              />
            ) : (
              filtered.map((task) => (
                <TaskRow
                  key={task.task_id}
                  task={task}
                  onMarkSubmitted={() => {
                    updateTask(task.task_id, { status: 'submitted', submitted_at: new Date().toISOString() });
                    notify('Task marked as submitted. Hours now count toward your score.');
                  }}
                  onRemove={() => removeTask(task.task_id)}
                />
              ))
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}