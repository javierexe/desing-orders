// frontend/src/components/KanbanCard.jsx
import React from "react";
import { isOverdue, isSoon, isThisWeek } from "./kanbanUtils";
import { Calendar, Truck, Store, Pencil, GripVertical, Trash } from "lucide-react";

const KanbanCard = React.memo(function KanbanCard({
  order,
  attributes,
  listeners,
  setNodeRef,
  style,
  onEdit,
  onDelete,
  isDragging, // opcional (si lo pasas desde SortableCard)
}) {
  // --- Cálculos (dentro del componente) ---
  const dueClass =
    isOverdue(order?.due_date)
      ? "bg-rose-100 text-rose-800 ring-rose-200"
      : isSoon(order?.due_date)
      ? "bg-amber-100 text-amber-800 ring-amber-200"
      : isThisWeek(order?.due_date)
      ? "bg-blue-100 text-blue-800 ring-blue-200"
      : "bg-slate-100 text-slate-700 ring-slate-200";

  const remainingLabel = (() => {
    if (!order?.due_date) return "";
    const dueDate = new Date(order.due_date);
    if (isNaN(dueDate)) return order.due_date;
    const today = new Date();
    const d0 = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const msDiff = d0 - t0;
    const diffDays = msDiff === 0
      ? 0
      : msDiff > 0
        ? Math.ceil(msDiff / 86400000) + 1
        : Math.floor(msDiff / 86400000) + 1;
    if (diffDays > 1) return `${diffDays} días`;
    if (diffDays === 1) return "1 día";
    if (diffDays === 0) return "Hoy";
    if (diffDays === -1) return "atrasada 1 día";
    return `Atrasada ${Math.abs(diffDays)} días`;
  })();

  const method = String(order?.delivery_method || "retiro").toLowerCase();
  const DeliveryIcon = method === "despacho" ? Truck : Store;
  const methodLabel = method === "despacho" ? "Despacho" : "Retiro";

  return (
    <article
      ref={setNodeRef}
      style={{ ...style, ...(isDragging ? { zIndex: 20 } : null) }}
      className={[
        "relative w-full rounded-xl bg-white p-3 shadow-sm hover:bg-slate-50",
        isDragging
          ? "ring-2 ring-sky-300 border-sky-300 shadow-lg scale-[1.01] cursor-grabbing"
          : "border border-slate-200",
        "transition-[transform,box-shadow] duration-150 will-change-transform",
      ].join(" ")}
      aria-roledescription="Draggable card"
    >
      {/* Controles arriba a la derecha: lápiz + handle */}
      <div className="absolute right-2 top-2 flex items-center gap-1">

        

        {/* Botón Editar */}
        <button
          type="button"
          title="Editar pedido"
          aria-label="Editar pedido"
          onClick={(e) => { e.stopPropagation(); onEdit?.(order); }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              onEdit?.(order);
            }
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow ring-1 ring-slate-200 hover:bg-slate-50"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>

        {/* Botón Eliminar */}
        <button
          type="button"
          title="Eliminar pedido"
          aria-label="Eliminar pedido"
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm("¿Seguro que quieres eliminar este pedido?")) {
              onDelete?.(order);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              if (window.confirm("¿Seguro que quieres eliminar este pedido?")) {
                onDelete?.(order);
              }
            }
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow ring-1 ring-rose-200 hover:bg-rose-50 text-rose-700"
        >
          <Trash className="h-3.5 w-3.5" />
        </button>

        {/* Handle de arrastre (a la derecha del lápiz) */}
        <button
          type="button"
          aria-label="Arrastrar"
          className="inline-flex h-9 w-9 md:h-8 md:w-8 items-center justify-center rounded-full hover:bg-slate-100 active:bg-slate-200 cursor-grab touch-none"
          {...(listeners || {})}
          {...(attributes || {})}
        >
          <GripVertical className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* Contenido de la card */}
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-slate-800 pr-12">
            <span className="text-xs text-slate-400">({order.code})</span><br />
            {order.title}
          </div>
          <div className="mt-0.5 text-xs text-slate-500">{order.client_name}</div>

          <div className="mt-2 flex flex-wrap items-center gap-2 justify-between mr-8">
            {order.due_date && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ring-1 ${dueClass}`}
                title={`Fecha: ${order.due_date}`}
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>Entrega: {remainingLabel}</span>
              </span>
            )}

            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ring-1 ring-slate-200 bg-slate-50"
              title={methodLabel}
            >
              <DeliveryIcon className="h-4 w-4" aria-label={methodLabel} />

            </span>
          </div>

          {order.description && (
            <p className="mt-2 line-clamp-2 text-xs text-slate-600">
              <strong>Nota:</strong> {order.description}
            </p>
          )}
        </div>
      </div>
    </article>
  );
});

export default KanbanCard;





