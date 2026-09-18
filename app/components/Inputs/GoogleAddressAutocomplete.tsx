"use client";

import { useEffect, useRef, useState } from "react";

export interface GoogleAddressSelection {
  address: string;
  postalCode?: string;
  latlng?: [number, number];
}

interface GoogleAddressAutocompleteProps {
  disabled?: boolean;
  onSelect: (selection: GoogleAddressSelection) => void;
}

interface GoogleAddressComponent {
  longText?: string;
  types?: string[];
}

interface GooglePlace {
  formattedAddress?: string;
  addressComponents?: GoogleAddressComponent[];
  location?: { lat: () => number; lng: () => number };
  fetchFields: (options: { fields: string[] }) => Promise<void>;
}

interface GooglePlacePrediction {
  text: { toString: () => string };
  toPlace: () => GooglePlace;
}

interface GooglePlacesLibrary {
  AutocompleteSessionToken: new () => object;
  AutocompleteSuggestion: {
    fetchAutocompleteSuggestions: (request: {
      input: string;
      includedRegionCodes: string[];
      language: string;
      region: string;
      sessionToken: object;
    }) => Promise<{
      suggestions: Array<{ placePrediction?: GooglePlacePrediction }>;
    }>;
  };
}

interface GoogleMapsNamespace {
  importLibrary: (library: "places") => Promise<GooglePlacesLibrary>;
}

declare global {
  interface Window {
    google?: { maps?: GoogleMapsNamespace };
    __japanMidtermGoogleMapsReady?: () => void;
  }
}

let placesLibraryPromise: Promise<GooglePlacesLibrary> | undefined;

export const getJapanesePostalCode = (
  components: GoogleAddressComponent[] | undefined,
) =>
  components?.find((component) => component.types?.includes("postal_code"))
    ?.longText;

const loadPlacesLibrary = (apiKey: string) => {
  if (window.google?.maps?.importLibrary) {
    return window.google.maps.importLibrary("places");
  }

  if (!placesLibraryPromise) {
    placesLibraryPromise = new Promise<GooglePlacesLibrary>((resolve, reject) => {
      const finishLoading = async () => {
        try {
          if (!window.google?.maps?.importLibrary) {
            throw new Error("Google Maps JavaScript API did not initialize");
          }

          const library = await window.google.maps.importLibrary("places");
          delete window.__japanMidtermGoogleMapsReady;
          resolve(library);
        } catch (error) {
          delete window.__japanMidtermGoogleMapsReady;
          reject(error);
        }
      };

      const existing = document.querySelector<HTMLScriptElement>(
        'script[data-japan-midterm-google-maps="true"]',
      );
      window.__japanMidtermGoogleMapsReady = () => void finishLoading();

      if (existing) {
        if (window.google?.maps?.importLibrary) {
          void finishLoading();
        }
        return;
      }

      const script = document.createElement("script");
      const parameters = new URLSearchParams({
        key: apiKey,
        loading: "async",
        libraries: "places",
        language: "ja",
        region: "JP",
        v: "weekly",
        callback: "__japanMidtermGoogleMapsReady",
      });

      script.src = `https://maps.googleapis.com/maps/api/js?${parameters}`;
      script.async = true;
      script.dataset.japanMidtermGoogleMaps = "true";
      script.addEventListener(
        "error",
        () => reject(new Error("Google Maps JavaScript API failed to load")),
        { once: true },
      );
      document.head.append(script);
    });
  }

  return placesLibraryPromise;
};

const GoogleAddressAutocomplete: React.FC<
  GoogleAddressAutocompleteProps
> = ({ disabled = false, onSelect }) => {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const libraryRef = useRef<GooglePlacesLibrary | undefined>(undefined);
  const sessionTokenRef = useRef<object | undefined>(undefined);
  const [query, setQuery] = useState("");
  const [predictions, setPredictions] = useState<GooglePlacePrediction[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    apiKey ? "loading" : "error",
  );

  useEffect(() => {
    if (!apiKey) {
      return;
    }

    let active = true;
    void loadPlacesLibrary(apiKey)
      .then((library) => {
        if (!active) return;
        libraryRef.current = library;
        sessionTokenRef.current = new library.AutocompleteSessionToken();
        setStatus("ready");
      })
      .catch(() => {
        if (active) setStatus("error");
      });

    return () => {
      active = false;
    };
  }, [apiKey]);

  useEffect(() => {
    const library = libraryRef.current;
    const input = query.trim();

    if (status !== "ready" || !library || input.length < 2) {
      setPredictions([]);
      return;
    }

    let active = true;
    const timeout = window.setTimeout(async () => {
      try {
        sessionTokenRef.current ??= new library.AutocompleteSessionToken();
        const { suggestions } =
          await library.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input,
            includedRegionCodes: ["jp"],
            language: "ja",
            region: "jp",
            sessionToken: sessionTokenRef.current,
          });

        if (active) {
          setPredictions(
            suggestions.flatMap((suggestion) =>
              suggestion.placePrediction ? [suggestion.placePrediction] : [],
            ),
          );
        }
      } catch {
        if (active) setPredictions([]);
      }
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [query, status]);

  const selectPrediction = async (prediction: GooglePlacePrediction) => {
    const place = prediction.toPlace();
    await place.fetchFields({
      fields: ["formattedAddress", "addressComponents", "location"],
    });

    if (!place.formattedAddress) return;

    setQuery(place.formattedAddress);
    setPredictions([]);
    if (libraryRef.current) {
      sessionTokenRef.current = new libraryRef.current.AutocompleteSessionToken();
    }

    onSelect({
      address: place.formattedAddress,
      postalCode: getJapanesePostalCode(place.addressComponents),
      latlng: place.location
        ? [place.location.lat(), place.location.lng()]
        : undefined,
    });
  };

  if (status === "error") {
    return (
      <p className="rounded-md border-2 border-neutral-200 bg-neutral-50 p-4 text-sm leading-6 text-neutral-500">
        地址自動完成暫時無法使用，仍可直接填寫下方郵遞區號與完整地址。
      </p>
    );
  }

  return (
    <div className="relative flex flex-col gap-2">
      <label
        className="text-sm font-semibold text-neutral-700"
        htmlFor="google-address-search"
      >
        日本地址自動完成
      </label>
      <input
        id="google-address-search"
        type="search"
        value={query}
        disabled={disabled || status === "loading"}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={
          status === "loading"
            ? "正在載入日本地址搜尋…"
            : "輸入地址、建築名稱或郵遞區號"
        }
        autoComplete="off"
        className="w-full rounded-md border-2 border-neutral-300 bg-white p-4 outline-none transition focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-70"
      />
      {predictions.length > 0 && (
        <div className="absolute top-full z-[110] mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-neutral-200 bg-white p-1 shadow-xl">
          {predictions.map((prediction, index) => (
            <button
              key={`${prediction.text.toString()}-${index}`}
              type="button"
              onClick={() => void selectPrediction(prediction)}
              className="w-full rounded px-3 py-3 text-left text-sm leading-5 hover:bg-rose-50"
            >
              {prediction.text.toString()}
            </button>
          ))}
        </div>
      )}
      <p className="text-sm leading-5 text-neutral-500">
        選擇建議地址後，系統會自動帶入郵遞區號、完整地址與地圖位置。
      </p>
    </div>
  );
};

export default GoogleAddressAutocomplete;
