import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Search, Plus, User, Building2, AlertCircle } from "lucide-react";
import { api } from "../lib/api";
import { useConfirmDialog } from "./ConfirmDialog";

// Cache global para clientes (compartido entre todas las instancias)
let clientesCache = null;
let loadingPromise = null;

export default function ClientAutocomplete({ onSelect, value, placeholder = "Buscar cliente..." }) {
  const { showAlert } = useConfirmDialog();
  const [clientes, setClientes] = useState(clientesCache || []);
  const [inputValue, setInputValue] = useState(value || "");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Cargar todos los clientes al inicio (usando cache)
  useEffect(() => {
    loadClientes();
  }, []);

  // Actualizar input cuando cambia el valor externo
  useEffect(() => {
    if (value !== undefined && value !== inputValue) {
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

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function loadClientes() {
    // Si ya hay una carga en progreso, esperarla
    if (loadingPromise) {
      await loadingPromise;
      setClientes(clientesCache || []);
      return;
    }

    // Si ya hay cache, usarlo
    if (clientesCache) {
      setClientes(clientesCache);
      return;
    }

    setLoading(true);
    loadingPromise = api.get('/clientes?activo=true')
      .then(data => {
        clientesCache = Array.isArray(data) ? data : [];
        setClientes(clientesCache);
        return clientesCache;
      })
      .catch(err => {
        console.error("Error cargando clientes:", err);
        clientesCache = [];
        setClientes([]);
        return [];
      })
      .finally(() => {
        setLoading(false);
        loadingPromise = null;
      });

    await loadingPromise;
  }

  // Función para normalizar texto (eliminar tildes)
  const normalizeText = (text) => {
    if (!text) return '';
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  };

  // Filtrar clientes basado en el input (búsqueda flexible sin tildes)
  const sugerencias = (clientes || []).filter(c => {
    if (!inputValue.trim()) return true;
    
    const normalizedQuery = normalizeText(inputValue);
    
    return (
      normalizeText(c.nombre).includes(normalizedQuery) ||
      normalizeText(c.email).includes(normalizedQuery) ||
      normalizeText(c.rut).includes(normalizedQuery) ||
      normalizeText(c.telefono).includes(normalizedQuery) ||
      normalizeText(c.contacto).includes(normalizedQuery)
    );
  }).slice(0, 8); // Limitar a 8 sugerencias

  function handleInputChange(e) {
    const val = e.target.value;
    setInputValue(val);
    setShowSuggestions(true);
    setSelectedIndex(-1);
  }

  function handleInputFocus() {
    setShowSuggestions(true);
    // Si hay un valor en el input, intentar buscar coincidencias exactas
    // para ayudar al usuario a encontrar el cliente actualizado
    if (inputValue.trim()) {
      const exactMatch = clientes.find(c => 
        normalizeText(c.nombre) === normalizeText(inputValue)
      );
      if (!exactMatch) {
        // Si no hay coincidencia exacta, limpiar el input para facilitar la búsqueda
        // (opcional: podrías comentar estas líneas si prefieres mantener el valor)
        // setInputValue("");
      }
    }
  }

  function handleClientSelect(cliente) {
    setInputValue(cliente.nombre);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    onSelect?.(cliente);
  }

  function handleKeyDown(e) {
    if (!showSuggestions) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev < sugerencias.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && sugerencias[selectedIndex]) {
        handleClientSelect(sugerencias[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  }

  function handleQuickCreate() {
    setShowQuickCreate(true);
    setShowSuggestions(false);
  }

  async function handleSaveQuickClient(formData) {
    try {
      // Agregar campo activo requerido por el backend
      const payload = {
        ...formData,
        activo: true
      };
      
      const res = await api.post('/clientes', payload);
      
      // Actualizar cache y lista local
      const nuevoCliente = res;
      const nuevaLista = [...clientes, nuevoCliente];
      setClientes(nuevaLista);
      clientesCache = nuevaLista;
      
      // Seleccionar automáticamente
      handleClientSelect(nuevoCliente);
      setShowQuickCreate(false);
      
      // Mensaje de éxito
      showAlert({
        title: "Cliente creado",
        message: `El cliente "${nuevoCliente.nombre}" fue creado exitosamente.`,
        type: "success"
      });
    } catch (error) {
      console.error("Error creando cliente:", error);
      showAlert({
        title: "Error al crear cliente",
        message: error.message || "Por favor intenta nuevamente.",
        type: "warning"
      });
    }
  }

  // Verificar si el cliente actual existe en la base de datos
  const clienteExiste = inputValue.trim() && clientes.some(c => 
    normalizeText(c.nombre) === normalizeText(inputValue.trim())
  );
  
  // Buscar coincidencias aproximadas (para sugerir actualizaciones)
  const clientesSimilares = inputValue.trim() ? clientes.filter(c => {
    const normalizedNombre = normalizeText(c.nombre);
    const normalizedInput = normalizeText(inputValue.trim());
    // Buscar coincidencias parciales (el nombre del cliente contiene parte del input o viceversa)
    return normalizedNombre.includes(normalizedInput) || normalizedInput.includes(normalizedNombre);
  }).slice(0, 3) : [];

  return (
    <div className="relative w-full">
      {/* Input principal */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full pl-10 pr-3 py-2 border rounded-xl focus:ring-2 focus:ring-sky-400 focus:border-sky-400 outline-none ${
            inputValue.trim() && !clienteExiste && clientes.length > 0
              ? 'border-amber-300 bg-amber-50/30'
              : 'border-slate-300'
          }`}
          autoComplete="off"
        />
        {inputValue.trim() && !clienteExiste && clientes.length > 0 && clientesSimilares.length > 0 && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-amber-600 font-medium">
            ⚠️ Cliente desactualizado
          </div>
        )}
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-slate-300 border-t-sky-600 rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Dropdown de sugerencias */}
      {showSuggestions && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-80 overflow-y-auto"
        >
          {/* Mensaje de cliente desactualizado */}
          {inputValue.trim() && !clienteExiste && clientesSimilares.length > 0 && (
            <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 text-xs text-amber-800">
              <div className="font-semibold mb-1">⚠️ El cliente podría estar desactualizado</div>
              <div>Selecciona el cliente actualizado de la lista:</div>
            </div>
          )}
          
          {sugerencias.length > 0 ? (
            <>
              {sugerencias.map((cliente, idx) => (
                <button
                  key={cliente.id}
                  type="button"
                  onClick={() => handleClientSelect(cliente)}
                  className={`w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-b-0 transition-colors ${
                    selectedIndex === idx ? 'bg-sky-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {cliente.tipo === 'empresa' ? (
                      <Building2 className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    ) : (
                      <User className="w-5 h-5 text-slate-600 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-900 truncate">
                        {cliente.nombre}
                      </div>
                      {cliente.contacto && (
                        <div className="text-xs text-slate-500 truncate">
                          Contacto: {cliente.contacto}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2 mt-1 text-xs text-slate-500">
                        {cliente.email && (
                          <span className="truncate">{cliente.email}</span>
                        )}
                        {cliente.telefono && (
                          <span>• {cliente.telefono}</span>
                        )}
                        {cliente.rut && (
                          <span>• RUT: {cliente.rut}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </>
          ) : inputValue.trim() ? (
            <div className="px-4 py-8 text-center text-slate-500">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No se encontraron clientes</p>
              <p className="text-xs mt-1">Intenta con otro término de búsqueda</p>
            </div>
          ) : (
            <div className="px-4 py-3 text-sm text-slate-500">
              Escribe para buscar clientes...
            </div>
          )}

          {/* Botón crear nuevo */}
          <button
            type="button"
            onClick={handleQuickCreate}
            className="w-full px-4 py-3 text-left border-t border-slate-200 hover:bg-sky-50 transition-colors flex items-center gap-2 text-sky-700 font-medium"
          >
            <Plus className="w-4 h-4" />
            Crear nuevo cliente
            {inputValue.trim() && ` "${inputValue}"`}
          </button>
        </div>
      )}

      {/* Modal de creación rápida */}
      {showQuickCreate && createPortal(
        <QuickCreateClientModal
          initialName={inputValue.trim()}
          onSave={handleSaveQuickClient}
          onCancel={() => setShowQuickCreate(false)}
          showAlert={showAlert}
        />,
        document.body
      )}
    </div>
  );
}

// Modal para crear cliente rápidamente
function QuickCreateClientModal({ initialName, onSave, onCancel, showAlert }) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    nombre: initialName || '',
    tipo: 'particular',
    contacto: '',
    giro: '',
    email: '',
    telefono: '',
    rut: '',
    direccion: ''
  });

  async function handleSubmit(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Validar que tenga nombre
    if (!formData.nombre.trim()) {
      showAlert({
        title: "Campo obligatorio",
        message: "El nombre del cliente es obligatorio",
        type: "warning"
      });
      return;
    }

    // Llamar a onSave que es async
    setSaving(true);
    try {
      await onSave(formData);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 rounded-t-2xl">
          <h3 className="text-xl font-semibold text-slate-800">
            Crear nuevo cliente
          </h3>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nombre / Razón Social <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              placeholder="Ej: Juan Pérez o Empresa Ltda."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-400 focus:border-sky-400 outline-none"
              autoFocus
            />
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Tipo de cliente
            </label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 flex-1 p-3 border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="radio"
                  name="tipo"
                  value="particular"
                  checked={formData.tipo === 'particular'}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                  className="text-sky-600 focus:ring-sky-400"
                />
                <User className="w-4 h-4 text-slate-600" />
                <span className="text-sm font-medium">Particular</span>
              </label>
              <label className="flex items-center gap-2 flex-1 p-3 border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="radio"
                  name="tipo"
                  value="empresa"
                  checked={formData.tipo === 'empresa'}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                  className="text-sky-600 focus:ring-sky-400"
                />
                <Building2 className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium">Empresa</span>
              </label>
            </div>
          </div>

          {/* Contacto (solo para empresas) */}
          {formData.tipo === 'empresa' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nombre del contacto
              </label>
              <input
                type="text"
                value={formData.contacto}
                onChange={(e) => setFormData({ ...formData, contacto: e.target.value })}
                placeholder="Persona de contacto en la empresa"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-400 focus:border-sky-400 outline-none"
              />
            </div>
          )}

          {/* Giro (solo para empresas) */}
          {formData.tipo === 'empresa' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Giro o Rubro
              </label>
              <input
                type="text"
                value={formData.giro}
                onChange={(e) => setFormData({ ...formData, giro: e.target.value })}
                placeholder="Ej: Comercio, Servicios, Construcción, etc."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-400 focus:border-sky-400 outline-none"
              />
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="correo@ejemplo.com"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-400 focus:border-sky-400 outline-none"
            />
          </div>

          {/* Teléfono */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Teléfono
            </label>
            <input
              type="tel"
              value={formData.telefono}
              onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
              placeholder="+56 9 1234 5678"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-400 focus:border-sky-400 outline-none"
            />
          </div>

          {/* RUT */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              RUT {formData.tipo === 'empresa' && <span className="text-amber-600">(recomendado)</span>}
            </label>
            <input
              type="text"
              value={formData.rut}
              onChange={(e) => setFormData({ ...formData, rut: e.target.value })}
              placeholder="12.345.678-9"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-400 focus:border-sky-400 outline-none font-mono"
            />
          </div>

          {/* Dirección */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Dirección
            </label>
            <textarea
              value={formData.direccion}
              onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
              placeholder="Dirección completa"
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-400 focus:border-sky-400 outline-none resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Creando...
                </>
              ) : (
                'Crear Cliente'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
