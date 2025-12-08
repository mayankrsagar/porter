// src/components/LocationPickerMap.jsx
import React, { useCallback, useMemo } from "react";

import {
  DirectionsRenderer,
  GoogleMap,
  Marker,
  useJsApiLoader,
} from "@react-google-maps/api";

import {
  GOOGLE_MAPS_API_KEY,
  GOOGLE_MAPS_LIBRARIES,
} from "../lib/googleMapsConfig";

const containerStyle = {
  width: "100%",
  height: "320px",
  borderRadius: "0.5rem",
  overflow: "hidden",
};

const DEFAULT_CENTER = { lat: 19.076, lng: 72.8777 }; // Mumbai default

/**
 * Props:
 * - lat, lng: coordinates (optional)
 * - onClick({ lat, lng }) when user clicks map
 * - directions: result object from DirectionsService (optional)
 * - zoom (optional)
 * - label (optional)
 */
export default function LocationPickerMap({
  label,
  lat,
  lng,
  onClick,
  directions,
  zoom = 12,
}) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const center = useMemo(() => {
    if (typeof lat === "number" && typeof lng === "number") {
      return { lat, lng };
    }
    return DEFAULT_CENTER;
  }, [lat, lng]);

  const handleMapClick = useCallback(
    (e) => {
      const newLat = e.latLng?.lat();
      const newLng = e.latLng?.lng();
      if (typeof newLat !== "number" || typeof newLng !== "number") return;
      onClick?.({ lat: newLat, lng: newLng });
    },
    [onClick]
  );

  if (loadError) return <div className="text-red-600">Map load error</div>;
  if (!isLoaded)
    return <div className="text-sm text-slate-500">Loading map…</div>;

  return (
    <div className="space-y-2">
      {label && <div className="text-sm font-medium">{label}</div>}
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={zoom}
        onClick={handleMapClick}
      >
        {directions && <DirectionsRenderer directions={directions} />}
        {/* Marker (simple). If you want AdvancedMarkerElement later, we can migrate) */}
        {typeof lat === "number" && typeof lng === "number" && (
          <Marker position={{ lat, lng }} />
        )}
      </GoogleMap>
      <div className="text-xs text-slate-600">
        Click on the map to pick location.
      </div>
    </div>
  );
}
