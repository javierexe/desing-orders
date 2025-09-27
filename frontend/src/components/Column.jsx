// frontend/src/components/Column.jsx
import React, { useState, useEffect } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ChevronDown, ChevronRight } from "lucide-react";
import SortableCard from "./SortableCard";
import KanbanCard from "./KanbanCard";

export default function Column({ col, itemIds, getOrderById, onEdit, onDelete }) {
  // Estado para colapsar solo la columna de entregados (auto-colapsa si hay más de 8 pedidos)
  const [isCollapsed, setIsCollapsed] = useState(col.key === "entregado" && itemIds.length > 8);
  const isCollapsible = col.key === "entregado";
  
  // No necesitamos useEffect que interfiera con el estado del usuario
  
  const { setNodeRef, isOver } = useDroppable({
    id: col.key,
    data: { columnId: col.key },
  });

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200">
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
        <span className="ml-2 mr-1 inline-flex items-center justify-center rounded-full bg-slate-200 text-slate-700 text-sm font-semibold px-2 py-0.5 min-w-[1.5rem]">
          {itemIds.length}
        </span>
      </header>

      {!isCollapsed && (
        <div
          ref={setNodeRef}
          className="kanban-column overflow-y-auto overscroll-contain touch-pan-y ios-smooth px-2 pb-3 max-h-[calc(100vh-220px)] min-h-12"
          style={isOver ? { background: "rgba(148,163,184,0.12)" } : undefined}
        >
          <SortableContext id={col.key} items={itemIds} strategy={verticalListSortingStrategy}>
            {itemIds.map((id) => {
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
            <div className="text-xs">{itemIds.length} pedidos entregados</div>
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
