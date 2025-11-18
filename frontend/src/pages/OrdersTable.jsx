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

    return filtered;
  }, [orders, searchQuery, statusFilter]);

  // Definir columnas
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
        <div>
          <p className="font-medium text-slate-900">{row.original.client_name || 'Sin nombre'}</p>
          {row.original.title && (
            <p className="text-xs text-slate-500 truncate max-w-xs">{row.original.title}</p>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Estado',
      cell: ({ row }) => {
        const statusConfig = getStatusBadge(row.original.status);
        return (
          <select
            value={row.original.status}
            onChange={(e) => handleStatusChange(row.original.id, e.target.value)}
            className={`px-3 py-1 rounded-full text-xs font-medium border-0 cursor-pointer ${statusConfig.color}`}
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        );
      },
    },
    {
      accessorKey: 'due_date',
      header: ({ column }) => (
        <button
          onClick={() => column.toggleSorting()}
          className="flex items-center gap-1 font-semibold hover:text-blue-600"
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
          <span className={isOverdue ? 'text-red-600 font-medium' : 'text-slate-700'}>
            {formatDate(row.original.due_date)}
          </span>
        );
      },
    },
    {
      accessorKey: 'total_price',
      header: ({ column }) => (
        <button
          onClick={() => column.toggleSorting()}
          className="flex items-center gap-1 font-semibold hover:text-blue-600"
        >
          <DollarSign className="w-4 h-4" />
          Total
          {column.getIsSorted() === 'asc' ? <ArrowUp className="w-4 h-4" /> :
           column.getIsSorted() === 'desc' ? <ArrowDown className="w-4 h-4" /> :
           <ArrowUpDown className="w-4 h-4 opacity-50" />}
        </button>
      ),
      cell: ({ row }) => (
        <span className="font-medium text-slate-900">
          {formatCLP(row.original.total_price)}
        </span>
      ),
    },
    {
      accessorKey: 'total_paid',
      header: 'Pagado',
      cell: ({ row }) => (
        <span className="font-medium text-green-600">
          {formatCLP(row.original.total_paid)}
        </span>
      ),
    },
    {
      accessorKey: 'pending_amount',
      header: 'Pendiente',
      cell: ({ row }) => {
        const pending = (row.original.total_price || 0) - (row.original.total_paid || 0);
        return (
          <span className={`font-medium ${pending > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
            {formatCLP(pending)}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleEdit(row.original)}
            className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
            title="Editar"
          >
            <Edit className="w-4 h-4 text-blue-600" />
          </button>
          <button
            onClick={() => handleDelete(row.original)}
            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
            title="Eliminar"
          >
            <Trash2 className="w-4 h-4 text-red-600" />
          </button>
        </div>
      ),
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
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          {/* Búsqueda */}
          <div className="flex-1 max-w-md">
            <div className="relative">
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

          {/* Filtro por estado */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-slate-600" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todos los estados</option>
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Resumen totales */}
        <div className="mt-4 pt-4 border-t border-slate-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-slate-500">Pedidos</p>
              <p className="text-lg font-bold text-slate-900">{filteredOrders.length}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Facturado</p>
              <p className="text-lg font-bold text-slate-900">{formatCLP(totals.totalPrice)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Cobrado</p>
              <p className="text-lg font-bold text-green-600">{formatCLP(totals.totalPaid)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Pendiente</p>
              <p className="text-lg font-bold text-amber-600">{formatCLP(totals.totalPending)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left text-sm text-slate-700"
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-slate-100">
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-12 text-center text-slate-500">
                    No se encontraron pedidos
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map(row => (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-4 py-3 text-sm">
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
