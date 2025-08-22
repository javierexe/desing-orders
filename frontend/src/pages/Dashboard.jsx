// frontend/src/pages/Dashboard.jsx
export default function Dashboard({ kpis = {}, orders = [] }) {
  const cards = [
    { label: "Recibidos",   value: kpis.recibido || 0,   icon: "📥" },
    { label: "En Progreso", value: kpis.en_progreso || 0,icon: "🛠️" },
    { label: "Listos",      value: kpis.listo || 0,      icon: "✅" },
    { label: "Entregados",  value: kpis.entregado || 0,  icon: "📦" },
    { label: "Atrasados",   value: kpis.overdue || 0,    icon: "⏰", danger: (kpis.overdue||0) > 0, hint: (kpis.soon||0) > 0 ? `Pronto: ${kpis.soon}` : "" },
  ];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {cards.map((c, i) => (
          <div
            key={i}
            className={[
              "rounded-2xl border bg-white p-4 shadow-sm",
              c.danger ? "border-rose-300 ring-1 ring-rose-200" : "border-slate-200",
            ].join(" ")}
          >
            <div className="flex items-center justify-between">
              <div className="text-2xl">{c.icon}</div>
              <div className={["text-2xl font-semibold", c.danger ? "text-rose-600" : "text-slate-800"].join(" ")}>
                {c.value}
              </div>
            </div>
            <div className="mt-1 text-sm text-slate-600">{c.label}</div>
            {c.hint && <div className="mt-1 text-xs text-amber-700">⚠️ {c.hint}</div>}
          </div>
        ))}
      </section>

      {/* (Opcional) últimos pedidos */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-lg font-semibold">Últimos pedidos</h3>
        <ul className="divide-y divide-slate-100">
          {orders.slice(0,5).map(o => (
            <li key={o.code} className="py-2 text-sm">
              <span className="font-medium text-slate-800">{o.title}</span>
              <span className="text-slate-500"> · {o.client_name}</span>
              {o.due_date && <span className="text-slate-500"> · vence {o.due_date}</span>}
            </li>
          ))}
          {orders.length === 0 && <li className="py-2 text-sm text-slate-500">Sin pedidos aún.</li>}
        </ul>
      </section>
    </div>
  );
}
