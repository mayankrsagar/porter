import axios from 'axios';

export const API_BASE_URL =
  import.meta.env?.VITE_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:3000/api";

// Create an axios instance with sane defaults
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // send/receive httpOnly cookies
  timeout: 15000, // 15s timeout (adjust if needed)
});

// REQUEST interceptor: auto-set JSON content-type when appropriate
apiClient.interceptors.request.use(
  (config) => {
    // if body exists and it's not FormData, ensure JSON header
    const isForm = config.data instanceof FormData;
    if (config.data && !isForm && !config.headers["Content-Type"]) {
      config.headers["Content-Type"] = "application/json";
    }
    return config;
  },
  (err) => Promise.reject(err)
);

// RESPONSE interceptor: normalize errors and optionally handle 401
apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    // Network error (no response)
    if (!error.response) {
      return Promise.reject(
        new Error("No response from server — check your network")
      );
    }

    const { status, data } = error.response;

    // example: centralized 401 handling (optional)
    if (status === 401) {
      // TODO: either try refresh-token flow, or redirect to login, or emit an event
      // e.g. store.dispatch(logout()) or window.location = '/login'
      // For now, normalize and pass downstream
    }

    // Normalize error shape: message + raw data
    const message =
      (data && (data.message || data.error)) ||
      error.message ||
      `Request failed with status ${status}`;

    return Promise.reject({ status, message, data });
  }
);

/**
 * apiFetch wrapper compatible with your earlier fetch-style usage.
 * path: string (e.g. '/auth/login' or '/drivers')
 * options: { method, body, params, headers, responseType }
 */
export async function apiFetch(path, options = {}) {
  const { body, method = "get", params, headers, responseType } = options;
  try {
    const resp = await apiClient.request({
      url: path,
      method: method.toLowerCase(),
      data: body,
      params,
      headers,
      responseType,
    });

    // axios already returns parsed JSON in resp.data
    return resp.data;
  } catch (err) {
    // rethrow normalized error for components to handle
    throw err;
  }
}

export default apiClient;
