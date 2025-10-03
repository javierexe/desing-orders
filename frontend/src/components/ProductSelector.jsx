import { useState, useEffect } from "react";
import { Search, Package, Tag } from "lucide-react";
import { api } from "../lib/api";

export default function ProductSelector({ onSelect, selectedProductId }) {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategoria, setSelectedCategoria] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [productosRes, categoriasRes] = await Promise.all([
        api.get("/productos"),
        api.get("/categorias")
      ]);
      setProductos(productosRes.data);
      setCategorias(categoriasRes.data);
    } catch (error) {
      console.error("Error cargando productos:", error);
    } finally {
      setLoading(false);
    }
  }

  // Filtrar productos
  const productosFiltrados = productos.filter(p => {
    const matchSearch = !search || 
      p.nombre.toLowerCase().includes(search.toLowerCase()) ||
      (p.descripcion && p.descripcion.toLowerCase().includes(search.toLowerCase()));
    
    const matchCategoria = !selectedCategoria || p.categoria_id === selectedCategoria;
    
    return matchSearch && matchCategoria;
  });

  function handleProductClick(producto) {
    onSelect(producto);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex gap-3">
        {/* Búsqueda */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        {/* Selector de categoría */}
        <select
          value={selectedCategoria || ""}
          onChange={(e) => setSelectedCategoria(e.target.value ? parseInt(e.target.value) : null)}
          className="px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
        >
          <option value="">Todas las categorías</option>
          {categorias.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.nombre}</option>
          ))}
        </select>
      </div>

      {/* Lista de productos */}
      <div className="max-h-96 overflow-y-auto space-y-2 border border-slate-200 rounded-xl p-3">
        {productosFiltrados.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Package size={48} className="mx-auto mb-2 opacity-50" />
            <p>No se encontraron productos</p>
          </div>
        ) : (
          productosFiltrados.map(producto => (
            <button
              key={producto.id}
              type="button"
              onClick={() => handleProductClick(producto)}
              className={`w-full text-left p-3 rounded-lg border-2 transition-all hover:shadow-md ${
                selectedProductId === producto.id
                  ? "border-sky-500 bg-sky-50"
                  : "border-slate-200 hover:border-sky-300"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-sm text-slate-800">
                    {producto.nombre}
                  </h4>
                  {producto.descripcion && (
                    <p className="text-xs text-slate-600 mt-1">{producto.descripcion}</p>
                  )}
                  {producto.presentacion && (
                    <p className="text-xs text-slate-500 mt-1">
                      <Package size={12} className="inline mr-1" />
                      {producto.presentacion}
                    </p>
                  )}
                  {producto.categoria && (
                    <span className="inline-flex items-center gap-1 mt-2 px-2 py-1 bg-slate-100 rounded-full text-xs text-slate-700">
                      <Tag size={10} />
                      {producto.categoria.nombre}
                    </span>
                  )}
                </div>
                <div className="ml-4 text-right">
                  {producto.requiere_cotizacion ? (
                    <span className="text-xs font-semibold text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
                      Cotización
                    </span>
                  ) : (
                    <span className="text-sm font-bold text-slate-800">
                      ${producto.precio_base?.toLocaleString('es-CL')}
                    </span>
                  )}
                  {producto.unidad_medida && (
                    <p className="text-xs text-slate-500 mt-1">por {producto.unidad_medida}</p>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
