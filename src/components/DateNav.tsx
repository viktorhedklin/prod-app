import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { addDays, clampToToday, formatLongDate, isToday, todayLocal } from '../dates';

interface Props {
  date: string;
  onChange: (date: string) => void;
  datesWithData?: Set<string>;
}

export default function DateNav({ date, onChange, datesWithData }: Props) {
  const today = todayLocal();
  const atToday = isToday(date);
  const hasData = datesWithData?.has(date) ?? false;

  const go = (next: string) => {
    onChange(clampToToday(next));
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
        <IconButton size="small" onClick={() => go(addDays(date, -1))} aria-label="Previous day">
          <ChevronLeftIcon />
        </IconButton>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
            {formatLongDate(date)}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.5 }}>
            {!atToday && (
              <Chip label="Backfill" size="small" sx={{ height: 20, fontWeight: 600 }} color="primary" variant="outlined" />
            )}
            {hasData ? (
              <Chip label="Has data" size="small" sx={{ height: 20 }} color="success" variant="outlined" />
            ) : (
              <Chip label="Empty day" size="small" sx={{ height: 20 }} variant="outlined" />
            )}
          </Box>
        </Box>
        <IconButton size="small" onClick={() => go(addDays(date, 1))} disabled={atToday} aria-label="Next day">
          <ChevronRightIcon />
        </IconButton>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <TextField
          type="date"
          size="small"
          value={date}
          onChange={(e) => go(e.target.value)}
          slotProps={{ htmlInput: { max: today } }}
          sx={{ width: 160 }}
        />
        {!atToday && (
          <Button size="small" onClick={() => onChange(today)}>
            Today
          </Button>
        )}
      </Box>
    </Box>
  );
}
