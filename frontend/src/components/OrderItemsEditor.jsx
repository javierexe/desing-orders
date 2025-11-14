
import React from "react";
import { Trash, Copy } from "lucide-react";
import ProductAutocomplete from "./ProductAutocomplete";

function OrderItemsEditor({ items, editMode = false, manualEntryItemId, onManualEntryCleared, handleAdd, handleDelete, handleChange, handleClone }) {

  function handleProductSelect(idx, producto) {
    if (!producto) {
      // Si limpia el autocompletado, solo actualizar descripción
      handleChange(idx, "description", "");
      return;
    }

    // Actualizar descripción automáticamente
    handleChange(idx, "description", producto.nombre);
    
    // Calcular precio: precio_base × cantidad
    const cantidad = items[idx].quantity || 1;
    const precioTotal = producto.precio_base ? producto.precio_base * cantidad : 0;
    handleChange(idx, "price", precioTotal);
    
    // Guardar producto_id para referencia futura
    handleChange(idx, "producto_id", producto.id);
    
    // Guardar precio unitario para recálculos
    handleChange(idx, "precio_unitario", producto.precio_base);
  }

  function handleQuantityChange(idx, newQuantity) {
    const item = items[idx];
    handleChange(idx, "quantity", newQuantity);
    
    // Si tiene producto asociado con precio unitario, recalcular precio total
    if (item.precio_unitario) {
      const nuevoPrecio = item.precio_unitario * newQuantity;
      handleChange(idx, "price", Math.round(nuevoPrecio));
    }
  }
  // Helper para obtener hoy en formato YYYY-MM-DD
  function todayISO() {
    const t = new Date();
    const y = t.getFullYear();
    const m = String(t.getMonth() + 1).padStart(2, "0");
    const d = String(t.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  // Helper para verificar si una fecha es anterior a hoy
  function isBeforeTodayISO(iso) {
    return !!iso && iso < todayISO();
  }
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-md">Ítems del pedido</h4>
        <button type="button" onClick={handleAdd} className="rounded-xl bg-sky-100 px-3 py-1 text-sm font-medium text-sky-700 hover:bg-sky-200">+ Agregar ítem</button>
      </div>
      {items.length === 0 && <div className="text-sm text-slate-500">Sin ítems aún.</div>}
      {items.length > 0 && (
        <>
          {/* Header only on md+ to save space on mobile */}
          <div className="grid grid-cols-[2fr_0.7fr_1fr_1fr_1.2fr_1fr] gap-2 items-center text-sm font-semibold text-slate-600 mb-2 px-3">
            <div>Producto</div>
            <div className="text-center">Cant.</div>
            <div className="text-center">Precio Total</div>
            <div className="text-center">Abono</div>
            <div>Fecha Entrega</div>
            <div className="text-center">Acciones</div>
          </div>
        </>
      )}
      {items.map((item, idx) => ( 
        <div key={item.id || idx} className={`border p-1 rounded-lg border ${
          (item.price > 0 && item.paid_amount >= item.price) ? 'bg-green-50 border-green-200' : 
          (item.paid_amount > 0) ? 'bg-blue-50 border-blue-200' : 'bg-white border-blue-200'
        } shadow-sm`}>
          
          {/* Grid de campos del item */}
          <div className="grid grid-cols-1 md:grid-cols-[2fr_0.7fr_1fr_1fr_1.2fr_1fr] gap-1 items-center ">
            
            {/* Columna 1: Autocompletado de producto */}
            <label className="text-sm flex flex-col md:flex-row md:items-center">
              <span className="sr-only">Producto</span>
              <ProductAutocomplete
                value={item.description}
                onSelect={(producto) => handleProductSelect(idx, producto)}
                placeholder="Busca el producto..."
              />
            </label>

            {/* Columna 2: Cantidad */}
            <label className="text-sm flex flex-col md:flex-row md:items-center">
              <span className="sr-only">Cantidad</span>
              <input
                type="number"
                min={1}
                value={item.quantity}
                onChange={e => handleQuantityChange(idx, parseInt(e.target.value) || 1)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-center font-semibold"
              />
            </label>
            {/* Columna 3: Precio Total */}
            <label className="text-sm flex flex-col md:flex-row md:items-center">
              <span className="sr-only">Precio total</span>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 font-semibold">$</span>
                <input
                  type="text"
                  value={item.price ? parseInt(item.price).toLocaleString('es-CL') : ""}
                  onChange={e => {
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    handleChange(idx, "price", parseInt(value) || 0);
                  }}
                  className="w-full rounded-xl border border-slate-300 pl-7 pr-3 py-2 text-right font-semibold text-sm"
                  placeholder="0"
                />
              </div>
            </label>

            {/* Columna 4: Abono */}
            <label className="text-sm flex flex-col md:flex-row md:items-center">
              <span className="sr-only">Abono</span>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 font-semibold">$</span>
                <input
                  type="text"
                  value={item.paid_amount ? parseInt(item.paid_amount).toLocaleString('es-CL') : ""}
                  onChange={e => {
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    const numValuePesos = parseInt(value) || 0;
                    if (numValuePesos <= (item.price || 0)) {
                      if (manualEntryItemId && String(item.id) === String(manualEntryItemId) && onManualEntryCleared) {
                        onManualEntryCleared();
                      }
                      handleChange(idx, "paid_amount", numValuePesos);
                    }
                  }}
                  className={`w-full rounded-xl border pl-7 pr-3 py-2 text-right font-semibold text-sm transition-all duration-300 ${
                    manualEntryItemId && String(item.id) === String(manualEntryItemId)
                      ? 'border-orange-400 bg-orange-50 shadow-lg ring-2 ring-orange-200 animate-pulse'
                      : 'border-slate-300'
                  }`}
                  placeholder="0"
                  title={`Máximo: ${(parseInt(item.price) || 0).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}`}
                />
              </div>
            </label>

            {/* Columna 5: Fecha entrega */}
            <label className="text-sm flex flex-col md:flex-row md:items-center">
              <span className="sr-only">Fecha entrega</span>
              <input
                type="date"
                value={item.due_date}
                min={editMode ? undefined : todayISO()}
                onChange={e => handleChange(idx, "due_date", e.target.value)}
                className={`w-full rounded-xl border px-3 py-2 text-sm ${
                  editMode && item.due_date && isBeforeTodayISO(item.due_date)
                    ? 'border-amber-300 bg-amber-50'
                    : 'border-slate-300'
                }`}
                title={editMode && item.due_date && isBeforeTodayISO(item.due_date) ? 'Fecha en el pasado (edición permitida)' : ''}
                required
              />
            </label>

            {/* Columna 6: Acciones (Clonar y Eliminar) */}
            <div className="flex items-center justify-center gap-1">
              <button 
                type="button" 
                onClick={() => handleClone?.(idx)} 
                className="rounded-xl border border-sky-300 p-2 text-sky-700 hover:bg-sky-50 flex items-center justify-center transition-colors" 
                title="Clonar ítem"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button 
                type="button" 
                onClick={() => handleDelete(idx)} 
                className="rounded-xl border border-rose-300 p-2 text-rose-700 hover:bg-rose-50 flex items-center justify-center transition-colors" 
                title="Eliminar ítem"
              >
                <Trash className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default OrderItemsEditor;
