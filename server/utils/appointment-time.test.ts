import assert from "node:assert/strict";
import { formatInTimeZone } from "date-fns-tz";
import { appointmentDateLabel, appointmentShortDateLabel, appointmentStart, appointmentTimeLabel, centralAppointmentInstant, legacyCalendarDate } from "./appointment-time.js";
import { getOpenSlots } from "./availability.js";

const monday = centralAppointmentInstant("2026-09-14", "1:00 PM");
assert.equal(monday.toISOString(), "2026-09-14T18:00:00.000Z");
assert.equal(appointmentDateLabel({ appointmentDate: new Date("2026-09-14T00:00:00Z"), appointmentTime: "1:00 PM", startTimestamptz: monday }), "Monday, September 14, 2026");
assert.equal(appointmentShortDateLabel({ appointmentDate: new Date("2026-09-14T00:00:00Z"), appointmentTime: "1:00 PM", startTimestamptz: monday }), "9/14/2026");
assert.equal(appointmentTimeLabel({ appointmentDate: new Date("2026-09-14T00:00:00Z"), appointmentTime: "1:00 PM", startTimestamptz: monday }), "1:00 PM");
assert.equal(legacyCalendarDate(monday, true).toISOString(), "2026-09-14T12:00:00.000Z");

// Legacy records still resolve as Central calendar dates rather than UTC instants.
assert.equal(appointmentStart({ appointmentDate: new Date("2026-09-14T00:00:00Z"), appointmentTime: "1:00 PM" }).toISOString(), monday.toISOString());

// DST boundary dates retain their intended local date and clock time.
for (const [date, expectedUtc] of [["2026-03-09", "2026-03-09T14:00:00.000Z"], ["2026-11-02", "2026-11-02T15:00:00.000Z"]]) {
  const instant = centralAppointmentInstant(date, "9:00 AM");
  assert.equal(instant.toISOString(), expectedUtc);
  assert.equal(formatInTimeZone(instant, "America/Chicago", "yyyy-MM-dd h:mm a"), `${date} 9:00 AM`);
}

const rules = [
  { id: 1, weekday: 1, startTime: "09:00", endTime: "17:00", isActive: true },
  { id: 2, weekday: 6, startTime: "10:00", endTime: "14:00", isActive: true },
];
const fakeStorage = {
  getActiveAvailabilityRules: async () => rules,
  getBlockedTimesInRange: async () => [],
  getAllAppointments: async () => [],
};
const slots = await getOpenSlots(fakeStorage as any, new Date("2026-09-12T00:00:00Z"), new Date("2026-09-15T00:00:00Z"), 120, 30, 0);
assert(slots.includes("2026-09-12T15:00:00.000Z"), "Saturday 10 AM Central must be offered");
assert(slots.includes("2026-09-14T14:00:00.000Z"), "Monday 9 AM Central must be offered");

console.log("Scheduling time regression tests passed");
