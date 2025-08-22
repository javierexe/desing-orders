// frontend/src/components/kanbanUtils.js

// Etiquetas visibles en la UI
export const STATUS_LABEL = {
  recibido: "Recibido",
  en_proceso: "En proceso",
  en_espera_cliente: "En espera cliente",
  aprobado: "Aprobado",
  listo: "Listo",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

// Estilos Tailwind para cada estado
export const STATUS_STYLES = {
  recibido: "bg-slate-100 text-slate-700 ring-slate-200",
  en_proceso: "bg-sky-100 text-sky-800 ring-sky-200",
  en_espera_cliente: "bg-amber-100 text-amber-800 ring-amber-200",
  aprobado: "bg-indigo-100 text-indigo-800 ring-indigo-200",
  listo: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  entregado: "bg-green-100 text-green-800 ring-green-200",
  cancelado: "bg-rose-100 text-rose-800 ring-rose-200",
};

// Helpers para fechas de entrega
export function isOverdue(d) {
  if (!d) return false;
  const due = new Date(d);
  const today = new Date();
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return due < today;
}

export function isSoon(d, days = 3) {
  if (!d) return false;
  const due = new Date(d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const soon = new Date(today);
  soon.setDate(soon.getDate() + days);
  return due >= today && due <= soon;
}
