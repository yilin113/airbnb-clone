import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import GoogleAddressAutocomplete, {
  getJapanesePostalCode,
} from "@/app/components/Inputs/GoogleAddressAutocomplete";

describe("GoogleAddressAutocomplete", () => {
  it("keeps manual address entry available when no browser key is configured", () => {
    render(<GoogleAddressAutocomplete onSelect={vi.fn()} />);

    expect(
      screen.getByText(
        "地址自動完成暫時無法使用，仍可直接填寫下方郵遞區號與完整地址。",
      ),
    ).toBeInTheDocument();
  });

  it("extracts a Japanese postal code from place address components", () => {
    expect(
      getJapanesePostalCode([
        { longText: "東京都", types: ["administrative_area_level_1"] },
        { longText: "160-0022", types: ["postal_code"] },
      ]),
    ).toBe("160-0022");
  });
});
