import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
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
  ShieldCheck,
  BarChart3,
  Box,
  CheckCircle,
  FileCheck2,
} from 'lucide-react';

const navSections = [
  {
    title: 'Core',
    items: [
      { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['owner', 'sales_admin', 'salesman', 'warehouse_staff', 'accounts_manager', 'support_staff', 'compliance_admin'] },
    ],
  },
  {
    title: 'Sales',
    items: [
      { name: 'Staff', path: '/staff', icon: Users, roles: ['owner'] },
      { name: 'Institutions', path: '/institutions', icon: Building2, roles: ['owner', 'sales_admin', 'compliance_admin'] },
      { name: 'Follow Ups', path: '/follow-ups', icon: CalendarDays, roles: ['owner', 'sales_admin', 'salesman'] },
      { name: 'Visit Logs', path: '/visit-logs', icon: MapPin, roles: ['owner', 'sales_admin', 'salesman'] },
      { name: 'Quotations', path: '/quotations', icon: FileText, roles: ['owner', 'sales_admin', 'salesman'] },
    ],
  },
  {
    title: 'Operations',
    items: [
      { name: 'Products', path: '/products', icon: Boxes, roles: ['owner', 'warehouse_staff', 'salesman'] },
      { name: 'Inventory', path: '/inventory', icon: Package, roles: ['owner', 'warehouse_staff'] },
      { name: 'Procurement', path: '/procurement', icon: Truck, roles: ['owner', 'warehouse_staff'] },
      { name: 'Deliveries', path: '/deliveries', icon: Box, roles: ['owner', 'sales_admin', 'salesman', 'warehouse_staff'] },
      { name: 'Returns', path: '/returns', icon: CheckCircle, roles: ['owner', 'warehouse_staff'] },
    ],
  },
  {
    title: 'Finance',
    items: [
      { name: 'Credit Accounts', path: '/credit-accounts', icon: CreditCard, roles: ['owner', 'sales_admin', 'accounts_manager'] },
      { name: 'Invoices', path: '/invoices', icon: FileCheck2, roles: ['owner', 'sales_admin', 'accounts_manager'] },
      { name: 'Payments', path: '/payments', icon: CreditCard, roles: ['owner', 'sales_admin', 'accounts_manager'] },
    ],
  },
  {
    title: 'Support',
    items: [
      { name: 'Support Tickets', path: '/support-tickets', icon: LifeBuoy, roles: ['owner', 'support_staff'] },
    ],
  },
  {
    title: 'Compliance',
    items: [
      { name: 'Compliance', path: '/compliance', icon: ShieldCheck, roles: ['owner', 'compliance_admin'] },
      { name: 'Reports', path: '/reports', icon: BarChart3, roles: ['owner', 'sales_admin'] },
    ],
  },
];

export const Sidebar = ({ isMobileOpen, setMobileOpen }) => {
  const { user, logout } = useAuth();
  if (!user) return null;

  const content = (
    <div className="flex h-full flex-col bg-[var(--bg-secondary)] text-[var(--text-primary)]">
      <div className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-3xl bg-[var(--brand)] text-white">GM</div>
        <div>
          <p className="text-sm font-semibold">Ganga Maxx</p>
          <p className="text-xs text-[var(--text-secondary)]">Admin CRM</p>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navSections.map((section) => {
          const visibleItems = section.items.filter((item) => item.roles.includes(user.role));
          if (!visibleItems.length) return null;
          return (
            <div key={section.title} className="mb-5">
              <p className="px-2 pb-2 text-[10px] uppercase tracking-[0.24em] text-[var(--text-secondary)]">{section.title}</p>
              <div className="space-y-1">
                {visibleItems.map((item) => (
                  <NavLink
                    to={item.path}
                    key={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-3xl px-3 py-3 text-sm transition ${
                        isActive ? 'bg-[var(--brand)] text-white' : 'text-[var(--text-primary)] hover:bg-[var(--bg-base)]'
                      }`
                    }
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>
      <div className="border-t border-[var(--border)] p-4">
        <button type="button" onClick={logout} className="w-full rounded-3xl bg-[var(--danger)] px-4 py-3 text-sm font-semibold text-white">
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:z-20 border-r border-[var(--border)]">{content}</div>
      {isMobileOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} aria-hidden="true" />
          <div className="relative z-50 w-64">{content}</div>
        </div>
      )}
    </>
  );
};
