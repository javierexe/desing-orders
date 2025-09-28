// frontend/src/components/kanbanHelpers.js

export const normalizeStatus = (s = "") => {
  const normalized = s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "") // quita tildes
    .replace(/-/g, "_") // guiones a guion bajo
    .replace(/\s+/g, "_"); // espacios a guion bajo

  // Compatibilidad con valores legacy del backend: mapearlos a las claves de columna actuales
  // Por ejemplo, antes se usaba "en_proceso" (o variantes) y ahora la columna es "produccion"
  const LEGACY_STATUS_MAP = {
    en_proceso: "produccion",
    enproceso: "produccion",
    "en-proceso": "produccion",
  };

  return LEGACY_STATUS_MAP[normalized] || normalized;
};

export const toId = (v) => String(v);

export function findContainerOf(id, state) {
  for (const key of Object.keys(state)) {
    if ((state[key] || []).includes(id)) return key;
  }
  if (state[id]) return id;
  return null;
}

export function groupOrdersByStatus(orders, columns) {
  const grouped = Object.fromEntries(columns.map((c) => [c.key, []]));
  // Agrupar pedidos por columna
  for (const o of orders) {
    const id = toId(o.code);
    const key = normalizeStatus(o.status);
    if (grouped[key]) grouped[key].push(o);
  }
  // Ordenar por fecha de entrega ascendente y devolver solo los IDs
  for (const key of Object.keys(grouped)) {
    grouped[key] = grouped[key]
      .sort((a, b) => {
        // Si no hay fecha, poner al final
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date) - new Date(b.due_date);
      })
      .map((o) => toId(o.code));
  }
  return grouped;
}
