import { useState } from 'react';
import { useCollection } from '../../hooks/useDb';
import { useAuth } from '../../context/AuthContext';
import { db, logAuditAction } from '../../services';
import { PageHeader, Card, Button, Input, Select, Badge, Modal, EmptyState, Textarea } from '../../components/ui/ui-components';
import { Building2, Plus, Pencil } from 'lucide-react';

const TYPES = [
  { value: 'hotel', label: 'Hotel' },
  { value: 'hospital', label: 'Hospital' },
  { value: 'school', label: 'School' },
  { value: 'corporate_office', label: 'Corporate Office' },
  { value: 'dealer', label: 'Dealer' },
];

const STATUSES = [
  { value: 'pending_approval', label: 'Pending Approval' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
];

const TERMS = [
  { value: 'cash_on_delivery', label: 'Cash on Delivery' },
  { value: 'net_15', label: 'Net 15' },
  { value: 'net_30', label: 'Net 30' },
  { value: 'net_45', label: 'Net 45' },
];

const emptyForm = {
  name: '',
  type: 'hotel',
  taxId: '',
  address: '',
  status: 'pending_approval',
  creditLimit: 0,
  contractTerms: 'net_30',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  contactPassword: ''
};

export default function InstitutionManagement() {
  const { user } = useAuth();
  const institutions = useCollection('institutions');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const openAdd = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (inst) => {
    setEditing(inst);
    setForm({
      name: inst.name || '',
      type: inst.type || 'hotel',
      taxId: inst.taxId || '',
      address: inst.address || '',
      status: inst.status || 'active',
      creditLimit: inst.creditLimit || 0,
      contractTerms: inst.contractTerms || 'net_30',
      contactName: inst.contactPerson?.name || '',
      contactEmail: inst.contactPerson?.email || '',
      contactPhone: inst.contactPerson?.phone || '',
      contactPassword: ''
    });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.name || !form.taxId) return;

    const payload = {
      name: form.name,
      type: form.type,
      taxId: form.taxId,
      address: form.address,
      status: form.status,
      creditLimit: form.creditLimit,
      contractTerms: form.contractTerms,
      contactPerson: {
        name: form.contactName,
        email: form.contactEmail,
        phone: form.contactPhone,
      }
    };

    if (!editing && form.contactPassword) {
      payload.contactPassword = form.contactPassword;
    }

    if (editing) {
      payload.contactPerson.email = editing.contactPerson?.email || '';
      db.updateInstitution(editing.id, payload);
      logAuditAction(user.id, user.email, user.role, 'update_institution', 'institution', editing.id, `Updated ${form.name}`);
    } else {
      const created = db.addInstitution(payload);
      logAuditAction(user.id, user.email, user.role, 'create_institution', 'institution', created.id, `Created ${form.name}`);
    }
    setModalOpen(false);
  };

  const filtered = institutions.filter((inst) => {
    const matchSearch = inst.name?.toLowerCase().includes(search.toLowerCase()) || inst.taxId?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || inst.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Institution Management"
        subtitle="Manage B2B institutions, onboarding, and credit accounts."
        actions={<Button icon={Plus} onClick={openAdd}>Add Institution</Button>}
      />

      <div className="flex flex-wrap gap-3">
        <Input placeholder="Search by name or GSTIN…" value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 min-w-[200px]" />
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={STATUSES} placeholder="All Statuses" className="w-48" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Building2} title="No institutions found" description="Register your first B2B institution." actionButton={<Button icon={Plus} onClick={openAdd}>Add Institution</Button>} />
      ) : (
        <Card noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-secondary)] uppercase tracking-wider">
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">GSTIN</th>
                  <th className="px-5 py-3">Credit Limit</th>
                  <th className="px-5 py-3">Terms</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inst) => (
                  <tr key={inst.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-secondary)] transition-colors">
                    <td className="px-5 py-3 font-medium text-[var(--text-primary)]">{inst.name}</td>
                    <td className="px-5 py-3 text-[var(--text-secondary)] capitalize">{inst.type?.replace(/_/g, ' ')}</td>
                    <td className="px-5 py-3 text-[var(--text-secondary)] font-mono text-xs">{inst.taxId}</td>
                    <td className="px-5 py-3 text-[var(--text-secondary)]">₹{Number(inst.creditLimit || 0).toLocaleString('en-IN')}</td>
                    <td className="px-5 py-3"><Badge type="default" text={inst.contractTerms?.replace(/_/g, ' ') || 'N/A'} /></td>
                    <td className="px-5 py-3"><Badge type={inst.status} /></td>
                    <td className="px-5 py-3 text-right">
                      <Button variant="outline" size="xs" icon={Pencil} onClick={() => openEdit(inst)}>Edit</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={modalOpen} title={editing ? 'Edit Institution' : 'Add Institution'} onClose={() => setModalOpen(false)}>
        <div className="flex flex-col gap-4">
          <Input label="Institution Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Sunrise Facilities" />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Type" required value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} options={TYPES} />
            <Select label="Status" required value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={STATUSES} />
          </div>
          <Input label="GSTIN / Tax ID" required value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })} placeholder="27ABCDE1234F2Z5" />
          <Textarea label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Full shipping address" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Credit Limit (₹)" type="number" min="0" value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: Number(e.target.value) })} />
            <Select label="Payment Terms" value={form.contractTerms} onChange={(e) => setForm({ ...form, contractTerms: e.target.value })} options={TERMS} />
          </div>
          <div className="border-t border-[var(--border)] pt-4 mt-2">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Contact Person & Credentials</h3>
            <div className="flex flex-col gap-4">
              <Input label="Contact Name" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} placeholder="e.g. John Doe" />
              <Input label="Contact Email" required type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} placeholder="contact@institution.com" disabled={!!editing} />
              {!editing && (
                <Input label="Temporary Password" required type="password" value={form.contactPassword} onChange={(e) => setForm({ ...form, contactPassword: e.target.value })} placeholder="Enter temporary password" />
              )}
              <Input label="Contact Phone" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} placeholder="+91 99999 88888" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? 'Save Changes' : 'Create Institution'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
