import { useState } from 'react';
import { useCollection } from '../../hooks/useDb';
import { useAuth } from '../../context/AuthContext';
import { db, logAuditAction } from '../../services';
import { PageHeader, Card, Button, Input, Select, Badge, Modal, EmptyState, Textarea } from '../../components/ui/ui-components';
import { Undo2, Plus, Pencil } from 'lucide-react';

const RETURN_STATUSES = [
  { value: 'Requested', label: 'Requested' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Rejected', label: 'Rejected' },
  { value: 'Collected', label: 'Collected' },
  { value: 'Verified', label: 'Verified' },
  { value: 'Closed', label: 'Closed' },
];

const REASONS = [
  { value: 'defective', label: 'Defective Product' },
  { value: 'wrong_item', label: 'Wrong Item Delivered' },
  { value: 'damaged', label: 'Damaged in Transit' },
  { value: 'quality_issue', label: 'Quality Issue' },
  { value: 'excess', label: 'Excess Quantity' },
  { value: 'other', label: 'Other' },
];

const emptyForm = { orderNumber: '', institutionName: '', productName: '', quantity: 1, reason: 'defective', status: 'Requested', notes: '', productCondition: '' };

export default function Returns() {
  const { user } = useAuth();
  const returns = useCollection('returns');
  const orders = useCollection('orders');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [actionRemark, setActionRemark] = useState('');
  const [remarkError, setRemarkError] = useState('');

  const openAdd = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (ret) => {
    setEditing(ret);
    setForm({ orderNumber: ret.orderNumber || '', institutionName: ret.institutionName || '', productName: ret.productName || '', quantity: ret.quantity || 1, reason: ret.reason || 'defective', status: ret.status || 'Requested', notes: ret.notes || '', productCondition: ret.productCondition || '' });
    setModalOpen(true);
  };

  const handleSave = (newStatus = null) => {
    if (!form.orderNumber || !form.productName) return;
    setRemarkError('');

    if (newStatus === 'Approved' || newStatus === 'Rejected' || newStatus === 'Verified' || newStatus === 'Closed') {
      if (!actionRemark.trim()) {
        setRemarkError(`Mandatory remark required for this action.`);
        return;
      }
    }
    
    const returnNumber = `RET-${Date.now().toString().slice(-6)}`;
    const finalStatus = newStatus || form.status;

    if (editing) {
      db.updateReturn(editing.id, { ...form, status: finalStatus });
      logAuditAction(
        user.id,
        user.email,
        user.role,
        'update_return',
        'return',
        editing.id,
        `Updated return request ${editing.returnNumber || editing.id} status to ${finalStatus}. Remark: ${actionRemark}`
      );
    } else {
      const returnHistory = [{
        state: form.status || 'Requested',
        timestamp: new Date().toISOString(),
        actorId: user?.id || 'unknown',
        actorEmail: user?.email || 'unknown',
        actorRole: user?.role || 'Salesman',
        remark: 'Return request created via CRM'
      }];

      db.addReturn({ 
        ...form, 
        returnNumber, 
        createdBy: user?.name || user?.email || '',
        history: returnHistory,
        remarks: 'Initial return request'
      });
      logAuditAction(
        user.id,
        user.email,
        user.role,
        'create_return',
        'return',
        returnNumber,
        `Created return request ${returnNumber} for order ${form.orderNumber} (Qty: ${form.quantity}x ${form.productName})`
      );
    }
    setModalOpen(false);
  };

  const filtered = returns.filter((r) =>
    r.returnNumber?.toLowerCase().includes(search.toLowerCase()) ||
    r.orderNumber?.toLowerCase().includes(search.toLowerCase()) ||
    r.institutionName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Returns Management" subtitle="Process product returns, refunds, and quality complaints." actions={<Button icon={Plus} onClick={openAdd}>Log Return</Button>} />

      <Input placeholder="Search by return #, order #, or institution…" value={search} onChange={(e) => setSearch(e.target.value)} />

      {filtered.length === 0 ? (
        <EmptyState icon={Undo2} title="No returns recorded" description="Log a product return when a customer initiates one." actionButton={<Button icon={Plus} onClick={openAdd}>Log Return</Button>} />
      ) : (
        <Card noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-secondary)] uppercase tracking-wider">
                  <th className="px-5 py-3">Return #</th>
                  <th className="px-5 py-3">Order #</th>
                  <th className="px-5 py-3">Institution</th>
                  <th className="px-5 py-3">Product</th>
                  <th className="px-5 py-3 text-right">Qty</th>
                  <th className="px-5 py-3">Reason</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-secondary)] transition-colors">
                    <td className="px-5 py-3 font-mono text-xs font-medium text-[var(--text-primary)]">{r.returnNumber || r.id}</td>
                    <td className="px-5 py-3 font-mono text-xs text-[var(--text-secondary)]">{r.orderNumber}</td>
                    <td className="px-5 py-3 text-[var(--text-primary)]">{r.institutionName}</td>
                    <td className="px-5 py-3 text-[var(--text-secondary)]">{r.productName}</td>
                    <td className="px-5 py-3 text-right text-[var(--text-primary)]">{r.quantity}</td>
                    <td className="px-5 py-3"><Badge type="default" text={r.reason?.replace(/_/g, ' ')} /></td>
                    <td className="px-5 py-3"><Badge type={r.status} /></td>
                    <td className="px-5 py-3 text-[var(--text-secondary)]">{r.createdAt}</td>
                    <td className="px-5 py-3 text-right">
                      <Button variant="outline" size="xs" icon={Pencil} onClick={() => { setActionRemark(''); openEdit(r); }}>
                        {r.status === 'Requested' && user?.role === 'Salesman' ? 'Review Return Request' : 
                         (r.status === 'Approved' || r.status === 'Collected') && user?.role === 'Warehouse Executive' ? 'Verify Return' : 'Edit'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={modalOpen} title={editing ? 'Edit Return' : 'Log Return'} onClose={() => setModalOpen(false)}>
        <div className="flex flex-col gap-4">
          <Select label="Original Order" required value={form.orderNumber} onChange={(e) => {
            const order = orders.find((o) => (o.orderNumber || o.id) === e.target.value);
            setForm({ ...form, orderNumber: e.target.value, institutionName: order?.institutionName || form.institutionName });
          }} options={orders.map((o) => ({ value: o.orderNumber || o.id, label: `${o.orderNumber || o.id} — ${o.institutionName}` }))} placeholder="Select order" />
          <Input label="Product Name" required value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} placeholder="Product being returned" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Quantity" type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
            <Select label="Reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} options={REASONS} />
          </div>
          <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={RETURN_STATUSES} disabled />
          <Textarea label="Return Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Additional return notes…" />
          
          {editing && form.status === 'Requested' && user?.role === 'Salesman' && (
            <div className="flex flex-col gap-2 border-t border-[var(--border)] pt-4 mt-2">
              <label className="text-sm font-semibold text-[var(--text-primary)]">Approval Remark (Mandatory for Approve/Reject)</label>
              <Textarea 
                placeholder="Reason for decision..." 
                value={actionRemark} 
                onChange={e => setActionRemark(e.target.value)} 
              />
              {remarkError && <p className="text-xs text-rose-500 mt-1">{remarkError}</p>}
            </div>
          )}

          {editing && (form.status === 'Approved' || form.status === 'Collected') && user?.role === 'Warehouse Executive' && (
            <div className="flex flex-col gap-2 border-t border-[var(--border)] pt-4 mt-2">
              <Input label="Mark Product Condition" value={form.productCondition} onChange={(e) => setForm({ ...form, productCondition: e.target.value })} placeholder="e.g. Damaged, Intact, Used" />
              <label className="text-sm font-semibold text-[var(--text-primary)]">Verification Remark (Mandatory for Accept/Reject)</label>
              <Textarea 
                placeholder="Reason for verification decision..." 
                value={actionRemark} 
                onChange={e => setActionRemark(e.target.value)} 
              />
              {remarkError && <p className="text-xs text-rose-500 mt-1">{remarkError}</p>}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            {editing && form.status === 'Requested' && user?.role === 'Salesman' ? (
              <>
                <Button variant="danger" onClick={() => handleSave('Rejected')}>Reject Return Request</Button>
                <Button variant="secondary" onClick={() => handleSave('Requested')}>Request Additional Information</Button>
                <Button variant="primary" onClick={() => handleSave('Approved')}>Approve Return Request</Button>
              </>
            ) : editing && (form.status === 'Approved' || form.status === 'Collected') && user?.role === 'Warehouse Executive' ? (
              <>
                <Button variant="danger" onClick={() => handleSave('Rejected')}>Reject Return</Button>
                <Button variant="primary" onClick={() => handleSave('Closed')}>Verify & Close Return</Button>
              </>
            ) : (
              <Button onClick={() => handleSave()}>{editing ? 'Save Changes' : 'Log Return'}</Button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
