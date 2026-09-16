import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8).max(72),
  name: z.string().trim().min(2).max(80),
});

export const listingSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(2_000),
  imageSrc: z.string().url().max(2_048),
  category: z.string().trim().min(1).max(50),
  roomCount: z.coerce.number().int().min(1).max(50),
  bathroomCount: z.coerce.number().int().min(1).max(50),
  guestCount: z.coerce.number().int().min(1).max(100),
  location: z.object({
    value: z.string().trim().min(1).max(20),
  }),
  price: z.coerce.number().int().min(1).max(100_000_000),
  utilitiesFee: z.coerce.number().int().min(0).max(100_000_000),
  managementFee: z.coerce.number().int().min(0).max(100_000_000),
  cleaningFee: z.coerce.number().int().min(0).max(100_000_000),
  deposit: z.coerce.number().int().min(0).max(100_000_000),
});

export const reservationDecisionSchema = z.object({
  decision: z.enum(["APPROVED", "DECLINED"]),
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
