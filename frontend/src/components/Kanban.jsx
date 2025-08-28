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
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import Column from "./Column";
import KanbanDragOverlay from "./KanbanDragOverlay";
import { normalizeStatus, toId, findContainerOf, groupOrdersByStatus } from "./kanbanHelpers";

const COLUMNS = [
  { key: "recibido",   title: "Recibido" },
  { key: "en_proceso", title: "En Proceso" },
  { key: "listo",      title: "Listo" },
  { key: "entregado",  title: "Entregado" },
  { key: "cancelado",  title: "Cancelado" },
];

const BACKEND_STATUS = {
  recibido: "recibido",
  en_proceso: "en proceso",
  listo: "listo",
  entregado: "entregado",
  cancelado: "cancelado",
};



export default function Kanban({ orders = [], onChangeStatus, onEditOrder, onDelete }) {
  const getOrderById = (id) => orders.find((o) => toId(o.code) === toId(id));

  // Estado por columnas
  const [columns, setColumns] = useState(() =>
    Object.fromEntries(COLUMNS.map((c) => [c.key, []]))
  );

  // Sincroniza con pedidos del backend
  useEffect(() => {
    setColumns(groupOrdersByStatus(orders, COLUMNS));
  }, [orders]);

  // Sensores
  const mouseSensor = useSensor(MouseSensor, { activationConstraint: { distance: 6 } });
  const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } });
  const sensors = useSensors(mouseSensor, touchSensor);

  // Overlay
  const [activeId, setActiveId] = useState(null);
  const activeOrder = orders.find((o) => toId(o.code) === toId(activeId)) || null;


  function handleDragStart(e) {
    setActiveId(e.active.id);
  }

  function handleDragOver(e) {
    const { active, over } = e;
    if (!over) return;
    const aId = toId(active.id);
    const oId = toId(over.id);

    setColumns((prev) => {
      const from = findContainerOf(aId, prev);
      const to = findContainerOf(oId, prev) || oId;
      if (!from || !to || from === to) return prev;

      const next = JSON.parse(JSON.stringify(prev)); // copia segura

      next[from] = (next[from] || []).filter((x) => x !== aId);

      const overItems = next[to] || [];
      const overIndex = overItems.indexOf(oId);
      const insertAt = overIndex >= 0 ? overIndex : overItems.length;

      if (!overItems.includes(aId)) overItems.splice(insertAt, 0, aId);
      next[to] = overItems;

      return next;
    });
  }

  function handleDragEnd(e) {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;

    const aId = toId(active.id);
    const oId = toId(over.id);

    const from = findContainerOf(aId, columns);
    const to = findContainerOf(oId, columns) || oId;
    if (!from || !to) return;

    if (from !== to) {
      const moved = getOrderById(aId);
      if (moved && onChangeStatus) {
        onChangeStatus(moved.code, BACKEND_STATUS[to] || to);
      }
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
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
            onEdit={onEditOrder}  // abre modal en el padre
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


