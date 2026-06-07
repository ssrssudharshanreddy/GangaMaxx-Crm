import { useState } from 'react';
import { useCollection } from '../../hooks/useDb';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services';
import { PageHeader, Card, Button, Input, Select, Badge, Modal, EmptyState, Textarea } from '../../components/ui/ui-components';
import { MapPin, Plus } from 'lucide-react';

const PURPOSES = [
  { value: 'prospecting', label: 'Prospecting' },
  { value: 'relationship', label: 'Relationship Building' },
  { value: 'demo', label: 'Product Demo' },
  { value: 'complaint', label: 'Complaint Resolution' },
  { value: 'collection', label: 'Payment Collection' },
  { value: 'delivery', label: 'Delivery Verification' },
];

const emptyForm = { institutionName: '', visitedBy: '', purpose: 'prospecting', visitDate: '', duration: '30', outcome: '', notes: '' };

export default function VisitLogs() {
  const { user } = useAuth();
  const visitLogs = useCollection('visitLogs');
  const institutions = useCollection('institutions');
  const staff = useCollection('staff');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');

  const openAdd = () => { setForm({ ...emptyForm, visitedBy: user?.name || '', visitDate: new Date().toISOString().slice(0, 10) }); setModalOpen(true); };

  const handleSave = () => {
    if (!form.institutionName || !form.visitDate) return;
    db.addVisitLog({ ...form, createdBy: user?.name || user?.email || '' });
    setModalOpen(false);
  };

  const filtered = visitLogs.filter((item) =>
    item.institutionName?.toLowerCase().includes(search.toLowerCase()) ||
    item.visitedBy?.toLowerCase().includes(search.toLowerCase()) ||
    item.purpose?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Visit Logs" subtitle="Record and track all client site visits by the sales team." actions={<Button icon={Plus} onClick={openAdd}>Log Visit</Button>} />

      <Input placeholder="Search by institution, salesman, or purpose…" value={search} onChange={(e) => setSearch(e.target.value)} />

      {filtered.length === 0 ? (
        <EmptyState icon={MapPin} title="No visit logs" description="Log your first site visit to track sales activity." actionButton={<Button icon={Plus} onClick={openAdd}>Log Visit</Button>} />
      ) : (
        <Card noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-secondary)] uppercase tracking-wider">
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Institution</th>
                  <th className="px-5 py-3">Visited By</th>
                  <th className="px-5 py-3">Purpose</th>
                  <th className="px-5 py-3">Duration</th>
                  <th className="px-5 py-3">Outcome</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-secondary)] transition-colors">
                    <td className="px-5 py-3 text-[var(--text-primary)] font-medium">{item.visitDate}</td>
                    <td className="px-5 py-3 text-[var(--text-primary)]">{item.institutionName}</td>
                    <td className="px-5 py-3 text-[var(--text-secondary)]">{item.visitedBy}</td>
                    <td className="px-5 py-3"><Badge type="default" text={item.purpose?.replace(/_/g, ' ')} /></td>
                    <td className="px-5 py-3 text-[var(--text-secondary)]">{item.duration} min</td>
                    <td className="px-5 py-3 text-[var(--text-secondary)] max-w-[200px] truncate">{item.outcome || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={modalOpen} title="Log Site Visit" onClose={() => setModalOpen(false)}>
        <div className="flex flex-col gap-4">
          <Select label="Institution" required value={form.institutionName} onChange={(e) => setForm({ ...form, institutionName: e.target.value })} options={institutions.map((i) => ({ value: i.name, label: i.name }))} placeholder="Select institution" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Visit Date" required type="date" value={form.visitDate} onChange={(e) => setForm({ ...form, visitDate: e.target.value })} />
            <Select label="Visited By" value={form.visitedBy} onChange={(e) => setForm({ ...form, visitedBy: e.target.value })} options={staff.filter((s) => ['salesman', 'sales_admin'].includes(s.role)).map((s) => ({ value: s.name, label: s.name }))} placeholder="Select salesman" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Purpose" value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} options={PURPOSES} />
            <Input label="Duration (min)" type="number" min="5" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
          </div>
          <Input label="Outcome" value={form.outcome} onChange={(e) => setForm({ ...form, outcome: e.target.value })} placeholder="e.g. Client agreed to trial order" />
          <Textarea label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Detailed visit notes…" />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save Visit Log</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
