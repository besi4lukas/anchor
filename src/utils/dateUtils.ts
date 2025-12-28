/**
 * Date Utility Functions
 * 
 * Centralized date formatting and manipulation utilities.
 * These functions help maintain consistency in date handling across the app.
 */

/**
 * Gets the start of the week (Sunday) for a given date
 * @param date - The date to get the week start for
 * @returns A new Date object representing the start of the week (Sunday at 00:00:00)
 */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0); // Reset time to start of day
  const day = d.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const diff = d.getDate() - day; // Subtract days to get to Sunday
  const weekStart = new Date(d);
  weekStart.setDate(diff);
  return weekStart;
}

/**
 * Gets all days in a week starting from a given date (Sunday)
 * @param weekStart - The start date of the week (should be Sunday)
 * @returns Array of 7 Date objects representing each day of the week
 */
export function getWeekDays(weekStart: Date): Date[] {
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    days.push(day);
  }
  return days;
}

/**
 * Formats a date to a readable string (e.g., "January 1st, 2024")
 * @param date - The date to format
 * @returns Object with weekday and formatted date string
 */
export function formatDateLong(date: Date): { weekday: string; dateStr: string } {
  const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const getOrdinal = (n: number): string => {
    if (n > 3 && n < 21) return `${n}th`;
    switch (n % 10) {
      case 1: return `${n}st`;
      case 2: return `${n}nd`;
      case 3: return `${n}rd`;
      default: return `${n}th`;
    }
  };

  const weekday = weekdays[date.getDay()];
  const month = months[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();

  return { weekday, dateStr: `${month} ${getOrdinal(day)}, ${year}` };
}

/**
 * Formats a date to a short format (e.g., "1 January")
 * @param date - The date to format
 * @returns Formatted date string
 */
export function formatDateShort(date: Date): string {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${date.getDate()} ${months[date.getMonth()]}`;
}

/**
 * Formats a time to 12-hour format with AM/PM
 * @param date - The date to extract time from
 * @returns Formatted time string (e.g., "3:45 PM")
 */
export function formatTime(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes.toString().padStart(2, "0");
  return `${displayHours}:${displayMinutes} ${ampm}`;
}

/**
 * Checks if a date is today
 * @param date - The date to check
 * @returns True if the date is today, false otherwise
 */
export function isToday(date: Date): boolean {
  return date.toDateString() === new Date().toDateString();
}

/**
 * Gets the next day from a given date
 * @param date - The current date
 * @returns A new Date object representing the next day
 */
export function getNextDay(date: Date): Date {
  const next = new Date(date);
  next.setDate(date.getDate() + 1);
  return next;
}

/**
 * Gets the previous day from a given date
 * @param date - The current date
 * @returns A new Date object representing the previous day
 */
export function getPreviousDay(date: Date): Date {
  const prev = new Date(date);
  prev.setDate(date.getDate() - 1);
  return prev;
}

