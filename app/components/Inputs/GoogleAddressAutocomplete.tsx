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
  shortText?: string;
  types?: string[];
}

interface GooglePlace {
  formattedAddress?: string;
  addressComponents?: GoogleAddressComponent[];
  location?: {
    lat: () => number;
    lng: () => number;
  };
  fetchFields: (options: { fields: string[] }) => Promise<void>;
}

interface GooglePlacePrediction {
  toPlace: () => GooglePlace;
}

interface GooglePlaceSelectEvent extends Event {
  placePrediction: GooglePlacePrediction;
}

interface GooglePlaceAutocompleteElement extends HTMLElement {
  includedRegionCodes: string[];
  placeholder: string;
}

interface GooglePlacesLibrary {
  PlaceAutocompleteElement: new () => GooglePlaceAutocompleteElement;
}

interface GoogleMapsNamespace {
  importLibrary: (library: "places") => Promise<GooglePlacesLibrary>;
}

declare global {
  interface Window {
    google?: {
      maps?: GoogleMapsNamespace;
    };
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
      const callbackName = "__japanMidtermGoogleMapsReady";
      const existing = document.querySelector<HTMLScriptElement>(
        'script[data-japan-midterm-google-maps="true"]',
      );

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

      if (existing) {
        if (window.google?.maps?.importLibrary) {
          void finishLoading();
          return;
        }

        window.__japanMidtermGoogleMapsReady = () => {
          void finishLoading();
        };
        existing.addEventListener(
          "error",
          () => reject(new Error("Google Maps JavaScript API failed to load")),
          { once: true },
        );
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
        callback: callbackName,
      });

      script.src = `https://maps.googleapis.com/maps/api/js?${parameters}`;
      script.async = true;
      script.dataset.japanMidtermGoogleMaps = "true";
      window.__japanMidtermGoogleMapsReady = () => {
        void finishLoading();
      };
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
  const containerRef = useRef<HTMLDivElement>(null);
  const onSelectRef = useRef(onSelect);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    const container = containerRef.current;

    if (!apiKey || !container) {
      setStatus("error");
      return;
    }

    let active = true;
    let autocomplete: GooglePlaceAutocompleteElement | undefined;

    const initialize = async () => {
      try {
        const { PlaceAutocompleteElement } = await loadPlacesLibrary(apiKey);

        if (!active || !containerRef.current) {
          return;
        }

        autocomplete = new PlaceAutocompleteElement();
        autocomplete.includedRegionCodes = ["jp"];
        autocomplete.placeholder = "輸入日本地址、建築名稱或郵遞區號";
        autocomplete.style.width = "100%";
        autocomplete.setAttribute("aria-label", "搜尋日本完整地址");

        autocomplete.addEventListener("gmp-select", async (event) => {
          const { placePrediction } = event as GooglePlaceSelectEvent;
          const place = placePrediction.toPlace();

          await place.fetchFields({
            fields: ["formattedAddress", "addressComponents", "location"],
          });

          if (!place.formattedAddress) {
            return;
          }

          onSelectRef.current({
            address: place.formattedAddress,
            postalCode: getJapanesePostalCode(place.addressComponents),
            latlng: place.location
              ? [place.location.lat(), place.location.lng()]
              : undefined,
          });
        });

        containerRef.current.replaceChildren(autocomplete);
        setStatus("ready");
      } catch {
        if (active) {
          setStatus("error");
        }
      }
    };

    void initialize();

    return () => {
      active = false;
      autocomplete?.remove();
    };
  }, [apiKey]);

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={containerRef}
        aria-busy={status === "loading"}
        className={`min-h-16 rounded-md border-2 bg-white p-3 ${
          disabled ? "pointer-events-none opacity-70" : ""
        }`}
      >
        {status === "loading" && (
          <p className="text-sm text-neutral-500">正在載入日本地址搜尋…</p>
        )}
        {status === "error" && (
          <p className="text-sm leading-6 text-neutral-500">
            地址自動完成暫時無法使用，仍可直接填寫下方郵遞區號與完整地址。
          </p>
        )}
      </div>
      {status === "ready" && (
        <p className="text-sm leading-5 text-neutral-500">
          選擇建議地址後，系統會自動帶入郵遞區號、完整地址與地圖位置。
        </p>
      )}
    </div>
  );
};

export default GoogleAddressAutocomplete;
