export function dateKeyFromDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayLocal(reference: Date = new Date()): string {
  return dateKeyFromDate(reference);
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
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
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
