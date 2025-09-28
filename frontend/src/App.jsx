// frontend/src/App.jsx
import React, { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Kanban from "./components/Kanban.jsx";
import NewOrderModal from "./components/NewOrderModal.jsx";
import PreviewModal from "./components/PreviewModal.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import { api } from "./lib/api.js";

// Helpers KPI
const isOverdue = (iso) => iso && new Date(iso) < new Date();
const isSoon = (iso) => {
  if (!iso) return false;
  const ms = new Date(iso).getTime() - Date.now();
  return ms > 0 && ms <= 48 * 60 * 60 * 1000; // 48h
};
function getKpis(orders) {
  const k = { total: orders.length, recibido: 0, en_proceso: 0, listo: 0, entregado: 0, overdue: 0, soon: 0 };
  for (const o of orders) {
    if (k[o.status] !== undefined) k[o.status] += 1;
    
    // Solo contar como atrasados los pedidos que no están entregados ni cancelados
    const isCompleted = o.status === "entregado" || o.status === "cancelado";
    if (isOverdue(o.due_date) && !isCompleted) k.overdue += 1;
    else if (isSoon(o.due_date) && !isCompleted) k.soon += 1;
  }
  return k;
}

// Normalizador para filtro
function normalize(s = "") {
  return s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function AppInner() {
  const navigate = useNavigate();

  // STATE
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [query, setQuery] = useState("");
  const [orderToEdit, setOrderToEdit] = useState(null);
  const [toast, setToast] = useState(null);

  const kpis = useMemo(() => getKpis(orders), [orders]);

  // DATA
  useEffect(() => { fetchOrders(); }, []);
  async function fetchOrders() {
    setLoading(true);
    try {
      const data = await api.listOrders();
      setOrders(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleChangeStatus(code, status) {
    try {
      const updateResult = await api.updateOrder(code, { status });
      
      // Actualizar el pedido específico con la respuesta del servidor
      setOrders(prev => prev.map(o => 
        o.code === code ? { ...o, ...updateResult } : o
      ));
    } catch (err) {
      console.error("❌ Error en handleChangeStatus:", err);
      // En caso de error, recargar todo
      const data = await api.listOrders();
      setOrders(data);
      showToast("No se pudo actualizar el estado", "error");
    }
  }

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  const filtered = useMemo(() => (
    orders.filter(o => {
      const q = normalize(query);
      const hay = [o.code, o.client_name, o.title, o.description]
        .filter(Boolean).map(normalize).some(t => t.includes(q));
      return q === "" ? true : hay;
    })
  ), [orders, query]);

  // Navegación desde Layout (mantiene tu API onNav existente)
  const handleNav = (p) => {
    if (p === "orders") navigate("/pedidos");
    else if (p === "dashboard") navigate("/dashboard");
  };

   // ✅ nuevo: eliminar
  async function handleDelete(order) {
    try {
      await api.deleteOrder(order.code);
      setOrders(prev => prev.filter(o => o.code !== order.code));
      showToast(`Pedido ${order.code} eliminado`, "success");
    } catch (err) {
      console.error(err);
      showToast("No se pudo eliminar el pedido", "error");
    }
  }

  return (
    <>
      {/* animations moved to CSS (src/index.css) */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 rounded-xl px-4 py-2 shadow-lg text-sm font-medium ${toast.type === "error" ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
          {toast.msg}
        </div>
      )}
      <Routes>
        {/* Redirección raíz a Pedidos */}
        <Route path="/" element={<Navigate to="/pedidos" replace />} />
        <Route
          path="/dashboard"
          element={
            <Layout title="Dashboard">
              <Dashboard kpis={kpis} orders={orders} />
            </Layout>
          }
        />
        <Route
          path="/pedidos"
          element={
            <Layout
              title="Pedidos"
              right={
                <button
                  onClick={() => { setShowNew(true); setShowEdit(false); }}
                  className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
                >
                  + Nuevo pedido
                </button>
              }
            >
              {/* Barra de búsqueda */}
              <div className="mb-4 flex items-center gap-2">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
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
              {/* Kanban */}
              <section className="mt-0">
                <Kanban
                  orders={filtered}
                  loading={loading}
                  onChangeStatus={handleChangeStatus}
                  onEditOrder={(order) => { setOrderToEdit(order); setShowEdit(true); }}
                  onDelete={handleDelete}
                />
              </section>
              {/* Modales: crear y editar */}
              <NewOrderModal
                open={showNew}
                onClose={() => setShowNew(false)}
                onCreated={fetchOrders}
                onNotify={showToast}
              />
              {showEdit && (
                <NewOrderModal
                  open={showEdit}
                  order={orderToEdit}
                  editMode={true}
                  onClose={() => { setShowEdit(false); setOrderToEdit(null); }}
                  onUpdated={fetchOrders}
                  onNotify={showToast}
                />
              )}
              {/* Global preview modal reachable via CustomEvent 'open-comprobante-preview' */}
              <PreviewModal />
            </Layout>
          }
        />
      </Routes>
    </>
  );
      }
      
      function App() {
        return (
          <BrowserRouter>
            <AppInner />
          </BrowserRouter>
        );
      }
      
      export default App;