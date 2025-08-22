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

const STATUS_STYLES = {
  recibido:         "bg-slate-100 text-slate-700 ring-slate-200",
  en_progreso:      "bg-sky-100 text-sky-800 ring-sky-200",
  en_espera_cliente:"bg-amber-100 text-amber-800 ring-amber-200",
  aprobado:         "bg-indigo-100 text-indigo-800 ring-indigo-200",
  listo:            "bg-emerald-100 text-emerald-800 ring-emerald-200",
  entregado:        "bg-green-100 text-green-800 ring-green-200",
  cancelado:        "bg-rose-100 text-rose-800 ring-rose-200",
};

const STATUS_LABEL = {
  recibido: "Recibido",
  en_progreso: "En progreso",
  en_espera_cliente: "En espera cliente",
  aprobado: "Aprobado",
  listo: "Listo",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

const isOverdue = (iso) => iso && new Date(iso) < new Date();
const isSoon = (iso) => {
  if (!iso) return false;
  const ms = new Date(iso).getTime() - Date.now();
  return ms > 0 && ms <= 48 * 60 * 60 * 1000; // 48h
};

function KanbanCard({ order, listeners, attributes, setNodeRef, style }) {
  const dueClass = isOverdue(order.due_date)
    ? "bg-rose-100 text-rose-800 ring-rose-200"
    : isSoon(order.due_date)
    ? "bg-amber-100 text-amber-800 ring-amber-200"
    : "bg-slate-100 text-slate-700 ring-slate-200";

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

      {/* Chips */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ring-1 ${STATUS_STYLES[order.status] || "bg-slate-100 text-slate-700 ring-slate-200"}`}>
          {STATUS_LABEL[order.status] || order.status}
        </span>

        {order.due_date && (
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ring-1 ${dueClass}`}>
            📅 Vence: {order.due_date}
          </span>
        )}
      </div>

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
  // Agrupa IDs (codes) por estado, sin estado local
  const columnsState = useMemo(() => {
    const grouped = Object.fromEntries(COLUMNS.map(c => [c.key, []]));
    for (const o of orders) {
      if (grouped[o.status]) grouped[o.status].push(o.code);
    }
    return grouped;
  }, [orders]);

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

  // No actualiza estado local, solo visual
  }

  function handleDragEnd(e) {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;
    const overId = over.id;
    const from = findContainerOf(active.id);
    const to = findContainerOf(overId) || overId;
    if (!from || !to) return;

    if (from !== to) {
      // movido a otra columna: avisa al backend
      const moved = getOrderById(active.id);
      if (moved && onChangeStatus) onChangeStatus(moved.code, to);
    }
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

