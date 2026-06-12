import { useState, useMemo } from 'react';
import { useCollection } from '../../hooks/useDb';
import { auth } from '../../config/firebase';
import { Button, Input, Select, Badge, Modal, Textarea } from '../../components/ui/ui-components';
import { FileText, CheckCircle, CheckCircle2, AlertTriangle, Clock, XCircle, Search, Info, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const API_URL = import.meta.env.VITE_API_URL || 'https://gangamaxx-backend-production.up.railway.app';

const statusColor = {
  'Submitted': 'bg-violet-50 text-violet-700',
  'Under Review': 'bg-amber-50 text-amber-700',
  'Additional Information Required': 'bg-amber-50 text-amber-700',
  'On Hold': 'bg-rose-50 text-rose-700',
  'Approved By Sales': 'bg-blue-50 text-blue-700',
  'Rejected': 'bg-red-50 text-red-700',
  'Activated': 'bg-emerald-50 text-emerald-700',
};

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
});

export default function CustomerApplications() {
  const institutions = useCollection('institutions');
  const timelines = useCollection('customer_timelines');
  
  const [selectedId, setSelectedId] = useState(null);
  const [activeTab, setActiveTab] = useState('details'); // details, duplicates, timeline, communications
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Action Modal State
  const [modalState, setModalState] = useState({ open: false, action: null });
  const [remark, setRemark] = useState('');
  const [loading, setLoading] = useState(false);
  const [docsVerified, setDocsVerified] = useState(false);

  // Filter queues
  const queueFilters = [
    'Pending Applications',
    'Approved Applications',
    'Rejected Applications',
    'On Hold Applications',
    'Additional Information Required Applications'
  ];

  const queue = useMemo(() => {
    return institutions
      .filter(i => {
        if (statusFilter === 'All') return true;
        if (statusFilter === 'Pending Applications') return ['Submitted', 'Under Review'].includes(i.status);
        if (statusFilter === 'Approved Applications') return i.status === 'Approved By Sales';
        if (statusFilter === 'Rejected Applications') return i.status === 'Rejected';
        if (statusFilter === 'On Hold Applications') return i.status === 'On Hold';
        if (statusFilter === 'Additional Information Required Applications') return i.status === 'Additional Information Required';
        return true;
      })
      .filter(i => i.name?.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [institutions, searchQuery, statusFilter]);

  const selectedApp = useMemo(() => queue.find(i => i.id === selectedId) || null, [queue, selectedId]);

  // Duplicate Check
  const duplicates = useMemo(() => {
    if (!selectedApp) return [];
    return institutions.filter(i => 
      i.id !== selectedApp.id && 
      (i.taxId === selectedApp.taxId || i.panNumber === selectedApp.panNumber)
    );
  }, [institutions, selectedApp]);

  // Timeline
  const appTimeline = useMemo(() => {
    if (!selectedApp) return [];
    return timelines
      .filter(t => t.institutionId === selectedApp.id)
      .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
  }, [timelines, selectedApp]);

  const handleAction = async (action) => {
    if (action === 'Approve' && !docsVerified) {
      toast.error('You must verify documents before approving.');
      return;
    }
    if ((action === 'Reject' || action === 'Request Info') && remark.trim().length < 5) {
      toast.error('Please provide a detailed remark.');
      return;
    }

    setLoading(true);
    let newStatus = '';
    if (action === 'Approve Application') newStatus = 'Approved By Sales';
    if (action === 'Reject Application') newStatus = 'Rejected';
    if (action === 'Request Additional Information') newStatus = 'Additional Information Required';
    if (action === 'Put Application On Hold') newStatus = 'On Hold';
    if (action === 'Resume Application Review') newStatus = 'Under Review';
    if (action === 'Add Internal Notes') newStatus = selectedApp.status;

    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_URL}/api/admin/institutions/${selectedApp.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ 
          status: newStatus,
          remark,
          temporaryPassword: selectedApp?.contactPerson?.email ? 'Temp@1234' : undefined
        })
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Failed to update application');
      }
      
      toast.success(`Application updated to ${newStatus}`);
      setModalState({ open: false, action: null });
      setRemark('');
      setDocsVerified(false);
      setSelectedId(null);
    } catch (err) {
      toast.error(err.message || 'Failed to update application');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (action) => {
    setModalState({ open: true, action });
    setRemark('');
  };

  return (
    <div className="flex h-[calc(100vh-6rem)] gap-6 overflow-hidden">
      
      {/* Left Pane: Queue */}
      <div className="w-1/3 flex flex-col gap-4 overflow-hidden border-r border-[var(--border)] pr-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-extrabold text-[var(--text-primary)]">App Center</h1>
          <p className="text-sm text-[var(--text-secondary)]">Review incoming registrations.</p>
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <Input icon={Search} placeholder="Search names..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <Select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)} 
            options={[{label: 'Application Queue', value: 'All'}, ...queueFilters.map(s => ({label: s, value: s}))]}
          />
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
          {queue.length === 0 ? (
            <div className="text-sm text-[var(--text-secondary)] py-8 text-center bg-[var(--bg-base)] rounded-xl border border-[var(--border)] border-dashed">
              No applications in queue.
            </div>
          ) : (
            queue.map(app => (
              <div 
                key={app.id} 
                onClick={() => setSelectedId(app.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedId === app.id ? 'border-indigo-500 bg-indigo-50/10 shadow-sm' : 'border-[var(--border)] bg-[var(--bg-base)] hover:border-slate-300'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="font-semibold text-[var(--text-primary)]">{app.name}</div>
                  <Badge text={app.status} color={statusColor[app.status]} />
                </div>
                <div className="text-[11px] text-[var(--text-secondary)]">
                  Submitted: {app.createdAt ? format(new Date(app.createdAt), 'MMM dd, yyyy') : 'N/A'}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Pane: Workspace */}
      <div className="w-2/3 flex flex-col h-full overflow-hidden">
        {!selectedApp ? (
          <div className="h-full flex flex-col items-center justify-center text-[var(--text-secondary)] bg-[var(--bg-base)] rounded-2xl border border-[var(--border)] border-dashed">
            <FileText className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-sm">Select an application from the queue to begin review.</p>
          </div>
        ) : (
          <div className="flex flex-col h-full bg-[var(--bg-base)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
            
            {/* Header */}
            <div className="p-6 border-b border-[var(--border)] bg-slate-50/50">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-[var(--text-primary)]">{selectedApp.name}</h2>
                  <div className="text-sm text-[var(--text-secondary)] mt-1">ID: {selectedApp.id}</div>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => openModal('Add Internal Notes')}><FileText className="w-4 h-4 mr-2"/> Add Internal Notes</Button>
                  <Button variant="secondary" onClick={() => openModal('Resume Application Review')}><Clock className="w-4 h-4 mr-2"/> Resume</Button>
                  <Button variant="secondary" onClick={() => openModal('Request Additional Information')}><Info className="w-4 h-4 mr-2"/> Request Info</Button>
                  <Button variant="danger" onClick={() => openModal('Put Application On Hold')}><Clock className="w-4 h-4 mr-2"/> Hold</Button>
                  <Button variant="danger" onClick={() => openModal('Reject Application')}><XCircle className="w-4 h-4 mr-2"/> Reject</Button>
                  <Button variant="primary" onClick={() => openModal('Approve Application')}><CheckCircle className="w-4 h-4 mr-2"/> Approve</Button>
                </div>
              </div>
              
              <div className="flex gap-4 border-b border-[var(--border)] pb-0">
                <button 
                  onClick={() => setActiveTab('details')}
                  className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'details' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                >
                  Application Documents
                </button>
                <button 
                  onClick={() => setActiveTab('duplicates')}
                  className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'duplicates' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                >
                  Duplicate Risk
                  {duplicates.length > 0 && <span className="bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded text-[10px]">{duplicates.length}</span>}
                </button>
                <button 
                  onClick={() => setActiveTab('communications')}
                  className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'communications' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                >
                  <MessageSquare size={16} />
                  Customer Communications
                  {selectedApp?.replies && selectedApp?.replies.length > 0 && <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px]">{selectedApp.replies.length}</span>}
                </button>
                <button 
                  onClick={() => setActiveTab('timeline')}
                  className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'timeline' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                >
                  Application Timeline & Notes
                </button>
              </div>
            </div>

            {/* Workspace Content */}
            <div className="flex-1 overflow-y-auto p-6">
              
              {activeTab === 'details' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Company Details</div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-slate-500">Legal Name:</span><span className="font-medium text-slate-900">{selectedApp.name}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">GSTIN:</span><span className="font-medium text-slate-900">{selectedApp.taxId || 'N/A'}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">PAN:</span><span className="font-medium text-slate-900">{selectedApp.panNumber || 'N/A'}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Monthly Spend:</span><span className="font-medium text-slate-900">{selectedApp.monthlySpend ? currency.format(selectedApp.monthlySpend) : 'N/A'}</span></div>
                      </div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Primary Contact</div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-slate-500">Name:</span><span className="font-medium text-slate-900">{selectedApp.contactPerson?.name || 'N/A'}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Email:</span><span className="font-medium text-slate-900">{selectedApp.contactPerson?.email || 'N/A'}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Phone:</span><span className="font-medium text-slate-900">{selectedApp.contactPerson?.phone || 'N/A'}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Address:</span><span className="font-medium text-slate-900 text-right max-w-[150px] truncate">{selectedApp.address || 'N/A'}</span></div>
                      </div>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-xl p-5">
                    <h3 className="text-sm font-bold text-slate-800 mb-4">Document Verification</h3>
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="flex items-center gap-3">
                        <FileText className="text-slate-400 w-8 h-8" />
                        <div>
                          <div className="text-sm font-medium text-slate-900">Corporate Documents</div>
                          <div className="text-xs text-slate-500">GSTIN / PAN Uploads</div>
                        </div>
                      </div>
                      <Button variant="secondary" onClick={() => window.open('#', '_blank')}>View Documents</Button>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" checked={docsVerified} onChange={(e) => setDocsVerified(e.target.checked)} />
                        <span className="text-sm font-medium text-slate-700">I have reviewed and verified all uploaded corporate documents against the provided GSTIN and PAN.</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'duplicates' && (
                <div className="space-y-4">
                  {duplicates.length > 0 ? (
                    <div className="bg-rose-50 border border-rose-200 p-5 rounded-xl">
                      <div className="flex items-center gap-3 text-rose-700 font-bold mb-4">
                        <AlertTriangle className="w-6 h-6" />
                        Possible Duplicates Detected!
                      </div>
                      <p className="text-sm text-rose-600 mb-4">The following institutions share the exact same GSTIN or PAN as this application.</p>
                      <div className="space-y-3">
                        {duplicates.map(dup => (
                          <div key={dup.id} className="bg-white p-4 rounded-lg border border-rose-200 flex justify-between items-center">
                            <div>
                              <div className="font-semibold text-slate-900">{dup.name}</div>
                              <div className="text-xs text-slate-500">ID: {dup.id} • Status: {dup.status}</div>
                            </div>
                            <Button variant="secondary" onClick={() => window.open(`/institutions?search=${dup.name}`, '_blank')}>View Account</Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-12 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700">
                      <CheckCircle2 className="w-12 h-12 mb-3 opacity-50" />
                      <h3 className="font-bold text-lg">Clean Record</h3>
                      <p className="text-sm opacity-80 mt-1">No active institutions share this GSTIN or PAN.</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'communications' && (
                <div className="space-y-6">
                  {/* Remark/Message sent to customer */}
                  {selectedApp.remark && (
                    <div className="bg-blue-50 border-2 border-blue-200 p-4 rounded-xl">
                      <div className="flex items-center gap-2 mb-3">
                        <MessageSquare size={18} className="text-blue-700" />
                        <h3 className="font-semibold text-blue-900">Message Sent to Customer</h3>
                      </div>
                      <p className="text-sm text-blue-800 leading-relaxed">{selectedApp.remark}</p>
                      <p className="text-xs text-blue-600 mt-2">
                        Sent on {selectedApp.remarkDate ? format(new Date(selectedApp.remarkDate), 'MMM dd, yyyy h:mm a') : 'N/A'}
                      </p>
                    </div>
                  )}

                  {/* Customer Replies */}
                  {selectedApp.replies && selectedApp.replies.length > 0 ? (
                    <div className="space-y-4">
                      <h3 className="font-semibold text-[var(--text-primary)]">Customer Responses ({selectedApp.replies.length})</h3>
                      {selectedApp.replies.map((reply, idx) => (
                        <div key={idx} className={`p-4 rounded-lg border ${reply.from === 'customer' ? 'bg-slate-50 border-slate-200' : 'bg-green-50 border-green-200'}`}>
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-semibold text-[var(--text-primary)]">{reply.from === 'customer' ? reply.customerName : 'GangaMaxx Team'}</p>
                              <p className="text-xs text-[var(--text-secondary)]">{reply.from === 'customer' ? reply.customerEmail : 'staff'}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {reply.type === 'appeal' && <Badge text="Appeal" color="bg-purple-100 text-purple-700" />}
                              <span className="text-xs text-[var(--text-secondary)]">{format(new Date(reply.date), 'MMM dd, h:mm a')}</span>
                            </div>
                          </div>
                          <p className="text-sm text-[var(--text-primary)] mt-3 leading-relaxed">{reply.message}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--text-secondary)] text-center py-8 bg-slate-50 rounded-lg border border-[var(--border)] border-dashed">
                      No customer responses yet.
                    </p>
                  )}
                </div>
              )}

              {activeTab === 'timeline' && (
                <div className="space-y-4">
                  {appTimeline.length === 0 ? (
                    <p className="text-sm text-[var(--text-secondary)]">No timeline events found.</p>
                  ) : (
                    <div className="relative border-l-2 border-[var(--border)] ml-3 space-y-6">
                      {appTimeline.map((item) => (
                        <div key={item.id} className="relative pl-6">
                          <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-[var(--bg-base)] border-2 border-[var(--brand)]" />
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <Badge text={item.status} color={statusColor[item.status] || 'bg-slate-100 text-slate-700'} />
                              <span className="text-xs font-semibold text-[var(--text-secondary)]">{item.updatedBy || 'System'}</span>
                              <span className="text-xs text-[var(--text-tertiary)]">• {format(new Date(item.timestamp), 'MMM dd, h:mm a')}</span>
                            </div>
                            <p className="text-sm text-[var(--text-primary)] mt-1 bg-slate-50 p-3 rounded-lg border border-slate-100">{item.note}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        )}
      </div>

      <Modal open={modalState.open} title={`${modalState.action} Application`} onClose={() => !loading && setModalState({ open: false, action: null })}>
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">
            You are about to transition <strong className="text-[var(--text-primary)]">{selectedApp?.name}</strong> to{' '}
            <span className="font-semibold text-[var(--text-primary)]">
              {modalState.action}
            </span>
          </p>
          <Textarea 
            label="Mandatory Remark / Notes *" 
            value={remark} 
            onChange={(e) => setRemark(e.target.value)} 
            placeholder="Provide context for this decision..." 
            rows={4}
            required
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
            <Button variant="secondary" onClick={() => setModalState({ open: false, action: null })} disabled={loading}>Cancel</Button>
            <Button 
              variant={modalState.action === 'Approve' ? 'primary' : 'danger'} 
              onClick={() => handleAction(modalState.action)} 
              loading={loading}
              disabled={loading}
            >
              Confirm {modalState.action}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
