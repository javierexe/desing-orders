// frontend/src/components/MonthDetailModal.jsx
import React, { useMemo } from 'react';
import { X, TrendingUp, Package, DollarSign } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function MonthDetailModal({ isOpen, onClose, monthData, orders = [] }) {
  if (!isOpen || !monthData) return null;

  const formatCLP = (amount) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Calcular datos diarios del mes
  const dailyData = useMemo(() => {
    if (!monthData) return [];

    const { mesNum, yearNum } = monthData;
    const daysInMonth = new Date(yearNum, mesNum + 1, 0).getDate();
    const days = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(yearNum, mesNum, day);
      const dayOrders = orders.filter(o => {
        if (!o.due_date) return false;
        const orderDate = new Date(o.due_date);
        return (
          orderDate.getDate() === day &&
          orderDate.getMonth() === mesNum &&
          orderDate.getFullYear() === yearNum
        );
      });

      const totalDay = dayOrders.reduce((sum, o) => sum + (o.total_price || 0), 0);
      const paidDay = dayOrders.reduce((sum, o) => sum + (o.total_paid || 0), 0);

      days.push({
        day,
        date: dayDate.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' }),
        total: totalDay,
        pagado: paidDay,
        pedidos: dayOrders.length
      });
    }

    return days;
  }, [monthData, orders]);

  // Filtrar pedidos del mes
  const monthOrders = useMemo(() => {
    if (!monthData) return [];
    const { mesNum, yearNum } = monthData;
    return orders.filter(o => {
      if (!o.due_date) return false;
      const orderDate = new Date(o.due_date);
      return orderDate.getMonth() === mesNum && orderDate.getFullYear() === yearNum;
    }).sort((a, b) => new Date(b.due_date) - new Date(a.due_date));
  }, [monthData, orders]);

  // Calcular métricas del mes
  const metrics = useMemo(() => {
    return {
      totalIngresos: monthData?.total || 0,
      totalPagado: monthData?.pagado || 0,
      totalPedidos: monthData?.pedidos || 0,
      ticketPromedio: monthData?.pedidos > 0 ? (monthData?.total || 0) / monthData.pedidos : 0
    };
  }, [monthData]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-3">
          <p className="font-semibold text-gray-900">{payload[0].payload.date}</p>
          <p className="text-sm text-gray-600">
            Facturación: <span className="font-medium text-blue-600">{formatCLP(payload[0].value)}</span>
          </p>
          <p className="text-sm text-gray-600">
            Cobrado: <span className="font-medium text-green-600">{formatCLP(payload[1]?.value || 0)}</span>
          </p>
          <p className="text-sm text-gray-600">
            Pedidos: <span className="font-medium">{payload[0].payload.pedidos}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{monthData?.mes}</h2>
            <p className="text-sm text-gray-500">Detalle día por día</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Métricas del mes */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Facturación Total</span>
              </div>
              <p className="text-2xl font-bold text-blue-900">{formatCLP(metrics.totalIngresos)}</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-900">Total Cobrado</span>
              </div>
              <p className="text-2xl font-bold text-green-900">{formatCLP(metrics.totalPagado)}</p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Package className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium text-purple-900">Pedidos</span>
              </div>
              <p className="text-2xl font-bold text-purple-900">{metrics.totalPedidos}</p>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-5 h-5 text-amber-600" />
                <span className="text-sm font-medium text-amber-900">Ticket Promedio</span>
              </div>
              <p className="text-2xl font-bold text-amber-900">{formatCLP(metrics.ticketPromedio)}</p>
            </div>
          </div>

          {/* Gráfica diaria */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Evolución Diaria</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="date" 
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="total" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Facturación"
                  dot={{ fill: '#3b82f6', r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="pagado" 
                  stroke="#22c55e" 
                  strokeWidth={2}
                  name="Cobrado"
                  dot={{ fill: '#22c55e', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Lista de pedidos del mes */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Pedidos del Mes ({monthOrders.length})
            </h3>
            <div className="max-h-96 overflow-y-auto">
              {monthOrders.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No hay pedidos en este mes</p>
              ) : (
                <div className="space-y-2">
                  {monthOrders.map(order => (
                    <div 
                      key={order.code}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">{order.code}</span>
                          <span className="text-sm text-gray-500">-</span>
                          <span className="text-sm text-gray-600">{order.client_name}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(order.due_date).toLocaleDateString('es-CL', { 
                            day: 'numeric', 
                            month: 'long', 
                            year: 'numeric' 
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{formatCLP(order.total_price || 0)}</p>
                        <p className="text-xs text-green-600">Pagado: {formatCLP(order.total_paid || 0)}</p>
                      </div>
                      <div className="ml-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          order.status === 'entregado' ? 'bg-green-100 text-green-800' :
                          order.status === 'listo' ? 'bg-blue-100 text-blue-800' :
                          order.status === 'producción' ? 'bg-yellow-100 text-yellow-800' :
                          order.status === 'diseño' ? 'bg-purple-100 text-purple-800' :
                          order.status === 'recibido' ? 'bg-cyan-100 text-cyan-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full md:w-auto px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
