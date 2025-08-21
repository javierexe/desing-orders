import React, { useState } from "react";

const NAV = [
  { label: "Dashboard", key: "dashboard" },
  { label: "Pedidos", key: "orders" },
  { label: "Clientes", key: "clients" },
  { label: "Reportes", key: "reports" },
  { label: "Configuración", key: "settings" },
];

export default function Layout({ title = "Design Orders", right, children, active = "orders" }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="grid min-h-screen grid-cols-1 bg-slate-50 text-slate-800 lg:grid-cols-[260px_1fr]">
      {/* Sidebar desktop */}
      <aside className="hidden border-r border-slate-200 bg-white p-4 lg:block">
        <div className="mb-6 flex items-center gap-2 text-xl font-bold">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sky-600 text-white">DO</span>
          Design Orders
        </div>
        <nav className="space-y-1 text-sm">
          {NAV.map((item) => {
            const isActive = active === item.key;
            return (
              <a
                key={item.key}
                href="#"
                className={`flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-slate-100 ${
                  isActive ? "bg-slate-100 font-medium" : ""
                }`}
              >
                <span>•</span> {item.label}
              </a>
            );
          })}
        </nav>
      </aside>

      {/* Off-canvas mobile */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-slate-200 bg-white p-4 transition-transform lg:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xl font-bold">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sky-600 text-white">DO</span>
            Design Orders
          </div>
          <button onClick={() => setOpen(false)} className="rounded-lg p-2 hover:bg-slate-100">✕</button>
        </div>
        <nav className="space-y-1 text-sm">
          {NAV.map((item) => {
            const isActive = active === item.key;
            return (
              <a
                key={item.key}
                href="#"
                onClick={() => setOpen(false)}
                className={`block rounded-xl px-3 py-2 hover:bg-slate-100 ${
                  isActive ? "bg-slate-100 font-medium" : ""
                }`}
              >
                {item.label}
              </a>
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
        {/* Desktop: botón principal */}
        <div className="hidden lg:block">{right}</div>

        {/* Chip usuario (oculto en xs) */}
        <div className="hidden items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-sm sm:flex">
            <span className="h-6 w-6 rounded-full bg-sky-300" />
            Javier
        </div>
        </div>
    </div>

    {/* Mobile: botón principal bajo el título */}
    <div className="mt-3 flex gap-2 lg:hidden">
        {right}
    </div>
    </div>


        {children}
      </div>
    </div>
  );
}
