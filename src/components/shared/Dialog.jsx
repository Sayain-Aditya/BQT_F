import { useEffect } from 'react';

const ICONS = {
  danger:  { bg: 'bg-red-100',    icon: '🗑️',  titleColor: 'text-red-700'  },
  warning: { bg: 'bg-yellow-100', icon: '⚠️',  titleColor: 'text-yellow-700' },
  info:    { bg: 'bg-green-100',  icon: 'ℹ️',  titleColor: 'text-green-700' },
  success: { bg: 'bg-green-100',  icon: '✅',  titleColor: 'text-green-700' },
};

// ── Alert (single OK button) ──────────────────────────────────────────────────
export function Alert({ open, type = 'info', title, message, onClose }) {
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape' || e.key === 'Enter') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;
  const { bg, icon, titleColor } = ICONS[type] || ICONS.info;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-fade-in">
        <div className={`w-12 h-12 rounded-full ${bg} flex items-center justify-center text-2xl mx-auto mb-4`}>{icon}</div>
        {title && <h3 className={`text-center font-bold text-base mb-1 ${titleColor}`}>{title}</h3>}
        {message && <p className="text-center text-sm text-gray-600 mb-5">{message}</p>}
        <button onClick={onClose} className="w-full py-2.5 rounded-xl bg-green-700 text-white font-semibold text-sm hover:bg-green-600 transition-colors">
          OK
        </button>
      </div>
    </div>
  );
}

// ── Confirm (Cancel + Confirm buttons) ───────────────────────────────────────
export function Confirm({ open, type = 'danger', title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', onConfirm, onCancel }) {
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  if (!open) return null;
  const { bg, icon, titleColor } = ICONS[type] || ICONS.danger;

  const confirmBtnClass = type === 'danger'
    ? 'bg-red-600 hover:bg-red-500 text-white'
    : 'bg-green-700 hover:bg-green-600 text-white';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-fade-in">
        <div className={`w-12 h-12 rounded-full ${bg} flex items-center justify-center text-2xl mx-auto mb-4`}>{icon}</div>
        {title && <h3 className={`text-center font-bold text-base mb-1 ${titleColor}`}>{title}</h3>}
        {message && <p className="text-center text-sm text-gray-600 mb-5">{message}</p>}
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors">
            {cancelLabel}
          </button>
          <button onClick={onConfirm} className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-colors ${confirmBtnClass}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
