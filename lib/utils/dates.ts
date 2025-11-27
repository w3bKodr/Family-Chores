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

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateShort(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}
