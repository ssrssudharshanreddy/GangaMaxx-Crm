import { useState, useMemo } from 'react';
import { useCollection } from '../../hooks/useDb';
import { PageHeader, Card, Input, EmptyState, Badge, Button, Modal } from '../../components/ui/ui-components';
import { Users, FileText, ShoppingCart, DollarSign, LifeBuoy } from 'lucide-react';

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export default function Customer360() {
  const institutions = useCollection('institutions');
  const orders = useCollection('orders');
  const invoices = useCollection('invoices');
  const tickets = useCollection('tickets');

  const [search, setSearch] = useState('');
  const [selectedInst, setSelectedInst] = useState(null);

  const filteredInstitutions = useMemo(() => {
    return institutions.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || i.taxId?.includes(search));
  }, [institutions, search]);

  const customerData = useMemo(() => {
    if (!selectedInst) return null;
    const instName = selectedInst.name;
    const instOrders = orders.filter(o => o.institutionName === instName);
    const instInvoices = invoices.filter(i => i.institutionName === instName);
    const instTickets = tickets.filter(t => t.institutionName === instName);

    const totalSpent = instOrders.filter(o => o.status === 'delivered' || o.status === 'Completed').reduce((sum, o) => sum + (o.total || 0), 0);
    const outstanding = instInvoices.filter(i => i.status !== 'paid').reduce((sum, i) => sum + (i.total || i.amount || 0), 0);

    return {
      orders: instOrders,
      invoices: instInvoices,
      tickets: instTickets,
      totalSpent,
      outstanding
    };
  }, [selectedInst, orders, invoices, tickets]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Customer 360 View" subtitle="Comprehensive overview of client interactions, financials, and history." />

      {!selectedInst ? (
        <div className="flex flex-col gap-4">
          <Input 
            placeholder="Search institution by name or Tax ID to view 360 dashboard..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredInstitutions.map(inst => (
              <Card key={inst.id} className="cursor-pointer hover:border-[var(--brand-primary)] transition-all" onClick={() => setSelectedInst(inst)}>
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-lg text-[var(--text-primary)]">{inst.name}</h3>
                  <Badge type={inst.status} />
                </div>
                <div className="text-sm text-[var(--text-secondary)] space-y-1">
                  <p><strong>Type:</strong> {inst.type?.replace(/_/g, ' ')}</p>
                  <p><strong>Contact:</strong> {inst.contactPerson?.name || 'N/A'}</p>
                </div>
              </Card>
            ))}
            {filteredInstitutions.length === 0 && search && (
              <div className="col-span-full">
                <EmptyState icon={Users} title="No institutions found" description="Try a different search term." />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)]">{selectedInst.name} <Badge type={selectedInst.status} /></h2>
              <p className="text-[var(--text-secondary)]">{selectedInst.address} | Tax ID: {selectedInst.taxId}</p>
            </div>
            <Button variant="outline" onClick={() => setSelectedInst(null)}>← Back to Search</Button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="space-y-1">
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[var(--text-tertiary)]"><ShoppingCart className="w-4 h-4"/> Total Orders</div>
              <div className="text-2xl font-bold text-[var(--text-primary)]">{customerData?.orders.length}</div>
            </Card>
            <Card className="space-y-1">
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[var(--text-tertiary)]"><DollarSign className="w-4 h-4"/> Total Spent</div>
              <div className="text-2xl font-bold text-[var(--text-primary)]">{currency.format(customerData?.totalSpent || 0)}</div>
            </Card>
            <Card className="space-y-1">
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[var(--text-tertiary)]"><LifeBuoy className="w-4 h-4"/> Open Tickets</div>
              <div className="text-2xl font-bold text-amber-600">{customerData?.tickets.filter(t => t.status !== 'closed').length}</div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Recent Orders">
              {customerData?.orders.length === 0 ? <p className="text-sm text-[var(--text-secondary)]">No orders found.</p> : (
                <div className="space-y-3">
                  {customerData?.orders.slice(0, 5).map(o => (
                    <div key={o.id} className="flex justify-between items-center pb-2 border-b border-[var(--border)] last:border-0">
                      <div>
                        <div className="font-medium text-sm text-[var(--text-primary)]">{o.orderNumber || o.id}</div>
                        <div className="text-xs text-[var(--text-secondary)]">{o.createdAt || o.date}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-sm">{currency.format(o.total || 0)}</div>
                        <Badge type={o.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
            
            <Card title="Support Tickets">
              {customerData?.tickets.length === 0 ? <p className="text-sm text-[var(--text-secondary)]">No tickets found.</p> : (
                <div className="space-y-3">
                  {customerData?.tickets.slice(0, 5).map(t => (
                    <div key={t.id} className="flex justify-between items-center pb-2 border-b border-[var(--border)] last:border-0">
                      <div>
                        <div className="font-medium text-sm text-[var(--text-primary)]">{t.subject}</div>
                        <div className="text-xs text-[var(--text-secondary)]">Priority: {t.priority}</div>
                      </div>
                      <Badge type={t.status} />
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card title="Financial Standing">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--text-secondary)]">Credit Limit</span>
                  <span className="font-semibold text-[var(--text-primary)]">{currency.format(selectedInst.creditLimit || 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--text-secondary)]">Outstanding Balance</span>
                  <span className="font-semibold text-amber-600">{currency.format(customerData?.outstanding || 0)}</span>
                </div>
                <div className="w-full h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden mt-2">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(((customerData?.outstanding || 0) / (selectedInst.creditLimit || 1)) * 100, 100)}%` }} />
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
