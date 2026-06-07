import { useState } from 'react';
import { useCollection } from '../../hooks/useDb';
import { useAuth } from '../../context/AuthContext';
import { db, logAuditAction } from '../../services';
import { PageHeader, Card, Button, Input, Select, Badge, Modal, EmptyState, Textarea } from '../../components/ui/ui-components';
import { Package, Plus, Pencil } from 'lucide-react';

const CATEGORIES = [
  { value: 'cleaning_chemicals', label: 'Cleaning Chemicals' },
  { value: 'paper_hygiene', label: 'Paper & Hygiene' },
  { value: 'trash_liners', label: 'Trash Liners' },
  { value: 'disinfectants', label: 'Disinfectants' },
  { value: 'cleaning_equipment', label: 'Cleaning Equipment' },
];

const STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'draft', label: 'Draft' },
  { value: 'discontinued', label: 'Discontinued' },
];

const emptyForm = { name: '', sku: '', category: 'cleaning_chemicals', description: '', basePrice: 0, stockLevel: 0, reorderPoint: 10, status: 'active' };

export default function ProductManagement() {
  const { user } = useAuth();
  const products = useCollection('products');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');

  const openAdd = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (p) => {
    setEditing(p);
    setForm({ name: p.name || '', sku: p.sku || '', category: p.category || 'cleaning_chemicals', description: p.description || '', basePrice: p.basePrice || 0, stockLevel: p.stockLevel || 0, reorderPoint: p.reorderPoint || 10, status: p.status || 'active' });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.name || !form.sku) return;
    if (editing) {
      db.updateProduct(editing.id, form);
      logAuditAction(user.id, user.email, user.role, 'update_product', 'product', editing.id, `Updated ${form.name}`);
    } else {
      const created = db.addProduct(form);
      logAuditAction(user.id, user.email, user.role, 'create_product', 'product', created.id, `Created ${form.name}`);
    }
    setModalOpen(false);
  };

  const filtered = products.filter((p) => {
    const matchSearch = p.name?.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase());
    const matchCat = !catFilter || p.category === catFilter;
    return matchSearch && matchCat;
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Product Catalog" subtitle="Manage inventory SKUs, pricing, and stock levels." actions={<Button icon={Plus} onClick={openAdd}>Add Product</Button>} />

      <div className="flex flex-wrap gap-3">
        <Input placeholder="Search by name or SKU…" value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 min-w-[200px]" />
        <Select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} options={CATEGORIES} placeholder="All Categories" className="w-48" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Package} title="No products found" description="Add your first product to the catalog." actionButton={<Button icon={Plus} onClick={openAdd}>Add Product</Button>} />
      ) : (
        <Card noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-secondary)] uppercase tracking-wider">
                  <th className="px-5 py-3">Product</th>
                  <th className="px-5 py-3">SKU</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3 text-right">Price</th>
                  <th className="px-5 py-3 text-right">Stock</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-secondary)] transition-colors">
                    <td className="px-5 py-3 font-medium text-[var(--text-primary)]">{p.name}</td>
                    <td className="px-5 py-3 text-[var(--text-secondary)] font-mono text-xs">{p.sku}</td>
                    <td className="px-5 py-3 text-[var(--text-secondary)] capitalize">{p.category?.replace(/_/g, ' ')}</td>
                    <td className="px-5 py-3 text-right text-[var(--text-primary)]">₹{Number(p.basePrice || 0).toLocaleString('en-IN')}</td>
                    <td className={`px-5 py-3 text-right font-semibold ${(p.stockLevel || 0) <= (p.reorderPoint || 0) ? 'text-[var(--danger)]' : 'text-[var(--text-primary)]'}`}>{p.stockLevel || 0}</td>
                    <td className="px-5 py-3"><Badge type={p.status} /></td>
                    <td className="px-5 py-3 text-right"><Button variant="outline" size="xs" icon={Pencil} onClick={() => openEdit(p)}>Edit</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={modalOpen} title={editing ? 'Edit Product' : 'Add Product'} onClose={() => setModalOpen(false)}>
        <div className="flex flex-col gap-4">
          <Input label="Product Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Eco-Clean Disinfectant 20L" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="SKU Code" required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="ECO-DIS-20L" />
            <Select label="Category" required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} options={CATEGORIES} />
          </div>
          <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Product details" />
          <div className="grid grid-cols-3 gap-4">
            <Input label="Base Price (₹)" type="number" min="0" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: Number(e.target.value) })} />
            <Input label="Stock Level" type="number" min="0" value={form.stockLevel} onChange={(e) => setForm({ ...form, stockLevel: Number(e.target.value) })} />
            <Input label="Reorder Point" type="number" min="0" value={form.reorderPoint} onChange={(e) => setForm({ ...form, reorderPoint: Number(e.target.value) })} />
          </div>
          <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={STATUSES} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? 'Save Changes' : 'Create Product'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
