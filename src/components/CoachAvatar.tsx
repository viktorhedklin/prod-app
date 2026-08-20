import { motion, useReducedMotion, type Transition } from 'motion/react';
import Box from '@mui/material/Box';

export type CoachState = 'idle' | 'thinking' | 'speaking';

export default function CoachAvatar({
  state = 'idle',
  size = 64,
}: {
  state?: CoachState;
  size?: number;
}) {
  const reduce = useReducedMotion();
  const thinking = state === 'thinking';
  const speaking = state === 'speaking';

  const glowAnimate = reduce
    ? { opacity: 0.5 }
    : thinking
      ? { opacity: [0.3, 0.8, 0.3], scale: [0.95, 1.08, 0.95] }
      : speaking
        ? { opacity: [0.5, 0.9, 0.5], scale: [1, 1.06, 1] }
        : { opacity: [0.35, 0.55, 0.35], scale: [0.98, 1.03, 0.98] };
  const glowTransition: Transition = thinking
    ? { duration: 1.1, repeat: Infinity, ease: 'easeInOut' }
    : speaking
      ? { duration: 0.7, repeat: Infinity, ease: 'easeInOut' }
      : { duration: 3, repeat: Infinity, ease: 'easeInOut' };

  const bodyAnimate = reduce ? { y: 0 } : speaking ? { y: [0, -2, 0] } : { y: [0, -3, 0] };
  const bodyTransition: Transition = speaking
    ? { duration: 0.5, repeat: Infinity, ease: 'easeInOut' }
    : { duration: 3.2, repeat: Infinity, ease: 'easeInOut' };

  const mouthAnimate = reduce
    ? { scaleY: 0.45 }
    : speaking
      ? { scaleY: [0.4, 1.3, 0.4] }
      : thinking
        ? { scaleY: 0.2 }
        : { scaleY: 0.45 };
  const mouthTransition: Transition = speaking
    ? { duration: 0.4, repeat: Infinity, ease: 'easeInOut' }
    : { duration: 0.2 };

  return (
    <Box sx={{ position: 'relative', width: size, height: size, flexShrink: 0 }} aria-hidden="true">
      <motion.div
        style={{
          position: 'absolute',
          inset: -size * 0.1,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(13,148,136,0.35) 0%, rgba(13,148,136,0) 70%)',
        }}
        animate={glowAnimate}
        transition={glowTransition}
      />

      <motion.div
        style={{
          position: 'absolute',
          inset: size * 0.12,
          borderRadius: '50%',
          background:
            'radial-gradient(circle at 32% 28%, #5EEAD4 0%, #14B8A6 32%, #0D9488 68%, #0F766E 100%)',
          boxShadow: '0 8px 20px rgba(13,148,136,0.35), inset 0 -6px 12px rgba(2,44,41,0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
        animate={bodyAnimate}
        transition={bodyTransition}
      >
        <Box sx={{ position: 'relative', width: '58%', height: '52%' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', px: '4%' }}>
            {[0, 1].map((i) => (
              <motion.span
                key={i}
                style={{
                  width: '26%',
                  aspectRatio: '1',
                  borderRadius: '50%',
                  background: '#FFFFFF',
                  display: 'block',
                  transformOrigin: 'center',
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.15)',
                }}
                animate={reduce ? { scaleY: 1 } : { scaleY: [1, 1, 0.1, 1] }}
                transition={{
                  duration: 4.5,
                  times: [0, 0.92, 0.96, 1],
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </Box>
          <motion.span
            style={{
              position: 'absolute',
              left: '38%',
              bottom: 0,
              width: '24%',
              height: '22%',
              borderRadius: '50%',
              background: thinking ? 'transparent' : '#04332F',
              borderBottom: thinking ? '2px solid #04332F' : 'none',
              transformOrigin: 'center',
            }}
            animate={mouthAnimate}
            transition={mouthTransition}
          />
        </Box>
      </motion.div>

      {thinking && !reduce && (
        <Box
          sx={{
            position: 'absolute',
            top: -4,
            right: size * 0.04,
            display: 'flex',
            gap: 2,
          }}
        >
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              style={{
                width: 4,
                height: 4,
                borderRadius: '50%',
                background: '#0D9488',
                display: 'block',
              }}
              animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}