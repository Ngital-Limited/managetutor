import { format } from 'date-fns';

/**
 * Format a date as "14 April 2025" — exact day/month/year, no relative time.
 * Used everywhere in the app instead of `formatDistanceToNow`.
 */
export const formatExactDate = (date: string | number | Date): string => {
  try {
    return format(new Date(date), 'd MMMM yyyy');
  } catch {
    return '';
  }
};

/**
 * Format a date as "14 April 2025, 3:45 PM".
 */
export const formatExactDateTime = (date: string | number | Date): string => {
  try {
    return format(new Date(date), "d MMMM yyyy, h:mm a");
  } catch {
    return '';
  }
};
