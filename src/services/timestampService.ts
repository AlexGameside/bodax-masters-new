import { serverTimestamp, Timestamp } from 'firebase/firestore';

export class TimestampService {
  
  // Get current server timestamp (preferred for database operations)
  static getServerTimestamp() {
    return serverTimestamp();
  }
  
  // Get current client timestamp in UTC
  static getCurrentUTCTimestamp(): Date {
    return new Date();
  }
  
  // Convert any timestamp to Date object safely
  static toDate(timestamp: any): Date {
    if (!timestamp) return new Date();
    
    try {
      // Handle Firestore Timestamp
      if (timestamp && typeof timestamp === 'object' && timestamp.seconds !== undefined) {
        return new Date(timestamp.seconds * 1000);
      }
      
      // Handle string timestamp
      if (typeof timestamp === 'string') {
        return new Date(timestamp);
      }
      
      // Handle Date object
      if (timestamp instanceof Date) {
        return timestamp;
      }
      
      // Handle number (milliseconds)
      if (typeof timestamp === 'number') {
        return new Date(timestamp);
      }
      
      // Fallback to current time
      console.warn('Invalid timestamp format, using current time:', timestamp);
      return new Date();
      
    } catch (error) {
      console.error('Error converting timestamp:', error, 'Timestamp:', timestamp);
      return new Date();
    }
  }
  
  // Convert Date to Firestore Timestamp
  static toFirestoreTimestamp(date: Date): Timestamp {
    return Timestamp.fromDate(date);
  }
  
  // Get timezone offset in minutes for current location
  static getTimezoneOffset(): number {
    return new Date().getTimezoneOffset();
  }
  
  // Convert local time to UTC
  static localToUTC(localDate: Date): Date {
    const utcTime = localDate.getTime() + (localDate.getTimezoneOffset() * 60000);
    return new Date(utcTime);
  }
  
  // Convert UTC to local time
  static utcToLocal(utcDate: Date): Date {
    const localTime = utcDate.getTime() - (utcDate.getTimezoneOffset() * 60000);
    return new Date(localTime);
  }
  
  // Format date for display (local timezone)
  static formatForDisplay(date: Date, locale: string = 'de-DE'): string {
    try {
      return date.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Berlin'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return date.toISOString();
    }
  }
  
  // Format date for database storage (UTC)
  static formatForStorage(date: Date): string {
    return date.toISOString();
  }
  
  // Check if two dates are within a time buffer
  static isWithinBuffer(date1: Date, date2: Date, bufferMinutes: number): boolean {
    const diffMs = Math.abs(date1.getTime() - date2.getTime());
    const bufferMs = bufferMinutes * 60 * 1000;
    return diffMs <= bufferMs;
  }
  
  // Add buffer time to a date (for scheduling conflicts)
  static addBuffer(date: Date, bufferMinutes: number): Date {
    return new Date(date.getTime() + (bufferMinutes * 60 * 1000));
  }
  
  // Subtract buffer time from a date (for scheduling conflicts)
  static subtractBuffer(date: Date, bufferMinutes: number): Date {
    return new Date(date.getTime() - (bufferMinutes * 60 * 1000));
  }
  
  // Get start of day in UTC
  static getStartOfDay(date: Date): Date {
    const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    return utcDate;
  }
  
  // Get end of day in UTC
  static getEndOfDay(date: Date): Date {
    const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
    return utcDate;
  }
  
  // Check if date is in the past
  static isPast(date: Date): boolean {
    return date < new Date();
  }
  
  // Check if date is in the future
  static isFuture(date: Date): boolean {
    return date > new Date();
  }
  
  // Get days between two dates
  static getDaysBetween(date1: Date, date2: Date): number {
    const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(diffTime / oneDay);
  }
  
  // Validate date string format
  static isValidDateString(dateString: string): boolean {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  }
}


