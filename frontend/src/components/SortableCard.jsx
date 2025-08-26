// frontend/src/components/SortableCard.jsx
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import KanbanCard from "./KanbanCard";

function SortableCard({ id, order, onEdit, render }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Delegamos la UI al render prop (ej: KanbanCard)
  if (typeof render === "function") {
    return render({ order, attributes, listeners, setNodeRef, style, onEdit });
  }

  // Fallback mínimo
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="w-full rounded-lg border border-slate-200 bg-white p-3 shadow cursor-move"
    >
      <div className="text-sm font-semibold text-slate-800">
        {order.title} <span className="text-slate-400">({order.code})</span>
      </div>
    </div>
  );
}

export default SortableCard;





