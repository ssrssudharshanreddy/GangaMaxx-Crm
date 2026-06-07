import { useState, useMemo } from 'react';
import { useCollection } from '../../hooks/useDb';
import { PageHeader, Card, Button, Input, Badge, EmptyState } from '../../components/ui/ui-components';
import { CreditCard, AlertTriangle } from 'lucide-react';

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export default function CreditAccounts() {
  const institutions = useCollection('institutions');
  const invoices = useCollection('invoices');
  const payments = useCollection('payments');
  const [search, setSearch] = useState('');

  const creditAccounts = useMemo(() => {
    return institutions.map((inst) => {
      const instInvoices = invoices.filter((inv) => inv.institutionName === inst.name);
      const instPayments = payments.filter((pay) => pay.institutionName === inst.name);
      const totalBilled = instInvoices.reduce((s, inv) => s + Number(inv.total || inv.amount || 0), 0);
      const totalPaid = instPayments.reduce((s, pay) => s + Number(pay.amount || 0), 0);
      const outstanding = totalBilled - totalPaid;
      const creditLimit = Number(inst.creditLimit || 0);
      const creditUsed = outstanding > 0 ? outstanding : 0;
      const creditAvailable = Math.max(0, creditLimit - creditUsed);
      const utilization = creditLimit > 0 ? Math.round((creditUsed / creditLimit) * 100) : 0;
      return { ...inst, totalBilled, totalPaid, outstanding, creditUsed, creditAvailable, utilization, invoiceCount: instInvoices.length };
    });
  }, [institutions, invoices, payments]);

  const filtered = creditAccounts.filter((a) => a.name?.toLowerCase().includes(search.toLowerCase()));

  const totalOutstanding = creditAccounts.reduce((s, a) => s + a.outstanding, 0);
  const totalCreditLimit = creditAccounts.reduce((s, a) => s + Number(a.creditLimit || 0), 0);
  const overLimitCount = creditAccounts.filter((a) => a.utilization > 100).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Credit Accounts" subtitle="Monitor B2B credit limits, utilization, and outstanding balances." />

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="space-y-1">
          <div className="text-xs uppercase tracking-widest text-[var(--text-tertiary)]">Accounts</div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">{creditAccounts.length}</div>
        </Card>
        <Card className="space-y-1">
          <div className="text-xs uppercase tracking-widest text-[var(--text-tertiary)]">Total Credit Limit</div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">{currency.format(totalCreditLimit)}</div>
        </Card>
        <Card className="space-y-1">
          <div className="text-xs uppercase tracking-widest text-[var(--text-tertiary)]">Outstanding</div>
          <div className="text-2xl font-bold text-amber-600">{currency.format(totalOutstanding)}</div>
        </Card>
        <Card className="space-y-1">
          <div className="text-xs uppercase tracking-widest text-[var(--text-tertiary)]">Over Limit</div>
          <div className="text-2xl font-bold text-rose-600">{overLimitCount}</div>
        </Card>
      </div>

      <Input placeholder="Search by institution name…" value={search} onChange={(e) => setSearch(e.target.value)} />

      {filtered.length === 0 ? (
        <EmptyState icon={CreditCard} title="No credit accounts" description="Add institutions with credit limits to track their accounts." />
      ) : (
        <Card noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-secondary)] uppercase tracking-wider">
                  <th className="px-5 py-3">Institution</th>
                  <th className="px-5 py-3">Terms</th>
                  <th className="px-5 py-3 text-right">Credit Limit</th>
                  <th className="px-5 py-3 text-right">Used</th>
                  <th className="px-5 py-3 text-right">Available</th>
                  <th className="px-5 py-3 text-right">Utilization</th>
                  <th className="px-5 py-3 text-right">Invoices</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-secondary)] transition-colors">
                    <td className="px-5 py-3 font-medium text-[var(--text-primary)]">{a.name}</td>
                    <td className="px-5 py-3"><Badge type="default" text={a.contractTerms?.replace(/_/g, ' ') || 'N/A'} /></td>
                    <td className="px-5 py-3 text-right text-[var(--text-primary)]">{currency.format(a.creditLimit || 0)}</td>
                    <td className="px-5 py-3 text-right text-[var(--text-primary)]">{currency.format(a.creditUsed)}</td>
                    <td className="px-5 py-3 text-right text-emerald-600 font-semibold">{currency.format(a.creditAvailable)}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <div className="w-16 h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${a.utilization > 100 ? 'bg-rose-500' : a.utilization > 75 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(a.utilization, 100)}%` }} />
                        </div>
                        <span className={`text-xs font-semibold ${a.utilization > 100 ? 'text-rose-600' : 'text-[var(--text-secondary)]'}`}>{a.utilization}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right text-[var(--text-secondary)]">{a.invoiceCount}</td>
                    <td className="px-5 py-3">
                      {a.utilization > 100 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600"><AlertTriangle className="h-3.5 w-3.5" />OVER</span>
                      ) : (
                        <Badge type={a.status} />
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
