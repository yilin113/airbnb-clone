import type { Listing, Reservation, User } from "@prisma/client";

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-1",
    name: "Ada Lovelace",
    email: "ada@example.com",
    emailVerified: null,
    image: "https://example.com/ada.png",
    hashedPassword: "hashed",
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
    favoriteIds: [],
    ...overrides,
  };
}

export function makeListing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: "listing-1",
    userId: "user-1",
    title: "Sunny loft",
    description: "A very sunny loft",
    imageSrc: "https://example.com/loft.png",
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    category: "Beach",
    roomCount: 2,
    bathroomCount: 1,
    guestCount: 4,
    locationValue: "tokyo-shinjuku",
    prefectureCode: "13",
    cityCode: "13104",
    stationCode: "JY17",
    price: 120,
    utilitiesFee: 0,
    managementFee: 0,
    cleaningFee: 0,
    deposit: 0,
    ...overrides,
  };
}

export function makeReservation(
  overrides: Partial<Reservation> = {}
): Reservation {
  return {
    id: "reservation-1",
    userId: "user-1",
    listingId: "listing-1",
    // Local-time constructors keep the formatted output timezone independent.
    startDate: new Date(2024, 4, 1),
    endDate: new Date(2024, 4, 5),
    nights: 4,
    rentSubtotal: 480,
    utilitiesTotal: 0,
    managementTotal: 0,
    cleaningFee: 0,
    deposit: 0,
    guestServiceFee: 29,
    hostCommission: 29,
    totalPrice: 480,
    hostPayout: 451,
    status: "PENDING",
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    ...overrides,
  };
}
