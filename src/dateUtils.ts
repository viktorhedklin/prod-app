export function dateKeyFromDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayLocal(reference: Date = new Date()): string {
  return dateKeyFromDate(reference);
}

// The company logs shifts under Singapore time (SGT, UTC+8). The user works
// 00:00-09:00 SGT (= 18:00-03:00 Madrid), so during the evening part of a
// shift the work date is already the next local calendar day. All shift data
// (daily entries, tasks, escalations) is keyed by this SGP work date.
export function workDateLocal(reference: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Singapore',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(reference);
}

export function dateFromKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map((part) => Number(part));
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function addDays(dateKey: string, delta: number): string {
  const date = dateFromKey(dateKey);
  date.setDate(date.getDate() + delta);
  return dateKeyFromDate(date);
}

export function startOfWeekLocal(reference: string | Date = new Date()): string {
  const date = typeof reference === 'string' ? dateFromKey(reference) : new Date(reference);
  const day = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  // Sunday is the first day of the week — go back to the most recent Sunday
  const diff = date.getDate() - day;
  date.setDate(diff);
  return dateKeyFromDate(date);
}

export function startOfMonthLocal(reference: string | Date = new Date()): string {
  const date = typeof reference === 'string' ? dateFromKey(reference) : new Date(reference);
  date.setDate(1);
  return dateKeyFromDate(date);
}

export function endOfMonthLocal(reference: string | Date = new Date()): string {
  const date = typeof reference === 'string' ? dateFromKey(reference) : new Date(reference);
  date.setMonth(date.getMonth() + 1, 0);
  return dateKeyFromDate(date);
}

export function formatLongDate(dateKey: string): string {
  const date = dateFromKey(dateKey);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
