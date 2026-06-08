import { useState, useMemo } from 'react';
import { useCollection } from '../../hooks/useDb';
import { useAuth } from '../../context/AuthContext';
import { db, logAuditAction } from '../../services';
import { PageHeader, Card, Button, Input, Select, Badge, Modal, EmptyState, Textarea } from '../../components/ui/ui-components';
import { FileText, Plus, Pencil, Eye, Copy, ShoppingCart } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'expired', label: 'Expired' },
  { value: 'converted', label: 'Converted to Order' },
];

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export default function QuotationManagement() {
  const { user } = useAuth();
  const quotations = useCollection('quotations');
  const institutions = useCollection('institutions');
  const products = useCollection('products');
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModal, setDetailModal] = useState(null);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const emptyForm = { institutionName: '', items: [{ productName: '', quantity: 1, unitPrice: 0 }], status: 'draft', validUntil: '', notes: '' };
  const [form, setForm] = useState(emptyForm);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (q) => {
    setEditing(q);
    setForm({ institutionName: q.institutionName || '', items: q.items?.length ? q.items : [{ productName: '', quantity: 1, unitPrice: 0 }], status: q.status || 'draft', validUntil: q.validUntil || '', notes: q.notes || '' });
    setModalOpen(true);
  };

  const quoteTotal = useMemo(() => form.items.reduce((s, i) => s + (i.quantity * i.unitPrice), 0), [form.items]);

  const handleItemChange = (idx, field, value) => {
    const newItems = [...form.items];
    newItems[idx] = { ...newItems[idx], [field]: field === 'quantity' || field === 'unitPrice' ? Number(value) : value };
    if (field === 'productName') {
      const p = products.find((prod) => prod.name === value);
      if (p) newItems[idx].unitPrice = p.basePrice || 0;
    }
    setForm({ ...form, items: newItems });
  };

  const addItem = () => setForm({ ...form, items: [...form.items, { productName: '', quantity: 1, unitPrice: 0 }] });
  const removeItem = (idx) => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });

  const handleSave = () => {
    if (!form.institutionName) return;
    const total = form.items.reduce((s, i) => s + (i.quantity * i.unitPrice), 0);
    const quotationNumber = `QT-${Date.now().toString().slice(-6)}`;
    if (editing) {
      db.updateQuotation(editing.id, { ...form, total });
    } else {
      db.addQuotation({ ...form, quotationNumber, total, createdBy: user?.name || user?.email || '' });
    }
    setModalOpen(false);
  };

  const convertToOrder = (q) => {
    db.addOrder({ institutionName: q.institutionName, items: q.items, total: q.total, paymentMode: 'credit', status: 'pending', notes: `Converted from quote ${q.quotationNumber}`, createdBy: user?.name || '' });
    db.updateQuotation(q.id, { status: 'accepted' });
    setDetailModal(null);
  };

  const handleConvertToOrder = async (quotation) => {
    if (!quotation?.items?.length) {
      toast.error('Quotation has no items to convert.');
      return;
    }
    const orderNumber = `PO-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const institution = institutions.find(i => i.name === quotation.institutionName);
    
    await db.addOrder({
      orderNumber,
      institutionId: institution?.id || '',
      institutionName: quotation.institutionName,
      status: 'pending',
      total: quotation.total || 0,
      items: quotation.items.map(item => ({
        productId: item.productId || '',
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        price: item.unitPrice,
      })),
      sourceQuotationId: quotation.id,
      sourceQuotationNumber: quotation.quotationNumber,
      createdBy: user?.email || '',
    });
    
    await db.updateQuotation(quotation.id, { status: 'converted' });
    
    logAuditAction(
      user.id, user.email, user.role,
      'QUOTATION_CONVERTED',
      'quotation',
      quotation.id,
      { quotationNumber: quotation.quotationNumber, orderNumber }
    );
    
    toast.success(`Order ${orderNumber} created from quotation ${quotation.quotationNumber}`);
    setDetailModal(null);
  };

  const filtered = quotations.filter((q) => {
    const matchSearch = q.quotationNumber?.toLowerCase().includes(search.toLowerCase()) || q.institutionName?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || q.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Quotation Management" subtitle="Create, send, and track sales quotations." actions={<Button icon={Plus} onClick={openAdd}>New Quotation</Button>} />

      <div className="flex flex-wrap gap-3">
        <Input placeholder="Search by quote # or institution…" value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 min-w-[200px]" />
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={STATUSES} placeholder="All Statuses" className="w-44" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={FileText} title="No quotations found" description="Create a quotation for a B2B client." actionButton={<Button icon={Plus} onClick={openAdd}>New Quotation</Button>} />
      ) : (
        <Card noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-secondary)] uppercase tracking-wider">
                  <th className="px-5 py-3">Quote #</th>
                  <th className="px-5 py-3">Institution</th>
                  <th className="px-5 py-3">Items</th>
                  <th className="px-5 py-3 text-right">Total</th>
                  <th className="px-5 py-3">Valid Until</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((q) => (
                  <tr key={q.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-secondary)] transition-colors">
                    <td className="px-5 py-3 font-mono text-xs font-medium text-[var(--text-primary)]">{q.quotationNumber || q.id}</td>
                    <td className="px-5 py-3 text-[var(--text-primary)]">{q.institutionName}</td>
                    <td className="px-5 py-3 text-[var(--text-secondary)]">{q.items?.length || 0}</td>
                    <td className="px-5 py-3 text-right font-semibold text-[var(--text-primary)]">{currency.format(q.total || 0)}</td>
                    <td className="px-5 py-3 text-[var(--text-secondary)]">{q.validUntil || '—'}</td>
                    <td className="px-5 py-3">
                      {q.status === 'converted' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Converted
                        </span>
                      ) : (
                        <Badge type={q.status} />
                      )}
                    </td>
                    <td className="px-5 py-3 text-[var(--text-secondary)]">{q.createdAt}</td>
                    <td className="px-5 py-3 text-right flex gap-1 justify-end">
                      <Button variant="outline" size="xs" icon={Eye} onClick={() => setDetailModal(q)}>View</Button>
                      <Button variant="outline" size="xs" icon={Pencil} onClick={() => openEdit(q)}>Edit</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Detail Modal */}
      <Modal open={!!detailModal} title={`Quotation ${detailModal?.quotationNumber || ''}`} onClose={() => setDetailModal(null)}>
        {detailModal && (
          <div className="flex flex-col gap-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-[var(--text-secondary)]">Institution:</span> <strong>{detailModal.institutionName}</strong></div>
              <div>
                <span className="text-[var(--text-secondary)]">Status:</span>{' '}
                {detailModal.status === 'converted' ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Converted
                  </span>
                ) : (
                  <Badge type={detailModal.status} />
                )}
              </div>
              <div><span className="text-[var(--text-secondary)]">Valid Until:</span> {detailModal.validUntil || '—'}</div>
              <div><span className="text-[var(--text-secondary)]">Date:</span> {detailModal.createdAt}</div>
            </div>
            {detailModal.items?.length > 0 && (
              <div className="border border-[var(--border)] rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead><tr className="bg-[var(--bg-secondary)]"><th className="px-3 py-2 text-left">Product</th><th className="px-3 py-2 text-right">Qty</th><th className="px-3 py-2 text-right">Price</th><th className="px-3 py-2 text-right">Subtotal</th></tr></thead>
                  <tbody>
                    {detailModal.items.map((item, idx) => (
                      <tr key={idx} className="border-t border-[var(--border)]">
                        <td className="px-3 py-2">{item.productName}</td>
                        <td className="px-3 py-2 text-right">{item.quantity}</td>
                        <td className="px-3 py-2 text-right">{currency.format(item.unitPrice)}</td>
                        <td className="px-3 py-2 text-right font-semibold">{currency.format(item.quantity * item.unitPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="text-right text-lg font-bold text-[var(--text-primary)]">Total: {currency.format(detailModal.total || 0)}</div>
            {detailModal.status === 'sent' && (
              <Button icon={Copy} onClick={() => convertToOrder(detailModal)}>Convert to Order</Button>
            )}
            {detailModal?.status === 'accepted' && (
              <Button
                icon={ShoppingCart}
                onClick={() => handleConvertToOrder(detailModal)}
                variant="primary"
              >
                Convert to Order
              </Button>
            )}
          </div>
        )}
      </Modal>

      {/* Create/Edit Modal */}
      <Modal open={modalOpen} title={editing ? 'Edit Quotation' : 'New Quotation'} onClose={() => setModalOpen(false)}>
        <div className="flex flex-col gap-4">
          <Select label="Institution" required value={form.institutionName} onChange={(e) => setForm({ ...form, institutionName: e.target.value })} options={institutions.map((i) => ({ value: i.name, label: i.name }))} placeholder="Select institution" />
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-[var(--text-secondary)]">Line Items</label>
            {form.items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_60px_80px_auto] gap-2 items-end">
                <Select value={item.productName} onChange={(e) => handleItemChange(idx, 'productName', e.target.value)} options={products.map((p) => ({ value: p.name, label: p.name }))} placeholder="Product" />
                <Input type="number" min="1" value={item.quantity} onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)} />
                <Input type="number" min="0" value={item.unitPrice} onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)} />
                {form.items.length > 1 && <Button variant="danger" size="xs" onClick={() => removeItem(idx)}>✕</Button>}
              </div>
            ))}
            <Button variant="secondary" size="sm" onClick={addItem}>+ Add Item</Button>
            <div className="text-right text-sm font-semibold text-[var(--text-primary)]">Subtotal: {currency.format(quoteTotal)}</div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Valid Until" type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} />
            <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={STATUSES} />
          </div>
          <Textarea label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes…" />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? 'Save Changes' : 'Create Quotation'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
