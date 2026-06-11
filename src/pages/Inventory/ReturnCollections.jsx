import { useState, useMemo } from 'react';
import { useCollection } from '../../hooks/useDb';
import { useAuth } from '../../context/AuthContext';
import { db, logAuditAction } from '../../services';
import { PageHeader, Card, Button, Input, Select, Badge, Modal, EmptyState } from '../../components/ui/ui-components';
import { ClipboardList, Pencil, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';

// ─── Return Collection status workflow per locked spec ────────────────────────
const COLLECTION_STATUSES = [
  { value: 'assigned',           label: 'Assigned' },
  { value: 'collection_scheduled', label: 'Collection Scheduled' },
  { value: 'collected',          label: 'Collected' },
  { value: 'in_transit',         label: 'In Transit (To Warehouse)' },
  { value: 'delivered_warehouse', label: 'Delivered To Warehouse' },
];

// Statuses requiring mandatory remarks
const REMARK_REQUIRED = ['collection_failed', 'delivery_delayed'];

export default function ReturnCollections() {
  const { user } = useAuth();
  const returns = useCollection('returns');

  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen]     = useState(false);
  const [editing, setEditing]         = useState(null);
  const [form, setForm]               = useState({ collectionStatus: '', collectionRemark: '' });

  // ─── Warehouse Staff sees returns that are approved (ready for collection) ──
  const assignedCollections = useMemo(() =>
    returns.filter((r) =>
      ['approved', 'assigned', 'collection_scheduled', 'collected', 'in_transit', 'delivered_warehouse'].includes(r.status)
    ), [returns]);

  const filtered = useMemo(() => assignedCollections.filter((r) => {
    const matchSearch =
      (r.returnNumber || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.orderNumber || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.institutionName || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || (r.collectionStatus || r.status) === statusFilter;
    return matchSearch && matchStatus;
  }), [assignedCollections, search, statusFilter]);

  const openEdit = (ret) => {
    setEditing(ret);
    setForm({ collectionStatus: ret.collectionStatus || ret.status || 'assigned', collectionRemark: '' });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!editing) return;

    const requiresRemark = REMARK_REQUIRED.includes(form.collectionStatus);
    if (requiresRemark && (!form.collectionRemark || form.collectionRemark.trim().length < 5)) {
      toast.error('A mandatory remark (min 5 chars) is required for this collection status.');
      return;
    }

    try {
      await db.updateReturn(editing.id, {
        collectionStatus: form.collectionStatus,
        collectionRemark: form.collectionRemark,
        collectionUpdatedBy: user.email,
        collectionUpdatedAt: new Date().toISOString(),
      });

      logAuditAction(
        user.id, user.email, user.role,
        'RETURN_COLLECTION_STATUS_UPDATED',
        'return', editing.id,
        {
          returnNumber: editing.returnNumber || editing.id,
          status: form.collectionStatus,
          remark: form.collectionRemark,
          staff: user.email,
        }
      );

      toast.success('Return collection status updated.');
      setModalOpen(false);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const statusLabel = (r) => {
    const s = r.collectionStatus || r.status || 'assigned';
    return COLLECTION_STATUSES.find((o) => o.value === s)?.label || s.replace(/_/g, ' ');
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Return Collections"
        subtitle="Collect approved returns from customers and deliver them to the warehouse."
      />

      {/* ── Workflow banner ── */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 text-sm text-amber-800">
        <ClipboardList className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">Collection Workflow: </span>
          Salesman Approval → <strong>Collection Assigned</strong> → Warehouse Staff Collection → In Transit → <strong>Delivered To Warehouse</strong> → Warehouse Executive Verification
        </div>
      </div>

      {/* ── Search & Filter ── */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search by return #, order # or institution…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px]"
        />
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={COLLECTION_STATUSES}
          placeholder="All Statuses"
          className="w-56"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No return collections assigned"
          description="Approved returns awaiting collection will appear here."
        />
      ) : (
        <Card noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-secondary)] uppercase tracking-wider">
                  <th className="px-5 py-3">Return #</th>
                  <th className="px-5 py-3">Order #</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Product</th>
                  <th className="px-5 py-3 text-right">Qty</th>
                  <th className="px-5 py-3">Reason</th>
                  <th className="px-5 py-3">Collection Status</th>
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
                    <td className="px-5 py-3">
                      <Badge type="default" text={(r.reason || '').replace(/_/g, ' ')} />
                    </td>
                    <td className="px-5 py-3">
                      <Badge type={r.collectionStatus || 'assigned'} text={statusLabel(r)} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      {r.collectionStatus !== 'delivered_warehouse' ? (
                        <Button variant="outline" size="xs" icon={Pencil} onClick={() => openEdit(r)}>
                          Update Collection
                        </Button>
                      ) : (
                        <span className="text-xs text-emerald-600 font-semibold">✓ Delivered</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Update Modal ──────────────────────────────────────────────────────── */}
      <Modal
        open={modalOpen}
        title={`Update Collection — ${editing?.returnNumber || editing?.id || ''}`}
        onClose={() => setModalOpen(false)}
      >
        <div className="flex flex-col gap-4">
          {/* Read-only summary */}
          {editing && (
            <div className="bg-[var(--bg-secondary)] rounded-xl p-4 text-sm space-y-1">
              <p><span className="text-[var(--text-secondary)]">Customer:</span> <strong>{editing.institutionName}</strong></p>
              <p><span className="text-[var(--text-secondary)]">Product:</span> {editing.productName} × {editing.quantity}</p>
              <p><span className="text-[var(--text-secondary)]">Reason:</span> {(editing.reason || '').replace(/_/g, ' ')}</p>
            </div>
          )}

          <Select
            label="Collection Status"
            value={form.collectionStatus}
            onChange={(e) => setForm({ ...form, collectionStatus: e.target.value, collectionRemark: '' })}
            options={COLLECTION_STATUSES}
          />

          {/* Mandatory remark for exceptions */}
          {REMARK_REQUIRED.includes(form.collectionStatus) && (
            <div className="flex flex-col gap-2 border-2 border-amber-400 bg-amber-50 rounded-2xl p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-bold text-amber-900">Mandatory Remark Required</span>
              </div>
              <Input
                label="Reason for Exception"
                required
                value={form.collectionRemark}
                onChange={(e) => setForm({ ...form, collectionRemark: e.target.value })}
                placeholder="Explain the exception (min 5 chars)"
              />
            </div>
          )}

          {/* Optional remark for normal updates */}
          {!REMARK_REQUIRED.includes(form.collectionStatus) && (
            <Input
              label="Collection Remark (Optional)"
              value={form.collectionRemark}
              onChange={(e) => setForm({ ...form, collectionRemark: e.target.value })}
              placeholder="Any notes about this collection step…"
            />
          )}

          {/* Hard restriction reminders */}
          <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-xs text-rose-700 space-y-1">
            <p className="font-semibold">Warehouse Staff Restrictions</p>
            <p>• Cannot approve or reject returns</p>
            <p>• Cannot verify returns — that is the Warehouse Executive's authority</p>
            <p>• Cannot close returns</p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save Collection Update</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
