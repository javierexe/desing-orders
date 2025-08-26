// src/utils/http.js

// Error HTTP con status y payload opcional
export class HttpError extends Error {
  constructor(message, status = 0, data = null) {
    super(message || "HTTP error");
    this.name = "HttpError";
    this.status = status;
    this.data = data;
  }
}

// Intenta leer el cuerpo de error (útil para FastAPI)
export async function readError(res) {
  try {
    const data = await res.json();
    if (data?.detail) {
      if (Array.isArray(data.detail)) {
        // FastAPI validation errors
        return data.detail
          .map(d => `${(d.loc || []).join(".")}: ${d.msg}`)
          .join(" | ");
      }
      return typeof data.detail === "string"
        ? data.detail
        : JSON.stringify(data.detail);
    }
    return typeof data === "string" ? data : JSON.stringify(data);
  } catch {
    return res.statusText || "Error";
  }
}

// Quita null/undefined/""
export function compactObject(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== "")
  );
}

// Normaliza fecha a YYYY-MM-DD (o null si inválida)
export function toISODate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d)) return null;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Construye el payload para crear/editar una orden
export function buildOrderPayload(form) {
  const base = {
    code: (form.code || "").trim(),
    title: (form.title || "").trim(),
    client_name: (form.client_name || "").trim(),
    description: (form.description || "").trim(),
    delivery_method: (form.delivery_method || "").toLowerCase() || "retiro",
    status: (form.status || "").toLowerCase() || "recibido",
    due_date: toISODate(form.due_date),
  };
  return compactObject(base);
}

// Helper para fetch JSON con manejo de error uniforme
export async function fetchJSON(input, init = {}) {
  const res = await fetch(input, {
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    const msg = await readError(res);
    throw new HttpError(msg, res.status);
  }
  // sin contenido
  if (res.status === 204) return null;
  return res.json();
}
