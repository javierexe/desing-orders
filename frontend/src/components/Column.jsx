// frontend/src/components/Column.jsx
import React, { useState, useEffect } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ChevronDown, ChevronRight } from "lucide-react";
import SortableCard from "./SortableCard";
import KanbanCard from "./KanbanCard";
import { isOverdue } from "./kanbanUtils";

export default function Column({ col, itemIds, getOrderById, onEdit, onDelete, debtFilter = 'all', onToggleDebtFilter }) {
  // Estado para colapsar solo la columna de entregados (auto-colapsa si hay más de 8 pedidos)
  const [isCollapsed, setIsCollapsed] = useState(false);
  const isCollapsible = col.key === "entregado";
  
  // useEffect para actualizar el estado collapsed cuando cambien los itemIds
  useEffect(() => {
    if (col.key === "entregado" && itemIds.length > 8) {
      setIsCollapsed(true);
    }
  }, [col.key, itemIds.length]);
  
  const { setNodeRef, isOver } = useDroppable({
    id: col.key,
    data: { columnId: col.key },
  });

  // Calcular pedidos con deuda pendiente (solo para "listo" y "entregado")
  const showDebtCounter = col.key === "listo" || col.key === "entregado";
  const ordersWithDebt = showDebtCounter 
    ? itemIds.filter(id => {
        const order = getOrderById(id);
        return order && order.pending_amount > 0;
      }).length
    : 0;

  // Calcular pedidos con entrega atrasada (para columnas en proceso)
  const showOverdueCounter = ["pre_pedido", "recibido", "diseno", "produccion"].includes(col.key);
  const ordersOverdue = showOverdueCounter
    ? itemIds.filter(id => {
        const order = getOrderById(id);
        return order && order.due_date && isOverdue(order.due_date);
      }).length
    : 0;

  // Filtrar itemIds según el filtro activo
  let filteredItemIds = itemIds;
  
  if (showDebtCounter && debtFilter === 'debt') {
    // Filtro de deuda
    filteredItemIds = itemIds.filter(id => {
      const order = getOrderById(id);
      return order && order.pending_amount > 0;
    });
  } else if (showOverdueCounter && debtFilter === 'overdue') {
    // Filtro de atrasados
    filteredItemIds = itemIds.filter(id => {
      const order = getOrderById(id);
      return order && order.due_date && isOverdue(order.due_date);
    });
  }

  // Si está colapsada, usar un estilo compacto y ancho fijo para apilar
  const collapsedStyle = isCollapsed ? "w-[260px] max-w-xs min-w-[220px]" : "";
  return (
    <div className={["bg-slate-50 rounded-xl border border-slate-200", collapsedStyle].join(" ")}> 
      <header className="px-3 py-2 text-md font-bold text-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isCollapsible && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsCollapsed(!isCollapsed);
              }}
              className="p-1 hover:bg-slate-200 rounded transition-colors cursor-pointer relative z-10"
              title={isCollapsed ? "Expandir columna" : "Colapsar columna"}
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          )}
          <span>{col.title}</span>
        </div>
        <div className="ml-2 mr-1 flex items-center gap-1.5">
          <button
            onClick={() => onToggleDebtFilter?.(col.key, 'all')}
            className="inline-flex items-center justify-center rounded-full text-sm font-semibold px-2 py-0.5 min-w-[1.5rem] transition-all bg-slate-200 text-slate-700 hover:bg-slate-300"
            title={`${debtFilter === 'all' ? 'Mostrando' : 'Mostrar'} todos los pedidos (${itemIds.length})`}
          >
            {itemIds.length}
          </button>
          {showDebtCounter && ordersWithDebt > 0 && (
            <button
              onClick={() => onToggleDebtFilter?.(col.key, 'debt')}
              className={`inline-flex items-center justify-center rounded-full text-xs font-bold px-2 py-0.5 min-w-[1.5rem] transition-all ${
                debtFilter === 'debt'
                  ? 'bg-amber-500 text-white ring-2 ring-amber-300'
                  : 'bg-amber-100 text-amber-800 ring-1 ring-amber-300 hover:bg-amber-200'
              }`}
              title={`${debtFilter === 'debt' ? 'Mostrando' : 'Mostrar solo'} pedido${ordersWithDebt !== 1 ? 's' : ''} con deuda (${ordersWithDebt})`}
            >
              💰 {ordersWithDebt}
            </button>
          )}
          {showOverdueCounter && ordersOverdue > 0 && (
            <button
              onClick={() => onToggleDebtFilter?.(col.key, 'overdue')}
              className={`inline-flex items-center justify-center rounded-full text-xs font-bold px-2 py-0.5 min-w-[1.5rem] transition-all ${
                debtFilter === 'overdue'
                  ? 'bg-rose-500 text-white ring-2 ring-rose-300'
                  : 'bg-rose-100 text-rose-800 ring-1 ring-rose-300 hover:bg-rose-200'
              }`}
              title={`${debtFilter === 'overdue' ? 'Mostrando' : 'Mostrar solo'} pedido${ordersOverdue !== 1 ? 's' : ''} atrasado${ordersOverdue !== 1 ? 's' : ''} (${ordersOverdue})`}
            >
              ⏰ {ordersOverdue}
            </button>
          )}
        </div>
      </header>

      {!isCollapsed && (
        <div
          ref={setNodeRef}
          className="kanban-column overflow-y-auto overscroll-contain touch-pan-y ios-smooth px-2 pb-3 max-h-[calc(100vh-220px)] min-h-12"
          style={isOver ? { background: "rgba(148,163,184,0.12)" } : undefined}
        >
          <SortableContext id={col.key} items={filteredItemIds} strategy={verticalListSortingStrategy}>
            {filteredItemIds.map((id) => {
              const order = getOrderById(id);
              if (!order) return null;
              return (
                <SortableCard
                  key={id}
                  id={id}
                  order={order}
                  onEdit={onEdit}
                  render={({ order, attributes, listeners, setNodeRef, setActivatorNodeRef, style, onEdit }) => (
                    <KanbanCard
                      order={order}
                      attributes={attributes}
                      listeners={listeners}
                      setNodeRef={setNodeRef}
                      setActivatorNodeRef={setActivatorNodeRef}
                      style={style}
                      onEdit={onEdit}
                      onDelete={onDelete}
                    />
                  )}
                />
              );
            })}
          </SortableContext>
        </div>
      )}
      
      {isCollapsed && (
        <div
          ref={setNodeRef}
          className="px-3 py-4 text-sm text-slate-500 min-h-16 flex flex-col items-center gap-2 border-2 border-dashed border-slate-300 rounded-lg mx-2 mb-3"
          style={isOver ? { 
            background: "rgba(148,163,184,0.12)", 
            borderColor: "rgba(148,163,184,0.5)" 
          } : undefined}
        >
          <div className="text-center">
            <div className="font-medium">Columna colapsada</div>
            <div className="text-xs">
              {debtFilter === 'debt' 
                ? `${filteredItemIds.length} pedido${filteredItemIds.length !== 1 ? 's' : ''} con deuda`
                : `${itemIds.length} pedidos entregados`
              }
            </div>
            <div className="text-xs">haz click en <strong>&gt;</strong> para expandir</div>
          </div>
          {isOver && (
            <div className="text-xs text-slate-600 font-medium">
              Soltar aquí para entregar
            </div>
          )}
        </div>
      )}
    </div>
  );
}
