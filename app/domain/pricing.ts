export interface PricingInput {
  nights: number;
  monthlyRent: number;
  monthlyUtilities: number;
  monthlyManagement: number;
  cleaningFee: number;
  deposit: number;
  guestServiceFeeBps: number;
  hostCommissionBps: number;
  guestServiceFeeCapJpy: number;
}

export interface ReservationQuote {
  nights: number;
  rentSubtotal: number;
  utilitiesTotal: number;
  managementTotal: number;
  cleaningFee: number;
  deposit: number;
  guestServiceFee: number;
  hostCommission: number;
  totalPrice: number;
  hostPayout: number;
}

const prorateMonthly = (amount: number, nights: number) =>
  Math.round((amount * nights) / 30);

const applyBasisPoints = (amount: number, basisPoints: number) =>
  Math.round((amount * basisPoints) / 10_000);

export function calculateReservationQuote(
  input: PricingInput,
): ReservationQuote {
  const rentSubtotal = prorateMonthly(input.monthlyRent, input.nights);
  const utilitiesTotal = prorateMonthly(input.monthlyUtilities, input.nights);
  const managementTotal = prorateMonthly(input.monthlyManagement, input.nights);
  const feeBase =
    rentSubtotal + utilitiesTotal + managementTotal + input.cleaningFee;
  const guestServiceFee = Math.min(
    applyBasisPoints(feeBase, input.guestServiceFeeBps),
    input.guestServiceFeeCapJpy,
  );
  const hostCommission = applyBasisPoints(
    feeBase,
    input.hostCommissionBps,
  );

  return {
    nights: input.nights,
    rentSubtotal,
    utilitiesTotal,
    managementTotal,
    cleaningFee: input.cleaningFee,
    deposit: input.deposit,
    guestServiceFee,
    hostCommission,
    totalPrice: feeBase + guestServiceFee + input.deposit,
    hostPayout: feeBase - hostCommission,
  };
}
