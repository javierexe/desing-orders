// frontend/src/lib/api.js
const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

console.log("API base:", API);

export const api = {
  async listOrders() {
    try {
      const res = await fetch(`${API}/orders`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      console.error("listOrders error:", `${API}/orders`, e);
      throw e;
    }
  },

  async createOrder(order) {
    try {
      const res = await fetch(`${API}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      console.error("createOrder error:", `${API}/orders`, e);
      throw e;
    }
  },

  async updateStatus(code, status) {
    try {
      const res = await fetch(`${API}/orders/${code}?status=${encodeURIComponent(status)}`, {
        method: "PATCH",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      console.error("updateStatus error:", `${API}/orders/${code}`, e);
      throw e;
    }
  },
};

