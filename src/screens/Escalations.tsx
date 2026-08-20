import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import TextField from '@mui/material/TextField';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import InboxIcon from '@mui/icons-material/Inbox';
import { useApp } from '../AppContext';
import StatCard from '../components/StatCard';
import PageHeader from '../components/PageHeader';
import { todayLocal } from '../dateUtils';
import type { EscalationItem } from '../types';

function today(): string {
  return todayLocal();
}

type FilterStatus = 'all' | 'open' | 'escalated' | 'resolved';

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  open: { bg: '#FEF3C7', color: '#B45309' },
  escalated: { bg: '#EAF6EF', color: '#15803D' },
  resolved: { bg: '#F0F0F0', color: '#5D6B68' },
};

function EscalationRow({
  esc,
  onAdvance,
}: {
  esc: EscalationItem;
  onAdvance: () => void;
}) {
  const isOverdue =
    esc.status !== 'resolved' && esc.linked_date !== today();
  const styles = STATUS_STYLES[esc.status] ?? STATUS_STYLES['open'];

  return (
    <Box
      sx={{
        py: 1.5,
        borderBottom: '1px solid',
        borderColor: 'divider',
        '&:last-child': { borderBottom: 'none' },
        opacity: esc.status === 'resolved' ? 0.6 : 1,
        transition: 'opacity 150ms ease',
      }}
    >
      <Box
        sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Case {esc.case_number}
            </Typography>
            {isOverdue && (
              <Chip
                label="Overdue"
                size="small"
                sx={{ bgcolor: '#FDECEC', color: '#B91C1C', fontWeight: 600, height: 18, fontSize: '0.65rem' }}
              />
            )}
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Escalate to: <strong>{esc.escalate_to}</strong>
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Reason: <strong>{esc.reason}</strong>
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {esc.escalation_id}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {esc.linked_date}
            </Typography>
          </Box>
          {esc.additional_info && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              {esc.additional_info}
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
          <Chip
            label={esc.status.charAt(0).toUpperCase() + esc.status.slice(1)}
            size="small"
            sx={{ bgcolor: styles.bg, color: styles.color, fontWeight: 600 }}
          />
          {esc.status !== 'resolved' && (
            <Button
              size="small"
              variant="outlined"
              onClick={onAdvance}
              sx={{
                fontSize: '0.75rem',
                borderColor: '#E4E4E4',
                color: 'text.secondary',
                '&:hover': { borderColor: 'primary.main', color: 'primary.main' },
              }}
            >
              {esc.status === 'open' ? 'Mark Escalated' : 'Mark Resolved'}
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
}

export default function Escalations() {
  const { escalations, addEscalation, updateEscalation, notify } = useApp();
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [form, setForm] = useState({
    case_number: '',
    escalate_to: '',
    reason: '',
    additional_info: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = () => {
    const errs: Record<string, string> = {};
    if (!form.case_number.trim()) errs.case_number = 'Required';
    if (!form.escalate_to.trim()) errs.escalate_to = 'Required';
    if (!form.reason.trim()) errs.reason = 'Required';
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    addEscalation({
      case_number: form.case_number.trim(),
      escalate_to: form.escalate_to.trim(),
      reason: form.reason.trim(),
      status: 'open',
      linked_date: today(),
      additional_info: form.additional_info.trim() || null,
    });

    setForm({ case_number: '', escalate_to: '', reason: '', additional_info: '' });
    setErrors({});
    notify('Escalation added to your checklist');
  };

  const handleAdvance = (esc: EscalationItem) => {
    const nextStatus = esc.status === 'open' ? 'escalated' : 'resolved';
    const patch: Partial<EscalationItem> = { status: nextStatus as 'escalated' | 'resolved' };
    if (nextStatus === 'escalated') patch.escalated_at = new Date().toISOString();
    updateEscalation(esc.escalation_id, patch);
    notify(nextStatus === 'resolved' ? 'Escalation resolved' : 'Escalation marked for follow-up');
  };

  const filtered = escalations.filter((e) => {
    if (filter === 'all') return true;
    return e.status === filter;
  });

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 900, mx: 'auto' }}>
      <PageHeader
        title="Escalations"
        subtitle="Log and track escalations, then make sure accuracy is on point."
      />
      {/* New Escalation Form */}
      <StatCard title="New Escalation">
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <TextField
              label="Case Number"
              value={form.case_number}
              onChange={(e) => setForm((f) => ({ ...f, case_number: e.target.value }))}
              error={!!errors.case_number}
              helperText={errors.case_number}
              sx={{ flex: 1, minWidth: 140 }}
              size="small"
            />
            <TextField
              label="Escalate To"
              value={form.escalate_to}
              onChange={(e) => setForm((f) => ({ ...f, escalate_to: e.target.value }))}
              error={!!errors.escalate_to}
              helperText={errors.escalate_to}
              sx={{ flex: 1, minWidth: 140 }}
              size="small"
            />
            <TextField
              label="Reason"
              value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              error={!!errors.reason}
              helperText={errors.reason}
              sx={{ flex: 2, minWidth: 200 }}
              size="small"
            />
          </Box>
          <TextField
            label="Additional Info (optional)"
            value={form.additional_info}
            onChange={(e) => setForm((f) => ({ ...f, additional_info: e.target.value }))}
            multiline
            minRows={2}
            size="small"
            fullWidth
          />
          <Box>
            <Button variant="contained" onClick={handleSubmit} sx={{ fontWeight: 600 }}>
              + Add Escalation
            </Button>
          </Box>
        </Box>
      </StatCard>

      {/* Escalation List */}
      <Box sx={{ mt: 2 }}>
        <Card elevation={0}>
          <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 2,
              }}
            >
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
                All Escalations ({filtered.length})
              </Typography>
              <ButtonGroup size="small" variant="outlined">
                {(['all', 'open', 'escalated', 'resolved'] as FilterStatus[]).map((s) => (
                  <Button
                    key={s}
                    onClick={() => setFilter(s)}
                    sx={{
                      px: 1.5,
                      fontSize: '0.75rem',
                      fontWeight: filter === s ? 600 : 400,
                      bgcolor: filter === s ? 'primary.main' : 'transparent',
                      color: filter === s ? 'primary.contrastText' : 'text.secondary',
                      borderColor: '#E4E4E4',
                      textTransform: 'capitalize',
                      '&:hover': {
                        bgcolor: filter === s ? 'primary.dark' : 'action.hover',
                      },
                    }}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </Button>
                ))}
              </ButtonGroup>
            </Box>
            <Divider sx={{ mb: 1 }} />
            {filtered.length === 0 ? (
              <Box
                sx={{
                  py: 4,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 1,
                  textAlign: 'center',
                }}
              >
                <InboxIcon sx={{ fontSize: 40, color: 'text.disabled' }} />
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                  No escalations found.
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 320 }}>
                  {filter === 'all'
                    ? 'Escalations you log here will appear in this list.'
                    : 'Try a different filter, or add a new escalation above.'}
                </Typography>
              </Box>
            ) : (
              filtered.map((esc) => (
                <EscalationRow
                  key={esc.escalation_id}
                  esc={esc}
                  onAdvance={() => handleAdvance(esc)}
                />
              ))
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
