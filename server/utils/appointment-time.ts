import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export const BUSINESS_TIME_ZONE = "America/Chicago";

type AppointmentTimeSource = {
  appointmentDate: Date | string;
  appointmentTime: string;
  startTimestamptz?: Date | string | null;
};

export function calendarDateKey(value: Date | string): string {
  if (typeof value === "string") {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})(?:T|$)/);
    if (match) return match[1];
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid appointment date");
  return date.toISOString().slice(0, 10);
}

export function parseAppointmentClock(value: string): { hours: number; minutes: number } {
  const input = value.trim();
  const twelve = input.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (twelve) {
    let hours = Number(twelve[1]);
    const minutes = Number(twelve[2]);
    if (hours < 1 || hours > 12 || minutes > 59) throw new Error("Invalid appointment time");
    if (twelve[3].toUpperCase() === "AM") hours = hours === 12 ? 0 : hours;
    else hours = hours === 12 ? 12 : hours + 12;
    return { hours, minutes };
  }
  const twentyFour = input.match(/^(\d{1,2}):(\d{2})$/);
  if (!twentyFour) throw new Error("Invalid appointment time");
  const hours = Number(twentyFour[1]);
  const minutes = Number(twentyFour[2]);
  if (hours > 23 || minutes > 59) throw new Error("Invalid appointment time");
  return { hours, minutes };
}

export function centralAppointmentInstant(date: Date | string, time: string): Date {
  const dateKey = calendarDateKey(date);
  const { hours, minutes } = parseAppointmentClock(time);
  return fromZonedTime(`${dateKey}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`, BUSINESS_TIME_ZONE);
}

export function appointmentStart(source: AppointmentTimeSource): Date {
  if (source.startTimestamptz) {
    const start = new Date(source.startTimestamptz);
    if (!Number.isNaN(start.getTime())) return start;
  }
  return centralAppointmentInstant(source.appointmentDate, source.appointmentTime);
}

export function appointmentDateLabel(source: AppointmentTimeSource): string {
  return formatInTimeZone(appointmentStart(source), BUSINESS_TIME_ZONE, "EEEE, MMMM d, yyyy");
}

export function appointmentShortDateLabel(source: AppointmentTimeSource): string {
  return formatInTimeZone(appointmentStart(source), BUSINESS_TIME_ZONE, "M/d/yyyy");
}

export function appointmentTimeLabel(source: AppointmentTimeSource): string {
  return formatInTimeZone(appointmentStart(source), BUSINESS_TIME_ZONE, "h:mm a");
}

// Legacy date-only column carrier. Noon UTC cannot roll to an adjacent date in
// any continental US time zone. Precise scheduling always uses startTimestamptz.
export function legacyCalendarDate(dateOrStart: Date | string, isInstant = false): Date {
  const key = isInstant
    ? formatInTimeZone(new Date(dateOrStart), BUSINESS_TIME_ZONE, "yyyy-MM-dd")
    : calendarDateKey(dateOrStart);
  return new Date(`${key}T12:00:00.000Z`);
}
