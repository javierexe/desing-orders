// frontend/src/pages/Reports.jsx
import React, { useMemo } from 'react';
import { FileText, TrendingUp, DollarSign, Users, Calendar, Download } from 'lucide-react';

export default function Reports({ orders = [] }) {
  const formatCLP = (amount) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Calcular reportes generales
  const reports = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    
    // Total general
    const totalFacturacion = orders.reduce((sum, o) => sum + (o.total_price || 0), 0);
    const totalCobrado = orders.reduce((sum, o) => sum + (o.total_paid || 0), 0);
    const totalPendiente = totalFacturacion - totalCobrado;
    
    // Clientes únicos
    const clientesSet = new Set(orders.filter(o => o.client_name).map(o => o.client_name));
    const totalClientes = clientesSet.size;
    
    // Pedidos por estado
    const porEstado = {};
    orders.forEach(o => {
      const estado = o.status || 'sin-estado';
      if (!porEstado[estado]) {
        porEstado[estado] = { count: 0, monto: 0 };
      }
      porEstado[estado].count++;
      porEstado[estado].monto += o.total_price || 0;
    });
    
    // Top 5 clientes por facturación
    const clienteStats = {};
    orders.forEach(o => {
      if (!o.client_name) return;
      if (!clienteStats[o.client_name]) {
        clienteStats[o.client_name] = { pedidos: 0, facturacion: 0, cobrado: 0 };
      }
      clienteStats[o.client_name].pedidos++;
      clienteStats[o.client_name].facturacion += o.total_price || 0;
      clienteStats[o.client_name].cobrado += o.total_paid || 0;
    });
    
    const topClientes = Object.entries(clienteStats)
      .sort((a, b) => b[1].facturacion - a[1].facturacion)
      .slice(0, 5);
    
    return {
      totalFacturacion,
      totalCobrado,
      totalPendiente,
      totalClientes,
      totalPedidos: orders.length,
      porEstado,
      topClientes
    };
  }, [orders]);

  const statusColors = {
    'pre-pedido': 'bg-gray-100 text-gray-800',
    'recibido': 'bg-cyan-100 text-cyan-800',
    'diseño': 'bg-purple-100 text-purple-800',
    'producción': 'bg-yellow-100 text-yellow-800',
    'listo': 'bg-blue-100 text-blue-800',
    'entregado': 'bg-green-100 text-green-800',
    'cancelado': 'bg-red-100 text-red-800'
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reportes</h1>
          <p className="text-gray-500 mt-1">Análisis y estadísticas del negocio</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Download className="w-4 h-4" />
          Exportar PDF
        </button>
      </div>

      {/* Resumen General */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-blue-600 rounded-lg">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-blue-700 font-medium">Facturación Total</p>
              <p className="text-2xl font-bold text-blue-900">{formatCLP(reports.totalFacturacion)}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-green-600 rounded-lg">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-green-700 font-medium">Total Cobrado</p>
              <p className="text-2xl font-bold text-green-900">{formatCLP(reports.totalCobrado)}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-6 rounded-xl shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-amber-600 rounded-lg">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-amber-700 font-medium">Pendiente de Cobro</p>
              <p className="text-2xl font-bold text-amber-900">{formatCLP(reports.totalPendiente)}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-purple-600 rounded-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-purple-700 font-medium">Clientes</p>
              <p className="text-2xl font-bold text-purple-900">{reports.totalClientes}</p>
              <p className="text-xs text-purple-600">{reports.totalPedidos} pedidos totales</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pedidos por Estado */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Pedidos por Estado
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(reports.porEstado).map(([estado, data]) => (
            <div key={estado} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${statusColors[estado] || 'bg-gray-100 text-gray-800'}`}>
                  {estado}
                </span>
                <span className="text-2xl font-bold text-gray-900">{data.count}</span>
              </div>
              <p className="text-sm text-gray-600">Facturación: <span className="font-semibold">{formatCLP(data.monto)}</span></p>
            </div>
          ))}
        </div>
      </div>

      {/* Top 5 Clientes */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Top 5 Clientes por Facturación
        </h2>
        <div className="space-y-3">
          {reports.topClientes.map(([cliente, stats], index) => (
            <div key={cliente} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                {index + 1}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{cliente}</p>
                <p className="text-sm text-gray-600">{stats.pedidos} pedidos</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900">{formatCLP(stats.facturacion)}</p>
                <p className="text-sm text-green-600">Cobrado: {formatCLP(stats.cobrado)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Nota informativa */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
        <p className="font-medium">📊 Nota</p>
        <p className="mt-1 text-blue-600">
          Los reportes muestran datos acumulados de todos los pedidos registrados en el sistema. 
          La funcionalidad de exportación a PDF estará disponible próximamente.
        </p>
      </div>
    </div>
  );
}
