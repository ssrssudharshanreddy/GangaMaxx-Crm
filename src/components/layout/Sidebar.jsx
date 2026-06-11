import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { MENU_PERMISSIONS } from '../../config/permissions';
import {
  LayoutDashboard,
  Users,
  Building2,
  CalendarDays,
  MapPin,
  Package,
  Boxes,
  Truck,
  FileText,
  CreditCard,
  LifeBuoy,
  Box,
  RefreshCcw,
  FileCheck2,
  ShoppingCart,
  Receipt,
  UserCheck,
  Tags,
  FileDigit,
  BarChart3,
  ShieldCheck,
  ClipboardList,
} from 'lucide-react';

/**
 * navSections drives the sidebar — all role arrays derived from
 * MENU_PERMISSIONS (src/config/permissions.js) to stay in sync.
 */
const navSections = [
  {
    title: 'Core',
    items: [
      { name: 'Dashboard',       path: '/dashboard',       icon: LayoutDashboard, key: 'dashboard' },
    ],
  },
  {
    title: 'Sales',
    items: [
      { name: 'Sales Team',      path: '/staff',           icon: Users,         key: 'staff' },
      { name: 'Customer Applications', path: '/customer-applications', icon: FileCheck2, key: 'customerApplications' },
      { name: 'Customers',       path: '/institutions',    icon: Building2,     key: 'institutions' },
      { name: 'Customer 360',    path: '/customer-360',    icon: UserCheck,     key: 'customer360' },
      { name: 'Business Calendar', path: '/business-calendar', icon: CalendarDays,  key: 'businessCalendar' },
      { name: 'Follow-Ups',      path: '/follow-ups',      icon: CalendarDays,  key: 'followUps' },
      { name: 'Visits',          path: '/visit-logs',      icon: MapPin,        key: 'visitLogs' },
      { name: 'Quotations',      path: '/quotations',      icon: FileText,      key: 'quotations' },
      { name: 'Orders',          path: '/orders',          icon: ShoppingCart,  key: 'orders' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { name: 'Categories',         path: '/categories',         icon: Tags,           key: 'categories' },
      { name: 'Products',            path: '/products',           icon: Boxes,          key: 'products' },
      { name: 'Inventory',           path: '/inventory',          icon: Package,        key: 'inventory' },
      { name: 'Procurement',         path: '/procurement',        icon: Truck,          key: 'procurement' },
      { name: 'Deliveries',          path: '/deliveries',         icon: Box,            key: 'deliveries' },
      { name: 'Return Collections',  path: '/return-collections', icon: ClipboardList,  key: 'returnCollections' },
      { name: 'Returns',             path: '/returns',            icon: RefreshCcw,     key: 'returns' },
    ],
  },
  {
    title: 'Finance',
    items: [
      { name: 'Credit Accounts', path: '/credit-accounts', icon: CreditCard,   key: 'creditAccounts' },
      { name: 'Invoices',        path: '/invoices',        icon: FileCheck2,    key: 'invoices' },
      { name: 'Payments',        path: '/payments',        icon: Receipt,       key: 'payments' },
    ],
  },
  {
    title: 'Support',
    items: [
      { name: 'Support Tickets', path: '/support-tickets', icon: LifeBuoy,     key: 'supportTickets' },
    ],
  },
  {
    title: 'Intelligence',
    items: [
      { name: 'Reports',         path: '/reports',         icon: BarChart3,     key: 'reports' },
      { name: 'Notifications',   path: '/notifications-center', icon: FileCheck2, key: 'notifications' },
      { name: 'Compliance',      path: '/compliance',      icon: ShieldCheck,   key: 'compliance' },
      { name: 'Audit Center',    path: '/audit-center',    icon: FileDigit,     key: 'auditCenter' },
    ],
  },
];

export const Sidebar = ({ isMobileOpen, setMobileOpen }) => {
  const { user, logout } = useAuth();
  if (!user) return null;

  const content = (
    <div className="flex h-full flex-col bg-[var(--bg-secondary)] text-[var(--text-primary)]">
      {/* Brand */}
      <div className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-3xl bg-[var(--brand)] text-white font-bold text-sm select-none">
          GM
        </div>
        <div>
          <p className="text-sm font-semibold">Ganga Maxx</p>
          <p className="text-xs text-[var(--text-secondary)]">Admin CRM</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navSections.map((section) => {
          // Filter items by the central MENU_PERMISSIONS matrix
          const visibleItems = section.items.filter((item) => {
            const allowed = MENU_PERMISSIONS[item.key];
            return allowed && allowed.includes(user.role);
          });
          if (!visibleItems.length) return null;

          return (
            <div key={section.title} className="mb-5">
              <p className="px-2 pb-2 text-[10px] uppercase tracking-[0.24em] text-[var(--text-secondary)]">
                {section.title}
              </p>
              <div className="space-y-1">
                {visibleItems.map((item) => (
                  <NavLink
                    to={item.path}
                    key={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-3xl px-3 py-3 text-sm transition ${
                        isActive
                          ? 'bg-[var(--brand)] text-white'
                          : 'text-[var(--text-primary)] hover:bg-[var(--bg-base)]'
                      }`
                    }
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    {item.name}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User + Sign Out */}
      <div className="border-t border-[var(--border)] p-4 space-y-3">
        <div className="flex items-center gap-2 px-2">
          <div className="h-7 w-7 rounded-full bg-[var(--brand-light)] flex items-center justify-center text-xs font-bold text-[var(--brand)] flex-shrink-0">
            {(user.name || user.email || '?').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-[var(--text-primary)] truncate">{user.name}</p>
            <p className="text-[10px] text-[var(--text-secondary)] truncate">{user.role}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={logout}
          className="w-full rounded-3xl bg-[var(--danger)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
        >
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:z-20 border-r border-[var(--border)]">
        {content}
      </div>

      {/* Mobile sidebar overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-50 w-64">{content}</div>
        </div>
      )}
    </>
  );
};
