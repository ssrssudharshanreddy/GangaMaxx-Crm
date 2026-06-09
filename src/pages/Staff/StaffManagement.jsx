import { useState } from 'react';
import { useCollection } from '../../hooks/useDb';
import { useAuth } from '../../context/AuthContext';
import { logAuditAction } from '../../services';
import { PageHeader, Card, Button, Input, Select, Badge, Modal, EmptyState } from '../../components/ui/ui-components';
import { Users, Plus, Pencil } from 'lucide-react';
import { firebaseConfig, firestore } from '../../config/firebase';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';

const ROLES = [
  { value: 'owner', label: 'Owner' },
  { value: 'sales_admin', label: 'Sales Admin' },
  { value: 'salesman', label: 'Salesman' },
  { value: 'warehouse_manager', label: 'Warehouse Manager' },
  { value: 'warehouse_staff', label: 'Warehouse Staff' },
  { value: 'accounts_manager', label: 'Accounts Manager' },
  { value: 'accounts_executive', label: 'Accounts Executive' },
  { value: 'support_manager', label: 'Support Manager' },
  { value: 'support_staff', label: 'Support Staff' },
  { value: 'compliance_manager', label: 'Compliance Manager' },
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
  const [saveLoading, setSaveLoading] = useState(false);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setSaveLoading(false); setModalOpen(true); };
  const openEdit = (member) => { setEditing(member); setForm({ name: member.name, email: member.email, role: member.role, status: member.status, phoneNumber: member.phoneNumber || '', password: '' }); setSaveLoading(false); setModalOpen(true); };

  const handleSave = async () => {
    if (!form.name || !form.email) {
      toast.error('Name and email are required.');
      return;
    }

    setSaveLoading(true);
    try {
      if (editing) {
        await updateDoc(doc(firestore, 'staff', editing.id), {
          name: form.name,
          role: form.role,
          status: form.status,
          phoneNumber: form.phoneNumber || '',
        });
        await updateDoc(doc(firestore, 'users', editing.id), {
          name: form.name,
          role: form.role,
          status: form.status,
          phoneNumber: form.phoneNumber || '',
        });
        logAuditAction(user.id, user.email, user.role, 'update_staff', 'staff', editing.id, `Updated ${form.name}`);
        toast.success('Staff member updated successfully.');
        setModalOpen(false);
      } else {
        if (!form.password) {
          toast.error('Temporary password is required.');
          setSaveLoading(false);
          return;
        }

        const secondaryApp = initializeApp(firebaseConfig, 'SecondaryStaff');
        const secondaryAuth = getAuth(secondaryApp);
        let uid;
        try {
          const userCredential = await createUserWithEmailAndPassword(secondaryAuth, form.email, form.password);
          uid = userCredential.user.uid;
          await signOut(secondaryAuth);
        } finally {
          await deleteApp(secondaryApp);
        }

        await setDoc(doc(firestore, 'users', uid), {
          name: form.name,
          email: form.email,
          role: form.role,
          status: form.status,
          phoneNumber: form.phoneNumber || '',
          createdAt: new Date().toISOString().slice(0, 10),
        });

        await setDoc(doc(firestore, 'staff', uid), {
          name: form.name,
          email: form.email,
          role: form.role,
          status: form.status,
          phoneNumber: form.phoneNumber || '',
          createdAt: new Date().toISOString().slice(0, 10),
        });

        logAuditAction(user.id, user.email, user.role, 'create_staff', 'staff', uid, `Created ${form.name}`);
        toast.success('Staff member created successfully.');
        setModalOpen(false);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to save staff member.');
    } finally {
      setSaveLoading(false);
    }
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

      <Modal open={modalOpen} title={editing ? 'Edit Staff' : 'Add Staff'} onClose={() => !saveLoading && setModalOpen(false)}>
        <div className="flex flex-col gap-4">
          <Input label="Full Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Ravi Kumar" disabled={saveLoading} />
          <Input label="Email" required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@gangamaxx.com" disabled={saveLoading || !!editing} />
          {!editing && (
            <Input label="Temporary Password" required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Enter temporary password" disabled={saveLoading} />
          )}
          <Input label="Phone Number" value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} placeholder="+91 98765 43210" disabled={saveLoading} />
          <Select label="Role" required value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} options={ROLES} disabled={saveLoading} />
          <Select label="Status" required value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={STATUSES} disabled={saveLoading} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saveLoading}>Cancel</Button>
            <Button onClick={handleSave} loading={saveLoading}>{editing ? 'Save Changes' : 'Create Staff'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

