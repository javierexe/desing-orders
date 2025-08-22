// frontend/src/lib/api.js
const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export const api = {
  async listOrders() {
    const res = await fetch(`${API}/orders`);
    if (!res.ok) throw new Error("Error listOrders");
    return res.json();
  },
  async createOrder(order) {
    const res = await fetch(`${API}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(order),
    });
    if (!res.ok) throw new Error("Error createOrder");
    return res.json();
  },
  async updateStatus(code, status) {
    const res = await fetch(`${API}/orders/${code}?status=${encodeURIComponent(status)}`, {
      method: "PATCH",
    });
    if (!res.ok) throw new Error("Error updateStatus");
    return res.json();
  },
};

