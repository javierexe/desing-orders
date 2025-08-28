// frontend/src/components/SortableCard.jsx
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function SortableCard({ id, order, onEdit, render }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition } = useSortable({ id });

  const style = { transform: CSS.Transform.toString(transform), transition };

  if (typeof render === "function") {
    return render({ order, attributes, listeners, setNodeRef, setActivatorNodeRef, style, onEdit });
  }

  // Fallback mínimo (sin listeners en la tarjeta completa)
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-lg border border-slate-200 bg-white p-3 shadow">
      {order?.title || `#${id}`}
    </div>
  );
}
export default SortableCard;






