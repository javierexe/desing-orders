// frontend/src/components/KanbanCard.jsx
import React from "react";
import { STATUS_STYLES, STATUS_LABEL, isOverdue, isSoon } from "./kanbanUtils";
import { Calendar, Truck, Store, Pencil, GripVertical } from "lucide-react";

const KanbanCard = React.memo(function KanbanCard({
  order,
  attributes,
  listeners,
  setNodeRef,
  style,
  onEdit,
}) {
  const dueClass =
    isOverdue(order?.due_date)
      ? "bg-rose-100 text-rose-800 ring-rose-200"
      : isSoon(order?.due_date)
      ? "bg-amber-100 text-amber-800 ring-amber-200"
      : "bg-slate-100 text-slate-700 ring-slate-200";

  const remainingLabel = (() => {
    if (!order?.due_date) return "";
    const dueDate = new Date(order.due_date);
    if (isNaN(dueDate)) return order.due_date;
    const today = new Date();
    const d0 = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const diffDays = Math.round((d0 - t0) / 86400000);
    if (diffDays > 1) return `${diffDays} días`;
    if (diffDays === 1) return "1 día";
    if (diffDays === 0) return "Hoy";
    if (diffDays === -1) return "atrasada 1 día";
    return `Atrasada ${Math.abs(diffDays)} días`;
  })();

  const method = String(order?.delivery_method || "retiro").toLowerCase();
  const DeliveryIcon = method === "despacho" ? Truck : Store;
  const methodLabel = method === "despacho" ? "Despacho" : "Retiro";

  // ⬇️ Desestructura listeners y conserva el resto
  const {
    onPointerDown,
    onMouseDown,
    onTouchStart,
    ...restListeners
  } = listeners || {};

  return (
    <article
      ref={setNodeRef}
      style={style}
      {...attributes}  // ⬅️ attributes en el root
      {...listeners}   // ← SOLO para test
      className="relative w-full rounded-xl border border-slate-200 bg-white p-3 shadow-sm hover:bg-slate-50"
      aria-roledescription="Draggable card"
    >
      <div className="flex items-start gap-2">
        {/* Handle: único punto que inicia el drag */}
        <button
          type="button"
          aria-label="Arrastrar"
          className="shrink-0 p-1 rounded hover:bg-slate-100 active:bg-slate-200 cursor-grab touch-none"
          {...restListeners}
        >
          <GripVertical className="w-5 h-5 text-slate-400" />
        </button>

        {/* Contenido informativo: sin onClick */}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-slate-800 pr-8">
            <span className="text-xs text-slate-400">({order.code})</span><br />
            {order.title}
          </div>
          <div className="mt-0.5 text-xs text-slate-500">{order.client_name}</div>

          <div className="mt-2 flex flex-wrap items-center gap-2 justify-between">
            {order.due_date && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ring-1 ${dueClass}`}
                title={`Fecha: ${order.due_date}`}
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>Entrega en: {remainingLabel}</span>
              </span>
            )}

            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ring-1 ring-slate-200 bg-slate-50"
              title={methodLabel}
            >
              <DeliveryIcon className="h-3.5 w-3.5" aria-label={methodLabel} />
              {methodLabel}
            </span>
          </div>

          {order.description && (
            <p className="mt-2 line-clamp-2 text-xs text-slate-600">
              <strong>Nota:</strong> {order.description}
            </p>
          )}
        </div>
      </div>

      {/* Botón lápiz: único que abre el modal */}
      <button
        type="button"
        title="Editar pedido"
        aria-label="Editar pedido"
        onClick={(e) => {
          e.stopPropagation();
          onEdit?.(order);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            onEdit?.(order);
          }
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow ring-1 ring-slate-200 hover:bg-slate-50"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
    </article>
  );
});

export default KanbanCard;





