import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import type { MoodType } from '../types';

const MOODS: Array<{ type: MoodType; emoji: string; label: string }> = [
  { type: 'great', emoji: '😄', label: 'Great' },
  { type: 'good', emoji: '🙂', label: 'Good' },
  { type: 'okay', emoji: '😐', label: 'Okay' },
  { type: 'stressed', emoji: '😟', label: 'Stressed' },
  { type: 'overwhelmed', emoji: '😫', label: 'Overwhelmed' },
];

interface Props {
  selected: MoodType | null;
  onSelect: (mood: MoodType) => void;
  size?: 'small' | 'large';
}

export default function MoodSelector({ selected, onSelect, size = 'large' }: Props) {
  const btnSize = size === 'small' ? 32 : 44;
  const fontSize = size === 'small' ? '1.3rem' : '1.8rem';

  return (
    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
      {MOODS.map((mood) => {
        const isSelected = selected === mood.type;
        return (
          <Tooltip key={mood.type} title={mood.label} arrow>
            <IconButton
              onClick={() => onSelect(mood.type)}
              sx={{
                width: btnSize,
                height: btnSize,
                fontSize,
                border: '2px solid',
                borderColor: isSelected ? 'primary.main' : 'divider',
                bgcolor: isSelected ? 'primary.light' : 'transparent',
                borderRadius: 2,
                transition: 'all 150ms ease',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: isSelected ? 'primary.light' : 'action.hover',
                },
              }}
            >
              {mood.emoji}
            </IconButton>
          </Tooltip>
        );
      })}
    </Box>
  );
}

export function moodEmoji(mood: MoodType | null): string {
  if (!mood) return '—';
  return MOODS.find((m) => m.type === mood)?.emoji ?? '—';
}

export function moodLabel(mood: MoodType | null): string {
  if (!mood) return 'Not set';
  return MOODS.find((m) => m.type === mood)?.label ?? 'Not set';
}

export { MOODS };
