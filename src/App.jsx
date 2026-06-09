import { useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { ThemeProvider } from './context/ThemeContext';
import { Spinner } from './components/ui/ui-components';
import { Toaster } from 'react-hot-toast';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

const Login = lazy(() => import('./pages/Auth/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard/Dashboard'));
const StaffManagement = lazy(() => import('./pages/Staff/StaffManagement'));
const InstitutionManagement = lazy(() => import('./pages/Institutions/InstitutionManagement'));
const FollowUpManagement = lazy(() => import('./pages/CRM/FollowUpManagement'));
const VisitLogs = lazy(() => import('./pages/CRM/VisitLogs'));
const ProductManagement = lazy(() => import('./pages/Products/ProductManagement'));
const InventoryManagement = lazy(() => import('./pages/Inventory/InventoryManagement'));
const ProcurementManagement = lazy(() => import('./pages/Procurement/ProcurementManagement'));
const Orders = lazy(() => import('./pages/Orders/Orders'));
const DeliveryManagement = lazy(() => import('./pages/Orders/DeliveryManagement'));
const QuotationManagement = lazy(() => import('./pages/Quotations/QuotationManagement'));
const CreditAccounts = lazy(() => import('./pages/Billing/CreditAccounts'));
const InvoiceManagement = lazy(() => import('./pages/Billing/InvoiceManagement'));
const PaymentManagement = lazy(() => import('./pages/Billing/PaymentManagement'));
const SupportTickets = lazy(() => import('./pages/Tickets/SupportTickets'));
const Returns = lazy(() => import('./pages/Inventory/Returns'));
const Compliance = lazy(() => import('./pages/Compliance/Compliance'));
const Reports = lazy(() => import('./pages/Reports/Reports'));

const AuthenticatedRoute = ({ children, allowedRoles }) => {
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

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
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
              <Route path="dashboard" element={<Dashboard />} />
              <Route
                path="staff"
                element={
                  <AuthenticatedRoute allowedRoles={['owner']}>
                    <StaffManagement />
                  </AuthenticatedRoute>
                }
              />
              <Route
                path="institutions"
                element={
                  <AuthenticatedRoute allowedRoles={['owner', 'sales_admin', 'compliance_manager']}>
                    <InstitutionManagement />
                  </AuthenticatedRoute>
                }
              />
              <Route
                path="follow-ups"
                element={
                  <AuthenticatedRoute allowedRoles={['owner', 'sales_admin', 'salesman']}>
                    <FollowUpManagement />
                  </AuthenticatedRoute>
                }
              />
              <Route
                path="visit-logs"
                element={
                  <AuthenticatedRoute allowedRoles={['owner', 'sales_admin', 'salesman']}>
                    <VisitLogs />
                  </AuthenticatedRoute>
                }
              />
              <Route
                path="quotations"
                element={
                  <AuthenticatedRoute allowedRoles={['owner', 'sales_admin', 'salesman']}>
                    <QuotationManagement />
                  </AuthenticatedRoute>
                }
              />
              <Route
                path="products"
                element={
                  <AuthenticatedRoute allowedRoles={['owner', 'warehouse_manager', 'warehouse_staff', 'salesman']}>
                    <ProductManagement />
                  </AuthenticatedRoute>
                }
              />
              <Route
                path="inventory"
                element={
                  <AuthenticatedRoute allowedRoles={['owner', 'warehouse_manager', 'warehouse_staff']}>
                    <InventoryManagement />
                  </AuthenticatedRoute>
                }
              />
              <Route
                path="procurement"
                element={
                  <AuthenticatedRoute allowedRoles={['owner', 'warehouse_manager']}>
                    <ProcurementManagement />
                  </AuthenticatedRoute>
                }
              />
              <Route
                path="returns"
                element={
                  <AuthenticatedRoute allowedRoles={['owner', 'warehouse_manager', 'warehouse_staff']}>
                    <Returns />
                  </AuthenticatedRoute>
                }
              />
              <Route
                path="orders"
                element={
                  <AuthenticatedRoute allowedRoles={['owner', 'sales_admin', 'salesman', 'warehouse_manager', 'warehouse_staff', 'accounts_manager', 'accounts_executive', 'support_manager', 'support_staff']}>
                    <Orders />
                  </AuthenticatedRoute>
                }
              />
              <Route
                path="deliveries"
                element={
                  <AuthenticatedRoute allowedRoles={['owner', 'sales_admin', 'salesman', 'warehouse_manager', 'warehouse_staff']}>
                    <DeliveryManagement />
                  </AuthenticatedRoute>
                }
              />
              <Route
                path="credit-accounts"
                element={
                  <AuthenticatedRoute allowedRoles={['owner', 'sales_admin', 'accounts_manager', 'accounts_executive']}>
                    <CreditAccounts />
                  </AuthenticatedRoute>
                }
              />
              <Route
                path="invoices"
                element={
                  <AuthenticatedRoute allowedRoles={['owner', 'sales_admin', 'accounts_manager', 'accounts_executive']}>
                    <InvoiceManagement />
                  </AuthenticatedRoute>
                }
              />
              <Route
                path="payments"
                element={
                  <AuthenticatedRoute allowedRoles={['owner', 'sales_admin', 'accounts_manager', 'accounts_executive']}>
                    <PaymentManagement />
                  </AuthenticatedRoute>
                }
              />
              <Route
                path="support-tickets"
                element={
                  <AuthenticatedRoute allowedRoles={['owner', 'support_manager', 'support_staff']}>
                    <SupportTickets />
                  </AuthenticatedRoute>
                }
              />
              <Route
                path="compliance"
                element={
                  <AuthenticatedRoute allowedRoles={['owner', 'compliance_manager']}>
                    <Compliance />
                  </AuthenticatedRoute>
                }
              />
              <Route
                path="reports"
                element={
                  <AuthenticatedRoute allowedRoles={['owner', 'sales_admin', 'accounts_manager', 'support_manager', 'compliance_manager']}>
                    <Reports />
                  </AuthenticatedRoute>
                }
              />
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
                <Route
                  path="/unauthorized"
                  element={
                    <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--bg-secondary)] p-6 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-[var(--danger-light)] border border-[var(--danger-light)] flex items-center justify-center mb-6">
                        <span className="text-2xl font-bold text-[var(--danger)]">403</span>
                      </div>
                      <h1 className="text-xl font-bold text-[var(--text-primary)]">Access Denied</h1>
                      <p className="text-sm text-[var(--text-secondary)] mt-2 max-w-xs leading-relaxed">
                        Your administrative role is not permitted to view this section. Contact your administrator if this is a mistake.
                      </p>
                      <Link
                        to="/dashboard"
                        className="mt-6 inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--brand)] text-[var(--text-inverse)] rounded-lg text-sm font-medium hover:bg-[var(--brand-dark)] transition-colors shadow-sm"
                      >
                        Return to Dashboard
                      </Link>
                    </div>
                  }
                />
                <Route path="/*" element={
                  <AuthenticatedRoute>
                    <DashboardLayout />
                  </AuthenticatedRoute>
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
