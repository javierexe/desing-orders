// frontend/src/pages/Dashboard.jsx// frontend/src/pages/Dashboard.jsx

import React, { useMemo } from "react";export default function Dashboard({ kpis = {}, orders = [] }) {

import { TrendingUp, DollarSign, CreditCard, AlertCircle, Calendar, Users, Package } from "lucide-react";  const cards = [

    { label: "Recibidos",   value: kpis.recibido || 0,   icon: "📥" },

export default function Dashboard({ orders = [] }) {    { label: "En proceso", value: kpis.en_proceso || 0,icon: "🛠️" },

  // Función para formatear montos en CLP    { label: "Listos",      value: kpis.listo || 0,      icon: "✅" },

  const formatCLP = (amount) => {    { label: "Entregados",  value: kpis.entregado || 0,  icon: "📦" },

    return new Intl.NumberFormat('es-CL', {    { label: "Atrasados",   value: kpis.overdue || 0,    icon: "⏰", danger: (kpis.overdue||0) > 0, hint: (kpis.soon||0) > 0 ? `Pronto: ${kpis.soon}` : "" },

      style: 'currency',  ];

      currency: 'CLP',

      minimumFractionDigits: 0,  return (

      maximumFractionDigits: 0    <div className="space-y-6">

    }).format(amount);      {/* KPIs */}

  };      <section className="grid grid-cols-2 gap-3 md:grid-cols-5">

        {cards.map((c, i) => (

  // Calcular KPIs financieros          <div

  const kpis = useMemo(() => {            key={i}

    const now = new Date();            className={[

    const currentMonth = now.getMonth();              "rounded-2xl border bg-white p-4 shadow-sm",

    const currentYear = now.getFullYear();              c.danger ? "border-rose-300 ring-1 ring-rose-200" : "border-slate-200",

                ].join(" ")}

    let totalMesActual = 0;          >

    let pagadoMesActual = 0;            <div className="flex items-center justify-between">

    let deudaMesActual = 0;              <div className="text-2xl">{c.icon}</div>

    let pedidosMesActual = 0;              <div className={["text-2xl font-semibold", c.danger ? "text-rose-600" : "text-slate-800"].join(" ")}>

    let clientesUnicos = new Set();                {c.value}

    let pedidosAtrasados = 0;              </div>

                </div>

    // Datos por mes (últimos 6 meses)            <div className="mt-1 text-sm text-slate-600">{c.label}</div>

    const mesesData = [];            {c.hint && <div className="mt-1 text-xs text-amber-700">⚠️ {c.hint}</div>}

    for (let i = 5; i >= 0; i--) {          </div>

      const mes = new Date(currentYear, currentMonth - i, 1);        ))}

      const mesNum = mes.getMonth();      </section>

      const yearNum = mes.getFullYear();

            {/* (Opcional) últimos pedidos */}

      const pedidosDelMes = orders.filter(o => {      <section className="rounded-2xl border border-slate-200 bg-white p-4">

        if (!o.created_at) return false;        <h3 className="mb-3 text-lg font-semibold">Últimos pedidos</h3>

        const orderDate = new Date(o.created_at);        <ul className="divide-y divide-slate-100">

        return orderDate.getMonth() === mesNum && orderDate.getFullYear() === yearNum;          {orders.slice(0,5).map(o => (

      });            <li key={o.code} className="py-2 text-sm">

                    <span className="font-medium text-slate-800">{o.title}</span>

      const totalMes = pedidosDelMes.reduce((sum, o) => sum + (o.total_price || 0), 0);              <span className="text-slate-500"> · {o.client_name}</span>

      const pagadoMes = pedidosDelMes.reduce((sum, o) => sum + (o.total_paid || 0), 0);              {o.due_date && <span className="text-slate-500"> · vence en: {o.due_date}</span>}

                  </li>

      mesesData.push({          ))}

        mes: mes.toLocaleDateString('es-CL', { month: 'short', year: 'numeric' }),          {orders.length === 0 && <li className="py-2 text-sm text-slate-500">Sin pedidos aún.</li>}

        total: totalMes,        </ul>

        pagado: pagadoMes,      </section>

        pendiente: totalMes - pagadoMes,    </div>

        pedidos: pedidosDelMes.length  );

      });}

    }
    
    // KPIs del mes actual
    orders.forEach(order => {
      if (order.created_at) {
        const orderDate = new Date(order.created_at);
        if (orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear) {
          totalMesActual += order.total_price || 0;
          pagadoMesActual += order.total_paid || 0;
          deudaMesActual += order.pending_amount || 0;
          pedidosMesActual++;
          if (order.client_name) clientesUnicos.add(order.client_name);
        }
      }
      
      // Pedidos atrasados (no entregados y fecha vencida)
      if (order.status !== 'entregado' && order.due_date) {
        const dueDate = new Date(order.due_date);
        if (dueDate < now) {
          pedidosAtrasados++;
        }
      }
    });
    
    return {
      totalMesActual,
      pagadoMesActual,
      deudaMesActual,
      pedidosMesActual,
      clientesUnicos: clientesUnicos.size,
      pedidosAtrasados,
      mesesData,
      promedioTicket: pedidosMesActual > 0 ? totalMesActual / pedidosMesActual : 0
    };
  }, [orders]);

  const cards = [
    {
      label: "Facturación Mes Actual",
      value: formatCLP(kpis.totalMesActual),
      icon: DollarSign,
      color: "blue",
      description: `${kpis.pedidosMesActual} pedido(s)`
    },
    {
      label: "Ingresos Reales",
      value: formatCLP(kpis.pagadoMesActual),
      icon: TrendingUp,
      color: "green",
      description: `${kpis.pagadoMesActual > 0 ? Math.round((kpis.pagadoMesActual / kpis.totalMesActual) * 100) : 0}% cobrado`
    },
    {
      label: "Deuda Pendiente",
      value: formatCLP(kpis.deudaMesActual),
      icon: CreditCard,
      color: "amber",
      description: `Por cobrar este mes`
    },
    {
      label: "Promedio por Pedido",
      value: formatCLP(kpis.promedioTicket),
      icon: Package,
      color: "purple",
      description: `Ticket promedio`
    },
    {
      label: "Clientes Activos",
      value: kpis.clientesUnicos,
      icon: Users,
      color: "indigo",
      description: `Este mes`
    },
    {
      label: "Pedidos Atrasados",
      value: kpis.pedidosAtrasados,
      icon: AlertCircle,
      color: kpis.pedidosAtrasados > 0 ? "rose" : "slate",
      description: kpis.pedidosAtrasados > 0 ? "Requieren atención" : "Todo al día"
    }
  ];

  const colorClasses = {
    blue: "bg-blue-50 text-blue-600 border-blue-200",
    green: "bg-green-50 text-green-600 border-green-200",
    amber: "bg-amber-50 text-amber-600 border-amber-200",
    purple: "bg-purple-50 text-purple-600 border-purple-200",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-200",
    rose: "bg-rose-50 text-rose-600 border-rose-200",
    slate: "bg-slate-50 text-slate-600 border-slate-200"
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard Financiero</h1>
          <p className="text-sm text-slate-500 mt-1">
            Resumen de {new Date().toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Calendar className="w-4 h-4" />
          <span>Actualizado: {new Date().toLocaleDateString('es-CL')}</span>
        </div>
      </div>

      {/* KPI Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className={`rounded-xl border-2 p-6 ${colorClasses[card.color]} transition-all hover:shadow-lg`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium opacity-80">{card.label}</p>
                  <p className="text-3xl font-bold mt-2">{card.value}</p>
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

      {/* Tabla de tendencias mensuales */}
      <section className="rounded-xl border-2 border-slate-200 bg-white p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-slate-600" />
          Tendencia Últimos 6 Meses
        </h3>
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
                const esMesActual = idx === kpis.mesesData.length - 1;
                
                return (
                  <tr 
                    key={idx} 
                    className={`border-b border-slate-100 hover:bg-slate-50 ${esMesActual ? 'bg-blue-50 font-medium' : ''}`}
                  >
                    <td className="py-3 px-4">
                      {mes.mes}
                      {esMesActual && <span className="ml-2 text-xs bg-blue-500 text-white px-2 py-0.5 rounded">Actual</span>}
                    </td>
                    <td className="py-3 px-4 text-right">{mes.pedidos}</td>
                    <td className="py-3 px-4 text-right font-semibold">{formatCLP(mes.total)}</td>
                    <td className="py-3 px-4 text-right text-green-600">{formatCLP(mes.pagado)}</td>
                    <td className="py-3 px-4 text-right text-amber-600">{formatCLP(mes.pendiente)}</td>
                    <td className="py-3 px-4 text-right">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        porcentajeCobro >= 80 ? 'bg-green-100 text-green-700' :
                        porcentajeCobro >= 50 ? 'bg-amber-100 text-amber-700' :
                        'bg-rose-100 text-rose-700'
                      }`}>
                        {porcentajeCobro}%
                      </span>
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
                <td className="py-3 px-4 text-right">
                  {formatCLP(kpis.mesesData.reduce((sum, m) => sum + m.total, 0))}
                </td>
                <td className="py-3 px-4 text-right text-green-600">
                  {formatCLP(kpis.mesesData.reduce((sum, m) => sum + m.pagado, 0))}
                </td>
                <td className="py-3 px-4 text-right text-amber-600">
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
          Los montos se calculan en base a la fecha de creación del pedido. 
          La deuda pendiente incluye todos los pedidos con saldo por cobrar del mes actual.
        </p>
      </div>
    </div>
  );
}
