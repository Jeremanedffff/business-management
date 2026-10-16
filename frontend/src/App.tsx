import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AppLayout } from "./components/layout/AppLayout";
import { AdjustmentNoteDetailPage } from "./features/adjustment-notes/AdjustmentNoteDetailPage";
import { AdjustmentNotesPage } from "./features/adjustment-notes/AdjustmentNotesPage";
import { CreateAdjustmentNotePage } from "./features/adjustment-notes/CreateAdjustmentNotePage";
import { LoginPage } from "./features/auth/LoginPage";
import { RegisterPage } from "./features/auth/RegisterPage";
import { VerifyPage } from "./features/verify/VerifyPage";
import { ProtectedRoute } from "./features/auth/ProtectedRoute";
import { CustomersPage } from "./features/customers/CustomersPage";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { InvoiceDetailPage } from "./features/invoices/InvoiceDetailPage";
import { InvoiceEditPage } from "./features/invoices/InvoiceEditPage";
import { InvoicePrintPage } from "./features/invoices/InvoicePrintPage";
import { InvoicesPage } from "./features/invoices/InvoicesPage";
import { ComingSoonPage } from "./features/landing/ComingSoonPage";
import { LandingPage } from "./features/landing/LandingPage";
import { ProductsPage } from "./features/products/ProductsPage";
import { FiscalPeriodsPage } from "./features/fiscal-periods/FiscalPeriodsPage";
import { PaymentMethodsPage } from "./features/payment-methods/PaymentMethodsPage";
import { RolesPage } from "./features/roles/RolesPage";
import { SettingsPage } from "./features/settings/SettingsPage";
import { TaxCategoriesPage } from "./features/settings/TaxCategoriesPage";
import { TaxRatesPage } from "./features/settings/TaxRatesPage";
import { AuditLogsPage } from "./features/audit/AuditLogsPage";
import { UserDetailPage } from "./features/users/UserDetailPage";
import { UsersPage } from "./features/users/UsersPage";
import { TenantsPage } from "./features/tenants/TenantsPage";

function Protected({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register/:token" element={<RegisterPage />} />
        <Route path="/verify/:token" element={<VerifyPage />} />
        <Route path="/dashboard" element={<Protected><DashboardPage /></Protected>} />
        <Route path="/customers" element={<Protected><CustomersPage /></Protected>} />
        <Route path="/products" element={<Protected><ProductsPage /></Protected>} />
        <Route path="/payment-methods" element={<Protected><PaymentMethodsPage /></Protected>} />
        <Route path="/fiscal-periods" element={<Protected><FiscalPeriodsPage /></Protected>} />
        <Route path="/invoices" element={<Protected><InvoicesPage /></Protected>} />
        <Route path="/invoices/:invoiceId" element={<Protected><InvoiceDetailPage /></Protected>} />
        <Route path="/invoices/:invoiceId/edit" element={<Protected><InvoiceEditPage /></Protected>} />
        <Route path="/invoices/:invoiceId/print" element={<Protected><InvoicePrintPage /></Protected>} />
        <Route path="/adjustment-notes" element={<Protected><AdjustmentNotesPage /></Protected>} />
        <Route path="/adjustment-notes/new" element={<Protected><CreateAdjustmentNotePage /></Protected>} />
        <Route path="/adjustment-notes/:noteId" element={<Protected><AdjustmentNoteDetailPage /></Protected>} />
        <Route path="/settings" element={<Protected><SettingsPage /></Protected>} />
        <Route path="/settings/tax" element={<Protected><TaxRatesPage /></Protected>} />
        <Route path="/settings/audit" element={<Protected><AuditLogsPage /></Protected>} />
        <Route path="/settings/tax/categories" element={<Protected><TaxCategoriesPage /></Protected>} />
        <Route path="/users" element={<Protected><UsersPage /></Protected>} />
        <Route path="/users/:userId" element={<Protected><UserDetailPage /></Protected>} />
        <Route path="/roles" element={<Protected><RolesPage /></Protected>} />
        <Route path="/tenants" element={<Protected><TenantsPage /></Protected>} />
        <Route path="/coming-soon/:feature" element={<Protected><ComingSoonPage /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

