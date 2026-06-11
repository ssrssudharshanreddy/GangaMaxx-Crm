import { useState } from 'react';
import { useCollection } from '../../hooks/useDb';
import { db } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { PageHeader, Card, Input, Button, Modal, EmptyState } from '../../components/ui/ui-components';
import { Tags, Plus, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CategoryManagement() {
  const { user } = useAuth();
  const categories = useCollection('categories');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [remark, setRemark] = useState('');
  
  const [form, setForm] = useState({ name: '', description: '', status: 'active' });

  const filtered = categories.filter(c => 
    c.name?.toLowerCase().includes(search.toLowerCase()) || 
    c.description?.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', description: '', status: 'active' });
    setRemark('');
    setModalOpen(true);
  };

  const openEdit = (cat) => {
    setEditing(cat);
    setForm({ name: cat.name || '', description: cat.description || '', status: cat.status || 'active' });
    setRemark('');
    setModalOpen(true);
  };

  const handleSave = async (isArchive = false) => {
    if (!form.name) return;
    try {
      if (editing) {
        if (!remark || remark.trim().length < 5) {
          toast.error('A remark of at least 5 characters is required for modifications.');
          return;
        }
        
        const updatedStatus = isArchive ? 'archived' : form.status;
        await db.secureUpdateDoc('categories', editing.id, { ...form, status: updatedStatus }, user, `Category modified: ${remark}`);
        toast.success(`Category ${isArchive ? 'archived' : 'updated'}`);
      } else {
        await db.addCategory(form);
        toast.success('Category added');
      }
      setModalOpen(false);
    } catch (err) {
      toast.error('Failed to save category');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader 
        title="Category Management" 
        subtitle="Manage product categories and classifications" 
        actions={user?.role === 'Warehouse Executive' && <Button icon={Plus} onClick={openAdd}>Add Category</Button>} 
      />

      <Input 
        placeholder="Search categories..." 
        value={search} 
        onChange={(e) => setSearch(e.target.value)} 
      />

      {filtered.length === 0 ? (
        <EmptyState icon={Tags} title="No categories found" description="Create your first category to organize products." actionButton={user?.role !== 'Super Admin' && <Button icon={Plus} onClick={openAdd}>Add Category</Button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(cat => (
            <Card key={cat.id}>
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-lg text-[var(--text-primary)]">{cat.name}</h3>
                <div className="flex gap-2">
                  {user?.role === 'Warehouse Executive' && (
                    <>
                      <button onClick={() => openEdit(cat)} className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--brand)] hover:bg-[var(--brand-light)] rounded-lg transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              <p className="text-sm text-[var(--text-secondary)] mb-2">{cat.description || 'No description provided.'}</p>
              <div className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider font-semibold">
                Status: <span className={cat.status === 'archived' ? 'text-rose-500' : 'text-emerald-500'}>{cat.status || 'active'}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} title={editing ? 'Edit Category' : 'New Category'} onClose={() => setModalOpen(false)}>
        <div className="flex flex-col gap-4">
          <Input label="Category Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Electronics" />
          <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description..." />
          <div className="flex gap-4 items-center">
            <span className="text-sm font-semibold text-[var(--text-primary)]">Status:</span>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="border border-[var(--border)] rounded px-2 py-1 text-sm bg-[var(--bg-base)]">
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {editing && (
            <div className="border-t border-[var(--border)] pt-4 mt-2">
              <Input 
                label="Modification Remark (Required)" 
                required 
                value={remark} 
                onChange={(e) => setRemark(e.target.value)} 
                placeholder="Reason for change or archival (min 5 chars)" 
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            {editing && form.status !== 'archived' && (
              <Button variant="danger" onClick={() => handleSave(true)}>Archive Category</Button>
            )}
            <Button onClick={() => handleSave(false)}>{editing ? 'Save Changes' : 'Add Category'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
