// frontend/src/components/KanbanCard.jsx
import React from "react";
import { isOverdue, isSoon, isThisWeek, parseLocalDateISO, humanDueLabel} from "./kanbanUtils";
import { Calendar, Truck, Store, Pencil, GripVertical, Trash, Eye } from "lucide-react";
import { useConfirmDialog } from "./ConfirmDialog";

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
  const { showConfirm } = useConfirmDialog();
  
  // --- Cálculos (dentro del componente) ---
  const due = order?.due_date || null;
  const isDelivered = order?.status === "entregado";
  const isReady = order?.status === "listo";
  const isCompleted = order?.status === "entregado" || order?.status === "cancelado";
  const dueClass = isDelivered
    ? "bg-green-100 text-green-800 ring-green-200"
    : isReady
    ? "bg-blue-100 text-blue-800 ring-blue-200"
    : (isOverdue(due) && !isCompleted)
    ? "bg-rose-100 text-rose-800 ring-rose-200"
    : isSoon(due) && !isCompleted
    ? "bg-amber-100 text-amber-800 ring-amber-200"
    : isThisWeek(due) && !isCompleted
    ? "bg-blue-100 text-blue-800 ring-blue-200"
    : "bg-slate-100 text-slate-700 ring-slate-200";

  const deliveredDate = order?.delivered_date || null;
  let remainingLabel;
  if (isDelivered && deliveredDate) {
    remainingLabel = parseLocalDateISO(deliveredDate)?.toLocaleDateString('es-CL', { year: 'numeric', month: 'short', day: 'numeric' }) || "Entregado";
  } else if (isDelivered) {
    remainingLabel = "Entregado";
  } else if (order?.status === "cancelado") {
    remainingLabel = "Cancelado";
  } else if (isReady) {
    // Mostrar la fecha en que el pedido pasó a 'listo'
    const readyDate = order?.ready_date || new Date().toISOString().slice(0,10);
    remainingLabel = `Listo desde: ${parseLocalDateISO(readyDate)?.toLocaleDateString('es-CL', { year: 'numeric', month: 'short', day: 'numeric' })}`;
  } else {
    remainingLabel = humanDueLabel(due);
  }
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
          onClick={async (e) => {
            e.stopPropagation();
            const confirmed = await showConfirm({
              title: "Confirmar eliminación",
              message: `¿Seguro que quieres eliminar el pedido ${order.code}?`,
              type: "danger"
            });
            if (confirmed) {
              onDelete?.(order);
            }
          }}
          onKeyDown={async (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              const confirmed = await showConfirm({
                title: "Confirmar eliminación",
                message: `¿Seguro que quieres eliminar el pedido ${order.code}?`,
                type: "danger"
              });
              if (confirmed) {
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
          {...listeners}
          {...attributes}
        >
          <GripVertical className="w-4 h-4 text-slate-400" />
        </button>
      </div>
      {/* Badge comprobante: mostrar desde abono_image_url o el primer receipt */}
      {(order.abono_image_url || (order.receipts && order.receipts.length > 0)) && (
        <div className="absolute right-2 bottom-2">
          <button
            type="button"
            title={`Ver comprobante${order.receipts?.length > 1 ? ` (${order.receipts.length} disponibles)` : ''}`}
            aria-label="Ver comprobante"
            onClick={(e) => {
              e.stopPropagation();
              // Usar abono_image_url si existe, sino el primer receipt
              const imageUrl = order.abono_image_url || (order.receipts && order.receipts[0]?.url);
              console.log('👁️ KanbanCard: Abriendo comprobante:', imageUrl);
              if (imageUrl) {
                window.dispatchEvent(new CustomEvent('open-comprobante-preview', { 
                  detail: { url: imageUrl } 
                }));
              }
            }}
            className="inline-block hover:scale-110 transition-transform relative"
          >
            <Eye className="w-5 h-5 text-sky-600 drop-shadow-sm" />
            {/* Badge de múltiples comprobantes */}
            {order.receipts?.length > 1 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">
                {order.receipts.length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Contenido de la card */}
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-slate-800 pr-12">
            <span className="text-xs text-slate-400">({order.code})</span><br />
            {order.title}
          </div>
          <div className="mt-0.5 text-xs text-slate-500">{order.client_name}</div>

          <div className="mt-2 flex flex-wrap items-center gap-2 justify-between mr-8">
            {order.due_date ? (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ring-1 ${dueClass}`}
                title={`Fecha: ${order.due_date}`}
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>
                  {isReady ? remainingLabel : `Entrega: ${remainingLabel}`}
                </span>
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ring-1 ring-slate-200 bg-slate-50 text-slate-500"
                title="Sin fecha de entrega"
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>Entrega: sin fecha</span>
              </span>
            )}

            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ring-1 ring-slate-200 bg-slate-50"
              title={methodLabel}
            >
              <DeliveryIcon className="h-5 w-5" aria-label={methodLabel} />

            </span>
          </div>

          {/* Información financiera */}
                    {(order.total_price > 0 || order.total_paid > 0 || order.pending_amount > 0) && (
            <div className="mt-2 text-xs space-y-1">
              {order.total_price > 0 && (
                <div className="text-gray-600">
                  Total: {parseInt(order.total_price).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}
                </div>
              )}
              {order.total_paid > 0 && (
                <div className="text-green-600 font-medium">
                  Abono: {parseInt(order.total_paid).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}
                </div>
              )}
              {order.pending_amount !== 0 && (
                <div className={`font-medium ${order.pending_amount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  Saldo: {parseInt(order.pending_amount).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}
                </div>
              )}
            </div>
          )}

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





