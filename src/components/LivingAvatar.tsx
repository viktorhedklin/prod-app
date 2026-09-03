import React, { useState, useEffect, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';

export type AvatarState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'happy'
  | 'concerned'
  | 'celebrating';

export type LivingAvatarState = AvatarState;

export interface LivingAvatarProps {
  /** Emotional/operational state of the AI copilot */
  state?: AvatarState;
  /** Size in pixels (width and height). Defaults to 120. */
  size?: number;
  /** Whether to show state status text underneath avatar */
  showStatus?: boolean;
  /** Name title displayed when showStatus is true */
  name?: string;
  /** Subtitle displayed when showStatus is true */
  subtitle?: string;
  /** Custom CSS class name for container */
  className?: string;
  /** Optional click handler for interactive state toggles */
  onClick?: () => void;
  /** Accessible label */
  ariaLabel?: string;
}

interface ColorPalette {
  primary: string;
  secondary: string;
  glow: string;
  coreInner: string;
  coreOuter: string;
  particle: string;
  eye: string;
}

const STATE_COLORS: Record<AvatarState, ColorPalette> = {
  idle: {
    primary: '#14B8A6',
    secondary: '#2DD4BF',
    glow: '#0D9488',
    coreInner: '#5EEAD4',
    coreOuter: '#0F766E',
    particle: '#99F6E4',
    eye: '#FFFFFF',
  },
  listening: {
    primary: '#3B82F6',
    secondary: '#60A5FA',
    glow: '#2563EB',
    coreInner: '#93C5FD',
    coreOuter: '#1E40AF',
    particle: '#BFDBFE',
    eye: '#FFFFFF',
  },
  thinking: {
    primary: '#8B5CF6',
    secondary: '#A78BFA',
    glow: '#7C3AED',
    coreInner: '#C4B5FD',
    coreOuter: '#5B21B6',
    particle: '#DDD6FE',
    eye: '#E9D5FF',
  },
  speaking: {
    primary: '#F97316',
    secondary: '#FB923C',
    glow: '#EA580C',
    coreInner: '#FDBA74',
    coreOuter: '#9A3412',
    particle: '#FFEDD5',
    eye: '#FFFFFF',
  },
  happy: {
    primary: '#10B981',
    secondary: '#F59E0B',
    glow: '#059669',
    coreInner: '#A7F3D0',
    coreOuter: '#047857',
    particle: '#FDE68A',
    eye: '#FEF08A',
  },
  concerned: {
    primary: '#F59E0B',
    secondary: '#EF4444',
    glow: '#D97706',
    coreInner: '#FDE68A',
    coreOuter: '#991B1B',
    particle: '#FECACA',
    eye: '#FEF3C7',
  },
  celebrating: {
    primary: '#EC4899',
    secondary: '#8B5CF6',
    glow: '#3B82F6',
    coreInner: '#F472B6',
    coreOuter: '#6366F1',
    particle: '#FDE047',
    eye: '#FFFFFF',
  },
};

const STATE_LABELS: Record<AvatarState, string> = {
  idle: 'Idle',
  listening: 'Listening…',
  thinking: 'Thinking…',
  speaking: 'Speaking…',
  happy: 'Happy',
  concerned: 'Concerned',
  celebrating: 'Celebrating! 🎉',
};

export default function LivingAvatar({
  state = 'idle',
  size = 120,
  showStatus = false,
  name,
  subtitle,
  className = '',
  onClick,
  ariaLabel,
}: LivingAvatarProps) {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  const [isBlinking, setIsBlinking] = useState(false);

  // Blink timing: Randomized 3-5s intervals (faster during celebrating)
  useEffect(() => {
    let delayTimer: number | null = null;
    let blinkTimer: number | null = null;

    const scheduleNextBlink = () => {
      const minDelay = state === 'celebrating' ? 1000 : 3000;
      const maxDelay = state === 'celebrating' ? 2200 : 5000;
      const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;

      delayTimer = window.setTimeout(() => {
        setIsBlinking(true);

        // Blink duration ~150ms
        blinkTimer = window.setTimeout(() => {
          setIsBlinking(false);
          scheduleNextBlink();
        }, 150);
      }, delay);
    };

    scheduleNextBlink();

    return () => {
      if (delayTimer !== null) clearTimeout(delayTimer);
      if (blinkTimer !== null) clearTimeout(blinkTimer);
      setIsBlinking(false);
    };
  }, [state]);

  const validState = STATE_COLORS[state] ? state : 'idle';
  const colors = STATE_COLORS[validState];

  // Dynamic CSS Variables passed to root wrapper for hardware-accelerated state transitions
  const cssVars = useMemo(
    () =>
      ({
        '--la-primary': colors.primary,
        '--la-secondary': colors.secondary,
        '--la-glow': colors.glow,
        '--la-core-inner': colors.coreInner,
        '--la-core-outer': colors.coreOuter,
        '--la-particle': colors.particle,
        '--la-eye': colors.eye,
      }) as React.CSSProperties,
    [colors]
  );

  return (
    <Box
      className={`la-avatar-container ${className}`}
      onClick={onClick}
      sx={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none',
        ...cssVars,
      }}
      role={ariaLabel || onClick ? 'button' : 'img'}
      aria-label={ariaLabel || `AI Copilot Avatar (${name ? `${name} - ` : ''}${STATE_LABELS[state] || STATE_LABELS.idle})`}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        className={`la-svg la-state-${validState} ${isBlinking ? 'la-blinking' : ''}`}
        style={{
          overflow: 'visible',
          display: 'block',
          transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <defs>
          {/* SVG Glow Filters */}
          <filter id="la-glow-soft" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={isDarkMode ? 4.5 : 3.5} result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="la-glow-intense" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation={isDarkMode ? 9 : 7} result="blur1" />
            <feGaussianBlur stdDeviation="3" result="blur2" />
            <feMerge>
              <feMergeNode in="blur1" />
              <feMergeNode in="blur2" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="la-glow-ambient" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation={isDarkMode ? 18 : 14} result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
            </feMerge>
          </filter>

          {/* Gradients */}
          <radialGradient id="la-grad-core" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="var(--la-core-inner)" stopOpacity="1" />
            <stop offset="55%" stopColor="var(--la-primary)" stopOpacity="0.88" />
            <stop offset="100%" stopColor="var(--la-core-outer)" stopOpacity="0.5" />
          </radialGradient>

          <radialGradient id="la-grad-ambient" cx="50%" cy="50%" r="50%">
            <stop
              offset="0%"
              stopColor="var(--la-glow)"
              stopOpacity={isDarkMode ? 0.55 : 0.35}
            />
            <stop
              offset="65%"
              stopColor="var(--la-primary)"
              stopOpacity={isDarkMode ? 0.25 : 0.12}
            />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>

          <linearGradient id="la-grad-rainbow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="20%" stopColor="#F59E0B" />
            <stop offset="40%" stopColor="#10B981" />
            <stop offset="60%" stopColor="#3B82F6" />
            <stop offset="80%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#EC4899" />
          </linearGradient>

          {/* Scoped CSS Keyframe Animations */}
          <style>{`
            .la-svg {
              transform-origin: 100px 100px;
            }

            /* Subtle Continuous Breathing */
            @keyframes la-breathe-anim {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.03); }
            }
            .la-breathe-group {
              transform-origin: 100px 100px;
              animation: la-breathe-anim 3.6s ease-in-out infinite;
            }

            /* Core Nucleus Pulses */
            @keyframes la-pulse-soft {
              0%, 100% { transform: scale(0.96); opacity: 0.85; }
              50% { transform: scale(1.04); opacity: 1; }
            }
            @keyframes la-pulse-fast {
              0%, 100% { transform: scale(0.92); opacity: 0.75; }
              50% { transform: scale(1.08); opacity: 1; }
            }
            .la-core-nucleus {
              transform-origin: 100px 100px;
              transition: fill 0.6s ease;
            }
            .la-state-idle .la-core-nucleus,
            .la-state-happy .la-core-nucleus,
            .la-state-concerned .la-core-nucleus {
              animation: la-pulse-soft 3.2s ease-in-out infinite;
            }
            .la-state-listening .la-core-nucleus {
              animation: la-pulse-soft 2.0s ease-in-out infinite;
            }
            .la-state-thinking .la-core-nucleus {
              animation: la-pulse-fast 0.85s ease-in-out infinite;
            }
            .la-state-speaking .la-core-nucleus {
              animation: la-pulse-fast 1.1s ease-in-out infinite;
            }
            .la-state-celebrating .la-core-nucleus {
              animation: la-pulse-fast 0.6s ease-in-out infinite;
            }

            /* Orbital Rotations */
            @keyframes la-spin-cw {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            @keyframes la-spin-ccw {
              0% { transform: rotate(360deg); }
              100% { transform: rotate(0deg); }
            }
            .la-orbit-ring {
              transform-origin: 100px 100px;
            }
            .la-state-idle .la-orbit-1 { animation: la-spin-cw 14s linear infinite; }
            .la-state-idle .la-orbit-2 { animation: la-spin-ccw 10s linear infinite; }
            .la-state-idle .la-orbit-3 { animation: la-spin-cw 18s linear infinite; }

            .la-state-listening .la-orbit-1 { animation: la-spin-cw 6s linear infinite; }
            .la-state-listening .la-orbit-2 { animation: la-spin-ccw 4.5s linear infinite; }
            .la-state-listening .la-orbit-3 { animation: la-spin-cw 8s linear infinite; }

            .la-state-thinking .la-orbit-1 { animation: la-spin-cw 2.6s linear infinite; }
            .la-state-thinking .la-orbit-2 { animation: la-spin-ccw 1.8s linear infinite; }
            .la-state-thinking .la-orbit-3 { animation: la-spin-cw 3.2s linear infinite; }

            .la-state-speaking .la-orbit-1 { animation: la-spin-cw 7s linear infinite; }
            .la-state-speaking .la-orbit-2 { animation: la-spin-ccw 5s linear infinite; }
            .la-state-speaking .la-orbit-3 { animation: la-spin-cw 9s linear infinite; }

            .la-state-happy .la-orbit-1 { animation: la-spin-cw 4.5s linear infinite; }
            .la-state-happy .la-orbit-2 { animation: la-spin-ccw 3.5s linear infinite; }
            .la-state-happy .la-orbit-3 { animation: la-spin-cw 5.5s linear infinite; }

            .la-state-concerned .la-orbit-1 { animation: la-spin-cw 22s linear infinite; }
            .la-state-concerned .la-orbit-2 { animation: la-spin-ccw 18s linear infinite; }
            .la-state-concerned .la-orbit-3 { animation: la-spin-cw 26s linear infinite; }

            .la-state-celebrating .la-orbit-1 { animation: la-spin-cw 1.8s linear infinite; }
            .la-state-celebrating .la-orbit-2 { animation: la-spin-ccw 1.2s linear infinite; }
            .la-state-celebrating .la-orbit-3 { animation: la-spin-cw 2.2s linear infinite; }

            /* Energy Wave Emanations */
            @keyframes la-wave-outward-anim {
              0% { transform: scale(0.62); opacity: 0.85; }
              100% { transform: scale(1.58); opacity: 0; }
            }
            @keyframes la-wave-inward-anim {
              0% { transform: scale(1.58); opacity: 0; }
              100% { transform: scale(0.62); opacity: 0.85; }
            }
            .la-wave-ring {
              transform-origin: 100px 100px;
              fill: none;
              stroke-width: 1.6px;
            }
            .la-wave-out-1 { animation: la-wave-outward-anim 2.2s cubic-bezier(0.1, 0.8, 0.3, 1) infinite 0s; }
            .la-wave-out-2 { animation: la-wave-outward-anim 2.2s cubic-bezier(0.1, 0.8, 0.3, 1) infinite 0.73s; }
            .la-wave-out-3 { animation: la-wave-outward-anim 2.2s cubic-bezier(0.1, 0.8, 0.3, 1) infinite 1.46s; }

            .la-wave-in-1 { animation: la-wave-inward-anim 2.2s cubic-bezier(0.1, 0.8, 0.3, 1) infinite 0s; }
            .la-wave-in-2 { animation: la-wave-inward-anim 2.2s cubic-bezier(0.1, 0.8, 0.3, 1) infinite 0.73s; }
            .la-wave-in-3 { animation: la-wave-inward-anim 2.2s cubic-bezier(0.1, 0.8, 0.3, 1) infinite 1.46s; }

            /* Audio Ripple / Equalizer Bars */
            @keyframes la-audio-bar-a {
              0%, 100% { transform: scaleY(0.35); }
              50% { transform: scaleY(1.35); }
            }
            @keyframes la-audio-bar-b {
              0%, 100% { transform: scaleY(1.25); }
              50% { transform: scaleY(0.25); }
            }
            @keyframes la-audio-bar-c {
              0%, 100% { transform: scaleY(0.45); }
              50% { transform: scaleY(1.55); }
            }
            .la-audio-bar {
              transform-origin: center 115px;
            }
            .la-audio-bar-1 { animation: la-audio-bar-a 0.45s ease-in-out infinite; }
            .la-audio-bar-2 { animation: la-audio-bar-b 0.55s ease-in-out infinite; }
            .la-audio-bar-3 { animation: la-audio-bar-c 0.38s ease-in-out infinite; }
            .la-audio-bar-4 { animation: la-audio-bar-b 0.62s ease-in-out infinite; }
            .la-audio-bar-5 { animation: la-audio-bar-a 0.48s ease-in-out infinite; }

            /* Eye Expressions & Natural Blinking */
            .la-eye-left {
              transform-origin: 82px 92px;
              transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease;
            }
            .la-eye-right {
              transform-origin: 118px 92px;
              transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease;
            }
            .la-blinking .la-eye-left,
            .la-blinking .la-eye-right {
              transform: scaleY(0.08) !important;
            }

            /* Floating Energy Particles */
            @keyframes la-float-a {
              0%, 100% { transform: translate(0, 0); }
              50% { transform: translate(-3px, -5px); }
            }
            @keyframes la-float-b {
              0%, 100% { transform: translate(0, 0); }
              50% { transform: translate(4px, 4px); }
            }
            .la-float-1 { animation: la-float-a 3.8s ease-in-out infinite; }
            .la-float-2 { animation: la-float-b 4.4s ease-in-out infinite; }

            /* Celebrating Rainbow Hue Spin */
            @keyframes la-rainbow-hue-rotate {
              0% { filter: hue-rotate(0deg); }
              100% { filter: hue-rotate(360deg); }
            }
            .la-state-celebrating .la-rainbow-layer {
              animation: la-rainbow-hue-rotate 3s linear infinite;
            }
          `}</style>
        </defs>

        {/* Layer 1: Ambient Background Aura */}
        <g className="la-rainbow-layer">
          <circle
            cx="100"
            cy="100"
            r="82"
            fill="url(#la-grad-ambient)"
            filter="url(#la-glow-ambient)"
          />
        </g>

        {/* Layer 2: Concentric Energy Waves */}
        <g className="la-waves-layer">
          {(state === 'speaking' || state === 'celebrating') && (
            <>
              <circle
                cx="100"
                cy="100"
                r="52"
                stroke="var(--la-secondary)"
                className="la-wave-ring la-wave-out-1"
              />
              <circle
                cx="100"
                cy="100"
                r="52"
                stroke="var(--la-primary)"
                className="la-wave-ring la-wave-out-2"
              />
              <circle
                cx="100"
                cy="100"
                r="52"
                stroke="var(--la-core-inner)"
                className="la-wave-ring la-wave-out-3"
              />
            </>
          )}

          {state === 'listening' && (
            <>
              <circle
                cx="100"
                cy="100"
                r="52"
                stroke="var(--la-secondary)"
                className="la-wave-ring la-wave-in-1"
              />
              <circle
                cx="100"
                cy="100"
                r="52"
                stroke="var(--la-primary)"
                className="la-wave-ring la-wave-in-2"
              />
              <circle
                cx="100"
                cy="100"
                r="52"
                stroke="var(--la-core-inner)"
                className="la-wave-ring la-wave-in-3"
              />
            </>
          )}

          {state === 'thinking' && (
            <>
              <circle
                cx="100"
                cy="100"
                r="50"
                fill="none"
                stroke="var(--la-secondary)"
                strokeWidth="1.2"
                strokeDasharray="6 12"
                className="la-orbit-ring la-orbit-1"
                opacity="0.6"
              />
              <circle
                cx="100"
                cy="100"
                r="58"
                fill="none"
                stroke="var(--la-primary)"
                strokeWidth="1.2"
                strokeDasharray="4 10"
                className="la-orbit-ring la-orbit-2"
                opacity="0.5"
              />
            </>
          )}
        </g>

        {/* Layer 3: Orbiting Particle Rings */}
        <g className="la-orbits-layer la-rainbow-layer">
          {/* Track 1 */}
          <g className="la-orbit-ring la-orbit-1">
            <ellipse
              cx="100"
              cy="100"
              rx={state === 'concerned' ? 68 : 76}
              ry={state === 'concerned' ? 24 : 28}
              transform="rotate(-25 100 100)"
              fill="none"
              stroke="var(--la-primary)"
              strokeWidth="1.2"
              opacity="0.4"
              strokeDasharray="4 8"
            />
            <circle
              cx="170"
              cy="88"
              r={state === 'celebrating' ? 4.5 : 3.5}
              fill="var(--la-secondary)"
              filter="url(#la-glow-soft)"
            />
            <circle
              cx="30"
              cy="112"
              r="2.5"
              fill="var(--la-particle)"
              opacity="0.8"
            />
          </g>

          {/* Track 2 */}
          <g className="la-orbit-ring la-orbit-2">
            <ellipse
              cx="100"
              cy="100"
              rx={state === 'concerned' ? 58 : 66}
              ry={state === 'concerned' ? 18 : 22}
              transform="rotate(35 100 100)"
              fill="none"
              stroke="var(--la-secondary)"
              strokeWidth="1.2"
              opacity="0.35"
              strokeDasharray="3 6"
            />
            <circle
              cx="155"
              cy="120"
              r="3"
              fill="var(--la-core-inner)"
              filter="url(#la-glow-soft)"
            />
            <circle cx="45" cy="80" r="2" fill="var(--la-primary)" />
          </g>

          {/* Track 3 */}
          <g className="la-orbit-ring la-orbit-3">
            <ellipse
              cx="100"
              cy="100"
              rx={state === 'concerned' ? 74 : 84}
              ry={state === 'concerned' ? 30 : 36}
              transform="rotate(80 100 100)"
              fill="none"
              stroke="var(--la-particle)"
              strokeWidth="1"
              opacity="0.25"
            />
            <circle
              cx="100"
              cy="136"
              r={state === 'celebrating' ? 5 : 4}
              fill="var(--la-primary)"
              filter="url(#la-glow-soft)"
            />
          </g>
        </g>

        {/* Floating Ambient Accent Particles */}
        <g className="la-particles-layer">
          <circle
            cx="48"
            cy="52"
            r="2"
            fill="var(--la-secondary)"
            className="la-float-1"
            opacity="0.7"
          />
          <circle
            cx="156"
            cy="148"
            r="2.5"
            fill="var(--la-core-inner)"
            className="la-float-2"
            opacity="0.8"
            filter="url(#la-glow-soft)"
          />
          {state === 'happy' && (
            <>
              <circle
                cx="140"
                cy="50"
                r="3"
                fill="#FDE68A"
                className="la-float-1"
                filter="url(#la-glow-soft)"
              />
              <circle
                cx="60"
                cy="150"
                r="2.8"
                fill="#A7F3D0"
                className="la-float-2"
                filter="url(#la-glow-soft)"
              />
            </>
          )}
          {state === 'celebrating' && (
            <>
              <path
                d="M 145 45 L 148 51 L 154 54 L 148 57 L 145 63 L 142 57 L 136 54 L 142 51 Z"
                fill="#FDE047"
                filter="url(#la-glow-soft)"
                className="la-float-1"
              />
              <path
                d="M 55 140 L 58 144 L 63 146 L 58 148 L 55 152 L 53 148 L 48 146 L 53 144 Z"
                fill="#F472B6"
                filter="url(#la-glow-soft)"
                className="la-float-2"
              />
            </>
          )}
        </g>

        {/* Layer 4: Central Orb Core Sphere */}
        <g className="la-breathe-group la-rainbow-layer">
          {/* Outer Energy Halo */}
          <circle
            cx="100"
            cy="100"
            r="48"
            fill="var(--la-glow)"
            opacity={isDarkMode ? 0.35 : 0.22}
            filter="url(#la-glow-intense)"
          />

          {/* Central Orb Nucleus */}
          <circle
            cx="100"
            cy="100"
            r="42"
            fill={state === 'celebrating' ? 'url(#la-grad-rainbow)' : 'url(#la-grad-core)'}
            filter="url(#la-glow-soft)"
            className="la-core-nucleus"
          />

          {/* Glass Specular Top Reflection */}
          <path
            d="M 68 85 A 38 38 0 0 1 132 85 A 40 32 0 0 0 68 85 Z"
            fill="#FFFFFF"
            opacity={isDarkMode ? 0.28 : 0.38}
          />

          {/* Inner Energy Ring Line */}
          <circle
            cx="100"
            cy="100"
            r="22"
            fill="none"
            stroke="var(--la-core-inner)"
            strokeWidth="1.8"
            opacity="0.6"
            strokeDasharray="12 6"
            className="la-orbit-ring la-orbit-2"
          />
        </g>

        {/* Layer 5: Luminous Abstract Eye Elements */}
        <g className="la-breathe-group la-eyes-layer">
          {state === 'happy' ? (
            /* Happy upward curve eyes */
            <>
              <path
                d="M 74 94 Q 82 82 90 94"
                fill="none"
                stroke="var(--la-eye)"
                strokeWidth="3.5"
                strokeLinecap="round"
                filter="url(#la-glow-soft)"
                className="la-eye-left"
              />
              <path
                d="M 110 94 Q 118 82 126 94"
                fill="none"
                stroke="var(--la-eye)"
                strokeWidth="3.5"
                strokeLinecap="round"
                filter="url(#la-glow-soft)"
                className="la-eye-right"
              />
            </>
          ) : state === 'concerned' ? (
            /* Concerned angled eyes */
            <>
              <g className="la-eye-left" transform="rotate(-14 82 92)">
                <ellipse
                  cx="82"
                  cy="92"
                  rx="7"
                  ry="2.8"
                  fill="var(--la-eye)"
                  filter="url(#la-glow-soft)"
                />
              </g>
              <g className="la-eye-right" transform="rotate(14 118 92)">
                <ellipse
                  cx="118"
                  cy="92"
                  rx="7"
                  ry="2.8"
                  fill="var(--la-eye)"
                  filter="url(#la-glow-soft)"
                />
              </g>
            </>
          ) : state === 'thinking' ? (
            /* Thoughtful half-closed eyes */
            <>
              <g className="la-eye-left" transform="rotate(6 82 92)">
                <ellipse
                  cx="82"
                  cy="92"
                  rx="6.5"
                  ry="2.2"
                  fill="var(--la-eye)"
                  filter="url(#la-glow-soft)"
                />
              </g>
              <g className="la-eye-right" transform="rotate(-6 118 92)">
                <ellipse
                  cx="118"
                  cy="92"
                  rx="6.5"
                  ry="2.2"
                  fill="var(--la-eye)"
                  filter="url(#la-glow-soft)"
                />
              </g>
            </>
          ) : state === 'listening' ? (
            /* Widened luminous eyes */
            <>
              <g className="la-eye-left">
                <circle
                  cx="82"
                  cy="92"
                  r="6.5"
                  fill="var(--la-eye)"
                  filter="url(#la-glow-intense)"
                />
                <circle cx="82" cy="92" r="2.2" fill="var(--la-primary)" />
              </g>
              <g className="la-eye-right">
                <circle
                  cx="118"
                  cy="92"
                  r="6.5"
                  fill="var(--la-eye)"
                  filter="url(#la-glow-intense)"
                />
                <circle cx="118" cy="92" r="2.2" fill="var(--la-primary)" />
              </g>
            </>
          ) : state === 'speaking' ? (
            /* Expressive open eyes */
            <>
              <g className="la-eye-left">
                <ellipse
                  cx="82"
                  cy="92"
                  rx="6.5"
                  ry="5"
                  fill="var(--la-eye)"
                  filter="url(#la-glow-soft)"
                />
                <circle cx="83" cy="91" r="1.8" fill="var(--la-primary)" />
              </g>
              <g className="la-eye-right">
                <ellipse
                  cx="118"
                  cy="92"
                  rx="6.5"
                  ry="5"
                  fill="var(--la-eye)"
                  filter="url(#la-glow-soft)"
                />
                <circle cx="119" cy="91" r="1.8" fill="var(--la-primary)" />
              </g>
            </>
          ) : state === 'celebrating' ? (
            /* Twinkling starburst eyes */
            <>
              <g className="la-eye-left">
                <circle
                  cx="82"
                  cy="92"
                  r="7"
                  fill="var(--la-eye)"
                  filter="url(#la-glow-intense)"
                />
                <circle cx="82" cy="92" r="2.5" fill="#3B82F6" />
              </g>
              <g className="la-eye-right">
                <circle
                  cx="118"
                  cy="92"
                  r="7"
                  fill="var(--la-eye)"
                  filter="url(#la-glow-intense)"
                />
                <circle cx="118" cy="92" r="2.5" fill="#3B82F6" />
              </g>
            </>
          ) : (
            /* Idle default luminous capsule eyes */
            <>
              <g className="la-eye-left">
                <ellipse
                  cx="82"
                  cy="92"
                  rx="6.5"
                  ry="4"
                  fill="var(--la-eye)"
                  filter="url(#la-glow-soft)"
                />
                <circle
                  cx="83.5"
                  cy="91"
                  r="1.5"
                  fill="var(--la-primary)"
                  opacity="0.8"
                />
              </g>
              <g className="la-eye-right">
                <ellipse
                  cx="118"
                  cy="92"
                  rx="6.5"
                  ry="4"
                  fill="var(--la-eye)"
                  filter="url(#la-glow-soft)"
                />
                <circle
                  cx="119.5"
                  cy="91"
                  r="1.5"
                  fill="var(--la-primary)"
                  opacity="0.8"
                />
              </g>
            </>
          )}
        </g>

        {/* Layer 6: Lower Core Expression / Voice Wave / Mouth Area */}
        <g className="la-breathe-group la-mouth-layer">
          {state === 'speaking' ? (
            /* 5 Equalizer audio frequency bars */
            <g>
              <rect
                x="88"
                y="110"
                width="2.5"
                height="10"
                rx="1.2"
                fill="var(--la-secondary)"
                className="la-audio-bar la-audio-bar-1"
              />
              <rect
                x="94"
                y="108"
                width="2.5"
                height="14"
                rx="1.2"
                fill="var(--la-primary)"
                className="la-audio-bar la-audio-bar-2"
              />
              <rect
                x="100"
                y="106"
                width="2.5"
                height="18"
                rx="1.2"
                fill="var(--la-core-inner)"
                className="la-audio-bar la-audio-bar-3"
                filter="url(#la-glow-soft)"
              />
              <rect
                x="106"
                y="108"
                width="2.5"
                height="14"
                rx="1.2"
                fill="var(--la-primary)"
                className="la-audio-bar la-audio-bar-4"
              />
              <rect
                x="112"
                y="110"
                width="2.5"
                height="10"
                rx="1.2"
                fill="var(--la-secondary)"
                className="la-audio-bar la-audio-bar-5"
              />
            </g>
          ) : state === 'happy' ? (
            /* Soft glowing smile arc */
            <path
              d="M 88 112 Q 100 122 112 112"
              fill="none"
              stroke="var(--la-secondary)"
              strokeWidth="2.5"
              strokeLinecap="round"
              filter="url(#la-glow-soft)"
            />
          ) : state === 'concerned' ? (
            /* Slight concerned flat/inverted line */
            <path
              d="M 90 117 Q 100 113 110 117"
              fill="none"
              stroke="var(--la-secondary)"
              strokeWidth="2"
              strokeLinecap="round"
            />
          ) : state === 'thinking' ? (
            /* 3 Pulsing thought nodes */
            <g>
              <circle
                cx="92"
                cy="115"
                r="1.8"
                fill="var(--la-core-inner)"
                className="la-audio-bar la-audio-bar-1"
              />
              <circle
                cx="100"
                cy="115"
                r="2.2"
                fill="var(--la-core-inner)"
                className="la-audio-bar la-audio-bar-3"
                filter="url(#la-glow-soft)"
              />
              <circle
                cx="108"
                cy="115"
                r="1.8"
                fill="var(--la-core-inner)"
                className="la-audio-bar la-audio-bar-5"
              />
            </g>
          ) : state === 'listening' ? (
            /* Incoming sound reception arc */
            <path
              d="M 86 113 Q 100 120 114 113"
              fill="none"
              stroke="var(--la-secondary)"
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.85"
              filter="url(#la-glow-soft)"
            />
          ) : state === 'celebrating' ? (
            /* Joyful open mouth arc */
            <path
              d="M 86 111 Q 100 125 114 111 Z"
              fill="url(#la-grad-rainbow)"
              opacity="0.9"
              filter="url(#la-glow-soft)"
            />
          ) : (
            /* Soft idle energy curve */
            <path
              d="M 92 114 Q 100 117 108 114"
              fill="none"
              stroke="var(--la-secondary)"
              strokeWidth="1.8"
              strokeLinecap="round"
              opacity="0.6"
            />
          )}
        </g>
      </svg>

      {/* Optional Status Typography */}
      {showStatus && (
        <Box sx={{ textAlign: 'center', mt: 1 }}>
          {name && (
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 800,
                fontSize: `${Math.max(12, Math.round(size * 0.11))}px`,
                lineHeight: 1.2,
                color: 'text.primary',
              }}
            >
              {name}
            </Typography>
          )}
          {subtitle ? (
            <Typography
              variant="caption"
              sx={{
                fontWeight: 600,
                fontSize: `${Math.max(10, Math.round(size * 0.09))}px`,
                color: 'var(--la-primary)',
              }}
            >
              {subtitle}
            </Typography>
          ) : (
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                fontSize: `${Math.max(11, Math.round(size * 0.1))}px`,
                lineHeight: 1.2,
                color: 'var(--la-primary)',
                textShadow: isDarkMode
                  ? '0 0 10px var(--la-glow)'
                  : '0 1px 2px rgba(0,0,0,0.1)',
                transition: 'color 0.5s ease',
                whiteSpace: 'nowrap',
                letterSpacing: '0.02em',
              }}
            >
              {STATE_LABELS[state] || STATE_LABELS.idle}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
}
