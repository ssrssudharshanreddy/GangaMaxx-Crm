import { useState } from 'react';
import { useCollection } from '../../hooks/useDb';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services';
import { PageHeader, Card, Button, Input, Select, Badge, Modal, EmptyState, Textarea } from '../../components/ui/ui-components';
import { ClipboardList, Plus, Pencil } from 'lucide-react';

const PO_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'ordered', label: 'Ordered' },
  { value: 'received', label: 'Received' },
  { value: 'cancelled', label: 'Cancelled' },
];

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

const emptyForm = { supplierName: '', items: [{ productName: '', quantity: 1, unitCost: 0 }], status: 'draft', expectedDate: '', notes: '' };

export default function ProcurementManagement() {
  const { user } = useAuth();
  const procurement = useCollection('procurement');
  const products = useCollection('products');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const openAdd = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (po) => {
    setEditing(po);
    setForm({ supplierName: po.supplierName || '', items: po.items?.length ? po.items : [{ productName: '', quantity: 1, unitCost: 0 }], status: po.status || 'draft', expectedDate: po.expectedDate || '', notes: po.notes || '' });
    setModalOpen(true);
  };

  const handleItemChange = (idx, field, value) => {
    const newItems = [...form.items];
    newItems[idx] = { ...newItems[idx], [field]: field === 'quantity' || field === 'unitCost' ? Number(value) : value };
    setForm({ ...form, items: newItems });
  };

  const addItem = () => setForm({ ...form, items: [...form.items, { productName: '', quantity: 1, unitCost: 0 }] });
  const removeItem = (idx) => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });

  const handleSave = () => {
    if (!form.supplierName) return;
    const poNumber = `PO-${Date.now().toString().slice(-6)}`;
    const totalCost = form.items.reduce((s, i) => s + (i.quantity * i.unitCost), 0);
    if (editing) {
      db.updateProcurement(editing.id, { ...form, totalCost });
    } else {
      db.addProcurement({ ...form, poNumber, totalCost, createdBy: user?.name || user?.email || '' });
    }
    setModalOpen(false);
  };

  const markReceived = (po) => {
    db.updateProcurement(po.id, { status: 'received', receivedDate: new Date().toISOString().slice(0, 10) });
    // Update stock levels for received items
    if (po.items) {
      po.items.forEach((item) => {
        const product = products.find((p) => p.name === item.productName);
        if (product) {
          db.updateProduct(product.id, { stockLevel: (product.stockLevel || 0) + (item.quantity || 0) });
        }
      });
    }
  };

  const filtered = procurement.filter((po) => {
    const matchSearch = po.poNumber?.toLowerCase().includes(search.toLowerCase()) || po.supplierName?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || po.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Procurement" subtitle="Manage purchase orders from suppliers and track incoming stock." actions={<Button icon={Plus} onClick={openAdd}>New PO</Button>} />

      <div className="flex flex-wrap gap-3">
        <Input placeholder="Search by PO # or supplier…" value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 min-w-[200px]" />
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={PO_STATUSES} placeholder="All Statuses" className="w-44" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No purchase orders" description="Create a purchase order to track supplier procurement." actionButton={<Button icon={Plus} onClick={openAdd}>New PO</Button>} />
      ) : (
        <Card noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-secondary)] uppercase tracking-wider">
                  <th className="px-5 py-3">PO #</th>
                  <th className="px-5 py-3">Supplier</th>
                  <th className="px-5 py-3">Items</th>
                  <th className="px-5 py-3 text-right">Cost</th>
                  <th className="px-5 py-3">Expected</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((po) => (
                  <tr key={po.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-secondary)] transition-colors">
                    <td className="px-5 py-3 font-mono text-xs font-medium text-[var(--text-primary)]">{po.poNumber || po.id}</td>
                    <td className="px-5 py-3 text-[var(--text-primary)]">{po.supplierName}</td>
                    <td className="px-5 py-3 text-[var(--text-secondary)]">{po.items?.length || 0} items</td>
                    <td className="px-5 py-3 text-right font-semibold text-[var(--text-primary)]">{currency.format(po.totalCost || 0)}</td>
                    <td className="px-5 py-3 text-[var(--text-secondary)]">{po.expectedDate || '—'}</td>
                    <td className="px-5 py-3"><Badge type={po.status} /></td>
                    <td className="px-5 py-3 text-[var(--text-secondary)]">{po.createdAt}</td>
                    <td className="px-5 py-3 text-right flex gap-1 justify-end">
                      {po.status === 'ordered' && <Button variant="primary" size="xs" onClick={() => markReceived(po)}>Mark Received</Button>}
                      <Button variant="outline" size="xs" icon={Pencil} onClick={() => openEdit(po)}>Edit</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={modalOpen} title={editing ? 'Edit Purchase Order' : 'New Purchase Order'} onClose={() => setModalOpen(false)}>
        <div className="flex flex-col gap-4">
          <Input label="Supplier Name" required value={form.supplierName} onChange={(e) => setForm({ ...form, supplierName: e.target.value })} placeholder="e.g. Supreme Chemicals Ltd." />
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-[var(--text-secondary)]">Line Items</label>
            {form.items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_60px_80px_auto] gap-2 items-end">
                <Select value={item.productName} onChange={(e) => handleItemChange(idx, 'productName', e.target.value)} options={products.map((p) => ({ value: p.name, label: p.name }))} placeholder="Product" />
                <Input type="number" min="1" value={item.quantity} onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)} />
                <Input type="number" min="0" value={item.unitCost} onChange={(e) => handleItemChange(idx, 'unitCost', e.target.value)} placeholder="Cost" />
                {form.items.length > 1 && <Button variant="danger" size="xs" onClick={() => removeItem(idx)}>✕</Button>}
              </div>
            ))}
            <Button variant="secondary" size="sm" onClick={addItem}>+ Add Item</Button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Expected Date" type="date" value={form.expectedDate} onChange={(e) => setForm({ ...form, expectedDate: e.target.value })} />
            <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={PO_STATUSES} />
          </div>
          <Textarea label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="PO notes…" />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? 'Save Changes' : 'Create PO'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
