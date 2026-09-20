import { useEffect } from "react";

export default function ToastAlert({
  type = "success",
  message,
  onClose,
  duration = 4000,
}) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  const styles = {
    success: "bg-brand-50 border-brand-500 text-brand-800",
    error: "bg-red-50 border-fiscal-danger text-fiscal-danger",
    warning: "bg-yellow-50 border-yellow-500 text-yellow-800",
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-bounce-in motion-reduce:animate-none">
      <div
        className={`flex items-center justify-between px-4 py-3 rounded-brand-lg border shadow-lg max-w-md ${styles[type] || styles.success}`}
      >
        <div className="flex items-center space-x-3">
          <span className="text-sm font-medium">{message}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar notificación"
          className="ml-4 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full opacity-70 hover:opacity-100 hover:bg-black/5 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
