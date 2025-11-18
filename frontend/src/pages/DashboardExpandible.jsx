// frontend/src/pages/DashboardExpandible.jsx
// OPCIÓN 2: Vista expandida inline - El gráfico se expande mostrando desglose diario
import React, { useMemo, useState } from "react";
import { TrendingUp, DollarSign, CreditCard, AlertCircle, Calendar, Users, Package, X, ChevronDown, ChevronUp } from "lucide-react";
import { ComposedChart, Bar, Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Paleta de colores consistente
const COLORS = {
  facturacion: "#64748b",
  cobrado: "#22c55e",
  deuda: "#f59e0b",
  pedidos: "#ff6b00"
};

export default function DashboardExpandible({ orders = [] }) {
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [expandedMonth, setExpandedMonth] = useState(null); // Mes expandido para vista diaria
  
  const formatCLP = (amount) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Calcular KPIs financieros (igual que Dashboard original)
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
    
    let totalMesActual = 0;
    let pagadoMesActual = 0;
    let deudaMesActual = 0;
    let pedidosMesActual = 0;
    let clientesUnicos = new Set();
    let pedidosAtrasados = 0;
    
    if (selectedMonth === null) {
      orders.forEach(order => {
        if (order.due_date) {
          const orderDate = new Date(order.due_date);
          totalMesActual += order.total_price || 0;
          pagadoMesActual += order.total_paid || 0;
          deudaMesActual += order.pending_amount || 0;
          pedidosMesActual++;
          if (order.client_name) clientesUnicos.add(order.client_name);
          
          const estadosExcluidos = ['entregado', 'cancelado', 'listo'];
          if (!estadosExcluidos.includes(order.status) && orderDate < now) {
            pedidosAtrasados++;
          }
        }
      });
    } else {
      const mesParaKPI = mesesConDatos[selectedMonth];
      const mesNumKPI = mesParaKPI?.mesNum ?? currentMonth;
      const yearNumKPI = mesParaKPI?.yearNum ?? currentYear;
      
      orders.forEach(order => {
        if (order.due_date) {
          const orderDate = new Date(order.due_date);
          if (orderDate.getMonth() === mesNumKPI && orderDate.getFullYear() === yearNumKPI) {
            totalMesActual += order.total_price || 0;
            pagadoMesActual += order.total_paid || 0;
            deudaMesActual += order.pending_amount || 0;
            pedidosMesActual++;
            if (order.client_name) clientesUnicos.add(order.client_name);
            
            const estadosExcluidos = ['entregado', 'cancelado', 'listo'];
            if (!estadosExcluidos.includes(order.status) && orderDate < now) {
              pedidosAtrasados++;
            }
          }
        }
      });
    }
    
    const mesSeleccionado = selectedMonth !== null && mesesConDatos[selectedMonth]
      ? mesesConDatos[selectedMonth].mes
      : null;
    
    return {
      totalMesActual,
      pagadoMesActual,
      deudaMesActual,
      pedidosMesActual,
      clientesUnicos: clientesUnicos.size,
      pedidosAtrasados,
      mesesData: mesesConDatos,
      promedioTicket: pedidosMesActual > 0 ? totalMesActual / pedidosMesActual : 0,
      mesSeleccionado
    };
  }, [orders, selectedMonth]);

  // Calcular datos diarios cuando hay mes expandido
  const dailyData = useMemo(() => {
    if (expandedMonth === null) return [];
    
    const mesData = kpis.mesesData[expandedMonth];
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
  }, [expandedMonth, kpis.mesesData, orders]);

  const cards = [
    {
      label: selectedMonth === null ? "Facturación Total" : "Facturación del Mes",
      value: formatCLP(kpis.totalMesActual),
      icon: DollarSign,
      color: "slate",
      bgColor: "bg-slate-50",
      textColor: "text-slate-700",
      borderColor: "border-slate-300",
      description: `${kpis.pedidosMesActual} pedido(s)`
    },
    {
      label: "Ingresos Reales",
      value: formatCLP(kpis.pagadoMesActual),
      icon: TrendingUp,
      color: "green",
      bgColor: "bg-green-50",
      textColor: "text-green-700",
      borderColor: "border-green-300",
      description: `${kpis.totalMesActual > 0 ? Math.round((kpis.pagadoMesActual / kpis.totalMesActual) * 100) : 0}% cobrado`
    },
    {
      label: "Deuda Pendiente",
      value: formatCLP(kpis.deudaMesActual),
      icon: CreditCard,
      color: "amber",
      bgColor: "bg-amber-50",
      textColor: "text-amber-700",
      borderColor: "border-amber-300",
      description: selectedMonth === null ? `Por cobrar total` : `Por cobrar este mes`
    },
    {
      label: "Promedio por Pedido",
      value: formatCLP(kpis.promedioTicket),
      icon: Package,
      color: "purple",
      bgColor: "bg-purple-50",
      textColor: "text-purple-700",
      borderColor: "border-purple-300",
      description: `Ticket promedio`
    },
    {
      label: selectedMonth === null ? "Total Clientes" : "Clientes del Mes",
      value: kpis.clientesUnicos,
      icon: Users,
      color: "indigo",
      bgColor: "bg-indigo-50",
      textColor: "text-indigo-700",
      borderColor: "border-indigo-300",
      description: selectedMonth === null ? `Clientes únicos` : `Este mes`
    },
    {
      label: "Pedidos Atrasados",
      value: kpis.pedidosAtrasados,
      icon: AlertCircle,
      color: kpis.pedidosAtrasados > 0 ? "rose" : "slate",
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
            <span className="ml-3 text-sm font-normal px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
              Opción 2: Vista Expandible
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {selectedMonth === null 
              ? "Acumulado Total hasta la fecha"
              : `Resumen de ${kpis.mesSeleccionado}`
            }
            {expandedMonth !== null && (
              <span className="ml-2 text-blue-600 font-medium">
                • Viendo: {kpis.mesesData[expandedMonth]?.mes}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Calendar className="w-4 h-4" />
          <span>Actualizado: {new Date().toLocaleDateString('es-CL')}</span>
        </div>
      </div>

      {/* Filtro de Meses */}
      {kpis.mesesData.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <Calendar className="w-5 h-5 text-slate-600" />
            <h3 className="text-sm font-semibold text-slate-700">
              Filtrar por período - Haz clic para expandir detalle diario
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setSelectedMonth(null);
                setExpandedMonth(null);
              }}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                selectedMonth === null
                  ? 'bg-slate-700 text-white shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              📊 Todo el período
            </button>
            {kpis.mesesData.map((mes, idx) => (
              <button
                key={idx}
                onClick={() => {
                  // Toggle expand: si ya está expandido, colapsar; si no, expandir
                  if (expandedMonth === idx) {
                    setExpandedMonth(null);
                  } else {
                    setExpandedMonth(idx);
                  }
                }}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all capitalize group ${
                  expandedMonth === idx
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                📅 {mes.mes}
                <span className="ml-2 text-xs opacity-75">({mes.pedidos})</span>
                {expandedMonth === idx ? (
                  <ChevronUp className="w-4 h-4 inline-block ml-1" />
                ) : (
                  <ChevronDown className="w-4 h-4 inline-block ml-1 opacity-50 group-hover:opacity-100" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

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
                  <p className="text-sm font-medium opacity-80 ${card.textColor}">{card.label}</p>
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

      {/* Gráfica de tendencias mensuales */}
      <section className={`rounded-xl border-2 border-slate-200 bg-white p-6 transition-all ${
        expandedMonth !== null ? 'opacity-50' : 'opacity-100'
      }`}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-slate-600" />
            Evolución Financiera Mensual
          </h3>
        </div>
        
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
              stroke={COLORS.facturacion}
            />
            <YAxis 
              yAxisId="right" 
              orientation="right"
              tick={{ fontSize: 12, fill: COLORS.pedidos }}
              stroke={COLORS.pedidos}
            />
            <Tooltip 
              formatter={(value, name) => {
                if (name === 'Facturación total' || name === 'Monto cobrado') {
                  return formatCLP(value);
                }
                return value;
              }}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
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

      {/* Gráfica EXPANDIDA - Detalle diario */}
      {expandedMonth !== null && dailyData.length > 0 && (
        <section className="rounded-xl border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-white p-6 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold flex items-center gap-2 text-blue-900">
                📊 Detalle Día por Día - {kpis.mesesData[expandedMonth]?.mes}
              </h3>
              <p className="text-sm text-blue-600 mt-1">
                {dailyData.filter(d => d.pedidos > 0).length} días con actividad
              </p>
            </div>
            <button
              onClick={() => setExpandedMonth(null)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors"
            >
              <ChevronUp className="w-4 h-4" />
              Colapsar
            </button>
          </div>

          {/* Gráfico de línea diario */}
          <div className="mb-6">
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
                  contentStyle={{ 
                    borderRadius: '8px', 
                    border: '2px solid #3b82f6',
                    backgroundColor: 'white'
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
                  activeDot={{ r: 6 }}
                />
                <Line 
                  type="monotone"
                  dataKey="pagado"
                  stroke={COLORS.cobrado}
                  strokeWidth={3}
                  name="Cobrado"
                  dot={{ fill: COLORS.cobrado, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Tabla de pedidos del mes */}
          <div className="bg-white rounded-lg border border-blue-200 overflow-hidden">
            <div className="bg-blue-100 px-4 py-3 border-b border-blue-200">
              <h4 className="font-semibold text-blue-900">
                Pedidos del mes ({kpis.mesesData[expandedMonth]?.pedidos})
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
                      const mesData = kpis.mesesData[expandedMonth];
                      return (
                        orderDate.getMonth() === mesData.mesNum &&
                        orderDate.getFullYear() === mesData.yearNum
                      );
                    })
                    .sort((a, b) => new Date(b.due_date) - new Date(a.due_date))
                    .map(order => (
                      <tr key={order.id} className="border-b border-slate-100 hover:bg-blue-50">
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
                          <span className="px-2 py-1 text-xs rounded-full bg-slate-100 text-slate-700">
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Info badge */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>💡 Opción 2:</strong> Haz clic en cualquier mes para expandir la vista diaria inline. 
          El gráfico mensual se atenúa y aparece el detalle completo. 
          Los filtros se mantienen activos con indicador "Viendo: [Mes]".
        </p>
      </div>
    </div>
  );
}
