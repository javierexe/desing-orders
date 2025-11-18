// frontend/src/pages/OrdersTable.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { useReactTable, getCoreRowModel, getSortedRowModel, flexRender } from '@tanstack/react-table';
import { Search, Filter, Download, ArrowUpDown, ArrowUp, ArrowDown, Edit, Trash2, Calendar, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { useConfirmDialog } from '../components/ConfirmDialog';
import NewOrderModal from '../components/NewOrderModal';
import { api } from '../lib/api';

const STATUS_OPTIONS = [
  { value: 'pre-pedido', label: 'Pre-pedido', color: 'bg-slate-100 text-slate-700' },
  { value: 'recibido', label: 'Recibido', color: 'bg-blue-100 text-blue-700' },
  { value: 'diseño', label: 'Diseño', color: 'bg-purple-100 text-purple-700' },
  { value: 'producción', label: 'Producción', color: 'bg-amber-100 text-amber-700' },
  { value: 'listo', label: 'Listo', color: 'bg-green-100 text-green-700' },
  { value: 'entregado', label: 'Entregado', color: 'bg-emerald-100 text-emerald-700' }
];

export default function OrdersTable() {
  const { showConfirm } = useConfirmDialog();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all'); // all, paid, partial, unpaid
  const [dateFilter, setDateFilter] = useState('all'); // all, overdue, upcoming
  const [sorting, setSorting] = useState([{ id: 'code', desc: true }]);
  const [editingOrder, setEditingOrder] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const formatCLP = (amount) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = STATUS_OPTIONS.find(s => s.value === status);
    return statusConfig || STATUS_OPTIONS[0];
  };

  // Fetch orders
  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    setLoading(true);
    try {
      const data = await api.get('/orders');
      setOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Error al cargar pedidos');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  // Cambiar estado de un pedido
  async function handleStatusChange(orderId, newStatus) {
    try {
      await api.patch(`/orders/${orderId}`, { status: newStatus });
      toast.success('Estado actualizado');
      fetchOrders();
    } catch (error) {
      toast.error('Error al actualizar estado');
      console.error(error);
    }
  }

  // Eliminar pedido
  async function handleDelete(order) {
    const confirmed = await showConfirm({
      title: '¿Eliminar pedido?',
      message: `¿Estás seguro de eliminar el pedido ${order.code}?`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar'
    });

    if (confirmed) {
      try {
        await api.delete(`/orders/${order.id}`);
        toast.success('Pedido eliminado');
        fetchOrders();
      } catch (error) {
        toast.error('Error al eliminar pedido');
        console.error(error);
      }
    }
  }

  // Abrir modal de edición
  function handleEdit(order) {
    setEditingOrder(order);
    setShowEditModal(true);
  }

  // Filtrado local
  const filteredOrders = useMemo(() => {
    let filtered = [...orders];

    // Filtro por búsqueda
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(order =>
        order.code?.toLowerCase().includes(query) ||
        order.client_name?.toLowerCase().includes(query) ||
        order.title?.toLowerCase().includes(query)
      );
    }

    // Filtro por estado
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    // Filtro por pago
    if (paymentFilter === 'paid') {
      filtered = filtered.filter(order => (order.total_paid || 0) >= (order.total_price || 0) && order.total_price > 0);
    } else if (paymentFilter === 'partial') {
      filtered = filtered.filter(order => (order.total_paid || 0) > 0 && (order.total_paid || 0) < (order.total_price || 0));
    } else if (paymentFilter === 'unpaid') {
      filtered = filtered.filter(order => (order.total_paid || 0) === 0 && (order.total_price || 0) > 0);
    }

    // Filtro por fecha
    if (dateFilter === 'overdue') {
      const now = new Date();
      filtered = filtered.filter(order => 
        order.due_date && 
        new Date(order.due_date) < now &&
        !['entregado', 'listo'].includes(order.status)
      );
    } else if (dateFilter === 'upcoming') {
      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(order => 
        order.due_date && 
        new Date(order.due_date) >= now &&
        new Date(order.due_date) <= sevenDaysFromNow
      );
    }

    return filtered;
  }, [orders, searchQuery, statusFilter, paymentFilter, dateFilter]);

  // Definir columnas con anchos específicos
  const columns = useMemo(() => [
    {
      accessorKey: 'code',
      header: ({ column }) => (
        <button
          onClick={() => column.toggleSorting()}
          className="flex items-center gap-1 font-semibold hover:text-blue-600"
        >
          Código
          {column.getIsSorted() === 'asc' ? <ArrowUp className="w-4 h-4" /> :
           column.getIsSorted() === 'desc' ? <ArrowDown className="w-4 h-4" /> :
           <ArrowUpDown className="w-4 h-4 opacity-50" />}
        </button>
      ),
      cell: ({ row }) => (
        <span className="font-mono text-sm font-medium text-slate-900">
          {row.original.code}
        </span>
      ),
      size: 100,
      minSize: 90,
    },
    {
      accessorKey: 'client_name',
      header: ({ column }) => (
        <button
          onClick={() => column.toggleSorting()}
          className="flex items-center gap-1 font-semibold hover:text-blue-600"
        >
          Cliente
          {column.getIsSorted() === 'asc' ? <ArrowUp className="w-4 h-4" /> :
           column.getIsSorted() === 'desc' ? <ArrowDown className="w-4 h-4" /> :
           <ArrowUpDown className="w-4 h-4 opacity-50" />}
        </button>
      ),
      cell: ({ row }) => (
        <div className="min-w-[200px]">
          <p className="font-medium text-slate-900 truncate">{row.original.client_name || 'Sin nombre'}</p>
          {row.original.title && (
            <p className="text-xs text-slate-500 truncate">{row.original.title}</p>
          )}
        </div>
      ),
      size: 250,
      minSize: 200,
    },
    {
      accessorKey: 'status',
      header: 'Estado',
      cell: ({ row }) => {
        const statusConfig = getStatusBadge(row.original.status);
        return (
          <div className="flex justify-center">
            <select
              value={row.original.status}
              onChange={(e) => handleStatusChange(row.original.id, e.target.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border-0 cursor-pointer ${statusConfig.color}`}
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        );
      },
      size: 140,
      minSize: 130,
    },
    {
      accessorKey: 'due_date',
      header: ({ column }) => (
        <button
          onClick={() => column.toggleSorting()}
          className="flex items-center gap-1 font-semibold hover:text-blue-600 mx-auto"
        >
          <Calendar className="w-4 h-4" />
          Vencimiento
          {column.getIsSorted() === 'asc' ? <ArrowUp className="w-4 h-4" /> :
           column.getIsSorted() === 'desc' ? <ArrowDown className="w-4 h-4" /> :
           <ArrowUpDown className="w-4 h-4 opacity-50" />}
        </button>
      ),
      cell: ({ row }) => {
        const isOverdue = row.original.due_date && 
                         new Date(row.original.due_date) < new Date() &&
                         !['entregado', 'listo'].includes(row.original.status);
        return (
          <div className="text-center">
            <span className={`text-sm whitespace-nowrap ${isOverdue ? 'text-red-600 font-medium' : 'text-slate-700'}`}>
              {formatDate(row.original.due_date)}
            </span>
          </div>
        );
      },
      size: 120,
      minSize: 110,
    },
    {
      accessorKey: 'total_price',
      header: ({ column }) => (
        <button
          onClick={() => column.toggleSorting()}
          className="flex items-center gap-1 font-semibold hover:text-blue-600 ml-auto"
        >
          Total
          {column.getIsSorted() === 'asc' ? <ArrowUp className="w-4 h-4" /> :
           column.getIsSorted() === 'desc' ? <ArrowDown className="w-4 h-4" /> :
           <ArrowUpDown className="w-4 h-4 opacity-50" />}
        </button>
      ),
      cell: ({ row }) => (
        <div className="text-right">
          <span className="font-medium text-slate-900 text-sm whitespace-nowrap">
            {formatCLP(row.original.total_price)}
          </span>
        </div>
      ),
      size: 120,
      minSize: 100,
    },
    {
      accessorKey: 'total_paid',
      header: () => <div className="text-right font-semibold">Pagado</div>,
      cell: ({ row }) => (
        <div className="text-right">
          <span className="font-medium text-green-600 text-sm whitespace-nowrap">
            {formatCLP(row.original.total_paid)}
          </span>
        </div>
      ),
      size: 120,
      minSize: 100,
    },
    {
      accessorKey: 'pending_amount',
      header: () => <div className="text-right font-semibold">Pendiente</div>,
      cell: ({ row }) => {
        const pending = (row.original.total_price || 0) - (row.original.total_paid || 0);
        return (
          <div className="text-right">
            <span className={`font-medium text-sm whitespace-nowrap ${pending > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
              {formatCLP(pending)}
            </span>
          </div>
        );
      },
      size: 120,
      minSize: 100,
    },
    {
      id: 'actions',
      header: () => <div className="text-center font-semibold">Acciones</div>,
      cell: ({ row }) => (
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={() => handleEdit(row.original)}
            className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
            title="Editar"
          >
            <Edit className="w-4 h-4 text-blue-600" />
          </button>
          <button
            onClick={() => handleDelete(row.original)}
            className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
            title="Eliminar"
          >
            <Trash2 className="w-4 h-4 text-red-600" />
          </button>
        </div>
      ),
      size: 90,
      minSize: 80,
    },
  ], []);

  const table = useReactTable({
    data: filteredOrders,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // Calcular totales
  const totals = useMemo(() => {
    return filteredOrders.reduce((acc, order) => ({
      totalPrice: acc.totalPrice + (order.total_price || 0),
      totalPaid: acc.totalPaid + (order.total_paid || 0),
      totalPending: acc.totalPending + ((order.total_price || 0) - (order.total_paid || 0))
    }), { totalPrice: 0, totalPaid: 0, totalPending: 0 });
  }, [filteredOrders]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtros y búsqueda */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        {/* Primera fila: Búsqueda */}
        <div className="mb-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por código, cliente o título..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Segunda fila: Filtros */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-slate-600" />
            <span className="text-sm font-medium text-slate-700">Filtros:</span>
          </div>

          {/* Filtro por estado */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            <option value="all">📋 Todos los estados</option>
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {/* Filtro por pago */}
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            <option value="all">💰 Todos los pagos</option>
            <option value="paid">✅ Pagado completo</option>
            <option value="partial">⚠️ Pago parcial</option>
            <option value="unpaid">❌ Sin pagar</option>
          </select>

          {/* Filtro por fecha */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            <option value="all">📅 Todas las fechas</option>
            <option value="overdue">🔴 Atrasados</option>
            <option value="upcoming">⏰ Próximos 7 días</option>
          </select>

          {/* Botón limpiar filtros */}
          {(statusFilter !== 'all' || paymentFilter !== 'all' || dateFilter !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setStatusFilter('all');
                setPaymentFilter('all');
                setDateFilter('all');
                setSearchQuery('');
              }}
              className="px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              ✕ Limpiar filtros
            </button>
          )}
        </div>

        {/* Resumen totales */}
        <div className="mt-4 pt-4 border-t border-slate-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-1">Pedidos</p>
              <p className="text-xl font-bold text-slate-900">{filteredOrders.length}</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs text-blue-600 mb-1">Total Facturado</p>
              <p className="text-xl font-bold text-blue-900">{formatCLP(totals.totalPrice)}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-xs text-green-600 mb-1">Total Cobrado</p>
              <p className="text-xl font-bold text-green-900">{formatCLP(totals.totalPaid)}</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-3">
              <p className="text-xs text-amber-600 mb-1">Total Pendiente</p>
              <p className="text-xl font-bold text-amber-900">{formatCLP(totals.totalPending)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed">
            <colgroup>
              <col style={{ width: '100px' }} />  {/* Código */}
              <col style={{ width: '150px' }} />  {/* Cliente */}
              <col style={{ width: '90px' }} />  {/* Estado */}
              <col style={{ width: '120px' }} />  {/* Vencimiento */}
              <col style={{ width: '120px' }} />  {/* Total */}
              <col style={{ width: '120px' }} />  {/* Pagado */}
              <col style={{ width: '120px' }} />  {/* Pendiente */}
              <col style={{ width: '90px' }} />   {/* Acciones */}
            </colgroup>
            <thead className="bg-slate-50 border-b border-slate-200">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header, index) => {
                    // Determinar alineación según la columna
                    let alignClass = 'text-left';
                    if (index === 2) alignClass = 'text-center'; // Estado
                    if (index === 3) alignClass = 'text-center'; // Vencimiento
                    if (index >= 4 && index <= 6) alignClass = 'text-right'; // Total, Pagado, Pendiente
                    if (index === 7) alignClass = 'text-center'; // Acciones
                    
                    return (
                      <th
                        key={header.id}
                        className={`px-3 py-3 text-sm text-slate-700 ${alignClass}`}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-3 py-12 text-center text-slate-500">
                    {searchQuery || statusFilter !== 'all' || paymentFilter !== 'all' || dateFilter !== 'all' 
                      ? '🔍 No se encontraron pedidos con los filtros aplicados'
                      : '📦 No hay pedidos registrados'}
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map(row => (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-3 py-3 text-sm">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de edición */}
      {showEditModal && editingOrder && (
        <NewOrderModal
          open={showEditModal}
          order={editingOrder}
          editMode={true}
          onClose={() => {
            setShowEditModal(false);
            setEditingOrder(null);
          }}
          onUpdated={() => {
            fetchOrders();
            setShowEditModal(false);
            setEditingOrder(null);
          }}
          onNotify={(message, type) => {
            if (type === 'success') toast.success(message);
            else if (type === 'error') toast.error(message);
            else toast(message);
          }}
        />
      )}
    </div>
  );
}
