
import React from "react";
import { Trash } from "lucide-react";

function OrderItemsEditor({ items, handleAdd, handleDelete, handleChange }) {
  // Helper para obtener hoy en formato YYYY-MM-DD
  function todayISO() {
    const t = new Date();
    const y = t.getFullYear();
    const m = String(t.getMonth() + 1).padStart(2, "0");
    const d = String(t.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-md">Ítems del pedido</h4>
        <button type="button" onClick={handleAdd} className="rounded-xl bg-sky-100 px-3 py-1 text-sm font-medium text-sky-700 hover:bg-sky-200">+ Agregar ítem</button>
      </div>
      {items.length === 0 && <div className="text-sm text-slate-500">Sin ítems aún.</div>}
  {items.length > 0 && (
        <div className="grid grid-cols-[2fr_0.7fr_1.2fr_0.5fr] gap-2 items-center text-xs font-semibold text-slate-600 mb-1">
          <div>Descripción</div>
          <div>Cantidad</div>
          <div>Fecha entrega</div>
          <div>Eliminar</div>
        </div>
      )}
      {items.map((item, idx) => ( 
        <div key={idx} className="grid grid-cols-[2fr_0.7fr_1.2fr_0.5fr] gap-2 items-center border-b pb-2 mb-2">
          <label className="text-sm flex flex-col justify-center">
            {items.length === 1 ? null : <span className="sr-only">Descripción</span>}
            <input
              type="text"
              value={item.description}
              onChange={e => handleChange(idx, "description", e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
              placeholder="Detalle del ítem"
              required
            />
          </label>
          <label className="text-sm flex flex-col justify-center">
            {items.length === 1 ? null : <span className="sr-only">Cantidad</span>}
            <input
              type="number"
              min={1}
              value={item.quantity}
              onChange={e => handleChange(idx, "quantity", e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-center"
            />
          </label>
          <label className="text-sm flex flex-col justify-center">
            {items.length === 1 ? null : <span className="sr-only">Fecha entrega</span>}
            <input
              type="date"
              value={item.due_date}
              min={todayISO()}
              onChange={e => handleChange(idx, "due_date", e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
              required
            />
          </label>
          <div className="flex items-center justify-center h-full">
            <button type="button" onClick={() => handleDelete(idx)} className="rounded-xl border border-rose-300 p-2 text-rose-700 hover:bg-rose-50 flex items-center justify-center" title="Eliminar ítem">
              <Trash className="w-5 h-5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default OrderItemsEditor;
