import { useState } from 'react';
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
import { useApp } from '../AppContext';
import StatCard from '../components/StatCard';
import type { TaskItem } from '../types';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

type FilterStatus = 'all' | 'pending' | 'submitted';

function TaskRow({
  task,
  onMarkSubmitted,
}: {
  task: TaskItem;
  onMarkSubmitted: () => void;
}) {
  const isOverdue = task.status === 'pending' && task.linked_date !== today();
  return (
    <Box
      sx={{
        py: 1.5,
        px: 0,
        borderBottom: '1px solid',
        borderColor: 'divider',
        '&:last-child': { borderBottom: 'none' },
        opacity: task.status === 'submitted' ? 0.6 : 1,
        transition: 'opacity 150ms ease',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
              {task.brief_explanation}
            </Typography>
            {isOverdue && (
              <Chip
                label="Overdue"
                size="small"
                sx={{ bgcolor: 'error.main', color: 'error.contrastText', fontWeight: 600, height: 18, fontSize: '0.65rem' }}
              />
            )}
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Submit to: <strong>{task.submit_to}</strong>
            </Typography>
            {task.task_hours !== null && (
              <Typography variant="caption" color="text.secondary">
                Task hours: <strong>{task.task_hours}h</strong>
              </Typography>
            )}
            {task.amount !== null && (
              <Typography variant="caption" color="text.secondary">
                Amount: <strong>${task.amount}</strong>
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary">
              {task.task_id}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {task.linked_date}
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
            <Button
              size="small"
              variant="outlined"
              onClick={onMarkSubmitted}
              sx={{
                fontSize: '0.75rem',
                borderColor: 'divider',
                color: 'text.secondary',
                '&:hover': { borderColor: 'primary.main', color: 'primary.main' },
              }}
            >
              Mark Submitted
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
}

export default function Tasks() {
  const { tasks, addTask, updateTask, notify } = useApp();
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [form, setForm] = useState({
    brief_explanation: '',
    submit_to: '',
    amount: '',
    task_hours: '',
    additional_info: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = () => {
    const errs: Record<string, string> = {};
    if (!form.brief_explanation.trim()) errs.brief_explanation = 'Required';
    if (!form.submit_to.trim()) errs.submit_to = 'Required';
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    addTask({
      brief_explanation: form.brief_explanation.trim(),
      submit_to: form.submit_to.trim(),
      amount: form.amount !== '' ? parseFloat(form.amount) : null,
      task_hours: form.task_hours !== '' ? parseFloat(form.task_hours) : null,
      status: 'pending',
      linked_date: today(),
      additional_info: form.additional_info.trim() || null,
    });

    setForm({ brief_explanation: '', submit_to: '', amount: '', task_hours: '', additional_info: '' });
    setErrors({});
    notify('Task added to your shift checklist');
  };

  const handleMarkSubmitted = (taskId: string) => {
    updateTask(taskId, { status: 'submitted', submitted_at: new Date().toISOString() });
    notify('Task marked as submitted');
  };

  const filtered = tasks.filter((t) => {
    if (filter === 'all') return true;
    return t.status === filter;
  });

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 900, mx: 'auto' }}>
      {/* New Task Form */}
      <StatCard title="New Task">
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <TextField
              label="Brief Explanation"
              value={form.brief_explanation}
              onChange={(e) => setForm((f) => ({ ...f, brief_explanation: e.target.value }))}
              error={!!errors.brief_explanation}
              helperText={errors.brief_explanation}
              sx={{ flex: 2, minWidth: 200 }}
              size="small"
            />
            <TextField
              label="Submit To"
              value={form.submit_to}
              onChange={(e) => setForm((f) => ({ ...f, submit_to: e.target.value }))}
              error={!!errors.submit_to}
              helperText={errors.submit_to}
              sx={{ flex: 1, minWidth: 140 }}
              size="small"
            />
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
              label="Amount (optional)"
              type="number"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              sx={{ flex: 1, minWidth: 120 }}
              size="small"
              inputProps={{ min: 0, step: '0.01' }}
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
          <Box>
            <Button
              variant="contained"
              onClick={handleSubmit}
              sx={{ fontWeight: 600 }}
            >
              + Add Task
            </Button>
          </Box>
        </Box>
      </StatCard>

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
              <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                No tasks found.
              </Typography>
            ) : (
              filtered.map((task) => (
                <TaskRow
                  key={task.task_id}
                  task={task}
                  onMarkSubmitted={() => handleMarkSubmitted(task.task_id)}
                />
              ))
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
