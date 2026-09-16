// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DELETE } from "@/app/api/reservations/[reservationId]/route";
import { POST } from "@/app/api/reservations/route";
import { makeListing, makeReservation, makeUser } from "../helpers/factories";
import { prismaMock } from "../helpers/prisma";

const getCurrentUser = vi.hoisted(() => vi.fn());

vi.mock("@/app/actions/getCurrentUser", () => ({ default: getCurrentUser }));

vi.mock("@/app/libs/prismadb", async () => ({
  default: (await import("../helpers/prisma")).prismaMock,
}));

function postRequest(body: unknown) {
  return new Request("http://localhost/api/reservations", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

const reservationBody = {
  listingId: "listing-1",
  startDate: "2024-05-01T00:00:00.000Z",
  endDate: "2024-05-31T00:00:00.000Z",
};

const pricedListing = makeListing({
  price: 30_000,
  utilitiesFee: 6_000,
  managementFee: 3_000,
  cleaningFee: 5_000,
  deposit: 20_000,
});

beforeEach(() => {
  getCurrentUser.mockReset();
  prismaMock.$transaction.mockClear();
  prismaMock.listing.findUnique.mockReset();
  prismaMock.reservation.findFirst.mockReset();
  prismaMock.reservation.create.mockReset();
  prismaMock.reservation.deleteMany.mockReset();
  prismaMock.availabilityDay.createMany.mockReset();
});

describe("POST /api/reservations", () => {
  it("errors when signed out", async () => {
    getCurrentUser.mockResolvedValue(null);

    const response = await POST(postRequest(reservationBody));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "UNAUTHORIZED" },
    });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it.each([
    ["listingId", { ...reservationBody, listingId: "" }],
    ["startDate", { ...reservationBody, startDate: "" }],
    ["endDate", { ...reservationBody, endDate: "" }],
  ])("errors when %s is missing", async (_field, body) => {
    getCurrentUser.mockResolvedValue(makeUser());

    const response = await POST(postRequest(body));

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "VALIDATION_ERROR" },
    });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("rejects a checkout date that is not after check-in", async () => {
    getCurrentUser.mockResolvedValue(makeUser());

    const response = await POST(
      postRequest({ ...reservationBody, endDate: reservationBody.startDate }),
    );

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "VALIDATION_ERROR",
        issues: [
          {
            path: "endDate",
            message: "End date must be after start date.",
          },
        ],
      },
    });
  });

  it("enforces the 30-night minimum", async () => {
    getCurrentUser.mockResolvedValue(makeUser());

    const response = await POST(
      postRequest({
        ...reservationBody,
        endDate: "2024-05-30T00:00:00.000Z",
      }),
    );

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        issues: [
          { path: "endDate", message: "Stays must be at least 30 nights." },
        ],
      },
    });
  });

  it("calculates the quote on the server and locks every occupied night", async () => {
    const user = makeUser();
    const created = makeReservation({
      startDate: new Date(reservationBody.startDate),
      endDate: new Date(reservationBody.endDate),
      nights: 30,
      rentSubtotal: 30_000,
      utilitiesTotal: 6_000,
      managementTotal: 3_000,
      cleaningFee: 5_000,
      deposit: 20_000,
      guestServiceFee: 2_640,
      hostCommission: 2_640,
      totalPrice: 66_640,
      hostPayout: 41_360,
    });
    getCurrentUser.mockResolvedValue(user);
    prismaMock.listing.findUnique.mockResolvedValue(pricedListing);
    prismaMock.reservation.findFirst.mockResolvedValue(null);
    prismaMock.reservation.create.mockResolvedValue(created);
    prismaMock.availabilityDay.createMany.mockResolvedValue({ count: 30 });

    const response = await POST(
      postRequest({ ...reservationBody, totalPrice: 1 }),
    );

    expect(response.status).toBe(201);
    expect(prismaMock.listing.findUnique).toHaveBeenCalledWith({
      where: { id: "listing-1" },
      select: {
        price: true,
        utilitiesFee: true,
        managementFee: true,
        cleaningFee: true,
        deposit: true,
      },
    });
    expect(prismaMock.reservation.findFirst).toHaveBeenCalledWith({
      where: {
        listingId: "listing-1",
        status: { in: ["PENDING", "APPROVED"] },
        startDate: { lt: new Date(reservationBody.endDate) },
        endDate: { gt: new Date(reservationBody.startDate) },
      },
      select: { id: true },
    });
    expect(prismaMock.reservation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: user.id,
        listingId: "listing-1",
        nights: 30,
        rentSubtotal: 30_000,
        guestServiceFee: 2_640,
        hostCommission: 2_640,
        totalPrice: 66_640,
        hostPayout: 41_360,
        status: "PENDING",
      }),
    });
    const lockInput = prismaMock.availabilityDay.createMany.mock.calls[0][0];
    expect(lockInput.data).toHaveLength(30);
    expect(lockInput.data[0]).toEqual({
      listingId: "listing-1",
      reservationId: created.id,
      date: new Date(reservationBody.startDate),
    });
    expect(lockInput.data[29].date).toEqual(
      new Date("2024-05-30T00:00:00.000Z"),
    );
    await expect(response.json()).resolves.toMatchObject({
      id: created.id,
      totalPrice: 66_640,
      status: "PENDING",
    });
  });

  it("returns not found for an unknown listing", async () => {
    getCurrentUser.mockResolvedValue(makeUser());
    prismaMock.listing.findUnique.mockResolvedValue(null);

    const response = await POST(postRequest(reservationBody));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "LISTING_NOT_FOUND" },
    });
  });

  it("rejects a range that overlaps an existing request", async () => {
    getCurrentUser.mockResolvedValue(makeUser());
    prismaMock.listing.findUnique.mockResolvedValue(pricedListing);
    prismaMock.reservation.findFirst.mockResolvedValue({ id: "existing" });

    const response = await POST(postRequest(reservationBody));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "BOOKING_CONFLICT" },
    });
    expect(prismaMock.reservation.create).not.toHaveBeenCalled();
  });

  it("maps a unique day-lock race to a booking conflict", async () => {
    getCurrentUser.mockResolvedValue(makeUser());
    prismaMock.listing.findUnique.mockResolvedValue(pricedListing);
    prismaMock.reservation.findFirst.mockResolvedValue(null);
    prismaMock.reservation.create.mockResolvedValue(makeReservation());
    prismaMock.availabilityDay.createMany.mockRejectedValue({ code: "P2002" });

    const response = await POST(postRequest(reservationBody));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "BOOKING_CONFLICT" },
    });
  });

  it("returns a safe error for an unexpected database failure", async () => {
    getCurrentUser.mockResolvedValue(makeUser());
    prismaMock.listing.findUnique.mockRejectedValue(new Error("db down"));

    const response = await POST(postRequest(reservationBody));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "INTERNAL_ERROR" },
    });
  });
});

describe("DELETE /api/reservations/[reservationId]", () => {
  const request = new Request("http://localhost/api/reservations/r-1", {
    method: "DELETE",
  });

  it("errors when signed out", async () => {
    getCurrentUser.mockResolvedValue(null);

    const response = await DELETE(request, {
      params: Promise.resolve({ reservationId: "r-1" }),
    });

    expect(response.type).toBe("error");
  });

  it("rejects a missing id", async () => {
    getCurrentUser.mockResolvedValue(makeUser());

    await expect(
      DELETE(request, { params: Promise.resolve({}) }),
    ).rejects.toThrow("Invalid ID");
  });

  it("lets either the guest or the host cancel", async () => {
    const user = makeUser();
    getCurrentUser.mockResolvedValue(user);
    prismaMock.reservation.deleteMany.mockResolvedValue({ count: 1 });

    const response = await DELETE(request, {
      params: Promise.resolve({ reservationId: "r-1" }),
    });

    expect(prismaMock.reservation.deleteMany).toHaveBeenCalledWith({
      where: {
        id: "r-1",
        OR: [{ userId: user.id }, { listing: { userId: user.id } }],
      },
    });
    await expect(response.json()).resolves.toEqual({ count: 1 });
  });
});
