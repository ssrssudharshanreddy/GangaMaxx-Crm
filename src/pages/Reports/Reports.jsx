import { useMemo, useState } from 'react';
import { useCollection } from '../../hooks/useDb';
import { PageHeader, Card, SectionCard, Button, Select } from '../../components/ui/ui-components';
import { BarChart3, TrendingUp, DollarSign, Users, Package, ShoppingCart, FileText, Receipt, Headset, MapPin, CalendarCheck } from 'lucide-react';

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export default function Reports() {
  const institutions = useCollection('institutions');
  const orders = useCollection('orders');
  const quotations = useCollection('quotations');
  const invoices = useCollection('invoices');
  const payments = useCollection('payments');
  const products = useCollection('products');
  const tickets = useCollection('tickets');
  const followUps = useCollection('followUps');
  const visitLogs = useCollection('visitLogs');
  const procurement = useCollection('procurement');
  const returns = useCollection('returns');
  const staff = useCollection('staff');

  const [reportView, setReportView] = useState('overview');

  // Revenue & Billing
  const totalRevenue = useMemo(() => payments.reduce((s, p) => s + Number(p.amount || 0), 0), [payments]);
  const totalInvoiced = useMemo(() => invoices.reduce((s, i) => s + Number(i.total || i.amount || 0), 0), [invoices]);
  const totalOutstanding = useMemo(() => invoices.filter((i) => ['unpaid', 'overdue'].includes(i.status)).reduce((s, i) => s + Number(i.total || i.amount || 0), 0), [invoices]);
  const collectionRate = totalInvoiced > 0 ? Math.round((totalRevenue / totalInvoiced) * 100) : 0;

  // Orders
  const totalOrders = orders.length;
  const ordersByStatus = useMemo(() => {
    const map = {};
    orders.forEach((o) => { map[o.status] = (map[o.status] || 0) + 1; });
    return Object.entries(map).map(([status, count]) => ({ status, count }));
  }, [orders]);
  const totalOrderValue = useMemo(() => orders.reduce((s, o) => s + Number(o.total || 0), 0), [orders]);
  const avgOrderValue = totalOrders > 0 ? totalOrderValue / totalOrders : 0;

  // Inventory
  const totalSKUs = products.length;
  const lowStock = products.filter((p) => (p.stockLevel || 0) <= (p.reorderPoint || 10) && (p.stockLevel || 0) > 0).length;
  const outOfStock = products.filter((p) => (p.stockLevel || 0) === 0).length;
  const inventoryValue = useMemo(() => products.reduce((s, p) => s + ((p.stockLevel || 0) * (p.basePrice || 0)), 0), [products]);

  // CRM
  const openTickets = tickets.filter((t) => ['open', 'assigned', 'in_progress'].includes(t.status)).length;
  const resolvedTickets = tickets.filter((t) => ['resolved', 'closed'].includes(t.status)).length;
  const pendingFollowUps = followUps.filter((f) => f.status === 'pending').length;

  // Procurement
  const activePOs = procurement.filter((p) => !['received', 'cancelled'].includes(p.status)).length;
  const procurementSpend = useMemo(() => procurement.filter((p) => p.status === 'received').reduce((s, p) => s + Number(p.totalCost || 0), 0), [procurement]);

  // Top Customers by Order Value
  const topCustomers = useMemo(() => {
    const map = {};
    orders.forEach((o) => {
      if (o.institutionName) {
        map[o.institutionName] = (map[o.institutionName] || 0) + Number(o.total || 0);
      }
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [orders]);

  // Top Products by Quantity Ordered
  const topProducts = useMemo(() => {
    const map = {};
    orders.forEach((o) => {
      (o.items || []).forEach((item) => {
        if (item.productName) {
          map[item.productName] = (map[item.productName] || 0) + Number(item.quantity || 0);
        }
      });
    });
    return Object.entries(map).map(([name, qty]) => ({ name, qty })).sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [orders]);

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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Reports & Analytics" subtitle="Comprehensive business intelligence across all modules." />

      {/* Revenue Overview */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={DollarSign} label="Revenue Collected" value={currency.format(totalRevenue)} sub={`${payments.length} payments`} color="text-emerald-600" />
        <MetricCard icon={Receipt} label="Total Invoiced" value={currency.format(totalInvoiced)} sub={`${invoices.length} invoices`} />
        <MetricCard icon={TrendingUp} label="Outstanding" value={currency.format(totalOutstanding)} sub={`Collection rate: ${collectionRate}%`} color="text-amber-600" />
        <MetricCard icon={ShoppingCart} label="Avg Order Value" value={currency.format(avgOrderValue)} sub={`${totalOrders} total orders`} />
      </div>

      {/* Operations Snapshot */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Users} label="Institutions" value={institutions.length} sub={`${institutions.filter((i) => i.status === 'active').length} active`} />
        <MetricCard icon={Package} label="Inventory" value={`${totalSKUs} SKUs`} sub={`${lowStock} low, ${outOfStock} out of stock`} color={outOfStock > 0 ? 'text-rose-600' : ''} />
        <MetricCard icon={Headset} label="Support" value={`${openTickets} open`} sub={`${resolvedTickets} resolved`} color={openTickets > 3 ? 'text-amber-600' : ''} />
        <MetricCard icon={CalendarCheck} label="Follow-Ups" value={`${pendingFollowUps} pending`} sub={`${visitLogs.length} site visits`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top Customers */}
        <SectionCard title="Top Customers by Order Value" subtitle="Based on total order revenue">
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
        <SectionCard title="Top Products by Volume" subtitle="Most ordered products by quantity">
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
        <MetricCard icon={MapPin} label="Returns" value={returns.length} sub={`${returns.filter((r) => r.status === 'requested').length} pending review`} />
      </div>
    </div>
  );
}
