// frontend/src/components/Tracking.jsx
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { apiFetch } from '../services/api';

function StatusBadge({ status }) {
  const map = {
    pending: "bg-yellow-100 text-yellow-800",
    assigned: "bg-indigo-100 text-indigo-800",
    ongoing: "bg-indigo-100 text-indigo-800",
    in_transit: "bg-indigo-100 text-indigo-800",
    delivered: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
    default: "bg-slate-100 text-slate-800",
  };
  const cls = map[status?.toLowerCase()] || map.default;
  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${cls}`}
    >
      {status || "Unknown"}
    </span>
  );
}

export default function Tracking() {
  const [trackingId, setTrackingId] = useState("");
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingLookup, setLoadingLookup] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const pollRef = useRef(null);

  const normalizeOrder = (resp) => {
    if (!resp) return null;
    if (resp.order) return resp.order;
    if (resp.data?.order) return resp.data.order;
    return resp;
  };

  const fetchOrder = useCallback(async (id) => {
    if (!id) return null;
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch(`/orders/${id}`);
      const found = normalizeOrder(data);
      setOrder(found);
      setLastUpdated(new Date());
      return found;
    } catch (err) {
      console.error("fetchOrder error:", err);
      const message = err?.message || err?.data?.message || "Order not found";
      setError(message);
      setOrder(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // polling when autoRefresh is enabled and order is present
    if ((autoRefresh && order?.id) || (autoRefresh && order?._id)) {
      // clear old
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(() => {
        const id = order._id || order.id || order.orderId;
        if (id) fetchOrder(id);
      }, 8000); // every 8s
      return () => clearInterval(pollRef.current);
    } else {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, order, fetchOrder]);

  const handleLookup = async (e) => {
    e?.preventDefault();
    setError("");
    if (!trackingId?.trim()) {
      setError("Please enter an order ID to track.");
      return;
    }
    setLoadingLookup(true);
    try {
      await fetchOrder(trackingId.trim());
    } finally {
      setLoadingLookup(false);
    }
  };

  const handleRefresh = async () => {
    const id = order?._id || order?.id || order?.orderId || trackingId;
    if (!id) {
      setError("No order to refresh.");
      return;
    }
    setError("");
    await fetchOrder(id);
  };

  const handleCopyLink = async () => {
    const id = order?._id || order?.id || order?.orderId;
    if (!id) {
      setError("No order to share.");
      return;
    }
    const url = `${window.location.origin}/tracking?order=${id}`;
    try {
      await navigator.clipboard.writeText(url);
      // small success hint
      setError("Share link copied to clipboard.");
      setTimeout(() => setError(""), 2000);
    } catch {
      setError("Failed to copy link.");
    }
  };

  // derive coordinates (if available)
  const coords =
    order?.currentLocation?.coords ||
    order?.currentLocation?.latlng ||
    (order?.currentLocation?.lat && order?.currentLocation?.lng
      ? { lat: order.currentLocation.lat, lng: order.currentLocation.lng }
      : order?.lastLocation?.coords || null);

  const openInGoogleMaps = () => {
    if (!coords) {
      setError("No coordinates available for this order.");
      return;
    }
    const { lat, lng } = coords;
    const url = `https://www.google.com/maps?q=${lat},${lng}`;
    window.open(url, "_blank");
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Track Order</h1>

      <form
        onSubmit={handleLookup}
        className="flex flex-col sm:flex-row gap-3 mb-4"
      >
        <input
          value={trackingId}
          onChange={(e) => setTrackingId(e.target.value)}
          placeholder="Enter order ID (e.g. 64a1f... )"
          className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-100"
          aria-label="Order ID"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loadingLookup}
            className="inline-flex items-center px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {loadingLookup ? "Searching..." : "Find"}
          </button>
          <button
            type="button"
            onClick={() => {
              setTrackingId("");
              setOrder(null);
              setError("");
            }}
            className="inline-flex items-center px-4 py-2 rounded-md bg-white border text-sm hover:bg-gray-50"
          >
            Clear
          </button>
        </div>
      </form>

      <div className="flex items-center gap-4 mb-4">
        <label className="inline-flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="w-4 h-4"
          />
          <span>Auto-refresh</span>
        </label>

        <button
          onClick={handleRefresh}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-white border text-sm hover:bg-gray-50"
        >
          Refresh
        </button>

        <button
          onClick={handleCopyLink}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-white border text-sm hover:bg-gray-50"
        >
          Copy share link
        </button>
      </div>

      {/* Error / info message */}
      {error && (
        <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-100 px-4 py-2 rounded">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && !order ? (
        <div className="bg-white p-4 rounded shadow text-sm">
          Loading order...
        </div>
      ) : !order ? (
        <div className="bg-white p-4 rounded shadow text-sm text-slate-500">
          Enter an order ID and click <strong>Find</strong> to look up its
          status.
        </div>
      ) : (
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-slate-800">
                  Order {order._id || order.id || order.orderId}
                </h2>
                <StatusBadge status={order.status} />
              </div>

              <div className="text-sm text-slate-500 mt-1">
                {order.description || order.notes || "No extra notes"}
              </div>
            </div>

            <div className="text-right text-xs text-gray-400">
              {lastUpdated && (
                <div>Last updated: {lastUpdated.toLocaleTimeString()}</div>
              )}
              <div className="mt-2">
                <button
                  onClick={() => {
                    // small manual refresh
                    const id = order._id || order.id || order.orderId;
                    if (id) fetchOrder(id);
                  }}
                  className="px-3 py-1 rounded-md bg-white border text-sm hover:bg-gray-50"
                >
                  Update now
                </button>
              </div>
            </div>
          </div>

          {/* Addresses */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-slate-50">
              <div className="text-xs text-gray-500">Pickup</div>
              <div className="mt-1 text-sm text-slate-700">
                {order.pickupLocation?.address ||
                  order.pickup ||
                  order.from ||
                  "Unknown pickup"}
              </div>
              {order.pickupTime && (
                <div className="text-xs text-gray-400 mt-2">
                  Pickup ETA: {new Date(order.pickupTime).toLocaleString()}
                </div>
              )}
            </div>

            <div className="p-3 rounded-lg bg-slate-50">
              <div className="text-xs text-gray-500">Drop</div>
              <div className="mt-1 text-sm text-slate-700">
                {order.deliveryLocation?.address ||
                  order.drop ||
                  order.to ||
                  "Unknown drop"}
              </div>
              {order.dropTime && (
                <div className="text-xs text-gray-400 mt-2">
                  Drop ETA: {new Date(order.dropTime).toLocaleString()}
                </div>
              )}
            </div>
          </div>

          {/* Driver / vehicle */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-slate-50">
              <div className="text-xs text-gray-500">Driver</div>
              <div className="mt-1 text-sm text-slate-700">
                {order.driver?.name || order.driverName || "Unassigned"}
              </div>
              {order.driver?.phone && (
                <div className="text-xs text-gray-400 mt-1">
                  Phone: {order.driver.phone}
                </div>
              )}
            </div>

            <div className="p-3 rounded-lg bg-slate-50">
              <div className="text-xs text-gray-500">Vehicle</div>
              <div className="mt-1 text-sm text-slate-700">
                {order.vehicle?.plate ||
                  order.vehicleNumber ||
                  order.plate ||
                  "Unassigned"}
              </div>
              {order.vehicle?.type && (
                <div className="text-xs text-gray-400 mt-1">
                  Type: {order.vehicle.type}
                </div>
              )}
            </div>
          </div>

          {/* Map / coordinates */}
          <div className="p-3 rounded-lg bg-slate-50 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div>
              <div className="text-xs text-gray-500">
                Last known coordinates
              </div>
              {coords ? (
                <div className="mt-1 text-sm text-slate-700">
                  {coords.lat}, {coords.lng}
                </div>
              ) : (
                <div className="mt-1 text-sm text-slate-500">
                  Coordinates not available
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={openInGoogleMaps}
                disabled={!coords}
                className="px-3 py-2 rounded-md bg-white border text-sm hover:bg-gray-50 disabled:opacity-60"
              >
                Open in Google Maps
              </button>
              <button
                onClick={handleCopyLink}
                className="px-3 py-2 rounded-md bg-white border text-sm hover:bg-gray-50"
              >
                Share
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
