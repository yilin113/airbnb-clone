import { NextResponse } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/app/libs/prismadb";
import { parseJson, unauthorized } from "@/app/libs/api";
import { listingSchema } from "@/app/libs/schemas";
import { japanLocations } from "@/app/data/japanLocations";

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

  const curatedLocation = japanLocations.find(
    (candidate) =>
      candidate.value === location.value &&
      candidate.prefectureCode === location.prefectureCode &&
      candidate.cityCode === location.cityCode &&
      candidate.stationCode === location.stationCode,
  );
  const locationLabel = location.label ?? curatedLocation?.label;
  const locationRegion = location.region ?? curatedLocation?.region;
  const locationCoordinates = location.latlng ?? curatedLocation?.latlng;
  const stationName = location.station ?? curatedLocation?.station;

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
      locationLabel,
      locationRegion,
      locationLatitude: locationCoordinates?.[0],
      locationLongitude: locationCoordinates?.[1],
      prefectureCode: location.prefectureCode,
      cityCode: location.cityCode,
      stationCode: location.stationCode,
      stationName,
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
