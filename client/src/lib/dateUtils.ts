/**
 * Date utility functions for standardized date handling
 * This module ensures consistent date formats across the application
 */

// Convert a Date object to YYYY-MM-DD string
export function formatDateToYYYYMMDD(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Parse a YYYY-MM-DD string to a Date object at noon
export function parseYYYYMMDD(dateString: string): Date {
  const date = new Date(dateString);
  date.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues
  return date;
}

// Create a noon date for today
export function createTodayNoon(): Date {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return today;
}

// Get start and end of day as Date objects (for queries that need full timestamps)
export function getStartOfDay(dateString: string): Date {
  const date = new Date(dateString);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function getEndOfDay(dateString: string): Date {
  const date = new Date(dateString);
  date.setHours(23, 59, 59, 999);
  return date;
}

// Get first and last days of month as YYYY-MM-DD strings
export function getMonthDateRange(year: number, month: number): { startDate: string, endDate: string } {
  const firstDay = new Date(year, month, 1);
  firstDay.setHours(12, 0, 0, 0);
  
  const lastDay = new Date(year, month + 1, 0);
  lastDay.setHours(12, 0, 0, 0);
  
  return {
    startDate: formatDateToYYYYMMDD(firstDay),
    endDate: formatDateToYYYYMMDD(lastDay)
  };
}

// Get all dates in a month as YYYY-MM-DD strings
export function getAllDatesInMonth(year: number, month: number): string[] {
  const { startDate, endDate } = getMonthDateRange(year, month);
  const startDateObj = parseYYYYMMDD(startDate);
  const endDateObj = parseYYYYMMDD(endDate);
  
  const dates: string[] = [];
  const currentDate = new Date(startDateObj);
  
  while (currentDate <= endDateObj) {
    dates.push(formatDateToYYYYMMDD(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return dates;
}

// Validates a date string is in YYYY-MM-DD format
export function isValidYYYYMMDD(dateString: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

// Ensure a date is not in the future
export function ensureDateNotInFuture(date: Date): Date {
  // Create dates with time set to midnight for comparison
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);
  
  // Create a comparison date with only the date part
  const dateForComparison = new Date(date);
  dateForComparison.setHours(0, 0, 0, 0);
  
  if (dateForComparison > currentDate) {
    // If future date, use today at noon
    const safeDate = new Date();
    safeDate.setHours(12, 0, 0, 0);
    return safeDate;
  }
  
  // If it's today or earlier, keep the original date but ensure noon time
  const result = new Date(date);
  result.setHours(12, 0, 0, 0);
  return result;
}
