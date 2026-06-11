import { useState } from 'react';
import { useCollection } from '../../hooks/useDb';
import { PageHeader, Card, Button, Input, Badge, EmptyState, Modal } from '../../components/ui/ui-components';
import { ShieldCheck, Search, Download, AlertTriangle } from 'lucide-react';

const TABS = ['All', 'Employee', 'Customer', 'Finance', 'Warehouse', 'Security', 'Override'];

export default function AuditCenter() {
  const audits = useCollection('audits');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [selectedAudit, setSelectedAudit] = useState(null);

  const getModuleAudits = (all) => {
    return all.filter(a => {
      const type = (a.entityType || a.module || '').toLowerCase();
      const action = (a.action || '').toLowerCase();
      
      if (activeTab === 'Employee') return type.includes('staff') || type.includes('employee');
      if (activeTab === 'Customer') return type.includes('institution') || type.includes('customer');
      if (activeTab === 'Finance') return ['invoice', 'invoices', 'payment', 'payments', 'credit', 'creditaccounts'].includes(type);
      if (activeTab === 'Warehouse') return ['inventory', 'delivery', 'deliveries', 'procurement', 'order', 'orders', 'returns'].includes(type);
      if (activeTab === 'Security') return ['auth', 'permission', 'permissions', 'users', 'user'].includes(type) || action.includes('login') || action.includes('logout');
      if (activeTab === 'Override') return action.includes('override') || action.includes('reset') || action.includes('force');
      
      return true; // 'All'
    });
  };

  const filteredAudits = getModuleAudits(audits).filter((a) =>
    a.action?.toLowerCase().includes(search.toLowerCase()) ||
    a.actorEmail?.toLowerCase().includes(search.toLowerCase()) ||
    (a.entityType || a.module)?.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt));

  const handleExportCSV = () => {
    const headers = ['Timestamp', 'Actor Email', 'Actor Role', 'Action', 'Module', 'Entity ID', 'Remark'];
    const rows = filteredAudits.map(a => [
      a.timestamp || a.createdAt || '',
      a.actorEmail || '',
      a.actorRole || '',
      a.action || '',
      a.entityType || a.module || '',
      a.entityId || '',
      (a.remark || '').replace(/,/g, ';')
    ]);
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `compliance_audit_${activeTab.toLowerCase()}_${new Date().getTime()}.csv`; link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader 
        title="Audit Center" 
        subtitle="Comprehensive system-wide compliance and activity logs." 
        actions={<Button icon={Download} variant="outline" onClick={handleExportCSV}>Export CSV</Button>}
      />

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3 items-start">
        <AlertTriangle className="text-amber-600 mt-0.5 shrink-0" size={20} />
        <div>
          <h4 className="text-sm font-bold text-amber-900">Compliance Retention Policy Active</h4>
          <p className="text-sm text-amber-800 mt-1">
            Logs are cryptographically sealed. Records under the Finance and Security modules are retained for <strong>7 years</strong>. Employee and Customer logs are retained for <strong>5 years</strong>. Manual deletion is strictly prohibited.
          </p>
        </div>
      </div>

      <div className="flex border-b border-[var(--border)] overflow-x-auto hide-scrollbar">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeTab === tab
                ? 'border-[var(--brand)] text-[var(--brand)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Input placeholder={`Search ${activeTab.toLowerCase()} audit actions, actors, or entities…`} value={search} onChange={(e) => setSearch(e.target.value)} icon={Search} />
        </div>
        <Card className="px-4 py-2 flex items-center justify-center gap-2 m-0 h-[42px]">
          <span className="text-xs uppercase tracking-widest text-[var(--text-tertiary)]">Filtered Events</span>
          <span className="font-bold text-[var(--text-primary)]">{filteredAudits.length}</span>
        </Card>
      </div>

      <Card noPadding>
        {filteredAudits.length === 0 ? (
          <div className="p-10">
            <EmptyState icon={ShieldCheck} title="No audit entries found" description="Adjust your search filters or wait for system activity." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-secondary)] uppercase tracking-wider bg-[var(--bg-secondary)]">
                  <th className="px-5 py-3">Timestamp</th>
                  <th className="px-5 py-3">Actor</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Module</th>
                  <th className="px-5 py-3">Action</th>
                  <th className="px-5 py-3">Entity ID</th>
                  <th className="px-5 py-3">Reason</th>
                  <th className="px-5 py-3 text-right">Payload</th>
                </tr>
              </thead>
              <tbody>
                {filteredAudits.slice(0, 100).map((a) => (
                  <tr key={a.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-secondary)] transition-colors">
                    <td className="px-5 py-3 text-xs text-[var(--text-secondary)] font-mono whitespace-nowrap">{new Date(a.timestamp || a.createdAt).toLocaleString()}</td>
                    <td className="px-5 py-3 text-[var(--text-primary)]">{a.actorEmail || a.userEmail}</td>
                    <td className="px-5 py-3"><Badge type="default" text={(a.actorRole || a.role)?.replace(/_/g, ' ')} /></td>
                    <td className="px-5 py-3 text-[var(--text-secondary)] capitalize">{a.entityType || a.module}</td>
                    <td className="px-5 py-3 text-[var(--text-primary)] font-medium">{a.action?.replace(/_/g, ' ')}</td>
                    <td className="px-5 py-3 text-[var(--text-secondary)] font-mono text-xs">{a.entityId || '—'}</td>
                    <td className="px-5 py-3 text-[var(--text-secondary)] truncate max-w-[200px]">{a.remark || a.reason || a.details || '—'}</td>
                    <td className="px-5 py-3 text-right">
                      {(a.payloadDiff || a.previousValue || a.newValue || a.remark) ? (
                        <Button variant="outline" size="xs" onClick={() => setSelectedAudit(a)}>Inspect</Button>
                      ) : (
                        <span className="text-xs text-[var(--text-tertiary)]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={!!selectedAudit} title="Audit Payload Diff Inspector" onClose={() => setSelectedAudit(null)}>
        {selectedAudit && (
          <div className="flex flex-col gap-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-semibold text-[var(--text-primary)]">Action</p>
                <p className="text-[var(--text-secondary)]">{selectedAudit.action}</p>
              </div>
              <div>
                <p className="font-semibold text-[var(--text-primary)]">Actor</p>
                <p className="text-[var(--text-secondary)]">{selectedAudit.actorEmail} ({selectedAudit.actorRole})</p>
              </div>
            </div>
            <div>
              <p className="font-semibold text-[var(--text-primary)]">Remark / Reason</p>
              <p className="text-[var(--text-secondary)] bg-[var(--bg-secondary)] p-3 rounded-lg border border-[var(--border)] italic mt-1">
                {selectedAudit.remark || selectedAudit.reason || selectedAudit.details || 'No reason was provided for this event.'}
              </p>
            </div>
            {(selectedAudit.payloadDiff || selectedAudit.previousValue || selectedAudit.newValue) && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-semibold text-[var(--text-primary)] mb-2">Old Value</p>
                  <pre className="bg-[var(--bg-secondary)] p-3 rounded-lg border border-[var(--border)] overflow-auto text-xs max-h-60">
                    {JSON.stringify(selectedAudit.payloadDiff?.before || selectedAudit.previousValue || {}, null, 2)}
                  </pre>
                </div>
                <div>
                  <p className="font-semibold text-[var(--text-primary)] mb-2">New Value</p>
                  <pre className="bg-[var(--bg-secondary)] p-3 rounded-lg border border-[var(--border)] overflow-auto text-xs max-h-60">
                    {JSON.stringify(selectedAudit.payloadDiff?.after || selectedAudit.newValue || {}, null, 2)}
                  </pre>
                </div>
              </div>
            )}
            <div className="flex justify-end pt-2">
              <Button onClick={() => setSelectedAudit(null)}>Close Inspector</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
