export const API_BASE_URL =
  import.meta.env?.VITE_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:3000/api";

export async function fetchJSON(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, options);

  if (!res.ok) {
    let message;
    try {
      message = await res.text();
    } catch {
      message = res.statusText;
    }
    throw new Error(`API error ${res.status}: ${message}`);
  }

  return res.json();
}
