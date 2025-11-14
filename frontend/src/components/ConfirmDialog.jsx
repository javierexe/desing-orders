import React, { useState, useEffect } from 'react';
import { AlertTriangle, Info, Trash2, X } from 'lucide-react';

/**
 * Modal de confirmación personalizado
 * 
 * Uso:
 * const { showConfirm } = useConfirmDialog();
 * const confirmed = await showConfirm({
 *   title: "Confirmar eliminación",
 *   message: "¿Estás seguro?",
 *   type: "danger" // "danger", "warning", "info"
 * });
 */

let globalShowConfirm = null;
let globalShowAlert = null;

export function ConfirmDialogProvider({ children }) {
  const [dialog, setDialog] = useState(null);

  useEffect(() => {
    globalShowConfirm = (options) => {
      return new Promise((resolve) => {
        setDialog({
          ...options,
          type: options.type || 'warning',
          onConfirm: () => {
            setDialog(null);
            resolve(true);
          },
          onCancel: () => {
            setDialog(null);
            resolve(false);
          }
        });
      });
    };

    globalShowAlert = (options) => {
      return new Promise((resolve) => {
        setDialog({
          ...options,
          type: options.type || 'info',
          isAlert: true,
          onConfirm: () => {
            setDialog(null);
            resolve(true);
          }
        });
      });
    };

    return () => {
      globalShowConfirm = null;
      globalShowAlert = null;
    };
  }, []);

  const getIcon = () => {
    switch (dialog?.type) {
      case 'danger':
        return <Trash2 className="w-12 h-12 text-rose-500" />;
      case 'warning':
        return <AlertTriangle className="w-12 h-12 text-amber-500" />;
      case 'info':
      default:
        return <Info className="w-12 h-12 text-blue-500" />;
    }
  };

  const getButtonColors = () => {
    switch (dialog?.type) {
      case 'danger':
        return 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-500';
      case 'warning':
        return 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500';
      case 'info':
      default:
        return 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500';
    }
  };

  if (!dialog) return children;

  return (
    <>
      {children}
      
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        {/* Modal */}
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <div className="flex items-center gap-3">
              {getIcon()}
              <h2 className="text-xl font-semibold text-slate-800">
                {dialog.title || 'Confirmación'}
              </h2>
            </div>
            {dialog.isAlert && (
              <button
                onClick={dialog.onConfirm}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Body */}
          <div className="p-6">
            <p className="text-slate-600 whitespace-pre-line">
              {dialog.message}
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 bg-slate-50 rounded-b-lg">
            {!dialog.isAlert && (
              <button
                onClick={dialog.onCancel}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-colors"
              >
                Cancelar
              </button>
            )}
            <button
              onClick={dialog.onConfirm}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${getButtonColors()}`}
            >
              {dialog.isAlert ? 'Aceptar' : (dialog.confirmText || 'Confirmar')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// Hook para usar el diálogo de confirmación
export function useConfirmDialog() {
  const showConfirm = (options) => {
    if (!globalShowConfirm) {
      console.error('ConfirmDialogProvider no está montado');
      return Promise.resolve(false);
    }
    return globalShowConfirm(options);
  };

  const showAlert = (options) => {
    if (!globalShowAlert) {
      console.error('ConfirmDialogProvider no está montado');
      return Promise.resolve(true);
    }
    return globalShowAlert(options);
  };

  return { showConfirm, showAlert };
}
