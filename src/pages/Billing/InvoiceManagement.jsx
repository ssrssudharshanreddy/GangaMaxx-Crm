import { useState } from 'react';
import { useCollection } from '../../hooks/useDb';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services';
import { PageHeader, Card, Button, Input, Select, Badge, Modal, EmptyState } from '../../components/ui/ui-components';
import { Receipt, Plus, Pencil, Eye } from 'lucide-react';

const STATUSES = [
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'partially_paid', label: 'Partially Paid' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'cancelled', label: 'Cancelled' },
];

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export default function InvoiceManagement() {
  const { user } = useAuth();
  const invoices = useCollection('invoices');
  const orders = useCollection('orders');
  const institutions = useCollection('institutions');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const emptyForm = { orderNumber: '', institutionName: '', amount: 0, status: 'unpaid', dueDate: '', notes: '' };
  const [form, setForm] = useState(emptyForm);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (inv) => {
    setEditing(inv);
    setForm({ orderNumber: inv.orderNumber || '', institutionName: inv.institutionName || '', amount: inv.total || inv.amount || 0, status: inv.status || 'unpaid', dueDate: inv.dueDate || '', notes: inv.notes || '' });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.institutionName || !form.amount) return;
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
    if (editing) {
      db.updateInvoice(editing.id, { ...form, total: Number(form.amount) });
    } else {
      db.addInvoice({ ...form, invoiceNumber, total: Number(form.amount), createdBy: user?.name || user?.email || '' });
    }
    setModalOpen(false);
  };

  const handleOrderSelect = (orderNum) => {
    const order = orders.find((o) => (o.orderNumber || o.id) === orderNum);
    if (order) {
      setForm({ ...form, orderNumber: orderNum, institutionName: order.institutionName || form.institutionName, amount: order.total || 0 });
    } else {
      setForm({ ...form, orderNumber: orderNum });
    }
  };

  const filtered = invoices.filter((inv) => {
    const matchSearch = inv.invoiceNumber?.toLowerCase().includes(search.toLowerCase()) || inv.institutionName?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalUnpaid = invoices.filter((i) => ['unpaid', 'overdue'].includes(i.status)).reduce((s, i) => s + Number(i.total || i.amount || 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Invoice Management" subtitle="Create and track invoices for B2B orders." actions={<Button icon={Plus} onClick={openAdd}>New Invoice</Button>} />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="space-y-1">
          <div className="text-xs uppercase tracking-widest text-[var(--text-tertiary)]">Total Invoices</div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">{invoices.length}</div>
        </Card>
        <Card className="space-y-1">
          <div className="text-xs uppercase tracking-widest text-[var(--text-tertiary)]">Unpaid / Overdue</div>
          <div className="text-2xl font-bold text-amber-600">{invoices.filter((i) => ['unpaid', 'overdue'].includes(i.status)).length}</div>
        </Card>
        <Card className="space-y-1">
          <div className="text-xs uppercase tracking-widest text-[var(--text-tertiary)]">Outstanding Amount</div>
          <div className="text-2xl font-bold text-rose-600">{currency.format(totalUnpaid)}</div>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input placeholder="Search by invoice # or institution…" value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 min-w-[200px]" />
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={STATUSES} placeholder="All Statuses" className="w-44" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Receipt} title="No invoices found" description="Generate your first invoice for an order." actionButton={<Button icon={Plus} onClick={openAdd}>New Invoice</Button>} />
      ) : (
        <Card noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-secondary)] uppercase tracking-wider">
                  <th className="px-5 py-3">Invoice #</th>
                  <th className="px-5 py-3">Order #</th>
                  <th className="px-5 py-3">Institution</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                  <th className="px-5 py-3">Due Date</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Created</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => (
                  <tr key={inv.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-secondary)] transition-colors">
                    <td className="px-5 py-3 font-mono text-xs font-medium text-[var(--text-primary)]">{inv.invoiceNumber || inv.id}</td>
                    <td className="px-5 py-3 font-mono text-xs text-[var(--text-secondary)]">{inv.orderNumber || '—'}</td>
                    <td className="px-5 py-3 text-[var(--text-primary)]">{inv.institutionName}</td>
                    <td className="px-5 py-3 text-right font-semibold text-[var(--text-primary)]">{currency.format(inv.total || inv.amount || 0)}</td>
                    <td className={`px-5 py-3 ${inv.status === 'overdue' ? 'text-rose-600 font-semibold' : 'text-[var(--text-secondary)]'}`}>{inv.dueDate || '—'}</td>
                    <td className="px-5 py-3"><Badge type={inv.status} /></td>
                    <td className="px-5 py-3 text-[var(--text-secondary)]">{inv.createdAt}</td>
                    <td className="px-5 py-3 text-right"><Button variant="outline" size="xs" icon={Pencil} onClick={() => openEdit(inv)}>Edit</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={modalOpen} title={editing ? 'Edit Invoice' : 'New Invoice'} onClose={() => setModalOpen(false)}>
        <div className="flex flex-col gap-4">
          <Select label="Link to Order (optional)" value={form.orderNumber} onChange={(e) => handleOrderSelect(e.target.value)} options={orders.map((o) => ({ value: o.orderNumber || o.id, label: `${o.orderNumber || o.id} — ${o.institutionName}` }))} placeholder="Select order (auto-fills)" />
          <Select label="Institution" required value={form.institutionName} onChange={(e) => setForm({ ...form, institutionName: e.target.value })} options={institutions.map((i) => ({ value: i.name, label: i.name }))} placeholder="Select institution" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Amount (₹)" required type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            <Input label="Due Date" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          </div>
          <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={STATUSES} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? 'Save Changes' : 'Create Invoice'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
