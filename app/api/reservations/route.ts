import { NextResponse } from "next/server";

import prisma from "@/app/libs/prismadb";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { apiError, parseJson, unauthorized } from "@/app/libs/api";
import { reservationSchema } from "@/app/libs/schemas";
import { getPricingConfig } from "@/app/config/pricing";
import { calculateReservationQuote } from "@/app/domain/pricing";
import {
  differenceInUtcDays,
  occupiedDates,
  toUtcDate,
} from "@/app/domain/stays";

class BookingConflictError extends Error {}
class ListingNotFoundError extends Error {}

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return unauthorized();
  }

  const parsed = await parseJson(request, reservationSchema);

  if (!parsed.success) {
    return parsed.response;
  }

  const { listingId } = parsed.data;
  const startDate = toUtcDate(parsed.data.startDate);
  const endDate = toUtcDate(parsed.data.endDate);
  const nights = differenceInUtcDays(startDate, endDate);

  try {
    const reservation = await prisma.$transaction(async (transaction) => {
      const listing = await transaction.listing.findUnique({
        where: { id: listingId },
        select: {
          price: true,
          utilitiesFee: true,
          managementFee: true,
          cleaningFee: true,
          deposit: true,
        },
      });

      if (!listing) {
        throw new ListingNotFoundError();
      }

      const overlap = await transaction.reservation.findFirst({
        where: {
          listingId,
          status: { in: ["PENDING", "APPROVED"] },
          startDate: { lt: endDate },
          endDate: { gt: startDate },
        },
        select: { id: true },
      });

      if (overlap) {
        throw new BookingConflictError();
      }

      const quote = calculateReservationQuote({
        nights,
        monthlyRent: listing.price,
        monthlyUtilities: listing.utilitiesFee,
        monthlyManagement: listing.managementFee,
        cleaningFee: listing.cleaningFee,
        deposit: listing.deposit,
        ...getPricingConfig(),
      });

      const created = await transaction.reservation.create({
        data: {
          userId: currentUser.id,
          listingId,
          startDate,
          endDate,
          ...quote,
          status: "PENDING",
        },
      });

      await transaction.availabilityDay.createMany({
        data: occupiedDates(startDate, nights).map((date) => ({
          listingId,
          reservationId: created.id,
          date,
        })),
      });

      return created;
    });

    return NextResponse.json(reservation, { status: 201 });
  } catch (error) {
    if (error instanceof ListingNotFoundError) {
      return apiError(404, "LISTING_NOT_FOUND", "Listing was not found.");
    }

    if (error instanceof BookingConflictError || isUniqueConstraintError(error)) {
      return apiError(
        409,
        "BOOKING_CONFLICT",
        "The listing is no longer available for those dates.",
      );
    }

    return apiError(500, "INTERNAL_ERROR", "Unable to create reservation.");
  }
}
