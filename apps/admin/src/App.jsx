import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./modules/auth/store/authStore";

import Login from "./modules/auth/pages/Login";
import ForgotPassword from "./modules/auth/pages/ForgotPassword";
import ResetPassword from "./modules/auth/pages/ResetPassword";
import Dashboard from "./modules/dashboard/pages/Dashboard";
import Users from "./modules/users/pages/Users";
import UserFormPage from "./modules/users/pages/UserFormPage";
import References from "./modules/references/pages/References";
import ReferenceDetail from "./modules/references/pages/ReferenceDetail";
import ReferenceFormPage from "./modules/references/pages/ReferenceFormPage";
import Companies from "./modules/companies/pages/Companies";
import CompanyFormPage from "./modules/companies/pages/CompanyFormPage";

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
  const { restoreSession } = useAuthStore();

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/companies"
          element={
            <ProtectedRoute>
              <Companies />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/companies/new"
          element={
            <ProtectedRoute>
              <CompanyFormPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/companies/:id/edit"
          element={
            <ProtectedRoute>
              <CompanyFormPage />
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
          path="/admin/users/new"
          element={
            <ProtectedRoute>
              <UserFormPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/users/:id/edit"
          element={
            <ProtectedRoute>
              <UserFormPage />
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

        <Route
          path="/admin/references/:tableName/new"
          element={
            <ProtectedRoute>
              <ReferenceFormPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/references/:tableName/:id/edit"
          element={
            <ProtectedRoute>
              <ReferenceFormPage />
            </ProtectedRoute>
          }
        />

        <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
