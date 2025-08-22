// frontend/src/App.jsx
import React, { useEffect, useMemo, useState } from "react";
import Layout from "./components/Layout.jsx";              // 👈 faltaba
import Kanban from "./components/Kanban.jsx";
import NewOrderModal from "./components/NewOrderModal.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import { api } from "./lib/api.js";

// Helpers KPI
const isOverdue = (iso) => iso && new Date(iso) < new Date();
const isSoon = (iso) => {
  if (!iso) return false;
  const ms = new Date(iso).getTime() - Date.now();
  return ms > 0 && ms <= 48 * 60 * 60 * 1000; // 48h
};
function getKpis(orders){
  const k = { total: orders.length, recibido:0, en_proceso:0, listo:0, entregado:0, overdue:0, soon:0 };
  for (const o of orders) {
    if (k[o.status] !== undefined) k[o.status] += 1;
    if (isOverdue(o.due_date)) k.overdue += 1;
    else if (isSoon(o.due_date)) k.soon += 1;
  }
  return k;
}

export default function App() {
  // ⬇️ Hooks SOLO dentro del componente
  const [orders, setOrders] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [page, setPage] = useState("dashboard"); // "orders" si quieres abrir el kanban
  const [query, setQuery] = useState("");
  const [orderToEdit, setOrderToEdit] = useState(null);
  const [toast, setToast] = useState(null);

  const kpis = useMemo(() => getKpis(orders), [orders]);

  useEffect(() => { fetchOrders(); }, []);
  async function fetchOrders() {
    const data = await api.listOrders();
    setOrders(data);
  }

  async function handleChangeStatus(code, status) {
    // actualización optimista
    setOrders(prev => prev.map(o => o.code === code ? { ...o, status } : o));
    try { await api.updateStatus(code, status); }
    catch (err) { console.error(err); await fetchOrders(); }
  }

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  // Filtro para Pedidos
  function normalize(s=""){ return s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu,""); }
  const filtered = useMemo(() => (
    orders.filter(o => {
      const q = normalize(query);
      const hay = [o.code, o.client_name, o.title, o.description]
        .filter(Boolean).map(normalize).some(t => t.includes(q));
      return q === "" ? true : hay;
    })
  ), [orders, query]);

  return (
    <>
      {toast && (
        <div className={`fixed top-4 right-4 z-50 rounded-xl px-4 py-2 shadow-lg text-sm font-medium ${toast.type === "error" ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
          {toast.msg}
        </div>
      )}
      <Layout
        title={page === "dashboard" ? "Dashboard" : "Pedidos"}
        active={page}
        onNav={setPage}
        right={page === "orders" ? (
          <button
            onClick={() => { setShowNew(true); setShowEdit(false); }}
            className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
          >
            + Nuevo pedido
          </button>
        ) : null}
      >
        {page === "dashboard" && (
          <Dashboard kpis={kpis} orders={orders} />
        )}

        {page === "orders" && (
          <>
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

            <section className="mt-0">
              <Kanban
                orders={filtered}
                onChangeStatus={handleChangeStatus}
                onEditOrder={order => {
                  setOrderToEdit(order);
                  setShowEdit(true);
                  setShowNew(false);
                }}
              />
            </section>

            <NewOrderModal
              open={showNew}
              onClose={() => setShowNew(false)}
              onCreated={fetchOrders}
              onNotify={showToast}
            />
            <NewOrderModal
              open={showEdit}
              onClose={() => { setShowEdit(false); setOrderToEdit(null); }}
              onCreated={fetchOrders}
              order={orderToEdit}
              editMode={true}
              onNotify={showToast}
            />
          </>
        )}
      </Layout>
    </>
  );
}
