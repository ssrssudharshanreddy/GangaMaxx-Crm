import { useState } from 'react';
import { useCollection } from '../../hooks/useDb';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services';
import { PageHeader, Card, Button, Input, Select, Badge, Modal, EmptyState, Textarea } from '../../components/ui/ui-components';
import { CalendarCheck, Plus, Pencil, Clock } from 'lucide-react';

const PRIORITIES = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'cancelled', label: 'Cancelled' },
];

const TYPES = [
  { value: 'call', label: 'Phone Call' },
  { value: 'email', label: 'Email' },
  { value: 'visit', label: 'Site Visit' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'demo', label: 'Product Demo' },
];

const emptyForm = { institutionName: '', contactPerson: '', type: 'call', priority: 'medium', status: 'pending', scheduledDate: '', notes: '', assignedTo: '' };

export default function FollowUpManagement() {
  const { user } = useAuth();
  const followUps = useCollection('followUps');
  const institutions = useCollection('institutions');
  const staff = useCollection('staff');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const openAdd = () => { setEditing(null); setForm({ ...emptyForm, assignedTo: user?.name || '' }); setModalOpen(true); };
  const openEdit = (item) => {
    setEditing(item);
    setForm({ institutionName: item.institutionName || '', contactPerson: item.contactPerson || '', type: item.type || 'call', priority: item.priority || 'medium', status: item.status || 'pending', scheduledDate: item.scheduledDate || '', notes: item.notes || '', assignedTo: item.assignedTo || '' });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.institutionName || !form.scheduledDate) return;
    if (editing) {
      db.updateFollowUp(editing.id, form);
    } else {
      db.addFollowUp({ ...form, createdBy: user?.name || user?.email || '' });
    }
    setModalOpen(false);
  };

  const filtered = followUps.filter((item) => {
    const matchSearch = item.institutionName?.toLowerCase().includes(search.toLowerCase()) || item.contactPerson?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || item.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const priorityColor = { high: 'text-rose-600', medium: 'text-amber-600', low: 'text-emerald-600' };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Follow-Up Management" subtitle="Track and manage customer follow-up activities." actions={<Button icon={Plus} onClick={openAdd}>New Follow-Up</Button>} />

      <div className="flex flex-wrap gap-3">
        <Input placeholder="Search by institution or contact…" value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 min-w-[200px]" />
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={STATUSES} placeholder="All Statuses" className="w-44" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={CalendarCheck} title="No follow-ups found" description="Schedule your first follow-up to stay on top of client relationships." actionButton={<Button icon={Plus} onClick={openAdd}>New Follow-Up</Button>} />
      ) : (
        <Card noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-secondary)] uppercase tracking-wider">
                  <th className="px-5 py-3">Institution</th>
                  <th className="px-5 py-3">Contact</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Priority</th>
                  <th className="px-5 py-3">Scheduled</th>
                  <th className="px-5 py-3">Assigned To</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-secondary)] transition-colors">
                    <td className="px-5 py-3 font-medium text-[var(--text-primary)]">{item.institutionName}</td>
                    <td className="px-5 py-3 text-[var(--text-secondary)]">{item.contactPerson || '—'}</td>
                    <td className="px-5 py-3"><Badge type="default" text={item.type?.replace(/_/g, ' ')} /></td>
                    <td className={`px-5 py-3 font-semibold capitalize ${priorityColor[item.priority] || ''}`}>{item.priority}</td>
                    <td className="px-5 py-3 text-[var(--text-secondary)] flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{item.scheduledDate}</td>
                    <td className="px-5 py-3 text-[var(--text-secondary)]">{item.assignedTo || '—'}</td>
                    <td className="px-5 py-3"><Badge type={item.status} /></td>
                    <td className="px-5 py-3 text-right"><Button variant="outline" size="xs" icon={Pencil} onClick={() => openEdit(item)}>Edit</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={modalOpen} title={editing ? 'Edit Follow-Up' : 'New Follow-Up'} onClose={() => setModalOpen(false)}>
        <div className="flex flex-col gap-4">
          <Select label="Institution" required value={form.institutionName} onChange={(e) => setForm({ ...form, institutionName: e.target.value })} options={institutions.map((i) => ({ value: i.name, label: i.name }))} placeholder="Select institution" />
          <Input label="Contact Person" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} placeholder="e.g. Mr. Verma" />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} options={TYPES} />
            <Select label="Priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} options={PRIORITIES} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Scheduled Date" required type="date" value={form.scheduledDate} onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })} />
            <Select label="Assigned To" value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })} options={staff.filter((s) => ['salesman', 'sales_admin'].includes(s.role)).map((s) => ({ value: s.name, label: s.name }))} placeholder="Select staff" />
          </div>
          <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={STATUSES} />
          <Textarea label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Follow-up notes…" />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? 'Save Changes' : 'Create Follow-Up'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
