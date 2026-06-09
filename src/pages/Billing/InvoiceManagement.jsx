import { useState, useMemo } from 'react';
import { useCollection } from '../../hooks/useDb';
import { useAuth } from '../../context/AuthContext';
import { db, logAuditAction } from '../../services';
import { PageHeader, Card, Button, Input, Select, Badge, Modal, EmptyState } from '../../components/ui/ui-components';
import { Receipt, Plus, Pencil, Eye, Download } from 'lucide-react';

const STATUSES = [
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'partially_paid', label: 'Partially Paid' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'cancelled', label: 'Cancelled' },
];

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

const getInvoiceHTML = (inv) => {
  const totalAmt = inv.total || inv.amount || 0;
  const subtotal = totalAmt / 1.18;
  const gstAmt = totalAmt - subtotal;
  const halfGst = gstAmt / 2;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Tax Invoice - ${inv.invoiceNumber || inv.id}</title>
      <style>
        body { font-family: 'Inter', system-ui, sans-serif; font-size: 13px; color: #333; margin: 40px; line-height: 1.5; }
        .invoice-header { display: flex; justify-content: space-between; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .logo-section h1 { margin: 0; font-size: 24px; font-weight: 800; color: #1e3a8a; }
        .logo-section p { margin: 5px 0 0; color: #666; font-size: 11px; }
        .meta-section { text-align: right; }
        .meta-section h2 { margin: 0; font-size: 18px; color: #111; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
        .bill-to h3, .bill-from h3 { border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 10px; font-size: 12px; text-transform: uppercase; color: #666; }
        .table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .table th, .table td { border: 1px solid #ddd; padding: 10px; text-align: left; }
        .table th { background-color: #f9fafb; font-weight: 600; text-transform: uppercase; font-size: 11px; }
        .table td.num, .table th.num { text-align: right; }
        .totals-section { display: flex; justify-content: flex-end; margin-bottom: 40px; }
        .totals-table { width: 300px; border-collapse: collapse; }
        .totals-table td { padding: 8px 10px; border-bottom: 1px solid #eee; }
        .totals-table tr.grand-total td { font-weight: bold; border-bottom: 2px solid #333; font-size: 15px; }
        .bank-details { border: 1px solid #eee; padding: 15px; border-radius: 6px; background-color: #fafafa; font-size: 11px; color: #555; }
        .footer { position: fixed; bottom: 20px; left: 40px; right: 40px; text-align: center; border-top: 1px dashed #ddd; padding-top: 10px; font-size: 10px; color: #888; display: flex; justify-content: space-between; }
        @media print {
          body { margin: 20px; }
          .bank-details { background-color: transparent; border: 1px solid #ccc; }
          .logo-section h1 { color: #000; }
        }
      </style>
    </head>
    <body>
      <div class="invoice-header">
        <div class="logo-section">
          <h1>Ganga Maxx Marketplace</h1>
          <p>B2B Cleaning & Hygiene Supplies<br>GSTIN: 27GMAXX1234F1Z5</p>
        </div>
        <div class="meta-section">
          <h2>TAX INVOICE</h2>
          <p><strong>Invoice No:</strong> ${inv.invoiceNumber || inv.id}<br>
          <strong>Date:</strong> ${inv.createdAt || new Date().toISOString().slice(0, 10)}<br>
          <strong>Due Date:</strong> ${inv.dueDate || '—'}</p>
        </div>
      </div>

      <div class="grid">
        <div class="bill-from">
          <h3>Seller Details</h3>
          <p><strong>Ganga Maxx Supplies Pvt Ltd</strong><br>
          Plot No. 45, Industrial Area Phase II,<br>
          Mumbai, Maharashtra, 400011<br>
          Email: accounts@gangamaxx.com</p>
        </div>
        <div class="bill-to">
          <h3>Billed To</h3>
          <p><strong>${inv.institutionName}</strong><br>
          B2B Credit Client Account<br>
          Order Reference: ${inv.orderNumber || 'Direct Billed'}</p>
        </div>
      </div>

      <table class="table">
        <thead>
          <tr>
            <th>Description</th>
            <th class="num" style="width: 80px;">Qty</th>
            <th class="num" style="width: 120px;">Unit Price</th>
            <th class="num" style="width: 100px;">GST Rate</th>
            <th class="num" style="width: 150px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>B2B Supplies Procurement (Ref: ${inv.orderNumber || '—'})</td>
            <td class="num">1</td>
            <td class="num">${currency.format(subtotal)}</td>
            <td class="num">18%</td>
            <td class="num">${currency.format(subtotal)}</td>
          </tr>
        </tbody>
      </table>

      <div class="totals-section">
        <table class="totals-table">
          <tr>
            <td>Sub-Total (Taxable Value)</td>
            <td class="num">${currency.format(subtotal)}</td>
          </tr>
          <tr>
            <td>Central GST (CGST 9%)</td>
            <td class="num">${currency.format(halfGst)}</td>
          </tr>
          <tr>
            <td>State GST (SGST 9%)</td>
            <td class="num">${currency.format(halfGst)}</td>
          </tr>
          <tr class="grand-total">
            <td>Grand Total (Incl. GST)</td>
            <td class="num">${currency.format(totalAmt)}</td>
          </tr>
        </table>
      </div>

      <div class="bank-details">
        <strong>Bank & Payment Details</strong><br>
        Bank Name: State Bank of India | Account No: 123456789012 | IFSC: SBIN0001234<br>
        Branch: Mumbai Main | Terms: Net-30 Days.
      </div>

      <div class="footer">
        <span>Original for Recipient</span>
        <span>Generated digitally on Ganga Maxx CRM Portal</span>
        <span>Duplicate for Supplier</span>
      </div>
    </body>
    </html>
  `;
};

export default function InvoiceManagement() {
  const { user } = useAuth();
  const invoices = useCollection('invoices');
  const orders = useCollection('orders');
  const institutions = useCollection('institutions');
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModal, setDetailModal] = useState(null);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;

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
    const selectedInst = institutions.find(i => i.name === form.institutionName);
    const institutionId = selectedInst ? selectedInst.id : '';

    if (editing) {
      db.updateInvoice(editing.id, { ...form, institutionId, total: Number(form.amount) });
      logAuditAction(
        user.id,
        user.email,
        user.role,
        'update_invoice',
        'invoice',
        editing.id,
        `Updated invoice ${editing.invoiceNumber || editing.id} for ${form.institutionName} (Amount: ₹${form.amount})`
      );
    } else {
      db.addInvoice({ ...form, institutionId, invoiceNumber, total: Number(form.amount), createdBy: user?.name || user?.email || '' });
      logAuditAction(
        user.id,
        user.email,
        user.role,
        'create_invoice',
        'invoice',
        invoiceNumber,
        `Created invoice ${invoiceNumber} for ${form.institutionName} (Amount: ₹${form.amount})`
      );
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

  const generateInvoicePDF = (inv) => {
    const win = window.open('', '_blank');
    win.document.write(getInvoiceHTML(inv));
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  };

  const filtered = invoices.filter((inv) => {
    const matchSearch = inv.invoiceNumber?.toLowerCase().includes(search.toLowerCase()) || inv.institutionName?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

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
        <Input
          placeholder="Search by invoice # or institution…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
          className="flex-1 min-w-[200px]"
        />
        <Select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
          options={STATUSES}
          placeholder="All Statuses"
          className="w-44"
        />
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
                {paginatedInvoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-secondary)] transition-colors">
                    <td className="px-5 py-3 font-mono text-xs font-medium text-[var(--text-primary)]">{inv.invoiceNumber || inv.id}</td>
                    <td className="px-5 py-3 font-mono text-xs text-[var(--text-secondary)]">{inv.orderNumber || '—'}</td>
                    <td className="px-5 py-3 text-[var(--text-primary)]">{inv.institutionName}</td>
                    <td className="px-5 py-3 text-right font-semibold text-[var(--text-primary)]">{currency.format(inv.total || inv.amount || 0)}</td>
                    <td className={`px-5 py-3 ${inv.status === 'overdue' ? 'text-rose-600 font-semibold' : 'text-[var(--text-secondary)]'}`}>{inv.dueDate || '—'}</td>
                    <td className="px-5 py-3"><Badge type={inv.status} /></td>
                    <td className="px-5 py-3 text-[var(--text-secondary)]">{inv.createdAt}</td>
                    <td className="px-5 py-3 text-right flex gap-1 justify-end">
                      <Button variant="outline" size="xs" icon={Eye} onClick={() => setDetailModal(inv)}>View</Button>
                      <Button variant="outline" size="xs" icon={Pencil} onClick={() => openEdit(inv)}>Edit</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
          <p className="text-sm text-[var(--text-secondary)]">
            Showing {((currentPage-1)*PAGE_SIZE)+1}–{Math.min(currentPage*PAGE_SIZE, filtered.length)} of {filtered.length} invoices
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p-1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm rounded-lg border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-[var(--text-secondary)]">{currentPage} / {totalPages}</span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-sm rounded-lg border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Invoice Detail Modal */}
      <Modal open={!!detailModal} title={`Invoice Detail - ${detailModal?.invoiceNumber || ''}`} onClose={() => setDetailModal(null)}>
        {detailModal && (
          <div className="flex flex-col gap-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-[var(--text-secondary)]">Institution:</span> <strong>{detailModal.institutionName}</strong></div>
              <div><span className="text-[var(--text-secondary)]">Status:</span> <Badge type={detailModal.status} /></div>
              <div><span className="text-[var(--text-secondary)]">Order Ref:</span> {detailModal.orderNumber || '—'}</div>
              <div><span className="text-[var(--text-secondary)]">Due Date:</span> {detailModal.dueDate || '—'}</div>
              <div><span className="text-[var(--text-secondary)]">Created At:</span> {detailModal.createdAt}</div>
              <div><span className="text-[var(--text-secondary)]">Total Amount:</span> <strong>{currency.format(detailModal.total || detailModal.amount || 0)}</strong></div>
            </div>
            {detailModal.notes && (
              <div className="p-3 bg-[var(--bg-secondary)] rounded-lg text-xs">
                <span className="text-[var(--text-secondary)] block font-semibold mb-1">Invoice Notes:</span>
                <p>{detailModal.notes}</p>
              </div>
            )}
            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
              <Button variant="secondary" onClick={() => setDetailModal(null)}>Close</Button>
              <Button variant="primary" icon={Download} onClick={() => generateInvoicePDF(detailModal)}>Download PDF</Button>
            </div>
          </div>
        )}
      </Modal>

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
