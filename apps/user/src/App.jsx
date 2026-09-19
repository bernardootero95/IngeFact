import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./modules/auth/store/authStore";
import { EmpresaProvider } from "./context/EmpresaProvider";

import Login from "./modules/auth/pages/Login";
import ForgotPassword from "./modules/auth/pages/ForgotPassword";
import ResetPassword from "./modules/auth/pages/ResetPassword";
import ChangePasswordPage from "./modules/auth/pages/ChangePasswordPage";
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
import SuppliersPage from "./modules/suppliers/pages/SuppliersPage";
import SupplierFormPage from "./modules/suppliers/pages/SupplierFormPage";
import ReceivedInvoicesListPage from "./modules/receivedInvoices/pages/ReceivedInvoicesListPage";
import ReceivedInvoiceFormPage from "./modules/receivedInvoices/pages/ReceivedInvoiceFormPage";
import ReceivedInvoiceDetailPage from "./modules/receivedInvoices/pages/ReceivedInvoiceDetailPage";
import SupportDocumentsListPage from "./modules/supportDocuments/pages/SupportDocumentsListPage";
import SupportDocumentFormPage from "./modules/supportDocuments/pages/SupportDocumentFormPage";
import SupportDocumentDetailPage from "./modules/supportDocuments/pages/SupportDocumentDetailPage";
import SupportDocumentRepresentationPage from "./modules/supportDocuments/pages/SupportDocumentRepresentationPage";
import ProductsPage from "./modules/products/pages/ProductsPage";
import ProductFormPage from "./modules/products/pages/ProductFormPage";
import CompanyDataSettingsPage from "./modules/settings/pages/CompanyDataSettingsPage";
import ResolutionsSettingsPage from "./modules/settings/pages/ResolutionsSettingsPage";
import TaxesSettingsPage from "./modules/settings/pages/TaxesSettingsPage";
import TaxPresetFormPage from "./modules/settings/pages/TaxPresetFormPage";

const VerifyingSessionScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-neutralCustom-50">
    <p className="text-sm text-neutralCustom-500 animate-pulse">
      Verificando sesión...
    </p>
  </div>
);

// Requiere sesion activa, sin exigir que la clave temporal ya se haya
// cambiado -- usado solo por /change-password, que es la unica pantalla a la
// que un usuario con debeCambiarPassword puede entrar.
const RequireSession = ({ children }) => {
  const { user, loading } = useAuthStore();

  if (loading) return <VerifyingSessionScreen />;
  if (!user) return <Navigate to="/login" replace />;

  return children;
};

const ProtectedRoute = ({ children }) => {
  const { debeCambiarPassword } = useAuthStore();

  return (
    <RequireSession>
      {debeCambiarPassword ? (
        <Navigate to="/change-password" replace />
      ) : (
        <EmpresaProvider>{children}</EmpresaProvider>
      )}
    </RequireSession>
  );
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
          path="/change-password"
          element={
            <RequireSession>
              <ChangePasswordPage />
            </RequireSession>
          }
        />

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
          path="/suppliers"
          element={
            <ProtectedRoute>
              <SuppliersPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/suppliers/new"
          element={
            <ProtectedRoute>
              <SupplierFormPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/suppliers/:id/edit"
          element={
            <ProtectedRoute>
              <SupplierFormPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/received-invoices"
          element={
            <ProtectedRoute>
              <ReceivedInvoicesListPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/received-invoices/new"
          element={
            <ProtectedRoute>
              <ReceivedInvoiceFormPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/received-invoices/:id"
          element={
            <ProtectedRoute>
              <ReceivedInvoiceDetailPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/support-documents"
          element={
            <ProtectedRoute>
              <SupportDocumentsListPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/support-documents/new"
          element={
            <ProtectedRoute>
              <SupportDocumentFormPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/support-documents/:id/edit"
          element={
            <ProtectedRoute>
              <SupportDocumentFormPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/support-documents/:id/representacion"
          element={
            <ProtectedRoute>
              <SupportDocumentRepresentationPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/support-documents/:id"
          element={
            <ProtectedRoute>
              <SupportDocumentDetailPage />
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
              <ResolutionsSettingsPage />
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
