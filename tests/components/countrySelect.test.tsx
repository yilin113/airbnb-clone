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

  it("finds stations by prefecture, city and English location code", async () => {
    const user = userEvent.setup();
    render(<CountrySelect onChange={vi.fn()} />);

    const combobox = screen.getByRole("combobox", {
      name: "搜尋日本房源地點",
    });
    await user.click(combobox);
    await user.type(combobox, "福岡");

    expect(screen.getByText("博多站")).toBeInTheDocument();
    expect(screen.getByText("天神站")).toBeInTheDocument();

    await user.clear(combobox);
    await user.type(combobox, "FUKUOKA");

    expect(screen.getByText("博多站")).toBeInTheDocument();
    expect(screen.getByText("天神站")).toBeInTheDocument();
  });

  it("shows a localized empty-search message", async () => {
    const user = userEvent.setup();
    render(<CountrySelect onChange={vi.fn()} />);

    const combobox = screen.getByRole("combobox", {
      name: "搜尋日本房源地點",
    });
    await user.click(combobox);
    await user.type(combobox, "不存在的車站");

    expect(
      screen.getByText(
        "找不到「不存在的車站」；請改用城市、行政區或車站名稱",
      ),
    ).toBeInTheDocument();
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
