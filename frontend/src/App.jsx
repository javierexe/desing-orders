import { useEffect, useState } from "react";
import Kanban from "./components/Kanban.jsx";
import Layout from "./components/Layout.jsx";
import NewOrderModal from "./components/NewOrderModal.jsx";
import { api } from "./lib/api.js";

const STATUS_KEYS = ["recibido","en_progreso","listo","entregado"];

function getKpis(orders){
  const counts = { total: orders.length, recibido:0, en_progreso:0, listo:0, entregado:0 };
  for (const o of orders) if (counts[o.status] !== undefined) counts[o.status] += 1;
  return counts;
}


export default function App() {
  const [orders, setOrders] = useState([]);
  const [showNew, setShowNew] = useState(false);

  async function fetchOrders() {
    const data = await api.listOrders();
    setOrders(data);
  }

  async function handleChangeStatus(code, status) {
    setOrders(prev => prev.map(o => o.code === code ? { ...o, status } : o));
    try { await api.updateStatus(code, status); }
    catch (err) { console.error(err); await fetchOrders(); }
  }

  useEffect(() => { fetchOrders(); }, []);

  const [query, setQuery] = useState("");

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
      <section className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {(() => {
          const k = getKpis(orders);
          const cards = [
            { label: "Recibidos", value: k.recibido, icon: "📥" },
            { label: "En Progreso", value: k.en_progreso, icon: "🛠️" },
            { label: "Listos", value: k.listo, icon: "✅" },
            { label: "Entregados", value: k.entregado, icon: "📦" },
            // Si quieres un 5º KPI de Total, agrega:
            // { label: "Total", value: k.total, icon: "Σ" },
          ];
          return cards.map((c, i) => (
            <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="text-2xl">{c.icon}</div>
                <div className="text-2xl font-semibold">{c.value}</div>
              </div>
            <div className="mt-1 text-sm text-slate-600">{c.label}</div>
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
