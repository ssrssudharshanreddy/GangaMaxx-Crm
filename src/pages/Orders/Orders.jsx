import { useState, useMemo } from 'react';
import { useCollection } from '../../hooks/useDb';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services';
import { PageHeader, Card, Button, Input, Select, Badge, Modal, EmptyState, Textarea } from '../../components/ui/ui-components';
import { ShoppingCart, Plus, Pencil, Eye } from 'lucide-react';

const ORDER_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'processing', label: 'Processing' },
  { value: 'dispatched', label: 'Dispatched' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PAYMENT_MODES = [
  { value: 'credit', label: 'Credit Account' },
  { value: 'prepaid', label: 'Prepaid' },
  { value: 'cod', label: 'Cash on Delivery' },
];

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export default function Orders() {
  const { user } = useAuth();
  const orders = useCollection('orders');
  const institutions = useCollection('institutions');
  const products = useCollection('products');
  const invoices = useCollection('invoices');
  const payments = useCollection('payments');

  const [modalOpen, setModalOpen] = useState(false);
  const [detailModal, setDetailModal] = useState(null);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [creditError, setCreditError] = useState('');

  const emptyForm = { institutionName: '', items: [{ productName: '', quantity: 1, unitPrice: 0 }], paymentMode: 'credit', status: 'pending', notes: '' };
  const [form, setForm] = useState(emptyForm);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (order) => {
    setEditing(order);
    setForm({
      institutionName: order.institutionName || '',
      items: order.items?.length ? order.items : [{ productName: '', quantity: 1, unitPrice: 0 }],
      paymentMode: order.paymentMode || 'credit',
      status: order.status || 'pending',
      notes: order.notes || '',
    });
    setModalOpen(true);
  };

  const orderTotal = useMemo(() => form.items.reduce((s, i) => s + (i.quantity * i.unitPrice), 0), [form.items]);

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
  const creditCheck = useMemo(() => {
    if (!form.institutionName || form.paymentMode !== 'credit') return { overLimit: false, available: 0, creditLimit: 0 };
    const inst = institutions.find((i) => i.name === form.institutionName);
    if (!inst) return { overLimit: false, available: 0, creditLimit: 0 };
    
    const instInvoices = invoices.filter((inv) => inv.institutionName === inst.name);
    const instPayments = payments.filter((pay) => pay.institutionName === inst.name);
    const totalBilled = instInvoices.reduce((s, inv) => s + Number(inv.total || inv.amount || 0), 0);
    const totalPaid = instPayments.reduce((s, pay) => s + Number(pay.amount || 0), 0);
    const outstanding = totalBilled - totalPaid;
    const creditLimit = Number(inst.creditLimit || 0);
    const creditUsed = outstanding > 0 ? outstanding : 0;
    const creditAvailable = Math.max(0, creditLimit - creditUsed);
    
    const overLimit = (creditUsed + orderTotal) > creditLimit;
    return { overLimit, available: creditAvailable, creditLimit };
  }, [form.institutionName, form.paymentMode, form.items, orderTotal, institutions, invoices, payments]);

  const getAllowedStatuses = () => {
    if (user?.role === 'owner' || user?.role === 'sales_admin') return ORDER_STATUSES;
    if (user?.role === 'warehouse_staff') {
      return ORDER_STATUSES.filter(s => ['processing', 'dispatched', 'delivered'].includes(s.value));
    }
    if (user?.role === 'accounts_manager') {
      return ORDER_STATUSES.filter(s => ['confirmed', 'processing'].includes(s.value));
    }
    return ORDER_STATUSES.filter(s => ['pending', 'cancelled'].includes(s.value));
  };

  const handleSave = () => {
    if (!form.institutionName || form.items.length === 0) return;
    setCreditError('');
    if (form.paymentMode === 'credit' && creditCheck.overLimit) {
      setCreditError("This order exceeds the institution's credit limit. Submission blocked.");
      return;
    }
    const total = form.items.reduce((s, i) => s + (i.quantity * i.unitPrice), 0);
    if (editing) {
      db.updateOrder(editing.id, { ...form, total });
    } else {
      db.addOrder({ ...form, total, createdBy: user?.name || user?.email || '' });
    }
    setModalOpen(false);
  };
  const filtered = orders.filter((o) => {
    const matchSearch = o.orderNumber?.toLowerCase().includes(search.toLowerCase()) || o.institutionName?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Order Management" subtitle="Create and manage B2B purchase orders." actions={<Button icon={Plus} onClick={openAdd}>New Order</Button>} />

      <div className="flex flex-wrap gap-3">
        <Input placeholder="Search by order # or institution…" value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 min-w-[200px]" />
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={ORDER_STATUSES} placeholder="All Statuses" className="w-44" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={ShoppingCart} title="No orders found" description="Create your first order to begin processing." actionButton={<Button icon={Plus} onClick={openAdd}>New Order</Button>} />
      ) : (
        <Card noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-secondary)] uppercase tracking-wider">
                  <th className="px-5 py-3">Order #</th>
                  <th className="px-5 py-3">Institution</th>
                  <th className="px-5 py-3">Items</th>
                  <th className="px-5 py-3 text-right">Total</th>
                  <th className="px-5 py-3">Payment</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-secondary)] transition-colors">
                    <td className="px-5 py-3 font-mono text-xs font-medium text-[var(--text-primary)]">{o.orderNumber || o.id}</td>
                    <td className="px-5 py-3 text-[var(--text-primary)]">{o.institutionName}</td>
                    <td className="px-5 py-3 text-[var(--text-secondary)]">{o.items?.length || 0} items</td>
                    <td className="px-5 py-3 text-right font-semibold text-[var(--text-primary)]">{currency.format(o.total || 0)}</td>
                    <td className="px-5 py-3"><Badge type="default" text={o.paymentMode?.replace(/_/g, ' ') || 'N/A'} /></td>
                    <td className="px-5 py-3"><Badge type={o.status} /></td>
                    <td className="px-5 py-3 text-[var(--text-secondary)]">{o.createdAt}</td>
                    <td className="px-5 py-3 text-right flex gap-1 justify-end">
                      <Button variant="outline" size="xs" icon={Eye} onClick={() => setDetailModal(o)}>View</Button>
                      <Button variant="outline" size="xs" icon={Pencil} onClick={() => openEdit(o)}>Edit</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Order Detail Modal */}
      <Modal open={!!detailModal} title={`Order ${detailModal?.orderNumber || ''}`} onClose={() => setDetailModal(null)}>
        {detailModal && (
          <div className="flex flex-col gap-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-[var(--text-secondary)]">Institution:</span> <strong>{detailModal.institutionName}</strong></div>
              <div><span className="text-[var(--text-secondary)]">Status:</span> <Badge type={detailModal.status} /></div>
              <div><span className="text-[var(--text-secondary)]">Payment:</span> {detailModal.paymentMode}</div>
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
            {detailModal.notes && <p className="text-[var(--text-secondary)] text-xs">{detailModal.notes}</p>}
          </div>
        )}
      </Modal>

      {/* Create/Edit Modal */}
      <Modal open={modalOpen} title={editing ? 'Edit Order' : 'New Order'} onClose={() => setModalOpen(false)}>
        <div className="flex flex-col gap-4">
          <Select label="Institution" required value={form.institutionName} onChange={(e) => setForm({ ...form, institutionName: e.target.value })} options={institutions.map((i) => ({ value: i.name, label: i.name }))} placeholder="Select institution" />
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-[var(--text-secondary)]">Line Items</label>
            {form.items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_60px_80px_auto] gap-2 items-end">
                <Select value={item.productName} onChange={(e) => handleItemChange(idx, 'productName', e.target.value)} options={products.map((p) => ({ value: p.name, label: p.name }))} placeholder="Product" />
                <Input type="number" min="1" value={item.quantity} onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)} placeholder="Qty" />
                <Input type="number" min="0" value={item.unitPrice} onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)} placeholder="Price" />
                {form.items.length > 1 && <Button variant="danger" size="xs" onClick={() => removeItem(idx)}>✕</Button>}
              </div>
            ))}
            <Button variant="secondary" size="sm" onClick={addItem}>+ Add Item</Button>
            <div className="text-right text-sm font-semibold text-[var(--text-primary)]">Subtotal: {currency.format(orderTotal)}</div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Payment Mode" value={form.paymentMode} onChange={(e) => setForm({ ...form, paymentMode: e.target.value })} options={PAYMENT_MODES} />
            <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={getAllowedStatuses()} />
          </div>
          <Textarea label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Order notes…" />
          
          {creditCheck.overLimit && (
            <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
              <span className="font-semibold">⚠️ Credit Limit Exceeded:</span>
              <span>Available credit: {currency.format(creditCheck.available)} / Limit: {currency.format(creditCheck.creditLimit)}.</span>
            </div>
          )}

          {creditError && (
            <p className="text-sm text-[var(--danger)] font-medium">{creditError}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? 'Save Changes' : 'Create Order'}</Button>
          </div>        </div>
      </Modal>
    </div>
  );
}
