import { useState, useMemo, useRef, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications, useCollection } from '../../hooks/useDb';
import { Menu, Bell, X, Search } from 'lucide-react';
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
  '/notifications-center': 'Notifications Center',
};

const GlobalSearch = () => {
  const [queryVal, setQueryVal] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  
  const orders = useCollection('orders');
  const institutions = useCollection('institutions');
  const invoices = useCollection('invoices');
  
  const results = useMemo(() => {
    if (!queryVal.trim() || queryVal.length < 2) return [];
    const q = queryVal.toLowerCase();
    const orderResults = orders
      .filter(o => (o.orderNumber||'').toLowerCase().includes(q) || (o.institutionName||'').toLowerCase().includes(q))
      .slice(0, 3)
      .map(o => ({ type: 'Order', label: o.orderNumber || o.id, sub: o.institutionName, path: '/orders' }));
    const instResults = institutions
      .filter(i => (i.name||'').toLowerCase().includes(q) || (i.contactEmail||'').toLowerCase().includes(q))
      .slice(0, 3)
      .map(i => ({ type: 'Institution', label: i.name, sub: i.type || i.category, path: '/institutions' }));
    const invResults = invoices
      .filter(i => (i.invoiceNumber||'').toLowerCase().includes(q) || (i.institutionName||'').toLowerCase().includes(q))
      .slice(0, 3)
      .map(i => ({ type: 'Invoice', label: i.invoiceNumber || i.id, sub: i.institutionName, path: '/invoices' }));
    return [...orderResults, ...instResults, ...invResults];
  }, [queryVal, orders, institutions, invoices]);
  
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape') { setOpen(false); setQueryVal(''); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
  
  return (
    <div className="relative hidden md:block">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-tertiary)] text-sm cursor-pointer hover:border-[var(--border-strong)] w-56"
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}>
        <Search className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="flex-1 text-left">Search...</span>
        <kbd className="text-xs bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded border border-[var(--border)] font-mono">⌘K</kbd>
      </div>
      {open && (
        <div className="absolute top-0 left-0 z-50 w-80">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-t-lg border border-[var(--border)] bg-[var(--bg-base)]">
            <Search className="h-3.5 w-3.5 text-[var(--text-tertiary)] flex-shrink-0" />
            <input ref={inputRef} autoFocus value={queryVal} onChange={e => setQueryVal(e.target.value)}
              placeholder="Search orders, institutions, invoices..."
              className="flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]" />
            <button onClick={() => { setOpen(false); setQueryVal(''); }}>
              <X className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
            </button>
          </div>
          {results.length > 0 && (
            <div className="border-x border-b border-[var(--border)] rounded-b-lg bg-[var(--bg-base)] shadow-lg overflow-hidden max-h-80 overflow-y-auto">
              {results.map((r, i) => (
                <button key={i} onClick={() => { navigate(r.path); setOpen(false); setQueryVal(''); }}
                  className="w-full text-left px-3 py-2.5 hover:bg-[var(--bg-secondary)] flex items-center gap-3 border-b border-[var(--border)] last:border-0">
                  <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--brand-light)] text-[var(--brand-text)] font-medium">{r.type}</span>
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{r.label}</p>
                    {r.sub && <p className="text-xs text-[var(--text-secondary)]">{r.sub}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}
          {queryVal.length >= 2 && results.length === 0 && (
            <div className="border-x border-b border-[var(--border)] rounded-b-lg bg-[var(--bg-base)] px-3 py-4 text-center text-sm text-[var(--text-secondary)]">
              No results for "{queryVal}"
            </div>
          )}
        </div>
      )}
      {open && <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setQueryVal(''); }} />}
    </div>
  );
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
        <GlobalSearch />
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
                  <li className="pt-2 text-center">
                    <Link to="/notifications-center" onClick={() => setMenuOpen(false)} className="text-sm text-[var(--brand)] font-medium hover:underline">
                      View all notifications
                    </Link>
                  </li>
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
