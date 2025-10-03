import React, {useEffect, useState, useRef, useCallback} from 'react';
import DataGrid from 'react-data-grid';
import { toast } from 'sonner';
import { z } from 'zod';
import 'react-data-grid/lib/styles.css';

// Zod schema para validar una fila antes de enviar
const ProductoZ = z.object({
  id: z.number().optional(),
  nombre: z.string().min(2),
  categoria_id: z.number().optional(),
  categoria_nombre: z.string().optional(),
  presentacion: z.string().optional().nullable(),
  precio_base: z.number().nullable().optional().refine(v => v === null || v >= 0, { message: 'precio_base >= 0' }),
  requiere_cotizacion: z.boolean().optional(),
  unidad_medida: z.string().optional().nullable(),
  descripcion: z.string().optional().nullable(),
  activo: z.boolean().optional()
});

export default function ProductGrid() {
  const [rows, setRows] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [dirtyMap, setDirtyMap] = useState(new Map()); // rowId -> partial
  const bulkQueueRef = useRef(new Map()); // Map<rowKey, partial>
  const debounceTimer = useRef(null);
  const [saving, setSaving] = useState(false);

  // Fetch inicial
  useEffect(() => {
    fetch('/api/productos')
      .then(r => r.json())
      .then(data => setRows(Array.isArray(data) ? data : []))
      .catch(err => toast.error('Error cargando productos'));
    fetch('/api/categorias')
      .then(r => r.json())
      .then(data => setCategories(Array.isArray(data) ? data : []))
      .catch(err => toast.error('Error cargando categorías'));
  }, []);

  // Row key getter
  const rowKeyGetter = (row) => row.id ?? row._tempId;

  // Helpers
  const markDirty = (rowKey, partial) => {
    bulkQueueRef.current.set(rowKey, Object.assign({}, bulkQueueRef.current.get(rowKey) || {}, partial));
    setDirtyMap(new Map(bulkQueueRef.current));
    // debounce save
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      flushBulk();
    }, 700);
  };

  const flushBulk = async () => {
    if (bulkQueueRef.current.size === 0) return;
    setSaving(true);

    const updates = [];
    const newCategories = new Set();
    for (const [rowKey, partial] of bulkQueueRef.current.entries()) {
      const obj = {...partial};
      // if category name present and no id, add to newCategories
      if (obj.categoria_nombre && !obj.categoria_id) newCategories.add(obj.categoria_nombre);
      updates.push(obj);
    }

    const payload = {
      updates,
      deletes: [],
      new_categories: Array.from(newCategories)
    };

    // Optimistic: snapshot rows
    const snapshot = rows.map(r => ({...r}));

    try {
      const res = await fetch('/api/productos/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      // Replace/merge rows with returned rows
      const returned = data.rows || [];
      const createdCats = data.created_categories || [];

      // Map returned products by id
      const byId = new Map(returned.map(r => [r.id, r]));

      const newRows = rows.map(r => byId.get(r.id) || r);
      // For created temporary rows (without id) - append returned new ones
      returned.forEach(rr => {
        if (!newRows.find(x => x.id === rr.id)) newRows.push(rr);
      });

      // Merge created categories into local categories
      setCategories(prev => {
        const next = [...prev];
        for (const c of createdCats) {
          if (!next.find(x => x.id === c.id)) next.push(c);
        }
        return next;
      });

      setRows(newRows);
      bulkQueueRef.current.clear();
      setDirtyMap(new Map());
      toast.success('Cambios guardados');
    } catch (err) {
      // rollback
      setRows(snapshot);
      toast.error('Error guardando cambios');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key: 'nombre', name: 'Nombre', editable: true, resizable: true, width: 300 },
    { key: 'categoria_nombre', name: 'Categoría', editable: true, editor: ({ row, onRowChange }) => (
        <CategoryEditor row={row} categories={categories} onChange={onRowChange} />
      ), width: 200 },
    { key: 'presentacion', name: 'Presentación', editable: true, width: 150 },
    { key: 'precio_base', name: 'Precio', editable: true, formatter: ({ row }) => (row.precio_base ? row.precio_base.toLocaleString('es-CL') : ''), width: 120 },
    { key: 'requiere_cotizacion', name: 'Requiere cotización', editable: true, formatter: ({ row }) => (row.requiere_cotizacion ? 'Sí' : 'No'), width: 140 },
    { key: 'unidad_medida', name: 'Unidad', editable: true, width: 120 },
    { key: 'descripcion', name: 'Descripción', editable: true, width: 300 },
    { key: 'activo', name: 'Activo', editable: true, width: 80 }
  ];

  // onRowsChange handler
  const onRowsChange = (newRows, data) => {
    // data contains indexes changed; we'll detect which row and column
    setRows(newRows);
    // Mark as dirty
    if (data && data.indexes) {
      data.indexes.forEach(i => {
        const r = newRows[i];
        const key = rowKeyGetter(r);
        // compute partial change using data.columnKey
        const colKey = data.column && data.column.key ? data.column.key : null;
        if (colKey) {
          markDirty(key, { id: r.id, [colKey]: r[colKey], categoria_nombre: r.categoria_nombre, categoria_id: r.categoria_id, nombre: r.nombre });
        } else {
          // fallback: mark whole row
          markDirty(key, r);
        }
      });
    }
  };

  // Create new row
  const createNew = () => {
    const tempId = `t_${Date.now()}`;
    const newRow = { _tempId: tempId, nombre: '', categoria_nombre: '', presentacion: '', precio_base: null, requiere_cotizacion: false, unidad_medida: '', descripcion: '', activo: true };
    setRows(prev => [newRow, ...prev]);
    // mark dirty to ensure save
    markDirty(tempId, newRow);
  };

  // Delete selected (soft delete)
  const deleteSelected = () => {
    if (selectedRows.size === 0) return;
    const ids = [];
    selectedRows.forEach(k => {
      const r = rows.find(rr => rowKeyGetter(rr) === k);
      if (r && r.id) ids.push(r.id);
    });
    if (ids.length === 0) {
      // remove temporary rows locally
      setRows(prev => prev.filter(rr => !selectedRows.has(rowKeyGetter(rr))));
      setSelectedRows(new Set());
      toast.success('Filas eliminadas localmente');
      return;
    }
    // soft-delete via bulk
    bulkQueueRef.current.set('__delete__', { deletes: ids });
    // Prepare payload
    const payload = { updates: [], deletes: ids, new_categories: [] };
    // optimistic remove
    const snapshot = rows.map(r => ({...r}));
    setRows(prev => prev.filter(r => !ids.includes(r.id)));
    setSelectedRows(new Set());
    // send
    (async () => {
      try {
        const res = await fetch('/api/productos/bulk', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        bulkQueueRef.current.delete('__delete__');
        toast.success('Eliminadas correctamente');
      } catch (err) {
        setRows(snapshot);
        toast.error('Error eliminando');
      }
    })();
  };

  // Paste handler: simple implementation
  const onPaste = useCallback((e, { cols, rowIdx, colIdx }) => {
    const text = e.clipboardData.getData('text');
    if (!text) return;
    const lines = text.split(/\r?\n/).filter(Boolean);
    const newRows = [...rows];
    let r = rowIdx;
    for (const line of lines) {
      const cells = line.split('\t');
      let c = colIdx;
      for (let i = 0; i < cells.length; i++) {
        const col = cols[c + i];
        if (!col) continue;
        const cellVal = cells[i];
        newRows[r] = { ...newRows[r], [col.key]: cellVal };
        // mark dirty
        markDirty(rowKeyGetter(newRows[r]), { [col.key]: newRows[r][col.key] });
      }
      r++;
      if (r >= newRows.length) break;
    }
    setRows(newRows);
  }, [rows]);

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="flex items-center gap-3 mb-3">
        <input type="text" placeholder="Buscar..." className="border rounded px-3 py-2 flex-1" onChange={(e) => {
          const q = e.target.value.toLowerCase();
          // naive client-side filter
          fetch('/api/productos?q=' + encodeURIComponent(q)).then(r => r.json()).then(data => setRows(Array.isArray(data) ? data : []));
        }} />
        <select onChange={(e) => {
          const v = e.target.value;
          fetch('/api/productos?category_id=' + encodeURIComponent(v)).then(r => r.json()).then(data => setRows(Array.isArray(data) ? data : []));
        }} className="border rounded px-3 py-2">
          <option value="">Todas</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <button onClick={createNew} className="bg-sky-600 text-white px-3 py-2 rounded">+ Nuevo</button>
        <button onClick={deleteSelected} className="bg-rose-500 text-white px-3 py-2 rounded">Eliminar</button>
        <div className="ml-2 text-sm text-slate-500">{saving ? 'Guardando…' : ''}</div>
      </div>

      <div className="flex-1">
        <DataGrid
          columns={columns}
          rows={rows}
          rowKeyGetter={rowKeyGetter}
          onRowsChange={onRowsChange}
          selectedRows={selectedRows}
          onSelectedRowsChange={setSelectedRows}
          className="rdg-light"
          onPaste={onPaste}
        />
      </div>
    </div>
  );
}

// CategoryEditor component: simple combo with create-on-the-fly
function CategoryEditor({ row, categories, onChange }) {
  const [value, setValue] = useState(row.categoria_nombre || '');
  useEffect(() => setValue(row.categoria_nombre || ''), [row]);
  const onSelect = (v) => {
    setValue(v);
    // find category id
    const cat = categories.find(c => c.nombre === v);
    if (cat) {
      onChange({ ...row, categoria_id: cat.id, categoria_nombre: cat.nombre });
    } else {
      // mark as new category
      onChange({ ...row, categoria_id: null, categoria_nombre: v });
    }
  };
  return (
    <input type="text" value={value} onChange={(e) => onSelect(e.target.value)} className="w-full px-2 py-1 border rounded" />
  );
}
