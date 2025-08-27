// frontend/src/lib/api.js
const DEV = import.meta.env.DEV;
const API_BASE = (DEV ? "/api" : import.meta.env.VITE_API_BASE_URL) || "/api";

async function http(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      if (data?.detail) msg += `: ${typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail)}`;
    } catch {}
    throw new Error(msg);
  }

  if (res.status === 204) return null;       // No Content
  const text = await res.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
}

export const api = {
  listOrders() { return http("/orders"); },
  createOrder(order) { return http("/orders", { method: "POST", body: JSON.stringify(order) }); },
  updateOrder(code, patch) {
    return http(`/orders/${encodeURIComponent(code)}`, { method: "PATCH", body: JSON.stringify(patch) });
  },
  deleteOrder(code) { return http(`/orders/${encodeURIComponent(code)}`, { method: "DELETE" }); },
};



