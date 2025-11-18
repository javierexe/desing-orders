// frontend/src/pages/DashboardTabs.jsx
// OPCIÓN 3: Dashboard con Tabs - Separación clara de contextos
import React, { useMemo, useState } from "react";
import { TrendingUp, DollarSign, CreditCard, AlertCircle, Calendar, Users, Package, BarChart3, FileText } from "lucide-react";
import { ComposedChart, Bar, Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = {
  facturacion: "#64748b",
  cobrado: "#22c55e",
  deuda: "#f59e0b",
  pedidos: "#ff6b00"
};

export default function DashboardTabs({ orders = [] }) {
  const [activeTab, setActiveTab] = useState('kanban'); // 'kanban', 'analisis', 'estadisticas'
  const [selectedMonth, setSelectedMonth] = useState(null);
  
  const formatCLP = (amount) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Calcular KPIs
  const kpis = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const mesesData = [];
    for (let i = 5; i >= 0; i--) {
      const mes = new Date(currentYear, currentMonth - i, 1);
      const mesNum = mes.getMonth();
      const yearNum = mes.getFullYear();
      
      const pedidosDelMes = orders.filter(o => {
        if (!o.due_date) return false;
        const orderDate = new Date(o.due_date);
        return orderDate.getMonth() === mesNum && orderDate.getFullYear() === yearNum;
      });
      
      const totalMes = pedidosDelMes.reduce((sum, o) => sum + (o.total_price || 0), 0);
      const pagadoMes = pedidosDelMes.reduce((sum, o) => sum + (o.total_paid || 0), 0);
      
      mesesData.push({
        mes: mes.toLocaleDateString('es-CL', { month: 'short', year: 'numeric' }),
        total: totalMes,
        pagado: pagadoMes,
        pendiente: totalMes - pagadoMes,
        pedidos: pedidosDelMes.length,
        mesNum,
        yearNum
      });
    }
    
    const mesesConDatos = mesesData.filter(m => m.pedidos > 0);
    
    let totalGeneral = 0;
    let pagadoGeneral = 0;
    let deudaGeneral = 0;
    let pedidosGeneral = 0;
    let clientesUnicos = new Set();
    let pedidosAtrasados = 0;
    
    orders.forEach(order => {
      if (order.due_date) {
        const orderDate = new Date(order.due_date);
        totalGeneral += order.total_price || 0;
        pagadoGeneral += order.total_paid || 0;
        deudaGeneral += order.pending_amount || 0;
        pedidosGeneral++;
        if (order.client_name) clientesUnicos.add(order.client_name);
        
        const estadosExcluidos = ['entregado', 'cancelado', 'listo'];
        if (!estadosExcluidos.includes(order.status) && orderDate < now) {
          pedidosAtrasados++;
        }
      }
    });
    
    return {
      totalGeneral,
      pagadoGeneral,
      deudaGeneral,
      pedidosGeneral,
      clientesUnicos: clientesUnicos.size,
      pedidosAtrasados,
      mesesData: mesesConDatos,
      promedioTicket: pedidosGeneral > 0 ? totalGeneral / pedidosGeneral : 0
    };
  }, [orders]);

  // Calcular datos diarios cuando hay mes seleccionado (Tab Análisis)
  const dailyData = useMemo(() => {
    if (selectedMonth === null || activeTab !== 'analisis') return [];
    
    const mesData = kpis.mesesData[selectedMonth];
    if (!mesData) return [];
    
    const { mesNum, yearNum } = mesData;
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
  }, [selectedMonth, activeTab, kpis.mesesData, orders]);

  const tabs = [
    { id: 'kanban', label: 'Resumen', icon: BarChart3 },
    { id: 'analisis', label: 'Análisis Mensual', icon: Calendar },
    { id: 'estadisticas', label: 'Estadísticas', icon: FileText }
  ];

  const cards = [
    {
      label: "Facturación Total",
      value: formatCLP(kpis.totalGeneral),
      icon: DollarSign,
      bgColor: "bg-slate-50",
      textColor: "text-slate-700",
      borderColor: "border-slate-300",
      description: `${kpis.pedidosGeneral} pedido(s)`
    },
    {
      label: "Ingresos Reales",
      value: formatCLP(kpis.pagadoGeneral),
      icon: TrendingUp,
      bgColor: "bg-green-50",
      textColor: "text-green-700",
      borderColor: "border-green-300",
      description: `${kpis.totalGeneral > 0 ? Math.round((kpis.pagadoGeneral / kpis.totalGeneral) * 100) : 0}% cobrado`
    },
    {
      label: "Deuda Pendiente",
      value: formatCLP(kpis.deudaGeneral),
      icon: CreditCard,
      bgColor: "bg-amber-50",
      textColor: "text-amber-700",
      borderColor: "border-amber-300",
      description: `Por cobrar`
    },
    {
      label: "Promedio por Pedido",
      value: formatCLP(kpis.promedioTicket),
      icon: Package,
      bgColor: "bg-purple-50",
      textColor: "text-purple-700",
      borderColor: "border-purple-300",
      description: `Ticket promedio`
    },
    {
      label: "Total Clientes",
      value: kpis.clientesUnicos,
      icon: Users,
      bgColor: "bg-indigo-50",
      textColor: "text-indigo-700",
      borderColor: "border-indigo-300",
      description: `Clientes únicos`
    },
    {
      label: "Pedidos Atrasados",
      value: kpis.pedidosAtrasados,
      icon: AlertCircle,
      bgColor: kpis.pedidosAtrasados > 0 ? "bg-rose-50" : "bg-slate-50",
      textColor: kpis.pedidosAtrasados > 0 ? "text-rose-700" : "text-slate-700",
      borderColor: kpis.pedidosAtrasados > 0 ? "border-rose-300" : "border-slate-300",
      description: kpis.pedidosAtrasados > 0 ? "Requieren atención" : "Todo al día"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Dashboard Financiero
            <span className="ml-3 text-sm font-normal px-3 py-1 bg-purple-100 text-purple-700 rounded-full">
              Opción 3: Con Pestañas
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Navegación por contextos separados
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Calendar className="w-4 h-4" />
          <span>Actualizado: {new Date().toLocaleDateString('es-CL')}</span>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white rounded-xl border-2 border-slate-200 p-2">
        <div className="flex gap-2">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium text-sm transition-all ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content: Resumen (Kanban) */}
      {activeTab === 'kanban' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            {cards.map((card, idx) => {
              const Icon = card.icon;
              return (
                <div
                  key={idx}
                  className={`rounded-xl border-2 p-6 ${card.bgColor} ${card.borderColor} transition-all hover:shadow-lg`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium opacity-80">{card.label}</p>
                      <p className={`text-3xl font-bold mt-2 ${card.textColor}`}>{card.value}</p>
                      <p className="text-xs mt-2 opacity-70">{card.description}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-white/50">
                      <Icon className="w-6 h-6" />
                    </div>
                  </div>
                </div>
              );
            })}
          </section>

          {/* Gráfica mensual */}
          <section className="rounded-xl border-2 border-slate-200 bg-white p-6">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-6">
              <TrendingUp className="w-5 h-5 text-slate-600" />
              Evolución Financiera
            </h3>
            
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={kpis.mesesData} barGap={-45}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="mes" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => value.split(' ')[0]}
                />
                <YAxis 
                  yAxisId="left"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right"
                  tick={{ fontSize: 12, fill: COLORS.pedidos }}
                />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === 'Facturación total' || name === 'Monto cobrado') {
                      return formatCLP(value);
                    }
                    return value;
                  }}
                />
                <Legend />
                <Bar 
                  yAxisId="left"
                  dataKey="total" 
                  fill={COLORS.facturacion}
                  name="Facturación total"
                  radius={[8, 8, 0, 0]}
                  barSize={60}
                />
                <Bar 
                  yAxisId="left"
                  dataKey="pagado" 
                  fill={COLORS.cobrado}
                  name="Monto cobrado"
                  radius={[8, 8, 0, 0]}
                  barSize={60}
                />
                <Line 
                  yAxisId="right"
                  type="monotone"
                  dataKey="pedidos"
                  stroke={COLORS.pedidos}
                  strokeWidth={3}
                  name="Nº Pedidos"
                  dot={{ fill: COLORS.pedidos, r: 5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </section>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-800">
              ✅ Vista actual del negocio. Cambia a <strong>"Análisis Mensual"</strong> para ver detalles por día.
            </p>
          </div>
        </div>
      )}

      {/* Tab Content: Análisis Mensual */}
      {activeTab === 'analisis' && (
        <div className="space-y-6">
          {/* Selector de mes */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">
              Selecciona un mes para ver el análisis diario
            </h3>
            <div className="flex flex-wrap gap-2">
              {kpis.mesesData.map((mes, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedMonth(idx)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all capitalize ${
                    selectedMonth === idx
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  📅 {mes.mes} ({mes.pedidos})
                </button>
              ))}
            </div>
          </div>

          {/* Detalle diario */}
          {selectedMonth !== null && dailyData.length > 0 ? (
            <>
              <section className="rounded-xl border-2 border-blue-300 bg-white p-6">
                <h3 className="text-xl font-bold text-blue-900 mb-4">
                  📊 Evolución Diaria - {kpis.mesesData[selectedMonth]?.mes}
                </h3>
                
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#bfdbfe" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 11 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                    />
                    <Tooltip 
                      formatter={(value, name) => {
                        if (name === 'Facturación' || name === 'Cobrado') {
                          return formatCLP(value);
                        }
                        return value;
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone"
                      dataKey="total"
                      stroke={COLORS.facturacion}
                      strokeWidth={3}
                      name="Facturación"
                      dot={{ fill: COLORS.facturacion, r: 4 }}
                    />
                    <Line 
                      type="monotone"
                      dataKey="pagado"
                      stroke={COLORS.cobrado}
                      strokeWidth={3}
                      name="Cobrado"
                      dot={{ fill: COLORS.cobrado, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </section>

              {/* Tabla de pedidos */}
              <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-100 px-4 py-3 border-b">
                  <h4 className="font-semibold text-slate-900">
                    Pedidos del mes ({kpis.mesesData[selectedMonth]?.pedidos})
                  </h4>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium text-slate-700">Código</th>
                        <th className="px-4 py-2 text-left font-medium text-slate-700">Cliente</th>
                        <th className="px-4 py-2 text-left font-medium text-slate-700">Vencimiento</th>
                        <th className="px-4 py-2 text-right font-medium text-slate-700">Total</th>
                        <th className="px-4 py-2 text-right font-medium text-slate-700">Pagado</th>
                        <th className="px-4 py-2 text-center font-medium text-slate-700">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders
                        .filter(o => {
                          if (!o.due_date) return false;
                          const orderDate = new Date(o.due_date);
                          const mesData = kpis.mesesData[selectedMonth];
                          return (
                            orderDate.getMonth() === mesData.mesNum &&
                            orderDate.getFullYear() === mesData.yearNum
                          );
                        })
                        .sort((a, b) => new Date(b.due_date) - new Date(a.due_date))
                        .map(order => (
                          <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="px-4 py-3 font-mono text-xs">{order.code}</td>
                            <td className="px-4 py-3">{order.client_name}</td>
                            <td className="px-4 py-3 text-sm">
                              {new Date(order.due_date).toLocaleDateString('es-CL')}
                            </td>
                            <td className="px-4 py-3 text-right font-medium">
                              {formatCLP(order.total_price || 0)}
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-green-600">
                              {formatCLP(order.total_paid || 0)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="px-2 py-1 text-xs rounded-full bg-slate-100">
                                {order.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-12 text-center">
              <Calendar className="w-16 h-16 mx-auto text-slate-400 mb-4" />
              <p className="text-slate-600">
                Selecciona un mes arriba para ver el análisis día por día
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Estadísticas */}
      {activeTab === 'estadisticas' && (
        <div className="space-y-6">
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Por estado */}
            <div className="bg-white rounded-xl border-2 border-slate-200 p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Pedidos por Estado
              </h3>
              <div className="space-y-3">
                {['pre-pedido', 'recibido', 'diseño', 'producción', 'listo', 'entregado'].map(status => {
                  const count = orders.filter(o => o.status === status).length;
                  const total = orders.filter(o => o.status === status).reduce((sum, o) => sum + (o.total_price || 0), 0);
                  return (
                    <div key={status} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="font-medium capitalize">{status}</span>
                      <div className="text-right">
                        <p className="font-bold text-slate-900">{count}</p>
                        <p className="text-xs text-slate-500">{formatCLP(total)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top clientes */}
            <div className="bg-white rounded-xl border-2 border-slate-200 p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Top 5 Clientes
              </h3>
              <div className="space-y-3">
                {Object.entries(
                  orders.reduce((acc, order) => {
                    const client = order.client_name || 'Sin nombre';
                    if (!acc[client]) acc[client] = 0;
                    acc[client] += order.total_price || 0;
                    return acc;
                  }, {})
                )
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([client, total], idx) => (
                    <div key={client} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{client}</p>
                      </div>
                      <p className="font-bold text-blue-600">{formatCLP(total)}</p>
                    </div>
                  ))}
              </div>
            </div>
          </section>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <p className="text-sm text-purple-800">
              📊 Estadísticas generales del negocio. Exporta reportes desde aquí.
            </p>
          </div>
        </div>
      )}

      {/* Info badge */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <p className="text-sm text-purple-800">
          <strong>💡 Opción 3:</strong> Navegación por pestañas que separa claramente cada contexto.
          <strong> Resumen</strong> = vista general, 
          <strong> Análisis Mensual</strong> = drill-down por mes, 
          <strong> Estadísticas</strong> = reportes generales.
        </p>
      </div>
    </div>
  );
}
