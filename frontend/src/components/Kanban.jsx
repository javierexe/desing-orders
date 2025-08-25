// frontend/src/components/Kanban.jsx
import React, { useState, useEffect } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable,
  closestCorners,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import SortableCard from "./SortableCard";
import KanbanCard from "./KanbanCard";

const COLUMNS = [
  { key: "recibido",     title: "Recibido" },
  { key: "en_proceso",   title: "En Proceso" },
  { key: "listo",        title: "Listo" },
  { key: "entregado",    title: "Entregado" },
  { key: "cancelado",    title: "Cancelado" },
];

// Mapa si el backend espera otros textos
const BACKEND_STATUS = {
  recibido: "recibido",
  en_proceso: "en proceso",
  listo: "listo",
  entregado: "entregado",
  cancelado: "cancelado",
};

// Normaliza estados del backend -> claves de COLUMNS
const normalizeStatus = (s = "") =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, "_");

// Columna: el droppable ahora vive en el contenedor de LISTA
function DroppableColumn({ id, header, children }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <section id={id} className="rounded-2xl border border-slate-200 bg-white">
      {header}
      <div
        ref={setNodeRef} // <— droppable en el área real de drop
        className="min-h-[240px] space-y-3 border-t border-slate-100 p-3"
      >
        {children}
      </div>
    </section>
  );
}

export default function Kanban({ orders = [], onChangeStatus, onEditOrder }) {
  const toId = (v) => String(v);
  const getOrderById = (id) => orders.find((o) => toId(o.code) === toId(id));

  // Estado local para feedback visual
  const [columns, setColumns] = useState(() =>
    Object.fromEntries(COLUMNS.map((c) => [c.key, []]))
  );

  // Sincroniza con orders
  useEffect(() => {
    const grouped = Object.fromEntries(COLUMNS.map((c) => [c.key, []]));
    for (const o of orders) {
      const id = toId(o.code);
      const key = normalizeStatus(o.status);
      if (grouped[key]) grouped[key].push(id);
    }
    setColumns(grouped);
  }, [orders]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 2 } })
  );

  const [activeId, setActiveId] = useState(null);
  const activeOrder = orders.find((o) => toId(o.code) === toId(activeId)) || null;

  const findContainerOf = (id, state) => {
    for (const key of Object.keys(state)) {
      if ((state[key] || []).includes(id)) return key;
    }
    if (state[id]) return id;
    return null;
  };

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

      const next = structuredClone(prev);
      if (!next[to]) return prev; // defensa: destino inválido

      // quitar del origen
      next[from] = (next[from] || []).filter((x) => x !== aId);

      // insertar en destino, respetando posición si cae sobre item
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
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {COLUMNS.map((col) => {
          const items = columns[col.key] || [];

          // No mutar en render
          const sortedItems = [...items].sort((a, b) => {
            const da = new Date(getOrderById(a)?.due_date || 0);
            const db = new Date(getOrderById(b)?.due_date || 0);
            return da - db;
          });

          return (
            <DroppableColumn
              key={col.key}
              id={col.key}
              header={
                <header className="flex items-center justify-between px-4 py-3">
                  <h3 className="text-sm font-semibold text-slate-700">{col.title}</h3>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                    {sortedItems.length}
                  </span>
                </header>
              }
            >
              <SortableContext items={sortedItems} strategy={verticalListSortingStrategy}>
                {sortedItems.map((id) => {
                  const order = getOrderById(id);
                  return order ? (
                    <SortableCard
                      key={id}
                      id={id}
                      order={order}
                      onEdit={onEditOrder}
                      render={({ order, attributes, listeners, setNodeRef, style }) => (
                        <KanbanCard
                          order={order}
                          attributes={attributes}
                          listeners={listeners}
                          setNodeRef={setNodeRef}
                          // Mejoras desktop: evita selección/drag nativo del navegador
                          style={{
                            ...style,
                            touchAction: "none",
                            userSelect: "none",
                            WebkitUserSelect: "none",
                            WebkitUserDrag: "none",
                            cursor: "grab",
                          }}
                          onEdit={onEditOrder}
                        />
                      )}
                    />
                  ) : null;
                })}
              </SortableContext>

              {sortedItems.length === 0 && (
                <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
                  No hay pedidos en este estado.
                </div>
              )}
            </DroppableColumn>
          );
        })}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeOrder ? (
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow">
            <div className="text-sm font-semibold text-slate-800">
              {activeOrder.title} <span className="text-slate-400">({activeOrder.code})</span>
            </div>
            <div className="mt-0.5 text-xs text-slate-500">
              {activeOrder.client_name} · {activeOrder.delivery_method}
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}