import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

export default function UserModal({
  isOpen,
  onClose,
  isEditing,
  currentUser,
  onSaveSuccess,
}) {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [estado, setEstado] = useState("activo");
  const [modalError, setModalError] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    if (isEditing && currentUser) {
      setNombre(currentUser.nombre);
      setEmail(currentUser.email);
      setEstado(currentUser.estado);
    } else {
      setNombre("");
      setEmail("");
      setEstado("activo");
    }
    setModalError(null);
  }, [isEditing, currentUser, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setModalError(null);

    if (isEditing) {
      // Actualización: El email se envía igual pero el UI garantiza que no cambió
      const { error } = await supabase
        .from("usuarios")
        .update({
          nombre,
          estado,
          actualizado: new Date().toISOString(),
        })
        .eq("id", currentUser.id);

      if (error) {
        setModalError(error.message);
        setSubmitLoading(false);
        return;
      }
    } else {
      // Creación segura invocando la Edge Function
      const { data, error } = await supabase.functions.invoke(
        "create-admin-user",
        {
          body: { nombre, email, estado },
        },
      );

      if (error || data?.error) {
        setModalError(error?.message || data?.error);
        setSubmitLoading(false);
        return;
      }
    }

    setSubmitLoading(false);
    onSaveSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-neutralCustom-800/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white border border-neutralCustom-100 rounded-brand-lg w-full max-w-md p-6 shadow-lg">
        <h3 className="text-lg font-medium text-neutralCustom-800 mb-4">
          {isEditing ? "Actualizar Usuario" : "Crear Nuevo Usuario"}
        </h3>

        {modalError && (
          <div className="mb-4 p-3 bg-red-50 border border-fiscal-danger text-fiscal-danger text-sm rounded-brand-md">
            {modalError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutralCustom-500 mb-1">
              Nombre
            </label>
            <input
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full px-3 py-2 bg-neutralCustom-50 border border-neutralCustom-100 rounded-brand-md text-neutralCustom-800 text-sm focus:outline-none focus:border-brand-400"
              placeholder="Nombre completo"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutralCustom-500 mb-1">
              Correo electrónico{" "}
              {isEditing && (
                <span className="text-xs text-neutralCustom-400">
                  (No modificable)
                </span>
              )}
            </label>
            <input
              type="email"
              required
              value={email}
              disabled={isEditing} // <-- Bloquea el input si se está editando
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-neutralCustom-50 border border-neutralCustom-100 rounded-brand-md text-neutralCustom-800 text-sm focus:outline-none focus:border-brand-400 disabled:opacity-60 disabled:bg-neutralCustom-100 disabled:cursor-not-allowed"
              placeholder="correo@ingefact.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutralCustom-500 mb-1">
              Estado
            </label>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="w-full px-3 py-2 bg-neutralCustom-50 border border-neutralCustom-100 rounded-brand-md text-neutralCustom-800 text-sm focus:outline-none focus:border-brand-400"
            >
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-neutralCustom-100 text-neutralCustom-500 text-sm font-medium rounded-brand-md hover:bg-neutralCustom-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitLoading}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-400 text-white text-sm font-medium rounded-brand-md transition-colors disabled:opacity-50"
            >
              {submitLoading ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
