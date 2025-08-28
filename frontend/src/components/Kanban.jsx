const BACKEND_STATUS = {
  recibido: "recibido",
  en_proceso: "en proceso",
  listo: "listo",
  entregado: "entregado",
  cancelado: "cancelado",
};
// frontend/src/components/Kanban.jsx
import React, { useState, useEffect } from "react";
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
  closestCorners,
  useDroppable,
} from "@dnd-kit/core";
import Column from "./Column";
import KanbanDragOverlay from "./KanbanDragOverlay";
import { normalizeStatus, toId, groupOrdersByStatus } from "./kanbanHelpers";
import { useKanbanDnD } from "./useKanbanDnD";

const COLUMNS = [
  { key: "recibido",   title: "Recibido" },
  { key: "en_proceso", title: "En Proceso" },
  { key: "listo",      title: "Listo" },
  { key: "entregado",  title: "Entregado" },
  { key: "cancelado",  title: "Cancelado" },
];

export default function Kanban({ orders = [], onChangeStatus, onEditOrder, onDelete }) {
  const getOrderById = (id) => orders.find((o) => toId(o.code) === toId(id));
  const [columns, setColumns] = useState(() =>
    Object.fromEntries(COLUMNS.map((c) => [c.key, []]))
  );
  useEffect(() => {
    setColumns(groupOrdersByStatus(orders, COLUMNS));
  }, [orders]);

  // Hook personalizado para drag & drop
  const {
    sensors,
    activeId,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    collisionDetection,
  } = useKanbanDnD(columns, setColumns, getOrderById, onChangeStatus, BACKEND_STATUS);

  const activeOrder = orders.find((o) => toId(o.code) === toId(activeId)) || null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid gap-3 p-3 [grid-template-columns:repeat(auto-fill,minmax(300px,1fr))]">
        {COLUMNS.map((col) => (
          <Column
            key={col.key}
            col={col}
            itemIds={columns[col.key] || []}
            getOrderById={getOrderById}
            onEdit={onEditOrder}
            onDelete={onDelete}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        <KanbanDragOverlay activeOrder={activeOrder} />
      </DragOverlay>
    </DndContext>
  );
}


