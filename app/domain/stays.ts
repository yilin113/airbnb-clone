const DAY_IN_MS = 86_400_000;

export const MINIMUM_STAY_NIGHTS = 30;

export function toUtcDate(value: string | Date) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }

  const date = value instanceof Date ? value : new Date(value);
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

export function differenceInUtcDays(startDate: Date, endDate: Date) {
  return Math.round((endDate.getTime() - startDate.getTime()) / DAY_IN_MS);
}

export function occupiedDates(startDate: Date, nights: number) {
  return Array.from({ length: nights }, (_, index) =>
    new Date(startDate.getTime() + index * DAY_IN_MS),
  );
}
