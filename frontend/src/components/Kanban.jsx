// frontend/src/components/Kanban.jsx
import React, { useMemo, useState, useEffect } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable,
  rectIntersection,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const COLUMNS = [
  { key: "recibido", title: "Recibido" },
  { key: "en_progreso", title: "En Progreso" },
  { key: "listo", title: "Listo" },
  { key: "entregado", title: "Entregado" },
];

function KanbanCard({ order, listeners, attributes, setNodeRef, style }) {
  return (
    <article
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={style}
      className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
    >
      <div className="text-sm font-semibold text-slate-800">
        {order.title} <span className="text-slate-400">({order.code})</span>
      </div>
      <div className="mt-0.5 text-xs text-slate-500">
        {order.client_name} · {order.delivery_method}
      </div>
      {order.due_date && (
        <div className="mt-1 text-xs">📅 Vence: {order.due_date}</div>
      )}
      {order.description && (
        <p className="mt-2 line-clamp-2 text-sm text-slate-600">{order.description}</p>
      )}
    </article>
  );
}

function SortableCard({ order, id }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });
  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };
  return (
    <KanbanCard
      order={order}
      attributes={attributes}
      listeners={listeners}
      setNodeRef={setNodeRef}
      style={style}
    />
  );
}

// Columna droppable (sin estilos ni highlight)
function DroppableColumn({ id, children }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <section ref={setNodeRef} id={id} className="rounded-2xl border border-slate-200 bg-white">
      {children}
    </section>
  );
}

export default function Kanban({ orders = [], onChangeStatus }) {
  // Agrupa IDs (codes) por estado
  const initialColumns = useMemo(() => {
    const grouped = Object.fromEntries(COLUMNS.map(c => [c.key, []]));
    for (const o of orders) {
      if (grouped[o.status]) grouped[o.status].push(o.code);
    }
    return grouped;
  }, [orders]);

  const [columnsState, setColumnsState] = useState(initialColumns);
  useEffect(() => setColumnsState(initialColumns), [initialColumns]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const [activeId, setActiveId] = useState(null);
  const activeOrder = orders.find(o => o.code === activeId) || null;

  const getOrderById = (id) => orders.find(o => o.code === id);

  const findContainerOf = (id) => {
    for (const key of Object.keys(columnsState)) {
      if (columnsState[key].includes(id)) return key;
    }
    if (columnsState[id]) return id; // si es directamente la columna
    return null;
  };

  function handleDragStart(e) {
    setActiveId(e.active.id);
  }

  function handleDragOver(e) {
    const { active, over } = e;
    if (!over) return;
    const overId = over.id;
    const from = findContainerOf(active.id);
    const to = findContainerOf(overId) || overId; // si es columna, úsala

    if (!from || !to || from === to) return;

    setColumnsState(prev => {
      const next = structuredClone(prev);
      // saca del origen
      next[from] = next[from].filter(id => id !== active.id);
      // inserta en destino (si over es card, antes; si es columna, al final)
      const overItems = next[to];
      const overIndex = overItems.indexOf(overId);
      const insertIndex = overIndex >= 0 ? overIndex : overItems.length;
      overItems.splice(insertIndex, 0, active.id);
      return next;
    });
  }

  function handleDragEnd(e) {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;
    const overId = over.id;
    const from = findContainerOf(active.id);
    const to = findContainerOf(overId) || overId;
    if (!from || !to) return;

    if (from === to) {
      // reorden dentro de la misma columna
      setColumnsState(prev => {
        const next = structuredClone(prev);
        const oldIndex = next[from].indexOf(active.id);
        const newIndex = next[to].indexOf(overId);
        next[to] = arrayMove(next[to], oldIndex, newIndex < 0 ? next[to].length - 1 : newIndex);
        return next;
      });
      return;
    }

    // movido a otra columna: avisa al backend
    const moved = getOrderById(active.id);
    if (moved && onChangeStatus) onChangeStatus(moved.code, to);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map(col => {
          const items = columnsState[col.key] || [];
          return (
            <DroppableColumn key={col.key} id={col.key}>
              <header className="flex items-center justify-between px-4 py-3">
                <h3 className="text-sm font-semibold text-slate-700">{col.title}</h3>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  {items.length}
                </span>
              </header>

              <div className="min-h-[240px] space-y-3 border-t border-slate-100 p-3">
                <SortableContext items={items} strategy={verticalListSortingStrategy}>
                  {items.map(id => {
                    const order = getOrderById(id);
                    return order ? <SortableCard key={id} id={id} order={order} /> : null;
                  })}
                </SortableContext>

                {items.length === 0 && (
                  <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
                    Columna vacía.
                  </div>
                )}
              </div>
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

