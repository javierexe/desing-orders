// frontend/src/lib/api.js
const DEV = import.meta.env.DEV;
const API_BASE = (DEV ? "/api" : import.meta.env.VITE_API_BASE_URL) || "/api";

async function http(path, options = {}) {
  // Si el método es GET, no agregues Content-Type para evitar preflight CORS
  const method = options.method ? options.method.toUpperCase() : "GET";
  
  // No establecer Content-Type automáticamente si ya hay headers personalizados
  // o si el body es FormData (el navegador lo manejará automáticamente)
  let headers = { ...(options.headers || {}) };
  
  if (method !== "GET" && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = "application/json";
  }
    
  const url = `${API_BASE}${path}`;
  
  
  const res = await fetch(url, {
    ...options,
    headers,
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
  // Método POST genérico para FormData y otros casos
  post: (url, data, config = {}) => {
    return http(url, {
      method: 'POST',
      body: data,
      ...config
    });
  },

  // Métodos existentes
  listOrders: () => http('/orders'),
  createOrder(order) { return http("/orders", { method: "POST", body: JSON.stringify(order) }); },
  updateOrder(code, patch) {
    
    return http(`/orders/${encodeURIComponent(code)}`, { method: "PATCH", body: JSON.stringify(patch) });
  },
  deleteOrder(code) { return http(`/orders/${encodeURIComponent(code)}`, { method: "DELETE" }); },
  
  // Métodos genéricos para OCR y otros usos
  get(path) { return http(path); },
  post(path, data, options = {}) { 
    return http(path, { 
      method: "POST", 
      body: data instanceof FormData ? data : JSON.stringify(data),
      headers: data instanceof FormData ? {} : { "Content-Type": "application/json" },
      ...options 
    }); 
  },
};



