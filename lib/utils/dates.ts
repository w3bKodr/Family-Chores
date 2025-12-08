export function getDayName(index: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[index];
}

export function getToday(): string {
  const today = new Date();
  return getDayName(today.getDay());
}

export function getTodayDate(): string {
  const today = new Date();
  // Use local timezone, not UTC
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isChoreForToday(repeatingDays: string[]): boolean {
  const today = getToday();
  return repeatingDays.includes(today);
}

export function generateFamilyCode(): string {
  return Math.random().toString(36).substr(2, 6).toUpperCase();
}

/**
 * Parse a date string (YYYY-MM-DD) as local date, not UTC
 * This prevents timezone offset issues where "2025-12-07" becomes Dec 6
 */
export function parseDateStringLocal(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0); // Noon to avoid timezone edge cases
}

/**
 * Get user's timezone offset in minutes
 */
export function getTimezoneOffset(): number {
  return new Date().getTimezoneOffset();
}

/**
 * Get user's timezone name (e.g., "America/New_York")
 */
export function getTimezoneName(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (e) {
    return 'UTC';
  }
}

export function formatDate(date: string | Date): string {
  let d: Date;
  if (typeof date === 'string') {
    // Parse date string in local timezone
    d = parseDateStringLocal(date);
  } else {
    d = date;
  }
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateShort(date: string | Date): string {
  let d: Date;
  if (typeof date === 'string') {
    // Parse date string in local timezone
    d = parseDateStringLocal(date);
  } else {
    d = date;
  }
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}
