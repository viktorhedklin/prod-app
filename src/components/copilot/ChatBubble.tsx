import React from 'react';
import { motion } from 'motion/react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import { useTheme } from '@mui/material/styles';

// MUI Icons
import BoltIcon from '@mui/icons-material/Bolt';
import SparklesIcon from '@mui/icons-material/AutoAwesome';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';

import type { ChatMessage } from '../CopilotInterface';

interface ChatBubbleProps {
  msg: ChatMessage;
}

// Parse **bold** markdown tags in strings
function parseBoldText(str: string) {
  const parts = str.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <Box component="span" key={i} sx={{ fontWeight: 700, color: 'text.primary' }}>
          {part.slice(2, -2)}
        </Box>
      );
    }
    return part;
  });
}

// Format AI text into structured blocks (bold, bullet points, headers)
function renderFormattedText(text: string) {
  const lines = text.split('\n');
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <Box key={idx} sx={{ height: 4 }} />;

        // Header line
        if (trimmed.startsWith('###') || trimmed.startsWith('##') || trimmed.startsWith('#')) {
          const headerText = trimmed.replace(/^#+\s*/, '');
          return (
            <Typography
              key={idx}
              variant="subtitle2"
              sx={{ fontWeight: 800, color: 'primary.main', mt: 0.5, fontSize: '0.95rem' }}
            >
              {headerText}
            </Typography>
          );
        }

        // Bullet line
        if (trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('* ')) {
          const bulletContent = trimmed.substring(2);
          return (
            <Box key={idx} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, pl: 0.5 }}>
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  bgcolor: 'primary.main',
                  mt: 1,
                  flexShrink: 0,
                }}
              />
              <Typography variant="body2" sx={{ lineHeight: 1.6, color: 'text.primary', fontSize: '0.875rem' }}>
                {parseBoldText(bulletContent)}
              </Typography>
            </Box>
          );
        }

        // Standard paragraph line
        return (
          <Typography key={idx} variant="body2" sx={{ lineHeight: 1.6, color: 'text.primary', fontSize: '0.875rem' }}>
            {parseBoldText(trimmed)}
          </Typography>
        );
      })}
    </Box>
  );
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ msg }) => {
  const theme = useTheme();
  const isUser = msg.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.25 }}
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        width: '100%',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          gap: 1.25,
          maxWidth: { xs: '92%', sm: '80%', md: '72%' },
          flexDirection: isUser ? 'row-reverse' : 'row',
          alignItems: 'flex-start',
        }}
      >
        {/* Message Sender Icon / Avatar */}
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            bgcolor: isUser ? 'primary.main' : 'background.paper',
            color: isUser ? '#fff' : 'primary.main',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            border: isUser ? 'none' : '1px solid',
            borderColor: 'divider',
          }}
        >
          {isUser ? <PersonIcon sx={{ fontSize: 18 }} /> : <SmartToyIcon sx={{ fontSize: 18 }} />}
        </Box>

        {/* Message Bubble Container */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: isUser ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
            bgcolor: isUser
              ? 'primary.main'
              : theme.palette.mode === 'dark'
                ? 'background.paper'
                : '#FFFFFF',
            color: isUser ? '#FFFFFF' : 'text.primary',
            border: isUser ? 'none' : '1px solid',
            borderColor: 'divider',
            boxShadow: isUser
              ? '0 4px 14px rgba(13,148,136,0.3)'
              : '0 2px 10px rgba(0,0,0,0.04)',
            position: 'relative',
          }}
        >
          {/* Optional Skill Tag Header */}
          {msg.skillTag && (
            <Chip
              label={msg.skillTag}
              size="small"
              icon={<SparklesIcon sx={{ fontSize: '12px !important', color: '#fff !important' }} />}
              sx={{
                height: 20,
                fontSize: '0.65rem',
                fontWeight: 700,
                mb: 1,
                bgcolor: isUser ? 'rgba(255,255,255,0.25)' : 'primary.main',
                color: '#fff',
              }}
            />
          )}

          {/* Tool Activity Log (agent actions) */}
          {!isUser && msg.toolLog && msg.toolLog.length > 0 && (
            <Box
              sx={{
                mb: 1.5,
                p: 1,
                borderRadius: 1,
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(20,184,166,0.08)' : 'rgba(13,148,136,0.06)',
                border: '1px dashed',
                borderColor: 'primary.light',
              }}
            >
              <Typography
                variant="caption"
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 700, color: 'primary.main' }}
              >
                <BoltIcon sx={{ fontSize: 13 }} /> ACTIONS EXECUTED ({msg.toolLog.length})
              </Typography>
              {msg.toolLog.map((t, i) => (
                <Typography key={i} variant="caption" sx={{ display: 'block', fontSize: '0.68rem', fontFamily: 'monospace', color: 'text.secondary', mt: 0.25 }}>
                  ⚙ {t}
                </Typography>
              ))}
            </Box>
          )}

          {/* Formatted Content */}
          {isUser ? (
            <Typography variant="body2" sx={{ lineHeight: 1.55, whiteSpace: 'pre-wrap', fontSize: '0.875rem' }}>
              {msg.content}
            </Typography>
          ) : (
            renderFormattedText(msg.content)
          )}

          {/* Timestamp */}
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              mt: 1,
              fontSize: '0.68rem',
              opacity: isUser ? 0.8 : 0.6,
              textAlign: isUser ? 'right' : 'left',
            }}
          >
            {msg.timestamp}
          </Typography>
        </Paper>
      </Box>
    </motion.div>
  );
};

export default ChatBubble;
