import { useState, useEffect, useMemo, useRef } from "react";
import { Trash, ExternalLink, Eye } from "lucide-react";
import OrderItemsEditor from "./OrderItemsEditor";
import { buildOrderPayload, HttpError } from "../utils/http";
import { api } from "../lib/api";

// Helpers de fecha (solo fecha, sin hora/TZ)
function todayISO() {
  const t = new Date();
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, "0");
  const d = String(t.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
// Calcula la fecha en N días hábiles (sin contar fines de semana)
function addBusinessDays(startDate, days) {
  let date = new Date(startDate);
  let added = 0;
  while (added < days) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay();
    if (day !== 0 && day !== 6) { // 0=Domingo, 6=Sábado
      added++;
    }
  }
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
function isBeforeTodayISO(iso) {
  return !!iso && iso < todayISO();
}
// Normaliza cualquier valor de fecha a YYYY-MM-DD (o null si no válido)
function normalizeDate(value) {
  if (!value) return null;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date(value);
  if (Number.isNaN(d)) return null;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function NewOrderModal({
  open,
  onClose,
  onCreated,   // callback al guardar (crear)
  onUpdated,   // callback al guardar (editar)
  onNotify,
  order = null,
  editMode = false
}) {
  // Normaliza una URL que venga del backend para que el frontend la solicite vía /api
  function normalizeServerUrl(u) {
    if (!u) return "";
    if (typeof u !== "string") return "";
    if (u.startsWith("http://") || u.startsWith("https://")) return u;
    if (u.startsWith("/api")) return u;
    if (u.startsWith("/")) return `/api${u}`;
    return u;
  }

  // Elimina duplicados por id o url (preserva orden)
  function dedupeReceipts(arr = []) {
    const seen = new Map();
    for (const it of arr) {
      const key = it && (it.id ?? (typeof it === 'string' ? it : it.url));
      if (!key) continue;
      if (!seen.has(key)) seen.set(key, it);
    }
    return Array.from(seen.values());
  }

  // Extrae el nombre de archivo desde una URL (sin query) y lo decodifica
  function getFileNameFromUrl(u) {
    if (!u) return "";
    try {
      let s = u;
      // quitar prefijo /api si existe para mostrar nombre limpio
      if (s.startsWith('/api')) s = s.slice(4);
      // quitar query string
      const qIdx = s.indexOf('?');
      if (qIdx !== -1) s = s.slice(0, qIdx);
      // obtener segmento final
      const parts = s.split('/').filter(Boolean);
      let name = parts.length ? parts[parts.length - 1] : s;
      // decodificar URL (%20 etc.)
      try { name = decodeURIComponent(name); } catch (e) { /* ignore */ }
      return name;
    } catch (e) {
      return "";
    }
  }

  const [form, setForm] = useState({
    client_name: "",
    title: "",
    delivery_method: "retiro",
    due_date: "",
    delivered_date: "",
    description: "",
    status: "pre-pedido",
    // abono_images is an array of objects: { id?, url, filename?, uploaded_at? }
    abono_images: []
  });
  const [items, setItems] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [imgLoadError, setImgLoadError] = useState(false);
  const [deletingAbono, setDeletingAbono] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Guardamos el estado inicial para dirty-check
  const initialFormRef = useRef(form);

  // Normaliza date a yyyy-mm-dd (para precargar el form)
  const normDate = (v) => (v ? String(v).slice(0, 10) : "");

  useEffect(() => {
    if (!open) return;
    if (editMode && order) {
      const next = {
        client_name: order.client_name ?? "",
        title: order.title ?? "",
        delivery_method: order.delivery_method ?? "retiro",
        due_date: normDate(order.due_date),
        delivered_date: normDate(order.delivered_date),
        description: order.description ?? "",
        status: order.status ?? "pre-pedido",
        // abono_images: frontend supports multiple; prefer order.receipts (new API), fallback to order.abono_image_url
        abono_images: editMode && order?.receipts && order.receipts.length
          ? dedupeReceipts(order.receipts.map(r => ({ 
              id: r.id, 
              url: normalizeServerUrl(r.url), 
              filename: r.filename || getFileNameFromUrl(r.url),
              storage_key: r.storage_key,
              uploaded_at: r.uploaded_at 
            })))
          : (order.abono_image_url ? [{ 
              url: normalizeServerUrl(order.abono_image_url), 
              filename: getFileNameFromUrl(order.abono_image_url) 
            }] : []),
      };
      setForm(next);
      initialFormRef.current = next;
      setItems(order.items ?? []);
    } else {
      const blank = {
        client_name: "",
        title: "",
        delivery_method: "retiro",
        due_date: todayISO(),
        delivered_date: "",
        description: "",
        status: "pre-pedido",
        abono_images: [],
      };
      setForm(blank);
      initialFormRef.current = blank;
      setItems([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editMode, order?.code]);

  // Cuando se agregan o cambian ítems, ajustar la fecha compromiso del pedido
  useEffect(() => {
    if (items.length > 0) {
      // Buscar la fecha de entrega más próxima
      const fechas = items.map(i => i.due_date).filter(Boolean);
      if (fechas.length > 0) {
        const menor = fechas.reduce((a, b) => (a < b ? a : b));
        setForm(f => ({ ...f, due_date: menor }));
      }
    }
  }, [items]);

  // Precarga la primera imagen del comprobante para detectar errores de carga
  useEffect(() => {
    const first = (form.abono_images && form.abono_images.length) ? (form.abono_images[0]?.url || form.abono_images[0]) : null;
    if (!first) {
      setImgLoadError(false);
      return;
    }
    const img = new Image();
    img.src = encodeURI(normalizeServerUrl(first));
    img.onload = () => setImgLoadError(false);
    img.onerror = () => setImgLoadError(true);
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [form.abono_images]);

  const displayedFileName = (form.abono_images && form.abono_images.length) ? getFileNameFromUrl(form.abono_images[0]?.url || form.abono_images[0]) : "";

  const isDirty = useMemo(
    () => JSON.stringify({ form, items }) !== JSON.stringify({ form: initialFormRef.current, items: editMode && order ? (order.items ?? []) : [] }),
    [form, items, editMode, order]
  );

  const isValid = Boolean(
    form.client_name?.trim() &&
    form.title?.trim() &&
    form.delivery_method?.trim()
    // si quieres due_date obligatorio: && form.due_date?.trim()
  );

  const isDueInvalid = !!form.due_date && isBeforeTodayISO(form.due_date);

  // Subir uno o varios comprobantes; guarda las URLs en form.abono_images
  async function handleFileChange(e) {
    const files = e.target.files && Array.from(e.target.files);
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      // Subir todos en paralelo
      const uploads = files.map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload-abono-image", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || "Error al subir imagen");
        }
        const data = await res.json();
        // El backend ahora devuelve { url, storage_key, storage_provider }
        const url = data.url && data.url.startsWith("/api") ? data.url : 
                   (data.storage_provider === "supabase" ? data.url : `/api${data.url}`);
        return { url, storage_key: data.storage_key, filename: getFileNameFromUrl(data.url) };
      });

      const results = await Promise.all(uploads);
      // Map results to objects; if in editMode and order.code, persist each as receipt in backend
      if (editMode && order?.code) {
        // persist each to backend
        const persisted = [];
        for (const item of results) {
          try {
            const res = await fetch(`/api/orders/${order.code}/receipts`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ 
                url: item.url, 
                filename: item.filename,
                storage_key: item.storage_key 
              })
            });
            if (res.ok) {
              const data = await res.json();
              persisted.push({ 
                id: data.id, 
                url: data.url, 
                filename: data.filename, 
                storage_key: data.storage_key,
                uploaded_at: data.uploaded_at 
              });
            } else {
              // fallback to local-only
              persisted.push(item);
            }
          } catch (err) {
            console.error('Persisting receipt failed', err);
            persisted.push(item);
          }
        }
        setForm((f) => ({ ...f, abono_images: dedupeReceipts([ ...(f.abono_images || []), ...persisted ]) }));
      } else {
        setForm((f) => ({ ...f, abono_images: dedupeReceipts([ ...(f.abono_images || []), ...results ]) }));
      }
    } catch (err) {
      console.error(err);
      onNotify && onNotify("Error subiendo imagen(es)", "error");
    } finally {
      setUploading(false);
      // limpiar input file (para permitir re-subir el mismo archivo si se desea)
      try { e.target.value = null; } catch (_) { /* ignore */ }
    }
  }

  // Eliminar un comprobante por índice
  async function handleDeleteAbono(index) {
    const current = form.abono_images || [];
    if (index < 0 || index >= current.length) return;
    const target = current[index];
    // Si tiene id y estamos en edición, eliminar en backend
    if (editMode && order?.code && target?.id) {
      setDeletingAbono(true);
      try {
        const res = await fetch(`/api/orders/${order.code}/receipts/${target.id}`, { method: 'DELETE' });
        if (!res.ok) {
          // ignore error but report
          console.error('Error deleting receipt', await res.text());
        } else {
          onNotify?.('Comprobante eliminado', 'success');
          onUpdated?.();
        }
      } catch (err) {
        console.error(err);
      } finally {
        setDeletingAbono(false);
      }
    }
    // Actualizar UI localmente (eliminar el item)
    setForm(f => ({ ...f, abono_images: dedupeReceipts(f.abono_images.filter((_, i) => i !== index)) }));

    // Si estamos en edición y la orden existe, verificar si ya no quedan receipts en el servidor
    // Si no quedan, limpiar el campo legacy abono_image_url para evitar que reaparezca al reabrir el modal
    if (editMode && order?.code) {
      try {
        const listRes = await fetch(`/api/orders/${order.code}/receipts`);
        if (listRes.ok) {
          const list = await listRes.json();
          if (!list || list.length === 0) {
            // Limpiar abono_image_url en el pedido (en backend se normaliza "" a None)
            try {
              await api.updateOrder(order.code, { abono_image_url: "" });
              // opcional: notificar y refrescar
              onNotify?.('Comprobante principal limpiado', 'info');
              onUpdated?.();
            } catch (err) {
              console.error('Error clearing legacy abono_image_url', err);
            }
          }
        }
      } catch (err) {
        console.error('Error checking receipts after delete', err);
      }
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isValid || (editMode && !isDirty) || loading) return;

    // Validación: no permitir fechas anteriores a hoy
    if (isDueInvalid) {
      const msg = "La fecha de compromiso no puede ser anterior a hoy.";
      setError(msg);
      onNotify?.(msg, "warning");
      return;
    }

    setLoading(true);
    setError("");

    // Normaliza el status para que siempre sea el esperado
    function normalizeStatus(s = "") {
      return s.replace(/\s+/g, "_").toLowerCase();
    }
    // Construimos payload y aseguramos due_date normalizado
    const base = buildOrderPayload(form);
    const dueISO = normalizeDate(form.due_date);
    const payload = {
      ...base,
      ...(dueISO ? { due_date: dueISO } : {}),
      status: normalizeStatus(form.status || "pre-pedido"),
  // Compatibilidad backend: enviar el primer comprobante (si existe) como abono_image_url (string URL)
  abono_image_url: (form.abono_images && form.abono_images.length) ? (form.abono_images[0]?.url || form.abono_images[0]) : undefined,
      items: items.map(item => ({
        description: item.description,
        due_date: normalizeDate(item.due_date),
        quantity: Number(item.quantity) || 1,
        price: Number(item.price) || 0,
        paid_amount: Number(item.paid_amount) || 0
      }))
    };

    try {
      let saved;
      if (editMode && order) {
        saved = await api.updateOrder(order.code, payload);
        onNotify?.(`Pedido editado correctamente${order?.code ? `: ${order.code}` : ""}`, "success");
        onUpdated?.(saved);
      } else {
        saved = await api.createOrder(payload); // FastAPI devuelve objeto plano: { code, ... }
        // Si hay comprobantes locales (sin id), persistirlos para asociarlos a la nueva orden
        if (form.abono_images && form.abono_images.length) {
          const toPersist = form.abono_images.filter(a => !a.id);
          const persisted = [];
          for (const item of toPersist) {
            try {
              const res = await fetch(`/api/orders/${saved.code}/receipts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: item.url, filename: item.filename })
              });
              if (res.ok) {
                const data = await res.json();
                persisted.push({ id: data.id, url: data.url, filename: data.filename, uploaded_at: data.uploaded_at });
              } else {
                persisted.push(item);
              }
            } catch (err) {
              console.error('Persisting receipt after create failed', err);
              persisted.push(item);
            }
          }
          // Merge persisted receipts into the saved response so caller sees them
          saved.receipts = persisted;
        }
        onNotify?.(`Pedido creado: ${saved.code}`, "success");
        onCreated?.(saved);
      }
      onClose?.();
    } catch (err) {
      let msg = "Error de red";
      let status = null;

      if (err instanceof HttpError) {
        status = err.status;
        msg = err.message || msg;
      } else if (err?.message) {
        msg = err.message;
      }

      console.groupCollapsed("[Orders] Error al guardar");
      console.error("Status:", status);
      console.error("Message:", msg);
      console.error("Payload:", payload);
      console.groupEnd();

      const pretty = status ? `[${status}] ${msg}` : msg;
      setError(pretty);
      onNotify?.(pretty, "error");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        {/* Header estable con badge del código en modo edición */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h3 className="text-lg font-semibold">
            {editMode ? "Editar pedido" : "Nuevo pedido"}
          </h3>
          {editMode && order?.code && (
            <span className="inline-flex items-center rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-sm font-mono text-slate-700">
              {order.code}
            </span>
          )}
        </div>

  <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* 1a fila */}
          <label className="text-sm">
            Proyecto
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-400"
              placeholder="Catálogo 2025"
            />
          </label>
          
          <label className="text-sm">
            Cliente
            <input
              required
              value={form.client_name}
              onChange={(e) => setForm({ ...form, client_name: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-400"
              placeholder="Acme Ltda."
            />
          </label>

          {/* Comprobante de abono moved below items (rendered later) */}

          {/* 2a fila */}
          <label className="text-sm">
            Método de entrega
            <select
              value={form.delivery_method}
              onChange={(e) => setForm({ ...form, delivery_method: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-sky-400"
            >
              <option value="retiro">retiro</option>
              <option value="despacho">despacho</option>
            </select>
          </label>

          <label className="text-sm">
            Fecha compromiso
            <input
              type="date"
              value={form.due_date}
              min={todayISO()}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-400"
            />
          </label>

          {/* Campo de fecha de entrega - solo visible si el pedido está entregado */}
          {form.status === "entregado" && (
            <label className="text-sm">
              Fecha de entrega
              <input
                type="date"
                value={form.delivered_date}
                onChange={(e) => setForm({ ...form, delivered_date: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-400"
              />
              <span className="text-xs text-slate-500 mt-1 block">
                Se establece automáticamente al marcar como entregado
              </span>
            </label>
          )}

          {/* Ítems del pedido */}
          <div className="col-span-full">
            <OrderItemsEditor
              items={items}
              handleAdd={() => {
                // Fecha de entrega por defecto: 4 días hábiles desde hoy
                const fechaDefecto = addBusinessDays(form.due_date || todayISO(), 4);
                setItems([...items, { description: "", quantity: 1, due_date: fechaDefecto, price: 0, paid_amount: 0 }]);
              }}
              handleDelete={idx => setItems(items.filter((_, i) => i !== idx))}
              handleChange={(idx, field, value) => {
                setItems(items => items.map((item, i) => i === idx ? { ...item, [field]: value } : item));
              }}
            />
          </div>

          {/* Comprobante de abono: moved here so it appears under items */}
          <div className="col-span-full text-sm">
            <label>Comprobante de abono</label>
            <div className="mt-1">
              <input type="file" accept="image/*" onChange={handleFileChange} disabled={uploading} multiple />
            </div>
            {uploading && <div className="text-xs text-slate-500 mt-1">Subiendo imagen…</div>}

            {form.abono_images && form.abono_images.length > 0 && (
              <div className="mt-2 space-y-2">
                {form.abono_images.map((u, idx) => (
                  <div key={u.id ?? u.url ?? idx} className="flex items-center gap-3">
                    <div className="flex-1 text-xs text-slate-700 truncate" title={u.filename || getFileNameFromUrl(u.url)}>{u.filename || getFileNameFromUrl(u.url)}</div>
                    <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center relative group">
                      <button
                        type="button"
                        aria-label={`Ver comprobante ${idx + 1}`}
                        title={`Ver comprobante ${idx + 1}`}
                        className="p-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          const url = (u.url || u).startsWith('/api') ? (u.url || u) : `/api${(u.url || u)}`;
                          window.dispatchEvent(new CustomEvent('open-comprobante-preview', { detail: { url } }));
                        }}
                      >
                        <Eye className="w-5 h-5 text-slate-700" />
                      </button>
                      <div className="hidden group-hover:block absolute left-0 -top-56 w-72 h-52 bg-white border border-slate-200 rounded shadow-lg overflow-hidden z-50 transform scale-95 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-150">
                        <img src={encodeURI(normalizeServerUrl(u.url || u))} alt={`preview ${idx + 1}`} className="w-full h-full object-contain bg-white" />
                      </div>
                    </div>
                    <div className="flex gap-2 items-center">
                      <button
                        type="button"
                        aria-label={`Eliminar comprobante ${idx + 1}`}
                        title={`Eliminar comprobante ${idx + 1}`}
                        className="p-1 rounded hover:bg-rose-50"
                        onClick={() => handleDeleteAbono(idx)}
                        disabled={deletingAbono}
                      >
                        <Trash className="w-4 h-4 text-rose-600" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {imgLoadError && (
              <div className="text-xs text-rose-600 mt-1">No se pudo cargar la miniatura. <button type="button" className="underline text-sky-600 inline-flex items-center" onClick={() => {
                const u = (form.abono_images && form.abono_images.length) ? (form.abono_images[0]?.url || form.abono_images[0]) : "";
                const url = u && u.startsWith('/api') ? u : `/api${u}`;
                window.dispatchEvent(new CustomEvent('open-comprobante-preview', { detail: { url } }));
              }}><ExternalLink className="w-3 h-3 mr-1" />Abrir imagen</button></div>
            )}
            {/* preview handled by global PreviewModal via event */}
          </div>

          {/* Resumen de totales */}
          {items.length > 0 && (
            <div className="col-span-full bg-slate-50 rounded-xl p-4 space-y-2">
              <h4 className="font-semibold text-sm text-slate-700">Resumen de totales</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-slate-600">Total precio:</span>
                  <div className="font-semibold text-green-700">
                    {items.reduce((sum, item) => sum + (parseInt(item.price) || 0), 0).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}
                  </div>
                </div>
                <div>
                  <span className="text-slate-600">Total abonado:</span>
                  <div className="font-semibold text-blue-700">
                    {items.reduce((sum, item) => sum + (parseInt(item.paid_amount) || 0), 0).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}
                  </div>
                </div>
                <div>
                  <span className="text-slate-600">Pendiente:</span>
                  <div className="font-semibold text-red-700">
                    {(items.reduce((sum, item) => sum + (parseInt(item.price) || 0), 0) - 
                       items.reduce((sum, item) => sum + (parseInt(item.paid_amount) || 0), 0)).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Descripción al final */}
          <label className="col-span-full text-sm">
            Descripción
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-400"
              placeholder="Notas del pedido…"
            />
          </label>

          

          <div className="col-span-full flex items-center gap-3">
            <button
              disabled={loading || (editMode && !isDirty) || !isValid}
              aria-disabled={loading || (editMode && !isDirty) || !isValid}
              title={
                !isValid
                  ? "Completa los campos requeridos"
                  : editMode && !isDirty
                  ? "Sin cambios"
                  : ""
              }
              type="submit"
              className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
            >
              {editMode ? "Guardar cambios" : "Crear pedido"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
              disabled={loading}
            >
              Cancelar
            </button>
            {loading && <span className="text-sm text-slate-500">Guardando…</span>}
            {error && <span className="text-sm text-rose-600">{error}</span>}
            {isDueInvalid && (
              <span className="text-xs text-amber-600">Advertencia: la fecha de compromiso es anterior a hoy.</span>
            )}
            {editMode && !isDirty && (
              <span className="text-xs text-slate-500">Sin cambios</span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
