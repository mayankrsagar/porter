// src/pages/Booking.jsx
import React, { useCallback, useEffect, useRef, useState } from "react";

import {
  Autocomplete,
  DirectionsRenderer,
  GoogleMap,
  Marker,
  useJsApiLoader,
} from "@react-google-maps/api";

import { API_BASE_URL } from "../services/api";

const GOOGLE_MAPS_LIBRARIES = ["places"];
const DEFAULT_CENTER = { lat: 19.076, lng: 72.8777 };
const DEFAULT_COORDS = { lat: 0, lng: 0 };

export default function Booking() {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const [form, setForm] = useState({
    pickupAddress: "",
    pickupLat: "",
    pickupLng: "",
    dropAddress: "",
    dropLat: "",
    dropLng: "",
    name: "",
    phone: "",
    vehicleType: "mini-truck",
    weight: 1,
    length: 0,
    width: 0,
    height: 0,
  });

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [directionsResult, setDirectionsResult] = useState(null);
  const [routeDistanceKm, setRouteDistanceKm] = useState(null);

  const pickupAutocompleteRef = useRef(null);
  const dropAutocompleteRef = useRef(null);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function onPickupLoad(ac) {
    pickupAutocompleteRef.current = ac;
  }

  function onDropLoad(ac) {
    dropAutocompleteRef.current = ac;
  }

  function handlePickupPlaceChanged() {
    const ac = pickupAutocompleteRef.current;
    if (!ac) return;
    const place = ac.getPlace();
    if (!place) return;

    const address =
      place.formatted_address || place.name || form.pickupAddress || "";
    const lat = place.geometry?.location?.lat
      ? place.geometry.location.lat()
      : undefined;
    const lng = place.geometry?.location?.lng
      ? place.geometry.location.lng()
      : undefined;

    setForm((prev) => ({
      ...prev,
      pickupAddress: address,
      pickupLat: typeof lat === "number" ? lat : prev.pickupLat,
      pickupLng: typeof lng === "number" ? lng : prev.pickupLng,
    }));
  }

  function handleDropPlaceChanged() {
    const ac = dropAutocompleteRef.current;
    if (!ac) return;
    const place = ac.getPlace();
    if (!place) return;

    const address =
      place.formatted_address || place.name || form.dropAddress || "";
    const lat = place.geometry?.location?.lat
      ? place.geometry.location.lat()
      : undefined;
    const lng = place.geometry?.location?.lng
      ? place.geometry.location.lng()
      : undefined;

    setForm((prev) => ({
      ...prev,
      dropAddress: address,
      dropLat: typeof lat === "number" ? lat : prev.dropLat,
      dropLng: typeof lng === "number" ? lng : prev.dropLng,
    }));
  }

  const handleMapClick = useCallback(
    (e) => {
      const lat = e.latLng?.lat();
      const lng = e.latLng?.lng();
      if (typeof lat !== "number" || typeof lng !== "number") return;

      setForm((prev) => {
        if (!prev.pickupLat && !prev.pickupLng) {
          return { ...prev, pickupLat: lat, pickupLng: lng };
        }
        return { ...prev, dropLat: lat, dropLng: lng };
      });
    },
    [setForm]
  );

  function haversineDistance(lat1, lon1, lat2, lon2) {
    const toRad = (v) => (v * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  const computeRoute = useCallback(() => {
    if (!isLoaded || !window.google) return;

    const pLat = Number(form.pickupLat);
    const pLng = Number(form.pickupLng);
    const dLat = Number(form.dropLat);
    const dLng = Number(form.dropLng);

    const hasCoords =
      !Number.isNaN(pLat) &&
      !Number.isNaN(pLng) &&
      !Number.isNaN(dLat) &&
      !Number.isNaN(dLng) &&
      (pLat !== 0 || pLng !== 0 || dLat !== 0 || dLng !== 0);

    if (!hasCoords) {
      setDirectionsResult(null);
      setRouteDistanceKm(null);
      return;
    }

    const directionsService = new window.google.maps.DirectionsService();
    directionsService.route(
      {
        origin: { lat: pLat, lng: pLng },
        destination: { lat: dLat, lng: dLng },
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === "OK" && result) {
          setDirectionsResult(result);
          const legs = result.routes?.[0]?.legs || [];
          const meters = legs.reduce(
            (sum, leg) => sum + (leg.distance?.value || 0),
            0
          );
          const km = Math.round((meters / 1000) * 100) / 100;
          setRouteDistanceKm(km);
        } else {
          const km = haversineDistance(pLat, pLng, dLat, dLng);
          setDirectionsResult(null);
          setRouteDistanceKm(Math.round(km * 100) / 100);
        }
      }
    );
  }, [form.pickupLat, form.pickupLng, form.dropLat, form.dropLng, isLoaded]);

  useEffect(() => {
    computeRoute();
  }, [computeRoute]);

  function computePricing(distanceKm, weight) {
    const baseFare = 100;
    const perKm = 8;
    const perKg = 2;
    const total = Math.max(
      baseFare + perKm * distanceKm + perKg * weight,
      baseFare
    );
    return {
      baseFare,
      distance: Math.round(distanceKm * 100) / 100,
      totalAmount: Math.round(total * 100) / 100,
      currency: "USD",
    };
  }

  async function useCurrentLocation(forField = "pickup") {
    if (!navigator.geolocation) {
      setStatus({
        ok: false,
        msg: "Geolocation is not supported in this browser.",
      });
      return;
    }

    setLoading(true);
    setStatus(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        const updateCoords = (address) => {
          if (forField === "pickup") {
            setForm((prev) => ({
              ...prev,
              pickupLat: lat,
              pickupLng: lng,
              pickupAddress: address || prev.pickupAddress,
            }));
          } else {
            setForm((prev) => ({
              ...prev,
              dropLat: lat,
              dropLng: lng,
              dropAddress: address || prev.dropAddress,
            }));
          }
        };

        if (isLoaded && window.google) {
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ location: { lat, lng } }, (results, status) => {
            if (status === "OK" && results && results[0]) {
              updateCoords(results[0].formatted_address);
            } else {
              updateCoords(null);
            }
            setLoading(false);
            setStatus({ ok: true, msg: "Location captured." });
          });
        } else {
          updateCoords(null);
          setLoading(false);
          setStatus({
            ok: true,
            msg: "Location captured (no reverse geocode).",
          });
        }
      },
      (err) => {
        console.error(err);
        setLoading(false);
        setStatus({
          ok: false,
          msg: "Unable to get current location: " + err.message,
        });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus(null);

    if (!form.name || !form.phone || !form.pickupAddress || !form.dropAddress) {
      setStatus({
        ok: false,
        msg: "Please fill name, phone, pickup and drop addresses.",
      });
      return;
    }

    setLoading(true);
    try {
      let distanceKm = routeDistanceKm;
      if (distanceKm == null) {
        const pLat = Number(form.pickupLat) || 0;
        const pLng = Number(form.pickupLng) || 0;
        const dLat = Number(form.dropLat) || 0;
        const dLng = Number(form.dropLng) || 0;
        distanceKm = haversineDistance(pLat, pLng, dLat, dLng) || 10;
      }

      const pricing = computePricing(distanceKm, Number(form.weight || 1));

      const payload = {
        customer: {
          name: form.name,
          phone: form.phone,
          address: form.pickupAddress,
        },
        pickupLocation: {
          address: form.pickupAddress,
          coordinates: {
            lat: Number(form.pickupLat) || DEFAULT_COORDS.lat,
            lng: Number(form.pickupLng) || DEFAULT_COORDS.lng,
          },
        },
        deliveryLocation: {
          address: form.dropAddress,
          coordinates: {
            lat: Number(form.dropLat) || DEFAULT_COORDS.lat,
            lng: Number(form.dropLng) || DEFAULT_COORDS.lng,
          },
        },
        vehicleType: form.vehicleType,
        packageDetails: {
          weight: Number(form.weight) || 1,
          dimensions: {
            length: Number(form.length) || 0,
            width: Number(form.width) || 0,
            height: Number(form.height) || 0,
          },
        },
        pricing,
      };

      const res = await fetch(`${API_BASE_URL}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(
          body?.error || `Error creating booking (${res.status})`
        );
      }

      setStatus({ ok: true, msg: "Booking created successfully!", data: body });
      setForm({
        pickupAddress: "",
        pickupLat: "",
        pickupLng: "",
        dropAddress: "",
        dropLat: "",
        dropLng: "",
        name: "",
        phone: "",
        vehicleType: "mini-truck",
        weight: 1,
        length: 0,
        width: 0,
        height: 0,
      });
      setDirectionsResult(null);
      setRouteDistanceKm(null);
    } catch (err) {
      console.error(err);
      setStatus({ ok: false, msg: err.message });
    } finally {
      setLoading(false);
    }
  }

  const mapCenter =
    typeof form.pickupLat === "number" && typeof form.pickupLng === "number"
      ? { lat: form.pickupLat, lng: form.pickupLng }
      : DEFAULT_CENTER;

  if (loadError) {
    return (
      <div className="min-h-screen bg-slate-50 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            ⚠️ Google Maps failed to load. Check your API key and billing
            settings.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
            📦
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-indigo-800 bg-clip-text text-transparent">
            Porter Clone - Create Booking
          </h1>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Location Section */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-1 h-6 bg-indigo-600 rounded"></div>
              <h2 className="text-lg font-semibold text-slate-800">
                Locations
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Pickup */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 flex items-center gap-2">
                  <span className="text-green-600">📍</span> Pickup Address
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    {isLoaded ? (
                      <Autocomplete
                        onLoad={onPickupLoad}
                        onPlaceChanged={handlePickupPlaceChanged}
                      >
                        <input
                          className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                          placeholder="Enter pickup address"
                          value={form.pickupAddress}
                          onChange={(e) =>
                            setField("pickupAddress", e.target.value)
                          }
                        />
                      </Autocomplete>
                    ) : (
                      <input
                        className="w-full p-3 border border-slate-300 rounded-lg bg-slate-50"
                        placeholder="Loading address search..."
                        disabled
                        value={form.pickupAddress}
                        onChange={(e) =>
                          setField("pickupAddress", e.target.value)
                        }
                      />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => useCurrentLocation("pickup")}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 transition flex items-center gap-1 whitespace-nowrap"
                  >
                    📍 Current
                  </button>
                </div>
                {form.pickupLat && form.pickupLng && (
                  <div className="text-xs text-slate-500 bg-slate-50 rounded-md px-3 py-1 inline-block">
                    📍 {form.pickupLat.toFixed(5)}, {form.pickupLng.toFixed(5)}
                  </div>
                )}
              </div>

              {/* Drop */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 flex items-center gap-2">
                  <span className="text-red-600">📍</span> Drop Address
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    {isLoaded ? (
                      <Autocomplete
                        onLoad={onDropLoad}
                        onPlaceChanged={handleDropPlaceChanged}
                      >
                        <input
                          className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                          placeholder="Enter drop address"
                          value={form.dropAddress}
                          onChange={(e) =>
                            setField("dropAddress", e.target.value)
                          }
                        />
                      </Autocomplete>
                    ) : (
                      <input
                        className="w-full p-3 border border-slate-300 rounded-lg bg-slate-50"
                        placeholder="Loading address search..."
                        disabled
                        value={form.dropAddress}
                        onChange={(e) =>
                          setField("dropAddress", e.target.value)
                        }
                      />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => useCurrentLocation("drop")}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 transition flex items-center gap-1 whitespace-nowrap"
                  >
                    📍 Current
                  </button>
                </div>
                {form.dropLat && form.dropLng && (
                  <div className="text-xs text-slate-500 bg-slate-50 rounded-md px-3 py-1 inline-block">
                    📍 {form.dropLat.toFixed(5)}, {form.dropLng.toFixed(5)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Map Section */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-1 h-6 bg-indigo-600 rounded"></div>
                <h2 className="text-lg font-semibold text-slate-800">
                  Route Map
                </h2>
              </div>
              <div className="text-sm text-slate-600 bg-slate-50 px-3 py-1 rounded-lg">
                {routeDistanceKm != null ? (
                  <span className="font-semibold text-indigo-600">
                    📏 {routeDistanceKm} km
                  </span>
                ) : (
                  <span>Click map to set points</span>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 overflow-hidden">
              {isLoaded ? (
                <GoogleMap
                  mapContainerStyle={{
                    width: "100%",
                    height: "400px",
                  }}
                  center={mapCenter}
                  zoom={12}
                  onClick={handleMapClick}
                  options={{
                    zoomControl: true,
                    streetViewControl: false,
                    mapTypeControl: false,
                    fullscreenControl: true,
                  }}
                >
                  {directionsResult && (
                    <DirectionsRenderer directions={directionsResult} />
                  )}
                  {typeof form.pickupLat === "number" &&
                    typeof form.pickupLng === "number" && (
                      <Marker
                        position={{
                          lat: Number(form.pickupLat),
                          lng: Number(form.pickupLng),
                        }}
                        icon={{
                          url: "http://maps.google.com/mapfiles/ms/icons/green-dot.png",
                        }}
                      />
                    )}
                  {typeof form.dropLat === "number" &&
                    typeof form.dropLng === "number" && (
                      <Marker
                        position={{
                          lat: Number(form.dropLat),
                          lng: Number(form.dropLng),
                        }}
                        icon={{
                          url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
                        }}
                      />
                    )}
                </GoogleMap>
              ) : (
                <div className="h-96 flex items-center justify-center bg-slate-50">
                  <div className="flex items-center gap-3 text-slate-500">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                    Loading map...
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Pricing Section */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 p-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-6 bg-indigo-600 rounded"></div>
              <h2 className="text-lg font-semibold text-slate-800">
                Pricing Estimate
              </h2>
            </div>
            {(() => {
              const distance = routeDistanceKm ?? 10;
              const pricing = computePricing(
                distance,
                Number(form.weight || 1)
              );
              return (
                <div className="space-y-3">
                  <div className="text-3xl font-bold text-indigo-600">
                    {pricing.currency} {pricing.totalAmount.toFixed(2)}
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div className="bg-white rounded-lg p-3 border border-slate-200">
                      <div className="text-slate-500">Base Fare</div>
                      <div className="font-semibold text-slate-800">
                        {pricing.currency} {pricing.baseFare}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-slate-200">
                      <div className="text-slate-500">Distance</div>
                      <div className="font-semibold text-slate-800">
                        {pricing.distance} km
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-slate-200">
                      <div className="text-slate-500">Weight</div>
                      <div className="font-semibold text-slate-800">
                        {form.weight || 1} kg
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">
                    * Estimate based on current route and package details
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Customer Info Section */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-1 h-6 bg-indigo-600 rounded"></div>
              <h2 className="text-lg font-semibold text-slate-800">
                Customer Information
              </h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Full Name
                </label>
                <input
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Phone Number
                </label>
                <input
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                  value={form.phone}
                  onChange={(e) => setField("phone", e.target.value)}
                  placeholder="+1 234 567 8900"
                />
              </div>
            </div>
          </div>

          {/* Vehicle & Package Section */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-1 h-6 bg-indigo-600 rounded"></div>
              <h2 className="text-lg font-semibold text-slate-800">
                Vehicle & Package Details
              </h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Vehicle Type
                </label>
                <select
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                  value={form.vehicleType}
                  onChange={(e) => setField("vehicleType", e.target.value)}
                >
                  <option value="mini-truck">🚚 Mini Truck</option>
                  <option value="pickup">🛻 Pickup</option>
                  <option value="3-wheeler">🛺 3-Wheeler</option>
                  <option value="truck">🚛 Truck</option>
                  <option value="van">🚐 Van</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                  value={form.weight}
                  onChange={(e) =>
                    setField("weight", Number(e.target.value) || 0)
                  }
                />
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Length (cm)
                </label>
                <input
                  type="number"
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                  value={form.length}
                  onChange={(e) =>
                    setField("length", Number(e.target.value) || 0)
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Width (cm)
                </label>
                <input
                  type="number"
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                  value={form.width}
                  onChange={(e) =>
                    setField("width", Number(e.target.value) || 0)
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Height (cm)
                </label>
                <input
                  type="number"
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                  value={form.height}
                  onChange={(e) =>
                    setField("height", Number(e.target.value) || 0)
                  }
                />
              </div>
            </div>
          </div>

          {/* Submit Section */}
          <div className="flex items-center justify-between gap-4">
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold rounded-lg transition duration-200 flex items-center gap-2 shadow-sm"
            >
              {loading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              {loading ? "Creating Booking..." : "Create Booking"}
            </button>

            {status && (
              <div
                className={`flex-1 px-4 py-3 rounded-lg border ${
                  status.ok
                    ? "bg-green-50 border-green-200 text-green-700"
                    : "bg-red-50 border-red-200 text-red-700"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>{status.ok ? "✅" : "❌"}</span>
                  <span className="font-medium">{status.msg}</span>
                </div>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
