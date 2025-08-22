// frontend/src/components/KanbanCard.jsx
import React from "react";
import { STATUS_STYLES, STATUS_LABEL, isOverdue, isSoon } from "./kanbanUtils";

const KanbanCard = React.memo(function KanbanCard({
  order,
  attributes,
  listeners,
  setNodeRef,
  style,
  onEdit,
}) {
  const dueClass = isOverdue(order?.due_date)
    ? "bg-rose-100 text-rose-800 ring-rose-200"
    : isSoon(order?.due_date)
    ? "bg-amber-100 text-amber-800 ring-amber-200"
    : "bg-slate-100 text-slate-700 ring-slate-200";

const remainingLabel = (() => {
    if (!order.due_date) return "";
    const dueDate = new Date(order.due_date);
    if (isNaN(dueDate)) return order.due_date;
    const today = new Date();
    // Normalize to midnight
    const d0 = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const diffDays = Math.round((d0 - t0) / 86400000);

    if (diffDays > 1) return `${diffDays} días`;
    if (diffDays === 1) return "1 día";
    if (diffDays === 0) return "Hoy";
    if (diffDays === -1) return "atrasada 1 día";
    return `Atrasada ${Math.abs(diffDays)} días`;
})();

return (
    <article
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        style={style}
        className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm hover:bg-slate-50 cursor-move"
        onClick={() => onEdit?.(order)}
    >
        <div className="text-sm font-semibold text-slate-800">
            <span className="text-xs text-slate-400">({order.code})</span><br />
            {order.title}
        </div>

        <div className="mt-0.5 text-xs text-slate-500">
            {order.client_name}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
         {order.due_date && (
                <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ring-1 ${dueClass}`}
                    title={`Fecha: ${order.due_date}`}
                >
                    📅 Entrega en: {remainingLabel}
                </span>
            )}
        </div>

        {order.description && (
            <p className="mt-2 line-clamp-2 text-xs text-slate-600">
                <strong>Nota:</strong> {order.description}
            </p>
        )}
    </article>
);
});

export default KanbanCard;

