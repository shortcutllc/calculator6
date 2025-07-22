/// <reference types="vite/client" />

declare global {
  interface Window {
    google: {
      maps: {
        places: {
          Autocomplete: new (
            input: HTMLInputElement,
            opts?: {
              types?: string[];
              componentRestrictions?: { country: string };
            }
          ) => {
            addListener: (event: string, callback: () => void) => void;
            getPlace: () => {
              formatted_address?: string;
            };
          };
          PlaceAutocompleteElement: new ( // Still declared, but not used in current implementation
            input: HTMLInputElement,
            opts?: {
              types?: string[];
              componentRestrictions?: { country: string };
            }
          ) => {
            addListener: (event: string, callback: () => void) => void;
            getPlace: () => {
              formatted_address?: string;
            };
          };
        };
        Geocoder: new () => {
          geocode: (
            request: {
              address?: string; // Added this
              latlng?: { lat: number; lng: number };
            },
            callback: (results: any[], status: string) => void
          ) => void;
        };
      };
    };
    initGoogleMaps: () => void;
    initGoogleMapsCallback: () => void;
    __ENV__: {
      VITE_SUPABASE_URL: string;
      VITE_SUPABASE_ANON_KEY: string;
      VITE_GOOGLE_MAPS_API_KEY: string;
    };
  }
}

export {};

declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.jpg' {
  const src: string;
  export default src;
}

declare module '*.jpeg' {
  const src: string;
  export default src;
}

declare module '*.svg' {
  const src: string;
  export default src;
}
