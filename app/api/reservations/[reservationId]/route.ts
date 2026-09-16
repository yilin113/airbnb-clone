import { NextResponse } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import {
  apiError,
  parseJson,
  reservationNotFound,
  unauthorized,
} from "@/app/libs/api";
import prisma from "@/app/libs/prismadb";
import { reservationDecisionSchema } from "@/app/libs/schemas";

interface IParams {
  reservationId?: string;
}

class ReservationNotFoundError extends Error {}
class InvalidReservationStateError extends Error {}

function invalidId() {
  return apiError(400, "VALIDATION_ERROR", "Reservation ID is required.");
}

function internalError() {
  return apiError(500, "INTERNAL_ERROR", "Unable to update reservation.");
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<IParams> },
) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return unauthorized();
  }

  const { reservationId } = await params;

  if (!reservationId) {
    return invalidId();
  }

  const parsed = await parseJson(request, reservationDecisionSchema);

  if (!parsed.success) {
    return parsed.response;
  }

  try {
    const reservation = await prisma.$transaction(async (transaction) => {
      const existing = await transaction.reservation.findFirst({
        where: {
          id: reservationId,
          listing: { userId: currentUser.id },
        },
      });

      if (!existing) {
        throw new ReservationNotFoundError();
      }

      if (existing.status !== "PENDING") {
        throw new InvalidReservationStateError();
      }

      const updated = await transaction.reservation.updateMany({
        where: { id: reservationId, status: "PENDING" },
        data: { status: parsed.data.decision },
      });

      if (updated.count !== 1) {
        throw new InvalidReservationStateError();
      }

      if (parsed.data.decision === "DECLINED") {
        await transaction.availabilityDay.deleteMany({
          where: { reservationId },
        });
      }

      return transaction.reservation.findUnique({
        where: { id: reservationId },
      });
    });

    return NextResponse.json(reservation);
  } catch (error) {
    if (error instanceof ReservationNotFoundError) {
      return reservationNotFound();
    }

    if (error instanceof InvalidReservationStateError) {
      return apiError(
        409,
        "INVALID_RESERVATION_STATE",
        "Only pending reservations can be approved or declined.",
      );
    }

    return internalError();
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<IParams> },
) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return unauthorized();
  }

  const { reservationId } = await params;

  if (!reservationId) {
    return invalidId();
  }

  try {
    const reservation = await prisma.$transaction(async (transaction) => {
      const existing = await transaction.reservation.findFirst({
        where: {
          id: reservationId,
          OR: [
            { userId: currentUser.id },
            { listing: { userId: currentUser.id } },
          ],
        },
      });

      if (!existing) {
        throw new ReservationNotFoundError();
      }

      await transaction.availabilityDay.deleteMany({
        where: { reservationId },
      });

      return transaction.reservation.delete({
        where: { id: reservationId },
      });
    });

    return NextResponse.json(reservation);
  } catch (error) {
    if (error instanceof ReservationNotFoundError) {
      return reservationNotFound();
    }

    return internalError();
  }
}
