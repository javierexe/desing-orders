import { useState, useEffect, useMemo, useRef } from "react";
import OrderItemsEditor from "./OrderItemsEditor";
import { buildOrderPayload, HttpError } from "../utils/http";
import { api } from "../lib/api";

// Helpers de fecha (solo fecha, sin hora/TZ)
function todayISO() {
  const t = new Date();
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, "0");
  const d = String(t.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function isBeforeTodayISO(iso) {
  return !!iso && iso < todayISO();
}
// Normaliza cualquier valor de fecha a YYYY-MM-DD (o null si no válido)
function normalizeDate(value) {
  if (!value) return null;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date(value);
  if (Number.isNaN(d)) return null;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function NewOrderModal({
  open,
  onClose,
  onCreated,   // callback al guardar (crear)
  onUpdated,   // callback al guardar (editar)
  onNotify,
  order = null,
  editMode = false
}) {
  const [form, setForm] = useState({
    client_name: "",
    title: "",
    delivery_method: "retiro",
    due_date: "",
    description: "",
    status: "recibido"
  });
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Guardamos el estado inicial para dirty-check
  const initialFormRef = useRef(form);

  // Normaliza date a yyyy-mm-dd (para precargar el form)
  const normDate = (v) => (v ? String(v).slice(0, 10) : "");

  useEffect(() => {
    if (!open) return;
    if (editMode && order) {
      const next = {
        client_name: order.client_name ?? "",
        title: order.title ?? "",
        delivery_method: order.delivery_method ?? "retiro",
        due_date: normDate(order.due_date),
        description: order.description ?? "",
        status: order.status ?? "recibido"
      };
      setForm(next);
      initialFormRef.current = next;
      setItems(order.items ?? []);
    } else {
      const blank = {
        client_name: "",
        title: "",
        delivery_method: "retiro",
        due_date: todayISO(),
        description: "",
        status: "recibido"
      };
      setForm(blank);
      initialFormRef.current = blank;
      setItems([]);
    }
    // Solo actualiza el ref si el pedido a editar cambia realmente
    // Esto evita que el dirty-check se rompa por renders innecesarios
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editMode, order?.code]);

  const isDirty = useMemo(
    () => JSON.stringify({ form, items }) !== JSON.stringify({ form: initialFormRef.current, items: editMode && order ? (order.items ?? []) : [] }),
    [form, items, editMode, order]
  );

  const isValid = Boolean(
    form.client_name?.trim() &&
    form.title?.trim() &&
    form.delivery_method?.trim()
    // si quieres due_date obligatorio: && form.due_date?.trim()
  );

  const isDueInvalid = !!form.due_date && isBeforeTodayISO(form.due_date);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isValid || (editMode && !isDirty) || loading) return;

    // Validación: no permitir fechas anteriores a hoy
    if (isDueInvalid) {
      const msg = "La fecha de compromiso no puede ser anterior a hoy.";
      setError(msg);
      onNotify?.(msg, "warning");
      return;
    }

    setLoading(true);
    setError("");

    // Normaliza el status para que siempre sea el esperado
    function normalizeStatus(s = "") {
      return s.replace(/\s+/g, "_").toLowerCase();
    }
    // Construimos payload y aseguramos due_date normalizado
    const base = buildOrderPayload(form);
    const dueISO = normalizeDate(form.due_date);
    const payload = {
      ...base,
      ...(dueISO ? { due_date: dueISO } : {}),
      status: normalizeStatus(form.status || "recibido"),
      items: items.map(item => ({
        description: item.description,
        due_date: normalizeDate(item.due_date),
        quantity: Number(item.quantity) || 1
      }))
    };

    try {
      let saved;
      if (editMode && order) {
        saved = await api.updateOrder(order.code, payload);
        onNotify?.(`Pedido editado correctamente${order?.code ? `: ${order.code}` : ""}`, "success");
        onUpdated?.(saved);
      } else {
        saved = await api.createOrder(payload); // FastAPI devuelve objeto plano: { code, ... }
        onNotify?.(`Pedido creado: ${saved.code}`, "success");
        onCreated?.(saved);
      }
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

      console.groupCollapsed("[Orders] Error al guardar");
      console.error("Status:", status);
      console.error("Message:", msg);
      console.error("Payload:", payload);
      console.groupEnd();

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
            Proyecto
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-400"
              placeholder="Catálogo 2025"
            />
          </label>
          
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
              min={todayISO()}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-400"
            />
          </label>

          {/* Ítems del pedido */}
          <div className="col-span-full">
            <OrderItemsEditor
              items={items}
              handleAdd={() => setItems([...items, { description: "", quantity: 1, due_date: "" }])}
              handleDelete={idx => setItems(items.filter((_, i) => i !== idx))}
              handleChange={(idx, field, value) => {
                setItems(items => items.map((item, i) => i === idx ? { ...item, [field]: value } : item));
              }}
            />
          </div>

          {/* Descripción al final */}
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
              {editMode ? "Guardar cambios" : "Crear pedido"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
              disabled={loading}
            >
              Cancelar
            </button>
            {loading && <span className="text-sm text-slate-500">Guardando…</span>}
            {error && <span className="text-sm text-rose-600">{error}</span>}
            {isDueInvalid && (
              <span className="text-xs text-amber-600">Advertencia: la fecha de compromiso es anterior a hoy.</span>
            )}
            {editMode && !isDirty && (
              <span className="text-xs text-slate-500">Sin cambios</span>
            )}
          </div>

          {loading && <span className="text-sm text-slate-500">Procesando…</span>}
          {error && <span className="text-sm text-rose-600">{error}</span>}
          {editMode && !isDirty && !loading && (
            <span className="text-xs text-slate-500">Sin cambios</span>
          )}
        </form>
      </div>
    </div>
  );
}
