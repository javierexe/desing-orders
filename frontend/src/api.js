// frontend/src/api.js
import axios from "axios";

// En desarrollo: Vite proxy => /api -> backend (LAN o localhost)
// En producción: podrías usar VITE_API_BASE_URL desde .env
const baseURL = import.meta.env.VITE_API_BASE_URL || "/api";

export const api = axios.create({
  baseURL,
});

// Ejemplo de helpers:
export const getOrders = () => api.get("/orders");
export const createOrder = (data) => api.post("/orders", data);
export const updateOrder = (id, data) => api.put(`/orders/${id}`, data);
