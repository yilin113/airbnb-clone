// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";

import { getPricingConfig } from "@/app/config/pricing";
import { calculateReservationQuote } from "@/app/domain/pricing";
import {
  differenceInUtcDays,
  occupiedDates,
  toUtcDate,
} from "@/app/domain/stays";

const originalEnvironment = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnvironment };
});

describe("reservation pricing", () => {
  it("prorates monthly charges and excludes the deposit from both fees", () => {
    expect(
      calculateReservationQuote({
        nights: 45,
        monthlyRent: 90_000,
        monthlyUtilities: 12_000,
        monthlyManagement: 6_000,
        cleaningFee: 8_000,
        deposit: 100_000,
        guestServiceFeeBps: 600,
        hostCommissionBps: 600,
        guestServiceFeeCapJpy: 30_000,
      }),
    ).toEqual({
      nights: 45,
      rentSubtotal: 135_000,
      utilitiesTotal: 18_000,
      managementTotal: 9_000,
      cleaningFee: 8_000,
      deposit: 100_000,
      guestServiceFee: 10_200,
      hostCommission: 10_200,
      totalPrice: 280_200,
      hostPayout: 159_800,
    });
  });

  it("caps the guest fee without capping the host commission", () => {
    const quote = calculateReservationQuote({
      nights: 30,
      monthlyRent: 1_000_000,
      monthlyUtilities: 0,
      monthlyManagement: 0,
      cleaningFee: 0,
      deposit: 0,
      guestServiceFeeBps: 600,
      hostCommissionBps: 600,
      guestServiceFeeCapJpy: 30_000,
    });

    expect(quote.guestServiceFee).toBe(30_000);
    expect(quote.hostCommission).toBe(60_000);
  });
});

describe("pricing configuration", () => {
  it("uses the business defaults", () => {
    delete process.env.GUEST_SERVICE_FEE_BPS;
    process.env.HOST_COMMISSION_BPS = " ";
    delete process.env.GUEST_SERVICE_FEE_CAP_JPY;

    expect(getPricingConfig()).toEqual({
      guestServiceFeeBps: 600,
      hostCommissionBps: 600,
      guestServiceFeeCapJpy: 30_000,
    });
  });

  it("accepts non-negative integer overrides", () => {
    process.env.GUEST_SERVICE_FEE_BPS = "500";
    process.env.HOST_COMMISSION_BPS = "700";
    process.env.GUEST_SERVICE_FEE_CAP_JPY = "0";

    expect(getPricingConfig()).toEqual({
      guestServiceFeeBps: 500,
      hostCommissionBps: 700,
      guestServiceFeeCapJpy: 0,
    });
  });

  it("falls back for unsafe, fractional, or negative overrides", () => {
    process.env.GUEST_SERVICE_FEE_BPS = "1.5";
    process.env.HOST_COMMISSION_BPS = "-1";
    process.env.GUEST_SERVICE_FEE_CAP_JPY = "999999999999999999999";

    expect(getPricingConfig()).toEqual({
      guestServiceFeeBps: 600,
      hostCommissionBps: 600,
      guestServiceFeeCapJpy: 30_000,
    });
  });
});

describe("UTC stay dates", () => {
  it("normalizes date strings and Date objects to UTC midnight", () => {
    expect(toUtcDate("2024-05-01")).toEqual(
      new Date("2024-05-01T00:00:00.000Z"),
    );
    expect(toUtcDate("2024-05-01T18:00:00.000Z")).toEqual(
      new Date("2024-05-01T00:00:00.000Z"),
    );
    expect(toUtcDate(new Date("2024-05-02T08:00:00.000Z"))).toEqual(
      new Date("2024-05-02T00:00:00.000Z"),
    );
  });

  it("counts nights and returns checkout-exclusive lock dates", () => {
    const start = new Date("2024-05-01T00:00:00.000Z");
    const end = new Date("2024-05-31T00:00:00.000Z");

    expect(differenceInUtcDays(start, end)).toBe(30);
    const dates = occupiedDates(start, 30);
    expect(dates).toHaveLength(30);
    expect(dates.at(-1)).toEqual(new Date("2024-05-30T00:00:00.000Z"));
  });
});
