import { useState } from 'react';
import { useCollection } from '../../hooks/useDb';
import { useAuth } from '../../context/AuthContext';
import { db, logAuditAction } from '../../services';
import { PageHeader, Card, Button, Input, Select, Badge, Modal, EmptyState } from '../../components/ui/ui-components';
import { Users, Plus, Pencil, Key } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { ROLES as ROLE_CONSTANTS } from '../../config/permissions';

const STATUS_COLORS = {
  invited: 'bg-slate-100 text-slate-700',
  pending_activation: 'bg-blue-100 text-blue-700',
  active: 'bg-emerald-100 text-emerald-700',
  on_leave: 'bg-amber-100 text-amber-700',
  suspended: 'bg-rose-100 text-rose-700',
  resigned: 'bg-slate-200 text-slate-800',
  archived: 'bg-slate-300 text-slate-900',
};

/**
 * Canonical role options for the staff form — sourced from the central RBAC matrix.
 * No deprecated/legacy role values.
 */
const ROLE_OPTIONS = [
  { value: ROLE_CONSTANTS.SUPER_ADMIN,        label: 'Super Admin' },
  { value: ROLE_CONSTANTS.SALES_EXECUTIVE,    label: 'Sales Executive' },
  { value: ROLE_CONSTANTS.SALESMAN,           label: 'Salesman' },
  { value: ROLE_CONSTANTS.ACCOUNTS_EXECUTIVE, label: 'Accounts Executive' },
  { value: ROLE_CONSTANTS.WAREHOUSE_EXECUTIVE,label: 'Warehouse Executive' },
  { value: ROLE_CONSTANTS.WAREHOUSE_STAFF,    label: 'Warehouse Staff' },
];

const STATUS_OPTIONS = [
  { value: 'invited', label: 'Invited' },
  { value: 'pending_activation', label: 'Pending Activation' },
  { value: 'active', label: 'Active' },
  { value: 'on_leave', label: 'On Leave' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'resigned', label: 'Resigned' },
  { value: 'archived', label: 'Archived' },
];

const emptyForm = {
  name:        '',
  email:       '',
  role:        ROLE_CONSTANTS.SALESMAN,
  status:      'invited',
  phoneNumber: '',
  password:    '',
};

export default function StaffManagement() {
  const { user } = useAuth();
  const staff = useCollection('staff');
  const [modalOpen,   setModalOpen]   = useState(false);
  const [editing,     setEditing]     = useState(null);
  const [form,        setForm]        = useState(emptyForm);
  const [search,      setSearch]      = useState('');
  const [saveLoading, setSaveLoading] = useState(false);

  const openAdd  = () => { setEditing(null); setForm(emptyForm); setSaveLoading(false); setModalOpen(true); };
  const openEdit = (member) => {
    setEditing(member);
    setForm({
      name:        member.name || '',
      email:       member.email || '',
      role:        member.role || ROLE_CONSTANTS.SALESMAN,
      status:      member.status || 'active',
      phoneNumber: member.phoneNumber || '',
      password:    '',
    });
    setSaveLoading(false);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.email) {
      toast.error('Name and email are required.');
      return;
    }
    if (!editing && !form.password) {
      toast.error('Temporary password is required for new staff.');
      return;
    }
    if (!editing && form.password.length < 8) {
      toast.error('Temporary password must be at least 8 characters.');
      return;
    }

    setSaveLoading(true);
    try {
      if (editing) {
        // Route UPDATE through the backend API — no direct Firestore writes
        await db.updateStaff(editing.id, {
          name:        form.name,
          role:        form.role,
          status:      form.status,
          phoneNumber: form.phoneNumber || '',
          customPermissions: form.customPermissions,
        }, user, `Admin updated staff record for ${form.name}`);

        logAuditAction(
          user.id, user.email, user.role,
          'update_staff', 'staff', editing.id,
          `Updated staff ${form.name} — role: ${form.role}, status: ${form.status}`
        );
        toast.success('Staff member updated successfully.');
        setModalOpen(false);
      } else {
        // Route CREATE through the backend API — no direct Firebase Auth or Firestore writes
        await db.createStaff({
          name:        form.name,
          email:       form.email,
          role:        form.role,
          status:      form.status,
          phoneNumber: form.phoneNumber || '',
          password:    form.password,
          customPermissions: form.customPermissions,
        }, user);

        logAuditAction(
          user.id, user.email, user.role,
          'create_staff', 'staff', form.email,
          `Created staff account for ${form.name} (${form.role})`
        );
        toast.success('Staff member created successfully.');
        setModalOpen(false);
      }
    } catch (err) {
      console.error('[StaffManagement] handleSave error:', err);
      toast.error(err.message || 'Failed to save staff member.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleResetPassword = async (member) => {
    if (!window.confirm(`Are you sure you want to reset the password for ${member.name}?`)) return;
    try {
      await db.resetStaffPassword(member.id);
      logAuditAction(
        user.id, user.email, user.role,
        'staff_password_reset', 'staff', member.id, 
        `Password reset initiated for ${member.name}`
      );
      toast.success('Password reset link sent to ' + member.email);
    } catch (err) {
      toast.error('Failed to reset password: ' + err.message);
    }
  };

  const filtered = staff.filter((m) => {
    if (user.role === ROLE_CONSTANTS.SALES_EXECUTIVE && m.role !== ROLE_CONSTANTS.SALESMAN) return false;
    return (
      m.name?.toLowerCase().includes(search.toLowerCase()) ||
      m.email?.toLowerCase().includes(search.toLowerCase()) ||
      m.role?.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Staff Management"
        subtitle="Manage administrative staff accounts and role assignments."
        actions={user.role === ROLE_CONSTANTS.SUPER_ADMIN && <Button icon={Plus} onClick={openAdd}>Add Staff</Button>}
      />

      <Input
        placeholder="Search by name, email, or role…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No staff found"
          description="Add your first staff member to get started."
          actionButton={user.role === ROLE_CONSTANTS.SUPER_ADMIN && <Button icon={Plus} onClick={openAdd}>Add Staff</Button>}
        />
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
                  <th className="px-5 py-3">Created</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((member) => (
                  <tr key={member.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-secondary)] transition-colors">
                    <td className="px-5 py-3 font-medium text-[var(--text-primary)]">{member.name}</td>
                    <td className="px-5 py-3 text-[var(--text-secondary)]">{member.email}</td>
                    <td className="px-5 py-3">
                      <Badge type="default" text={member.role} />
                    </td>
                    <td className="px-5 py-3">
                      <Badge text={member.status?.replace('_', ' ')} color={STATUS_COLORS[member.status] || 'bg-slate-100 text-slate-700'} />
                    </td>
                    <td className="px-5 py-3 text-[var(--text-secondary)]">{member.createdAt || '—'}</td>
                    <td className="px-5 py-3 text-right">
                      {user.role === ROLE_CONSTANTS.SUPER_ADMIN && (
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="outline" size="xs" icon={Pencil} onClick={() => openEdit(member)}>
                            Edit
                          </Button>
                          <Button variant="outline" size="xs" icon={Key} onClick={() => handleResetPassword(member)}>
                            Reset Pwd
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal
        open={modalOpen}
        title={editing ? 'Edit Staff Member' : 'Add Staff Member'}
        onClose={() => !saveLoading && setModalOpen(false)}
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Full Name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Ravi Kumar"
            disabled={saveLoading}
          />
          <Input
            label="Email Address"
            required
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="staff@gangamaxx.com"
            disabled={saveLoading || !!editing}
          />
          {!editing && (
            <Input
              label="Temporary Password"
              required
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Min 8 characters"
              disabled={saveLoading}
            />
          )}
          <Input
            label="Phone Number"
            value={form.phoneNumber}
            onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
            placeholder="+91 98765 43210"
            disabled={saveLoading}
          />
          <Select
            label="Role"
            required
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            options={ROLE_OPTIONS}
            disabled={saveLoading}
          />
          <Select
            label="Status"
            required
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            options={STATUS_OPTIONS}
            disabled={saveLoading}
          />
          

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saveLoading}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saveLoading}>
              {editing ? 'Save Changes' : 'Create Staff'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
