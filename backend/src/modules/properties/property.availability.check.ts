// Self-check for availability rules: npx tsx src/modules/properties/property.availability.check.ts
import assert from "node:assert/strict";
import { propertyAvailability, roomAvailability } from "./property.availability";

const d = (s: string) => new Date(`${s}T00:00:00.000Z`);
const today = d("2026-10-28");

// No stays.
assert.deepEqual(roomAvailability([], today), { state: "AVAILABLE", bookedFrom: null, availableFrom: null });

// Future stay: available now, booked from later.
assert.deepEqual(roomAvailability([{ moveInDate: d("2026-12-01"), moveOutDate: null }], today), {
  state: "AVAILABLE", bookedFrom: d("2026-12-01"), availableFrom: null,
});

// Current stay with an end date.
assert.deepEqual(roomAvailability([{ moveInDate: d("2026-10-01"), moveOutDate: d("2027-01-31") }], today), {
  state: "BOOKED", bookedFrom: d("2026-10-01"), availableFrom: d("2027-01-31"),
});

// Back-to-back stays chain; a later gap does not.
assert.deepEqual(
  roomAvailability([
    { moveInDate: d("2027-01-31"), moveOutDate: d("2027-03-01") },
    { moveInDate: d("2026-10-01"), moveOutDate: d("2027-01-31") },
    { moveInDate: d("2027-05-01"), moveOutDate: null },
  ], today).availableFrom,
  d("2027-03-01"),
);

// Open-ended current stay.
assert.equal(roomAvailability([{ moveInDate: d("2026-09-01"), moveOutDate: null }], today).availableFrom, null);

// Property: one of two booked.
const booked = roomAvailability([{ moveInDate: d("2026-10-01"), moveOutDate: d("2027-01-31") }], today);
const free = roomAvailability([], today);
assert.deepEqual(propertyAvailability([booked, free]), {
  totalRooms: 2, availableRooms: 1, fullyBooked: false, bookedFrom: null, nextAvailableFrom: null,
});

// Property: all booked; booked from the latest start, next free is the earliest end.
const other = roomAvailability([{ moveInDate: d("2026-10-15"), moveOutDate: d("2027-02-28") }], today);
assert.deepEqual(propertyAvailability([booked, other]), {
  totalRooms: 2, availableRooms: 0, fullyBooked: true, bookedFrom: d("2026-10-15"), nextAvailableFrom: d("2027-01-31"),
});

console.log("availability checks passed");
