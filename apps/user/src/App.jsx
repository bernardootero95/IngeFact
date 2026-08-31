import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./modules/auth/store/authStore";
import { EmpresaProvider } from "./context/EmpresaProvider";

import Login from "./modules/auth/pages/Login";
import Dashboard from "./modules/dashboard/pages/Dashboard";
import CustomersPage from "./modules/customers/pages/CustomersPage";
import ProductsPage from "./modules/products/pages/ProductsPage";
import CompanyDataSettingsPage from "./modules/settings/pages/CompanyDataSettingsPage";
import ResolutionSettingsPage from "./modules/settings/pages/ResolutionSettingsPage";
import TaxesSettingsPage from "./modules/settings/pages/TaxesSettingsPage";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutralCustom-50">
        <p className="text-sm text-neutralCustom-500 animate-pulse">
          Verificando sesión...
        </p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <EmpresaProvider>{children}</EmpresaProvider>;
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

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/customers"
          element={
            <ProtectedRoute>
              <CustomersPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/products"
          element={
            <ProtectedRoute>
              <ProductsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings/company"
          element={
            <ProtectedRoute>
              <CompanyDataSettingsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings/resolution"
          element={
            <ProtectedRoute>
              <ResolutionSettingsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings/taxes"
          element={
            <ProtectedRoute>
              <TaxesSettingsPage />
            </ProtectedRoute>
          }
        />

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
