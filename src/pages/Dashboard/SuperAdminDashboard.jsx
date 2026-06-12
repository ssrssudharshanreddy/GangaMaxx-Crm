import React, { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid } from 'recharts';
import { Card, Badge } from '../../components/ui/ui-components';

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
  blacklisted: 'bg-rose-50 text-rose-700',
};

export default function SuperAdminDashboard({ institutions, products, orders, invoices, payments, staff, tickets }) {
  
  // Row 1: Top-Level KPIs
  const totalCustomers = institutions.length;
  const activeCustomers = institutions.filter(i => i.status === 'active').length;
  
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthlyRevenue = payments
    .filter(p => (p.createdAt || '').startsWith(currentMonth))
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);
    
  const outstandingAmount = invoices
    .filter(i => ['unpaid', 'overdue'].includes(i.status))
    .reduce((sum, i) => sum + Number(i.total || i.amount || 0), 0);

  // Row 2: Asset & Resource KPIs
  const inventoryValue = products
    .filter(p => p.status !== 'archived')
    .reduce((sum, p) => sum + (Number(p.stock || p.quantity || 0) * Number(p.basePrice || 0)), 0);
    
  const activeProducts = products.filter(p => p.status !== 'archived');
  const healthyProducts = activeProducts.filter(p => Number(p.stock || p.quantity || 0) > Number(p.reorderLevel || 10));
  const inventoryHealth = activeProducts.length > 0 ? Math.round((healthyProducts.length / activeProducts.length) * 100) : 0;
  
  const totalEmployees = staff.filter(s => s.status !== 'archived').length;
  
  const completedOrders = orders.filter(o => ['delivered', 'completed', 'paid'].includes(o.status));
  const allProcessedOrders = orders.filter(o => !['pending', 'cancelled'].includes(o.status));
  const deliveryPerformance = allProcessedOrders.length > 0 ? Math.round((completedOrders.length / allProcessedOrders.length) * 100) : 0;

  // Row 3: Charts
  const customerGrowthData = useMemo(() => {
    const data = {};
    institutions.forEach(i => {
      const month = (i.createdAt || '').slice(0, 7);
      if (month) {
        data[month] = (data[month] || 0) + 1;
      }
    });
    return Object.keys(data).sort().slice(-6).map(month => ({
      name: month,
      New: data[month]
    }));
  }, [institutions]);

  const collectionPerformanceData = useMemo(() => {
    const data = {};
    invoices.forEach(i => {
      const month = (i.createdAt || i.dueDate || '').slice(0, 7);
      if (month) {
        if (!data[month]) data[month] = { Invoiced: 0, Collected: 0 };
        data[month].Invoiced += Number(i.total || i.amount || 0);
      }
    });
    payments.forEach(p => {
      const month = (p.createdAt || '').slice(0, 7);
      if (month) {
        if (!data[month]) data[month] = { Invoiced: 0, Collected: 0 };
        data[month].Collected += Number(p.amount || 0);
      }
    });
    return Object.keys(data).sort().slice(-6).map(month => ({
      name: month,
      ...data[month]
    }));
  }, [invoices, payments]);

  // Row 4: Operational Governance
  const criticalAlerts = useMemo(() => {
    const alerts = [];
    const suspended = institutions.filter(i => ['suspended', 'blacklisted'].includes(i.status));
    suspended.forEach(i => alerts.push({ type: 'Governance', message: `${i.name} is ${i.status}`, severity: 'high' }));
    
    const lowStock = products.filter(p => p.status !== 'archived' && Number(p.stock || p.quantity || 0) <= Number(p.reorderLevel || 10));
    if (lowStock.length > 0) {
      alerts.push({ type: 'Inventory', message: `${lowStock.length} SKUs below reorder level`, severity: 'medium' });
    }
    
    const overdue = invoices.filter(i => i.status === 'overdue');
    if (overdue.length > 0) {
      alerts.push({ type: 'Finance', message: `${overdue.length} invoices are overdue`, severity: 'high' });
    }
    
    const creditOverrides = orders.filter(o => o.creditOverride === true);
    if (creditOverrides.length > 0) {
      alerts.push({ type: 'Finance', message: `${creditOverrides.length} orders bypassed credit limit`, severity: 'medium' });
    }
    
    return alerts.slice(0, 5);
  }, [institutions, products, invoices, orders]);

  const recentActivities = useMemo(() => {
    return [
      ...orders.map(o => ({ type: 'Order', title: o.orderNumber || o.id, date: o.createdAt, status: o.status })),
      ...institutions.map(i => ({ type: 'Institution', title: i.name, date: i.createdAt, status: i.status })),
      ...tickets.map(t => ({ type: 'Ticket', title: t.subject || t.ticketNumber, date: t.createdAt, status: t.status }))
    ]
    .filter(a => a.date)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 6);
  }, [orders, institutions, tickets]);

  return (
    <div className="flex flex-col gap-6">
      
      {/* Row 1: Top-Level KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="space-y-1 border-l-4 border-l-indigo-500">
          <div className="text-xs uppercase tracking-widest text-[var(--text-tertiary)]">Total Customers</div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">{totalCustomers}</div>
        </Card>
        <Card className="space-y-1 border-l-4 border-l-emerald-500">
          <div className="text-xs uppercase tracking-widest text-[var(--text-tertiary)]">Active Customers</div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">{activeCustomers}</div>
        </Card>
        <Card className="space-y-1 border-l-4 border-l-blue-500">
          <div className="text-xs uppercase tracking-widest text-[var(--text-tertiary)]">Monthly Revenue</div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">{currency.format(monthlyRevenue)}</div>
        </Card>
        <Card className="space-y-1 border-l-4 border-l-rose-500">
          <div className="text-xs uppercase tracking-widest text-[var(--text-tertiary)]">Outstanding Amount</div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">{currency.format(outstandingAmount)}</div>
        </Card>
      </div>

      {/* Row 2: Asset & Resource KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="space-y-1 border-l-4 border-l-violet-500">
          <div className="text-xs uppercase tracking-widest text-[var(--text-tertiary)]">Inventory Value</div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">{currency.format(inventoryValue)}</div>
        </Card>
        <Card className="space-y-1 border-l-4 border-l-slate-500">
          <div className="text-xs uppercase tracking-widest text-[var(--text-tertiary)]">Total Employees</div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">{totalEmployees}</div>
        </Card>
        <Card className={`space-y-1 border-l-4 ${inventoryHealth > 80 ? 'border-l-emerald-500' : 'border-l-amber-500'}`}>
          <div className="text-xs uppercase tracking-widest text-[var(--text-tertiary)]">Inventory Health</div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">{inventoryHealth}%</div>
          <div className="text-[11px] text-[var(--text-secondary)]">Products above reorder level</div>
        </Card>
        <Card className={`space-y-1 border-l-4 ${deliveryPerformance > 85 ? 'border-l-emerald-500' : 'border-l-amber-500'}`}>
          <div className="text-xs uppercase tracking-widest text-[var(--text-tertiary)]">Delivery Performance</div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">{deliveryPerformance}%</div>
          <div className="text-[11px] text-[var(--text-secondary)]">Processed orders delivered</div>
        </Card>
      </div>

      {/* Row 3: Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Customer Growth</h2>
            <p className="text-sm text-[var(--text-secondary)]">New institutional signups over the last 6 months.</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={customerGrowthData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <Line type="monotone" dataKey="New" stroke="#8b5cf6" strokeWidth={3} />
                <CartesianGrid stroke="#ccc" strokeDasharray="5 5" opacity={0.3} />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Collection Performance</h2>
            <p className="text-sm text-[var(--text-secondary)]">Invoiced vs Collected revenue over the last 6 months.</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={collectionPerformanceData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid stroke="#ccc" strokeDasharray="5 5" opacity={0.3} />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(val) => currency.format(val)} />
                <Bar dataKey="Invoiced" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Collected" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Row 4: Operational Governance */}
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Card className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-rose-600">Critical Alerts</h2>
            <p className="text-sm text-[var(--text-secondary)]">System anomalies requiring governance attention.</p>
          </div>
          {criticalAlerts.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">No active alerts.</p>
          ) : (
            <div className="space-y-3">
              {criticalAlerts.map((alert, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-rose-50 rounded-lg">
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-rose-800">{alert.message}</div>
                    <div className="text-xs text-rose-600 uppercase tracking-widest">{alert.type}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
        
        <Card className="space-y-4 xl:col-span-2">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Recent Activities</h2>
            <p className="text-sm text-[var(--text-secondary)]">Latest ecosystem-wide actions.</p>
          </div>
          {recentActivities.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">No recent activities.</p>
          ) : (
            <div className="space-y-3">
              {recentActivities.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-3 last:border-0 last:pb-0">
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

    </div>
  );
}
