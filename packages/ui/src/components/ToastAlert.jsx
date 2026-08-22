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
    <div className="fixed bottom-6 right-6 z-50 animate-bounce-in">
      <div
        className={`flex items-center justify-between px-4 py-3 rounded-brand-lg border shadow-lg max-w-md ${styles[type] || styles.success}`}
      >
        <div className="flex items-center space-x-3">
          <span className="text-sm font-medium">{message}</span>
        </div>
        <button
          onClick={onClose}
          className="ml-4 text-xs font-bold opacity-70 hover:opacity-100 transition-opacity"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
