// frontend/src/components/KanbanCard.jsx
import React from "react";
import { STATUS_STYLES, STATUS_LABEL, isOverdue, isSoon } from "./kanbanUtils";
import { Calendar, Truck, Store, Pencil } from "lucide-react";

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

  // Método de entrega: "despacho" | "retiro" (fallback a "retiro")
  const method = String(order?.delivery_method || "retiro").toLowerCase();
  const DeliveryIcon = method === "despacho" ? Truck : Store;
  const methodLabel = method === "despacho" ? "Despacho" : "Retiro";

  return (
    <article
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={style}
      className="relative w-full rounded-xl border border-slate-200 bg-white p-3 shadow-sm hover:bg-slate-50 cursor-move"    
    >
      {/* Botón de edición (top-right). Usa stopPropagation para no iniciar drag */}
      <button
        type="button"
        title="Editar pedido"
        aria-label="Editar pedido"
        onClick={(e) => {
          e.stopPropagation();
          onEdit?.(order);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow ring-1 ring-slate-200 hover:bg-slate-50"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>

      {/* Título / código */}
      <div className="text-sm font-semibold text-slate-800 pr-8">
        <span className="text-xs text-slate-400">({order.code})</span><br />
        {order.title}
      </div>

      {/* Cliente */}
      <div className="mt-0.5 text-xs text-slate-500">
        {order.client_name}
      </div>

      {/* Fecha + Método de entrega */}
      <div className="mt-2 flex flex-wrap justify-between items-center gap-2">
        {order.due_date && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ring-1 ${dueClass}`}
            title={`Fecha: ${order.due_date}`}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Entrega en: {remainingLabel}</span>
            </span>
        )}
        {order.due_date && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs`}
            title={`Fecha: ${order.due_date}`}
          ><DeliveryIcon
              className="h-3.5 w-3.5"
              title={methodLabel}
              aria-label={methodLabel}
            />
            
          </span>
        )}
      </div>

      {/* Descripción */}
      {order.description && (
        <p className="mt-2 line-clamp-2 text-xs text-slate-600">
          <strong>Nota:</strong> {order.description}
        </p>
      )}
    </article>
  );
});

export default KanbanCard;
