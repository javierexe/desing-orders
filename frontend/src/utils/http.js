// src/utils/http.js

export class HttpError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

export async function readError(res) {
  // intenta parsear JSON; si falla, intenta texto plano
  try {
    const data = await res.clone().json(); // 👈 clone para no consumir el body
    if (data?.detail) {
      if (Array.isArray(data.detail)) {
        return data.detail
          .map(d => `${(d.loc || []).join(".")}: ${d.msg}`)
          .join(" | ");
      }
      return typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail);
    }
    return JSON.stringify(data);
  } catch (_) {
    try {
      const txt = await res.text();
      return txt?.trim() || res.statusText || "Error";
    } catch {
      return res.statusText || "Error";
    }
  }
}

export function compactObject(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== "")
  );
}

export function buildOrderPayload(form) {
  const base = {
    client_name: (form.client_name || "").trim(),
    title: (form.title || "").trim(),
    delivery_method: (form.delivery_method || "").trim().toLowerCase(),
    description: (form.description || "").trim(),
    due_date: form.due_date || undefined,
  };
  return compactObject(base);
}

export async function fetchJSON(url, opts = {}) {
  const options = {
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    ...opts,
  };
  const res = await fetch(url, options);
  if (!res.ok) {
    const msg = await readError(res);
    throw new HttpError(msg, res.status); // 👈 status incluido
  }
  if (res.status === 204) return { data: null, status: res.status };
  const data = await res.json();
  return { data, status: res.status };
}

