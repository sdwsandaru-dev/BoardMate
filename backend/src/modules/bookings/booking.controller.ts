
import type { Request, Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../middleware/authenticate";
import { createBookingSchema } from "./booking.validation";
import {
  BookingError,
  createBooking,
  listStudentBookings,
  listOwnerBookings,
  getBookingById,
  updateBookingStatus,
} from "./booking.service";

function handleError(
  error: unknown,
  res: Response,
  next: NextFunction,
) {
  if (error instanceof BookingError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
  }

  return next(error);
}

function getUser(req: Request) {
  return (req as AuthenticatedRequest).user as {
    id: string;
    role: string;
  };
}

export async function createBookingHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = getUser(req);
    const parsed = createBookingSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking information",
        errors: parsed.error.flatten(),
      });
    }

    const booking = await createBooking(user.id, parsed.data);

    return res.status(201).json({
      success: true,
      message: "Booking request created successfully",
      data: booking,
    });
  } catch (error) {
    return handleError(error, res, next);
  }
}

export async function listMyBookingsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = getUser(req);
    const bookings = await listStudentBookings(user.id);

    return res.status(200).json({
      success: true,
      data: bookings,
    });
  } catch (error) {
    return handleError(error, res, next);
  }
}

export async function listOwnerBookingsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = getUser(req);
    const bookings = await listOwnerBookings(user.id);

    return res.status(200).json({
      success: true,
      data: bookings,
    });
  } catch (error) {
    return handleError(error, res, next);
  }
}

export async function getBookingHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = getUser(req);
    const bookingId = req.params.bookingId;

    if (typeof bookingId !== "string" || !bookingId) {
      return res.status(400).json({
        success: false,
        message: "Booking ID is required",
      });
    }

    const booking = await getBookingById(
      bookingId,
      user.id,
      user.role,
    );

    return res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    return handleError(error, res, next);
  }
}

async function changeStatus(
  req: Request,
  res: Response,
  next: NextFunction,
  action: "CANCELLED" | "CONFIRMED" | "REJECTED",
) {
  try {
    const user = getUser(req);
    const bookingId = req.params.bookingId;

    if (typeof bookingId !== "string" || !bookingId) {
      return res.status(400).json({
        success: false,
        message: "Booking ID is required",
      });
    }

    const booking = await updateBookingStatus(
      bookingId,
      user.id,
      user.role,
      action,
    );

    return res.status(200).json({
      success: true,
      message: `Booking ${action.toLowerCase()} successfully`,
      data: booking,
    });
  } catch (error) {
    return handleError(error, res, next);
  }
}

export function cancelBookingHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  return changeStatus(req, res, next, "CANCELLED");
}

export function approveBookingHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  return changeStatus(req, res, next, "CONFIRMED");
}

export function rejectBookingHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  return changeStatus(req, res, next, "REJECTED");
}
