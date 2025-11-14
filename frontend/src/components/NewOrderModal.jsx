import { useState, useEffect, useMemo, useRef } from "react";
import { Trash, ExternalLink, Eye, Upload, CloudUpload, Check, Clock, Tag, CheckCircle, Calculator, Clipboard, File } from "lucide-react";
import OrderItemsEditor from "./OrderItemsEditor";
import AmountDetection from "./AmountDetection";
import ClientAutocomplete from "./ClientAutocomplete";
import { buildOrderPayload, HttpError } from "../utils/http";
import { api } from "../lib/api";

// Helpers de fecha (solo fecha, sin hora/TZ)
function todayISO() {
  const t = new Date();
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, "0");
  const d = String(t.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
// Calcula la fecha en N días hábiles (sin contar fines de semana)
function addBusinessDays(startDate, days) {
  let date = new Date(startDate);
  let added = 0;
  while (added < days) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay();
    if (day !== 0 && day !== 6) { // 0=Domingo, 6=Sábado
      added++;
    }
  }
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
function isBeforeTodayISO(iso) {
  return !!iso && iso < todayISO();
}
// Normaliza cualquier valor de fecha a YYYY-MM-DD (o null si no válido)
function normalizeDate(value) {
  if (!value) return null;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date(value);
  if (Number.isNaN(d)) return null;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function NewOrderModal({
  open,
  onClose,
  onCreated,   // callback al guardar (crear)
  onUpdated,   // callback al guardar (editar)
  onNotify,
  order = null,
  editMode = false
}) {
  // Normaliza una URL que venga del backend para que el frontend la solicite vía /api
  function normalizeServerUrl(u) {
    if (!u) return "";
    if (typeof u !== "string") return "";
    if (u.startsWith("http://") || u.startsWith("https://")) return u;
    if (u.startsWith("/api")) return u;
    if (u.startsWith("/")) return `/api${u}`;
    return u;
  }

  // Elimina duplicados por id o url (preserva orden)
  function dedupeReceipts(arr = []) {
    const seen = new Map();
    for (const it of arr) {
      const key = it && (it.id ?? (typeof it === 'string' ? it : it.url));
      if (!key) continue;
      if (!seen.has(key)) seen.set(key, it);
    }
    return Array.from(seen.values());
  }

  // Extrae el nombre de archivo desde una URL (sin query) y lo decodifica
  function getFileNameFromUrl(u) {
    if (!u) return "";
    try {
      let s = u;
      // quitar prefijo /api si existe para mostrar nombre limpio
      if (s.startsWith('/api')) s = s.slice(4);
      // quitar query string
      const qIdx = s.indexOf('?');
      if (qIdx !== -1) s = s.slice(0, qIdx);
      // obtener segmento final
      const parts = s.split('/').filter(Boolean);
      let name = parts.length ? parts[parts.length - 1] : s;
      // decodificar URL (%20 etc.)
      try { name = decodeURIComponent(name); } catch (e) { /* ignore */ }
      return name;
    } catch (e) {
      return "";
    }
  }

  const [form, setForm] = useState({
    client_name: "",
    title: "",
    delivery_method: "retiro",
    due_date: "",
    delivered_date: "",
    description: "",
    status: "pre-pedido",
    // abono_images is an array of objects: { id?, url, filename?, uploaded_at? }
    abono_images: []
  });
  const [items, setItems] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [imgLoadError, setImgLoadError] = useState(false);
  const [deletingAbono, setDeletingAbono] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  
  // Estados para detección automática de montos
  const [pendingFiles, setPendingFiles] = useState([]); // Archivos esperando análisis OCR
  const [showAmountDetection, setShowAmountDetection] = useState(false);
  const [currentFileForDetection, setCurrentFileForDetection] = useState(null);
  const [selectedItemId, setSelectedItemId] = useState(null); // Item seleccionado para vincular comprobante
  const [manualEntryItemId, setManualEntryItemId] = useState(null); // Item que necesita entrada manual con efecto visual
  
  const dropzoneRef = useRef(null);

  // Guardamos el estado inicial para dirty-check
  const initialFormRef = useRef(form);

  // Normaliza date a yyyy-mm-dd (para precargar el form)
  const normDate = (v) => (v ? String(v).slice(0, 10) : "");

  useEffect(() => {
    if (!open) return;
    if (editMode && order) {
      const next = {
        client_name: order.client_name ?? "",
        title: order.title ?? "",
        delivery_method: order.delivery_method ?? "retiro",
        due_date: normDate(order.due_date),
        delivered_date: normDate(order.delivered_date),
        description: order.description ?? "",
        status: order.status ?? "pre-pedido",
        // abono_images: frontend supports multiple; prefer order.receipts (new API), fallback to order.abono_image_url
        abono_images: editMode && order?.receipts && order.receipts.length
          ? dedupeReceipts(order.receipts.map(r => ({ 
              id: r.id, 
              url: normalizeServerUrl(r.url), 
              filename: r.filename || getFileNameFromUrl(r.url),
              storage_key: r.storage_key,
              uploaded_at: r.uploaded_at 
            })))
          : (order.abono_image_url ? [{ 
              url: normalizeServerUrl(order.abono_image_url), 
              filename: getFileNameFromUrl(order.abono_image_url) 
            }] : []),
      };
      
      // 🔍 Debug: Verificar datos de la orden al abrir para editar
      console.log('🔍 [DEBUG] Datos de orden recibidos:', {
        code: order.code,
        receipts: order.receipts,
        receiptsCount: order.receipts?.length || 0,
        abono_image_url: order.abono_image_url,
        items: order.items?.map(i => ({ id: i.id, description: i.description, paid_amount: i.paid_amount })),
        form_abono_images: next.abono_images
      });
      
      setForm(next);
      initialFormRef.current = next;
      setItems(order.items ?? []);
    } else {
      const blank = {
        client_name: "",
        title: "",
        delivery_method: "retiro",
        due_date: todayISO(),
        delivered_date: "",
        description: "",
        status: "pre-pedido",
        abono_images: [],
      };
      setForm(blank);
      initialFormRef.current = blank;
      setItems([]);
    }
    
    // Limpiar estados de detección al abrir modal
    setSelectedItemId(null);
    setManualEntryItemId(null);
    setShowAmountDetection(false);
    setCurrentFileForDetection(null);
    setPendingFiles([]);
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editMode, order?.code]);

  // Listener global para paste como fallback
  useEffect(() => {
    if (!open) return;

    const handleGlobalPaste = (e) => {
      // Solo actuar si el modal está abierto y no hay un input con focus
      const activeElement = document.activeElement;
      const isInputFocused = activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.contentEditable === 'true'
      );

      if (!isInputFocused || activeElement === dropzoneRef.current) {
        console.log('Global paste event detected, processing...');
        handlePaste(e);
      }
    };

    document.addEventListener('paste', handleGlobalPaste);

    return () => {
      document.removeEventListener('paste', handleGlobalPaste);
    };
  }, [open]);

  // Cuando se agregan o cambian ítems, ajustar la fecha compromiso del pedido
  useEffect(() => {
    if (items.length > 0) {
      // Buscar la fecha de entrega más próxima
      const fechas = items.map(i => i.due_date).filter(Boolean);
      if (fechas.length > 0) {
        const menor = fechas.reduce((a, b) => (a < b ? a : b));
        setForm(f => ({ ...f, due_date: menor }));
      }
    }
  }, [items]);

  // Precarga la primera imagen del comprobante para detectar errores de carga
  useEffect(() => {
    const first = (form.abono_images && form.abono_images.length) ? (form.abono_images[0]?.url || form.abono_images[0]) : null;
    if (!first) {
      setImgLoadError(false);
      return;
    }
    const img = new Image();
    img.src = encodeURI(normalizeServerUrl(first));
    img.onload = () => setImgLoadError(false);
    img.onerror = () => setImgLoadError(true);
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [form.abono_images]);

  const displayedFileName = (form.abono_images && form.abono_images.length) ? getFileNameFromUrl(form.abono_images[0]?.url || form.abono_images[0]) : "";

  const isDirty = useMemo(
    () => JSON.stringify({ form, items }) !== JSON.stringify({ form: initialFormRef.current, items: editMode && order ? (order.items ?? []) : [] }),
    [form, items, editMode, order]
  );

  const isValid = Boolean(
    form.client_name?.trim() &&
    form.title?.trim() &&
    form.delivery_method?.trim()
    // si quieres due_date obligatorio: && form.due_date?.trim()
  );

  // En modo edición, permitir fechas pasadas (solo advertir visualmente)
  // En modo creación, la fecha mínima se aplica en el input HTML
  const isDueInvalid = !editMode && !!form.due_date && isBeforeTodayISO(form.due_date);

  // Subir uno o varios comprobantes; guarda las URLs en form.abono_images
  async function handleFileChange(e) {
    const files = e.target.files && Array.from(e.target.files);
    if (!files || files.length === 0) return;
    
    await handleFileUpload(files);
    
    // Limpiar input file (para permitir re-subir el mismo archivo si se desea)
    try { e.target.value = null; } catch (_) { /* ignore */ }
  }

  // Eliminar un comprobante por índice
  async function handleDeleteAbono(index) {
    const current = form.abono_images || [];
    if (index < 0 || index >= current.length) return;
    const target = current[index];
    // Si tiene id y estamos en edición, eliminar en backend
    if (editMode && order?.code && target?.id) {
      setDeletingAbono(true);
      try {
        const res = await fetch(`/api/orders/${order.code}/receipts/${target.id}`, { method: 'DELETE' });
        if (!res.ok) {
          // ignore error but report
          console.error('Error deleting receipt', await res.text());
        } else {
          onNotify?.('Comprobante eliminado', 'success');
          onUpdated?.();
        }
      } catch (err) {
        console.error(err);
      } finally {
        setDeletingAbono(false);
      }
    }
    // Actualizar UI localmente (eliminar el item)
    setForm(f => ({ ...f, abono_images: dedupeReceipts(f.abono_images.filter((_, i) => i !== index)) }));

    // Si estamos en edición y la orden existe, verificar si ya no quedan receipts en el servidor
    // Si no quedan, limpiar el campo legacy abono_image_url para evitar que reaparezca al reabrir el modal
    if (editMode && order?.code) {
      try {
        const listRes = await fetch(`/api/orders/${order.code}/receipts`);
        if (listRes.ok) {
          const list = await listRes.json();
          if (!list || list.length === 0) {
            // Limpiar abono_image_url en el pedido (en backend se normaliza "" a None)
            try {
              await api.updateOrder(order.code, { abono_image_url: "" });
              // opcional: notificar y refrescar
              onNotify?.('Comprobante principal limpiado', 'info');
              onUpdated?.();
            } catch (err) {
              console.error('Error clearing legacy abono_image_url', err);
            }
          }
        }
      } catch (err) {
        console.error('Error checking receipts after delete', err);
      }
    }
  }

  // Funciones para drag & drop y paste
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/')
    );
    
    if (files.length === 0) {
      showToast('❌ Solo se permiten archivos de imagen', 'error');
      return;
    }

    await handleFileUpload(files);
  };

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
      console.log('Ctrl+V detected, focus on dropzone');
      // Asegurar que el elemento tenga focus para recibir el paste
      if (dropzoneRef.current) {
        dropzoneRef.current.focus();
      }
    }
  };

  // Prevenir submit del formulario al presionar Enter en inputs
  const preventEnterSubmit = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  };

  const handlePaste = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('Paste event triggered:', e);
    
    const items = e.clipboardData?.items;
    
    if (!items) {
      console.log('No clipboard items found');
      return;
    }
    
    console.log('Clipboard items:', Array.from(items).map(item => ({ type: item.type, kind: item.kind })));
    
    const imageFiles = [];
    
    for (let item of items) {
      console.log('Processing item:', item.type, item.kind);
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          console.log('Found image file:', file.name, file.type, file.size);
          // Generar nombre descriptivo
          const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
          const extension = file.type.split('/')[1] || 'png';
          const fileName = `pasted_image_${timestamp}.${extension}`;
          
          // Crear nuevo File con Blob y propiedades personalizadas (más compatible)
          const renamedFile = new Blob([file], { type: file.type });
          renamedFile.name = fileName;
          renamedFile.lastModified = Date.now();
          
          // Convertir Blob a File-like object
          Object.defineProperty(renamedFile, 'name', {
            value: fileName,
            writable: false
          });
          
          imageFiles.push(renamedFile);
        }
      }
    }
    
    if (imageFiles.length > 0) {
      console.log('Processing', imageFiles.length, 'pasted images');
      showToast(`📋 ${imageFiles.length} imagen(es) pegada(s) desde portapapeles`, 'success');
      await handleFileUpload(imageFiles);
    } else {
      console.log('No images found in clipboard');
      showToast('❌ No se encontraron imágenes en el portapapeles', 'error');
    }
  };

  // Función para detectar si un archivo es una imagen
  const isImageFile = (file) => {
    return file && file.type && file.type.startsWith('image/');
  };

  // Función para interceptar archivos de imagen y ofrecer detección de montos
  const handleFileUpload = async (newFiles) => {
    console.log('📁 handleFileUpload called with:', newFiles);
    
    const imageFiles = newFiles.filter(isImageFile);
    const nonImageFiles = newFiles.filter(f => !isImageFile(f));
    
    console.log('🖼️ Image files:', imageFiles.length);
    console.log('📄 Non-image files:', nonImageFiles.length);

    // Subir archivos no-imagen normalmente (sin OCR)
    if (nonImageFiles.length > 0) {
      console.log('⬆️ Uploading non-image files...');
      await processFiles(nonImageFiles);
    }

    if (imageFiles.length > 0) {
      console.log('🔍 Processing image files for OCR...');
      // Si solo hay una imagen, mostrar detección directamente (sin subir primero)
      if (imageFiles.length === 1) {
        const file = imageFiles[0];
        console.log('📷 Single image file:', file.name);
        
        // Mostrar detección directamente (AmountDetection se encarga del upload)
        setCurrentFileForDetection(file);
        setPendingFiles([]);
        setShowAmountDetection(true);
        console.log('✅ AmountDetection activated for:', file.name);
      } else {
        // Para múltiples imágenes, hacer detección automática en todas
        // Mostrar detección para el primer archivo, resto pendiente
        const firstFile = imageFiles[0];
        console.log('📷 Multiple images, processing first:', firstFile.name);
        
        // Configurar detección para el primer archivo, resto pendiente para procesar después
        setCurrentFileForDetection(firstFile);
        setPendingFiles(imageFiles.slice(1)); // Resto de archivos pendientes (aún no subidos)
        setShowAmountDetection(true);
        console.log('✅ AmountDetection activated for first file:', firstFile.name);
        console.log('⏳ Pending files:', imageFiles.slice(1).map(f => f.name));
      }
    }
  };

  // Función para manejar cuando se detecta un monto automáticamente
  const handleAmountDetected = async (detectedAmount, itemId, mode) => {
    console.log('💰 NewOrderModal: Amount detected:', detectedAmount, 'for item:', itemId, 'mode:', mode);
    
    if (!itemId) {
      showToast('❌ Debes seleccionar un item para vincular el comprobante', 'error');
      return;
    }

    // Auto-transición: Si el pedido está en "pre-pedido" y se detecta un abono,
    // cambiar automáticamente a "recibido"
    if (form.status === "pre-pedido" && detectedAmount > 0) {
      console.log('🔄 Auto-transición: pre-pedido → recibido (abono detectado)');
      setForm(prev => ({ ...prev, status: "recibido" }));
      showToast('✅ Pedido cambiado a "Recibido" automáticamente', 'info');
    }

    // Si es modo manual, solo marcar el item para entrada manual
    if (mode === 'manual') {
      setManualEntryItemId(itemId);
      // Continuar con el procesamiento del archivo sin aplicar monto
      setTimeout(async () => {
        console.log('⏰ Modo manual activado, procesando archivo...');
        await processCurrentFileAndContinue();
      }, 100);
      return;
    }

    // Aplicar el abono al item seleccionado (solo si hay monto detectado)
    if (detectedAmount) {
      setItems(prev => prev.map(item => {
        if (String(item.id) === String(itemId)) { // Comparar como strings para evitar problemas con tipos
          const currentPaid = item.paid_amount || 0;
          const newPaidAmount = currentPaid + detectedAmount; // Directamente en pesos chilenos
          console.log(`📝 NewOrderModal: Updating item "${item.description}": paid_amount ${currentPaid} + ${detectedAmount} = ${newPaidAmount}`);
          
          return {
            ...item,
            paid_amount: newPaidAmount
          };
        }
        return item;
      }));
    }
    
    // **🔧 FIX: Esperar a que se actualice el estado antes de continuar**
    // Usar setTimeout para asegurar que el setItems se aplique
    setTimeout(async () => {
      console.log('⏰ Estado actualizado, continuando con archivo...');
      await continueAfterAmountDetected(detectedAmount);
    }, 100);
  };
  
  // Función separada para continuar después de aplicar el abono
  const continueAfterAmountDetected = async (appliedAmount) => {
    // **🔧 FIX: Subir la imagen del comprobante también**
    if (currentFileForDetection) {
      console.log('📤 Subiendo comprobante después de aplicar abono:', currentFileForDetection.name);
      try {
        // Subir archivo a Supabase Storage con metadata del pedido
        const formData = new FormData();
        formData.append("file", currentFileForDetection);
        // Agregar metadata si está disponible
        if (order?.code) {
          formData.append("order_code", order.code);
        }
        if (appliedAmount) {
          formData.append("amount", appliedAmount.toString());
        }
        
        const res = await fetch("/api/upload-abono-image", {
          method: "POST",
          body: formData,
        });
        
        if (!res.ok) {
          const txt = await res.text();
          let errorDetail = "Error al subir imagen a Supabase Storage";
          try {
            const errorJson = JSON.parse(txt);
            errorDetail = errorJson.detail || errorDetail;
          } catch {
            errorDetail = txt || errorDetail;
          }
          throw new Error(errorDetail);
        }
        
        const uploadResult = await res.json();
        console.log('📡 Upload response:', uploadResult);
        
        // El backend siempre devuelve Supabase ahora (no hay fallback local)
        const imageData = { 
          url: uploadResult.url, 
          storage_key: uploadResult.storage_key, 
          filename: getFileNameFromUrl(uploadResult.url) 
        };
        
        // **🔧 CRÍTICO: Agregar directamente al estado del formulario**
        setForm(prevForm => {
          const newImages = dedupeReceipts([...(prevForm.abono_images || []), imageData]);
          console.log('🖼️ Agregando comprobante al estado:', newImages);
          return { ...prevForm, abono_images: newImages };
        });
        
        console.log('✅ Comprobante subido y agregado al estado correctamente');
      } catch (error) {
        console.error('❌ Error subiendo comprobante después del OCR:', error);
        const errorMsg = error.message || 'Error al guardar el comprobante en Supabase Storage';
        showToast(`❌ ${errorMsg}`, 'error');
      }
    }
    
    // Limpiar selección de item y continuar con siguiente archivo
    setSelectedItemId(null);
    await finishFileProcessing();
    
    showToast(`✅ Abono de $${appliedAmount.toLocaleString('es-CL')} aplicado`, 'success');
  };

  // Función para cancelar detección y procesar archivos normalmente
  const handleDetectionCanceled = async () => {
    try {
      // No reprocessar archivo actual, solo continuar con pendientes
      await finishFileProcessing();
    } catch (error) {
      console.error('❌ Error al continuar con archivos pendientes:', error);
      // En caso de error, solo limpiar el estado
      setShowAmountDetection(false);
      setCurrentFileForDetection(null);
      setPendingFiles([]);
    }
  };

  // Función para procesar archivo actual y continuar con el siguiente
  const processCurrentFileAndContinue = async () => {
    if (currentFileForDetection) {
      try {
        // Procesar archivo actual
        await processFiles([currentFileForDetection]);
        
        // Si llegamos aquí, el archivo se procesó exitosamente
        finishFileProcessing();
        
      } catch (error) {
        console.error('❌ Error al procesar archivo:', error);
        // En caso de error, mostrar mensaje y limpiar estado
        showToast('❌ Error al subir archivo', 'error');
        finishFileProcessing();
      }
    } else {
      finishFileProcessing();
    }
  };

  // Función para omitir archivo completamente (sin subir)
  const handleSkipFile = () => {
    console.log('⏭️ NewOrderModal: Skipping file:', currentFileForDetection?.name);
    finishFileProcessing();
    showToast('📄 Archivo omitido', 'info');
  };
  const finishFileProcessing = async () => {
    // Remover archivo actual de pendientes
    const remainingFiles = pendingFiles.filter(f => f !== currentFileForDetection);
    setPendingFiles(remainingFiles);
    
    if (remainingFiles.length > 0) {
      // Subir el siguiente archivo antes de mostrar detección
      const nextFile = remainingFiles[0];
      await processFiles([nextFile]);
      
      // Continuar con el siguiente archivo
      setCurrentFileForDetection(nextFile);
      setPendingFiles(remainingFiles.slice(1)); // Remover el que acabamos de subir
    } else {
      // No hay más archivos, cerrar detección
      setShowAmountDetection(false);
      setCurrentFileForDetection(null);
    }
  };

  // Función común para procesar archivos (desde drag & drop, paste o input)
  const processFiles = async (files) => {
    if (!files || files.length === 0) return;
    
    setUploading(true);
    try {
      // Subir todos en paralelo
      const uploads = files.map(async (file) => {
        const formData = new FormData();
        
        // Manejar tanto File como Blob (para paste)
        const fileName = file.name || `pasted_image_${Date.now()}.png`;
        formData.append("file", file, fileName);
        
        // Agregar metadata del pedido si está disponible
        if (order?.code) {
          formData.append("order_code", order.code);
          console.log(`📦 [processFiles] Order code: ${order.code}`);
        }
        // Calcular monto total abonado si hay items
        if (items && items.length > 0) {
          const totalPaid = items.reduce((sum, item) => sum + (parseInt(item.paid_amount) || 0), 0);
          if (totalPaid > 0) {
            formData.append("amount", totalPaid.toString());
            console.log(`💰 [processFiles] Total paid: $${totalPaid.toLocaleString('es-CL')}`);
          }
        }
        
        console.log(`📤 [processFiles] Subiendo archivo: ${fileName}, tamaño: ${file.size} bytes`);
        
        const res = await fetch("/api/upload-abono-image", {
          method: "POST",
          body: formData,
        });
        
        console.log(`📡 [processFiles] Response status: ${res.status} ${res.statusText}`);
        
        if (!res.ok) {
          const txt = await res.text();
          console.error(`❌ [processFiles] Upload failed:`, txt);
          let errorDetail = "Error al subir imagen a Supabase Storage";
          try {
            const errorJson = JSON.parse(txt);
            errorDetail = errorJson.detail || errorDetail;
          } catch {
            errorDetail = txt || errorDetail;
          }
          throw new Error(errorDetail);
        }
        const data = await res.json();
        console.log('✅ [processFiles] Upload response:', data);
        
        // El backend siempre devuelve Supabase ahora (no hay fallback local)
        const result = { 
          url: data.url, 
          storage_key: data.storage_key, 
          filename: getFileNameFromUrl(data.url) 
        };
        console.log('🏗️ [processFiles] Processed result:', result);
        return result;
      });

      const results = await Promise.all(uploads);
      
      // En modo edición, NO persistir inmediatamente - mantener solo en estado temporal
      // Los comprobantes se guardarán cuando se haga "Guardar cambios"
      console.log('💾 Manteniendo comprobantes en estado temporal hasta guardar cambios');
      setForm((f) => {
        const newImages = dedupeReceipts([ ...(f.abono_images || []), ...results ]);
        console.log('🖼️ Updating abono_images (temporal):', newImages);
        return { ...f, abono_images: newImages };
      });
      
      showToast(`✅ ${results.length} archivo(s) subido(s) a Supabase`, 'success');
    } catch (err) {
      console.error('❌ Upload error:', err);
      const errorMsg = err.message || 'Error al subir archivos a Supabase Storage';
      showToast(`❌ ${errorMsg}`, 'error');
      onNotify && onNotify(errorMsg, "error");
    } finally {
      setUploading(false);
    }
  };

  // Toast notifications
  const showToast = (message, type = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 5000);
  };

  async function handleSubmit(e) {
    e.preventDefault();
    
    // Verificar si el submit fue disparado por Enter (no por click del botón)
    if (e.nativeEvent?.submitter === null) {
      // Submit vino de Enter, ignorarlo
      return;
    }
    
    if (!isValid || (editMode && !isDirty) || loading) return;

    // Validación: no permitir fechas anteriores a hoy
    if (isDueInvalid) {
      const msg = "La fecha de compromiso no puede ser anterior a hoy.";
      setError(msg);
      onNotify?.(msg, "warning");
      return;
    }

    setLoading(true);
    setError("");

    // Normaliza el status para que siempre sea el esperado
    function normalizeStatus(s = "") {
      return s.replace(/\s+/g, "_").toLowerCase();
    }
    // Construimos payload y aseguramos due_date normalizado
    const base = buildOrderPayload(form);
    const dueISO = normalizeDate(form.due_date);
    
    // 🔍 DEBUG: Verificar estado antes de guardar
    console.log('🔍 [DEBUG] Estado antes de guardar:');
    console.log('📄 form.abono_images:', form.abono_images);
    console.log('📦 items completos:', items);
    console.log('💰 items paid_amounts:', items.map(i => ({ 
      id: i.id, 
      description: i.description, 
      paid_amount: i.paid_amount,
      price: i.price
    })));
    
    const payloadItems = items.map(item => ({
      description: item.description,
      due_date: normalizeDate(item.due_date),
      quantity: Number(item.quantity) || 1,
      price: Number(item.price) || 0,
      paid_amount: Number(item.paid_amount) || 0
    }));
    
    const payload = {
      ...base,
      ...(dueISO ? { due_date: dueISO } : {}),
      status: normalizeStatus(form.status || "pre-pedido"),
      // Compatibilidad backend: enviar el primer comprobante (si existe) como abono_image_url (string URL)
      abono_image_url: (form.abono_images && form.abono_images.length) ? (form.abono_images[0]?.url || form.abono_images[0]) : undefined,
      items: payloadItems
    };
    
    console.log('📤 [DEBUG] Payload items enviados:', payloadItems);
    console.log('📤 [DEBUG] Payload completo:', payload);

    try {
      let saved;
      if (editMode && order) {
        saved = await api.updateOrder(order.code, payload);
        
        // Persistir comprobantes que aún no tienen ID (comprobantes temporales)
        if (form.abono_images && form.abono_images.length) {
          const toPersist = form.abono_images.filter(a => !a.id);
          console.log('💾 Persistiendo comprobantes temporales en modo edición:', toPersist.length);
          
          for (const item of toPersist) {
            try {
              const res = await fetch(`/api/orders/${order.code}/receipts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  url: item.url, 
                  filename: item.filename,
                  storage_key: item.storage_key 
                })
              });
              if (res.ok) {
                const data = await res.json();
                console.log('✅ Comprobante persistido:', data);
              } else {
                console.error('❌ Error persistiendo comprobante:', await res.text());
              }
            } catch (err) {
              console.error('❌ Error persistiendo comprobante:', err);
            }
          }
        }
        
        onNotify?.(`Pedido editado correctamente${order?.code ? `: ${order.code}` : ""}`, "success");
        onUpdated?.(saved);
      } else {
        saved = await api.createOrder(payload); // FastAPI devuelve objeto plano: { code, ... }
        console.log('💾 Orden creada:', saved.code);
        
        // Si hay comprobantes locales (sin id), persistirlos para asociarlos a la nueva orden
        if (form.abono_images && form.abono_images.length) {
          const toPersist = form.abono_images.filter(a => !a.id);
          console.log(`\n${'='.repeat(80)}`);
          console.log(`💾 [handleSubmit] PERSISTIENDO COMPROBANTES`);
          console.log(`   Orden: ${saved.code}`);
          console.log(`   Total comprobantes: ${form.abono_images.length}`);
          console.log(`   Comprobantes a persistir (sin id): ${toPersist.length}`);
          console.log(`   Comprobantes:`, toPersist);
          console.log(`${'='.repeat(80)}\n`);
          
          const persisted = [];
          for (const item of toPersist) {
            try {
              console.log(`📤 [handleSubmit] Guardando comprobante en BD:`);
              console.log(`   Filename: ${item.filename}`);
              console.log(`   URL: ${item.url}`);
              console.log(`   Storage key: ${item.storage_key}`);
              
              const res = await fetch(`/api/orders/${saved.code}/receipts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  url: item.url, 
                  filename: item.filename,
                  storage_key: item.storage_key 
                })
              });
              
              console.log(`📡 [handleSubmit] Response status: ${res.status} ${res.statusText}`);
              
              if (res.ok) {
                const data = await res.json();
                console.log('✅ [handleSubmit] Comprobante guardado en BD:', data);
                persisted.push({ id: data.id, url: data.url, filename: data.filename, uploaded_at: data.uploaded_at });
              } else {
                const errorText = await res.text();
                console.error('❌ [handleSubmit] Error guardando comprobante en BD:', errorText);
                persisted.push(item);
              }
            } catch (err) {
              console.error('❌ [handleSubmit] Excepción persistiendo comprobante:', err);
              persisted.push(item);
            }
          }
          // Merge persisted receipts into the saved response so caller sees them
          saved.receipts = persisted;
          
          console.log(`\n${'='.repeat(80)}`);
          console.log(`✅ [handleSubmit] PERSISTENCIA COMPLETADA`);
          console.log(`   Comprobantes guardados: ${persisted.filter(p => p.id).length}/${toPersist.length}`);
          console.log(`${'='.repeat(80)}\n`);
        }
        onNotify?.(`Pedido creado: ${saved.code}`, "success");
        onCreated?.(saved);
      }
      onClose?.();
    } catch (err) {
      let msg = "Error de red";
      let status = null;

      if (err instanceof HttpError) {
        status = err.status;
        msg = err.message || msg;
      } else if (err?.message) {
        msg = err.message;
      }

      console.groupCollapsed("[Orders] Error al guardar");
      console.error("Status:", status);
      console.error("Message:", msg);
      console.error("Payload:", payload);
      console.groupEnd();

      const pretty = status ? `[${status}] ${msg}` : msg;
      setError(pretty);
      onNotify?.(pretty, "error");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 p-4 overflow-y-auto">
      <div className="min-h-full flex items-center justify-center py-8">
  <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-xl max-h-[90vh] overflow-y-auto">
          <div className="p-5">
        {/* Header estable con badge del código en modo edición */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h3 className="text-lg font-semibold">
            {editMode ? "Editar pedido" : "Nuevo pedido"}
          </h3>
          {editMode && order?.code && (
            <span className="inline-flex items-center rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-sm font-mono text-slate-700">
              {order.code}
            </span>
          )}
        </div>

  <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* 1a fila */}
          <label className="text-sm">
            Proyecto
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              onKeyDown={preventEnterSubmit}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-400"
              placeholder="Nombre del proyecto"
            />
          </label>
          
          <label className="text-sm">
            Cliente
            <ClientAutocomplete
              value={form.client_name}
              onSelect={(cliente) => setForm({ ...form, client_name: cliente.nombre })}
              placeholder="Buscar o crear cliente..."
            />
          </label>

          {/* Comprobante de abono moved below items (rendered later) */}

          {/* 2a fila */}
          <label className="text-sm">
            Método de entrega
            <select
              value={form.delivery_method}
              onChange={(e) => setForm({ ...form, delivery_method: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-sky-400"
            >
              <option value="retiro">retiro</option>
              <option value="despacho">despacho</option>
            </select>
          </label>

          <label className="text-sm">
            Fecha compromiso
            <input
              type="date"
              value={form.due_date}
              min={editMode ? undefined : todayISO()}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              onKeyDown={preventEnterSubmit}
              className={`mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-sky-400 ${
                editMode && form.due_date && isBeforeTodayISO(form.due_date)
                  ? 'border-amber-300 bg-amber-50'
                  : 'border-slate-300'
              }`}
              title={editMode && form.due_date && isBeforeTodayISO(form.due_date) ? 'Fecha en el pasado (edición permitida)' : ''}
            />
            {editMode && form.due_date && isBeforeTodayISO(form.due_date) && (
              <span className="text-xs text-amber-600 mt-1 block">
                ⚠️ Fecha en el pasado (se puede guardar en modo edición)
              </span>
            )}
          </label>

          {/* Campo de fecha de entrega - solo visible si el pedido está entregado */}
          {form.status === "entregado" && (
            <label className="text-sm">
              Fecha de entrega
              <input
                type="date"
                value={form.delivered_date}
                onChange={(e) => setForm({ ...form, delivered_date: e.target.value })}
                onKeyDown={preventEnterSubmit}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-400"
              />
              <span className="text-xs text-slate-500 mt-1 block">
                Se establece automáticamente al marcar como entregado
              </span>
            </label>
          )}

          {/* Ítems del pedido */}
          <div className="col-span-full">
            <OrderItemsEditor
              items={items}
              editMode={editMode}
              manualEntryItemId={manualEntryItemId}
              onManualEntryCleared={() => setManualEntryItemId(null)}
              handleAdd={() => {
                // Fecha de entrega por defecto: 4 días hábiles desde hoy
                const fechaDefecto = addBusinessDays(form.due_date || todayISO(), 4);
                const newItem = {
                  id: Date.now() + Math.random(), // ID único temporal
                  description: "", 
                  quantity: 1, 
                  due_date: fechaDefecto, 
                  price: 0, 
                  paid_amount: 0,
                  name: "" // Agregar name para que se muestre en dropdown
                };
                setItems([...items, newItem]);
              }}
              handleDelete={idx => setItems(items.filter((_, i) => i !== idx))}
              handleClone={(idx) => {
                const itemToClone = items[idx];
                if (!itemToClone) return;
                
                // Crear una copia del item con un nuevo ID
                const clonedItem = {
                  ...itemToClone,
                  id: Date.now() + Math.random(), // Nuevo ID único temporal
                  paid_amount: 0, // Resetear abono a 0 en la copia
                };
                
                // Insertar el item clonado justo después del original
                const newItems = [...items];
                newItems.splice(idx + 1, 0, clonedItem);
                setItems(newItems);
                
                // Mostrar toast de confirmación
                showToast('✅ Ítem clonado exitosamente', 'success');
              }}
              handleChange={(idx, field, value) => {
                // Si el usuario edita el campo abono, limpiar el estado de entrada manual
                if (field === 'paid_amount' && manualEntryItemId) {
                  const editedItem = items[idx];
                  if (editedItem && String(editedItem.id) === String(manualEntryItemId)) {
                    setManualEntryItemId(null);
                  }
                }
                setItems(items => items.map((item, i) => i === idx ? { ...item, [field]: value } : item));
              }}
            />
          </div>

          {/* Comprobantes con Drag & Drop + Paste */}
          <div className="col-span-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <CloudUpload className="w-5 h-5 mr-2 text-blue-600" />
              Comprobantes de abono
            </h3>
            
            {/* Zona de drag & drop + paste */}
            <div 
              ref={dropzoneRef}
              className={`border-2 border-dashed rounded-lg p-4 text-center transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                isDragOver 
                  ? 'border-blue-400 bg-blue-50' 
                  : uploading 
                  ? 'border-gray-200 bg-gray-50' 
                  : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/50'
              }`}
              tabIndex={0}
              onClick={() => !uploading && document.getElementById('file-input').click()}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input 
                id="file-input"
                type="file" 
                accept="image/*" 
                onChange={handleFileChange} 
                disabled={uploading} 
                multiple 
                className="hidden"
              />
              
              {uploading ? (
                <div className="flex flex-col items-center">
                  <Upload className="w-5 h-5 text-blue-500 animate-bounce mb-2" />
                  <p className="text-sm font-medium text-gray-900 mb-1">Subiendo archivos...</p>
                  <p className="text-xs text-gray-500">Por favor espera</p>
                </div>
              ) : (
                <>
                  <CloudUpload className="w-6 h-6 text-gray-400 mx-auto mb-2 transition-colors group-hover:text-blue-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 mb-1">
                      Arrastra archivos aquí, 
                      <span> </span><span className="text-blue-600 hover:text-blue-500 underline">explora</span> o 
                      <span className="text-green-600 font-semibold"> pega desde portapapeles</span>
                    </p>
                    <p className="text-xs text-gray-500 mb-2">
                      PNG, JPG hasta 5MB • Múltiples archivos • Screenshots
                    </p>
                    
                    {/* Instrucciones de teclado */}
                    <div className="flex items-center justify-center space-x-3 text-xs text-gray-400">
                      <div className="flex items-center space-x-1">
                        <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs font-mono text-gray-600">Ctrl+V</kbd>
                        <span>pegar</span>
                      </div>
                      <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                      <div className="flex items-center space-x-1">
                        <Clipboard className="w-3 h-3" />
                        <span>Click para seleccionar</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Archivos subidos */}
            {form.abono_images && form.abono_images.length > 0 && (
              <div className="mt-4 space-y-2">
                {form.abono_images.map((u, idx) => (
                  <div key={u.id ?? u.url ?? idx} className="flex items-center space-x-3 p-3 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors">
                    <div className="flex-shrink-0">
                      <File className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate" title={u.filename || getFileNameFromUrl(u.url)}>
                        {u.filename || getFileNameFromUrl(u.url)}
                      </p>
                      <div className="flex items-center space-x-4 mt-1">
                        <p className="text-xs text-gray-500">
                          {u.uploaded_at ? `Subido el ${new Date(u.uploaded_at).toLocaleDateString()}` : 'Pendiente'}
                        </p>
                        <div className="flex items-center text-xs text-green-600">
                          <CloudUpload className="w-3 h-3 mr-1" />
                          <span>Supabase Storage</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button 
                        type="button"
                        className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-md transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          const url = normalizeServerUrl(u.url || u);
                          window.dispatchEvent(new CustomEvent('open-comprobante-preview', { detail: { url } }));
                        }}
                        title="Ver comprobante"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        type="button"
                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-md transition-colors"
                        onClick={() => handleDeleteAbono(idx)}
                        disabled={deletingAbono}
                        title="Eliminar comprobante"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Componente de detección automática de montos */}
          {showAmountDetection && currentFileForDetection && (
            <div className="col-span-full">
              <AmountDetection
                file={currentFileForDetection}
                items={items}
                selectedItemId={selectedItemId}
                onItemSelected={setSelectedItemId}
                onAmountDetected={handleAmountDetected}
                onCancel={handleDetectionCanceled}
                onSkipFile={handleSkipFile}
                isVisible={showAmountDetection}
              />
            </div>
          )}

          {/* Resumen financiero destacado */}
          {items.length > 0 && (
            <div className="col-span-full bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                <Calculator className="w-5 h-5 mr-2 text-blue-600" />
                Resumen financiero
              </h3>
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <Tag className="w-6 h-6 text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 mb-1">Total precio</p>
                    <p className="text-2xl font-bold text-green-600">
                      {items.reduce((sum, item) => sum + (parseInt(item.price) || 0), 0).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}
                    </p>
                  </div>
                </div>
                <div className="text-center">
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <CheckCircle className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 mb-1">Total abonado</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {items.reduce((sum, item) => sum + (parseInt(item.paid_amount) || 0), 0).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}
                    </p>
                  </div>
                </div>
                <div className="text-center">
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <Clock className="w-6 h-6 text-red-500 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 mb-1">Pendiente</p>
                    <p className="text-2xl font-bold text-red-600">
                      {(items.reduce((sum, item) => sum + (parseInt(item.price) || 0), 0) - 
                         items.reduce((sum, item) => sum + (parseInt(item.paid_amount) || 0), 0)).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Descripción al final */}
          <label className="col-span-full text-sm">
            Descripción
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-400"
              placeholder="Notas del pedido…"
            />
          </label>

          

          <div className="col-span-full flex items-center gap-3">
            <button
              disabled={loading || (editMode && !isDirty) || !isValid}
              aria-disabled={loading || (editMode && !isDirty) || !isValid}
              title={
                !isValid
                  ? "Completa los campos requeridos"
                  : editMode && !isDirty
                  ? "Sin cambios"
                  : ""
              }
              type="submit"
              className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
            >
              {editMode ? "Guardar cambios" : "Crear pedido"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
              disabled={loading}
            >
              Cancelar
            </button>
            {loading && <span className="text-sm text-slate-500">Guardando…</span>}
            {error && <span className="text-sm text-rose-600">{error}</span>}
            {isDueInvalid && (
              <span className="text-xs text-amber-600">Advertencia: la fecha de compromiso es anterior a hoy.</span>
            )}
            {editMode && !isDirty && (
              <span className="text-xs text-slate-500">Sin cambios</span>
            )}
          </div>
        </form>
          </div>
        </div>
      </div>

      {/* Toast notification dentro del overlay */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
          <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                {toastMessage.type === 'success' ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <ExternalLink className="w-5 h-5 text-red-500" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{toastMessage.message}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}