/**
 * JARVIS Global State Machine
 *
 * Single source of truth for the whole Nuclear JARVIS interface. The 3D core
 * (React Three Fiber) and the 2D HUD overlay both subscribe to this, so
 * changing state instantly shifts colors, speeds and effects everywhere.
 *
 * States & themes (per design spec):
 *  - IDLE      : Neon Cyan      — calm orbital rotation
 *  - LISTENING : Cyan + aura    — pulsing rings, waveform morphing
 *  - THINKING  : Plasma Orange  — high-speed particle acceleration
 *  - ERROR     : Warning Red    — glitch / noise / aberration
 *
 * Cognitive load (0..1) drives particle velocity and core turbulence.
 */

import { createContext, useContext } from 'react';

export type JarvisStateName = 'idle' | 'listening' | 'thinking' | 'error';

export interface JarvisStateTheme {
  /** Primary glow color (hex) */
  primary: string;
  /** Secondary accent color (hex) */
  secondary: string;
  /** Core ring rotation speed multiplier (1 = calm) */
  rotationSpeed: number;
  /** Particle field velocity multiplier (1 = calm) */
  particleSpeed: number;
  /** Aura pulse intensity 0..1 */
  pulse: number;
  /** Enable glitch/chromatic-aberration flag */
  glitch: boolean;
  /** Human label shown on HUD */
  label: string;
}

export const JARVIS_THEMES: Record<JarvisStateName, JarvisStateTheme> = {
  idle: {
    primary: '#22D3EE',
    secondary: '#14B8A6',
    rotationSpeed: 0.35,
    particleSpeed: 0.6,
    pulse: 0.15,
    glitch: false,
    label: 'STANDBY',
  },
  listening: {
    primary: '#22D3EE',
    secondary: '#06B6D4',
    rotationSpeed: 0.8,
    particleSpeed: 1.0,
    pulse: 0.65,
    glitch: false,
    label: 'LISTENING',
  },
  thinking: {
    primary: '#FB923C',
    secondary: '#F97316',
    rotationSpeed: 2.2,
    particleSpeed: 2.6,
    pulse: 0.85,
    glitch: false,
    label: 'PROCESSING',
  },
  error: {
    primary: '#F43F5E',
    secondary: '#EF4444',
    rotationSpeed: 0.15,
    particleSpeed: 0.4,
    pulse: 1.0,
    glitch: true,
    label: 'CRITICAL',
  },
};

/** Live snapshot consumed by both the 3D core and the HUD widgets. */
export interface JarvisSystemState {
  state: JarvisStateName;
  theme: JarvisStateTheme;
  /** Cognitive load 0..1 — drives particle velocity + core turbulence. */
  cognitiveLoad: number;
  /** Monotonic ms timestamp of the last state change (for transition fx). */
  changedAt: number;
}

export const JarvisStateContext = createContext<JarvisSystemState>({
  state: 'idle',
  theme: JARVIS_THEMES.idle,
  cognitiveLoad: 0.2,
  changedAt: 0,
});

export function useJarvisState(): JarvisSystemState {
  return useContext(JarvisStateContext);
}

/** Default export keeps imports terse at call sites. */
export default JARVIS_THEMES;
