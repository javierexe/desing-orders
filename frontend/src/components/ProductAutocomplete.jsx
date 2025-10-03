import { useState, useEffect, useRef } from "react";
import { Search, Plus, Package, Tag, AlertCircle } from "lucide-react";
import { api } from "../lib/api";

// Cache global para productos (compartido entre todas las instancias)
let productosCache = null;
let loadingPromise = null;

export default function ProductAutocomplete({ onSelect, value, placeholder = "Buscar producto..." }) {
  const [productos, setProductos] = useState(productosCache || []);
  const [inputValue, setInputValue] = useState(value || "");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Cargar todos los productos al inicio (usando cache)
  useEffect(() => {
    loadProductos();
  }, []);

  // Actualizar input cuando cambia el valor externo
  useEffect(() => {
    if (value !== undefined) {
      setInputValue(value);
    }
  }, [value]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        inputRef.current &&
        !inputRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function loadProductos() {
    // Si ya tenemos productos en cache, usarlos
    if (productosCache) {
      setProductos(productosCache);
      console.log(`📦 Usando cache: ${productosCache.length} productos`);
      return;
    }

    // Si ya hay una carga en progreso, esperar a que termine
    if (loadingPromise) {
      try {
        const data = await loadingPromise;
        setProductos(data);
      } catch (error) {
        console.error("Error esperando productos:", error);
      }
      return;
    }

    // Iniciar nueva carga
    setLoading(true);
    loadingPromise = (async () => {
      try {
        console.log('🔄 Cargando productos desde API...');
        console.log('🌐 URL completa:', window.location.origin + '/api/productos');
        
        // api.get() retorna directamente los datos, no un objeto response
        const data = await api.get("/productos");
        
        console.log('📡 Data recibida:', {
          dataType: typeof data,
          isArray: Array.isArray(data),
          length: Array.isArray(data) ? data.length : 'N/A',
          sample: Array.isArray(data) && data.length > 0 ? data[0] : null
        });
        
        // Asegurar que siempre sea un array
        const productos = Array.isArray(data) ? data : [];
        productosCache = productos; // Guardar en cache
        setProductos(productos);
        
        // Log detallado para debug
        console.log(`✅ Productos cargados: ${productos.length} total`);
        const agendas = productos.filter(p => p.nombre && p.nombre.toLowerCase().includes('agenda'));
        console.log(`📘 Agendas encontradas: ${agendas.length}`, agendas.map(a => a.nombre));
        
        return productos;
      } catch (error) {
        console.error("❌ Error cargando productos:", error);
        console.error("❌ Detalles del error:", {
          message: error.message,
          stack: error.stack
        });
        const emptyData = [];
        productosCache = emptyData;
        setProductos(emptyData);
        return emptyData;
      } finally {
        setLoading(false);
        loadingPromise = null; // Limpiar la promesa
      }
    })();

    await loadingPromise;
  }

  // Filtrar productos basado en el input (búsqueda flexible)
  const sugerencias = (productos || []).filter(p => {
    if (!inputValue.trim()) return false;
    
    // Normalizar el término de búsqueda (sin tildes, minúsculas, trim)
    const searchTerm = inputValue
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, ""); // Remover tildes
    
    // Normalizar nombre del producto (campo principal de búsqueda)
    const nombreNormalizado = String(p.nombre || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    
    // Normalizar descripción
    const descripcionNormalizada = String(p.descripcion || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    
    // Normalizar categoría
    const categoriaNormalizada = String(p.categoria?.nombre || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    
    // DEBUG: Log para ver qué se está buscando (primeras búsquedas)
    if (searchTerm.length > 2 && Math.random() < 0.1) {
      console.log('🔍 Buscando:', searchTerm, '| Producto:', nombreNormalizado.substring(0, 30));
    }
    
    // Buscar coincidencias en cualquier campo
    const match = (
      nombreNormalizado.includes(searchTerm) ||
      descripcionNormalizada.includes(searchTerm) ||
      categoriaNormalizada.includes(searchTerm)
    );
    
    return match;
  }).slice(0, 8); // Limitar a 8 sugerencias

  // DEBUG: Log de sugerencias calculadas
  if (inputValue.trim() && sugerencias.length > 0) {
    console.log(`💡 ${sugerencias.length} sugerencias:`, sugerencias.map(s => s.nombre));
  } else if (inputValue.trim() && sugerencias.length === 0) {
    console.log(`❌ Sin sugerencias para "${inputValue}" | Total productos: ${productos.length}`);
  }

  function handleInputChange(e) {
    const newValue = e.target.value;
    setInputValue(newValue);
    setShowSuggestions(true);
    setSelectedIndex(-1);
    
    // DEBUG: Log de búsqueda
    if (newValue.trim().length > 0) {
      console.log(`🔍 Buscando: "${newValue}" en ${productos.length} productos`);
    }
    
    // Si el usuario borra todo, notificar al padre
    if (!newValue.trim()) {
      onSelect(null);
    }
  }

  function handleInputFocus() {
    if (inputValue.trim()) {
      setShowSuggestions(true);
    }
  }

  function handleProductSelect(producto) {
    setInputValue(producto.nombre);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    onSelect(producto);
  }

  function handleKeyDown(e) {
    if (!showSuggestions || !sugerencias || sugerencias.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex(prev => (prev < sugerencias.length - 1 ? prev + 1 : prev));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && sugerencias[selectedIndex]) {
          handleProductSelect(sugerencias[selectedIndex]);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  }

  function handleQuickCreate() {
    setShowQuickCreate(true);
  }

  async function handleSaveQuickProduct(formData) {
    try {
      const response = await api.post("/productos", formData);
      const nuevoProducto = response.data;
      
      // Agregar a la lista local y cache
      const nuevaLista = [...productos, nuevoProducto];
      setProductos(nuevaLista);
      productosCache = nuevaLista; // Actualizar cache
      
      // Seleccionar automáticamente
      handleProductSelect(nuevoProducto);
      setShowQuickCreate(false);
    } catch (error) {
      console.error("Error creando producto:", error);
      alert("Error al crear producto. Por favor intenta nuevamente.");
    }
  }

  return (
    <div className="relative w-full">
      {/* Input de búsqueda */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
          autoComplete="off"
        />
      </div>

      {/* Dropdown de sugerencias */}
      {showSuggestions && inputValue.trim() && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full min-w-[500px] mt-1 bg-white border border-slate-300 rounded-xl shadow-lg max-h-96 overflow-y-auto"
        >
          {loading ? (
            <div className="p-4 text-center text-slate-500">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-sky-600 mx-auto"></div>
            </div>
          ) : sugerencias.length > 0 ? (
            <div className="py-1">
              {sugerencias.map((producto, idx) => (
                <button
                  key={producto.id}
                  type="button"
                  onClick={() => handleProductSelect(producto)}
                  className={`w-full text-left px-4 py-3 hover:bg-sky-50 transition-colors border-b border-slate-100 last:border-b-0 ${
                    idx === selectedIndex ? "bg-sky-50" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm text-slate-800">
                        {producto.nombre}
                      </h4>
                      {producto.descripcion && (
                        <p className="text-xs text-slate-600 mt-0.5 line-clamp-1">
                          {producto.descripcion}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        {producto.categoria && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded-full text-xs text-slate-700">
                            <Tag size={10} />
                            {producto.categoria.nombre}
                          </span>
                        )}
                        {producto.presentacion && (
                          <span className="text-xs text-slate-500">
                            {producto.presentacion}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {producto.requiere_cotizacion ? (
                        <span className="text-xs font-semibold text-orange-600 bg-orange-100 px-2 py-1 rounded-full whitespace-nowrap">
                          Cotización
                        </span>
                      ) : (
                        <span className="text-sm font-bold text-slate-800 whitespace-nowrap">
                          ${producto.precio_base?.toLocaleString('es-CL')}
                        </span>
                      )}
                      {producto.unidad_medida && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          por {producto.unidad_medida}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4">
              <div className="text-center text-slate-500 mb-3">
                <AlertCircle size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">No se encontró "{inputValue}"</p>
                <p className="text-xs mt-1">¿Deseas crear este producto?</p>
              </div>
              <button
                type="button"
                onClick={handleQuickCreate}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
              >
                <Plus size={18} />
                Crear producto rápido
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal de creación rápida */}
      {showQuickCreate && (
        <QuickCreateProductModal
          initialName={inputValue}
          onSave={handleSaveQuickProduct}
          onCancel={() => setShowQuickCreate(false)}
        />
      )}
    </div>
  );
}

// Modal para crear producto rápidamente
function QuickCreateProductModal({ initialName, onSave, onCancel }) {
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    nombre: initialName || "",
    categoria_id: null,
    precio_base: null,
    requiere_cotizacion: false,
    descripcion: "",
    presentacion: "",
    unidad_medida: ""
  });

  useEffect(() => {
    loadCategorias();
  }, []);

  async function loadCategorias() {
    setLoading(true);
    try {
      // api.get() retorna directamente los datos, no un objeto response
      const data = await api.get("/categorias");
      setCategorias(Array.isArray(data) ? data : []);
      console.log('✅ Categorías cargadas:', data?.length || 0);
    } catch (error) {
      console.error("Error cargando categorías:", error);
      setCategorias([]); // Asegurar que siempre sea array
    } finally {
      setLoading(false);
    }
  }

  function handleChange(field, value) {
    setFormData(prev => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    
    // Validar que tenga nombre y categoría
    if (!formData.nombre.trim()) {
      alert("El nombre del producto es obligatorio");
      return;
    }
    
    // Si no requiere cotización, debe tener precio
    if (!formData.requiere_cotizacion && !formData.precio_base) {
      alert("Debes ingresar un precio o marcar 'Requiere cotización'");
      return;
    }

    onSave(formData);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 rounded-t-2xl">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Package size={20} className="text-sky-600" />
            Crear producto rápido
          </h3>
          <p className="text-xs text-slate-600 mt-1">
            Completa la información básica. Podrás editarlo después.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Nombre del producto *
            </label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => handleChange("nombre", e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="Ej: Polera personalizada XL"
              required
            />
          </div>

          {/* Categoría */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Categoría
            </label>
            <select
              value={formData.categoria_id || ""}
              onChange={(e) => handleChange("categoria_id", e.target.value ? parseInt(e.target.value) : null)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
              disabled={loading}
            >
              <option value="">{loading ? "Cargando..." : "Sin categoría"}</option>
              {(categorias || []).map(cat => (
                <option key={cat.id} value={cat.id}>{cat.nombre}</option>
              ))}
            </select>
          </div>

          {/* Requiere cotización */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="requiere_cotizacion"
              checked={formData.requiere_cotizacion}
              onChange={(e) => handleChange("requiere_cotizacion", e.target.checked)}
              className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
            />
            <label htmlFor="requiere_cotizacion" className="text-sm text-slate-700">
              Este producto requiere cotización
            </label>
          </div>

          {/* Precio base (solo si no requiere cotización) */}
          {!formData.requiere_cotizacion && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Precio base *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">$</span>
                <input
                  type="text"
                  value={formData.precio_base ? parseInt(formData.precio_base).toLocaleString('es-CL') : ""}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    handleChange("precio_base", parseInt(value) || null);
                  }}
                  className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="0"
                  required={!formData.requiere_cotizacion}
                />
              </div>
            </div>
          )}

          {/* Unidad de medida */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Unidad de medida
            </label>
            <input
              type="text"
              value={formData.unidad_medida}
              onChange={(e) => handleChange("unidad_medida", e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="Ej: unidad, m², 100 unids."
            />
          </div>

          {/* Presentación */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Presentación
            </label>
            <input
              type="text"
              value={formData.presentacion}
              onChange={(e) => handleChange("presentacion", e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="Ej: Empaque de 50 unidades"
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Descripción
            </label>
            <textarea
              value={formData.descripcion}
              onChange={(e) => handleChange("descripcion", e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
              placeholder="Descripción breve del producto..."
              rows={3}
            />
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors font-semibold"
            >
              Crear producto
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
