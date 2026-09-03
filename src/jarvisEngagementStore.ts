/**
 * VESPER — JARVIS Live Engagement Store
 *
 * Broadcasts real copilot activity (voice listening, agent-loop thinking,
 * response speaking, error/concern) app-wide so ANY screen's 3D core / HUD
 * chrome can react instantly to what VESPER is actually doing right now —
 * not just ambient system health.
 *
 * Pattern mirrors orbStore.ts: a plain module-level store with a tiny
 * pub-sub, consumed via useSyncExternalStore so React stays in sync without
 * needing a shared Context provider ancestor between tabs.
 *
 * Precedence: an active engagement signal (set by the copilot while it's
 * genuinely listening/thinking/speaking/erroring) always overrides ambient
 * system-health state. It auto-clears back to "ambient" after a short idle
 * window so the cockpit doesn't stay stuck in "PROCESSING" forever.
 */

import { useSyncExternalStore } from 'react';
import type { JarvisStateName } from './jarvisState';

export interface JarvisEngagementSnapshot {
  /** null = no active engagement; defer to ambient system-health state. */
  state: JarvisStateName | null;
  cognitiveLoad: number;
  changedAt: number;
}

let snapshot: JarvisEngagementSnapshot = {
  state: null,
  cognitiveLoad: 0.2,
  changedAt: 0,
};

const listeners = new Set<() => void>();
let clearTimer: ReturnType<typeof setTimeout> | null = null;

function emit() {
  listeners.forEach((l) => l());
}

/**
 * Called by the copilot (chat send, voice input, agent loop) whenever its
 * real operational state changes. Pass `holdMs` to auto-revert to ambient
 * after that many ms of inactivity (default: stays until explicitly cleared
 * for 'thinking'/'listening'/'error'; 'idle' clears immediately).
 */
export function setJarvisEngagement(
  state: JarvisStateName | 'resolved',
  cognitiveLoad = 0.5,
  holdMs = 3200,
) {
  if (clearTimer) {
    clearTimeout(clearTimer);
    clearTimer = null;
  }

  if (state === 'resolved') {
    // Task finished happily — release the override back to ambient state.
    snapshot = { state: null, cognitiveLoad: 0.2, changedAt: Date.now() };
    emit();
    return;
  }

  snapshot = { state, cognitiveLoad, changedAt: Date.now() };
  emit();

  if (state !== 'idle') {
    clearTimer = setTimeout(() => {
      snapshot = { state: null, cognitiveLoad: 0.2, changedAt: Date.now() };
      emit();
    }, holdMs);
  }
}

export function getJarvisEngagement(): JarvisEngagementSnapshot {
  return snapshot;
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

/** React hook — live engagement snapshot, re-renders on every change. */
export function useJarvisEngagement(): JarvisEngagementSnapshot {
  return useSyncExternalStore(subscribe, getJarvisEngagement);
}
