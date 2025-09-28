import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export default function PreviewModal() {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [url, setUrl] = useState('');
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 });
  const [loading, setLoading] = useState(true);
  const containerRef = useRef(null);
  const closeBtnRef = useRef(null);
  const previousActiveRef = useRef(null);

  useEffect(() => {
    function handler(e) {
      const u = e?.detail?.url;
      if (!u) return;
      const final = u.startsWith('/api') ? u : `/api${u}`;
      setUrl(final);
      setClosing(false);
      setLoading(true);
      // keep reference to previously focused element
      previousActiveRef.current = document.activeElement;
      // open immediately to show loader
      setImgSize({ width: Math.round(window.innerWidth * 0.4), height: Math.round(window.innerHeight * 0.4) });
      setOpen(true);

      // preload image to get natural size
      const img = new Image();
      img.src = encodeURI(final);
      img.onload = () => {
        const maxW = Math.round(window.innerWidth * 0.9);
        const maxH = Math.round(window.innerHeight * 0.9);
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        const ratio = Math.min(1, maxW / w, maxH / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
        setImgSize({ width: w, height: h });
        setLoading(false);
        // focus the close button for accessibility
        setTimeout(() => closeBtnRef.current?.focus(), 10);
      };
      img.onerror = () => {
        setImgSize({ width: Math.round(window.innerWidth * 0.8), height: Math.round(window.innerHeight * 0.8) });
        setLoading(false);
        setTimeout(() => closeBtnRef.current?.focus(), 10);
      };
    }
    window.addEventListener('open-comprobante-preview', handler);
    return () => window.removeEventListener('open-comprobante-preview', handler);
  }, []);

  // key handlers (Escape to close, Tab trap)
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        doClose();
      } else if (e.key === 'Tab') {
        // focus trap
        const container = containerRef.current;
        if (!container) return;
        const focusable = container.querySelectorAll('a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])');
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  function doClose() {
    setClosing(true);
    setTimeout(() => {
      setOpen(false);
      setClosing(false);
      setUrl('');
      setImgSize({ width: 0, height: 0 });
      setLoading(true);
      // restore focus
      try { previousActiveRef.current?.focus(); } catch (e) { /* ignore */ }
    }, 200);
  }

  if (!open) return null;

  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70" onClick={() => doClose()}>
      <div
        ref={containerRef}
        className={`relative bg-white rounded shadow-2xl overflow-hidden transform ${closing ? 'animate-scale-out' : 'scale-95 opacity-0 animate-scale-in'}`}
        style={{ width: imgSize.width, height: imgSize.height }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Prominent Close button positioned over image */}
        <button
          ref={closeBtnRef}
          aria-label="Cerrar preview"
          onClick={() => doClose()}
          className="absolute right-3 top-3 z-30 inline-flex items-center gap-2 rounded-full bg-white p-2 md:p-3 shadow-lg hover:bg-white/90 focus:outline-none"
          style={{ backdropFilter: 'blur(6px)' }}
        >
          <X className="w-5 h-5 text-slate-900" />
          <span className="hidden md:inline text-sm text-slate-900 font-medium">Cerrar</span>
        </button>

        <div className="w-full h-full flex items-center justify-center bg-white">
          {loading ? (
            <div className="flex flex-col items-center gap-3" role="status" aria-live="polite">
              <svg className="animate-spin h-12 w-12 text-sky-600" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
              <div className="text-sm text-slate-600">Cargando imagen…</div>
            </div>
          ) : (
            <img src={encodeURI(url)} alt="preview" className="max-h-full max-w-full object-contain" />
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
