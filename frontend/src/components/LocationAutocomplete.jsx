// src/components/LocationAutocomplete.jsx
import React, { useEffect, useRef } from "react";

import { Autocomplete, useJsApiLoader } from "@react-google-maps/api";

import {
  GOOGLE_MAPS_API_KEY,
  GOOGLE_MAPS_LIBRARIES,
} from "../lib/googleMapsConfig";

/**
 * Props:
 * - value: string (current address string)
 * - onSelect: function({ address, lat, lng, raw }) called when user picks a place
 * - placeholder: string
 * - className: string for input styling
 */
export default function LocationAutocomplete({
  value = "",
  onSelect,
  placeholder = "Search address...",
  className = "w-full p-2 border rounded",
}) {
  const autocompleteRef = useRef(null);
  const inputRef = useRef(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  // Keep input visually synced when parent updates `value`
  useEffect(() => {
    if (inputRef.current) {
      // only set if different to avoid resetting cursor while typing
      if (inputRef.current.value !== (value || "")) {
        inputRef.current.value = value || "";
      }
    }
  }, [value]);

  function handlePlaceChanged() {
    const ac = autocompleteRef.current;
    if (!ac) return;
    const place = ac.getPlace();
    if (!place) return;

    const address =
      place.formatted_address || place.name || inputRef.current?.value || "";
    const lat = place.geometry?.location?.lat
      ? place.geometry.location.lat()
      : undefined;
    const lng = place.geometry?.location?.lng
      ? place.geometry.location.lng()
      : undefined;

    onSelect?.({ address, lat, lng, raw: place });
  }

  if (loadError) {
    return (
      <input
        ref={inputRef}
        className={className}
        placeholder={placeholder}
        defaultValue={value}
        disabled
      />
    );
  }

  if (!isLoaded) {
    return (
      <input
        ref={inputRef}
        className={className}
        placeholder="Loading address search..."
        defaultValue={value}
        disabled
      />
    );
  }

  return (
    <Autocomplete
      onLoad={(ac) => (autocompleteRef.current = ac)}
      onPlaceChanged={handlePlaceChanged}
    >
      <input
        ref={inputRef}
        className={className}
        placeholder={placeholder}
        defaultValue={value}
        // allow manual typing (we let autocomplete override on place select)
      />
    </Autocomplete>
  );
}
