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
import SortableCard from "./SortableCard";
import KanbanCard from "./KanbanCard";
import NewOrderModal from "./NewOrderModal";

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

const normalizeStatus = (s = "") =>
  s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/\s+/g, "_");

// Componente de columna (maneja useDroppable)
function Column({ col, itemIds, getOrderById, onEdit }) {
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
        className="kanban-column overflow-y-auto overscroll-contain touch-pan-y ios-smooth px-2 pb-3 max-h=[calc(100vh-220px)] min-h-12"
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
                render={({ order, attributes, listeners, setNodeRef, style, onEdit }) => (
                  <KanbanCard
                    order={order}
                    attributes={attributes}
                    listeners={listeners}
                    setNodeRef={setNodeRef}
                    style={style}
                    onEdit={onEdit}
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

export default function Kanban({ orders = [], onChangeStatus }) {
  const toId = (v) => String(v);
  const getOrderById = (id) => orders.find((o) => toId(o.code) === toId(id));

  // Estado por columnas
  const [columns, setColumns] = useState(() =>
    Object.fromEntries(COLUMNS.map((c) => [c.key, []]))
  );

  // Sincroniza con pedidos del backend
  useEffect(() => {
    const grouped = Object.fromEntries(COLUMNS.map((c) => [c.key, []]));
    for (const o of orders) {
      const id = toId(o.code);
      const key = normalizeStatus(o.status);
      if (grouped[key]) grouped[key].push(id);
    }
    setColumns(grouped);
  }, [orders]);

  // Sensores
  const mouseSensor = useSensor(MouseSensor, { activationConstraint: { distance: 6 } });
  const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } });
  const sensors = useSensors(mouseSensor, touchSensor);

  // Modal
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const handleEdit = (order) => { setSelectedOrder(order); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setSelectedOrder(null); };

  // Overlay
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
            onEdit={handleEdit}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeOrder ? (
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow">
            <div className="text-sm font-semibold text-slate-800">
              {activeOrder.title || activeOrder.client_name}{" "}
              <span className="text-slate-400">({activeOrder.code})</span>
            </div>
            <div className="mt-0.5 text-xs text-slate-500">
              {activeOrder.client_name} · {activeOrder.delivery_method}
            </div>
          </div>
        ) : null}
      </DragOverlay>

      <NewOrderModal
        open={modalOpen}
        onClose={closeModal}
        editMode={true}
        order={selectedOrder}
        onCreated={closeModal}
        onNotify={(msg, type) => console.log(`[${type}]`, msg)}
      />
    </DndContext>
  );
}

