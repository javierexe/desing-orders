// frontend/src/components/useKanbanDnD.js
import { useState } from "react";
import {
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { findContainerOf } from "./kanbanHelpers";

export function useKanbanDnD(columns, setColumns, getOrderById, onChangeStatus, backendStatus) {
  const mouseSensor = useSensor(MouseSensor, { activationConstraint: { distance: 6 } });
  const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } });
  const sensors = useSensors(mouseSensor, touchSensor);

  const [activeId, setActiveId] = useState(null);

  function handleDragStart(e) {
    setActiveId(e.active.id);
  }

  function handleDragOver(e) {
    const { active, over } = e;
    if (!over) return;
    const aId = String(active.id);
    const oId = String(over.id);

    setColumns((prev) => {
      const from = findContainerOf(aId, prev);
      const to = findContainerOf(oId, prev) || oId;
      if (!from || !to || from === to) return prev;

      const next = JSON.parse(JSON.stringify(prev));
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
    const aId = String(active.id);
    const oId = String(over.id);
    const from = findContainerOf(aId, columns);
    const to = findContainerOf(oId, columns) || oId;
    if (!from || !to) return;
    if (from !== to) {
      const moved = getOrderById(aId);
      if (moved && onChangeStatus) {
        onChangeStatus(moved.code, backendStatus[to] || to);
      }
    }
  }

  return {
    sensors,
    activeId,
    setActiveId,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    collisionDetection: closestCorners,
  };
}
