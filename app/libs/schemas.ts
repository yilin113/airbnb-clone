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
});

export const reservationSchema = z
  .object({
    listingId: z.string().trim().min(1).max(100),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    totalPrice: z.coerce.number().int().min(1).max(1_000_000_000),
  })
  .refine((value) => new Date(value.endDate) > new Date(value.startDate), {
    path: ["endDate"],
    message: "End date must be after start date.",
  });
