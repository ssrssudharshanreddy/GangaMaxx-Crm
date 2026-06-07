import { useState } from 'react';
import { useCollection } from '../../hooks/useDb';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services';
import { PageHeader, Card, Button, Input, Select, Badge, Modal, EmptyState } from '../../components/ui/ui-components';
import { Banknote, Plus } from 'lucide-react';

const METHODS = [
  { value: 'bank_transfer', label: 'Bank Transfer (NEFT/RTGS)' },
  { value: 'upi', label: 'UPI' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'cash', label: 'Cash' },
  { value: 'credit_note', label: 'Credit Note' },
];

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export default function PaymentManagement() {
  const { user } = useAuth();
  const payments = useCollection('payments');
  const invoices = useCollection('invoices');
  const institutions = useCollection('institutions');
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');

  const emptyForm = { invoiceNumber: '', institutionName: '', amount: 0, method: 'bank_transfer', referenceNumber: '', paymentDate: new Date().toISOString().slice(0, 10) };
  const [form, setForm] = useState(emptyForm);

  const openAdd = () => { setForm(emptyForm); setModalOpen(true); };

  const handleInvoiceSelect = (invNum) => {
    const inv = invoices.find((i) => (i.invoiceNumber || i.id) === invNum);
    if (inv) {
      setForm({ ...form, invoiceNumber: invNum, institutionName: inv.institutionName || '', amount: inv.total || inv.amount || 0 });
    } else {
      setForm({ ...form, invoiceNumber: invNum });
    }
  };

  const handleSave = () => {
    if (!form.institutionName || !form.amount) return;
    const paymentNumber = `PAY-${Date.now().toString().slice(-6)}`;
    db.addPayment({ ...form, paymentNumber, amount: Number(form.amount), recordedBy: user?.name || user?.email || '' });

    // Update invoice status if linked
    if (form.invoiceNumber) {
      const inv = invoices.find((i) => (i.invoiceNumber || i.id) === form.invoiceNumber);
      if (inv) {
        const existingPayments = payments.filter((p) => p.invoiceNumber === form.invoiceNumber);
        const totalPaid = existingPayments.reduce((s, p) => s + Number(p.amount || 0), 0) + Number(form.amount);
        const invTotal = Number(inv.total || inv.amount || 0);
        if (totalPaid >= invTotal) {
          db.updateInvoice(inv.id, { status: 'paid' });
        } else {
          db.updateInvoice(inv.id, { status: 'partially_paid' });
        }
      }
    }
    setModalOpen(false);
  };

  const filtered = payments.filter((p) =>
    p.paymentNumber?.toLowerCase().includes(search.toLowerCase()) ||
    p.institutionName?.toLowerCase().includes(search.toLowerCase()) ||
    p.invoiceNumber?.toLowerCase().includes(search.toLowerCase())
  );

  const totalCollected = payments.reduce((s, p) => s + Number(p.amount || 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Payment Management" subtitle="Record and track payments received from institutions." actions={<Button icon={Plus} onClick={openAdd}>Record Payment</Button>} />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="space-y-1">
          <div className="text-xs uppercase tracking-widest text-[var(--text-tertiary)]">Total Payments</div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">{payments.length}</div>
        </Card>
        <Card className="space-y-1">
          <div className="text-xs uppercase tracking-widest text-[var(--text-tertiary)]">Total Collected</div>
          <div className="text-2xl font-bold text-emerald-600">{currency.format(totalCollected)}</div>
        </Card>
        <Card className="space-y-1">
          <div className="text-xs uppercase tracking-widest text-[var(--text-tertiary)]">Unpaid Invoices</div>
          <div className="text-2xl font-bold text-amber-600">{invoices.filter((i) => ['unpaid', 'overdue'].includes(i.status)).length}</div>
        </Card>
      </div>

      <Input placeholder="Search by payment #, invoice #, or institution…" value={search} onChange={(e) => setSearch(e.target.value)} />

      {filtered.length === 0 ? (
        <EmptyState icon={Banknote} title="No payments recorded" description="Record your first payment to start tracking collections." actionButton={<Button icon={Plus} onClick={openAdd}>Record Payment</Button>} />
      ) : (
        <Card noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-secondary)] uppercase tracking-wider">
                  <th className="px-5 py-3">Payment #</th>
                  <th className="px-5 py-3">Invoice #</th>
                  <th className="px-5 py-3">Institution</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                  <th className="px-5 py-3">Method</th>
                  <th className="px-5 py-3">Reference</th>
                  <th className="px-5 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-secondary)] transition-colors">
                    <td className="px-5 py-3 font-mono text-xs font-medium text-[var(--text-primary)]">{p.paymentNumber || p.id}</td>
                    <td className="px-5 py-3 font-mono text-xs text-[var(--text-secondary)]">{p.invoiceNumber || '—'}</td>
                    <td className="px-5 py-3 text-[var(--text-primary)]">{p.institutionName}</td>
                    <td className="px-5 py-3 text-right font-semibold text-emerald-600">{currency.format(p.amount || 0)}</td>
                    <td className="px-5 py-3"><Badge type="default" text={p.method?.replace(/_/g, ' ')} /></td>
                    <td className="px-5 py-3 text-[var(--text-secondary)] font-mono text-xs">{p.referenceNumber || '—'}</td>
                    <td className="px-5 py-3 text-[var(--text-secondary)]">{p.paymentDate || p.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={modalOpen} title="Record Payment" onClose={() => setModalOpen(false)}>
        <div className="flex flex-col gap-4">
          <Select label="Link to Invoice (optional)" value={form.invoiceNumber} onChange={(e) => handleInvoiceSelect(e.target.value)} options={invoices.filter((i) => i.status !== 'paid').map((i) => ({ value: i.invoiceNumber || i.id, label: `${i.invoiceNumber || i.id} — ${i.institutionName} — ${currency.format(i.total || i.amount || 0)}` }))} placeholder="Select invoice (auto-fills)" />
          <Select label="Institution" required value={form.institutionName} onChange={(e) => setForm({ ...form, institutionName: e.target.value })} options={institutions.map((i) => ({ value: i.name, label: i.name }))} placeholder="Select institution" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Amount (₹)" required type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            <Select label="Payment Method" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} options={METHODS} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Reference Number" value={form.referenceNumber} onChange={(e) => setForm({ ...form, referenceNumber: e.target.value })} placeholder="UTR / Cheque #" />
            <Input label="Payment Date" type="date" value={form.paymentDate} onChange={(e) => setForm({ ...form, paymentDate: e.target.value })} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Record Payment</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
