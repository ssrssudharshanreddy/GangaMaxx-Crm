import { useState } from 'react';
import { useCollection } from '../../hooks/useDb';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services';
import { PageHeader, Card, Button, Input, Select, Badge, Modal, EmptyState, Textarea } from '../../components/ui/ui-components';
import { Headset, Plus, Pencil, MessageSquare } from 'lucide-react';

const PRIORITIES = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const STATUSES = [
  { value: 'open', label: 'Open' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

const CATEGORIES = [
  { value: 'delivery', label: 'Delivery Issue' },
  { value: 'quality', label: 'Product Quality' },
  { value: 'billing', label: 'Billing Dispute' },
  { value: 'returns', label: 'Returns' },
  { value: 'general', label: 'General Inquiry' },
];

const emptyForm = { subject: '', institutionName: '', category: 'general', priority: 'medium', status: 'open', description: '', assignedTo: '' };

export default function SupportTickets() {
  const { user } = useAuth();
  const tickets = useCollection('tickets');
  const institutions = useCollection('institutions');
  const staff = useCollection('staff');
  const [modalOpen, setModalOpen] = useState(false);
  const [replyModal, setReplyModal] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [replyText, setReplyText] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const openAdd = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (ticket) => {
    setEditing(ticket);
    setForm({ subject: ticket.subject || '', institutionName: ticket.institutionName || '', category: ticket.category || 'general', priority: ticket.priority || 'medium', status: ticket.status || 'open', description: ticket.description || '', assignedTo: ticket.assignedTo || '' });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.subject) return;
    const ticketNumber = `TKT-${Date.now().toString().slice(-6)}`;
    if (editing) {
      db.updateTicket(editing.id, form);
    } else {
      db.addTicket({ ...form, ticketNumber, createdBy: user?.name || user?.email || '', messages: [] });
    }
    setModalOpen(false);
  };

  const handleReply = () => {
    if (!replyText.trim() || !replyModal) return;
    const messages = [...(replyModal.messages || []), { author: user?.name || user?.email || 'Admin', text: replyText, timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16) }];
    db.updateTicket(replyModal.id, { messages });
    setReplyText('');
    setReplyModal({ ...replyModal, messages });
  };

  const filtered = tickets.filter((t) => {
    const matchSearch = t.ticketNumber?.toLowerCase().includes(search.toLowerCase()) || t.subject?.toLowerCase().includes(search.toLowerCase()) || t.institutionName?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const priorityColor = { high: 'text-rose-600', medium: 'text-amber-600', low: 'text-emerald-600' };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Support Tickets" subtitle="Handle customer complaints, queries, and service requests." actions={<Button icon={Plus} onClick={openAdd}>New Ticket</Button>} />

      <div className="flex flex-wrap gap-3">
        <Input placeholder="Search by ticket #, subject, or institution…" value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 min-w-[200px]" />
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={STATUSES} placeholder="All Statuses" className="w-44" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Headset} title="No support tickets" description="Create a ticket to track a customer issue." actionButton={<Button icon={Plus} onClick={openAdd}>New Ticket</Button>} />
      ) : (
        <Card noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-secondary)] uppercase tracking-wider">
                  <th className="px-5 py-3">Ticket #</th>
                  <th className="px-5 py-3">Subject</th>
                  <th className="px-5 py-3">Institution</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Priority</th>
                  <th className="px-5 py-3">Assigned</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-secondary)] transition-colors">
                    <td className="px-5 py-3 font-mono text-xs font-medium text-[var(--text-primary)]">{t.ticketNumber || t.id}</td>
                    <td className="px-5 py-3 text-[var(--text-primary)] max-w-[200px] truncate">{t.subject}</td>
                    <td className="px-5 py-3 text-[var(--text-secondary)]">{t.institutionName || '—'}</td>
                    <td className="px-5 py-3"><Badge type="default" text={t.category?.replace(/_/g, ' ')} /></td>
                    <td className={`px-5 py-3 font-semibold capitalize ${priorityColor[t.priority] || ''}`}>{t.priority}</td>
                    <td className="px-5 py-3 text-[var(--text-secondary)]">{t.assignedTo || '—'}</td>
                    <td className="px-5 py-3"><Badge type={t.status} /></td>
                    <td className="px-5 py-3 text-right flex gap-1 justify-end">
                      <Button variant="outline" size="xs" icon={MessageSquare} onClick={() => { setReplyModal(t); setReplyText(''); }}>Reply</Button>
                      <Button variant="outline" size="xs" icon={Pencil} onClick={() => openEdit(t)}>Edit</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Reply / Thread Modal */}
      <Modal open={!!replyModal} title={`Ticket: ${replyModal?.subject || ''}`} onClose={() => setReplyModal(null)}>
        {replyModal && (
          <div className="flex flex-col gap-4">
            <div className="text-xs text-[var(--text-secondary)]"><strong>#{replyModal.ticketNumber}</strong> · {replyModal.category} · {replyModal.priority} priority</div>
            {replyModal.description && <p className="text-sm text-[var(--text-primary)] bg-[var(--bg-secondary)] rounded-lg p-3">{replyModal.description}</p>}
            <div className="max-h-48 overflow-y-auto flex flex-col gap-2">
              {(replyModal.messages || []).map((msg, idx) => (
                <div key={idx} className="text-xs border-l-2 border-[var(--brand)] pl-3">
                  <span className="font-semibold text-[var(--text-primary)]">{msg.author}</span>
                  <span className="text-[var(--text-tertiary)] ml-2">{msg.timestamp}</span>
                  <p className="text-[var(--text-secondary)] mt-0.5">{msg.text}</p>
                </div>
              ))}
              {(replyModal.messages || []).length === 0 && <p className="text-xs text-[var(--text-tertiary)]">No replies yet.</p>}
            </div>
            <div className="flex gap-2">
              <Input value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Type your reply…" className="flex-1" />
              <Button onClick={handleReply} disabled={!replyText.trim()}>Send</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create/Edit Modal */}
      <Modal open={modalOpen} title={editing ? 'Edit Ticket' : 'New Ticket'} onClose={() => setModalOpen(false)}>
        <div className="flex flex-col gap-4">
          <Input label="Subject" required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Brief issue description" />
          <Select label="Institution" value={form.institutionName} onChange={(e) => setForm({ ...form, institutionName: e.target.value })} options={institutions.map((i) => ({ value: i.name, label: i.name }))} placeholder="Select institution" />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} options={CATEGORIES} />
            <Select label="Priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} options={PRIORITIES} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={STATUSES} />
            <Select label="Assigned To" value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })} options={staff.filter((s) => ['support_staff', 'owner'].includes(s.role)).map((s) => ({ value: s.name, label: s.name }))} placeholder="Assign staff" />
          </div>
          <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Detailed description…" />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? 'Save Changes' : 'Create Ticket'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
