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
                    <td className="px-5 py-3 text-right"><Button variant="outline" size="xs" icon={Pencil} onClick={() => openEdit(o)}>Update</Button></td>
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
