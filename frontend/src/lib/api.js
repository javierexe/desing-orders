// frontend/src/lib/api.js
const DEV = import.meta.env.DEV;

// En desarrollo (Vite) usamos el proxy: /api
// En producción, si existe, usamos VITE_API_BASE_URL (ej: https://tu-backend.com)
const API_BASE =
  (DEV ? "/api" : import.meta.env.VITE_API_BASE_URL) || "/api";

async function http(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export const api = {
  listOrders() {
    return http("/orders");
  },
  createOrder(order) {
    return http("/orders", { method: "POST", body: JSON.stringify(order) });
  },
  updateStatus(code, status) {
    return http(`/orders/${encodeURIComponent(code)}?status=${encodeURIComponent(status)}`, {
      method: "PATCH",
    });
  },
};


