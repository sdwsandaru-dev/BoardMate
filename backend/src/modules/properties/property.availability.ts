import type { Prisma } from "../../generated/prisma/client";

/** A confirmed stay. moveOutDate is the day the room is free again; null means open-ended. */
export type BookedPeriod = { moveInDate: Date; moveOutDate: Date | null };

/** Midnight UTC today, matching the DATE columns. */
export function todayUtc(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** Confirmed bookings that have not ended yet. Pending requests never block a room. */
export function activeConfirmedBookings(today: Date): Prisma.BookingWhereInput {
  return {
    status: "CONFIRMED",
    OR: [{ moveOutDate: null }, { moveOutDate: { gt: today } }],
  };
}

export type RoomAvailability = {
  /** BOOKED when someone is staying today. */
  state: "AVAILABLE" | "BOOKED";
  /** BOOKED: when the current stay started. AVAILABLE: when the next stay starts (null if none). */
  bookedFrom: Date | null;
  /** BOOKED: first free day after back-to-back stays; null if open-ended. */
  availableFrom: Date | null;
};

export function roomAvailability(periods: BookedPeriod[], today: Date): RoomAvailability {
  const sorted = [...periods].sort((a, b) => a.moveInDate.getTime() - b.moveInDate.getTime());
  const current = sorted.find((p) => p.moveInDate <= today);

  if (!current) {
    return { state: "AVAILABLE", bookedFrom: sorted[0]?.moveInDate ?? null, availableFrom: null };
  }

  // Follow stays that start on or before the day the previous one ends.
  let free: Date | null = current.moveOutDate;
  for (const p of sorted) {
    if (p === current || free === null) continue;
    if (p.moveInDate <= free && (p.moveOutDate === null || p.moveOutDate > free)) {
      free = p.moveOutDate;
    }
  }

  return { state: "BOOKED", bookedFrom: current.moveInDate, availableFrom: free };
}

export type PropertyAvailability = {
  totalRooms: number;
  availableRooms: number;
  fullyBooked: boolean;
  /** Fully booked: the day the last free room was taken. */
  bookedFrom: Date | null;
  /** Fully booked: the earliest day any room frees up; null if every stay is open-ended. */
  nextAvailableFrom: Date | null;
};

export function propertyAvailability(rooms: RoomAvailability[]): PropertyAvailability {
  const booked = rooms.filter((r) => r.state === "BOOKED");
  const fullyBooked = rooms.length > 0 && booked.length === rooms.length;
  const time = (d: Date | null) => d?.getTime() ?? NaN;
  const frees = booked.map((r) => r.availableFrom).filter((d): d is Date => d !== null);

  return {
    totalRooms: rooms.length,
    availableRooms: rooms.length - booked.length,
    fullyBooked,
    bookedFrom: fullyBooked
      ? new Date(Math.max(...booked.map((r) => time(r.bookedFrom))))
      : null,
    nextAvailableFrom:
      fullyBooked && frees.length
        ? new Date(Math.min(...frees.map((d) => d.getTime())))
        : null,
  };
}
