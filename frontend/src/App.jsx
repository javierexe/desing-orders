import { useEffect, useMemo, useState } from "react";
import Kanban from "./components/Kanban.jsx";
import Layout from "./components/Layout.jsx";
import NewOrderModal from "./components/NewOrderModal.jsx";
import { api } from "./lib/api.js";

const STATUS_KEYS = ["recibido","en_progreso","listo","entregado"];

const isOverdue = (iso) => iso && new Date(iso) < new Date();
const isSoon = (iso) => {
  if (!iso) return false;
  const ms = new Date(iso).getTime() - Date.now();
  return ms > 0 && ms <= 48 * 60 * 60 * 1000; // 48h
};
function getKpis(orders){
  const k = { total: orders.length, recibido:0, en_progreso:0, listo:0, entregado:0, overdue:0, soon:0 };
  for (const o of orders) {
    if (k[o.status] !== undefined) k[o.status] += 1;
    if (isOverdue(o.due_date)) k.overdue += 1;
    else if (isSoon(o.due_date)) k.soon += 1;
  }
  return k;
}

export default function App() {
  const [orders, setOrders] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [query, setQuery] = useState("");

  const kpis = useMemo(() => getKpis(orders), [orders]);

  async function fetchOrders() {
    const data = await api.listOrders();
    setOrders(data);
  }

  async function handleChangeStatus(code, status) {
  // 1) actualización optimista — esto hace re-render y recalcula KPIs
  setOrders(prev => prev.map(o => o.code === code ? { ...o, status } : o));
  

  try {
    // 2) confirmación con backend
    await api.updateStatus(code, status);
  } catch (err) {
    console.error(err);
    // 3) rollback si falla
    await fetchOrders();
  }
}

  useEffect(() => { fetchOrders(); }, []);

function normalize(s=""){ return s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu,""); }

const filtered = orders.filter(o => {
  const q = normalize(query);
  const hay = [
    o.code, o.client_name, o.title, o.description
  ].filter(Boolean).map(normalize).some(t => t.includes(q));
  return q === "" ? true : hay;
});


  return (
    <Layout
      title="Pedidos"
      active="orders"
      right={
        <button
          onClick={() => setShowNew(true)}
          className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
        >
          + Nuevo pedido
        </button>
      }
    >
      <div className="mb-4 flex items-center gap-2">
        <input
          value={query}
          onChange={(e)=>setQuery(e.target.value)}
          placeholder="Buscar por código, cliente o título…"
          className="w-full max-w-md rounded-2xl border border-slate-300 bg-white px-4 py-2 outline-none focus:ring-2 focus:ring-sky-400"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
          >
            Limpiar
          </button>
        )}
      </div>


      {/* KPIs sobre pedidos */}
<section className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
  {(() => {
    const k = kpis;
    const cards = [
      { label: "Recibidos",    value: k.recibido,    icon: "📥",  subtle: true },
      { label: "En Progreso",  value: k.en_progreso, icon: "🛠️",  subtle: true },
      { label: "Listos",       value: k.listo,       icon: "✅",  subtle: true },
      { label: "Entregados",   value: k.entregado,   icon: "📦",  subtle: true },
      { label: "Atrasados",    value: k.overdue,     icon: "⏰",  danger: k.overdue > 0, hint: k.soon > 0 ? `Pronto: ${k.soon}` : "" },
    ];
    return cards.map((c, i) => (
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
    ));
  })()}
</section>



      {/* Kanban */}
      <section className="mt-0">
        <Kanban orders={filtered} onChangeStatus={handleChangeStatus} />
      </section>

      {/* Modal */}
      <NewOrderModal
        open={showNew}
        onClose={() => setShowNew(false)}
        onCreated={fetchOrders}
      />
    </Layout>
  );
}
