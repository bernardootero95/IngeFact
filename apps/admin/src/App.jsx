import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import { supabase } from "../../../packages/core-api/src/supabase";
import Login from "./pages/Auth/Login";
import Dashboard from "./pages/Admin/Dashboard";
import Users from "./pages/Admin/Users";
import References from "./pages/Admin/References";
import ReferenceDetail from "./pages/Admin/ReferenceDetail";

function ProtectedRoute({ children }) {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const { user, loading, setSession } = useAuthStore();

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => setSession(session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) =>
      setSession(session),
    );
    return () => subscription.unsubscribe();
  }, [setSession]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutralCustom-50">
        <p className="text-sm text-neutralCustom-500 font-medium animate-pulse">
          Cargando sistema...
        </p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta Pública */}
        <Route
          path="/login"
          element={
            !user ? <Login /> : <Navigate to="/admin/dashboard" replace />
          }
        />

        {/* Rutas Privadas del Administrador */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute>
              <Users />
            </ProtectedRoute>
          }
        />

        {/* ENLACES DE REFERENCIA (Deben ir juntos y en este orden) */}
        <Route
          path="/admin/references"
          element={
            <ProtectedRoute>
              <References />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/references/:tableName"
          element={
            <ProtectedRoute>
              <ReferenceDetail />
            </ProtectedRoute>
          }
        />

        {/* RUTA COMODÍN (Estrictamente al final de todo) */}
        <Route
          path="*"
          element={
            <Navigate to={user ? "/admin/dashboard" : "/login"} replace />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
