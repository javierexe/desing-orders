// frontend/src/pages/Dashboard.jsx
import React, { useMemo, useState } from "react";
import { TrendingUp, DollarSign, CreditCard, AlertCircle, Calendar, Users, Package, X, ChevronRight, ChevronDown } from "lucide-react";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import MonthDetailModal from '../components/MonthDetailModal';

// Paleta de colores consistente
const COLORS = {
  facturacion: "#64748b",  // Gris azulado
  cobrado: "#22c55e",      // Verde
  deuda: "#f59e0b",        // Amber/Naranja
  pedidos: "#ff6b00"       // Naranja brillante para línea
};

export default function Dashboard({ orders = [] }) {
  // Inicializar con el mes actual (último índice de mesesConDatos)
  const [selectedMonth, setSelectedMonth] = useState('current'); // 'current' = mes actual, null = todo el período
  const [modalMonthData, setModalMonthData] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const formatCLP = (amount) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Calcular KPIs financieros
  const kpis = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Datos por mes (últimos 6 meses) usando due_date
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
    
    // Filtrar solo meses con datos
    const mesesConDatos = mesesData.filter(m => m.pedidos > 0);
    
    let totalMesActual = 0;
    let pagadoMesActual = 0;
    let deudaMesActual = 0;
    let pedidosMesActual = 0;
    let clientesUnicos = new Set();
    let pedidosAtrasados = 0;
    
    // Determinar qué mes mostrar
    // selectedMonth === null → Todo el período
    // selectedMonth === 'current' → Mes actual (último con datos)
    // selectedMonth === número → Mes específico
    let mesNumKPI, yearNumKPI;
    
    if (selectedMonth === null) {
      // TODO EL PERÍODO: Acumulado total
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
      // MES ESPECÍFICO o MES ACTUAL
      if (selectedMonth === 'current') {
        // Mes actual (usar currentMonth y currentYear)
        mesNumKPI = currentMonth;
        yearNumKPI = currentYear;
      } else {
        // Mes seleccionado por índice
        const mesParaKPI = mesesConDatos[selectedMonth];
        mesNumKPI = mesParaKPI?.mesNum ?? currentMonth;
        yearNumKPI = mesParaKPI?.yearNum ?? currentYear;
      }
      
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
    
    // Calcular cambios respecto al mes anterior
    const indiceActual = selectedMonth === 'current' 
      ? mesesConDatos.length - 1 
      : (selectedMonth !== null ? selectedMonth : mesesConDatos.length - 1);
    const mesAnterior = indiceActual > 0 ? mesesConDatos[indiceActual - 1] : null;
    
    const cambioTotal = mesAnterior && mesAnterior.total > 0 
      ? ((totalMesActual - mesAnterior.total) / mesAnterior.total) * 100 
      : null;
    
    const cambioPagado = mesAnterior && mesAnterior.pagado > 0 
      ? ((pagadoMesActual - mesAnterior.pagado) / mesAnterior.pagado) * 100 
      : null;
    
    const cambioDeuda = mesAnterior && mesAnterior.pendiente > 0 
      ? ((deudaMesActual - mesAnterior.pendiente) / mesAnterior.pendiente) * 100 
      : null;
    
    // Determinar el nombre del mes seleccionado
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
      mesSeleccionado,
      cambioTotal,
      cambioPagado,
      cambioDeuda
    };
  }, [orders, selectedMonth]);

  const cards = [
    {
      label: selectedMonth === null ? "Facturación Total" : "Facturación del Mes",
      value: formatCLP(kpis.totalMesActual),
      icon: DollarSign,
      color: "slate",
      bgColor: "bg-slate-50",
      textColor: "text-slate-700",
      borderColor: "border-slate-300",
      description: `${kpis.pedidosMesActual} pedido(s)`,
      cambio: kpis.cambioTotal,
      invertido: false
    },
    {
      label: "Ingresos Reales",
      value: formatCLP(kpis.pagadoMesActual),
      icon: TrendingUp,
      color: "green",
      bgColor: "bg-green-50",
      textColor: "text-green-700",
      borderColor: "border-green-300",
      description: `${kpis.totalMesActual > 0 ? Math.round((kpis.pagadoMesActual / kpis.totalMesActual) * 100) : 0}% cobrado`,
      cambio: kpis.cambioPagado,
      invertido: false
    },
    {
      label: "Deuda Pendiente",
      value: formatCLP(kpis.deudaMesActual),
      icon: CreditCard,
      color: "amber",
      bgColor: "bg-amber-50",
      textColor: "text-amber-700",
      borderColor: "border-amber-300",
      description: selectedMonth === null ? `Por cobrar total` : `Por cobrar este mes`,
      cambio: kpis.cambioDeuda,
      invertido: true // Para deuda, disminución es bueno
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
          <h1 className="text-2xl font-bold text-slate-800">Dashboard Financiero</h1>
          <p className="text-sm text-slate-500 mt-1">
            {selectedMonth === null 
              ? "Acumulado Total hasta la fecha"
              : selectedMonth === 'current'
              ? `Mes actual: ${new Date().toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}`
              : `Resumen de ${kpis.mesSeleccionado || new Date().toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}`
            }
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Calendar className="w-4 h-4" />
          <span>Actualizado: {new Date().toLocaleDateString('es-CL')}</span>
        </div>
      </div>

      {/* Filtro de Meses - Pills */}
      {kpis.mesesData.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <Calendar className="w-5 h-5 text-slate-600" />
            <h3 className="text-sm font-semibold text-slate-700">Filtrar por período</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedMonth(null)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                selectedMonth === null
                  ? 'bg-slate-700 text-white shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              📊 Todo el período
            </button>
            <button
              onClick={() => setSelectedMonth('current')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                selectedMonth === 'current'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              📅 Mes actual
            </button>
            {kpis.mesesData.map((mes, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setModalMonthData(mes);
                  setIsModalOpen(true);
                }}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all capitalize group ${
                  selectedMonth === idx
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                📅 {mes.mes}
                <span className="ml-2 text-xs opacity-75">({mes.pedidos})</span>
                <ChevronRight className="w-4 h-4 inline-block ml-1 opacity-50 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          const tieneCambio = card.cambio !== null && card.cambio !== undefined;
          const esPositivo = card.invertido ? card.cambio < 0 : card.cambio > 0;
          
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
                  
                  {/* Indicador de cambio */}
                  {tieneCambio && (
                    <div className={`flex items-center gap-1 mt-2 text-xs font-semibold ${
                      esPositivo ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {esPositivo ? '↑' : '↓'}
                      <span>{Math.abs(card.cambio).toFixed(1)}%</span>
                      <span className="opacity-60">vs anterior</span>
                    </div>
                  )}
                </div>
                <div className="p-3 rounded-lg bg-white/50">
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Gráfica de tendencias */}
      <section className="rounded-xl border-2 border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-slate-600" />
            Evolución Financiera
            {selectedMonth !== null && (
              <span className="text-sm font-normal text-blue-600">
                ({kpis.mesSeleccionado})
              </span>
            )}
          </h3>
          {selectedMonth !== null && (
            <button
              onClick={() => setSelectedMonth(null)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
              Limpiar filtro
            </button>
          )}
        </div>
        
        {/* Gráfico Recharts */}
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart 
            data={kpis.mesesData}
            onClick={(data) => {
              if (data && data.activeTooltipIndex !== undefined) {
                setSelectedMonth(data.activeTooltipIndex);
              }
            }}
            barGap={-45}
          >
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
                if (name === 'Facturación total' || name === 'Monto cobrado' || name === 'Deuda pendiente') {
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
              name="Cantidad de pedidos"
              dot={{ fill: COLORS.pedidos, r: 6, strokeWidth: 2, stroke: '#fff' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
        
        <div className="text-slate-500 text-xs text-center mt-4">
          💡 Haz clic en un mes para filtrar los KPIs
        </div>
      </section>

      {/* Tabla de tendencias mensuales */}
      <section className="rounded-xl border-2 border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-slate-600" />
            Tendencia Últimos 6 Meses
            {selectedMonth !== null && (
              <span className="text-sm font-normal text-blue-600">
                ({kpis.mesSeleccionado})
              </span>
            )}
          </h3>
          {selectedMonth !== null && (
            <button
              onClick={() => setSelectedMonth(null)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
              Limpiar filtro
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 font-semibold text-slate-700">Mes</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-700">Pedidos</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-700">Facturación</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-700">Cobrado</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-700">Pendiente</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-700">% Cobro</th>
              </tr>
            </thead>
            <tbody>
              {kpis.mesesData.map((mes, idx) => {
                const porcentajeCobro = mes.total > 0 ? Math.round((mes.pagado / mes.total) * 100) : 0;
                const esSeleccionado = selectedMonth === idx;
                
                return (
                  <tr 
                    key={idx} 
                    className={`border-b border-slate-100 transition-all group ${
                      esSeleccionado 
                        ? 'bg-blue-50 border-l-4 border-l-blue-500' 
                        : idx % 2 === 0 
                          ? 'hover:bg-slate-50' 
                          : 'bg-slate-50/50 hover:bg-slate-100'
                    } cursor-pointer`}
                    onClick={() => {
                      setModalMonthData(mes);
                      setIsModalOpen(true);
                    }}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {esSeleccionado ? (
                          <ChevronDown className="w-4 h-4 text-blue-600" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                        )}
                        <span className={`capitalize ${esSeleccionado ? 'font-semibold text-blue-700' : ''}`}>
                          {mes.mes}
                        </span>
                        {esSeleccionado && (
                          <span className="ml-2 text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">
                            Activo
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-full bg-slate-200 text-slate-700 text-xs font-medium">
                        {mes.pedidos}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold" style={{ color: COLORS.facturacion }}>{formatCLP(mes.total)}</td>
                    <td className="py-3 px-4 text-right" style={{ color: COLORS.cobrado }}>{formatCLP(mes.pagado)}</td>
                    <td className="py-3 px-4 text-right" style={{ color: COLORS.deuda }}>{formatCLP(mes.pendiente)}</td>
                    <td className="py-3 px-4 text-right">
                      {/* Barra visual de % cobro */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${
                              porcentajeCobro >= 80 ? 'bg-green-500' :
                              porcentajeCobro >= 50 ? 'bg-amber-500' :
                              'bg-rose-500'
                            }`}
                            style={{ width: `${porcentajeCobro}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium w-10 text-right">{porcentajeCobro}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-semibold">
                <td className="py-3 px-4">Total</td>
                <td className="py-3 px-4 text-right">
                  {kpis.mesesData.reduce((sum, m) => sum + m.pedidos, 0)}
                </td>
                <td className="py-3 px-4 text-right" style={{ color: COLORS.facturacion }}>
                  {formatCLP(kpis.mesesData.reduce((sum, m) => sum + m.total, 0))}
                </td>
                <td className="py-3 px-4 text-right" style={{ color: COLORS.cobrado }}>
                  {formatCLP(kpis.mesesData.reduce((sum, m) => sum + m.pagado, 0))}
                </td>
                <td className="py-3 px-4 text-right" style={{ color: COLORS.deuda }}>
                  {formatCLP(kpis.mesesData.reduce((sum, m) => sum + m.pendiente, 0))}
                </td>
                <td className="py-3 px-4 text-right">
                  {kpis.mesesData.reduce((sum, m) => sum + m.total, 0) > 0
                    ? Math.round((kpis.mesesData.reduce((sum, m) => sum + m.pagado, 0) / kpis.mesesData.reduce((sum, m) => sum + m.total, 0)) * 100)
                    : 0}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* Nota informativa */}
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-700">
        <p className="font-medium">📊 Información de cálculo</p>
        <p className="mt-1 text-blue-600">
          Los montos se calculan en base a la fecha de vencimiento (due_date). 
          Haz clic en cualquier mes para ver el <strong>detalle día por día</strong> con gráfica de evolución y lista de pedidos.
          Los pedidos atrasados son aquellos cuya fecha de vencimiento ya pasó y no están entregados.
        </p>
      </div>

      {/* Modal de detalle mensual */}
      <MonthDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        monthData={modalMonthData}
        orders={orders}
      />
    </div>
  );
}
