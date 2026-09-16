import { NextResponse } from "next/server";

import prisma from "@/app/libs/prismadb";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { parseJson, unauthorized } from "@/app/libs/api";
import { reservationSchema } from "@/app/libs/schemas";

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return unauthorized();
  }

  const parsed = await parseJson(request, reservationSchema);

  if (!parsed.success) {
    return parsed.response;
  }

  const { listingId, startDate, endDate, totalPrice } = parsed.data;

  const listingAndReservation = await prisma.listing.update({
    where: {
      id: listingId,
    },
    data: {
      reservations: {
        create: {
          userId: currentUser.id,
          startDate,
          endDate,
          totalPrice,
        },
      },
    },
  });

  return NextResponse.json(listingAndReservation);
}
