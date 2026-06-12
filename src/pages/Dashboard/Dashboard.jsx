import { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { useCollection } from '../../hooks/useDb';
import { Card, Badge } from '../../components/ui/ui-components';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../config/permissions';
import SuperAdminDashboard from './SuperAdminDashboard';
import SalesExecutiveDashboard from './SalesExecutiveDashboard';
import SalesmanDashboard from './SalesmanDashboard';
import WarehouseDashboard from './WarehouseDashboard';
import WarehouseStaffDashboard from './WarehouseStaffDashboard';
import AccountsDashboard from './AccountsDashboard';

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const statusColor = {
  active: 'bg-emerald-50 text-emerald-700',
  delivered: 'bg-emerald-50 text-emerald-700',
  paid: 'bg-emerald-50 text-emerald-700',
  approved: 'bg-emerald-50 text-emerald-700',
  open: 'bg-amber-50 text-amber-700',
  unpaid: 'bg-amber-50 text-amber-700',
  overdue: 'bg-rose-50 text-rose-700',
  suspended: 'bg-rose-50 text-rose-700',
};

const getAmount = (item) => Number(item.total ?? item.amount ?? item.creditUsed ?? 0);

export default function DashboardPage() {
  const { user } = useAuth();
  const staff = useCollection('staff');
  const institutions = useCollection('institutions');
  const products = useCollection('products');
  const orders = useCollection('orders');
  const invoices = useCollection('invoices');
  const payments = useCollection('payments');
  const tickets = useCollection('tickets');
  const visitLogs = useCollection('visitLogs');
  const followUps = useCollection('followUps');
  const returns = useCollection('returns');

  const myOrders = useMemo(() => {
    if (user?.role !== ROLES.SALESMAN) return [];
    return orders.filter(o => o.salesmanId === user.id || o.salesmanEmail === user.email);
  }, [orders, user]);

  const myInstitutions = useMemo(() => {
    if (user?.role !== ROLES.SALESMAN) return [];
    return institutions.filter(i => i.assignedSalesmanId === user.id || i.assignedSalesmanEmail === user.email);
  }, [institutions, user]);

  const myFollowUps = useMemo(() => {
    if (user?.role !== ROLES.SALESMAN) return [];
    return followUps.filter(f => f.assignedTo === user.id || f.assignedEmail === user.email);
  }, [followUps, user]);

  const pendingMyFollowUps = myFollowUps.filter(f => f.status === 'pending').length;
  const myOrderValue = myOrders.reduce((s, o) => s + Number(o.total || 0), 0);
  const myVisitsThisMonth = useMemo(() => {
    const thisMonth = new Date().toISOString().slice(0, 7);
    return visitLogs.filter(v =>
      (v.salesmanId === user?.id || v.salesmanEmail === user?.email) &&
      (v.createdAt || '').startsWith(thisMonth)
    ).length;
  }, [visitLogs, user]);

  const openInvoices = useMemo(
    () => invoices.filter((invoice) => ['unpaid', 'overdue'].includes(invoice.status)),
    [invoices]
  );

  const openTickets = useMemo(
    () => tickets.filter((ticket) => ['open', 'assigned'].includes(ticket.status)),
    [tickets]
  );

  const revenue = useMemo(
    () => payments.reduce((sum, payment) => sum + getAmount(payment), 0),
    [payments]
  );

  const outstanding = useMemo(
    () => openInvoices.reduce((sum, invoice) => sum + getAmount(invoice), 0),
    [openInvoices]
  );

  const lowStockProducts = useMemo(() => {
    return products.filter(p => (Number(p.stock || p.quantity || 0) <= Number(p.reorderLevel || 10)) && p.status !== 'archived');
  }, [products]);

  const pipeline = useMemo(
    () => [
      { name: 'Orders', value: orders.length },
      { name: 'Invoices', value: invoices.length },
      { name: 'Tickets', value: tickets.length },
    ],
    [orders, invoices, tickets]
  );

  const recentActivity = useMemo(() => (
    [
      ...orders.map((item) => ({ type: 'Order', title: item.orderNumber || item.id, status: item.status, date: item.createdAt })),
      ...invoices.map((item) => ({ type: 'Invoice', title: item.invoiceNumber || item.id, status: item.status, date: item.createdAt || item.dueDate })),
      ...tickets.map((item) => ({ type: 'Ticket', title: item.ticketNumber || item.subject || item.id, status: item.status, date: item.createdAt })),
    ]
      .filter((item) => item.date)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
      .slice(0, 6)
  ), [orders, invoices, tickets]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-extrabold text-[var(--text-primary)]">Dashboard</h1>
        <p className="text-sm text-[var(--text-secondary)]">Live operational view across customers, sales, billing, and support.</p>
      </div>

      {user?.role === ROLES.SUPER_ADMIN && (
        <SuperAdminDashboard institutions={institutions} products={products} orders={orders} invoices={invoices} payments={payments} staff={staff} tickets={tickets} />
      )}

      {user?.role === ROLES.SALES_EXECUTIVE && (
        <SalesExecutiveDashboard 
          institutions={institutions} products={products} orders={orders} 
          invoices={invoices} payments={payments} staff={staff} 
          tickets={tickets} followUps={followUps} 
          visitLogs={visitLogs} 
        />
      )}

      {user?.role === ROLES.SALESMAN && (
        <SalesmanDashboard 
          institutions={institutions} 
          followUps={followUps} 
          returns={returns}
          visitLogs={visitLogs} 
          orders={orders} 
          payments={payments} 
          invoices={invoices} 
        />
      )}

      {user?.role === ROLES.WAREHOUSE_EXECUTIVE && (
        <WarehouseDashboard 
          products={products}
          orders={orders}
          returns={returns}
          deliveries={[]} 
        />
      )}

      {user?.role === ROLES.WAREHOUSE_STAFF && (
        <WarehouseStaffDashboard
          orders={orders}
          returns={returns}
        />
      )}

      {user?.role === ROLES.ACCOUNTS_EXECUTIVE && (
        <AccountsDashboard
          institutions={institutions}
          invoices={invoices}
          payments={payments}
          creditAccounts={institutions}
        />
      )}

      {user?.role === ROLES.SUPER_ADMIN ? (
        <SuperAdminDashboard 
          institutions={institutions}
          products={products}
          orders={orders}
          invoices={invoices}
          payments={payments}
          staff={staff}
          tickets={tickets}
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card className="space-y-2">
              <div className="text-xs uppercase tracking-widest text-[var(--text-tertiary)]">Institutions</div>
              <div className="text-2xl font-bold text-[var(--text-primary)]">{institutions.length}</div>
              <div className="text-[11px] text-[var(--text-secondary)]">{institutions.filter((item) => item.status === 'active').length} active accounts</div>
            </Card>
            <Card className="space-y-2">
              <div className="text-xs uppercase tracking-widest text-[var(--text-tertiary)]">Revenue Collected</div>
              <div className="text-2xl font-bold text-[var(--text-primary)]">{currency.format(revenue)}</div>
              <div className="text-[11px] text-[var(--text-secondary)]">{payments.length} payment records</div>
            </Card>
            <Card className="space-y-2">
              <div className="text-xs uppercase tracking-widest text-[var(--text-tertiary)]">Outstanding</div>
              <div className="text-2xl font-bold text-[var(--text-primary)]">{currency.format(outstanding)}</div>
              <div className="text-[11px] text-[var(--text-secondary)]">{openInvoices.length} open invoices</div>
            </Card>
            <Card className="space-y-2">
              <div className="text-xs uppercase tracking-widest text-[var(--text-tertiary)]">Open Tickets</div>
              <div className="text-2xl font-bold text-[var(--text-primary)]">{openTickets.length}</div>
              <div className="text-[11px] text-[var(--text-secondary)]">{staff.length} staff profiles loaded</div>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <Card className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Business Volume</h2>
                <p className="text-sm text-[var(--text-secondary)]">Counts from Firestore-backed service collections.</p>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <BarChart data={pipeline}>
                    <XAxis dataKey="name" tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill="var(--brand)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Recent Activity</h2>
                <p className="text-sm text-[var(--text-secondary)]">Latest dated records across core workflows.</p>
              </div>
              {recentActivity.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)]">No dated activity records found.</p>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map((item) => (
                    <div key={`${item.type}-${item.title}-${item.date}`} className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-3 last:border-b-0 last:pb-0">
                      <div>
                        <div className="text-sm font-semibold text-[var(--text-primary)]">{item.title}</div>
                        <div className="text-[11px] text-[var(--text-secondary)]">{item.type} · {item.date}</div>
                      </div>
                      {item.status && <Badge text={item.status} color={statusColor[item.status] || 'bg-slate-100 text-slate-700'} />}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}

      {user?.role !== ROLES.SUPER_ADMIN && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="space-y-2">
            <div className="text-xs uppercase tracking-widest text-[var(--text-tertiary)]">Products</div>
            <div className="text-2xl font-bold text-[var(--text-primary)]">{products.length}</div>
            <div className="text-[11px] text-[var(--text-secondary)]">{products.filter((item) => item.status === 'active').length} active SKUs</div>
          </Card>
          <Card className={`space-y-2 border-l-4 ${lowStockProducts.length > 0 ? 'border-l-rose-500' : 'border-l-emerald-500'}`}>
            <div className={`text-xs uppercase tracking-widest ${lowStockProducts.length > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>Low Stock</div>
            <div className={`text-2xl font-bold ${lowStockProducts.length > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{lowStockProducts.length}</div>
            <div className="text-[11px] text-[var(--text-secondary)]">SKUs below reorder level</div>
          </Card>
          <Card className="space-y-2">
            <div className="text-xs uppercase tracking-widest text-[var(--text-tertiary)]">Visits</div>
            <div className="text-2xl font-bold text-[var(--text-primary)]">{visitLogs.length}</div>
            <div className="text-[11px] text-[var(--text-secondary)]">Sales visit logs loaded</div>
          </Card>
          <Card className="space-y-2">
            <div className="text-xs uppercase tracking-widest text-[var(--text-tertiary)]">Follow Ups</div>
            <div className="text-2xl font-bold text-[var(--text-primary)]">{followUps.length}</div>
            <div className="text-[11px] text-[var(--text-secondary)]">CRM follow-up records loaded</div>
          </Card>
        </div>
      )}
    </div>
  );
}
