import { useState, useEffect, useMemo, useRef } from "react";
import { buildOrderPayload, fetchJSON, HttpError } from "../utils/http"; // ajusta la ruta

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export default function NewOrderModal({
  open,
  onClose,
  onCreated,
  onNotify,
  order = null,
  editMode = false
}) {
  const [form, setForm] = useState({
    client_name: "",
    title: "",
    delivery_method: "retiro",
    due_date: "",
    description: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Guardamos el estado inicial para dirty-check
  const initialFormRef = useRef(form);

  // Normaliza date a yyyy-mm-dd
  const normDate = (v) => (v ? String(v).slice(0, 10) : "");

  useEffect(() => {
    if (!open) return;
    if (editMode && order) {
      const next = {
        client_name: order.client_name ?? "",
        title: order.title ?? "",
        delivery_method: order.delivery_method ?? "retiro",
        due_date: normDate(order.due_date),
        description: order.description ?? ""
      };
      setForm(next);
      initialFormRef.current = next;
    } else {
      const blank = {
        client_name: "",
        title: "",
        delivery_method: "retiro",
        due_date: "",
        description: ""
      };
      setForm(blank);
      initialFormRef.current = blank;
    }
  }, [open, editMode, order]);

  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initialFormRef.current),
    [form]
  );

  const isValid = Boolean(
    form.client_name?.trim() &&
    form.title?.trim() &&
    form.delivery_method?.trim()
    // si quieres due_date obligatorio: && form.due_date?.trim()
  );

  async function readError(res) {
  try {
    const data = await res.json();
    if (data?.detail) {
      if (Array.isArray(data.detail)) {
        // FastAPI validation errors → formato: loc + mensaje
        return data.detail
          .map(d => `${d.loc?.join(".")}: ${d.msg}`)
          .join(" | ");
      }
      return typeof data.detail === "string"
        ? data.detail
        : JSON.stringify(data.detail);
    }
    return JSON.stringify(data);
  } catch {
    return res.statusText || "Error";
  }
}

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isValid || (editMode && !isDirty) || loading) return;

    setLoading(true);
    setError("");

    const payload = buildOrderPayload(form);
    
    try {
      if (editMode && order) {
      await fetchJSON(`${API}/orders/${order.code}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      onNotify?.("Pedido editado correctamente", "success");
    } else {
      const { data } = await fetchJSON(`${API}/orders`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      onNotify?.(`Pedido creado: ${data.code}`, "success");
    }

    onCreated?.();
    onClose?.();
  } catch (err) {
    let msg = "Error de red";
    let status = null;

    if (err instanceof HttpError) {
    status = err.status;
    msg = err.message || msg;
  } else if (err?.message) {
    msg = err.message;
  }

  // Log detallado en consola para debug
  // (no se muestra al usuario, solo ayuda)
  console.groupCollapsed("[Orders] Error al guardar");
  console.error("Status:", status);
  console.error("Message:", msg);
  console.error("Payload:", buildOrderPayload(form));
  console.groupEnd();

  // Notificación visible para el usuario
  const pretty = status ? `[${status}] ${msg}` : msg;
  setError(pretty);
  onNotify?.(pretty, "error");
} finally {
    setLoading(false);
  }
  }
  
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        {/* Header estable con badge del código en modo edición */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h3 className="text-lg font-semibold">
            {editMode ? "Editar pedido" : "Nuevo pedido"}
          </h3>
          {editMode && order?.code && (
            <span className="inline-flex items-center rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-sm font-mono text-slate-700">
              {order.code}
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* 1a fila */}
          <label className="text-sm">
            Cliente
            <input
              required
              value={form.client_name}
              onChange={(e) => setForm({ ...form, client_name: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-400"
              placeholder="Acme Ltda."
            />
          </label>

          <label className="text-sm">
            Título
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-400"
              placeholder="Catálogo 2025"
            />
          </label>

          {/* 2a fila */}
          <label className="text-sm">
            Método de entrega
            <select
              value={form.delivery_method}
              onChange={(e) => setForm({ ...form, delivery_method: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-sky-400"
            >
              <option value="retiro">retiro</option>
              <option value="despacho">despacho</option>
            </select>
          </label>

          <label className="text-sm">
            Fecha compromiso
            <input
              type="date"
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-400"
            />
          </label>

          {/* Descripción a todo el ancho */}
          <label className="col-span-full text-sm">
            Descripción
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-400"
              placeholder="Notas del pedido…"
            />
          </label>

          <div className="col-span-full flex items-center gap-3">
            <button
              disabled={loading || (editMode && !isDirty) || !isValid}
              aria-disabled={loading || (editMode && !isDirty) || !isValid}
              title={
                !isValid
                  ? "Completa los campos requeridos"
                  : editMode && !isDirty
                  ? "Sin cambios"
                  : ""
              }
              type="submit"
              className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
            >
              {editMode ? "Guardar cambios" : "Crear"}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
            >
              Cancelar
            </button>

            {loading && <span className="text-sm text-slate-500">Guardando…</span>}
            {error && <span className="text-sm text-rose-600">{error}</span>}
            {editMode && !isDirty && (
              <span className="text-xs text-slate-500">Sin cambios</span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
