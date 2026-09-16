// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  DELETE,
  PATCH,
} from "@/app/api/reservations/[reservationId]/route";
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
  prismaMock.reservation.findUnique.mockReset();
  prismaMock.reservation.create.mockReset();
  prismaMock.reservation.updateMany.mockReset();
  prismaMock.reservation.delete.mockReset();
  prismaMock.reservation.deleteMany.mockReset();
  prismaMock.availabilityDay.createMany.mockReset();
  prismaMock.availabilityDay.deleteMany.mockReset();
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

describe("PATCH /api/reservations/[reservationId]", () => {
  const request = (decision: unknown) =>
    new Request("http://localhost/api/reservations/r-1", {
      method: "PATCH",
      body: JSON.stringify({ decision }),
    });

  it("requires authentication", async () => {
    getCurrentUser.mockResolvedValue(null);

    const response = await PATCH(request("APPROVED"), {
      params: Promise.resolve({ reservationId: "r-1" }),
    });

    expect(response.status).toBe(401);
  });

  it("requires a reservation id", async () => {
    getCurrentUser.mockResolvedValue(makeUser());

    const response = await PATCH(request("APPROVED"), {
      params: Promise.resolve({}),
    });

    expect(response.status).toBe(400);
  });

  it("validates the decision", async () => {
    getCurrentUser.mockResolvedValue(makeUser());

    const response = await PATCH(request("MAYBE"), {
      params: Promise.resolve({ reservationId: "r-1" }),
    });

    expect(response.status).toBe(422);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("does not disclose reservations owned by another host", async () => {
    getCurrentUser.mockResolvedValue(makeUser());
    prismaMock.reservation.findFirst.mockResolvedValue(null);

    const response = await PATCH(request("APPROVED"), {
      params: Promise.resolve({ reservationId: "r-1" }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "RESERVATION_NOT_FOUND" },
    });
  });

  it("only permits decisions on pending requests", async () => {
    getCurrentUser.mockResolvedValue(makeUser());
    prismaMock.reservation.findFirst.mockResolvedValue(
      makeReservation({ status: "APPROVED" }),
    );

    const response = await PATCH(request("DECLINED"), {
      params: Promise.resolve({ reservationId: "r-1" }),
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "INVALID_RESERVATION_STATE" },
    });
  });

  it("handles a competing decision safely", async () => {
    getCurrentUser.mockResolvedValue(makeUser());
    prismaMock.reservation.findFirst.mockResolvedValue(makeReservation());
    prismaMock.reservation.updateMany.mockResolvedValue({ count: 0 });

    const response = await PATCH(request("APPROVED"), {
      params: Promise.resolve({ reservationId: "r-1" }),
    });

    expect(response.status).toBe(409);
  });

  it("lets the host approve a pending request and keeps its locks", async () => {
    const pending = makeReservation();
    const approved = makeReservation({ status: "APPROVED" });
    getCurrentUser.mockResolvedValue(makeUser());
    prismaMock.reservation.findFirst.mockResolvedValue(pending);
    prismaMock.reservation.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.reservation.findUnique.mockResolvedValue(approved);

    const response = await PATCH(request("APPROVED"), {
      params: Promise.resolve({ reservationId: "r-1" }),
    });

    expect(prismaMock.reservation.findFirst).toHaveBeenCalledWith({
      where: { id: "r-1", listing: { userId: "user-1" } },
    });
    expect(prismaMock.reservation.updateMany).toHaveBeenCalledWith({
      where: { id: "r-1", status: "PENDING" },
      data: { status: "APPROVED" },
    });
    expect(prismaMock.availabilityDay.deleteMany).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      status: "APPROVED",
    });
  });

  it("lets the host decline a request and releases its locks", async () => {
    getCurrentUser.mockResolvedValue(makeUser());
    prismaMock.reservation.findFirst.mockResolvedValue(makeReservation());
    prismaMock.reservation.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.reservation.findUnique.mockResolvedValue(
      makeReservation({ status: "DECLINED" }),
    );

    const response = await PATCH(request("DECLINED"), {
      params: Promise.resolve({ reservationId: "r-1" }),
    });

    expect(prismaMock.availabilityDay.deleteMany).toHaveBeenCalledWith({
      where: { reservationId: "r-1" },
    });
    expect(response.status).toBe(200);
  });

  it("returns a safe error when the decision fails", async () => {
    getCurrentUser.mockResolvedValue(makeUser());
    prismaMock.reservation.findFirst.mockRejectedValue(new Error("db down"));

    const response = await PATCH(request("APPROVED"), {
      params: Promise.resolve({ reservationId: "r-1" }),
    });

    expect(response.status).toBe(500);
  });
});

describe("DELETE /api/reservations/[reservationId]", () => {
  const request = new Request("http://localhost/api/reservations/r-1", {
    method: "DELETE",
  });

  it("requires authentication", async () => {
    getCurrentUser.mockResolvedValue(null);

    const response = await DELETE(request, {
      params: Promise.resolve({ reservationId: "r-1" }),
    });

    expect(response.status).toBe(401);
  });

  it("requires a reservation id", async () => {
    getCurrentUser.mockResolvedValue(makeUser());

    const response = await DELETE(request, { params: Promise.resolve({}) });

    expect(response.status).toBe(400);
  });

  it("returns not found when the user is neither guest nor host", async () => {
    getCurrentUser.mockResolvedValue(makeUser());
    prismaMock.reservation.findFirst.mockResolvedValue(null);

    const response = await DELETE(request, {
      params: Promise.resolve({ reservationId: "r-1" }),
    });

    expect(response.status).toBe(404);
  });

  it("lets the guest or host cancel and releases every lock", async () => {
    const user = makeUser();
    const reservation = makeReservation();
    getCurrentUser.mockResolvedValue(user);
    prismaMock.reservation.findFirst.mockResolvedValue(reservation);
    prismaMock.reservation.delete.mockResolvedValue(reservation);

    const response = await DELETE(request, {
      params: Promise.resolve({ reservationId: "r-1" }),
    });

    expect(prismaMock.reservation.findFirst).toHaveBeenCalledWith({
      where: {
        id: "r-1",
        OR: [{ userId: user.id }, { listing: { userId: user.id } }],
      },
    });
    expect(prismaMock.availabilityDay.deleteMany).toHaveBeenCalledWith({
      where: { reservationId: "r-1" },
    });
    expect(prismaMock.reservation.delete).toHaveBeenCalledWith({
      where: { id: "r-1" },
    });
    await expect(response.json()).resolves.toMatchObject({ id: reservation.id });
  });

  it("returns a safe error when cancellation fails", async () => {
    getCurrentUser.mockResolvedValue(makeUser());
    prismaMock.reservation.findFirst.mockRejectedValue(new Error("db down"));

    const response = await DELETE(request, {
      params: Promise.resolve({ reservationId: "r-1" }),
    });

    expect(response.status).toBe(500);
  });
});
