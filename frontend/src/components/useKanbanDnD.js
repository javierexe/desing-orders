// frontend/src/components/useKanbanDnD.js
import { useState } from "react";
import {
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { findContainerOf } from "./kanbanHelpers";
import { useConfirmDialog } from "./ConfirmDialog";
import { api } from "../lib/api";

export function useKanbanDnD(columns, setColumns, getOrderById, onChangeStatus, backendStatus) {
  const { showConfirm } = useConfirmDialog();
  // Estado para guardar las columnas originales al iniciar el drag
  const [originalColumns, setOriginalColumns] = useState(null);
  
  const mouseSensor = useSensor(MouseSensor, { activationConstraint: { distance: 6 } });
  const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } });
  const sensors = useSensors(mouseSensor, touchSensor);

  const [activeId, setActiveId] = useState(null);

  function handleDragStart(e) {
  setOriginalColumns({ ...columns });
  setActiveId(e.active.id);
  }

  function handleDragOver(e) {
    
    const { active, over } = e;
    if (!over) return;
    const aId = String(active.id);
    const oId = String(over.id);

    setColumns((prev) => {
      const from = findContainerOf(aId, prev);
      const to = findContainerOf(oId, prev) || oId;
      if (!from || !to || from === to) return prev;

      const next = JSON.parse(JSON.stringify(prev));
      next[from] = (next[from] || []).filter((x) => x !== aId);
      const overItems = next[to] || [];
      const overIndex = overItems.indexOf(oId);
      const insertAt = overIndex >= 0 ? overIndex : overItems.length;
      if (!overItems.includes(aId)) overItems.splice(insertAt, 0, aId);
      next[to] = overItems;
      return next;
    });
  }

  function handleDragEnd(e) {
    const { active, over } = e;
    setActiveId(null);
    
    if (!over) return;
    
    const aId = String(active.id);
    const oId = String(over.id);
    
    // Usar siempre originalColumns para determinar origen (más confiable)
    const from = originalColumns ? findContainerOf(aId, originalColumns) : findContainerOf(aId, columns);
    
    let to = null;
    if (columns[oId]) {
      to = oId;
    } else {
      to = findContainerOf(oId, columns);
    }
    
    // Limpiar estado de drag
    setOriginalColumns(null);
    
    // Solo ejecutar si hubo cambio de columna
    if (from && to && from !== to) {
      const moved = getOrderById(aId);
      
      if (moved && onChangeStatus) {
        // Verificar si se está moviendo a "entregado"
        if (to === 'entregado') {
          handleDeliveryConfirmation(moved, to);
        } else {
          // Para todos los demás movimientos, incluido pre_pedido → recibido
          onChangeStatus(moved.code, backendStatus[to] || to);
        }
      }
    }
  }

  // Función para manejar la confirmación de entrega
  async function handleDeliveryConfirmation(order, targetStatus) {
    const pendingAmount = order.pending_amount || 0;
    const hasPendingDebt = pendingAmount > 0;
    
    // Formatear el monto pendiente en CLP
    const formattedPending = parseInt(pendingAmount).toLocaleString('es-CL', { 
      style: 'currency', 
      currency: 'CLP' 
    });
    
    if (hasPendingDebt) {
      // Si tiene deuda pendiente, mostrar diálogo con 3 opciones
      const result = await showConfirm({
        title: 'Confirmación de entrega',
        message: `El pedido "${order.code}" tiene un saldo pendiente de ${formattedPending}.\n\n¿Cómo deseas proceder?`,
        confirmText: 'Sí, pagó todo',
        neutralText: 'Entregar con deuda',
        cancelText: 'No mover pedido',
        type: 'warning'
      });
      
      if (result === true) {
        // Auto-liquidar la deuda
        try {
          console.log(`💰 Auto-liquidando deuda de ${formattedPending} para pedido ${order.code}`);
          await api.autoSettleOrder(order.code);
          console.log(`✅ Deuda auto-liquidada exitosamente`);
          // Mover a entregado después de liquidar
          onChangeStatus(order.code, backendStatus[targetStatus] || targetStatus);
        } catch (error) {
          console.error('❌ Error al auto-liquidar deuda:', error);
          alert(`Error al procesar el pago: ${error.message || 'Error desconocido'}`);
          revertColumns(order.code);
        }
      } else if (result === null) {
        // Entregar con deuda pendiente (botón neutral)
        onChangeStatus(order.code, backendStatus[targetStatus] || targetStatus);
      } else {
        // Cancelar (result === false)
        revertColumns(order.code);
      }
      
    } else {
      // Si no tiene deuda, solo confirmar la entrega
      const confirmed = await showConfirm({
        title: 'Confirmar entrega',
        message: `¿Confirmas que el pedido "${order.code}" será entregado?`,
        confirmText: 'Sí, entregar',
        type: 'info'
      });
      
      if (confirmed) {
        onChangeStatus(order.code, backendStatus[targetStatus] || targetStatus);
      } else {
        // Revertir el drag visual si cancela
        revertColumns(order.code);
      }
    }
  }
  
  // Función auxiliar para revertir columnas
  function revertColumns(orderCode) {
    setColumns(prevColumns => {
      const revertedColumns = JSON.parse(JSON.stringify(prevColumns));
      const currentContainer = findContainerOf(orderCode, revertedColumns);
      
      if (currentContainer) {
        revertedColumns[currentContainer] = revertedColumns[currentContainer].filter(
          id => id !== orderCode
        );
      }
      
      const originalContainer = originalColumns ? 
        findContainerOf(orderCode, originalColumns) : null;
      
      if (originalContainer && revertedColumns[originalContainer]) {
        const originalIndex = originalColumns[originalContainer].indexOf(orderCode);
        revertedColumns[originalContainer].splice(
          originalIndex >= 0 ? originalIndex : revertedColumns[originalContainer].length,
          0,
          orderCode
        );
      }
      
      return revertedColumns;
    });
  }

  return {
    sensors,
    activeId,
    setActiveId,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    collisionDetection: closestCorners,
  };
}
