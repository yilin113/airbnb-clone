import { z } from "zod";
import { japanLocations } from "@/app/data/japanLocations";

const japanLocationSchema = z
  .object({
    value: z.string().trim().min(1).max(255),
    label: z.string().trim().min(1).max(200).optional(),
    latlng: z.tuple([
      z.number().min(20).max(46),
      z.number().min(122).max(154),
    ]).optional(),
    region: z.string().trim().min(1).max(200).optional(),
    prefectureCode: z.string().trim().min(1).max(100),
    prefecture: z.string().trim().min(1).max(100).optional(),
    cityCode: z.string().trim().min(1).max(100),
    city: z.string().trim().min(1).max(100).optional(),
    stationCode: z.string().trim().min(1).max(255),
    station: z.string().trim().min(1).max(200).optional(),
  })
  .refine(
    (value) =>
      japanLocations.some(
        (location) =>
          location.value === value.value &&
          location.prefectureCode === value.prefectureCode &&
          location.cityCode === value.cityCode &&
          location.stationCode === value.stationCode,
      ) ||
      (value.value === `google:${value.stationCode}` &&
        Boolean(value.label) &&
        Boolean(value.latlng) &&
        Boolean(value.region) &&
        Boolean(value.prefecture) &&
        Boolean(value.city) &&
        Boolean(value.station)),
    { message: "Location must match a supported Japanese station." },
  );

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8).max(72),
  name: z.string().trim().min(2).max(80),
});

export const listingSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(2_000),
  imageSrc: z.string().url().max(2_048),
  imageSrcs: z.array(z.string().url().max(2_048)).min(1).max(12),
  category: z.string().trim().min(1).max(50),
  roomCount: z.coerce.number().int().min(1).max(50),
  bathroomCount: z.coerce.number().int().min(1).max(50),
  guestCount: z.coerce.number().int().min(1).max(100),
  location: japanLocationSchema,
  postalCode: z
    .string()
    .trim()
    .regex(/^\d{3}-?\d{4}$/, "Postal code must be a Japanese 7-digit code."),
  addressLine: z.string().trim().min(5).max(200),
  stationWalkMinutes: z.coerce.number().int().min(1).max(120),
  price: z.coerce.number().int().min(1).max(100_000_000),
  utilitiesFee: z.coerce.number().int().min(0).max(100_000_000),
  managementFee: z.coerce.number().int().min(0).max(100_000_000),
  cleaningFee: z.coerce.number().int().min(0).max(100_000_000),
  deposit: z.coerce.number().int().min(0).max(100_000_000),
});

export const reservationDecisionSchema = z.object({
  decision: z.enum(["APPROVED", "DECLINED"]),
});

export const listingDescriptionAssistSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(2_000),
  locationLabel: z.string().trim().min(1).max(200).optional(),
  stationWalkMinutes: z.coerce.number().int().min(1).max(120).optional(),
  roomCount: z.coerce.number().int().min(1).max(50),
  bathroomCount: z.coerce.number().int().min(1).max(50),
  guestCount: z.coerce.number().int().min(1).max(100),
});

export const reservationSchema = z
  .object({
    listingId: z.string().trim().min(1).max(100),
    startDate: z.union([z.iso.date(), z.iso.datetime()]),
    endDate: z.union([z.iso.date(), z.iso.datetime()]),
  })
  .superRefine((value, context) => {
    const startDate = new Date(value.startDate);
    const endDate = new Date(value.endDate);
    const nights = Math.round(
      (Date.UTC(
        endDate.getUTCFullYear(),
        endDate.getUTCMonth(),
        endDate.getUTCDate(),
      ) -
        Date.UTC(
          startDate.getUTCFullYear(),
          startDate.getUTCMonth(),
          startDate.getUTCDate(),
        )) /
        86_400_000,
    );

    if (endDate <= startDate) {
      context.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "End date must be after start date.",
      });
    } else if (nights < 30) {
      context.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "Stays must be at least 30 nights.",
      });
    }
  });
