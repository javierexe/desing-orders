import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useReactTable, getCoreRowModel, getSortedRowModel, flexRender } from '@tanstack/react-table';
import { toast, Toaster } from 'sonner';
import { Trash2, User, Building2, Users, Plus, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useConfirmDialog } from '../../components/ConfirmDialog';

export default function ClientGrid() {
  const { showConfirm } = useConfirmDialog();
  const [data, setData] = useState([]);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [sorting, setSorting] = useState([]);
  const [highlightedClientId, setHighlightedClientId] = useState(null);
  
  // Filtros
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'active', 'inactive'
  const [filterType, setFilterType] = useState('all'); // 'all', 'particular', 'empresa'
  const [searchQuery, setSearchQuery] = useState('');
  
  const dirtyRows = useRef(new Map());
  const saveTimer = useRef(null);

  // Fetch inicial
  useEffect(() => {
    fetchClients();
  }, []);

  async function fetchClients() {
    try {
      const res = await fetch('/api/clientes?activo=true');
      const clients = await res.json();
      setData(Array.isArray(clients) ? clients : []);
    } catch (err) {
      toast.error('Error cargando clientes');
    }
  }

  // Aplicar filtros locales
  const filteredData = useMemo(() => {
    let filtered = [...data];
    
    // Filtro por estado
    if (filterStatus === 'active') {
      filtered = filtered.filter(c => c.activo === true);
    } else if (filterStatus === 'inactive') {
      filtered = filtered.filter(c => c.activo === false);
    }
    
    // Filtro por tipo
    if (filterType !== 'all') {
      filtered = filtered.filter(c => c.tipo === filterType);
    }
    
    // Filtro por búsqueda
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c => 
        c.nombre?.toLowerCase().includes(query) ||
        c.email?.toLowerCase().includes(query) ||
        c.telefono?.toLowerCase().includes(query) ||
        c.rut?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [data, filterStatus, filterType, searchQuery]);

  // Manejo de edición - SOLO marcar como dirty
  function handleCellEdit(rowId, columnId, value) {
    const current = dirtyRows.current.get(rowId) || { id: rowId };
    dirtyRows.current.set(rowId, { ...current, [columnId]: value });
  }

  // Manejar blur
  function handleCellBlur(rowId, columnId, value) {
    // Actualizar data local
    setData(prev => prev.map(row => {
      if (row.id === rowId) {
        return { ...row, [columnId]: value };
      }
      return row;
    }));

    // Debounce autosave
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveDirtyRows();
    }, 1000);
  }

  async function saveDirtyRows() {
    if (dirtyRows.current.size === 0) return;

    setSaving(true);
    const updates = Array.from(dirtyRows.current.values());
    
    try {
      await Promise.all(
        updates.map(async (row) => {
          const { id, ...fields } = row;
          const res = await fetch(`/api/clientes/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fields)
          });
          if (!res.ok) throw new Error('Error actualizando cliente');
        })
      );
      
      dirtyRows.current.clear();
      toast.success(`${updates.length} cliente(s) actualizado(s)`);
    } catch (err) {
      toast.error('Error guardando cambios');
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateNew() {
    try {
      const res = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: 'Nuevo Cliente',
          tipo: 'particular',
        })
      });
      
      if (!res.ok) throw new Error('Error creando cliente');
      
      const newClient = await res.json();
      setData(prev => [newClient, ...prev]);
      
      // Highlight
      setHighlightedClientId(newClient.id);
      setTimeout(() => setHighlightedClientId(null), 3000);
      
      toast.success('Cliente creado');
    } catch (err) {
      toast.error('Error creando cliente');
    }
  }

  async function handleDelete() {
    if (selectedRows.size === 0) {
      toast.error('Selecciona al menos un cliente');
      return;
    }

    const confirmed = await showConfirm({
      title: 'Confirmar eliminación',
      message: `¿Eliminar ${selectedRows.size} cliente(s)?\n\nEsta acción no se puede deshacer.`,
      type: 'danger'
    });
    
    if (!confirmed) return;

    try {
      await Promise.all(
        Array.from(selectedRows).map(id =>
          fetch(`/api/clientes/${id}`, { method: 'DELETE' })
        )
      );
      
      setData(prev => prev.filter(c => !selectedRows.has(c.id)));
      setSelectedRows(new Set());
      toast.success(`${selectedRows.size} cliente(s) eliminado(s)`);
    } catch (err) {
      toast.error('Error eliminando clientes');
    }
  }

  async function handleDeleteSingle(clientId) {
    const client = data.find(c => c.id === clientId);
    const clientName = client?.nombre || 'este cliente';
    
    const confirmed = await showConfirm({
      title: 'Confirmar eliminación',
      message: `¿Eliminar a "${clientName}"?\n\nEsta acción no se puede deshacer.`,
      type: 'danger'
    });
    
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/clientes/${clientId}`, { method: 'DELETE' });
      
      if (!res.ok) throw new Error('Error eliminando cliente');
      
      setData(prev => prev.filter(c => c.id !== clientId));
      toast.success('Cliente eliminado');
    } catch (err) {
      toast.error('Error al eliminar cliente');
    }
  }

  function toggleRowSelection(id) {
    setSelectedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedRows.size === filteredData.length && filteredData.length > 0) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filteredData.map(c => c.id)));
    }
  }

  const columns = useMemo(() => [
    {
      id: 'select',
      header: () => {
        const allFilteredIds = filteredData.map(c => c.id);
        const isAllSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedRows.has(id));
        
        return (
          <input
            type="checkbox"
            checked={isAllSelected}
            onChange={toggleSelectAll}
            className="rounded border-slate-300"
          />
        );
      },
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={selectedRows.has(row.original.id)}
          onChange={() => toggleRowSelection(row.original.id)}
          className="rounded border-slate-300"
        />
      ),
      size: 50
    },
    {
      accessorKey: 'id',
      header: 'ID',
      size: 50,
      cell: ({ getValue }) => (
        <span className="text-slate-500 text-sm">{getValue()}</span>
      )
    },
    {
      accessorKey: 'nombre',
      header: ({ column }) => {
        const isSorted = column.getIsSorted();
        return (
          <button
            onClick={() => column.toggleSorting()}
            className="flex items-center gap-1 hover:text-blue-600"
          >
            Nombre / Razón Social
            {isSorted === 'asc' ? <ArrowUp className="w-4 h-4" /> : 
             isSorted === 'desc' ? <ArrowDown className="w-4 h-4" /> :
             <ArrowUpDown className="w-4 h-4 opacity-50" />}
          </button>
        );
      },
      cell: ({ row, getValue }) => (
        <input
          type="text"
          defaultValue={getValue()}
          onBlur={(e) => handleCellBlur(row.original.id, 'nombre', e.target.value)}
          onChange={(e) => handleCellEdit(row.original.id, 'nombre', e.target.value)}
          className="w-full px-2 py-1 border border-transparent hover:border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded"
        />
      ),
      size: 200
    },
    {
      accessorKey: 'contacto',
      header: 'Contacto',
      cell: ({ row, getValue }) => (
        <input
          type="text"
          defaultValue={getValue() || ''}
          onBlur={(e) => handleCellBlur(row.original.id, 'contacto', e.target.value)}
          onChange={(e) => handleCellEdit(row.original.id, 'contacto', e.target.value)}
          placeholder={row.original.tipo === 'empresa' ? 'Nombre contacto' : ''}
          className="w-full px-2 py-1 border border-transparent hover:border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded"
        />
      ),
      size: 180
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row, getValue }) => (
        <input
          type="email"
          defaultValue={getValue() || ''}
          onBlur={(e) => handleCellBlur(row.original.id, 'email', e.target.value)}
          onChange={(e) => handleCellEdit(row.original.id, 'email', e.target.value)}
          placeholder="email@ejemplo.com"
          className="w-full px-2 py-1 border border-transparent hover:border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded"
        />
      ),
      size: 220
    },
    {
      accessorKey: 'telefono',
      header: 'Teléfono',
      cell: ({ row, getValue }) => (
        <input
          type="tel"
          defaultValue={getValue() || ''}
          onBlur={(e) => handleCellBlur(row.original.id, 'telefono', e.target.value)}
          onChange={(e) => handleCellEdit(row.original.id, 'telefono', e.target.value)}
          placeholder="+56 9 1234 5678"
          className="w-full px-2 py-1 border border-transparent hover:border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded"
        />
      ),
      size: 150
    },
    {
      accessorKey: 'rut',
      header: () => (
        <div className="flex items-center gap-1">
          RUT
          <span className="text-xs text-slate-400">(* empresas)</span>
        </div>
      ),
      cell: ({ row, getValue }) => {
        const isEmpresa = row.original.tipo === 'empresa';
        return (
          <div className="relative">
            <input
              type="text"
              defaultValue={getValue() || ''}
              onBlur={(e) => handleCellBlur(row.original.id, 'rut', e.target.value)}
              onChange={(e) => handleCellEdit(row.original.id, 'rut', e.target.value)}
              placeholder={isEmpresa ? "12.345.678-9 *" : "12.345.678-9"}
              className={`w-full px-2 py-1 border ${isEmpresa && !getValue() ? 'border-amber-200 bg-amber-50' : 'border-transparent'} hover:border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded font-mono text-sm`}
            />
          </div>
        );
      },
      size: 150
    },
    {
      accessorKey: 'tipo',
      header: 'Tipo',
      cell: ({ row, getValue }) => {
        const currentType = getValue();
        return (
          <div className="flex items-center justify-center">
            <select
              defaultValue={currentType}
              onBlur={(e) => handleCellBlur(row.original.id, 'tipo', e.target.value)}
              onChange={(e) => handleCellEdit(row.original.id, 'tipo', e.target.value)}
              title={currentType === 'empresa' ? 'Empresa' : 'Particular'}
              className="w-10 h-8 px-1 py-1 border border-transparent hover:border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded cursor-pointer text-transparent bg-no-repeat bg-center appearance-none"
              style={{
                backgroundImage: currentType === 'empresa' 
                  ? 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'20\' height=\'20\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%234b5563\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Crect width=\'16\' height=\'20\' x=\'4\' y=\'2\' rx=\'2\' ry=\'2\'/%3E%3Cpath d=\'M9 22v-4h6v4\'/%3E%3Cpath d=\'M8 6h.01\'/%3E%3Cpath d=\'M16 6h.01\'/%3E%3Cpath d=\'M12 6h.01\'/%3E%3Cpath d=\'M12 10h.01\'/%3E%3Cpath d=\'M12 14h.01\'/%3E%3Cpath d=\'M16 10h.01\'/%3E%3Cpath d=\'M16 14h.01\'/%3E%3Cpath d=\'M8 10h.01\'/%3E%3Cpath d=\'M8 14h.01\'/%3E%3C/svg%3E")'
                  : 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'20\' height=\'20\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%234b5563\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2\'/%3E%3Ccircle cx=\'12\' cy=\'7\' r=\'4\'/%3E%3C/svg%3E")',
              }}
            >
              <option value="particular">👤</option>
              <option value="empresa">🏢</option>
            </select>
          </div>
        );
      },
      size: 80
    },
    {
      accessorKey: 'direccion',
      header: 'Dirección',
      cell: ({ row, getValue }) => (
        <input
          type="text"
          defaultValue={getValue() || ''}
          onBlur={(e) => handleCellBlur(row.original.id, 'direccion', e.target.value)}
          onChange={(e) => handleCellEdit(row.original.id, 'direccion', e.target.value)}
          placeholder="Dirección completa"
          className="w-full px-2 py-1 border border-transparent hover:border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded"
        />
      ),
      size: 250
    },
    {
      accessorKey: 'activo',
      header: 'Estado',
      cell: ({ row, getValue }) => {
        const isActive = getValue();
        return (
          <div className="flex items-center justify-center">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                defaultChecked={isActive}
                onChange={(e) => {
                  const newValue = e.target.checked;
                  handleCellEdit(row.original.id, 'activo', newValue);
                  handleCellBlur(row.original.id, 'activo', newValue);
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
            </label>
          </div>
        );
      },
      size: 90
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <button
          onClick={() => handleDeleteSingle(row.original.id)}
          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
          title="Eliminar cliente"
        >
          <Trash2 size={16} />
        </button>
      ),
      size: 50,
    },
  ], [selectedRows, filteredData]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="space-y-4">
      <Toaster position="top-right" richColors />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Clientes</h1>
            <p className="text-sm text-slate-500">{data.length} cliente(s) total</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {saving && (
            <span className="text-sm text-amber-600 animate-pulse">
              Guardando cambios...
            </span>
          )}
          <button
            onClick={handleCreateNew}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nuevo Cliente
          </button>
          <button
            onClick={handleDelete}
            disabled={selectedRows.size === 0}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Eliminar ({selectedRows.size})
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Búsqueda */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Buscar
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nombre, email, teléfono o RUT..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Filtro por tipo */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Tipo
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setFilterType('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filterType === 'all'
                    ? 'bg-slate-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilterType('particular')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  filterType === 'particular'
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <User className="w-4 h-4" />
                Particulares
              </button>
              <button
                onClick={() => setFilterType('empresa')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  filterType === 'empresa'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Building2 className="w-4 h-4" />
                Empresas
              </button>
            </div>
          </div>

          {/* Filtro por estado */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Estado
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filterStatus === 'all'
                    ? 'bg-slate-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilterStatus('active')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filterStatus === 'active'
                    ? 'bg-green-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                ✓ Activos
              </button>
              <button
                onClick={() => setFilterStatus('inactive')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filterStatus === 'inactive'
                    ? 'bg-slate-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Inactivos
              </button>
            </div>
          </div>
        </div>

        {filteredData.length === 0 && data.length > 0 && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-amber-800 text-sm">
              No se encontraron clientes con los filtros aplicados.{' '}
              <button
                onClick={() => {
                  setFilterStatus('all');
                  setFilterType('all');
                  setSearchQuery('');
                }}
                className="font-semibold underline hover:no-underline"
              >
                Limpiar filtros
              </button>
            </p>
          </div>
        )}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th
                      key={header.id}
                      style={{ width: header.column.columnDef.size }}
                      className="px-4 py-3 text-left text-sm font-semibold text-slate-700"
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-slate-200">
              {table.getRowModel().rows.map(row => (
                <tr
                  key={row.id}
                  className={`hover:bg-slate-50 transition-colors ${
                    highlightedClientId === row.original.id
                      ? 'bg-orange-100 ring-2 ring-orange-400 animate-pulse'
                      : ''
                  }`}
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-4 py-2">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredData.length === 0 && data.length === 0 && (
            <div className="p-8 text-center text-slate-500">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No hay clientes registrados</p>
              <button
                onClick={handleCreateNew}
                className="mt-3 text-blue-600 hover:text-blue-700 font-medium"
              >
                Crear el primer cliente
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
