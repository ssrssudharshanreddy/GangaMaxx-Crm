import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../hooks/useDb';
import { Menu, Bell, X } from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle';

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/staff': 'Staff Members',
  '/institutions': 'Institutions',
  '/follow-ups': 'Follow Ups',
  '/visit-logs': 'Visit Logs',
  '/products': 'Product Catalog',
  '/inventory': 'Inventory',
  '/procurement': 'Procurement',
  '/quotations': 'Quotations',
  '/orders': 'Orders',
  '/deliveries': 'Deliveries',
  '/returns': 'Returns',
  '/credit-accounts': 'Credit Accounts',
  '/invoices': 'Invoices',
  '/payments': 'Payments',
  '/support-tickets': 'Support Tickets',
  '/compliance': 'Compliance',
  '/reports': 'Reports',
};

export const Header = ({ setMobileOpen }) => {
  const { user } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const notifications = useNotifications(user?.id || '');
  const unreadCount = notifications.filter((item) => !item.read).length;

  if (!user) return null;

  return (
    <header className="sticky top-0 z-20 flex flex-col gap-3 border-b border-[var(--border)] bg-[var(--bg-base)] px-4 py-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setMobileOpen(true)} className="lg:hidden rounded-2xl border border-[var(--border)] p-2">
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-secondary)]">Current page</p>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">{pageTitles[location.pathname] || 'Dashboard'}</h1>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <div className="relative">
          <button type="button" onClick={() => setMenuOpen((c) => !c)} className="rounded-2xl border border-[var(--border)] p-2">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--danger)] px-1.5 text-[10px] text-white">{unreadCount}</span>}
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-12 w-80 rounded-3xl border border-[var(--border)] bg-[var(--bg-base)] p-4 shadow-xl">
              <div className="flex items-center justify-between pb-3">
                <p className="text-sm font-semibold">Notifications</p>
                <button type="button" onClick={() => setMenuOpen(false)} className="rounded-full p-1 text-[var(--text-secondary)] hover:bg-slate-100">
                  <X className="h-4 w-4" />
                </button>
              </div>
              {notifications.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)]">No notifications yet.</p>
              ) : (
                <ul className="space-y-3 max-h-72 overflow-y-auto">
                  {notifications.map((notification) => (
                    <li key={notification.id} className="rounded-3xl border border-[var(--border)] bg-[var(--bg-secondary)] p-3">
                      <p className="font-semibold text-[var(--text-primary)]">{notification.title}</p>
                      <p className="mt-1 text-xs text-[var(--text-secondary)]">{notification.body}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 rounded-3xl border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-3xl bg-[var(--brand-light)] text-sm font-bold text-[var(--brand)]">
            {user.name
              .split(' ')
              .map((segment) => segment[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-[var(--text-primary)]">{user.name}</p>
            <p className="text-xs text-[var(--text-secondary)]">{user.role.replace('_', ' ')}</p>
          </div>
        </div>
      </div>
    </header>
  );
};
