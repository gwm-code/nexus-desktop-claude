import { useEffect } from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useNexusStore } from '../store/useNexusStore';
import type { Toast } from '../types';

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const colorMap = {
  success: { border: 'border-green-500/30', bg: 'bg-green-500/10', icon: 'text-green-400', title: 'text-green-300' },
  error: { border: 'border-red-500/30', bg: 'bg-red-500/10', icon: 'text-red-400', title: 'text-red-300' },
  warning: { border: 'border-yellow-500/30', bg: 'bg-yellow-500/10', icon: 'text-yellow-400', title: 'text-yellow-300' },
  info: { border: 'border-blue-500/30', bg: 'bg-blue-500/10', icon: 'text-blue-400', title: 'text-blue-300' },
};

const ToastItem: React.FC<{ toast: Toast }> = ({ toast }) => {
  const removeToast = useNexusStore((s) => s.removeToast);
  const Icon = iconMap[toast.type];
  const colors = colorMap[toast.type];

  useEffect(() => {
    const timer = setTimeout(() => {
      removeToast(toast.id);
    }, toast.duration || 5000);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, removeToast]);

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-lg border ${colors.border} ${colors.bg} bg-zinc-900/95 backdrop-blur-sm shadow-lg min-w-[280px] max-w-[400px] animate-slide-in`}
    >
      <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${colors.icon}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium ${colors.title}`}>{toast.title}</p>
        {toast.message && (
          <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed truncate">{toast.message}</p>
        )}
      </div>
      <button
        onClick={() => removeToast(toast.id)}
        className="p-0.5 hover:bg-zinc-800 rounded transition-colors flex-shrink-0"
      >
        <X className="w-3 h-3 text-zinc-500" />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const toasts = useNexusStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-14 right-4 z-[200] flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
};

export default ToastContainer;
