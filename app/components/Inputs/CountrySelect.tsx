"use client";

import { useCallback, useRef } from "react";
import AsyncSelect from "react-select/async";

import useCountries from "@/app/hooks/useCountries";
import type { JapanLocation } from "@/app/data/japanLocations";
import {
  loadPlacesLibrary,
  type GooglePlacePrediction,
  type GooglePlacesLibrary,
} from "./GoogleAddressAutocomplete";

export type CountrySelectValue = JapanLocation;

interface CountrySelectProps {
  value?: CountrySelectValue;
  onChange: (value: CountrySelectValue | null) => void;
}

type StationOption = CountrySelectValue & {
  prediction?: GooglePlacePrediction;
};

const stationTypes = [
  "train_station",
  "subway_station",
  "light_rail_station",
  "tram_stop",
];

const toStationSearchInput = (input: string) =>
  /(?:駅|站|station)/iu.test(input) ? input : `${input} 駅`;

const normalizeSearchText = (value: string) =>
  value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[\s・,，、\-_/]+/g, "");

const matchesLocation = (location: JapanLocation, inputValue: string) => {
  const query = normalizeSearchText(inputValue);

  if (!query) {
    return true;
  }

  return normalizeSearchText(
    [
      location.label,
      location.region,
      location.prefecture,
      location.city,
      location.station,
      location.stationCode,
      location.value,
    ].join(" "),
  ).includes(query);
};

const getAddressComponent = (
  components: { longText?: string; types?: string[] }[] | undefined,
  types: string[],
) =>
  components?.find((component) =>
    types.some((type) => component.types?.includes(type)),
  )?.longText;

const CountrySelect: React.FC<CountrySelectProps> = ({ value, onChange }) => {
  const { getAll } = useCountries();
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const libraryRef = useRef<GooglePlacesLibrary | undefined>(undefined);
  const sessionTokenRef = useRef<object | undefined>(undefined);

  const loadOptions = useCallback(
    async (inputValue: string): Promise<StationOption[]> => {
      const curated = getAll().filter((location) =>
        matchesLocation(location, inputValue),
      );
      const input = inputValue.trim();

      if (!apiKey || input.length < 2) {
        return curated;
      }

      try {
        const library =
          libraryRef.current ?? (await loadPlacesLibrary(apiKey));
        libraryRef.current = library;
        sessionTokenRef.current ??= new library.AutocompleteSessionToken();

        const { suggestions } =
          await library.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: toStationSearchInput(input),
            includedRegionCodes: ["jp"],
            includedPrimaryTypes: stationTypes,
            language: "ja",
            region: "jp",
            sessionToken: sessionTokenRef.current,
          });

        const liveStations = suggestions.flatMap((suggestion, index) => {
          const prediction = suggestion.placePrediction;
          if (!prediction) return [];
          const label = prediction.text.toString();

          return [
            {
              value: `prediction:${index}:${label}`,
              label,
              flag: "🚉",
              latlng: [0, 0] as [number, number],
              region: "日本鐵路車站",
              prefectureCode: "pending",
              prefecture: "",
              cityCode: "pending",
              city: "",
              stationCode: "pending",
              station: label,
              prediction,
            },
          ];
        });

        return [
          ...curated,
          ...liveStations.filter(
            (station) =>
              !curated.some(
                (curatedStation) =>
                  normalizeSearchText(curatedStation.label) ===
                  normalizeSearchText(station.label),
              ),
          ),
        ];
      } catch {
        return curated;
      }
    },
    [apiKey, getAll],
  );

  const handleChange = async (option: StationOption | null) => {
    if (!option) {
      onChange(null);
      return;
    }

    if (!option.prediction) {
      onChange(option);
      return;
    }

    const place = option.prediction.toPlace();
    await place.fetchFields({
      fields: [
        "id",
        "displayName",
        "formattedAddress",
        "addressComponents",
        "location",
      ],
    });

    if (!place.id || !place.location) {
      return;
    }

    const prefecture =
      getAddressComponent(place.addressComponents, [
        "administrative_area_level_1",
      ]) ?? "日本";
    const city =
      getAddressComponent(place.addressComponents, [
        "locality",
        "administrative_area_level_2",
        "sublocality_level_1",
      ]) ?? prefecture;
    const station = place.displayName ?? option.label;

    sessionTokenRef.current = libraryRef.current
      ? new libraryRef.current.AutocompleteSessionToken()
      : undefined;

    onChange({
      value: `google:${place.id}`,
      label: station,
      flag: "🚉",
      latlng: [place.location.lat(), place.location.lng()],
      region: [prefecture, city]
        .filter((part, index, values) => values.indexOf(part) === index)
        .join("・"),
      prefectureCode: prefecture,
      prefecture,
      cityCode: city,
      city,
      stationCode: place.id,
      station,
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <AsyncSelect<StationOption, false>
        aria-label="搜尋日本房源地點"
        placeholder="搜尋 JR、私鐵、地鐵或火車站"
        isClearable
        cacheOptions
        defaultOptions={getAll()}
        loadOptions={loadOptions}
        menuPortalTarget={
          typeof document === "undefined" ? undefined : document.body
        }
        menuPosition="fixed"
        value={value}
        filterOption={null}
        noOptionsMessage={({ inputValue }) =>
          inputValue
            ? `找不到「${inputValue}」附近的日本鐵路車站`
            : "找不到符合的日本車站"
        }
        onChange={(option) => void handleChange(option)}
        formatOptionLabel={(option) => (
          <div className="flex flex-row items-center gap-3 py-1">
            <div aria-hidden="true">{option.flag}</div>
            <div className="min-w-0">
              <div className="font-medium text-neutral-900">{option.label}</div>
              <div className="truncate text-sm text-neutral-500">
                {option.region}
              </div>
            </div>
          </div>
        )}
        classNames={{
          control: () => "p-3 border-2",
          input: () => "text-lg",
          option: () => "text-lg ",
        }}
        styles={{
          menuPortal: (base) => ({ ...base, zIndex: 100 }),
        }}
        theme={(theme) => ({
          ...theme,
          borderRadius: 6,
          colors: {
            ...theme.colors,
            primary: "#737373",
            primary25: "#ffe4e6",
          },
        })}
      />
      <p className="text-sm leading-5 text-neutral-500">
        可搜尋日本全國 JR、私鐵、地下鐵、路面電車與其他鐵路車站，例如：水戶站、つくば站、新宿站。
      </p>
    </div>
  );
};

export default CountrySelect;
