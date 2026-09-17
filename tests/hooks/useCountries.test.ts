import { describe, expect, it } from "vitest";

import useCountries from "@/app/hooks/useCountries";

describe("Japanese locations", () => {
  const { getAll, getByValue } = useCountries();

  it("provides the curated station catalogue", () => {
    const all = getAll();

    expect(all.length).toBeGreaterThanOrEqual(12);
    expect(all[0]).toEqual(
      expect.objectContaining({
        label: expect.any(String),
        value: expect.any(String),
        flag: expect.any(String),
        region: expect.any(String),
        prefectureCode: expect.any(String),
        cityCode: expect.any(String),
        stationCode: expect.any(String),
      })
    );
  });

  it("finds a station by its stable location value", () => {
    expect(getByValue("tokyo-shinjuku")).toEqual(
      expect.objectContaining({
        label: "新宿站",
        value: "tokyo-shinjuku",
        region: "東京都・新宿區",
      }),
    );
  });

  it("returns undefined for an unknown code", () => {
    expect(getByValue("ZZ")).toBeUndefined();
  });
});
