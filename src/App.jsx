import { useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { ThemeProvider } from './context/ThemeContext';
import { Spinner } from './components/ui/ui-components';
import { Toaster } from 'react-hot-toast';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { PAGE_PERMISSIONS } from './config/permissions';

const Login                = lazy(() => import('./pages/Auth/Login'));
const Dashboard            = lazy(() => import('./pages/Dashboard/Dashboard'));
const NotificationsCenter  = lazy(() => import('./pages/Dashboard/NotificationsCenter'));
const StaffManagement      = lazy(() => import('./pages/Staff/StaffManagement'));
const InstitutionManagement= lazy(() => import('./pages/Institutions/InstitutionManagement'));
const CustomerApplications = lazy(() => import('./pages/Institutions/CustomerApplications'));
const Customer360          = lazy(() => import('./pages/Institutions/Customer360'));
const FollowUpManagement   = lazy(() => import('./pages/CRM/FollowUpManagement'));
const VisitLogs            = lazy(() => import('./pages/CRM/VisitLogs'));
const BusinessCalendar     = lazy(() => import('./pages/CRM/BusinessCalendar'));
const ProductManagement    = lazy(() => import('./pages/Products/ProductManagement'));
const CategoryManagement   = lazy(() => import('./pages/Products/CategoryManagement'));
const InventoryManagement  = lazy(() => import('./pages/Inventory/InventoryManagement'));
const ProcurementManagement= lazy(() => import('./pages/Procurement/ProcurementManagement'));
const Orders               = lazy(() => import('./pages/Orders/Orders'));
const DeliveryManagement   = lazy(() => import('./pages/Orders/DeliveryManagement'));
const QuotationManagement  = lazy(() => import('./pages/Quotations/QuotationManagement'));
const CreditAccounts       = lazy(() => import('./pages/Billing/CreditAccounts'));
const InvoiceManagement    = lazy(() => import('./pages/Billing/InvoiceManagement'));
const PaymentManagement    = lazy(() => import('./pages/Billing/PaymentManagement'));
const SupportTickets       = lazy(() => import('./pages/Tickets/SupportTickets'));
const Returns              = lazy(() => import('./pages/Inventory/Returns'));
const ReturnCollections    = lazy(() => import('./pages/Inventory/ReturnCollections'));
const Compliance           = lazy(() => import('./pages/Compliance/Compliance'));
const AuditCenter          = lazy(() => import('./pages/Compliance/AuditCenter'));
const Reports              = lazy(() => import('./pages/Reports/Reports'));

/**
 * ProtectedRoute — guards a route against unauthenticated access and role violations.
 * Derives allowedRoles directly from the central PAGE_PERMISSIONS matrix.
 */
const ProtectedRoute = ({ children, routePath }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--bg-surface)]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (routePath) {
    const allowed = PAGE_PERMISSIONS[routePath];
    if (allowed && !allowed.includes(user.role)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
};

const DashboardLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      <Sidebar isMobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <Header setMobileOpen={setMobileOpen} />
        <main className="flex-1 p-6 md:p-8">
          <Suspense
            fallback={
              <div className="flex flex-col gap-4 p-2 animate-fade-in">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-5 flex flex-col gap-3">
                    <div className="skeleton h-4 w-48 rounded" />
                    <div className="skeleton h-3 w-72 rounded" />
                    <div className="skeleton h-32 w-full rounded" />
                  </div>
                ))}
              </div>
            }
          >
            <Routes>
              {/* Dashboard — all roles */}
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="notifications-center" element={<NotificationsCenter />} />

              {/* Staff — Super Admin only */}
              <Route path="staff" element={
                <ProtectedRoute routePath="/staff"><StaffManagement /></ProtectedRoute>
              } />

              {/* Institutions — Sales chain + Accounts */}
              <Route path="institutions" element={
                <ProtectedRoute routePath="/institutions"><InstitutionManagement /></ProtectedRoute>
              } />
              
              <Route path="customer-applications" element={
                <ProtectedRoute routePath="/customer-applications"><CustomerApplications /></ProtectedRoute>
              } />

              <Route path="customer-360" element={
                <ProtectedRoute routePath="/institutions"><Customer360 /></ProtectedRoute>
              } />

              {/* CRM — Sales chain */}
              <Route path="business-calendar" element={
                <ProtectedRoute routePath="/business-calendar"><BusinessCalendar /></ProtectedRoute>
              } />
              <Route path="follow-ups" element={
                <ProtectedRoute routePath="/follow-ups"><FollowUpManagement /></ProtectedRoute>
              } />
              <Route path="visit-logs" element={
                <ProtectedRoute routePath="/visit-logs"><VisitLogs /></ProtectedRoute>
              } />

              {/* Quotations — Sales chain */}
              <Route path="quotations" element={
                <ProtectedRoute routePath="/quotations"><QuotationManagement /></ProtectedRoute>
              } />

              {/* Orders — All ops roles */}
              <Route path="orders" element={
                <ProtectedRoute routePath="/orders"><Orders /></ProtectedRoute>
              } />

              {/* Deliveries — Warehouse */}
              <Route path="deliveries" element={
                <ProtectedRoute routePath="/deliveries"><DeliveryManagement /></ProtectedRoute>
              } />

              {/* Returns — Warehouse Executive + Accounts */}
              <Route path="returns" element={
                <ProtectedRoute routePath="/returns"><Returns /></ProtectedRoute>
              } />

              {/* Return Collections — Warehouse Staff only */}
              <Route path="return-collections" element={
                <ProtectedRoute routePath="/return-collections"><ReturnCollections /></ProtectedRoute>
              } />

              {/* Products — Sales chain + Warehouse */}
              <Route path="products" element={
                <ProtectedRoute routePath="/products"><ProductManagement /></ProtectedRoute>
              } />
              <Route path="categories" element={
                <ProtectedRoute routePath="/categories"><CategoryManagement /></ProtectedRoute>
              } />

              {/* Inventory — Warehouse */}
              <Route path="inventory" element={
                <ProtectedRoute routePath="/inventory"><InventoryManagement /></ProtectedRoute>
              } />

              {/* Procurement — Warehouse */}
              <Route path="procurement" element={
                <ProtectedRoute routePath="/procurement"><ProcurementManagement /></ProtectedRoute>
              } />

              {/* Billing — Accounts */}
              <Route path="credit-accounts" element={
                <ProtectedRoute routePath="/credit-accounts"><CreditAccounts /></ProtectedRoute>
              } />
              <Route path="invoices" element={
                <ProtectedRoute routePath="/invoices"><InvoiceManagement /></ProtectedRoute>
              } />
              <Route path="payments" element={
                <ProtectedRoute routePath="/payments"><PaymentManagement /></ProtectedRoute>
              } />

              {/* Support Tickets — Sales chain + Accounts */}
              <Route path="support-tickets" element={
                <ProtectedRoute routePath="/support-tickets"><SupportTickets /></ProtectedRoute>
              } />

              {/* Compliance / Audit — Super Admin only */}
              <Route path="compliance" element={
                <ProtectedRoute routePath="/compliance"><Compliance /></ProtectedRoute>
              } />
              <Route path="audit-center" element={
                <ProtectedRoute routePath="/compliance"><AuditCenter /></ProtectedRoute>
              } />

              {/* Reports — Leadership */}
              <Route path="reports" element={
                <ProtectedRoute routePath="/reports"><Reports /></ProtectedRoute>
              } />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  );
};

const App = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Suspense
              fallback={
                <div className="flex items-center justify-center min-h-screen bg-slate-50">
                  <Spinner size="lg" />
                </div>
              }
            >
              <Routes>
                <Route path="/login" element={<Login />} />

                {/* 403 Unauthorized */}
                <Route
                  path="/unauthorized"
                  element={
                    <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--bg-secondary)] p-6 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mb-6">
                        <span className="text-2xl font-bold text-rose-600">403</span>
                      </div>
                      <h1 className="text-xl font-bold text-[var(--text-primary)]">Access Denied</h1>
                      <p className="text-sm text-[var(--text-secondary)] mt-2 max-w-xs leading-relaxed">
                        Your administrative role is not permitted to view this section.
                        Contact your system administrator if this is an error.
                      </p>
                      <Link
                        to="/dashboard"
                        className="mt-6 inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--brand)] text-white rounded-lg text-sm font-medium hover:bg-[var(--brand-dark)] transition-colors shadow-sm"
                      >
                        Return to Dashboard
                      </Link>
                    </div>
                  }
                />

                {/* All authenticated routes */}
                <Route path="/*" element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                } />
              </Routes>
            </Suspense>
          </BrowserRouter>
          <Toaster position="top-right" reverseOrder={false} />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
