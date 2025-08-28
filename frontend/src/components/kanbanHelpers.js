// frontend/src/components/kanbanHelpers.js

export const normalizeStatus = (s = "") =>
  s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/\s+/g, "_");

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
  for (const o of orders) {
    const id = toId(o.code);
    const key = normalizeStatus(o.status);
    if (grouped[key]) grouped[key].push(id);
  }
  return grouped;
}
