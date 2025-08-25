import React, { useState } from "react";

export default function Layout({
  title = "Design Orders",
  right = null,
  children,
  active = "orders",          // "dashboard" | "orders" | ...
  onNav = () => {},           // (key) => void
}) {
  const [open, setOpen] = useState(false);

  const NAV = [
    { label: "Dashboard", key: "dashboard" },
    { label: "Pedidos",   key: "orders" },
    { label: "Clientes",  key: "clients", disabled: true },
    { label: "Reportes",  key: "reports", disabled: true },
    { label: "Configuración", key: "settings", disabled: true },
  ];

  return (
    <div className="grid min-h-screen grid-cols-1 bg-slate-50 text-slate-800 lg:grid-cols-[260px_1fr]">
      {/* Sidebar desktop */}
      <aside className="hidden border-r border-slate-200 bg-white p-4 lg:block">
        <div className="mb-6 flex items-center gap-2">
          <img className="inline-flex items-center justify-center w-auto" src="/images/ISOLOGOTIPO.svg" alt="Logo cliente"/>
        </div>
        <nav className="space-y-1 text-sm">
          {NAV.map(item => {
            const isActive = active === item.key;
            return (
              <button
                key={item.key}
                onClick={() => !item.disabled && onNav(item.key)}
                className={`w-full text-left flex items-center gap-2 rounded-xl px-3 py-2
                  ${isActive ? "bg-slate-100 font-medium" : "hover:bg-slate-100"}
                  ${item.disabled ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <span>•</span> {item.label}
              </button>
            );
          })}
        </nav>
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
          {NAV.map(item => {
            const isActive = active === item.key;
            return (
              <button
                key={item.key}
                onClick={() => { if (!item.disabled) { onNav(item.key); setOpen(false); } }}
                className={`block w-full text-left rounded-xl px-3 py-2
                  ${isActive ? "bg-slate-100 font-medium" : "hover:bg-slate-100"}
                  ${item.disabled ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main */}
      <div className="p-4 lg:p-6">
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
