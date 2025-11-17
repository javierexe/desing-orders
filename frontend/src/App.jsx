// frontend/src/App.jsx
import React, { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Kanban from "./components/Kanban.jsx";
import NewOrderModal from "./components/NewOrderModal.jsx";
import PreviewModal from "./components/PreviewModal.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ProductAdmin from "./pages/ProductAdmin.jsx";
import ClientAdmin from "./pages/ClientAdmin.jsx";
import { ConfirmDialogProvider } from "./components/ConfirmDialog.jsx";
import { api } from "./lib/api.js";
import { startKeepalive, stopKeepalive } from "./utils/keepalive.js";

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

  // KEEPALIVE: Mantener backend de Render despierto
  useEffect(() => {
    startKeepalive();
    return () => stopKeepalive();
  }, []);

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

  // Callback para cuando se actualiza un pedido desde el modal
  function handleOrderUpdated(updatedOrder) {
    // Actualizar la lista de pedidos
    setOrders(prev => prev.map(o => 
      o.code === updatedOrder.code ? { ...o, ...updatedOrder } : o
    ));
    
    // Mostrar toast si el status cambió automáticamente
    if (updatedOrder.auto_status_changed) {
      const totalPaidFormatted = parseInt(updatedOrder.total_paid || 0).toLocaleString('es-CL', {
        style: 'currency',
        currency: 'CLP'
      });
      showToast(`✅ Pedido ${updatedOrder.code} movido automáticamente a "Recibido" (abono: ${totalPaidFormatted})`, "success");
    }
  }

  async function handleChangeStatus(code, status) {
    try {
      const updateResult = await api.updateOrder(code, { status });
      
      // Actualizar el pedido específico con la respuesta del servidor
      setOrders(prev => prev.map(o => 
        o.code === code ? { ...o, ...updateResult } : o
      ));
      
      // Mostrar toast si el status cambió automáticamente de pre-pedido a recibido
      if (updateResult.auto_status_changed) {
        const totalPaidFormatted = parseInt(updateResult.total_paid || 0).toLocaleString('es-CL', {
          style: 'currency',
          currency: 'CLP'
        });
        showToast(`✅ Pedido ${code} movido automáticamente a "Recibido" (abono: ${totalPaidFormatted})`, "success");
      }
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
    setTimeout(() => setToast(null), 5000);
  }

  const filtered = useMemo(() => (
    orders.filter(o => {
      const q = normalize(query);
      const hay = [o.code, o.client_name, o.title, o.description]
        .filter(Boolean).map(normalize).some(t => t.includes(q));
      return q === "" ? true : hay;
    })
  ), [orders, query]);

  // Navegación desde Layout
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
        {/* Redirección raíz a Dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route
          path="/dashboard"
          element={
            <Layout title="Dashboard">
              <Dashboard orders={orders} />
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
                  onUpdated={handleOrderUpdated}
                  onNotify={showToast}
                />
              )}
              {/* Global preview modal reachable via CustomEvent 'open-comprobante-preview' */}
              <PreviewModal />
            </Layout>
          }
        />
        <Route
          path="/admin/products"
          element={
            <Layout title="Productos">
              <ProductAdmin />
            </Layout>
          }
        />
        <Route
          path="/admin/clients"
          element={
            <Layout title="Clientes">
              <ClientAdmin />
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
            <ConfirmDialogProvider>
              <AppInner />
            </ConfirmDialogProvider>
          </BrowserRouter>
        );
      }
      
      export default App;