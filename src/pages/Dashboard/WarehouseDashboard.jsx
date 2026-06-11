import { useMemo } from 'react';
import { Card } from '../../components/ui/ui-components';
import { Package, AlertTriangle, ShoppingCart, Truck, RotateCcw, CheckCircle2, Clock, ArrowDownCircle, XCircle, Search, Bell, Activity } from 'lucide-react';

export default function WarehouseDashboard({ products, orders, returns, deliveries }) {
  // ─── Inventory Metrics ───────────────────────────────────────────────────────
  const totalInventory = useMemo(() =>
    products.reduce((sum, p) => sum + (p.stockLevel || 0), 0), [products]);

  const lowStockItems = useMemo(() =>
    products.filter(p => (p.stockLevel || 0) > 0 && (p.stockLevel || 0) <= (p.reorderPoint || 10)).length, [products]);

  const outOfStockItems = useMemo(() =>
    products.filter(p => (p.stockLevel || 0) === 0).length, [products]);

  // ─── Order Metrics ───────────────────────────────────────────────────────────
  const pendingOrders = useMemo(() =>
    orders.filter(o => o.status === 'confirmed' || o.status === 'pending').length, [orders]);

  const assignedOrders = useMemo(() =>
    orders.filter(o => o.status === 'assigned').length, [orders]);

  const ordersInPacking = useMemo(() =>
    orders.filter(o => o.status === 'packing').length, [orders]);

  const ordersInTransit = useMemo(() =>
    orders.filter(o => o.status === 'in_transit' || o.status === 'dispatched').length, [orders]);

  const completedDeliveries = useMemo(() =>
    orders.filter(o => o.status === 'delivered').length, [orders]);

  // ─── Return Metrics ───────────────────────────────────────────────────────────
  const pendingReturns = useMemo(() =>
    returns.filter(r => r.status === 'requested').length, [returns]);

  const returnVerificationQueue = useMemo(() =>
    returns.filter(r => r.status === 'approved').length, [returns]);

  // ─── Widget Config ────────────────────────────────────────────────────────────
  const widgets = [
    {
      label: 'Total Inventory',
      value: totalInventory.toLocaleString('en-IN'),
      sub: `${products.length} SKUs tracked`,
      icon: Package,
      border: 'border-l-blue-600',
      iconColor: 'text-blue-600',
    },
    {
      label: 'Low Stock Items',
      value: lowStockItems,
      sub: 'Below reorder point',
      icon: AlertTriangle,
      border: lowStockItems > 0 ? 'border-l-amber-500' : 'border-l-emerald-500',
      iconColor: lowStockItems > 0 ? 'text-amber-500' : 'text-emerald-500',
    },
    {
      label: 'Out Of Stock Items',
      value: outOfStockItems,
      sub: 'Needs immediate restock',
      icon: XCircle,
      border: outOfStockItems > 0 ? 'border-l-rose-600' : 'border-l-emerald-500',
      iconColor: outOfStockItems > 0 ? 'text-rose-600' : 'text-emerald-500',
    },
    {
      label: 'Pending Orders',
      value: pendingOrders,
      sub: 'Awaiting warehouse review',
      icon: ShoppingCart,
      border: 'border-l-indigo-500',
      iconColor: 'text-indigo-500',
    },
    {
      label: 'Assigned Orders',
      value: assignedOrders,
      sub: 'Assigned to warehouse staff',
      icon: ArrowDownCircle,
      border: 'border-l-violet-500',
      iconColor: 'text-violet-500',
    },
    {
      label: 'Orders In Packing',
      value: ordersInPacking,
      sub: 'Being prepared for dispatch',
      icon: Package,
      border: 'border-l-cyan-500',
      iconColor: 'text-cyan-500',
    },
    {
      label: 'Orders In Transit',
      value: ordersInTransit,
      sub: 'Out for delivery',
      icon: Truck,
      border: 'border-l-orange-500',
      iconColor: 'text-orange-500',
    },
    {
      label: 'Completed Deliveries',
      value: completedDeliveries,
      sub: 'Successfully delivered',
      icon: CheckCircle2,
      border: 'border-l-emerald-600',
      iconColor: 'text-emerald-600',
    },
    {
      label: 'Pending Returns',
      value: pendingReturns,
      sub: 'Awaiting salesman approval',
      icon: RotateCcw,
      border: 'border-l-amber-500',
      iconColor: 'text-amber-500',
    },
    {
      label: 'Return Verification Queue',
      value: returnVerificationQueue,
      sub: 'Awaiting warehouse inspection',
      icon: Search,
      border: returnVerificationQueue > 0 ? 'border-l-rose-500' : 'border-l-[var(--border)]',
      iconColor: returnVerificationQueue > 0 ? 'text-rose-500' : 'text-[var(--text-tertiary)]',
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
      value: orders.slice(0, 5).length,
      sub: 'Latest order activities',
      icon: Activity,
      border: 'border-l-slate-500',
      iconColor: 'text-slate-500',
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Primary KPI Grid — 4 columns on large screens */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {widgets.slice(0, 4).map((w) => (
          <WarehouseWidget key={w.label} {...w} />
        ))}
      </div>

      {/* Fulfillment Pipeline */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {widgets.slice(4, 8).map((w) => (
          <WarehouseWidget key={w.label} {...w} />
        ))}
      </div>

      {/* Returns & Activities */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {widgets.slice(8, 12).map((w) => (
          <WarehouseWidget key={w.label} {...w} />
        ))}
      </div>

      {/* Recent Order Activity Table */}
      <div className="grid gap-4 lg:grid-cols-2">
        <RecentOrdersPanel orders={orders} />
        <ReturnVerificationPanel returns={returns} />
      </div>
    </div>
  );
}

function WarehouseWidget({ label, value, sub, icon: Icon, border, iconColor }) {
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

function RecentOrdersPanel({ orders }) {
  const recent = [...orders]
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
    .slice(0, 5);

  const statusColor = {
    pending: 'bg-amber-50 text-amber-700 border border-amber-200',
    confirmed: 'bg-blue-50 text-blue-700 border border-blue-200',
    assigned: 'bg-violet-50 text-violet-700 border border-violet-200',
    packing: 'bg-cyan-50 text-cyan-700 border border-cyan-200',
    dispatched: 'bg-orange-50 text-orange-700 border border-orange-200',
    in_transit: 'bg-orange-50 text-orange-700 border border-orange-200',
    delivered: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    cancelled: 'bg-rose-50 text-rose-700 border border-rose-200',
  };

  return (
    <Card className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-[var(--text-primary)]">Recent Orders</h2>
        <p className="text-xs text-[var(--text-secondary)]">Latest orders awaiting fulfillment.</p>
      </div>
      {recent.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">No orders found.</p>
      ) : (
        <div className="space-y-2">
          {recent.map((o) => (
            <div key={o.id} className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-2 last:border-0 last:pb-0">
              <div>
                <div className="text-sm font-medium text-[var(--text-primary)]">{o.orderNumber || o.id}</div>
                <div className="text-xs text-[var(--text-secondary)]">{o.institutionName}</div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${statusColor[o.status] || 'bg-slate-100 text-slate-700'}`}>
                {o.status?.replace(/_/g, ' ')}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function ReturnVerificationPanel({ returns }) {
  const queue = returns.filter(r => r.status === 'approved');

  return (
    <Card className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-[var(--text-primary)]">Return Verification Queue</h2>
        <p className="text-xs text-[var(--text-secondary)]">Salesman-approved returns awaiting your inspection.</p>
      </div>
      {queue.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">Verification queue is clear.</p>
      ) : (
        <div className="space-y-2">
          {queue.slice(0, 5).map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-2 last:border-0 last:pb-0">
              <div>
                <div className="text-sm font-medium text-[var(--text-primary)]">{r.returnNumber || r.id}</div>
                <div className="text-xs text-[var(--text-secondary)]">{r.productName} · {r.institutionName}</div>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                Pending Inspection
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
