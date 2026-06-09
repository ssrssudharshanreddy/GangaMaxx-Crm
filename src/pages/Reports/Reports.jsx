import { useMemo, useState, useCallback } from 'react';
import { useCollection } from '../../hooks/useDb';
import { PageHeader, Card, SectionCard, Button } from '../../components/ui/ui-components';
import { BarChart3, TrendingUp, DollarSign, Users, Package, ShoppingCart, Receipt, Headset, MapPin, CalendarCheck, Download } from 'lucide-react';

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

const downloadCSV = (filename, headers, rows) => {
  const content = [headers, ...rows]
    .map(r => r.map(c => `"${String(c ?? '').replace(/"/g,'""')}"`).join(','))
    .join('\n');
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([content], {type:'text/csv'})),
    download: filename
  });
  a.click(); URL.revokeObjectURL(a.href);
};

const MetricCard = ({ icon: Icon, label, value, sub, color = '' }) => (
  <Card className="space-y-1">
    <div className="flex items-center gap-2">
      {Icon && <Icon className={`h-4 w-4 ${color || 'text-[var(--text-tertiary)]'}`} />}
      <div className="text-xs uppercase tracking-widest text-[var(--text-tertiary)]">{label}</div>
    </div>
    <div className={`text-2xl font-bold ${color || 'text-[var(--text-primary)]'}`}>{value}</div>
    {sub && <div className="text-[11px] text-[var(--text-secondary)]">{sub}</div>}
  </Card>
);

export default function Reports() {
  const institutions = useCollection('institutions');
  const orders = useCollection('orders');
  const invoices = useCollection('invoices');
  const payments = useCollection('payments');
  const products = useCollection('products');
  const tickets = useCollection('tickets');
  const followUps = useCollection('followUps');
  const visitLogs = useCollection('visitLogs');
  const procurement = useCollection('procurement');
  const returns = useCollection('returns');
  const staff = useCollection('staff');

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filterByDate = useCallback((items, field = 'createdAt') => {
    if (!dateFrom && !dateTo) return items;
    return items.filter(item => {
      const d = item[field] || '';
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
      return true;
    });
  }, [dateFrom, dateTo]);

  // Revenue & Billing
  const totalRevenue = useMemo(() => filterByDate(payments).reduce((s, p) => s + Number(p.amount || 0), 0), [payments, filterByDate]);
  const totalInvoiced = useMemo(() => filterByDate(invoices).reduce((s, i) => s + Number(i.total || i.amount || 0), 0), [invoices, filterByDate]);
  const totalOutstanding = useMemo(() => filterByDate(invoices).filter((i) => ['unpaid', 'overdue'].includes(i.status)).reduce((s, i) => s + Number(i.total || i.amount || 0), 0), [invoices, filterByDate]);
  const collectionRate = totalInvoiced > 0 ? Math.round((totalRevenue / totalInvoiced) * 100) : 0;

  // Orders
  const filteredOrders = useMemo(() => filterByDate(orders), [orders, filterByDate]);
  const totalOrders = filteredOrders.length;
  const ordersByStatus = useMemo(() => {
    const map = {};
    filteredOrders.forEach((o) => { map[o.status] = (map[o.status] || 0) + 1; });
    return Object.entries(map).map(([status, count]) => ({ status, count }));
  }, [filteredOrders]);
  const totalOrderValue = useMemo(() => filteredOrders.reduce((s, o) => s + Number(o.total || 0), 0), [filteredOrders]);
  const avgOrderValue = totalOrders > 0 ? totalOrderValue / totalOrders : 0;

  // Inventory
  const totalSKUs = products.length;
  const lowStock = products.filter((p) => (p.stockLevel || 0) <= (p.reorderPoint || 10) && (p.stockLevel || 0) > 0).length;
  const outOfStock = products.filter((p) => (p.stockLevel || 0) === 0).length;

  // CRM
  const filteredTickets = useMemo(() => filterByDate(tickets), [tickets, filterByDate]);
  const openTickets = filteredTickets.filter((t) => ['open', 'assigned', 'in_progress'].includes(t.status)).length;
  const resolvedTickets = filteredTickets.filter((t) => ['resolved', 'closed'].includes(t.status)).length;
  const pendingFollowUps = useMemo(() => filterByDate(followUps).filter((f) => f.status === 'pending').length, [followUps, filterByDate]);
  const filteredVisitLogs = useMemo(() => filterByDate(visitLogs), [visitLogs, filterByDate]);

  // Procurement
  const filteredProcurement = useMemo(() => filterByDate(procurement), [procurement, filterByDate]);
  const activePOs = filteredProcurement.filter((p) => !['received', 'cancelled'].includes(p.status)).length;
  const procurementSpend = useMemo(() => filteredProcurement.filter((p) => p.status === 'received').reduce((s, p) => s + Number(p.totalCost || 0), 0), [filteredProcurement]);

  // Returns
  const filteredReturns = useMemo(() => filterByDate(returns), [returns, filterByDate]);

  // Top Customers by Order Value
  const topCustomers = useMemo(() => {
    const map = {};
    filteredOrders.forEach((o) => {
      if (o.institutionName) {
        map[o.institutionName] = (map[o.institutionName] || 0) + Number(o.total || 0);
      }
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [filteredOrders]);

  // Top Products by Quantity Ordered
  const topProducts = useMemo(() => {
    const map = {};
    filteredOrders.forEach((o) => {
      (o.items || []).forEach((item) => {
        if (item.productName) {
          map[item.productName] = (map[item.productName] || 0) + Number(item.quantity || 0);
        }
      });
    });
    return Object.entries(map).map(([name, qty]) => ({ name, qty })).sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [filteredOrders]);


  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reports & Analytics"
        subtitle="Comprehensive business intelligence across all modules."
        actions={
          <Button icon={Download} variant="secondary" size="sm"
            onClick={() => downloadCSV(`report-${new Date().toISOString().slice(0,10)}.csv`,
              ['Metric', 'Value'],
              [
                ['Total Revenue', totalRevenue],
                ['Total Invoiced', totalInvoiced],
                ['Outstanding', totalOutstanding],
                ['Collection Rate %', collectionRate],
                ['Total Orders', totalOrders],
                ['Avg Order Value', Math.round(avgOrderValue)],
                ['Low Stock SKUs', lowStock],
                ['Out of Stock SKUs', outOfStock],
                ['Open Tickets', openTickets],
                ['Resolved Tickets', resolvedTickets],
              ]
            )}>Export Report</Button>
        }
      />

      {/* Date Range Filter */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-[var(--bg-base)] border border-[var(--border)] rounded-xl">
        <span className="text-sm font-medium text-[var(--text-secondary)]">Filter by date:</span>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1.5 text-sm text-[var(--text-primary)] focus:border-[var(--brand)] focus:outline-none" />
        <span className="text-sm text-[var(--text-tertiary)]">to</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1.5 text-sm text-[var(--text-primary)] focus:border-[var(--brand)] focus:outline-none" />
        {(dateFrom || dateTo) && (
          <button onClick={() => { setDateFrom(''); setDateTo(''); }}
            className="text-xs text-[var(--danger)] hover:underline">Clear</button>
        )}
      </div>

      {/* Revenue Overview */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={DollarSign} label="Revenue Collected" value={currency.format(totalRevenue)} sub={`${filterByDate(payments).length} payments`} color="text-emerald-600" />
        <MetricCard icon={Receipt} label="Total Invoiced" value={currency.format(totalInvoiced)} sub={`${filterByDate(invoices).length} invoices`} />
        <MetricCard icon={TrendingUp} label="Outstanding" value={currency.format(totalOutstanding)} sub={`Collection rate: ${collectionRate}%`} color="text-amber-600" />
        <MetricCard icon={ShoppingCart} label="Avg Order Value" value={currency.format(avgOrderValue)} sub={`${totalOrders} total orders`} />
      </div>

      {/* Operations Snapshot */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Users} label="Institutions" value={institutions.length} sub={`${institutions.filter((i) => i.status === 'active').length} active`} />
        <MetricCard icon={Package} label="Inventory" value={`${totalSKUs} SKUs`} sub={`${lowStock} low, ${outOfStock} out of stock`} color={outOfStock > 0 ? 'text-rose-600' : ''} />
        <MetricCard icon={Headset} label="Support" value={`${openTickets} open`} sub={`${resolvedTickets} resolved`} color={openTickets > 3 ? 'text-amber-600' : ''} />
        <MetricCard icon={CalendarCheck} label="Follow-Ups" value={`${pendingFollowUps} pending`} sub={`${filteredVisitLogs.length} site visits`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top Customers */}
        <SectionCard
          title="Top Customers by Order Value"
          subtitle="Based on total order revenue"
          action={
            <Button size="sm" variant="secondary" icon={Download}
              onClick={() => downloadCSV('top-customers.csv',
                ['Institution', 'Total Order Value (INR)'],
                topCustomers.map(c => [c.name, c.value])
              )}>Export</Button>
          }
        >
          {topCustomers.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">No order data available.</p>
          ) : (
            <div className="space-y-3">
              {topCustomers.map((c, idx) => (
                <div key={c.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-[var(--text-tertiary)] w-5">{idx + 1}</span>
                    <span className="text-sm font-medium text-[var(--text-primary)]">{c.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{currency.format(c.value)}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Top Products */}
        <SectionCard
          title="Top Products by Volume"
          subtitle="Most ordered products by quantity"
          action={
            <Button size="sm" variant="secondary" icon={Download}
              onClick={() => downloadCSV('top-products.csv',
                ['Product', 'Volume (Units)'],
                topProducts.map(p => [p.name, p.qty])
              )}>Export</Button>
          }
        >
          {topProducts.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">No order data available.</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, idx) => (
                <div key={p.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-[var(--text-tertiary)] w-5">{idx + 1}</span>
                    <span className="text-sm font-medium text-[var(--text-primary)]">{p.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{p.qty} units</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Order Breakdown */}
      <SectionCard title="Order Status Breakdown" subtitle="Current distribution of orders by status">
        {ordersByStatus.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">No orders yet.</p>
        ) : (
          <div className="flex flex-wrap gap-4">
            {ordersByStatus.map((s) => (
              <div key={s.status} className="flex items-center gap-2 bg-[var(--bg-secondary)] rounded-lg px-4 py-2">
                <span className="text-sm font-semibold text-[var(--text-primary)]">{s.count}</span>
                <span className="text-xs text-[var(--text-secondary)] capitalize">{s.status?.replace(/_/g, ' ')}</span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Additional Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard icon={BarChart3} label="Staff" value={staff.length} sub={`${staff.filter((s) => s.status === 'active').length} active members`} />
        <MetricCard icon={Package} label="Procurement" value={`${activePOs} active POs`} sub={`${currency.format(procurementSpend)} received`} />
        <MetricCard icon={MapPin} label="Returns" value={filteredReturns.length} sub={`${filteredReturns.filter((r) => r.status === 'requested').length} pending review`} />
      </div>
    </div>
  );
}
