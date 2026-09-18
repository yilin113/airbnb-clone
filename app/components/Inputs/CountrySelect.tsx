"use client";

import useCountries from "@/app/hooks/useCountries";
import type { JapanLocation } from "@/app/data/japanLocations";
import Select from "react-select";

export type CountrySelectValue = JapanLocation;

interface CountrySelectProps {
  value?: CountrySelectValue;
  onChange: (value: CountrySelectValue) => void;
}

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

const CountrySelect: React.FC<CountrySelectProps> = ({ value, onChange }) => {
  const { getAll } = useCountries();

  return (
    <div className="flex flex-col gap-2">
      <Select
        aria-label="搜尋日本房源地點"
        placeholder="搜尋都道府縣、城市、行政區或車站"
        isClearable
        menuPortalTarget={
          typeof document === "undefined" ? undefined : document.body
        }
        menuPosition="fixed"
        options={getAll()}
        value={value}
        filterOption={({ data }, inputValue) =>
          matchesLocation(data, inputValue)
        }
        noOptionsMessage={({ inputValue }) =>
          inputValue
            ? `找不到「${inputValue}」；請改用城市、行政區或車站名稱`
            : "找不到符合的日本地點"
        }
        onChange={(value) => onChange(value as CountrySelectValue)}
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
        例如：福岡、大阪市、新宿、Fukuoka；選擇後再填寫完整地址。
      </p>
    </div>
  );
};

export default CountrySelect;
