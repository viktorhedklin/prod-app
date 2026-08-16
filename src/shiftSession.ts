import type { ShiftSession } from './types';

function key(date: string): string {
  return `pg_shift_${date}`;
}

export function loadShiftSession(date: string): ShiftSession {
  try {
    const raw = localStorage.getItem(key(date));
    if (!raw) return { date, started_at: null, ended_at: null };
    const parsed = JSON.parse(raw) as Partial<ShiftSession>;
    return {
      date,
      started_at: parsed.started_at ?? null,
      ended_at: parsed.ended_at ?? null,
    };
  } catch {
    return { date, started_at: null, ended_at: null };
  }
}

export function saveShiftSession(session: ShiftSession): void {
  try {
    localStorage.setItem(key(session.date), JSON.stringify(session));
  } catch {
    // non-fatal
  }
}

export function startShiftSession(date: string): ShiftSession {
  const existing = loadShiftSession(date);
  const session: ShiftSession = {
    date,
    started_at: existing.started_at ?? new Date().toISOString(),
    ended_at: null,
  };
  saveShiftSession(session);
  return session;
}

export function endShiftSession(date: string): ShiftSession {
  const existing = loadShiftSession(date);
  const session: ShiftSession = {
    date,
    started_at: existing.started_at ?? new Date().toISOString(),
    ended_at: new Date().toISOString(),
  };
  saveShiftSession(session);
  return session;
}
