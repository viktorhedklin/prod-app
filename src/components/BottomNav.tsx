import { useState } from 'react';
import Paper from '@mui/material/Paper';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Badge from '@mui/material/Badge';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined';
import ChecklistOutlinedIcon from '@mui/icons-material/ChecklistOutlined';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';

export type AppTab = 'dashboard' | 'today' | 'tasks' | 'escalations' | 'reflection' | 'growth' | 'qa';

interface Props {
  active: AppTab;
  onChange: (tab: AppTab) => void;
  pendingTasks: number;
  openEscalations: number;
  reflectionMissing: boolean;
}

export default function BottomNav({ active, onChange, pendingTasks, openEscalations, reflectionMissing }: Props) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const moreOpen = Boolean(anchor);
  const moreActive = active === 'escalations' || active === 'qa' || active === 'growth';

  return (
    <Paper
      elevation={8}
      sx={{
        display: { xs: 'block', md: 'none' },
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1200,
        borderRadius: 0,
        borderTop: '1px solid',
        borderColor: 'divider',
      }}
    >
      <BottomNavigation
        showLabels
        value={moreActive ? 'more' : active}
        onChange={(_, value: string) => {
          if (value === 'more') return;
          onChange(value as AppTab);
        }}
      >
        <BottomNavigationAction value="dashboard" label="Home" icon={<HomeOutlinedIcon />} />
        <BottomNavigationAction value="today" label="Log" icon={<EditNoteOutlinedIcon />} />
        <BottomNavigationAction
          value="tasks"
          label="Todo"
          icon={
            <Badge badgeContent={pendingTasks} color="error" invisible={pendingTasks === 0}>
              <ChecklistOutlinedIcon />
            </Badge>
          }
        />
        <BottomNavigationAction
          value="reflection"
          label="Reflect"
          icon={
            <Badge variant="dot" color="error" invisible={!reflectionMissing}>
              <LightbulbOutlinedIcon />
            </Badge>
          }
        />
        <BottomNavigationAction
          value="more"
          label="More"
          icon={
            <Badge badgeContent={openEscalations} color="error" invisible={openEscalations === 0}>
              <MoreHorizIcon />
            </Badge>
          }
          onClick={(event) => setAnchor(event.currentTarget)}
        />
      </BottomNavigation>
      <Menu anchorEl={anchor} open={moreOpen} onClose={() => setAnchor(null)}>
        <MenuItem onClick={() => { onChange('escalations'); setAnchor(null); }}>Escalations</MenuItem>
        <MenuItem onClick={() => { onChange('qa'); setAnchor(null); }}>QA Review</MenuItem>
        <MenuItem onClick={() => { onChange('growth'); setAnchor(null); }}>My Growth</MenuItem>
      </Menu>
    </Paper>
  );
}
