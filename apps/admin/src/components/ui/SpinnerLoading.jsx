import React from "react";

export default function SpinnerLoading({
  fullScreen = false,
  text = "Cargando...",
}) {
  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mb-4"></div>
        <p className="text-sm font-medium text-neutralCustom-700 animate-pulse">
          {text}
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-4">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-600 mr-2"></div>
      <span className="text-sm font-medium text-neutralCustom-600">{text}</span>
    </div>
  );
}
