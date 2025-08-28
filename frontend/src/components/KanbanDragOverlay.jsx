// frontend/src/components/KanbanDragOverlay.jsx
import React from "react";

export default function KanbanDragOverlay({ activeOrder }) {
  if (!activeOrder) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow">
      <div className="text-sm font-semibold text-slate-800">
        {activeOrder.title || activeOrder.client_name} {" "}
        <span className="text-slate-400">({activeOrder.code})</span>
      </div>
      <div className="mt-0.5 text-xs text-slate-500">
        {activeOrder.client_name} · {activeOrder.delivery_method}
      </div>
    </div>
  );
}
