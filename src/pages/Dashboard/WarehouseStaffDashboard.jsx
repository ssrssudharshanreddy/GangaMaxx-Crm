import { useMemo } from 'react';
import { Card } from '../../components/ui/ui-components';
import { Truck, CheckCircle2, Clock, RotateCcw, PackageCheck, Bell, Activity, ClipboardList, AlertCircle } from 'lucide-react';

export default function WarehouseStaffDashboard({ orders, returns }) {
  const today = new Date().toISOString().slice(0, 10);

  // ─── Delivery Metrics ─────────────────────────────────────────────────────────
  const assignedDeliveries = useMemo(() =>
    orders.filter((o) =>
      ['confirmed', 'processing', 'dispatched', 'assigned',
       'picked_up', 'out_for_delivery', 'delivery_attempted',
       'delivery_delayed', 'customer_unavailable'].includes(o.deliveryStatus || o.status)
    ).length, [orders]);

  const pendingDeliveries = useMemo(() =>
    orders.filter((o) =>
      ['assigned', 'picked_up', 'out_for_delivery'].includes(o.deliveryStatus || o.status)
    ).length, [orders]);

  const completedDeliveries = useMemo(() =>
    orders.filter((o) => (o.deliveryStatus || o.status) === 'delivered').length, [orders]);

  // ─── Return Collection Metrics ────────────────────────────────────────────────
  const assignedReturns = useMemo(() =>
    returns.filter((r) =>
      ['approved', 'assigned', 'collection_scheduled', 'collected',
       'in_transit', 'delivered_warehouse'].includes(r.collectionStatus || r.status)
    ).length, [returns]);

  const pendingCollections = useMemo(() =>
    returns.filter((r) =>
      ['assigned', 'collection_scheduled', 'collected', 'in_transit'].includes(r.collectionStatus || r.status)
    ).length, [returns]);

  const completedCollections = useMemo(() =>
    returns.filter((r) => r.collectionStatus === 'delivered_warehouse').length, [returns]);

  // ─── Today's Tasks ────────────────────────────────────────────────────────────
  const todaysTasks = useMemo(() => {
    const todayDeliveries = orders.filter((o) =>
      (o.deliveryDate || '').startsWith(today) &&
      !['delivered', 'failed'].includes(o.deliveryStatus || o.status)
    ).length;
    const todayCollections = returns.filter((r) =>
      (r.collectionDate || '').startsWith(today) &&
      r.collectionStatus !== 'delivered_warehouse'
    ).length;
    return todayDeliveries + todayCollections;
  }, [orders, returns, today]);

  // ─── Recent activity feed ─────────────────────────────────────────────────────
  const recentActivity = useMemo(() => {
    const deliveryActivity = orders
      .filter((o) => o.deliveryStatus || o.deliveredAt)
      .slice(0, 3)
      .map((o) => ({
        type: 'Delivery',
        id: o.orderNumber || o.id,
        label: o.institutionName,
        status: o.deliveryStatus || o.status,
        date: o.deliveredAt || o.updatedAt || o.createdAt,
      }));
    const returnActivity = returns
      .filter((r) => r.collectionStatus)
      .slice(0, 2)
      .map((r) => ({
        type: 'Collection',
        id: r.returnNumber || r.id,
        label: r.institutionName,
        status: r.collectionStatus || r.status,
        date: r.collectionUpdatedAt || r.updatedAt || r.createdAt,
      }));
    return [...deliveryActivity, ...returnActivity]
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
      .slice(0, 5);
  }, [orders, returns]);

  // ─── Widget config ────────────────────────────────────────────────────────────
  const widgets = [
    {
      label: 'Assigned Deliveries',
      value: assignedDeliveries,
      sub: 'Total deliveries assigned to you',
      icon: Truck,
      border: 'border-l-blue-600',
      iconColor: 'text-blue-600',
    },
    {
      label: 'Pending Deliveries',
      value: pendingDeliveries,
      sub: 'In progress — not yet completed',
      icon: Clock,
      border: pendingDeliveries > 0 ? 'border-l-amber-500' : 'border-l-[var(--border)]',
      iconColor: pendingDeliveries > 0 ? 'text-amber-500' : 'text-[var(--text-tertiary)]',
    },
    {
      label: 'Completed Deliveries',
      value: completedDeliveries,
      sub: 'PIN verified and delivered',
      icon: CheckCircle2,
      border: 'border-l-emerald-600',
      iconColor: 'text-emerald-600',
    },
    {
      label: 'Assigned Returns',
      value: assignedReturns,
      sub: 'Return collections assigned to you',
      icon: RotateCcw,
      border: 'border-l-violet-500',
      iconColor: 'text-violet-500',
    },
    {
      label: 'Pending Collections',
      value: pendingCollections,
      sub: 'Collections in progress',
      icon: AlertCircle,
      border: pendingCollections > 0 ? 'border-l-orange-500' : 'border-l-[var(--border)]',
      iconColor: pendingCollections > 0 ? 'text-orange-500' : 'text-[var(--text-tertiary)]',
    },
    {
      label: 'Completed Collections',
      value: completedCollections,
      sub: 'Delivered to warehouse',
      icon: PackageCheck,
      border: 'border-l-emerald-500',
      iconColor: 'text-emerald-500',
    },
    {
      label: "Today's Tasks",
      value: todaysTasks,
      sub: `Scheduled for ${today}`,
      icon: ClipboardList,
      border: todaysTasks > 0 ? 'border-l-rose-500' : 'border-l-[var(--border)]',
      iconColor: todaysTasks > 0 ? 'text-rose-500' : 'text-[var(--text-tertiary)]',
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
      value: recentActivity.length,
      sub: 'Latest delivery & collection actions',
      icon: Activity,
      border: 'border-l-slate-500',
      iconColor: 'text-slate-500',
    },
  ];

  const statusColor = {
    delivered: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    out_for_delivery: 'bg-blue-50 text-blue-700 border border-blue-200',
    picked_up: 'bg-violet-50 text-violet-700 border border-violet-200',
    delivery_attempted: 'bg-amber-50 text-amber-700 border border-amber-200',
    delivery_delayed: 'bg-orange-50 text-orange-700 border border-orange-200',
    customer_unavailable: 'bg-rose-50 text-rose-700 border border-rose-200',
    delivered_warehouse: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    collected: 'bg-cyan-50 text-cyan-700 border border-cyan-200',
    in_transit: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Row 1: Deliveries KPI (3 widgets) */}
      <div>
        <p className="text-xs uppercase tracking-widest text-[var(--text-tertiary)] mb-3 font-semibold">Deliveries</p>
        <div className="grid gap-4 sm:grid-cols-3">
          {widgets.slice(0, 3).map((w) => <StaffWidget key={w.label} {...w} />)}
        </div>
      </div>

      {/* Row 2: Collections KPI (3 widgets) */}
      <div>
        <p className="text-xs uppercase tracking-widest text-[var(--text-tertiary)] mb-3 font-semibold">Return Collections</p>
        <div className="grid gap-4 sm:grid-cols-3">
          {widgets.slice(3, 6).map((w) => <StaffWidget key={w.label} {...w} />)}
        </div>
      </div>

      {/* Row 3: Tasks / Notifications / Recent (3 widgets) */}
      <div>
        <p className="text-xs uppercase tracking-widest text-[var(--text-tertiary)] mb-3 font-semibold">Operations</p>
        <div className="grid gap-4 sm:grid-cols-3">
          {widgets.slice(6, 9).map((w) => <StaffWidget key={w.label} {...w} />)}
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* My Deliveries Panel */}
        <Card className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">My Recent Deliveries</h2>
            <p className="text-xs text-[var(--text-secondary)]">Latest delivery status updates.</p>
          </div>
          {orders.slice(0, 5).length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">No deliveries yet.</p>
          ) : (
            <div className="space-y-2">
              {orders.slice(0, 5).map((o) => {
                const s = o.deliveryStatus || o.status || 'pending';
                return (
                  <div key={o.id} className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-2 last:border-0 last:pb-0">
                    <div>
                      <div className="text-sm font-medium text-[var(--text-primary)]">{o.orderNumber || o.id}</div>
                      <div className="text-xs text-[var(--text-secondary)]">{o.institutionName}</div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${statusColor[s] || 'bg-slate-100 text-slate-700'}`}>
                      {s.replace(/_/g, ' ')}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Return Collections Panel */}
        <Card className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">My Return Collections</h2>
            <p className="text-xs text-[var(--text-secondary)]">Assigned return collection status.</p>
          </div>
          {returns.filter((r) => ['approved','assigned','collection_scheduled','collected','in_transit'].includes(r.collectionStatus || r.status)).length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">No collections assigned.</p>
          ) : (
            <div className="space-y-2">
              {returns
                .filter((r) => ['approved','assigned','collection_scheduled','collected','in_transit'].includes(r.collectionStatus || r.status))
                .slice(0, 5)
                .map((r) => {
                  const s = r.collectionStatus || r.status || 'assigned';
                  return (
                    <div key={r.id} className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-2 last:border-0 last:pb-0">
                      <div>
                        <div className="text-sm font-medium text-[var(--text-primary)]">{r.returnNumber || r.id}</div>
                        <div className="text-xs text-[var(--text-secondary)]">{r.productName} · {r.institutionName}</div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${statusColor[s] || 'bg-slate-100 text-slate-700'}`}>
                        {s.replace(/_/g, ' ')}
                      </span>
                    </div>
                  );
                })
              }
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function StaffWidget({ label, value, sub, icon: Icon, border, iconColor }) {
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
