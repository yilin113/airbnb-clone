const DEFAULT_GUEST_SERVICE_FEE_BPS = 600;
const DEFAULT_HOST_COMMISSION_BPS = 600;
const DEFAULT_GUEST_SERVICE_FEE_CAP_JPY = 30_000;

export const DEFAULT_PRICING_CONFIG = {
  guestServiceFeeBps: DEFAULT_GUEST_SERVICE_FEE_BPS,
  hostCommissionBps: DEFAULT_HOST_COMMISSION_BPS,
  guestServiceFeeCapJpy: DEFAULT_GUEST_SERVICE_FEE_CAP_JPY,
};

function nonNegativeInteger(value: string | undefined, fallback: number) {
  if (value === undefined || value.trim() === "") {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

export function getPricingConfig() {
  return {
    guestServiceFeeBps: nonNegativeInteger(
      process.env.GUEST_SERVICE_FEE_BPS,
      DEFAULT_GUEST_SERVICE_FEE_BPS,
    ),
    hostCommissionBps: nonNegativeInteger(
      process.env.HOST_COMMISSION_BPS,
      DEFAULT_HOST_COMMISSION_BPS,
    ),
    guestServiceFeeCapJpy: nonNegativeInteger(
      process.env.GUEST_SERVICE_FEE_CAP_JPY,
      DEFAULT_GUEST_SERVICE_FEE_CAP_JPY,
    ),
  };
}
