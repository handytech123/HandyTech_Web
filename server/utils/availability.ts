import type { IStorage } from "../storage";
import type { AvailabilityRule, Appointment, BlockedTime } from "@shared/schema";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { appointmentStart, BUSINESS_TIME_ZONE } from "./appointment-time.js";

// Interface for time intervals representing busy periods
interface TimeInterval {
  start: Date;
  end: Date;
}

// Interface for daily availability window
interface AvailabilityWindow {
  start: Date;
  end: Date;
}

/**
 * Core availability engine for HandyTech scheduler system
 * 
 * TIMEZONE HANDLING:
 * - Input dates (from/to) should be in the business timezone
 * - Availability rules use local time (e.g., "09:00" = 9 AM local business time)
 * - Appointments use timestamptz for timezone-aware storage
 * - Output slots are ISO strings that represent local business time moments
 * - All calculations assume the same timezone throughout (business local time)
 * 
 * @param storage - Storage interface for database access
 * @param from - Start date for availability search (business timezone)
 * @param to - End date for availability search (business timezone)
 * @param blockMinutes - Duration of appointment in minutes (e.g., 120, 240, 360)
 * @param stepMinutes - Step size in minutes for slot scanning (default: 30)
 * @param bufferMinutes - Buffer time in minutes around appointments (default: 15)
 * @returns Array of ISO datetime strings representing available appointment start times
 */
export async function getOpenSlots(
  storage: IStorage,
  from: Date,
  to: Date,
  blockMinutes: number,
  stepMinutes: number = 30,
  bufferMinutes: number = 15,
  excludeAppointmentId?: number
): Promise<string[]> {
  try {
    // Validate input parameters
    if (from >= to) {
      throw new Error("Invalid date range: 'from' must be before 'to'");
    }
    if (blockMinutes <= 0 || stepMinutes <= 0) {
      throw new Error("Block minutes and step minutes must be positive values");
    }

    // Fetch all necessary data in parallel for efficiency
    const [availabilityRules, blockedTimes, allAppointments] = await Promise.all([
      storage.getActiveAvailabilityRules(),
      storage.getBlockedTimesInRange(from.toISOString(), to.toISOString()),
      storage.getAllAppointments()
    ]);

    // Filter appointments to only include those in our date range
    const relevantAppointments = filterAppointmentsInRange(allAppointments, from, to)
      .filter(appointment => appointment.id !== excludeAppointmentId);

    // Build busy intervals from appointments and blocked times
    const busyIntervals = buildBusyIntervals(relevantAppointments, blockedTimes, bufferMinutes);

    // Generate available slots
    const availableSlots: string[] = [];
    
    // Iterate through each day in the range
    let dateKey = formatInTimeZone(from, BUSINESS_TIME_ZONE, "yyyy-MM-dd");
    const lastDateKey = formatInTimeZone(new Date(to.getTime() - 1), BUSINESS_TIME_ZONE, "yyyy-MM-dd");
    while (dateKey <= lastDateKey) {
      // Get availability windows for this day of the week
      const weekday = new Date(`${dateKey}T12:00:00Z`).getUTCDay(); // 0=Sunday, 6=Saturday
      const dayAvailabilityRules = availabilityRules.filter(rule => rule.weekday === weekday);
      
      // Process each availability window for this day
      for (const rule of dayAvailabilityRules) {
        const window = createAvailabilityWindow(dateKey, rule);
        
        // Intersect the availability window with the requested [from, to] bounds
        const boundedWindow = intersectWindowWithBounds(window, from, to);
        
        // Only find slots if the bounded window is valid
        if (boundedWindow.start < boundedWindow.end) {
          const daySlots = findSlotsInWindow(boundedWindow, blockMinutes, stepMinutes, busyIntervals);
          availableSlots.push(...daySlots);
        }
      }
      
      // Move to next day
      const next = new Date(`${dateKey}T12:00:00Z`);
      next.setUTCDate(next.getUTCDate() + 1);
      dateKey = next.toISOString().slice(0, 10);
    }

    // Remove duplicates that can occur when multiple availability rules overlap
    // and sort slots chronologically
    return Array.from(new Set(availableSlots)).sort();

  } catch (error) {
    console.error("Error in getOpenSlots:", error);
    throw new Error(`Availability calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Filter appointments to only include those that overlap with the specified date range
 */
function filterAppointmentsInRange(appointments: Appointment[], from: Date, to: Date): Appointment[] {
  return appointments.filter(appointment => {
    // Use timezone-aware timestamps if available, fallback to legacy date/time
    let appointmentStart: Date;
    let appointmentEnd: Date;

    if (appointment.startTimestamptz && appointment.endTimestamptz) {
      appointmentStart = new Date(appointment.startTimestamptz);
      appointmentEnd = new Date(appointment.endTimestamptz);
    } else if (appointment.appointmentDate && appointment.appointmentTime) {
      // Fallback to legacy format - parse time string
      appointmentStart = parseLegacyDateTime(appointment.appointmentDate, appointment.appointmentTime);
      // Estimate 2-hour duration if no end time
      appointmentEnd = new Date(appointmentStart.getTime() + (2 * 60 * 60 * 1000));
    } else {
      // Skip appointments without valid time data
      return false;
    }

    // Check if appointment overlaps with our search range and should be treated as busy
    // Include scheduled and confirmed appointments to prevent double-booking
    const busyStatuses = ["scheduled", "confirmed", "in-progress"];
    return appointmentStart < to && appointmentEnd > from && busyStatuses.includes(appointment.status);
  });
}

/**
 * Parse legacy date and time format into a Date object
 */
function parseLegacyDateTime(date: Date, timeString: string): Date {
  return appointmentStart({ appointmentDate: date, appointmentTime: timeString });
}

/**
 * Build a list of busy time intervals from appointments and blocked times
 * Adds configurable buffer time around appointments
 */
function buildBusyIntervals(appointments: Appointment[], blockedTimes: BlockedTime[], bufferMinutes: number): TimeInterval[] {
  const intervals: TimeInterval[] = [];

  // Add appointment intervals
  for (const appointment of appointments) {
    let start: Date;
    let end: Date;

    if (appointment.startTimestamptz && appointment.endTimestamptz) {
      start = new Date(appointment.startTimestamptz);
      end = new Date(appointment.endTimestamptz);
    } else if (appointment.appointmentDate && appointment.appointmentTime) {
      start = parseLegacyDateTime(appointment.appointmentDate, appointment.appointmentTime);
      end = new Date(start.getTime() + (2 * 60 * 60 * 1000)); // Default 2 hours
    } else {
      continue; // Skip invalid appointments
    }

    // Add buffer time
    const bufferedStart = new Date(start.getTime() - (bufferMinutes * 60 * 1000));
    const bufferedEnd = new Date(end.getTime() + (bufferMinutes * 60 * 1000));

    intervals.push({ start: bufferedStart, end: bufferedEnd });
  }

  // Add blocked time intervals
  for (const blockedTime of blockedTimes) {
    const start = new Date(blockedTime.startTimestamptz);
    const end = new Date(blockedTime.endTimestamptz);
    intervals.push({ start, end });
  }

  // Sort intervals by start time for efficient overlap checking
  return intervals.sort((a, b) => a.start.getTime() - b.start.getTime());
}

/**
 * Intersect an availability window with the requested [from, to] bounds
 * This ensures slots are only returned within the requested date range
 */
function intersectWindowWithBounds(window: AvailabilityWindow, from: Date, to: Date): AvailabilityWindow {
  return {
    start: new Date(Math.max(window.start.getTime(), from.getTime())),
    end: new Date(Math.min(window.end.getTime(), to.getTime())),
  };
}

/**
 * Create an availability window for a specific day and availability rule
 * Properly handles timezone conversion for Central Time business hours
 */
function createAvailabilityWindow(dateStr: string, rule: AvailabilityRule): AvailabilityWindow {
  // Convert business local times to UTC properly
  // Create local time strings and convert to UTC
  const startTimeStr = `${rule.startTime}:00`;
  const endTimeStr = `${rule.endTime}:00`;
  
  const windowStart = fromZonedTime(`${dateStr}T${startTimeStr}`, BUSINESS_TIME_ZONE);
  const windowEnd = fromZonedTime(`${dateStr}T${endTimeStr}`, BUSINESS_TIME_ZONE);

  // Validate for overnight rules (endTime < startTime)
  if (windowEnd <= windowStart) {
    console.warn(
      `Overnight availability rule detected for weekday ${rule.weekday} (${rule.startTime} - ${rule.endTime}). ` +
      `Currently not supported - rule will be skipped. Consider splitting into separate rules.`
    );
    // Return an invalid window that will be filtered out
    return { start: windowStart, end: windowStart };
  }

  return { start: windowStart, end: windowEnd };
}

/**
 * Parse time string like "09:00" into hours and minutes
 */
/**
 * Find available slots within a specific availability window
 */
function findSlotsInWindow(
  window: AvailabilityWindow,
  blockMinutes: number,
  stepMinutes: number,
  busyIntervals: TimeInterval[]
): string[] {
  const slots: string[] = [];
  
  // Start scanning from the beginning of the window
  let currentTime = new Date(window.start);
  
  while (currentTime.getTime() + (blockMinutes * 60 * 1000) <= window.end.getTime()) {
    const slotEnd = new Date(currentTime.getTime() + (blockMinutes * 60 * 1000));
    
    // Check if this slot conflicts with any busy interval
    const hasConflict = busyIntervals.some(interval => 
      intervalsOverlap(
        { start: currentTime, end: slotEnd },
        interval
      )
    );
    
    if (!hasConflict) {
      slots.push(currentTime.toISOString());
    }
    
    // Move to next step
    currentTime = new Date(currentTime.getTime() + (stepMinutes * 60 * 1000));
  }
  
  return slots;
}

/**
 * Check if two time intervals overlap
 */
function intervalsOverlap(interval1: TimeInterval, interval2: TimeInterval): boolean {
  return interval1.start < interval2.end && interval1.end > interval2.start;
}
