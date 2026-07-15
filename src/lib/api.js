// Central API client for the HR-FMS frontend.
//
// Every page should talk to the backend through this module instead of calling
// fetch() with import.meta.env.VITE_API_URL directly. Benefits:
//   - one place for the base URL, auth header, and error handling
//   - consistent handling of the backend envelope { success, message, data }
//   - easy to add interceptors later (auth refresh, logging, etc.)
//
// Base URL comes from VITE_API_URL (see .env). In dev it is "/api/v1", which
// the Vite proxy forwards to the backend on http://localhost:5006.

const BASE_URL = import.meta.env.VITE_API_URL || "/api/v1";

/** Pull the auth token, if we have one. Wire this to your auth store/JWT later. */
function getToken() {
  try {
    return localStorage.getItem("token") || null;
  } catch {
    return null;
  }
}

/**
 * Core request helper.
 * Resolves with the parsed JSON body on success.
 * Throws an Error (with .status and .body) on a non-2xx response or network error.
 */
async function request(path, { method = "GET", body, headers, signal } = {}) {
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const token = getToken();

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    signal,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body == null ? undefined : isFormData ? body : JSON.stringify(body),
  });

  const contentType = res.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await res.json().catch(() => ({}))
    : await res.text();

  if (!res.ok) {
    const message =
      (payload && payload.message) ||
      (payload && payload.error) ||
      `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.body = payload;
    throw err;
  }

  return payload;
}

export const api = {
  get: (path, opts) => request(path, { ...opts, method: "GET" }),
  post: (path, body, opts) => request(path, { ...opts, method: "POST", body }),
  put: (path, body, opts) => request(path, { ...opts, method: "PUT", body }),
  patch: (path, body, opts) => request(path, { ...opts, method: "PATCH", body }),
  delete: (path, opts) => request(path, { ...opts, method: "DELETE" }),
};

export default api;
