import { useMemo } from 'react';
import { Card } from '../../components/ui/ui-components';
import { CreditCard, Users, AlertTriangle, TrendingUp, Receipt, DollarSign, Bell, Activity, ShieldAlert, Clock, CheckCircle2 } from 'lucide-react';

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export default function AccountsDashboard({ institutions, invoices, payments, creditAccounts }) {
  const thisMonth = new Date().toISOString().slice(0, 7);

  // ─── Credit Setup & Activation ────────────────────────────────────────────
  const pendingCreditSetup = useMemo(() =>
    institutions.filter(i => i.status === 'Approved' || i.status === 'Pending Finance Setup' || i.status === 'Credit Assessment').length,
    [institutions]);

  const awaitingActivation = useMemo(() =>
    institutions.filter(i => i.creditLimit > 0 && i.status !== 'Activated' && i.status !== 'Suspended' && i.status !== 'Inactive').length,
    [institutions]);

  // ─── Financial Metrics ────────────────────────────────────────────────────
  const totalOutstanding = useMemo(() =>
    invoices.filter(i => ['unpaid', 'overdue', 'partially_paid'].includes(i.status))
      .reduce((s, i) => s + Number(i.total || i.amount || 0), 0),
    [invoices]);

  const overdueAmount = useMemo(() =>
    invoices.filter(i => i.status === 'overdue')
      .reduce((s, i) => s + Number(i.total || i.amount || 0), 0),
    [invoices]);

  // ─── Credit Utilization ───────────────────────────────────────────────────
  const creditUtilization = useMemo(() => {
    const totalLimit = institutions.reduce((s, i) => s + Number(i.creditLimit || 0), 0);
    const totalUsed = institutions.reduce((s, i) => s + Number(i.creditUsed || 0), 0);
    if (totalLimit === 0) return 0;
    return Math.round((totalUsed / totalLimit) * 100);
  }, [institutions]);

  // ─── Collection Performance ───────────────────────────────────────────────
  const collectionPerformance = useMemo(() => {
    const totalBilled = invoices.reduce((s, i) => s + Number(i.total || i.amount || 0), 0);
    const totalCollected = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
    if (totalBilled === 0) return 100;
    return Math.round((totalCollected / totalBilled) * 100);
  }, [invoices, payments]);

  // ─── Recent Payments ──────────────────────────────────────────────────────
  const recentPayments = useMemo(() =>
    [...payments].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))).slice(0, 5),
    [payments]);

  // ─── Recent Invoices ──────────────────────────────────────────────────────
  const recentInvoices = useMemo(() =>
    [...invoices].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))).slice(0, 5),
    [invoices]);

  // ─── Credit Alerts ────────────────────────────────────────────────────────
  const creditAlerts = useMemo(() =>
    institutions.filter(i => {
      const limit = Number(i.creditLimit || 0);
      const used = Number(i.creditUsed || 0);
      return limit > 0 && used >= limit * 0.9;
    }).length,
    [institutions]);

  // ─── Widget definitions ───────────────────────────────────────────────────
  const widgets = [
    {
      label: 'Pending Credit Setup',
      value: pendingCreditSetup,
      sub: 'Approved customers awaiting credit',
      icon: Clock,
      border: pendingCreditSetup > 0 ? 'border-l-amber-500' : 'border-l-emerald-500',
      iconColor: pendingCreditSetup > 0 ? 'text-amber-500' : 'text-emerald-500',
    },
    {
      label: 'Awaiting Activation',
      value: awaitingActivation,
      sub: 'Credit set, pending activation',
      icon: Users,
      border: awaitingActivation > 0 ? 'border-l-blue-500' : 'border-l-[var(--border)]',
      iconColor: awaitingActivation > 0 ? 'text-blue-500' : 'text-[var(--text-tertiary)]',
    },
    {
      label: 'Total Outstanding',
      value: currency.format(totalOutstanding),
      sub: `${invoices.filter(i => ['unpaid','overdue','partially_paid'].includes(i.status)).length} open invoices`,
      icon: DollarSign,
      border: 'border-l-rose-500',
      iconColor: 'text-rose-500',
    },
    {
      label: 'Overdue Amount',
      value: currency.format(overdueAmount),
      sub: `${invoices.filter(i => i.status === 'overdue').length} overdue invoices`,
      icon: AlertTriangle,
      border: overdueAmount > 0 ? 'border-l-rose-600' : 'border-l-emerald-500',
      iconColor: overdueAmount > 0 ? 'text-rose-600' : 'text-emerald-500',
    },
    {
      label: 'Credit Utilization',
      value: `${creditUtilization}%`,
      sub: 'Across all credit accounts',
      icon: CreditCard,
      border: creditUtilization > 80 ? 'border-l-rose-500' : creditUtilization > 60 ? 'border-l-amber-500' : 'border-l-emerald-500',
      iconColor: creditUtilization > 80 ? 'text-rose-500' : creditUtilization > 60 ? 'text-amber-500' : 'text-emerald-500',
    },
    {
      label: 'Collection Performance',
      value: `${collectionPerformance}%`,
      sub: 'Total collected vs billed',
      icon: TrendingUp,
      border: collectionPerformance >= 80 ? 'border-l-emerald-500' : 'border-l-amber-500',
      iconColor: collectionPerformance >= 80 ? 'text-emerald-500' : 'text-amber-500',
    },
    {
      label: 'Recent Payments',
      value: payments.filter(p => (p.createdAt || '').startsWith(thisMonth)).length,
      sub: 'Payments this month',
      icon: CheckCircle2,
      border: 'border-l-emerald-600',
      iconColor: 'text-emerald-600',
    },
    {
      label: 'Recent Invoices',
      value: invoices.filter(i => (i.createdAt || '').startsWith(thisMonth)).length,
      sub: 'Invoices this month',
      icon: Receipt,
      border: 'border-l-blue-500',
      iconColor: 'text-blue-500',
    },
    {
      label: 'Credit Alerts',
      value: creditAlerts,
      sub: 'Accounts near or over limit',
      icon: ShieldAlert,
      border: creditAlerts > 0 ? 'border-l-rose-500' : 'border-l-[var(--border)]',
      iconColor: creditAlerts > 0 ? 'text-rose-500' : 'text-[var(--text-tertiary)]',
    },
    {
      label: 'Notifications',
      value: '—',
      sub: 'Check Notifications Center',
      icon: Bell,
      border: 'border-l-blue-400',
      iconColor: 'text-blue-400',
    },
    {
      label: 'Recent Activities',
      value: recentPayments.length + recentInvoices.length,
      sub: 'Latest finance actions',
      icon: Activity,
      border: 'border-l-slate-500',
      iconColor: 'text-slate-500',
    },
  ];

  const statusColor = {
    paid: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    unpaid: 'bg-amber-50 text-amber-700 border border-amber-200',
    overdue: 'bg-rose-50 text-rose-700 border border-rose-200',
    partially_paid: 'bg-blue-50 text-blue-700 border border-blue-200',
    cancelled: 'bg-slate-50 text-slate-500 border border-slate-200',
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Row 1: Credit & Activation (4 widgets) */}
      <div>
        <p className="text-xs uppercase tracking-widest text-[var(--text-tertiary)] mb-3 font-semibold">Credit & Activation</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {widgets.slice(0, 4).map((w) => <FinanceWidget key={w.label} {...w} />)}
        </div>
      </div>

      {/* Row 2: Performance (4 widgets) */}
      <div>
        <p className="text-xs uppercase tracking-widest text-[var(--text-tertiary)] mb-3 font-semibold">Performance</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {widgets.slice(4, 8).map((w) => <FinanceWidget key={w.label} {...w} />)}
        </div>
      </div>

      {/* Row 3: Alerts & Activity (3 widgets) */}
      <div>
        <p className="text-xs uppercase tracking-widest text-[var(--text-tertiary)] mb-3 font-semibold">Alerts & Activity</p>
        <div className="grid gap-4 sm:grid-cols-3">
          {widgets.slice(8, 11).map((w) => <FinanceWidget key={w.label} {...w} />)}
        </div>
      </div>

      {/* Live Panels */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent Payments Panel */}
        <Card className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Recent Payments</h2>
            <p className="text-xs text-[var(--text-secondary)]">Latest payment receipts.</p>
          </div>
          {recentPayments.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">No payments recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {recentPayments.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-2 last:border-0 last:pb-0">
                  <div>
                    <div className="text-sm font-medium text-[var(--text-primary)]">{p.institutionName}</div>
                    <div className="text-xs text-[var(--text-secondary)]">{p.createdAt}</div>
                  </div>
                  <span className="text-sm font-bold text-emerald-600">{currency.format(p.amount || 0)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Invoices Panel */}
        <Card className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Recent Invoices</h2>
            <p className="text-xs text-[var(--text-secondary)]">Latest invoices issued.</p>
          </div>
          {recentInvoices.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">No invoices created yet.</p>
          ) : (
            <div className="space-y-2">
              {recentInvoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-2 last:border-0 last:pb-0">
                  <div>
                    <div className="text-sm font-medium text-[var(--text-primary)]">{inv.invoiceNumber || inv.id}</div>
                    <div className="text-xs text-[var(--text-secondary)]">{inv.institutionName}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[var(--text-primary)]">{currency.format(inv.total || inv.amount || 0)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusColor[inv.status] || 'bg-slate-100 text-slate-700'}`}>
                      {(inv.status || '').replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function FinanceWidget({ label, value, sub, icon: Icon, border, iconColor }) {
  return (
    <Card className={`space-y-2 border-l-4 ${border}`}>
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-widest text-[var(--text-tertiary)]">{label}</div>
        <Icon className={`h-4 w-4 flex-shrink-0 ${iconColor}`} />
      </div>
      <div className="text-2xl font-bold text-[var(--text-primary)]">{value}</div>
      <div className="text-xs text-[var(--text-secondary)]">{sub}</div>
    </Card>
  );
}
