import { useState, useMemo } from 'react';
import { useCollection } from '../../hooks/useDb';
import { PageHeader, Card, Button, Input, Badge, EmptyState, SectionCard } from '../../components/ui/ui-components';
import { Warehouse, AlertTriangle, Package } from 'lucide-react';

export default function InventoryManagement() {
  const products = useCollection('products');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all | low | out

  const enriched = useMemo(() => products.map((p) => ({
    ...p,
    stockStatus: (p.stockLevel || 0) === 0 ? 'out' : (p.stockLevel || 0) <= (p.reorderPoint || 10) ? 'low' : 'ok',
  })), [products]);

  const filtered = enriched.filter((p) => {
    const matchSearch = p.name?.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || p.stockStatus === filter || (filter === 'low' && p.stockStatus === 'out');
    return matchSearch && matchFilter;
  });

  const totalProducts = products.length;
  const lowStockCount = enriched.filter((p) => p.stockStatus === 'low').length;
  const outOfStockCount = enriched.filter((p) => p.stockStatus === 'out').length;
  const totalStockValue = products.reduce((s, p) => s + ((p.stockLevel || 0) * (p.basePrice || 0)), 0);

  const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Inventory Management" subtitle="Monitor stock levels, track inventory value, and manage reorder points." />

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="space-y-1">
          <div className="text-xs uppercase tracking-widest text-[var(--text-tertiary)]">Total SKUs</div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">{totalProducts}</div>
        </Card>
        <Card className="space-y-1">
          <div className="text-xs uppercase tracking-widest text-[var(--text-tertiary)]">Stock Value</div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">{currency.format(totalStockValue)}</div>
        </Card>
        <Card className="space-y-1 cursor-pointer" onClick={() => setFilter(filter === 'low' ? 'all' : 'low')}>
          <div className="text-xs uppercase tracking-widest text-amber-600">Low Stock</div>
          <div className="text-2xl font-bold text-amber-600">{lowStockCount}</div>
        </Card>
        <Card className="space-y-1 cursor-pointer" onClick={() => setFilter(filter === 'out' ? 'all' : 'out')}>
          <div className="text-xs uppercase tracking-widest text-rose-600">Out of Stock</div>
          <div className="text-2xl font-bold text-rose-600">{outOfStockCount}</div>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input placeholder="Search by product name or SKU…" value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 min-w-[200px]" />
        <div className="flex gap-1">
          {['all', 'low', 'out'].map((f) => (
            <Button key={f} variant={filter === f ? 'primary' : 'outline'} size="sm" onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : f === 'low' ? 'Low Stock' : 'Out of Stock'}
            </Button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Warehouse} title="No inventory items found" description="Add products to start tracking stock." />
      ) : (
        <Card noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-secondary)] uppercase tracking-wider">
                  <th className="px-5 py-3">Product</th>
                  <th className="px-5 py-3">SKU</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3 text-right">Stock Level</th>
                  <th className="px-5 py-3 text-right">Reorder Point</th>
                  <th className="px-5 py-3 text-right">Unit Price</th>
                  <th className="px-5 py-3 text-right">Stock Value</th>
                  <th className="px-5 py-3">Alert</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-secondary)] transition-colors">
                    <td className="px-5 py-3 font-medium text-[var(--text-primary)]">{p.name}</td>
                    <td className="px-5 py-3 text-[var(--text-secondary)] font-mono text-xs">{p.sku}</td>
                    <td className="px-5 py-3 text-[var(--text-secondary)] capitalize">{p.category?.replace(/_/g, ' ')}</td>
                    <td className={`px-5 py-3 text-right font-bold ${p.stockStatus === 'out' ? 'text-rose-600' : p.stockStatus === 'low' ? 'text-amber-600' : 'text-[var(--text-primary)]'}`}>{p.stockLevel || 0}</td>
                    <td className="px-5 py-3 text-right text-[var(--text-secondary)]">{p.reorderPoint || 10}</td>
                    <td className="px-5 py-3 text-right text-[var(--text-secondary)]">{currency.format(p.basePrice || 0)}</td>
                    <td className="px-5 py-3 text-right text-[var(--text-primary)]">{currency.format((p.stockLevel || 0) * (p.basePrice || 0))}</td>
                    <td className="px-5 py-3">
                      {p.stockStatus === 'out' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600"><AlertTriangle className="h-3.5 w-3.5" />OUT</span>
                      ) : p.stockStatus === 'low' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600"><AlertTriangle className="h-3.5 w-3.5" />LOW</span>
                      ) : (
                        <Badge type="active" text="OK" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
