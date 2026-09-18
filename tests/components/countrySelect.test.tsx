import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import CountrySelect from "@/app/components/Inputs/CountrySelect";
import { japanLocations } from "@/app/data/japanLocations";

const shinjuku = japanLocations[0];

afterEach(() => {
  delete window.google;
});

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
        "找不到「不存在的車站」附近的日本鐵路車站",
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

  it("searches Google Places for railway stations across Japan", async () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", "test-key");
    const fetchAutocompleteSuggestions = vi.fn().mockResolvedValue({
      suggestions: [
        {
          placePrediction: {
            text: { toString: () => "水戸駅, 茨城県水戸市" },
            toPlace: () => ({
              id: "mito-google-place-id",
              displayName: "水戸駅",
              addressComponents: [
                {
                  longText: "茨城県",
                  types: ["administrative_area_level_1"],
                },
                { longText: "水戸市", types: ["locality"] },
              ],
              location: { lat: () => 36.3709, lng: () => 140.4768 },
              fetchFields: vi.fn().mockResolvedValue(undefined),
            }),
          },
        },
      ],
    });

    window.google = {
      maps: {
        importLibrary: vi.fn().mockResolvedValue({
          AutocompleteSessionToken: class {},
          AutocompleteSuggestion: { fetchAutocompleteSuggestions },
        }),
      },
    };

    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<CountrySelect onChange={onChange} />);

    const combobox = screen.getByRole("combobox", {
      name: "搜尋日本房源地點",
    });
    await user.type(combobox, "茨城");
    await user.click(await screen.findByText("水戸駅, 茨城県水戸市"));

    expect(fetchAutocompleteSuggestions).toHaveBeenLastCalledWith(
      expect.objectContaining({
        input: "茨城 駅",
        includedRegionCodes: ["jp"],
        includedPrimaryTypes: expect.arrayContaining([
          "train_station",
          "subway_station",
          "light_rail_station",
        ]),
      }),
    );
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        value: "google:mito-google-place-id",
        label: "水戸駅",
        region: "茨城県・水戸市",
        station: "水戸駅",
        latlng: [36.3709, 140.4768],
      }),
    );
  });
});
