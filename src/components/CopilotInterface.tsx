import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

// MUI Icons
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import SparklesIcon from '@mui/icons-material/AutoAwesome';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import ReportIcon from '@mui/icons-material/Report';
import DashboardIcon from '@mui/icons-material/Dashboard';
import TodayIcon from '@mui/icons-material/Today';

import { useApp } from '../useApp';
import { runIntelligencePipeline } from '../intelligence';
import { runAgent } from '../copilotAgentLoop';
import { computeWeightedGrade } from '../grading';

import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import LivingAvatar, { type LivingAvatarState } from './LivingAvatar';
import { setJarvisEngagement } from '../jarvisEngagementStore';
import type { JarvisStateName } from '../jarvisState';
import ChatBubble from './copilot/ChatBubble';
import SkillForms from './copilot/SkillForms';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  skillTag?: string;
  /** Tool actions VESPER executed to produce this reply (agent loop). */
  toolLog?: string[];
}

export interface CopilotInterfaceProps {
  onNavigate?: (tab: string) => void;
}

export default function CopilotInterface({ onNavigate }: CopilotInterfaceProps) {
  const ctx = useApp();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Chat conversation state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [avatarState, setAvatarState] = useState<LivingAvatarState>('idle');

  // Map the SVG avatar's emotional state onto the global JARVIS engagement
  // signal, so the 3D core / HUD chrome on ANY screen reacts live to what
  // the copilot is actually doing right now (voice, agent-loop, sentiment).
  const applyAvatarState = useCallback((state: LivingAvatarState) => {
    setAvatarState(state);
    const JARVIS_MAP: Record<LivingAvatarState, JarvisStateName | 'resolved'> = {
      idle: 'idle',
      listening: 'listening',
      thinking: 'thinking',
      speaking: 'thinking',
      happy: 'resolved',
      celebrating: 'resolved',
      concerned: 'error',
    };
    const load = state === 'thinking' ? 0.85 : state === 'speaking' ? 0.65 : state === 'listening' ? 0.45 : 0.2;
    setJarvisEngagement(JARVIS_MAP[state], load);
  }, []);
  const [activeSkillId, setActiveSkillId] = useState<string | null>(null);

  // Speech Recognition hook
  const { isListeningVoice, errorText, setErrorText, toggleVoiceInput } = useSpeechRecognition(
    (transcript) => setInput(transcript),
    (state) => applyAvatarState(state)
  );

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sentimentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      if (sentimentTimerRef.current) clearTimeout(sentimentTimerRef.current);
    };
  }, []);

  // Stats calculation for slim Context Bar
  const pendingTasks = useMemo(() => ctx.tasks.filter((t) => t.status === 'pending'), [ctx.tasks]);
  const openEscalations = useMemo(
    () => ctx.escalations.filter((e) => e.status === 'open' || e.status === 'escalated'),
    [ctx.escalations]
  );
  const gradeResult = useMemo(
    () => computeWeightedGrade(Object.values(ctx.entries).slice(-7), ctx.targets),
    [ctx.entries, ctx.targets]
  );

  // JARVIS intelligence: forecast + behavioral patterns + proactive triggers
  const intel = useMemo(
    () => runIntelligencePipeline({ entries: ctx.entries, tasks: ctx.tasks, escalations: ctx.escalations, targets: ctx.targets }),
    [ctx.entries, ctx.tasks, ctx.escalations, ctx.targets]
  );

  // Auto-scroll to bottom of conversation
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  // Proactive greeting on mount
  useEffect(() => {
    let unmounted = false;
    const initGreeting = async () => {
      applyAvatarState('thinking');
      setIsLoading(true);

      try {
        const triggerLines = intel.triggers.map((t) => `- [${t.priority}] ${t.userMessage}`).join('\n');
        const forecastLine = intel.forecast
          ? `Weekly forecast: projected score ${intel.forecast.projectedScore.toFixed(2)}/5, trend ${intel.forecast.trend}, ${intel.forecast.daysRemaining} day(s) remaining.`
          : 'No weekly forecast yet (no entries logged this week).';
        const greetingPrompt = `Greeting request: The user has just opened VESPER AI Copilot. Provide a brief (2-4 sentences), warm, proactive contextual greeting in the style of JARVIS — confident, precise, a touch of personality. Reference today's metrics, pending tasks count (${pendingTasks.length}), or recent grade (${gradeResult.grade || 'N/A'}) where natural. Intelligence context — ${forecastLine} Detected patterns: ${intel.patterns.length}. Active alerts:\n${triggerLines || '- None'} — weave in at most one alert if it is high priority. Ask how you can assist them today.`;

        const response = (await runAgent(greetingPrompt, [], ctx)).reply;
        if (unmounted) return;

        setMessages([
          {
            id: 'init-1',
            role: 'assistant',
            content: response,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);

        applyAvatarState('speaking');
        setTimeout(() => {
          if (!unmounted) applyAvatarState('happy');
          setTimeout(() => {
            if (!unmounted) applyAvatarState('idle');
          }, 3000);
        }, 3000);

      } catch {
        if (unmounted) return;
        // Fallback default proactive greeting
        const fallback = `👋 **Welcome back! I'm VESPER, your AI Copilot.**\n\n` +
          `You currently have a **7-Day Grade of ${gradeResult.grade || 'A'}** (${gradeResult.score !== null ? gradeResult.score.toFixed(2) : '4.5'} / 5.0) and **${pendingTasks.length} pending task(s)** in your backlog.\n\n` +
          `Select a quick skill below or type any prompt to get started!`;

        setMessages([
          {
            id: 'init-1',
            role: 'assistant',
            content: fallback,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        applyAvatarState('idle');
      } finally {
        if (!unmounted) setIsLoading(false);
      }
    };

    if (messages.length === 0 && !ctx.loading) {
      initGreeting();
    }
    return () => { unmounted = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.loading]);

  // Handle typing state sync with avatar 'listening'
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);

    if (val.trim().length > 0 && !isLoading) {
      applyAvatarState('listening');
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        applyAvatarState('idle');
      }, 2500);
    } else if (val.trim().length === 0 && avatarState === 'listening') {
      applyAvatarState('idle');
    }
  };

  // Process message submit
  const handleSendMessage = async (textToSend?: string, skillTag?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    if (sentimentTimerRef.current) clearTimeout(sentimentTimerRef.current);

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      skillTag,
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput('');
    setActiveSkillId(null);
    setErrorText(null);

    // Sync avatar state -> thinking
    applyAvatarState('thinking');
    setIsLoading(true);

    try {
      const { reply: aiReply, toolLog } = await runAgent(query, newHistory, ctx);

      const assistantMsg: ChatMessage = {
        id: `msg-ai-${Date.now()}`,
        role: 'assistant',
        content: aiReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        ...(toolLog.length > 0 ? { toolLog } : {}),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setIsLoading(false);

      // Avatar state -> speaking
      applyAvatarState('speaking');

      // Sentiment analysis for post-speaking state
      const lower = aiReply.toLowerCase();
      const isPositive = /great|congratulations|excellent|unlocked|s tier|win|fantastic|outstanding|achievement/.test(lower);
      const isConcern = /warning|backlog|behind|drop|overwhelmed|urgent|alert|concern|low/.test(lower);

      sentimentTimerRef.current = setTimeout(() => {
        if (isPositive) {
          applyAvatarState('celebrating');
        } else if (isConcern) {
          applyAvatarState('concerned');
        } else {
          applyAvatarState('happy');
        }

        sentimentTimerRef.current = setTimeout(() => {
          applyAvatarState('idle');
        }, 4000);
      }, 3500);

    } catch (err) {
      setIsLoading(false);
      applyAvatarState('concerned');
      const errMessage = err instanceof Error ? err.message : 'An error occurred while connecting to AI.';
      setErrorText(errMessage);

      setTimeout(() => {
        applyAvatarState('idle');
      }, 3000);
    }
  };

  return (
    <Box
      sx={{
        height: '100vh',
        maxHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
        color: 'text.primary',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* 1. Slim Context Bar (Top) */}
      <Box
        component="header"
        sx={{
          height: 48,
          flexShrink: 0,
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          px: { xs: 1.5, sm: 2.5 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 10,
          backdropFilter: 'blur(8px)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
              bgcolor: 'background.default',
              px: 1.25,
              py: 0.4,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <SparklesIcon sx={{ fontSize: 16, color: 'primary.main' }} />
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>
              Score: {gradeResult.score !== null ? gradeResult.score.toFixed(2) : '4.50'}/5.0
            </Typography>
            <Chip
              label={`Grade ${gradeResult.grade || 'A'}`}
              size="small"
              sx={{
                height: 18,
                fontSize: '0.65rem',
                fontWeight: 800,
                bgcolor: 'primary.main',
                color: '#fff',
                '& .MuiChip-label': { px: 0.75 },
              }}
            />
          </Box>

          <Chip
            icon={<TaskAltIcon sx={{ fontSize: '13px !important' }} />}
            label={`${pendingTasks.length} Pending Tasks`}
            size="small"
            onClick={() => onNavigate?.('tasks')}
            sx={{
              height: 24,
              fontSize: '0.7rem',
              fontWeight: 600,
              bgcolor: pendingTasks.length > 0 ? 'warning.soft' : 'action.hover',
              color: pendingTasks.length > 0 ? 'warning.main' : 'text.secondary',
              cursor: onNavigate ? 'pointer' : 'default',
              display: { xs: 'none', sm: 'inline-flex' },
            }}
          />

          {openEscalations.length > 0 && (
            <Chip
              icon={<ReportIcon sx={{ fontSize: '13px !important' }} />}
              label={`${openEscalations.length} Escalations`}
              size="small"
              onClick={() => onNavigate?.('escalations')}
              color="error"
              variant="outlined"
              sx={{
                height: 24,
                fontSize: '0.7rem',
                fontWeight: 600,
                cursor: onNavigate ? 'pointer' : 'default',
                display: { xs: 'none', sm: 'inline-flex' },
              }}
            />
          )}
        </Box>

        {/* Quick Nav Actions */}
        {onNavigate && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Tooltip title="View Dashboard">
              <IconButton size="small" onClick={() => onNavigate('dashboard')} sx={{ color: 'text.secondary' }}>
                <DashboardIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="View Today">
              <IconButton size="small" onClick={() => onNavigate('today')} sx={{ color: 'text.secondary' }}>
                <TodayIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="View Tasks">
              <IconButton size="small" onClick={() => onNavigate('tasks')} sx={{ color: 'text.secondary' }}>
                <TaskAltIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>

      {/* 2. Avatar Stage (Top Center, ~35-40% Height) */}
      <Box
        sx={{
          height: { xs: '32vh', sm: '38vh' },
          minHeight: 210,
          flexShrink: 0,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
          background:
            theme.palette.mode === 'dark'
              ? 'radial-gradient(circle at 50% 30%, rgba(20, 184, 166, 0.15) 0%, rgba(15, 23, 42, 0) 70%), #0F172A'
              : 'radial-gradient(circle at 50% 30%, rgba(20, 184, 166, 0.12) 0%, rgba(248, 250, 252, 0) 70%), #F8FAFC',
        }}
      >
        {/* Particle Ambient Grid Overlay */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'radial-gradient(rgba(20, 184, 166, 0.12) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            pointerEvents: 'none',
            opacity: 0.7,
          }}
        />

        {/* Living Avatar Component */}
        <LivingAvatar
          state={avatarState}
          size={isMobile ? 130 : 155}
          showStatus={true}
          name="VESPER"
          subtitle="Your Living AI Copilot"
        />
      </Box>

      {/* 3. Conversation Area (Center, Scrollable) */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          p: { xs: 2, sm: 3 },
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          scrollBehavior: 'smooth',
          bgcolor: 'background.default',
        }}
      >
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <ChatBubble key={msg.id} msg={msg} />
          ))}
        </AnimatePresence>

        {/* AI Thinking Pulse Indicator */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ display: 'flex', justifyContent: 'flex-start', width: '100%' }}
          >
            <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'center' }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  bgcolor: 'background.paper',
                  color: 'primary.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <CircularProgress size={16} color="primary" />
              </Box>
              <Paper
                elevation={0}
                sx={{
                  px: 2,
                  py: 1.5,
                  borderRadius: '4px 18px 18px 18px',
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                  VESPER is thinking…
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: '50%',
                        backgroundColor: theme.palette.primary.main,
                        display: 'inline-block',
                      }}
                      animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
                    />
                  ))}
                </Box>
              </Paper>
            </Box>
          </motion.div>
        )}

        {/* Error Alert Display */}
        {errorText && (
          <Alert severity="error" onClose={() => setErrorText(null)} sx={{ borderRadius: 2 }}>
            {errorText}
          </Alert>
        )}

        <div ref={messagesEndRef} />
      </Box>

      {/* 4 & 5. Interactive Skill Mini-Form Panel & Quick Skills Bar */}
      <SkillForms
        activeSkillId={activeSkillId}
        setActiveSkillId={setActiveSkillId}
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        ctx={ctx}
      />

      {/* 6. Input Area (Bottom Floating Bar) */}
      <Box
        component="footer"
        sx={{
          p: { xs: 1.5, sm: 2 },
          bgcolor: 'background.paper',
          borderTop: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Main Input Text Box */}
          <TextField
            fullWidth
            multiline
            maxRows={4}
            size="small"
            placeholder="Ask VESPER anything or request an action..."
            value={input}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !(e.nativeEvent as KeyboardEvent).isComposing) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            inputRef={inputRef}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 4,
                bgcolor: 'background.default',
                fontSize: '0.9rem',
                pr: 1,
              },
            }}
          />

          {/* Voice Microphone Button */}
          <Tooltip title={isListeningVoice ? 'Stop listening' : 'Voice input (Web Speech)'}>
            <IconButton
              onClick={toggleVoiceInput}
              color={isListeningVoice ? 'error' : 'default'}
              sx={{
                width: 42,
                height: 42,
                bgcolor: isListeningVoice ? 'error.soft' : 'background.default',
                border: '1px solid',
                borderColor: isListeningVoice ? 'error.main' : 'divider',
                flexShrink: 0,
              }}
            >
              {isListeningVoice ? <MicOffIcon color="error" /> : <MicIcon sx={{ color: 'text.secondary' }} />}
            </IconButton>
          </Tooltip>

          {/* Send Button */}
          <Button
            variant="contained"
            disabled={!input.trim() || isLoading}
            onClick={() => handleSendMessage()}
            sx={{
              minWidth: 46,
              height: 42,
              borderRadius: 3,
              background: 'linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)',
              color: '#fff',
              boxShadow: '0 4px 12px rgba(13,148,136,0.3)',
              '&:hover': {
                background: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
              },
              '&.Mui-disabled': {
                bgcolor: 'action.disabledBackground',
                color: 'action.disabled',
                background: 'none',
              },
            }}
          >
            {isLoading ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <SendRoundedIcon sx={{ fontSize: 20 }} />
            )}
          </Button>
        </Box>

        {/* Character Count & Keyboard Hint */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 1 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.68rem' }}>
            Press Enter to send, Shift+Enter for new line
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: input.length > 1800 ? 'error.main' : 'text.secondary',
              fontSize: '0.68rem',
            }}
          >
            {input.length} / 2000
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
