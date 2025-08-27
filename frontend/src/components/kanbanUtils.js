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

// ====== Helpers de fecha ======

// Parsea "YYYY-MM-DD" (o "YYYY-MM-DDTHH:mm...") → [y, m, d] numéricos
function parseYMD(iso) {
  if (!iso) return null;
  const datePart = String(iso).split("T")[0];
  const [y, m, d] = datePart.split("-").map(Number);
  if (!y || !m || !d) return null;
  return [y, m, d];
}

// Día civil absoluto (días desde 1970-01-01) sin usar zonas horarias.
// Algoritmo estándar (Howard Hinnant) para calendario gregoriano proleptico.
function civilDayNumber(y, m, d) {
  const adj = m <= 2 ? 1 : 0;
  const y2 = y - adj;
  const m2 = m + 12 * adj - 3; // Mar=0,...,Ene=10,Feb=11
  const era = Math.floor(y2 / 400);
  const yoe = y2 - era * 400;                         // year of era
  const doy = Math.floor((153 * m2 + 2) / 5) + d - 1; // day of year
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy; // day of era
  return era * 146097 + doe - 719468; // 719468 = days to 1970-01-01
}

// Diferencia en días de calendario entre 'iso' y HOY (>=0 futuro, <0 pasado)
export function daysFromToday(iso) {
  const ymd = parseYMD(iso);
  if (!ymd) return null;

  const now = new Date(); // solo para obtener hoy local
  const ty = now.getFullYear();
  const tm = now.getMonth() + 1; // 1-12
  const td = now.getDate();

  const dueN = civilDayNumber(ymd[0], ymd[1], ymd[2]);
  const todayN = civilDayNumber(ty, tm, td);
  return dueN - todayN;
}

// Atajos útiles
export function isOverdue(iso) {
  const n = daysFromToday(iso);
  return n !== null && n < 0;
}

export function isSoon(iso, days = 3) {
  const n = daysFromToday(iso);
  return n !== null && n >= 0 && n <= days;
}

export function isThisWeek(iso) {
  const n = daysFromToday(iso);
  if (n === null) return false;
  return n > 0 && n <= 7 && !isSoon(iso);
}

export function humanDueLabel(iso) {
  const n = daysFromToday(iso);
  if (n === null) return "";
  if (n === -1) return `ayer`;
  if (n === 0) return "hoy";
  if (n === 1) return "mañana";
  if (n === 2) return "pasado mañana";
    if (n < 0) return `atrasada ${Math.abs(n)} días`;
  return `en ${n} días`;
}

// (opcional) si en algún lugar quieres un Date local SOLO para mostrar:
export function parseLocalDateISO(iso) {
  const ymd = parseYMD(iso);
  if (!ymd) return null;
  const [y, m, d] = ymd;
  return new Date(y, m - 1, d); // 00:00 local (NO usar para diferencias)
}






