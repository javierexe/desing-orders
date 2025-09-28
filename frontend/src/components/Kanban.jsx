const BACKEND_STATUS = {
  pre_pedido: "pre-pedido",
  recibido: "recibido",
  diseno: "diseño",
  produccion: "producción",
  listo: "listo",
  entregado: "entregado",
  cancelado: "cancelado",
};
// frontend/src/components/Kanban.jsx
import React, { useState, useEffect } from "react";
import LogoSpinner from "./LogoSpinner";
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
  { key: "pre_pedido",   title: "Pre-pedido" },
  { key: "recibido",     title: "Recibidos" },
  { key: "diseno",       title: "Diseño" },
  { key: "produccion",   title: "Producción" },
  { key: "listo",        title: "Listos" },
  { key: "entregado",    title: "Entregados" },
  { key: "cancelado",    title: "Cancelados" },
];

export default function Kanban({ orders = [], loading = false, onChangeStatus, onEditOrder, onDelete }) {
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

  // Detectar columnas colapsadas
  // Detectar columna colapsada 'entregado' y columna 'cancelado'
  const entregadoCol = COLUMNS.find(col => col.key === "entregado");
  const canceladoCol = COLUMNS.find(col => col.key === "cancelado");
  const otherCols = COLUMNS.filter(col => col.key !== "entregado" && col.key !== "cancelado");

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid gap-3 p-3 [grid-template-columns:repeat(auto-fill,minmax(300px,1fr))]">
        {loading ? (
          <div className="col-span-full flex flex-col items-center justify-center min-h-[40vh] gap-3">
            <LogoSpinner size={96} color="#e10600" text="Cargando pedidos..." />
          </div>
        ) : (
          <>
            {/* Render columnas normales (recibido, en_proceso, listo) */}
            {otherCols.map((col) => (
              <Column
                key={col.key}
                col={col}
                itemIds={columns[col.key] || []}
                getOrderById={getOrderById}
                onEdit={onEditOrder}
                onDelete={onDelete}
              />
            ))}
            {/* Render columna Cancelados + apilada Entregados debajo */}
            <div className="flex flex-col gap-3 min-w-[260px] max-w-xs">
              <Column
                key={canceladoCol.key}
                col={canceladoCol}
                itemIds={columns[canceladoCol.key] || []}
                getOrderById={getOrderById}
                onEdit={onEditOrder}
                onDelete={onDelete}
              />
              <Column
                key={entregadoCol.key}
                col={entregadoCol}
                itemIds={columns[entregadoCol.key] || []}
                getOrderById={getOrderById}
                onEdit={onEditOrder}
                onDelete={onDelete}
              />
            </div>
          </>
        )}
      </div>
      <DragOverlay dropAnimation={null}>
        <KanbanDragOverlay activeOrder={activeOrder} />
      </DragOverlay>
    </DndContext>
  );
}


