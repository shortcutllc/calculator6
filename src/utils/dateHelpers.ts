// Date utility functions to handle timezone issues with date inputs

/**
 * Parses a date string in YYYY-MM-DD format as a local date
 * This prevents timezone conversion issues when displaying dates
 */
export function parseLocalDate(dateString: string): Date {
  if (!dateString) return new Date();
  
  // If it's already in YYYY-MM-DD format, parse it as local date
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split('-');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  
  // For other formats, use regular Date constructor
  return new Date(dateString);
}

/**
 * Formats a date string for display, handling timezone issues
 */
export function formatLocalDate(dateString: string, options?: Intl.DateTimeFormatOptions): string {
  const date = parseLocalDate(dateString);
  return date.toLocaleDateString('en-US', options);
}

/**
 * Formats a date string for display with full date format
 */
export function formatLocalDateFull(dateString: string): string {
  return formatLocalDate(dateString, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Formats a date string for display with short date format
 */
export function formatLocalDateShort(dateString: string): string {
  return formatLocalDate(dateString, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}