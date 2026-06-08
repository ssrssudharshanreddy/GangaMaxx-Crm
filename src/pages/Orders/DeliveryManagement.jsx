import { useState } from 'react';
import { useCollection } from '../../hooks/useDb';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services';
import { PageHeader, Card, Button, Input, Select, Badge, Modal, EmptyState } from '../../components/ui/ui-components';
import { Truck, Pencil } from 'lucide-react';

const DELIVERY_STATUSES = [
  { value: 'pending', label: 'Pending Pickup' },
  { value: 'in_transit', label: 'In Transit' },
  { value: 'out_for_delivery', label: 'Out for Delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'failed', label: 'Failed' },
];

export default function DeliveryManagement() {
  const orders = useCollection('orders');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ deliveryStatus: '', driverName: '', vehicleNumber: '', deliveryDate: '', deliveryNotes: '' });

  // Only orders that are confirmed+ are eligible for delivery tracking
  const deliverableOrders = orders.filter((o) => ['confirmed', 'processing', 'dispatched', 'delivered'].includes(o.status));

  const openEdit = (order) => {
    setEditing(order);
    setForm({
      deliveryStatus: order.deliveryStatus || 'pending',
      driverName: order.driverName || '',
      vehicleNumber: order.vehicleNumber || '',
      deliveryDate: order.deliveryDate || '',
      deliveryNotes: order.deliveryNotes || '',
    });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!editing) return;
    const updates = { ...form };
    if (form.deliveryStatus === 'delivered') {
      updates.status = 'delivered';
    }
    db.updateOrder(editing.id, updates);
    setModalOpen(false);
  };

  const filtered = deliverableOrders.filter((o) => {
    const matchSearch = o.orderNumber?.toLowerCase().includes(search.toLowerCase()) || o.institutionName?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || (o.deliveryStatus || 'pending') === statusFilter;
    return matchSearch && matchStatus;
  });

  const printPackingSlip = (order) => {
    const win = window.open('', '_blank');
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Packing Slip - ${order.orderNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 30px; color: #111; }
          h1 { font-size: 22px; margin: 0; }
          .header { display: flex; justify-content: space-between; margin-bottom: 24px; border-bottom: 2px solid #111; padding-bottom: 16px; }
          .section { margin-bottom: 20px; }
          .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #666; }
          .value { font-size: 14px; font-weight: 600; margin-top: 2px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th { text-align: left; font-size: 11px; text-transform: uppercase; border-bottom: 1px solid #ddd; padding: 8px 4px; color: #666; }
          td { padding: 8px 4px; font-size: 13px; border-bottom: 1px solid #f0f0f0; }
          .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 11px; color: #666; text-align: center; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>PACKING SLIP</h1>
            <div style="font-size:12px;color:#666;margin-top:4px">Ganga Maxx Marketplace</div>
          </div>
          <div style="text-align:right">
            <div class="label">Order Number</div>
            <div class="value">${order.orderNumber}</div>
            <div class="label" style="margin-top:8px">Date</div>
            <div class="value">${order.createdAt || new Date().toISOString().slice(0,10)}</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
          <div class="section">
            <div class="label">Deliver To</div>
            <div class="value">${order.institutionName || '—'}</div>
          </div>
          <div class="section">
            <div class="label">Driver / Vehicle</div>
            <div class="value">${order.driverName || '—'} ${order.vehicleNumber ? '· ' + order.vehicleNumber : ''}</div>
            <div class="label" style="margin-top:8px">Delivery Date</div>
            <div class="value">${order.deliveryDate || '—'}</div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th><th>Product</th><th>SKU</th><th>Qty</th><th>Unit</th>
            </tr>
          </thead>
          <tbody>
            ${(order.items || []).map((item, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${item.productName || item.name || '—'}</td>
                <td>${item.sku || '—'}</td>
                <td><strong>${item.quantity}</strong></td>
                <td>${item.unitOfMeasure || item.unit || 'units'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ${order.deliveryNotes ? `<div class="section" style="margin-top:20px"><div class="label">Delivery Notes</div><div style="font-size:13px;margin-top:4px">${order.deliveryNotes}</div></div>` : ''}
        <div class="footer">
          Received in good condition: _________________________ Date: _____________ Signature: _____________
        </div>
      </body>
      </html>
    `);
    win.document.close();
    setTimeout(() => { win.print(); }, 400);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Delivery Management" subtitle="Track order deliveries, assign drivers, and update shipment status." />

      <div className="flex flex-wrap gap-3">
        <Input placeholder="Search by order # or institution…" value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 min-w-[200px]" />
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={DELIVERY_STATUSES} placeholder="All Statuses" className="w-48" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Truck} title="No deliveries found" description="Confirmed orders will appear here for delivery tracking." />
      ) : (
        <Card noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-secondary)] uppercase tracking-wider">
                  <th className="px-5 py-3">Order #</th>
                  <th className="px-5 py-3">Institution</th>
                  <th className="px-5 py-3">Driver</th>
                  <th className="px-5 py-3">Vehicle</th>
                  <th className="px-5 py-3">Delivery Date</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-secondary)] transition-colors">
                    <td className="px-5 py-3 font-mono text-xs font-medium text-[var(--text-primary)]">{o.orderNumber || o.id}</td>
                    <td className="px-5 py-3 text-[var(--text-primary)]">{o.institutionName}</td>
                    <td className="px-5 py-3 text-[var(--text-secondary)]">{o.driverName || '—'}</td>
                    <td className="px-5 py-3 text-[var(--text-secondary)] font-mono text-xs">{o.vehicleNumber || '—'}</td>
                    <td className="px-5 py-3 text-[var(--text-secondary)]">{o.deliveryDate || '—'}</td>
                    <td className="px-5 py-3"><Badge type={o.deliveryStatus || 'pending'} text={(o.deliveryStatus || 'pending').replace(/_/g, ' ')} /></td>
                    <td className="px-5 py-3 text-right flex gap-1 justify-end">
                      {(!o.deliveryStatus || o.deliveryStatus === 'pending') && (
                        <Button
                          variant="primary"
                          size="xs"
                          icon={Truck}
                          onClick={() => {
                            openEdit(o);
                            setForm(prev => ({
                              ...prev,
                              deliveryStatus: 'in_transit',
                              deliveryDate: o.deliveryDate || new Date().toISOString().slice(0, 10),
                            }));
                          }}
                        >
                          Dispatch
                        </Button>
                      )}
                      <Button variant="outline" size="xs" onClick={() => printPackingSlip(o)}>
                        🖨 Slip
                      </Button>
                      <Button variant="outline" size="xs" icon={Pencil} onClick={() => openEdit(o)}>Update</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={modalOpen} title={`Update Delivery — ${editing?.orderNumber || ''}`} onClose={() => setModalOpen(false)}>
        <div className="flex flex-col gap-4">
          <Select label="Delivery Status" value={form.deliveryStatus} onChange={(e) => setForm({ ...form, deliveryStatus: e.target.value })} options={DELIVERY_STATUSES} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Driver Name" value={form.driverName} onChange={(e) => setForm({ ...form, driverName: e.target.value })} placeholder="e.g. Sunil" />
            <Input label="Vehicle Number" value={form.vehicleNumber} onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })} placeholder="MH 01 AB 1234" />
          </div>
          <Input label="Expected Delivery Date" type="date" value={form.deliveryDate} onChange={(e) => setForm({ ...form, deliveryDate: e.target.value })} />
          <Input label="Delivery Notes" value={form.deliveryNotes} onChange={(e) => setForm({ ...form, deliveryNotes: e.target.value })} placeholder="Any delivery instructions…" />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save Delivery Update</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
