import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./modules/auth/store/authStore";
import { EmpresaProvider } from "./context/EmpresaProvider";

import Login from "./modules/auth/pages/Login";
import ForgotPassword from "./modules/auth/pages/ForgotPassword";
import ResetPassword from "./modules/auth/pages/ResetPassword";
import Dashboard from "./modules/dashboard/pages/Dashboard";
import InvoicesListPage from "./modules/invoices/pages/InvoicesListPage";
import InvoiceFormPage from "./modules/invoices/pages/InvoiceFormPage";
import InvoiceDetailPage from "./modules/invoices/pages/InvoiceDetailPage";
import InvoiceRepresentationPage from "./modules/invoices/pages/InvoiceRepresentationPage";
import CreditNotesListPage from "./modules/creditNotes/pages/CreditNotesListPage";
import CreditNoteFormPage from "./modules/creditNotes/pages/CreditNoteFormPage";
import CreditNoteDetailPage from "./modules/creditNotes/pages/CreditNoteDetailPage";
import CreditNoteRepresentationPage from "./modules/creditNotes/pages/CreditNoteRepresentationPage";
import DebitNotesListPage from "./modules/debitNotes/pages/DebitNotesListPage";
import DebitNoteFormPage from "./modules/debitNotes/pages/DebitNoteFormPage";
import DebitNoteDetailPage from "./modules/debitNotes/pages/DebitNoteDetailPage";
import DebitNoteRepresentationPage from "./modules/debitNotes/pages/DebitNoteRepresentationPage";
import CustomersPage from "./modules/customers/pages/CustomersPage";
import CustomerFormPage from "./modules/customers/pages/CustomerFormPage";
import ProductsPage from "./modules/products/pages/ProductsPage";
import ProductFormPage from "./modules/products/pages/ProductFormPage";
import CompanyDataSettingsPage from "./modules/settings/pages/CompanyDataSettingsPage";
import ResolutionSettingsPage from "./modules/settings/pages/ResolutionSettingsPage";
import TaxesSettingsPage from "./modules/settings/pages/TaxesSettingsPage";
import TaxPresetFormPage from "./modules/settings/pages/TaxPresetFormPage";

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
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/invoices"
          element={
            <ProtectedRoute>
              <InvoicesListPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/invoices/new"
          element={
            <ProtectedRoute>
              <InvoiceFormPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/invoices/:id/edit"
          element={
            <ProtectedRoute>
              <InvoiceFormPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/invoices/:id"
          element={
            <ProtectedRoute>
              <InvoiceDetailPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/invoices/:id/representacion"
          element={
            <ProtectedRoute>
              <InvoiceRepresentationPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/invoices/:facturaId/credit-notes/new"
          element={
            <ProtectedRoute>
              <CreditNoteFormPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/credit-notes"
          element={
            <ProtectedRoute>
              <CreditNotesListPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/credit-notes/:id/edit"
          element={
            <ProtectedRoute>
              <CreditNoteFormPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/credit-notes/:id/representacion"
          element={
            <ProtectedRoute>
              <CreditNoteRepresentationPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/credit-notes/:id"
          element={
            <ProtectedRoute>
              <CreditNoteDetailPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/invoices/:facturaId/debit-notes/new"
          element={
            <ProtectedRoute>
              <DebitNoteFormPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/debit-notes"
          element={
            <ProtectedRoute>
              <DebitNotesListPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/debit-notes/:id/edit"
          element={
            <ProtectedRoute>
              <DebitNoteFormPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/debit-notes/:id/representacion"
          element={
            <ProtectedRoute>
              <DebitNoteRepresentationPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/debit-notes/:id"
          element={
            <ProtectedRoute>
              <DebitNoteDetailPage />
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
          path="/customers/new"
          element={
            <ProtectedRoute>
              <CustomerFormPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/customers/:id/edit"
          element={
            <ProtectedRoute>
              <CustomerFormPage />
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
          path="/products/new"
          element={
            <ProtectedRoute>
              <ProductFormPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/products/:id/edit"
          element={
            <ProtectedRoute>
              <ProductFormPage />
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

        <Route
          path="/settings/taxes/new"
          element={
            <ProtectedRoute>
              <TaxPresetFormPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings/taxes/:id/edit"
          element={
            <ProtectedRoute>
              <TaxPresetFormPage />
            </ProtectedRoute>
          }
        />

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
