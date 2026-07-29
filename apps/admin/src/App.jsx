import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./modules/auth/store/authStore";
import { supabase } from "@ingefact/core-api";

import Login from "./modules/auth/pages/Login";
import Dashboard from "./modules/dashboard/pages/Dashboard";
import Users from "./modules/users/pages/Users";
import References from "./modules/references/pages/References";
import ReferenceDetail from "./modules/references/pages/ReferenceDetail";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutralCustom-50">
        <p className="text-sm font-medium text-neutralCustom-500 animate-pulse">
          Verificando sesión...
        </p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default function App() {
  const { setSession } = useAuthStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setSession]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

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

        <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
