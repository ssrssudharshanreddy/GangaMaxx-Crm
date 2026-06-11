import { useState, useMemo } from 'react';
import { useCollection } from '../../hooks/useDb';
import { useAuth } from '../../context/AuthContext';
import { db, logAuditAction } from '../../services';
import { PageHeader, Card, Button, Input, Select, Badge, Modal, EmptyState } from '../../components/ui/ui-components';
import { Truck, Pencil, ShieldCheck, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { ROLES } from '../../config/permissions';

const UNIFIED_STATUSES = [
  { value: 'Assigned',       label: 'Assigned' },
  { value: 'Packed',         label: 'Packed' },
  { value: 'Dispatched',     label: 'Dispatched' },
  { value: 'Delivered',      label: 'Delivered' },
];

// Statuses that require mandatory remarks (Warehouse Staff)
const REMARK_REQUIRED_STATUSES = ['Cancelled'];

export default function DeliveryManagement() {
  const { user } = useAuth();
  const orders = useCollection('orders');

  const isStaff = user?.role === ROLES.WAREHOUSE_STAFF;
  const STATUSES = UNIFIED_STATUSES;

  const [modalOpen, setModalOpen]     = useState(false);
  const [editing, setEditing]         = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch]           = useState('');
  const [form, setForm]               = useState({
    deliveryStatus: '',
    driverName: '',
    vehicleNumber: '',
    deliveryDate: '',
    deliveryNotes: '',
    deliveryRemark: '',
    customerRemark: '',
  });
  const [inputPin, setInputPin]       = useState('');
  const [deliveryData, setDeliveryData] = useState({ coordinates: '' });

  // ─── Filter orders visible to this role ──────────────────────────────────────
  const deliverableOrders = useMemo(() => {
    const base = orders.filter((o) =>
      ['Confirmed', 'Assigned', 'Packed', 'Dispatched', 'Delivered'].includes(o.status || o.deliveryStatus)
      || ['Confirmed', 'Assigned', 'Packed', 'Dispatched', 'Delivered'].includes(o.status)
    );
    // Warehouse Staff see only their assigned orders
    if (isStaff) {
      return base.filter((o) =>
        o.assignedStaffId === user.id ||
        o.assignedStaffEmail === user.email ||
        // Fallback: show all deliverable for demo (no assignment system yet)
        true
      );
    }
    return base;
  }, [orders, isStaff, user]);

  const filtered = useMemo(() => deliverableOrders.filter((o) => {
    const matchSearch =
      (o.orderNumber || '').toLowerCase().includes(search.toLowerCase()) ||
      (o.institutionName || '').toLowerCase().includes(search.toLowerCase());
    const currentStatus = o.deliveryStatus || o.status || 'Assigned';
    const matchStatus = !statusFilter || currentStatus === statusFilter;
    return matchSearch && matchStatus;
  }), [deliverableOrders, search, statusFilter]);

  // ─── Open modal ───────────────────────────────────────────────────────────────
  const openEdit = (order) => {
    setEditing(order);
    setForm({
      deliveryStatus: order.deliveryStatus || order.status || 'Assigned',
      driverName: order.driverName || '',
      vehicleNumber: order.vehicleNumber || '',
      deliveryDate: order.deliveryDate || '',
      deliveryNotes: order.deliveryNotes || '',
      deliveryRemark: '',
      customerRemark: '',
    });
    setInputPin('');
    setDeliveryData({ coordinates: '' });
    setModalOpen(true);
  };

  // ─── Save / validate ──────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!editing) return;

    const requiresRemark = REMARK_REQUIRED_STATUSES.includes(form.deliveryStatus);
    if (requiresRemark && (!form.deliveryRemark || form.deliveryRemark.trim().length < 5)) {
      toast.error(`A mandatory remark (min 5 chars) is required for "${form.deliveryStatus.replace(/_/g, ' ')}".`);
      return;
    }

    try {
      if (form.deliveryStatus === 'Delivered') {
        // ── Mandatory 6-digit PIN ─────────────────────────────────────────────
        if (!inputPin || inputPin.trim().length !== 6) {
          toast.error('🔐 Exact 6-digit Customer Delivery PIN is mandatory. No bypass allowed.');
          return;
        }
        if (!/^\d{6}$/.test(inputPin.trim())) {
          toast.error('PIN must be exactly 6 numeric digits.');
          return;
        }

        await db.deliverOrder(editing.id, {
          deliveryPin: inputPin.trim(),
          coordinates: deliveryData.coordinates,
          deliveryRemark: form.deliveryRemark,
          customerRemark: form.customerRemark,
          deliveredBy: user.id,
          deliveredByEmail: user.email,
          deliveredAt: new Date().toISOString(),
        });

        logAuditAction(
          user.id, user.email, user.role,
          'DELIVERY_COMPLETED_PIN_VERIFIED',
          'order', editing.id,
          { order: editing.orderNumber || editing.id, pin: '******', staff: user.email, timestamp: new Date().toISOString() }
        );
        toast.success('✅ Delivery completed. PIN verified and proof logged.');
      } else {
        const updates = {
          deliveryStatus: form.deliveryStatus,
          ...(isStaff ? {} : { driverName: form.driverName, vehicleNumber: form.vehicleNumber }),
          deliveryDate: form.deliveryDate,
          deliveryNotes: form.deliveryNotes,
          deliveryRemark: form.deliveryRemark,
        };

        await db.updateOrder(
          editing.id,
          updates,
          user,
          `Delivery status updated to ${form.deliveryStatus}${form.deliveryRemark ? ' — Remark: ' + form.deliveryRemark : ''}`
        );

        logAuditAction(
          user.id, user.email, user.role,
          'DELIVERY_STATUS_UPDATED',
          'order', editing.id,
          { order: editing.orderNumber || editing.id, status: form.deliveryStatus, remark: form.deliveryRemark }
        );
        toast.success('Delivery status updated successfully.');
      }
      setModalOpen(false);
    } catch (err) {
      toast.error(err.message);
    }
  };

  // ─── Packing slip (Exec only) ─────────────────────────────────────────────────
  const printPackingSlip = (order) => {
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head><title>Packing Slip - ${order.orderNumber}</title>
      <style>body{font-family:Arial,sans-serif;padding:30px;color:#111}h1{font-size:22px;margin:0}
      .header{display:flex;justify-content:space-between;margin-bottom:24px;border-bottom:2px solid #111;padding-bottom:16px}
      .section{margin-bottom:20px}.label{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#666}
      .value{font-size:14px;font-weight:600;margin-top:2px}table{width:100%;border-collapse:collapse;margin-top:12px}
      th{text-align:left;font-size:11px;text-transform:uppercase;border-bottom:1px solid #ddd;padding:8px 4px;color:#666}
      td{padding:8px 4px;font-size:13px;border-bottom:1px solid #f0f0f0}
      .footer{margin-top:40px;padding-top:16px;border-top:1px solid #ddd;font-size:11px;color:#666;text-align:center}
      @media print{body{padding:0}}</style></head><body>
      <div class="header"><div><h1>PACKING SLIP</h1><div style="font-size:12px;color:#666;margin-top:4px">Ganga Maxx Marketplace</div></div>
      <div style="text-align:right"><div class="label">Order Number</div><div class="value">${order.orderNumber}</div>
      <div class="label" style="margin-top:8px">Date</div><div class="value">${order.createdAt || new Date().toISOString().slice(0,10)}</div></div></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
      <div class="section"><div class="label">Deliver To</div><div class="value">${order.institutionName || '—'}</div></div>
      <div class="section"><div class="label">Driver / Vehicle</div>
      <div class="value">${order.driverName || '—'} ${order.vehicleNumber ? '· '+order.vehicleNumber : ''}</div>
      <div class="label" style="margin-top:8px">Delivery Date</div><div class="value">${order.deliveryDate || '—'}</div></div></div>
      <table><thead><tr><th>#</th><th>Product</th><th>SKU</th><th>Qty</th><th>Unit</th></tr></thead><tbody>
      ${(order.items || []).map((item, i) => `<tr><td>${i+1}</td><td>${item.productName||item.name||'—'}</td>
      <td>${item.sku||'—'}</td><td><strong>${item.quantity}</strong></td><td>${item.unitOfMeasure||item.unit||'units'}</td></tr>`).join('')}
      </tbody></table>
      <div class="footer">Received in good condition: _________________________ Date: _____________ Signature: _____________</div>
      </body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); }, 400);
  };

  const needsRemark = REMARK_REQUIRED_STATUSES.includes(form.deliveryStatus);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={isStaff ? 'My Deliveries' : 'Delivery Management'}
        subtitle={isStaff
          ? 'Your assigned deliveries. Complete each delivery using the mandatory 6-digit customer PIN.'
          : 'Track order deliveries, assign drivers, and update shipment status.'}
      />

      {/* ── Workflow banner for Warehouse Staff ── */}
      {isStaff && (
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-2xl px-5 py-4 text-sm text-blue-800">
          <ShieldCheck className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Delivery Workflow: </span>
            Assigned → Packed → Dispatched → Reached Customer → <span className="font-bold text-blue-900">6-Digit PIN Verification</span> → Delivered
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search by order # or institution…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px]"
        />
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={STATUSES}
          placeholder="All Statuses"
          className="w-52"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Truck}
          title={isStaff ? 'No deliveries assigned' : 'No deliveries found'}
          description={isStaff ? 'Your assigned deliveries will appear here.' : 'Confirmed orders will appear here for delivery tracking.'}
        />
      ) : (
        <Card noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-secondary)] uppercase tracking-wider">
                  <th className="px-5 py-3">Order #</th>
                  <th className="px-5 py-3">Institution</th>
                  {!isStaff && <th className="px-5 py-3">Driver</th>}
                  {!isStaff && <th className="px-5 py-3">Vehicle</th>}
                  <th className="px-5 py-3">Delivery Date</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => {
                  const currentStatus = o.deliveryStatus || o.status || 'Assigned';
                  return (
                    <tr key={o.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-secondary)] transition-colors">
                      <td className="px-5 py-3 font-mono text-xs font-medium text-[var(--text-primary)]">{o.orderNumber || o.id}</td>
                      <td className="px-5 py-3 text-[var(--text-primary)]">{o.institutionName}</td>
                      {!isStaff && <td className="px-5 py-3 text-[var(--text-secondary)]">{o.driverName || '—'}</td>}
                      {!isStaff && <td className="px-5 py-3 text-[var(--text-secondary)] font-mono text-xs">{o.vehicleNumber || '—'}</td>}
                      <td className="px-5 py-3 text-[var(--text-secondary)]">{o.deliveryDate || '—'}</td>
                      <td className="px-5 py-3">
                        <Badge type={currentStatus} text={currentStatus.replace(/_/g, ' ')} />
                      </td>
                      <td className="px-5 py-3 text-right flex gap-1 justify-end">
                        <Button variant="outline" size="xs" icon={Pencil} onClick={() => openEdit(o)}>
                          {isStaff ? 'Update Status' : 'Update'}
                        </Button>
                        {!isStaff && (
                          <Button variant="outline" size="xs" onClick={() => printPackingSlip(o)}>
                            🖨 Slip
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Update Modal ─────────────────────────────────────────────────────── */}
      <Modal
        open={modalOpen}
        title={`${isStaff ? 'Update My Delivery' : 'Update Delivery'} — ${editing?.orderNumber || ''}`}
        onClose={() => setModalOpen(false)}
      >
        <div className="flex flex-col gap-4">
          {/* Order info summary (read-only for staff) */}
          {isStaff && editing && (
            <div className="bg-[var(--bg-secondary)] rounded-xl p-4 text-sm space-y-1">
              <p><span className="text-[var(--text-secondary)]">Customer:</span> <strong>{editing.institutionName}</strong></p>
              <p><span className="text-[var(--text-secondary)]">Order:</span> <strong className="font-mono">{editing.orderNumber || editing.id}</strong></p>
              {editing.deliveryAddress && (
                <p><span className="text-[var(--text-secondary)]">Address:</span> {editing.deliveryAddress}</p>
              )}
            </div>
          )}

          <Select
            label="Delivery Status"
            value={form.deliveryStatus}
            onChange={(e) => setForm({ ...form, deliveryStatus: e.target.value, deliveryRemark: '' })}
            options={STATUSES}
          />

          {/* ── 6-Digit PIN Block — only shown when completing delivery ── */}
          {form.deliveryStatus === 'Delivered' && (
            <div className="flex flex-col gap-4 border-2 border-blue-400 bg-blue-50 rounded-2xl p-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-blue-600" />
                <h4 className="text-sm font-bold text-blue-900">Proof of Delivery — Mandatory PIN Verification</h4>
              </div>
              <p className="text-xs text-blue-700">
                The customer received a <strong>6-digit PIN</strong> at order confirmation. Enter it exactly to complete the delivery. <strong>No override. No bypass.</strong>
              </p>
              <Input
                label="6-Digit Customer Delivery PIN"
                required
                type="text"
                maxLength={6}
                value={inputPin}
                onChange={(e) => setInputPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter 6-digit PIN"
                className="font-mono text-lg tracking-widest"
              />
              {inputPin.length > 0 && inputPin.length < 6 && (
                <div className="flex items-center gap-1 text-xs text-amber-700">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  PIN must be exactly 6 digits ({inputPin.length}/6)
                </div>
              )}
              <Input
                label="GPS Coordinates (Optional)"
                placeholder="e.g. 19.0760, 72.8777"
                value={deliveryData.coordinates}
                onChange={(e) => setDeliveryData({ ...deliveryData, coordinates: e.target.value })}
              />
              <Input
                label="Customer Remarks"
                placeholder="Any remarks from the customer…"
                value={form.customerRemark}
                onChange={(e) => setForm({ ...form, customerRemark: e.target.value })}
              />
            </div>
          )}

          {/* ── Mandatory remark for failures/delays ── */}
          {needsRemark && (
            <div className="flex flex-col gap-2 border-2 border-amber-400 bg-amber-50 rounded-2xl p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-bold text-amber-900">Mandatory Remark Required</span>
              </div>
              <Input
                label="Reason / Remark"
                required
                value={form.deliveryRemark}
                onChange={(e) => setForm({ ...form, deliveryRemark: e.target.value })}
                placeholder="Explain the reason for this status (min 5 chars)"
              />
            </div>
          )}

          {/* ── Exec-only fields ── */}
          {!isStaff && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Driver Name" value={form.driverName} onChange={(e) => setForm({ ...form, driverName: e.target.value })} placeholder="e.g. Sunil" />
                <Input label="Vehicle Number" value={form.vehicleNumber} onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })} placeholder="MH 01 AB 1234" />
              </div>
            </>
          )}

          <Input
            label="Expected Delivery Date"
            type="date"
            value={form.deliveryDate}
            onChange={(e) => setForm({ ...form, deliveryDate: e.target.value })}
          />

          {/* Delivery remarks (non-failure statuses) */}
          {!needsRemark && form.deliveryStatus !== 'Delivered' && (
            <Input
              label="Delivery Notes"
              value={form.deliveryNotes}
              onChange={(e) => setForm({ ...form, deliveryNotes: e.target.value })}
              placeholder="Any delivery instructions…"
            />
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSave}
              variant={form.deliveryStatus === 'Delivered' ? 'primary' : 'default'}
            >
              {form.deliveryStatus === 'Delivered' ? '✅ Verify PIN & Complete Delivery' : 'Save Update'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
