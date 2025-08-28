// frontend/src/components/Column.jsx
import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import SortableCard from "./SortableCard";
import KanbanCard from "./KanbanCard";

export default function Column({ col, itemIds, getOrderById, onEdit, onDelete }) {
  const { setNodeRef, isOver } = useDroppable({
    id: col.key,
    data: { columnId: col.key },
  });

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200">
      <header className="px-3 py-2 text-md font-bold text-slate-700 flex items-center justify-between">
        <span>{col.title}</span>
        <span className="ml-2 mr-1 inline-flex items-center justify-center rounded-full bg-slate-200 text-slate-700 text-sm font-semibold px-2 py-0.5 min-w-[1.5rem]">
          {itemIds.length}
        </span>
      </header>

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
    </div>
  );
}
