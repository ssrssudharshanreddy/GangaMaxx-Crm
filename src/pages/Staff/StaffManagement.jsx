import { useState } from 'react';
import { useCollection } from '../../hooks/useDb';
import { useAuth } from '../../context/AuthContext';
import { db, logAuditAction } from '../../services';
import { PageHeader, Card, Button, Input, Select, Badge, Modal, EmptyState } from '../../components/ui/ui-components';
import { Users, Plus, Pencil } from 'lucide-react';

const ROLES = [
  { value: 'owner', label: 'Owner' },
  { value: 'sales_admin', label: 'Sales Admin' },
  { value: 'salesman', label: 'Salesman' },
  { value: 'warehouse_staff', label: 'Warehouse Staff' },
  { value: 'accounts_manager', label: 'Accounts Manager' },
  { value: 'support_staff', label: 'Support Staff' },
  { value: 'compliance_admin', label: 'Compliance Admin' },
];

const STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
];

const emptyForm = { name: '', email: '', role: 'salesman', status: 'active', phoneNumber: '', password: '' };

export default function StaffManagement() {
  const { user } = useAuth();
  const staff = useCollection('staff');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');

  const openAdd = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (member) => { setEditing(member); setForm({ name: member.name, email: member.email, role: member.role, status: member.status, phoneNumber: member.phoneNumber || '', password: '' }); setModalOpen(true); };

  const handleSave = () => {
    if (!form.name || !form.email) return;
    if (editing) {
      const { email, password, ...editableForm } = form;
      db.updateStaff(editing.id, editableForm);
      logAuditAction(user.id, user.email, user.role, 'update_staff', 'staff', editing.id, `Updated ${form.name}`);
    } else {
      const created = db.addStaff(form);
      logAuditAction(user.id, user.email, user.role, 'create_staff', 'staff', created.id, `Created ${form.name}`);
    }
    setModalOpen(false);
  };

  const filtered = staff.filter((m) =>
    m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.email?.toLowerCase().includes(search.toLowerCase()) ||
    m.role?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Staff Management"
        subtitle="Manage administrative staff accounts and permissions."
        actions={<Button icon={Plus} onClick={openAdd}>Add Staff</Button>}
      />

      <Input placeholder="Search by name, email, or role…" value={search} onChange={(e) => setSearch(e.target.value)} />

      {filtered.length === 0 ? (
        <EmptyState icon={Users} title="No staff found" description="Add your first staff member to get started." actionButton={<Button icon={Plus} onClick={openAdd}>Add Staff</Button>} />
      ) : (
        <Card noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-secondary)] uppercase tracking-wider">
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Last Login</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((member) => (
                  <tr key={member.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-secondary)] transition-colors">
                    <td className="px-5 py-3 font-medium text-[var(--text-primary)]">{member.name}</td>
                    <td className="px-5 py-3 text-[var(--text-secondary)]">{member.email}</td>
                    <td className="px-5 py-3"><Badge type="default" text={member.role?.replace(/_/g, ' ')} /></td>
                    <td className="px-5 py-3"><Badge type={member.status} /></td>
                    <td className="px-5 py-3 text-[var(--text-secondary)]">{member.lastLogin || '—'}</td>
                    <td className="px-5 py-3 text-right">
                      <Button variant="outline" size="xs" icon={Pencil} onClick={() => openEdit(member)}>Edit</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={modalOpen} title={editing ? 'Edit Staff' : 'Add Staff'} onClose={() => setModalOpen(false)}>
        <div className="flex flex-col gap-4">
          <Input label="Full Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Ravi Kumar" />
          <Input label="Email" required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@gangamaxx.com" disabled={!!editing} />
          {!editing && (
            <Input label="Temporary Password" required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Enter temporary password" />
          )}
          <Input label="Phone Number" value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} placeholder="+91 98765 43210" />
          <Select label="Role" required value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} options={ROLES} />
          <Select label="Status" required value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={STATUSES} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? 'Save Changes' : 'Create Staff'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
