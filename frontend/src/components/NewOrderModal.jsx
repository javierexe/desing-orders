import { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_BASE || "http://localhost:8000";

export default function NewOrderModal({ open, onClose, onCreated, onNotify, order = null, editMode = false }) {
  const [form, setForm] = useState({
    code: "",
    client_name: "",
    title: "",
    delivery_method: "retiro",
    due_date: "",
    description: ""
  });

  useEffect(() => {
    if (editMode && order) {
      setForm(order);
    } else {
      setForm({
        code: "",
        client_name: "",
        title: "",
        delivery_method: "retiro",
        due_date: "",
        description: ""
      });
    }
  }, [order, editMode, open]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      let res;
      if (editMode && order) {
        res = await fetch(`${API}/orders/${order.code}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error("Error al editar el pedido");
        onNotify?.("Pedido editado correctamente", "success");
      } else {
        res = await fetch(`${API}/orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error("Error al crear el pedido");
        onNotify?.("Pedido creado correctamente", "success");
      }
      setForm({ code:"", client_name:"", title:"", delivery_method:"retiro", due_date:"", description:"" });
      onCreated?.();      // refresca lista afuera
      onClose?.();        // cierra modal
    } catch (err) {
      setError(err.message || "Error de red");
      onNotify?.(err.message || "Error de red", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{editMode ? "Editar pedido" : "Nuevo pedido"}</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="text-sm">
            Code
            <input
              required
              value={form.code}
              onChange={e=>setForm({...form, code:e.target.value})}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-400"
              placeholder="PED-0001"
              disabled={editMode}
            />
          </label>

          <label className="text-sm">
            Cliente
            <input
              required
              value={form.client_name}
              onChange={e=>setForm({...form, client_name:e.target.value})}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-400"
              placeholder="Acme Ltda."
            />
          </label>

          <label className="text-sm">
            Título
            <input
              required
              value={form.title}
              onChange={e=>setForm({...form, title:e.target.value})}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-400"
              placeholder="Catálogo 2025"
            />
          </label>

          <label className="text-sm">
            Método de entrega
            <select
              value={form.delivery_method}
              onChange={e=>setForm({...form, delivery_method:e.target.value})}
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
              onChange={e=>setForm({...form, due_date:e.target.value})}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-400"
            />
          </label>

          <label className="col-span-full text-sm">
            Descripción
            <textarea
              rows={3}
              value={form.description}
              onChange={e=>setForm({...form, description:e.target.value})}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-400"
              placeholder="Notas del pedido…"
            />
          </label>

          <div className="col-span-full flex items-center gap-3">
            <button
              disabled={loading}
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
          </div>
        </form>
      </div>
    </div>
  );
}
