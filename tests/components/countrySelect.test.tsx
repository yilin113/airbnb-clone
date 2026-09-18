import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import CountrySelect from "@/app/components/Inputs/CountrySelect";
import { japanLocations } from "@/app/data/japanLocations";

const shinjuku = japanLocations[0];

describe("CountrySelect", () => {
  it("lists Japanese stations and reports the picked one", async () => {
    const onChange = vi.fn();
    const { container } = render(<CountrySelect onChange={onChange} />);

    const combobox = screen.getByRole("combobox");
    await userEvent.click(combobox);
    await userEvent.type(combobox, "新宿");

    const listbox = screen.getByRole("listbox");
    expect(document.body).toContainElement(listbox);
    expect(container).not.toContainElement(listbox);

    // The custom formatOptionLabel renders flag + label + region.
    expect(await screen.findByText("東京都・新宿區")).toBeInTheDocument();

    await userEvent.keyboard("{Enter}");

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        label: "新宿站",
        value: "tokyo-shinjuku",
        region: "東京都・新宿區",
      }),
    );
  });

  it("renders the currently selected station", () => {
    render(
      <CountrySelect
        onChange={vi.fn()}
        value={shinjuku}
      />,
    );

    expect(screen.getByText("東京都・新宿區")).toBeInTheDocument();
  });

  it("reports null when the value is cleared", async () => {
    const onChange = vi.fn();
    const { container } = render(
      <CountrySelect
        onChange={onChange}
        value={shinjuku}
      />,
    );

    const clear = container.querySelector<HTMLElement>(
      "[class*='indicatorContainer']",
    );
    await userEvent.click(clear as HTMLElement);

    expect(onChange).toHaveBeenCalledWith(null);
  });
});
