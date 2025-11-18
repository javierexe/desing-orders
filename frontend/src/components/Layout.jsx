// frontend/src/components/Layout.jsx
import React, { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

export default function Layout({
  title = "Design Orders",
  right = null,
  children,
  // props legacy, no necesarios con router:
  active,          // eslint-disable-line
  onNav = () => {},// eslint-disable-line
}) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Detectar si estamos en alguna versión del dashboard
  const isDashboard = location.pathname.includes('/dashboard');
  const currentDashboard = location.pathname;

  const NAV = [
    { label: "Dashboard", key: "dashboard", path: "/dashboard" },
    { label: "Pedidos",   key: "orders",    path: "/pedidos" },
    { label: "Tabla de Pedidos", key: "orders-table", path: "/tabla-pedidos" },
    { label: "Productos", key: "products", path: "/admin/products" },
    { label: "Clientes",  key: "clients",   path: "/admin/clients" },
    { label: "Reportes",  key: "reports",   path: "/reportes" },
    { label: "Configuración", key: "settings", path: "/configuracion" },
  ];

  const baseItem =
    "block w-full text-left rounded-xl px-3 py-2 hover:bg-slate-100";
  const activeItem = "bg-slate-100 font-medium";
  const disabledItem = "opacity-50 cursor-not-allowed";

  return (
    <div className="grid min-h-screen grid-cols-1 bg-slate-50 text-slate-800 lg:grid-cols-[260px_1fr]">
      {/* Sidebar desktop */}
      <aside className="hidden border-r border-slate-200 bg-white p-4 lg:block">
        <div className="mb-6 flex items-center gap-2">
          <img className="inline-flex items-center justify-center w-auto" src="/images/ISOLOGOTIPO.svg" alt="Logo cliente"/>
        </div>
        <nav className="space-y-1 text-sm">
          {NAV.map(item => (
            <NavLink
              key={item.key}
              to={item.disabled ? "#" : item.path}
              className={({ isActive }) =>
                [
                  "w-full text-left flex items-center gap-2 rounded-xl px-3 py-2",
                  isActive ? activeItem : "hover:bg-slate-100",
                  item.disabled ? disabledItem : "",
                ].join(" ")
              }
              onClick={(e) => {
                if (item.disabled) e.preventDefault();
              }}
              end
            >
              <span>•</span> {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Selector de versión Dashboard - Solo desktop */}
        {isDashboard && (
          <div className="mt-6 pt-6 border-t border-slate-200">
            <p className="text-xs font-semibold text-slate-500 mb-2 px-3">
              🧪 Comparar Versiones
            </p>
            <div className="space-y-1">
              <button
                onClick={() => navigate('/dashboard')}
                className={`w-full text-left text-xs px-3 py-2 rounded-lg ${
                  currentDashboard === '/dashboard' 
                    ? 'bg-blue-100 text-blue-700 font-medium' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="font-semibold">Opción 1:</span> Modal/Overlay
              </button>
              <button
                onClick={() => navigate('/dashboard-expandible')}
                className={`w-full text-left text-xs px-3 py-2 rounded-lg ${
                  currentDashboard === '/dashboard-expandible' 
                    ? 'bg-blue-100 text-blue-700 font-medium' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="font-semibold">Opción 2:</span> Expandible
              </button>
              <button
                onClick={() => navigate('/dashboard-tabs')}
                className={`w-full text-left text-xs px-3 py-2 rounded-lg ${
                  currentDashboard === '/dashboard-tabs' 
                    ? 'bg-blue-100 text-blue-700 font-medium' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="font-semibold">Opción 3:</span> Con Tabs
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Backdrop móvil */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar móvil (off-canvas) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-slate-200 bg-white p-4 transition-transform lg:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-l font-bold">
            <img className="inline-flex items-center justify-center w-10" src="/images/fondotransparente.png" alt="Logo cliente"/>
            Gestión de Pedidos
          </div>
          <button onClick={() => setOpen(false)} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Cerrar">✕</button>
        </div>
        <nav className="space-y-1 text-sm">
          {NAV.map(item => (
            <NavLink
              key={item.key}
              to={item.disabled ? "#" : item.path}
              className={({ isActive }) =>
                [
                  baseItem,
                  isActive ? activeItem : "",
                  item.disabled ? disabledItem : "",
                ].join(" ")
              }
              onClick={(e) => {
                if (item.disabled) e.preventDefault();
                setOpen(false);
              }}
              end
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Selector de versión Dashboard - Solo móvil */}
        {isDashboard && (
          <div className="mt-6 pt-6 border-t border-slate-200">
            <p className="text-xs font-semibold text-slate-500 mb-2 px-3">
              🧪 Comparar Versiones
            </p>
            <div className="space-y-1">
              <button
                onClick={() => {
                  navigate('/dashboard');
                  setOpen(false);
                }}
                className={`w-full text-left text-xs px-3 py-2 rounded-lg ${
                  currentDashboard === '/dashboard' 
                    ? 'bg-blue-100 text-blue-700 font-medium' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="font-semibold">Opción 1:</span> Modal/Overlay
              </button>
              <button
                onClick={() => {
                  navigate('/dashboard-expandible');
                  setOpen(false);
                }}
                className={`w-full text-left text-xs px-3 py-2 rounded-lg ${
                  currentDashboard === '/dashboard-expandible' 
                    ? 'bg-blue-100 text-blue-700 font-medium' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="font-semibold">Opción 2:</span> Expandible
              </button>
              <button
                onClick={() => {
                  navigate('/dashboard-tabs');
                  setOpen(false);
                }}
                className={`w-full text-left text-xs px-3 py-2 rounded-lg ${
                  currentDashboard === '/dashboard-tabs' 
                    ? 'bg-blue-100 text-blue-700 font-medium' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="font-semibold">Opción 3:</span> Con Tabs
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Main */}
      <div className="w-full p-0 sm:p-4 lg:p-6">
        {/* Top bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 lg:hidden"
                onClick={() => setOpen(true)}
                aria-label="Abrir menú"
              >
                ☰
              </button>
              <h1 className="text-2xl font-semibold">{title}</h1>
            </div>

            <div className="flex items-center gap-3">
              {/* Desktop: acción derecha */}
              <div className="hidden lg:block">{right}</div>

              {/* Chip usuario (placeholder) */}
              <div className="hidden items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-sm sm:flex">
                <span className="h-6 w-6 rounded-full bg-sky-300" />
                Javier
              </div>
            </div>
          </div>

          {/* Mobile: acción derecha bajo título */}
          <div className="mt-3 flex gap-2 lg:hidden">
            {right}
          </div>
        </div>

        {/* Page content */}
        {children}
      </div>
    </div>
  );
}
