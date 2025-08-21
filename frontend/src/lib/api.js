// frontend/src/lib/api.js

const API = import.meta.env.VITE_API_BASE || "http://localhost:8000";

export const api = {
  async listOrders() {
    const res = await fetch(`${API}/orders`);
    if (!res.ok) throw new Error(`Error ${res.status}`);
    return res.json();
  },

  async updateStatus(code, status) {
    const res = await fetch(`${API}/orders/${code}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error(`Error ${res.status}`);
    return res.json();
  }
};
