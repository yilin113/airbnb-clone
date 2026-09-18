// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DELETE } from "@/app/api/listings/[listingId]/route";
import { POST } from "@/app/api/listings/route";
import { makeListing, makeUser } from "../helpers/factories";
import { prismaMock } from "../helpers/prisma";

const getCurrentUser = vi.hoisted(() => vi.fn());

vi.mock("@/app/actions/getCurrentUser", () => ({ default: getCurrentUser }));

vi.mock("@/app/libs/prismadb", async () => ({
  default: (await import("../helpers/prisma")).prismaMock,
}));

function postRequest(body: unknown) {
  return new Request("http://localhost/api/listings", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

const listingBody = {
  title: "Sunny loft",
  description: "A very sunny loft",
  imageSrc: "https://example.com/loft.png",
  imageSrcs: ["https://example.com/loft.png"],
  category: "Beach",
  roomCount: 2,
  bathroomCount: 1,
  guestCount: 4,
  location: {
    value: "tokyo-shinjuku",
    prefectureCode: "13",
    cityCode: "13104",
    stationCode: "JY17",
  },
  postalCode: "160-0022",
  addressLine: "東京都新宿區新宿一丁目",
  stationWalkMinutes: "5",
  price: "120",
  utilitiesFee: "20",
  managementFee: "10",
  cleaningFee: "30",
  deposit: "100",
};

beforeEach(() => {
  getCurrentUser.mockReset();
  prismaMock.listing.create.mockReset();
  prismaMock.listing.deleteMany.mockReset();
});

describe("POST /api/listings", () => {
  it("errors when signed out", async () => {
    getCurrentUser.mockResolvedValue(null);

    const response = await POST(postRequest(listingBody));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "UNAUTHORIZED" },
    });
    expect(prismaMock.listing.create).not.toHaveBeenCalled();
  });

  it("returns validation issues for malformed listing data", async () => {
    getCurrentUser.mockResolvedValue(makeUser());

    const response = await POST(
      postRequest({ ...listingBody, imageSrc: "not-a-url", price: 0 }),
    );

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "VALIDATION_ERROR" },
    });
    expect(prismaMock.listing.create).not.toHaveBeenCalled();
  });

  it("rejects a location outside the supported Japanese stations", async () => {
    getCurrentUser.mockResolvedValue(makeUser());

    const response = await POST(
      postRequest({
        ...listingBody,
        location: {
          value: "not-japan",
          prefectureCode: "XX",
          cityCode: "XX",
          stationCode: "XX",
        },
      }),
    );

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        issues: [
          {
            path: "location",
            message: "Location must match a supported Japanese station.",
          },
        ],
      },
    });
  });

  it("creates the listing for the signed-in user", async () => {
    const user = makeUser();
    const listing = makeListing();
    getCurrentUser.mockResolvedValue(user);
    prismaMock.listing.create.mockResolvedValue(listing);

    const response = await POST(postRequest(listingBody));

    expect(prismaMock.listing.create).toHaveBeenCalledWith({
      data: {
        title: "Sunny loft",
        description: "A very sunny loft",
        imageSrc: "https://example.com/loft.png",
        imageSrcs: ["https://example.com/loft.png"],
        category: "Beach",
        roomCount: 2,
        bathroomCount: 1,
        guestCount: 4,
        locationValue: "tokyo-shinjuku",
        locationLabel: "新宿站",
        locationRegion: "東京都・新宿區",
        locationLatitude: 35.6909,
        locationLongitude: 139.7003,
        prefectureCode: "13",
        cityCode: "13104",
        stationCode: "JY17",
        stationName: "新宿站",
        postalCode: "160-0022",
        addressLine: "東京都新宿區新宿一丁目",
        stationWalkMinutes: 5,
        price: 120,
        utilitiesFee: 20,
        managementFee: 10,
        cleaningFee: 30,
        deposit: 100,
        userId: user.id,
      },
    });
    await expect(response.json()).resolves.toMatchObject({ id: listing.id });
  });
});

describe("DELETE /api/listings/[listingId]", () => {
  const request = new Request("http://localhost/api/listings/listing-1", {
    method: "DELETE",
  });

  it("errors when signed out", async () => {
    getCurrentUser.mockResolvedValue(null);

    const response = await DELETE(request, {
      params: Promise.resolve({ listingId: "listing-1" }),
    });

    expect(response.type).toBe("error");
  });

  it("rejects a missing id", async () => {
    getCurrentUser.mockResolvedValue(makeUser());

    await expect(
      DELETE(request, { params: Promise.resolve({}) }),
    ).rejects.toThrow("Invalid ID");
  });

  it("scopes the delete to the listing owner", async () => {
    const user = makeUser();
    getCurrentUser.mockResolvedValue(user);
    prismaMock.listing.deleteMany.mockResolvedValue({ count: 1 });

    const response = await DELETE(request, {
      params: Promise.resolve({ listingId: "listing-1" }),
    });

    expect(prismaMock.listing.deleteMany).toHaveBeenCalledWith({
      where: { id: "listing-1", userId: user.id },
    });
    await expect(response.json()).resolves.toEqual({ count: 1 });
  });
});
