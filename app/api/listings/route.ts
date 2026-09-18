import { NextResponse } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/app/libs/prismadb";
import { parseJson, unauthorized } from "@/app/libs/api";
import { listingSchema } from "@/app/libs/schemas";

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return unauthorized();
  }

  const parsed = await parseJson(request, listingSchema);

  if (!parsed.success) {
    return parsed.response;
  }

  const {
    title,
    description,
    imageSrc,
    imageSrcs,
    category,
    roomCount,
    bathroomCount,
    guestCount,
    location,
    postalCode,
    addressLine,
    stationWalkMinutes,
    price,
    utilitiesFee,
    managementFee,
    cleaningFee,
    deposit,
  } = parsed.data;

  const listing = await prisma.listing.create({
    data: {
      title,
      description,
      imageSrc,
      imageSrcs,
      category,
      roomCount,
      bathroomCount,
      guestCount,
      locationValue: location.value,
      prefectureCode: location.prefectureCode,
      cityCode: location.cityCode,
      stationCode: location.stationCode,
      postalCode,
      addressLine,
      stationWalkMinutes,
      price,
      utilitiesFee,
      managementFee,
      cleaningFee,
      deposit,
      userId: currentUser.id,
    },
  });

  return NextResponse.json(listing);
}
