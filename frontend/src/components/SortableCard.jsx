// frontend/src/components/SortableCard.jsx
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function SortableCard({ id, order, onEdit, render }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
    if (process.env.NODE_ENV !== "production") {
      console.log("listeners keys", id, listeners && Object.keys(listeners));
    }


  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (typeof render === "function") {
    return render({ order, attributes, listeners, setNodeRef, style, onEdit });
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






