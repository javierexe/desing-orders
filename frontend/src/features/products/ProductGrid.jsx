import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useReactTable, getCoreRowModel, getSortedRowModel, flexRender } from '@tanstack/react-table';
import { toast, Toaster } from 'sonner';
import { Trash2, Package, Tag, Palette, Shirt, Gift, BookOpen, Box, Sparkles, Heart, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useConfirmDialog } from '../../components/ConfirmDialog';

export default function ProductGrid() {
  const { showConfirm } = useConfirmDialog();
  const [data, setData] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [importModal, setImportModal] = useState({ open: false, data: null, stats: null });
  const [sorting, setSorting] = useState([]);
  const [highlightedProductId, setHighlightedProductId] = useState(null);
  
  // Nuevos filtros
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'active', 'inactive'
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  
  const dirtyRows = useRef(new Map());
  const saveTimer = useRef(null);
  const fileInputRef = useRef(null);

  // Helper para obtener icono de categoría
  const getCategoryIcon = (categoryName) => {
    if (!categoryName) return Package;
    const name = categoryName.toLowerCase();
    if (name.includes('agenda') || name.includes('libreta')) return BookOpen;
    if (name.includes('papel') || name.includes('impresión')) return Palette;
    if (name.includes('textil') || name.includes('polera') || name.includes('ropa')) return Shirt;
    if (name.includes('regalo') || name.includes('souvenir')) return Gift;
    if (name.includes('embalaje') || name.includes('caja')) return Box;
    if (name.includes('premium') || name.includes('exclusiv')) return Sparkles;
    if (name.includes('boda') || name.includes('evento')) return Heart;
    return Tag;
  };

  // Helper para formatear precio en pesos chilenos
  const formatPrice = (price) => {
    if (!price && price !== 0) return '-';
    return `$ ${price.toLocaleString('es-CL')}`;
  };

  // Fetch inicial
  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  async function fetchProducts(categoryId = null, search = null) {
    try {
      let url = '/api/productos?activo=true';
      if (categoryId) url += `&categoria_id=${categoryId}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      
      const res = await fetch(url);
      const products = await res.json();
      setData(Array.isArray(products) ? products : []);
    } catch (err) {
      toast.error('Error cargando productos');
    }
  }

  async function fetchCategories() {
    try {
      const res = await fetch('/api/categorias');
      const cats = await res.json();
      setCategories(Array.isArray(cats) ? cats : []);
    } catch (err) {
      toast.error('Error cargando categorías');
    }
  }

  // Aplicar filtros locales (estado, rango de precio, búsqueda)
  const filteredData = useMemo(() => {
    let filtered = [...data];
    
    // Filtro por estado
    if (filterStatus === 'active') {
      filtered = filtered.filter(p => p.activo === true);
    } else if (filterStatus === 'inactive') {
      filtered = filtered.filter(p => p.activo === false);
    }
    
    // Filtro por rango de precio
    if (priceRange.min !== '') {
      const minPrice = parseInt(priceRange.min);
      filtered = filtered.filter(p => (p.precio_base || 0) >= minPrice);
    }
    if (priceRange.max !== '') {
      const maxPrice = parseInt(priceRange.max);
      filtered = filtered.filter(p => (p.precio_base || 0) <= maxPrice);
    }
    
    return filtered;
  }, [data, filterStatus, priceRange]);

  // Manejo de edición - SOLO marcar como dirty, NO actualizar data todavía
  function handleCellEdit(rowId, columnId, value) {
    // Marcar como dirty
    const current = dirtyRows.current.get(rowId) || { id: rowId };
    const updated = { ...current, [columnId]: value };
    
    // Si es cambio de categoría, agregar categoria_nombre
    if (columnId === 'categoria_id' && value) {
      const cat = categories.find(c => c.id === parseInt(value));
      if (cat) {
        updated.categoria_nombre = cat.nombre;
      }
    } else if (columnId === 'categoria_id' && !value) {
      updated.categoria_nombre = null;
    }
    
    dirtyRows.current.set(rowId, updated);
  }

  // Manejar blur (cuando el usuario sale del campo)
  function handleCellBlur(rowId, columnId, value) {
    // Actualizar data local
    setData(prev => prev.map(row => {
      if (row.id === rowId) {
        const updated = { ...row, [columnId]: value };
        // Si cambió la categoría, actualizar también la referencia
        if (columnId === 'categoria_id' && value) {
          const cat = categories.find(c => c.id === parseInt(value));
          if (cat) {
            updated.categoria = cat;
            updated.categoria_nombre = cat.nombre;
          }
        } else if (columnId === 'categoria_id' && !value) {
          updated.categoria = null;
          updated.categoria_nombre = null;
        }
        return updated;
      }
      return row;
    }));

    // Debounce autosave - aumentado a 1 segundo
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveDirtyRows();
    }, 1000);
  }

  async function saveDirtyRows() {
    if (dirtyRows.current.size === 0) return;

    setSaving(true);
    const updates = Array.from(dirtyRows.current.values()).map(row => {
      // Asegurar que todos los campos requeridos están presentes
      const producto = data.find(p => p.id === row.id);
      
      const payload = {
        id: row.id,
        nombre: row.nombre || producto?.nombre || 'Sin nombre',
        categoria_id: row.categoria_id !== undefined ? row.categoria_id : producto?.categoria_id,
        presentacion: row.presentacion !== undefined ? row.presentacion : producto?.presentacion,
        precio_base: row.precio_base !== undefined ? parseInt(row.precio_base) || null : producto?.precio_base,
        requiere_cotizacion: row.requiere_cotizacion !== undefined ? Boolean(row.requiere_cotizacion) : Boolean(producto?.requiere_cotizacion),
        unidad_medida: row.unidad_medida !== undefined ? row.unidad_medida : producto?.unidad_medida,
        descripcion: row.descripcion !== undefined ? row.descripcion : producto?.descripcion,
        activo: row.activo !== undefined ? Boolean(row.activo) : Boolean(producto?.activo)
      };
      
      // Solo agregar categoria_nombre si existe
      if (row.categoria_nombre || producto?.categoria?.nombre) {
        payload.categoria_nombre = row.categoria_nombre || producto?.categoria?.nombre;
      }
      
      // Solo agregar codigo si existe
      if (row.codigo || producto?.codigo) {
        payload.codigo = row.codigo || producto?.codigo;
      }
      
      return payload;
    });

    console.log('💾 Guardando productos:', JSON.stringify(updates, null, 2));
    
    try {
      const res = await fetch('/api/productos/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates, deletes: [], new_categories: [] })
      });

      if (!res.ok) throw new Error('Error guardando');
      
      const result = await res.json();
      
      // NO actualizar setData aquí para evitar perder el foco
      // Los datos ya están actualizados localmente en handleCellEdit
      
      dirtyRows.current.clear();
      toast.success('✅ Cambios guardados');
    } catch (err) {
      toast.error('❌ Error al guardar cambios');
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(productId) {
    // Buscar el nombre del producto para el mensaje de confirmación
    const product = data.find(p => p.id === productId);
    const productName = product?.nombre || 'este producto';
    
    const confirmed = await showConfirm({
      title: 'Confirmar eliminación',
      message: `¿Estás seguro de eliminar "${productName}"?\n\nEsta acción no se puede deshacer.`,
      type: 'danger'
    });
    
    if (!confirmed) return;
    
    try {
      const res = await fetch('/api/productos/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: [], deletes: [productId], new_categories: [] })
      });

      if (!res.ok) throw new Error('Error eliminando');
      
      setData(prev => prev.filter(p => p.id !== productId));
      toast.success('Producto eliminado');
    } catch (err) {
      toast.error('Error al eliminar producto');
    }
  }

  async function handleDeleteSelected() {
    if (selectedRows.size === 0) return;

    const confirmed = await showConfirm({
      title: 'Confirmar eliminación',
      message: `¿Eliminar ${selectedRows.size} producto(s) seleccionado(s)?\n\nEsta acción no se puede deshacer.`,
      type: 'danger'
    });
    
    if (!confirmed) return;

    const ids = Array.from(selectedRows);
    try {
      const res = await fetch('/api/productos/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: [], deletes: ids, new_categories: [] })
      });

      if (!res.ok) throw new Error('Error eliminando');
      
      setData(prev => prev.filter(p => !ids.includes(p.id)));
      setSelectedRows(new Set());
      toast.success(`${ids.length} productos eliminados`);
    } catch (err) {
      toast.error('Error al eliminar');
    }
  }

  async function handleCreateNew() {
    const newProduct = {
      nombre: 'Nuevo Producto',
      categoria_id: null,
      presentacion: '',
      precio_base: 0,
      requiere_cotizacion: false,
      unidad_medida: '',
      descripcion: '',
      activo: true
    };

    try {
      const res = await fetch('/api/productos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProduct)
      });

      if (!res.ok) throw new Error('Error creando');
      
      const created = await res.json();
      setData(prev => [created, ...prev]);
      
      // Resaltar el producto nuevo
      setHighlightedProductId(created.id);
      
      // Quitar el resaltado después de 3 segundos
      setTimeout(() => {
        setHighlightedProductId(null);
      }, 3000);
      
      toast.success('Producto creado');
    } catch (err) {
      toast.error('Error al crear producto');
    }
  }

  // Export a CSV
  function handleExportCSV() {
    const headers = ['id', 'codigo', 'nombre', 'categoria', 'presentacion', 'precio_base', 'requiere_cotizacion', 'unidad_medida', 'descripcion', 'activo'];
    const csvData = [
      headers.join(','),
      ...data.map(row => [
        row.id || '',
        row.codigo || '',
        `"${row.nombre || ''}"`,
        `"${row.categoria?.nombre || ''}"`,
        `"${row.presentacion || ''}"`,
        row.precio_base || 0,
        row.requiere_cotizacion ? 'SI' : 'NO',
        `"${row.unidad_medida || ''}"`,
        `"${row.descripcion || ''}"`,
        row.activo ? 'SI' : 'NO'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `productos_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('CSV exportado');
  }

    // Import desde CSV - Mostrar preview
  function handleImportCSV(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          toast.error('Archivo CSV vacío o inválido');
          return;
        }
        
        const headers = lines[0].split(',').map(h => h.trim());
        
        const products = lines.slice(1).map((line, idx) => {
          try {
            const values = line.match(/(?:"[^"]*"|[^,])+/g)?.map(v => v.replace(/^"|"$/g, '').trim()) || [];
            const obj = {};
            headers.forEach((header, i) => {
              obj[header] = values[i] || null;
            });
            
            // Buscar producto existente por id (clave principal)
            const existing = obj.id ? data.find(d => d.id === parseInt(obj.id)) : null;
            
            const parsedProduct = {
              _lineNumber: idx + 2,
              // Si tiene id, es actualización; si no, es producto nuevo
              ...(obj.id ? { id: parseInt(obj.id) } : {}),
              codigo: obj.codigo || null,
              nombre: obj.nombre || `Producto ${idx + 1}`,
              categoria_nombre: obj.categoria,
              presentacion: obj.presentacion || null,
              precio_base: parseInt(obj.precio_base) || null,
              requiere_cotizacion: obj.requiere_cotizacion?.toUpperCase() === 'SI',
              unidad_medida: obj.unidad_medida || null,
              descripcion: obj.descripcion || null,
              activo: obj.activo?.toUpperCase() !== 'NO'
            };
            
            // Detectar cambios comparando con existente
            if (existing) {
              const changes = [];
              if (parsedProduct.nombre !== existing.nombre) changes.push(`nombre: "${existing.nombre}" -> "${parsedProduct.nombre}"`);
              if (parsedProduct.categoria_nombre !== existing.categoria?.nombre) changes.push(`categoria: "${existing.categoria?.nombre || '-'}" -> "${parsedProduct.categoria_nombre || '-'}"`);
              if (parsedProduct.presentacion !== existing.presentacion) changes.push(`presentacion`);
              if (parsedProduct.precio_base !== existing.precio_base) changes.push(`precio: ${formatPrice(existing.precio_base || 0)} -> ${formatPrice(parsedProduct.precio_base || 0)}`);
              if (parsedProduct.requiere_cotizacion !== existing.requiere_cotizacion) changes.push(`cotizacion`);
              if (parsedProduct.unidad_medida !== existing.unidad_medida) changes.push(`unidad`);
              if (parsedProduct.descripcion !== existing.descripcion) changes.push(`descripcion`);
              if (parsedProduct.activo !== existing.activo) changes.push(`estado: ${existing.activo ? 'activo' : 'inactivo'} -> ${parsedProduct.activo ? 'activo' : 'inactivo'}`);
              
              parsedProduct._changes = changes;
              parsedProduct._isNew = false;
              parsedProduct._hasChanges = changes.length > 0;
            } else {
              parsedProduct._isNew = true;
              parsedProduct._hasChanges = true;
              parsedProduct._changes = [];
            }
            
            return parsedProduct;
          } catch (err) {
            console.error(`Error en l\u00ednea ${idx + 2}:`, err);
            return null;
          }
        }).filter(p => p !== null);

        // Filtrar solo productos nuevos o con cambios
        const productsWithChanges = products.filter(p => p._hasChanges);
        const productsWithoutChanges = products.filter(p => !p._hasChanges);

        // Calcular estadisticas
        const stats = {
          total: products.length,
          nuevos: products.filter(p => p._isNew).length,
          actualizaciones: products.filter(p => !p._isNew && p._hasChanges).length,
          sinCambios: productsWithoutChanges.length,
          categorias: [...new Set(products.map(p => p.categoria_nombre).filter(Boolean))],
        };

        if (productsWithChanges.length === 0) {
          toast.info('No hay cambios para importar');
          return;
        }

        setImportModal({ open: true, data: productsWithChanges, allData: products, stats });
      } catch (err) {
        toast.error('Error al leer el archivo CSV');
        console.error(err);
      }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset input
  }

  // Confirmar import
  async function confirmImport() {
    if (!importModal.data) return;

    setSaving(true);
    try {
      const res = await fetch('/api/productos/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          updates: importModal.data.map(p => {
            const { _lineNumber, _changes, _isNew, _hasChanges, ...product } = p;
            return product;
          }), 
          deletes: [], 
          new_categories: importModal.stats.categorias 
        })
      });

      if (!res.ok) throw new Error('Error importando');
      
      const result = await res.json();
      
      toast.success(
        `✅ ${importModal.stats.total} productos procesados` +
        `${importModal.stats.nuevos} nuevos, ${importModal.stats.actualizaciones} actualizados`
      );
      
      setImportModal({ open: false, data: null, stats: null });
      fetchProducts();
    } catch (err) {
      toast.error('❌ Error al importar productos');
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  // Definición de columnas
  const columns = [
    {
      id: 'select',
      header: ({ table }) => {
        const allFilteredIds = filteredData.map(p => p.id);
        const allSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedRows.has(id));
        
        return (
          <input
            type="checkbox"
            checked={allSelected}
            onChange={(e) => {
              const newSelected = new Set(selectedRows);
              if (e.target.checked) {
                // Seleccionar todos los filtrados
                allFilteredIds.forEach(id => newSelected.add(id));
              } else {
                // Deseleccionar todos los filtrados
                allFilteredIds.forEach(id => newSelected.delete(id));
              }
              setSelectedRows(newSelected);
            }}
            className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
          />
        );
      },
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={selectedRows.has(row.original.id)}
          onChange={(e) => {
            const newSelected = new Set(selectedRows);
            if (e.target.checked) {
              newSelected.add(row.original.id);
            } else {
              newSelected.delete(row.original.id);
            }
            setSelectedRows(newSelected);
          }}
          className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
        />
      ),
      size: 40,
    },
    {
      accessorKey: 'codigo',
      header: 'Código',
      cell: ({ getValue }) => (
        <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded">
          {getValue() || '-'}
        </span>
      ),
      enableSorting: true,
      size: 100,
    },
    {
      accessorKey: 'nombre',
      header: 'Nombre',
      cell: ({ row, getValue }) => (
        <input
          type="text"
          defaultValue={getValue()}
          onChange={(e) => handleCellEdit(row.original.id, 'nombre', e.target.value)}
          onBlur={(e) => handleCellBlur(row.original.id, 'nombre', e.target.value)}
          className="w-full px-2 py-1 text-sm border border-transparent hover:border-slate-300 focus:border-sky-400 focus:ring-1 focus:ring-sky-400 rounded outline-none"
          placeholder="Nombre del producto"
        />
      ),
      enableSorting: true,
      size: 250,
    },
    {
      accessorKey: 'categoria',
      header: 'Categoría',
      accessorFn: row => row.categoria?.nombre || '',
      enableSorting: true,
      cell: ({ row }) => {
        const cat = row.original.categoria;
        return (
          <select
            value={row.original.categoria_id || ''}
            onChange={(e) => {
              const newValue = e.target.value ? parseInt(e.target.value) : null;
              handleCellEdit(row.original.id, 'categoria_id', newValue);
              handleCellBlur(row.original.id, 'categoria_id', newValue);
            }}
            className="w-full px-2 py-1 text-sm border border-transparent hover:border-slate-300 focus:border-sky-400 focus:ring-1 focus:ring-sky-400 rounded outline-none bg-white"
          >
            <option value="">Sin categoría</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        );
      },
      size: 150,
    },
    {
      accessorKey: 'presentacion',
      header: 'Presentación',
      cell: ({ row, getValue }) => (
        <input
          type="text"
          defaultValue={getValue() || ''}
          onChange={(e) => handleCellEdit(row.original.id, 'presentacion', e.target.value)}
          onBlur={(e) => handleCellBlur(row.original.id, 'presentacion', e.target.value)}
          className="w-full px-2 py-1 text-sm border border-transparent hover:border-slate-300 focus:border-sky-400 focus:ring-1 focus:ring-sky-400 rounded outline-none"
        />
      ),
      size: 140,
    },
    {
      accessorKey: 'precio_base',
      header: 'Precio',
      cell: ({ row, getValue }) => {
        const [localValue, setLocalValue] = React.useState(getValue() ? formatPrice(getValue()) : '');
        
        return (
          <input
            type="text"
            value={localValue}
            onChange={(e) => {
              const numValue = e.target.value.replace(/[^0-9]/g, '');
              setLocalValue(numValue ? formatPrice(parseInt(numValue)) : '');
              handleCellEdit(row.original.id, 'precio_base', numValue ? parseInt(numValue) : null);
            }}
            onBlur={(e) => {
              const numValue = e.target.value.replace(/[^0-9]/g, '');
              handleCellBlur(row.original.id, 'precio_base', numValue ? parseInt(numValue) : null);
            }}
            className="w-full px-2 py-1 text-sm border border-transparent hover:border-slate-300 focus:border-sky-400 focus:ring-1 focus:ring-sky-400 rounded outline-none text-right "
            placeholder="$ 0"
          />
        );
      },
      enableSorting: true,
      size: 120,
    },
    {
      accessorKey: 'requiere_cotizacion',
      header: 'Cotiz.',
      cell: ({ row, getValue }) => (
        <input
          type="checkbox"
          checked={getValue()}
          onChange={(e) => {
            handleCellEdit(row.original.id, 'requiere_cotizacion', e.target.checked);
            handleCellBlur(row.original.id, 'requiere_cotizacion', e.target.checked);
          }}
          className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
        />
      ),
      size: 70,
    },
    {
      accessorKey: 'unidad_medida',
      header: 'Unidad',
      cell: ({ row, getValue }) => (
        <input
          type="text"
          defaultValue={getValue() || ''}
          onChange={(e) => handleCellEdit(row.original.id, 'unidad_medida', e.target.value)}
          onBlur={(e) => handleCellBlur(row.original.id, 'unidad_medida', e.target.value)}
          className="w-full px-2 py-1 text-sm border border-transparent hover:border-slate-300 focus:border-sky-400 focus:ring-1 focus:ring-sky-400 rounded outline-none"
        />
      ),
      size: 100,
    },
    {
      accessorKey: 'descripcion',
      header: 'Descripción',
      cell: ({ row, getValue }) => (
        <input
          type="text"
          defaultValue={getValue() || ''}
          onChange={(e) => handleCellEdit(row.original.id, 'descripcion', e.target.value)}
          onBlur={(e) => handleCellBlur(row.original.id, 'descripcion', e.target.value)}
          className="w-full px-2 py-1 text-sm border border-transparent hover:border-slate-300 focus:border-sky-400 focus:ring-1 focus:ring-sky-400 rounded outline-none"
        />
      ),
      size: 250,
    },
    {
      accessorKey: 'activo',
      header: 'Estado',
      cell: ({ row, getValue }) => {
        const isActive = getValue();
        return (
          <div className="flex items-center justify-center">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                defaultChecked={isActive}
                onChange={(e) => {
                  const newValue = e.target.checked;
                  handleCellEdit(row.original.id, 'activo', newValue);
                  handleCellBlur(row.original.id, 'activo', newValue);
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
            </label>
          </div>
        );
      },
      enableSorting: true,
      size: 90,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <button
          onClick={() => handleDelete(row.original.id)}
          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
          title="Eliminar producto"
        >
          <Trash2 size={16} />
        </button>
      ),
      size: 50,
    },
  ];

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200">
      <Toaster position="top-right" richColors />
      
      {/* Header con filtros de categoría */}
      <div className="p-4 border-b border-slate-200 space-y-5">
        {/* Filtros de categoría como pills */}
        

        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <input 
            type="text" 
            placeholder="Buscar productos..." 
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              fetchProducts(selectedCategory, e.target.value);
            }}
            className="flex-1 min-w-[200px] max-w-md rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400" 
          />
          
          {/* Filtro por estado - Botones visuales */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filterStatus === 'all'
                  ? 'bg-slate-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterStatus('active')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filterStatus === 'active'
                  ? 'bg-green-600 text-white'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              ✓ Activos
            </button>
            <button
              onClick={() => setFilterStatus('inactive')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filterStatus === 'inactive'
                  ? 'bg-slate-600 text-white'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              Inactivos
            </button>
          </div>
          
          {/* Filtro por rango de precio */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 text-sm">$</span>
              <input
                type="text"
                placeholder="precio mín"
                value={priceRange.min ? parseInt(priceRange.min).toLocaleString('es-CL') : ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  setPriceRange(prev => ({ ...prev, min: value }));
                }}
                className="w-32 pl-6 pr-3 py-2 rounded-xl border border-slate-300 text-sm outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
            <span className="text-slate-400">-</span>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 text-sm">$</span>
              <input
                type="text"
                placeholder="precio máx"
                value={priceRange.max ? parseInt(priceRange.max).toLocaleString('es-CL') : ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  setPriceRange(prev => ({ ...prev, max: value }));
                }}
                className="w-32 pl-6 pr-3 py-2 rounded-xl border border-slate-300 text-sm outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
          </div>
          
          <div className="flex-1"></div>
          
          {saving && (
            <span className="text-sm text-slate-500 flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-sky-600"></div>
              Guardando…
            </span>
          )}
          
        <button 
            onClick={handleCreateNew} 
            className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-medium text-white hover:bg-sky-700 transition-colors"
            title="Crear nuevo producto">
            + Nuevo
          </button>

          <button 
            onClick={handleExportCSV}
            className="rounded-xl bg-slate-600 px-4 py-2 text-xs font-medium text-white hover:bg-slate-700 transition-colors"
            title="Exportar productos a CSV"
          >
            .CSV ↓
          </button>

          <button 
            onClick={() => fileInputRef.current?.click()}
            className="rounded-xl bg-slate-600 px-4 py-2 text-xs font-medium text-white hover:bg-slate-700 transition-colors"
            title="Importar productos desde CSV"
          >
            .CSV ↑
          </button>
          
          {/* Input file oculto */}
          <input 
            ref={fileInputRef}
            type="file" 
            accept=".csv"
            onChange={handleImportCSV}
            style={{ display: 'none' }}
          />

          {selectedRows.size > 0 && (
            <button 
              onClick={handleDeleteSelected}
              className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600 transition-colors"
            >
              Eliminar ({selectedRows.size})
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setSelectedCategory(null);
              fetchProducts();
            }}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              selectedCategory === null
                ? 'bg-sky-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Package size={14} />
            Todos ({filteredData.length})
          </button>
          
          {categories.map(cat => {
            const IconComponent = getCategoryIcon(cat.nombre);
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  fetchProducts(cat.id);
                }}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <IconComponent size={14} />
                {cat.nombre}
              </button>
            );
          })}
        </div>

      </div>

      {/* Tabla */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b-2 border-slate-200 sticky top-0 z-10">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    className="px-3 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider"
                    style={{ width: header.getSize() }}
                  >
                    {header.isPlaceholder ? null : (
                      <div
                        className={header.column.getCanSort() ? 'flex items-center gap-2 cursor-pointer select-none hover:text-sky-600' : ''}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && (
                          <span className="text-slate-400">
                            {{
                              asc: <ArrowUp size={14} className="text-sky-600" />,
                              desc: <ArrowDown size={14} className="text-sky-600" />,
                            }[header.column.getIsSorted()] ?? <ArrowUpDown size={14} />}
                          </span>
                        )}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-100">
            {table.getRowModel().rows.map(row => (
              <tr 
                key={row.id}
                className={`transition-all duration-500 ${
                  highlightedProductId === row.original.id
                    ? 'bg-orange-100 ring-2 ring-orange-400 ring-inset animate-pulse'
                    : 'hover:bg-sky-50'
                }`}
              >
                {row.getVisibleCells().map(cell => (
                  <td 
                    key={cell.id}
                    className="px-3 py-1 align-middle"
                    style={{ width: cell.column.getSize() }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredData.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <Package size={48} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No hay productos que coincidan con los filtros</p>
            {(filterStatus !== 'all' || priceRange.min !== '' || priceRange.max !== '') && (
              <button
                onClick={() => {
                  setFilterStatus('all');
                  setPriceRange({ min: '', max: '' });
                }}
                className="mt-3 text-xs text-sky-600 hover:text-sky-700 underline"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal de confirmación de import */}
      {importModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setImportModal({ open: false, data: null, stats: null })}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-sky-50 to-blue-50">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Package size={20} className="text-sky-600" />
                Confirmar importación de productos
              </h3>
            </div>

            {/* Stats */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-sky-600">{importModal.stats?.total || 0}</div>
                  <div className="text-xs text-slate-600">Total productos</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{importModal.stats?.nuevos || 0}</div>
                  <div className="text-xs text-slate-600">Nuevos</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">{importModal.stats?.actualizaciones || 0}</div>
                  <div className="text-xs text-slate-600">Actualizaciones</div>
                </div>
              </div>
              
              {importModal.stats?.categorias && importModal.stats.categorias.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <div className="text-xs text-slate-600 mb-2">Categorías detectadas:</div>
                  <div className="flex flex-wrap gap-1">
                    {importModal.stats.categorias.map(cat => (
                      <span key={cat} className="px-2 py-0.5 bg-white rounded text-xs text-slate-700 border border-slate-200">
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Preview solo cambios */}
            <div className="px-6 py-4 overflow-auto max-h-96">
              <div className="text-sm text-slate-600 mb-3 font-medium">
                Cambios detectados: ({importModal.data?.length}) {importModal.stats?.sinCambios > 0 && (
                  <span className="text-slate-400">({importModal.stats.sinCambios} productos sin cambios)</span>
                )}:
              </div>
              <div className="space-y-2">
                {importModal.data?.slice(0, 15).map((product, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="font-medium text-slate-800 truncate">{product.nombre}</div>
                          {product._isNew ? (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full whitespace-nowrap font-semibold">+ Nuevo</span>
                          ) : (
                            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full whitespace-nowrap font-semibold">Editar</span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-2">
                          {product.codigo && <span className="font-mono bg-slate-200 px-1 rounded">{product.codigo}</span>}
                          {product.categoria_nombre && <span>{product.categoria_nombre}</span>}
                          {product.precio_base && <span className="font-semibold">{formatPrice(product.precio_base)}</span>}
                        </div>
                        {/* Mostrar cambios */}
                        {!product._isNew && product._changes && product._changes.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-slate-200">
                            <div className="text-xs text-slate-600 space-y-0.5">
                              {product._changes.map((change, i) => (
                                <div key={i} className="flex items-start gap-1">
                                  <span className="text-orange-500">-</span>
                                  <span className="text-slate-600">{change}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {importModal.data && importModal.data.length > 15 && (
                  <div className="text-center text-xs text-slate-500 py-2">
                    ... y {importModal.data.length - 15} cambios mas
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => setImportModal({ open: false, data: null, stats: null })}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmImport}
                disabled={saving}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-sky-600 text-white hover:bg-sky-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Importando...
                  </>
                ) : (
                  <>
                    Confirmar importacion
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
