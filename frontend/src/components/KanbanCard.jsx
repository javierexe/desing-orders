// frontend/src/components/KanbanCard.jsx
import React from "react";
import { isOverdue, isSoon, isThisWeek, parseLocalDateISO, humanDueLabel} from "./kanbanUtils";
import { Calendar, Truck, Store, Pencil, GripVertical, Trash } from "lucide-react";

const KanbanCard = React.memo(function KanbanCard({
  order,
  attributes,
  listeners,
  setNodeRef,
  setActivatorNodeRef,
  style,
  onEdit,
  onDelete,
  isDragging, // opcional (si lo pasas desde SortableCard)
}) {
  // --- Cálculos (dentro del componente) ---
  const due = order?.due_date || null;
  const dueClass =
    isOverdue(due)
      ? "bg-rose-100 text-rose-800 ring-rose-200"
      : isSoon(due)
      ? "bg-amber-100 text-amber-800 ring-amber-200"
      : isThisWeek(due)
      ? "bg-blue-100 text-blue-800 ring-blue-200"
      : "bg-slate-100 text-slate-700 ring-slate-200";

  const remainingLabel = humanDueLabel(due);
  const dueDateLocal = parseLocalDateISO(due);

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
          ref={setActivatorNodeRef}
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
              <DeliveryIcon className="h-5 w-5" aria-label={methodLabel} />

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





