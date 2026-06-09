import { useState, useMemo } from 'react';
import { useCollection } from '../../hooks/useDb';
import { PageHeader, Card, Button, Input, Badge, EmptyState, SectionCard } from '../../components/ui/ui-components';
import { ShieldCheck, Search } from 'lucide-react';

export default function Compliance() {
  const audits = useCollection('audits');
  const institutions = useCollection('institutions');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  // Compliance checks: verify institutions have required fields
  const complianceChecks = useMemo(() => {
    return institutions.map((inst) => {
      const issues = [];
      if (!inst.taxId) issues.push('Missing GSTIN/Tax ID');
      if (!inst.address) issues.push('Missing address');
      if (!inst.contractTerms) issues.push('No payment terms set');
      if (!inst.creditLimit && inst.creditLimit !== 0) issues.push('Credit limit not configured');
      if (inst.status === 'suspended') issues.push('Account suspended');
      return { ...inst, issues, compliant: issues.length === 0 };
    });
  }, [institutions]);

  const compliantCount = complianceChecks.filter((c) => c.compliant).length;
  const nonCompliantCount = complianceChecks.filter((c) => !c.compliant).length;

  const filteredChecks = complianceChecks.filter((c) => {
    const matchSearch = c.name?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || (filter === 'compliant' && c.compliant) || (filter === 'non_compliant' && !c.compliant);
    return matchSearch && matchFilter;
  });

  const filteredAudits = audits.filter((a) =>
    a.action?.toLowerCase().includes(search.toLowerCase()) ||
    a.actorEmail?.toLowerCase().includes(search.toLowerCase()) ||
    a.entityType?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Compliance & Audit" subtitle="Monitor regulatory compliance and review audit trails." />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="space-y-1">
          <div className="text-xs uppercase tracking-widest text-[var(--text-tertiary)]">Total Institutions</div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">{institutions.length}</div>
        </Card>
        <Card className="space-y-1 cursor-pointer" onClick={() => setFilter('compliant')}>
          <div className="text-xs uppercase tracking-widest text-emerald-600">Compliant</div>
          <div className="text-2xl font-bold text-emerald-600">{compliantCount}</div>
        </Card>
        <Card className="space-y-1 cursor-pointer" onClick={() => setFilter('non_compliant')}>
          <div className="text-xs uppercase tracking-widest text-rose-600">Non-Compliant</div>
          <div className="text-2xl font-bold text-rose-600">{nonCompliantCount}</div>
        </Card>
      </div>

      <Input placeholder="Search institutions or audit actions…" value={search} onChange={(e) => setSearch(e.target.value)} icon={Search} />

      {/* Compliance Checks Section */}
      <SectionCard title="Institution Compliance" subtitle={`${compliantCount} of ${institutions.length} institutions are fully compliant`} action={
        <div className="flex gap-1">
          {['all', 'compliant', 'non_compliant'].map((f) => (
            <Button key={f} variant={filter === f ? 'primary' : 'outline'} size="xs" onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : f === 'compliant' ? 'Compliant' : 'Issues'}
            </Button>
          ))}
        </div>
      }>
        {filteredChecks.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">No matching institutions.</p>
        ) : (
          <div className="space-y-3">
            {filteredChecks.map((inst) => (
              <div key={inst.id} className="flex items-start justify-between border-b border-[var(--border)] pb-3 last:border-0 last:pb-0">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[var(--text-primary)]">{inst.name}</span>
                    <Badge type={inst.compliant ? 'active' : 'cancelled'} text={inst.compliant ? 'COMPLIANT' : 'ISSUES'} />
                  </div>
                  {inst.issues.length > 0 && (
                    <ul className="flex flex-wrap gap-1.5 mt-1">
                      {inst.issues.map((issue, idx) => (
                        <li key={idx} className="text-[10px] bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full">{issue}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <span className="text-xs text-[var(--text-tertiary)] capitalize">{inst.type?.replace(/_/g, ' ')}</span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Audit Log Section */}
      <SectionCard title="Audit Log" subtitle="Recent system-wide audit trail" noPadding>
        {filteredAudits.length === 0 ? (
          <div className="p-5">
            <EmptyState icon={ShieldCheck} title="No audit entries" description="Audit logs will appear here as actions are taken in the system." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-secondary)] uppercase tracking-wider">
                  <th className="px-5 py-3">Timestamp</th>
                  <th className="px-5 py-3">Actor</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Action</th>
                  <th className="px-5 py-3">Entity</th>
                  <th className="px-5 py-3">Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredAudits.slice(0, 50).map((a) => (
                  <tr key={a.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-secondary)] transition-colors">
                    <td className="px-5 py-3 text-xs text-[var(--text-secondary)] font-mono">{a.timestamp || a.createdAt}</td>
                    <td className="px-5 py-3 text-[var(--text-primary)]">{a.actorEmail}</td>
                    <td className="px-5 py-3"><Badge type="default" text={a.actorRole?.replace(/_/g, ' ')} /></td>
                    <td className="px-5 py-3 text-[var(--text-primary)] font-medium">{a.action?.replace(/_/g, ' ')}</td>
                    <td className="px-5 py-3 text-[var(--text-secondary)]">{a.entityType} #{a.entityId}</td>
                    <td className="px-5 py-3 text-[var(--text-secondary)] max-w-[200px] truncate">
                      {typeof a.details === 'object' && a.details !== null
                        ? Object.entries(a.details).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(', ')
                        : String(a.details || '')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
