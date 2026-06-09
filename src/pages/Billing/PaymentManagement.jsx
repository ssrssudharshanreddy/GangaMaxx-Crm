import { useState, useMemo, useCallback } from 'react';
import { useCollection } from '../../hooks/useDb';
import { useAuth } from '../../context/AuthContext';
import { db, logAuditAction } from '../../services';
import { PageHeader, Card, Button, Input, Select, Modal, EmptyState, SectionCard } from '../../components/ui/ui-components';
import { Banknote, Plus, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const METHODS = [
  { value: 'bank_transfer', label: 'Bank Transfer (NEFT/RTGS)' },
  { value: 'upi', label: 'UPI' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'cash', label: 'Cash' },
  { value: 'credit_note', label: 'Credit Note' },
];

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

const getDaysOverdue = (invoice) => {
  if (!invoice?.createdAt) return 0;
  const created = new Date(invoice.createdAt);
  const today = new Date();
  return Math.floor((today - created) / (1000 * 60 * 60 * 24));
};

const getAgingBadge = (days) => {
  if (days <= 30) return { label: `${days}d`, className: 'bg-emerald-50 text-emerald-700' };
  if (days <= 60) return { label: `${days}d`, className: 'bg-amber-50 text-amber-700' };
  if (days <= 90) return { label: `${days}d`, className: 'bg-orange-50 text-orange-700' };
  return { label: `${days}d OVERDUE`, className: 'bg-rose-50 text-rose-700 font-semibold' };
};

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

  const handleSave = useCallback(() => {
    if (!form.institutionName || !form.amount) return;
    const paymentNumber = `PAY-${Date.now().toString().slice(-6)}`;
    const selectedInst = institutions.find(i => i.name === form.institutionName);
    const institutionId = selectedInst ? selectedInst.id : '';
    db.addPayment({ ...form, institutionId, paymentNumber, amount: Number(form.amount), recordedBy: user?.name || user?.email || '' });

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
  }, [form, institutions, invoices, payments, user]);

  const handleQuickMarkPaid = useCallback(async (invoice) => {
    const paymentRef = `PAY-${Date.now().toString().slice(-8)}`;
    const selectedInst = institutions.find(i => i.name === invoice.institutionName || i.id === invoice.institutionId);
    const institutionId = selectedInst ? selectedInst.id : '';
    await db.addPayment({
      institutionId,
      institutionName: invoice.institutionName,
      invoiceNumber: invoice.invoiceNumber || invoice.id,
      amount: invoice.total || invoice.amount || 0,
      paymentRef,
      method: 'manual',
      status: 'completed',
      recordedBy: user?.email || '',
    });
    await db.updateInvoice(invoice.id, { status: 'paid', paidAt: new Date().toISOString().slice(0,10) });
    logAuditAction(user.id, user.email, user.role, 'INVOICE_MARKED_PAID', 'invoice', invoice.id,
      { invoiceNumber: invoice.invoiceNumber, amount: invoice.total || invoice.amount, paymentRef });
    toast.success(`Invoice ${invoice.invoiceNumber || invoice.id} marked as paid.`);
  }, [institutions, user]);

  const filtered = payments.filter((p) =>
    p.paymentNumber?.toLowerCase().includes(search.toLowerCase()) ||
    p.institutionName?.toLowerCase().includes(search.toLowerCase()) ||
    p.invoiceNumber?.toLowerCase().includes(search.toLowerCase())
  );

  const totalCollected = payments.reduce((s, p) => s + Number(p.amount || 0), 0);

  const overdueTotal = useMemo(() =>
    invoices.filter(i => i.status === 'overdue' || (i.status === 'unpaid' && getDaysOverdue(i) > 30))
      .reduce((s, i) => s + Number(i.total || i.amount || 0), 0)
  , [invoices]);

  const unpaidInvoicesList = useMemo(() =>
    invoices.filter((i) => ['unpaid', 'overdue'].includes(i.status))
  , [invoices]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Payment Management" subtitle="Record and track payments received from institutions." actions={<Button icon={Plus} onClick={openAdd}>Record Payment</Button>} />

      {overdueTotal > 0 && (
        <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm font-medium">
            {currency.format(overdueTotal)} in overdue payments requiring attention
          </span>
        </div>
      )}

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
          <div className="text-2xl font-bold text-amber-600">{unpaidInvoicesList.length}</div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Recorded Payments" subtitle="History of bank transfers, cheques, and cash transactions">
          <Input placeholder="Search by payment #, invoice #, or institution…" value={search} onChange={(e) => setSearch(e.target.value)} className="mb-4" />
          
          {filtered.length === 0 ? (
            <EmptyState icon={Banknote} title="No payments recorded" description="Record your first payment to start tracking collections." actionButton={<Button icon={Plus} onClick={openAdd}>Record Payment</Button>} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-secondary)] uppercase tracking-wider">
                    <th className="px-5 py-3">Payment #</th>
                    <th className="px-5 py-3">Invoice #</th>
                    <th className="px-5 py-3">Institution</th>
                    <th className="px-5 py-3 text-right">Amount</th>
                    <th className="px-5 py-3 text-right">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-secondary)] transition-colors">
                      <td className="px-5 py-3 font-mono text-xs font-medium text-[var(--text-primary)]">{p.paymentNumber || p.id}</td>
                      <td className="px-5 py-3 font-mono text-xs text-[var(--text-secondary)]">{p.invoiceNumber || '—'}</td>
                      <td className="px-5 py-3 text-[var(--text-primary)]">{p.institutionName}</td>
                      <td className="px-5 py-3 text-right font-semibold text-emerald-600">{currency.format(p.amount || 0)}</td>
                      <td className="px-5 py-3 text-right text-[var(--text-secondary)]">{p.paymentDate || p.createdAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Unpaid Invoices" subtitle="Pending collections requiring follow-up">
          {unpaidInvoicesList.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">No unpaid invoices.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-secondary)] uppercase tracking-wider">
                    <th className="px-5 py-3">Invoice #</th>
                    <th className="px-5 py-3">Institution</th>
                    <th className="px-5 py-3 text-right">Amount</th>
                    <th className="px-5 py-3">Age</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {unpaidInvoicesList.map((invoice) => {
                    const days = getDaysOverdue(invoice);
                    const aging = getAgingBadge(days);
                    return (
                      <tr key={invoice.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-secondary)] transition-colors">
                        <td className="px-5 py-3 font-mono text-xs font-medium text-[var(--text-primary)]">{invoice.invoiceNumber || invoice.id}</td>
                        <td className="px-5 py-3 text-[var(--text-primary)]">{invoice.institutionName}</td>
                        <td className="px-5 py-3 text-right font-semibold text-[var(--text-primary)]">{currency.format(invoice.total || invoice.amount || 0)}</td>
                        <td className="px-5 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${aging.className}`}>{aging.label}</span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          {(invoice.status === 'unpaid' || invoice.status === 'overdue') && (
                            <Button size="sm" variant="secondary" onClick={() => handleQuickMarkPaid(invoice)}>
                              Mark Paid
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>

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
