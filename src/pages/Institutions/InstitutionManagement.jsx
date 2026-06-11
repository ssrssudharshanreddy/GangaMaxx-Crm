import { useState, useMemo } from 'react';
import { useCollection } from '../../hooks/useDb';
import { useAuth } from '../../context/AuthContext';
import { db, logAuditAction } from '../../services';
import { PageHeader, Card, Button, Input, Select, Badge, Modal, EmptyState, Textarea } from '../../components/ui/ui-components';
import { Building2, Plus, Pencil, Download, ShieldAlert } from 'lucide-react';
import { firebaseConfig, firestore } from '../../config/firebase';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, updateDoc, collection, addDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { ROLES } from '../../config/permissions';

const exportToCSV = (data, filename) => {
  const headers = ['Institution', 'Type', 'GSTIN / Tax ID', 'Contact Person', 'Email', 'Phone', 'Credit Limit', 'Status'];
  const rows = data.map(inst => [
    inst.name || '',
    inst.type || '',
    inst.taxId || '',
    inst.contactPerson?.name || '',
    inst.contactPerson?.email || '',
    inst.contactPerson?.phone || '',
    inst.creditLimit || 0,
    inst.status || ''
  ]);
  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

const TYPES = [
  { value: 'hotel', label: 'Hotel' },
  { value: 'hospital', label: 'Hospital' },
  { value: 'school', label: 'School' },
  { value: 'corporate_office', label: 'Corporate Office' },
  { value: 'dealer', label: 'Dealer' },
];

const STATUSES = [
  { value: 'Draft', label: 'Draft' },
  { value: 'Submitted', label: 'Submitted' },
  { value: 'Under Review', label: 'Under Review' },
  { value: 'Additional Information Required', label: 'Additional Information Required' },
  { value: 'Approved By Sales', label: 'Approved By Sales' },
  { value: 'Pending Finance Setup', label: 'Pending Finance Setup' },
  { value: 'Credit Assessment', label: 'Credit Assessment' },
  { value: 'Activated', label: 'Activated' },
  { value: 'Rejected', label: 'Rejected' },
  { value: 'On Hold', label: 'On Hold' },
  { value: 'Expired', label: 'Expired' },
  { value: 'Paused', label: 'Paused' },
  { value: 'Credit Restricted', label: 'Credit Restricted' },
  { value: 'Suspended', label: 'Suspended' },
  { value: 'Inactive', label: 'Inactive' },
  { value: 'Blacklisted', label: 'Blacklisted' },
];

const TERMS = [
  { value: 'cash_on_delivery', label: 'Cash on Delivery' },
  { value: 'net_15', label: 'Net 15' },
  { value: 'net_30', label: 'Net 30' },
  { value: 'net_45', label: 'Net 45' },
];

const emptyForm = {
  name: '',
  type: 'hotel',
  taxId: '',
  address: '',
  status: 'Draft',
  creditLimit: 0,
  contractTerms: 'net_30',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  contactPassword: '',
  assignedSalesmanId: '',
  assignedSalesmanEmail: '',
};

export default function InstitutionManagement() {
  const { user } = useAuth();
  const institutions = useCollection('institutions');
  const staff = useCollection('staff');
  const orders = useCollection('orders');
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [remark, setRemark] = useState('');
  const PAGE_SIZE = 25;
  
  // Governance Dialog State
  const [govDialog, setGovDialog] = useState({ open: false, inst: null, action: null });
  const [govReason, setGovReason] = useState('');
  const [govLoading, setGovLoading] = useState(false);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setRemark(''); setSaveLoading(false); setModalOpen(true); };
  const openEdit = (inst) => {
    setEditing(inst);
    setForm({
      name: inst.name || '',
      type: inst.type || 'hotel',
      taxId: inst.taxId || '',
      address: inst.address || '',
      status: inst.status || 'Activated',
      creditLimit: inst.creditLimit || 0,
      contractTerms: inst.contractTerms || 'net_30',
      contactName: inst.contactPerson?.name || '',
      contactEmail: inst.contactPerson?.email || '',
      contactPhone: inst.contactPerson?.phone || '',
      contactPassword: '',
      assignedSalesmanId: inst.assignedSalesmanId || '',
      assignedSalesmanEmail: inst.assignedSalesmanEmail || '',
    });
    setRemark('');
    setSaveLoading(false);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.taxId) {
      toast.error('Institution Name and GSTIN / Tax ID are required.');
      return;
    }

    if (!editing && (!form.contactEmail || !form.contactPassword)) {
      toast.error('Contact Email and Temporary Password are required for onboarding.');
      return;
    }

    setSaveLoading(true);
    try {
      if (editing) {
        if (!remark || remark.trim().length < 5) {
          toast.error('A remark of at least 5 characters is mandatory to save modifications.');
          setSaveLoading(false);
          return;
        }

        const payload = {
          name: form.name,
          type: form.type,
          taxId: form.taxId,
          address: form.address,
          status: form.status,
          creditLimit: Number(form.creditLimit || 0),
          contractTerms: form.contractTerms,
          assignedSalesmanId: form.assignedSalesmanId || '',
          assignedSalesmanEmail: form.assignedSalesmanEmail || '',
          contactPerson: {
            name: form.contactName,
            email: editing.contactPerson?.email || form.contactEmail || '',
            phone: form.contactPhone,
            uid: editing.contactPerson?.uid || '',
          }
        };

        const contactUid = editing.contactPerson?.uid;

        if (!contactUid && form.contactPassword) {
          await db.approveInstitution(editing.id, {
            status: form.status,
            remark,
            temporaryPassword: form.contactPassword,
            contactEmail: form.contactEmail || editing.contactPerson?.email,
          });
          payload.contactPerson.email = form.contactEmail || editing.contactPerson?.email;
        }

        await db.updateInstitution(editing.id, payload, user, remark);

        if (contactUid) {
          await db.secureUpdateDoc('users', contactUid, {
            name: form.contactName,
            phoneNumber: form.contactPhone || '',
            status: form.status === 'Activated' ? 'Activated' : (form.status === 'Suspended' ? 'Suspended' : 'Pending Finance Setup'),
          }, user, remark);
        }

        const creditAccount = db.getCreditAccounts().find((c) => c.institutionId === editing.id);
        if (creditAccount) {
          await db.secureUpdateDoc('creditAccounts', creditAccount.id, {
            institutionName: form.name,
            creditLimit: Number(form.creditLimit || 0),
          }, user, remark);
        }

        toast.success('Institution updated successfully.');
        setModalOpen(false);
      } else {
        const instHistory = [{
          state: form.status,
          timestamp: new Date().toISOString(),
          actorId: user?.id || 'unknown',
          actorEmail: user?.email || 'unknown',
          actorRole: user?.role || 'Sales Executive',
          remark: 'Institution onboarding initiated via CRM'
        }];

        const instRef = await addDoc(collection(firestore, 'institutions'), {
          name: form.name,
          type: form.type,
          taxId: form.taxId,
          address: form.address,
          status: form.status,
          creditLimit: Number(form.creditLimit || 0),
          contractTerms: form.contractTerms,
          assignedSalesmanId: form.assignedSalesmanId || '',
          assignedSalesmanEmail: form.assignedSalesmanEmail || '',
          contactPerson: {
            name: form.contactName,
            email: form.contactEmail,
            phone: form.contactPhone,
          },
          createdAt: new Date().toISOString().slice(0, 10),
          history: instHistory,
          remarks: 'Initial onboarding'
        });
        const institutionId = instRef.id;

        const secondaryApp = initializeApp(firebaseConfig, 'SecondaryInstitution');
        const secondaryAuth = getAuth(secondaryApp);
        let uid;
        try {
          const userCredential = await createUserWithEmailAndPassword(secondaryAuth, form.contactEmail, form.contactPassword);
          uid = userCredential.user.uid;
          await signOut(secondaryAuth);
        } finally {
          await deleteApp(secondaryApp);
        }

        await setDoc(doc(firestore, 'users', uid), {
          name: form.contactName,
          email: form.contactEmail,
          phoneNumber: form.contactPhone || '',
          role: 'customer_admin',
          status: form.status === 'Activated' ? 'Activated' : 'Pending Finance Setup',
          institutionId: institutionId,
          createdAt: new Date().toISOString().slice(0, 10),
        });

        await updateDoc(doc(firestore, 'institutions', institutionId), {
          'contactPerson.uid': uid,
        });

        await addDoc(collection(firestore, 'creditAccounts'), {
          institutionId: institutionId,
          institutionName: form.name,
          creditLimit: Number(form.creditLimit || 0),
          outstanding: 0,
          createdAt: new Date().toISOString().slice(0, 10),
        });

        logAuditAction(user.id, user.email, user.role, 'create_institution', 'institution', institutionId, `Created ${form.name}`);
        toast.success('Institution and user account created successfully.');
        setModalOpen(false);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to save institution.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleGovernanceAction = async () => {
    if (!govReason || govReason.trim().length < 5) {
      toast.error('A mandatory reason (at least 5 characters) must be provided.');
      return;
    }
    
    setGovLoading(true);
    try {
      const { inst, action } = govDialog;
      let newStatus = '';
      
      switch (action) {
        case 'pause': newStatus = 'Paused'; break;
        case 'suspend': newStatus = 'Suspended'; break;
        case 'blacklist': newStatus = 'Blacklisted'; break;
        case 'reactivate': newStatus = 'Activated'; break;
      }
      
      // Hit backend API to securely update the document with mandatory remark
      await db.secureUpdateDoc('institutions', inst.id, { status: newStatus }, user, govReason);
      
      toast.success(`Customer ${action}d successfully`);
      setGovDialog({ open: false, inst: null, action: null });
      setGovReason('');
    } catch (err) {
      toast.error(err.message || 'Failed to execute governance action');
    } finally {
      setGovLoading(false);
    }
  };

  const filtered = institutions.filter((inst) => {
    const matchSearch = inst.name?.toLowerCase().includes(search.toLowerCase()) || inst.taxId?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || inst.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const paginatedInstitutions = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Institution Management"
        subtitle="Manage B2B institutions, onboarding, and credit accounts."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={Download}
              onClick={() => exportToCSV(filtered, `institutions-${new Date().toISOString().slice(0,10)}.csv`)}
            >
              Export CSV
            </Button>
            {user.role === ROLES.SALESMAN ? (
              <Button icon={Plus} onClick={openAdd}>Add Institution</Button>
            ) : null}
          </div>
        }
      />

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search by name or GSTIN…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
          className="flex-1 min-w-[200px]"
        />
        <Select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
          options={STATUSES}
          placeholder="All Statuses"
          className="w-48"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Building2} title="No institutions found" description="Register your first B2B institution." actionButton={(user.role === ROLES.SALESMAN) && <Button icon={Plus} onClick={openAdd}>Add Institution</Button>} />
      ) : (
        <Card noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-secondary)] uppercase tracking-wider">
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">GSTIN</th>
                  <th className="px-5 py-3">Credit Limit</th>
                  <th className="px-5 py-3">Terms</th>
                  <th className="px-5 py-3">Salesman</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedInstitutions.map((inst) => (
                  <tr key={inst.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-secondary)] transition-colors">
                    <td className="px-5 py-3 font-medium text-[var(--text-primary)]">{inst.name}</td>
                    <td className="px-5 py-3 text-[var(--text-secondary)] capitalize">{inst.type?.replace(/_/g, ' ')}</td>
                    <td className="px-5 py-3 text-[var(--text-secondary)] font-mono text-xs">{inst.taxId}</td>
                    <td className="px-5 py-3 text-[var(--text-secondary)]">₹{Number(inst.creditLimit || 0).toLocaleString('en-IN')}</td>
                    <td className="px-5 py-3"><Badge type="default" text={inst.contractTerms?.replace(/_/g, ' ') || 'N/A'} /></td>
                    <td className="px-5 py-3 text-[var(--text-secondary)] text-sm">
                      {staff.find(s => s.id === inst.assignedSalesmanId)?.name || '—'}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-col gap-1 items-start sm:flex-row sm:items-center sm:gap-2">
                        <Badge type={inst.status} />
                        {(() => {
                          const instOrders = orders.filter(o => o.institutionName === inst.name || o.institutionId === inst.id);
                          const pendingCount = instOrders.filter(o => ['pending','pending_approval','processing'].includes(o.status)).length;
                          return pendingCount > 0 ? (
                            <span className="text-[10px] font-semibold bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full">
                              {pendingCount} active order{pendingCount > 1 ? 's' : ''}
                            </span>
                          ) : null;
                        })()}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {user?.role === ROLES.SUPER_ADMIN ? (
                        <div className="flex flex-col gap-2 items-end">
                          <Select
                            value=""
                            onChange={(e) => {
                              if(e.target.value) {
                                setGovDialog({ open: true, inst, action: e.target.value });
                              }
                            }}
                            options={[
                              { value: '', label: 'Governance Action' },
                              { value: 'pause', label: 'Pause Customer' },
                              { value: 'suspend', label: 'Suspend Customer' },
                              { value: 'blacklist', label: 'Blacklist Customer' },
                              { value: 'reactivate', label: 'Reactivate/Resume' }
                            ]}
                          />
                        </div>
                      ) : (
                        <Button variant="outline" size="xs" icon={Pencil} onClick={() => openEdit(inst)}>Edit</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
          <p className="text-sm text-[var(--text-secondary)]">
            Showing {((currentPage-1)*PAGE_SIZE)+1}–{Math.min(currentPage*PAGE_SIZE, filtered.length)} of {filtered.length} institutions
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p-1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm rounded-lg border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-[var(--text-secondary)]">{currentPage} / {totalPages}</span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-sm rounded-lg border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      <Modal open={modalOpen} title={editing ? 'Edit Institution' : 'Add Institution'} onClose={() => !saveLoading && setModalOpen(false)}>
        <div className="flex flex-col gap-4">
          <Input label="Institution Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Sunrise Facilities"           disabled={saveLoading || user.role === ROLES.SALESMAN || user.role === ROLES.SUPER_ADMIN} />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Type" required value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} options={TYPES}           disabled={saveLoading || user.role === ROLES.SALESMAN || user.role === ROLES.SUPER_ADMIN} />
            <Select 
              label="Status" 
              required 
              value={form.status} 
              onChange={(e) => setForm({ ...form, status: e.target.value })} 
              options={
                user.role === 'Sales Executive' 
                  ? STATUSES.filter(s => ['Draft', 'Submitted', 'Under Review', 'Additional Information Required', 'Approved By Sales', 'On Hold', 'Rejected'].includes(s.value))
                  : user.role === 'Accounts Executive'
                    ? STATUSES.filter(s => ['Pending Finance Setup', 'Credit Assessment', 'Activated', 'On Hold', 'Expired', 'Paused', 'Credit Restricted', 'Suspended', 'Inactive', 'Blacklisted'].includes(s.value))
                    : user.role === ROLES.SUPER_ADMIN
                      ? STATUSES.filter(s => ['Activated', 'Paused', 'Suspended', 'Blacklisted', 'Inactive'].includes(s.value))
                      : STATUSES
              } 
                        disabled={saveLoading || user.role === ROLES.SALESMAN} 
            />
          </div>
          <Input label="GSTIN / Tax ID" required value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })} placeholder="27ABCDE1234F2Z5"           disabled={saveLoading || user.role === ROLES.SALESMAN || user.role === ROLES.SUPER_ADMIN} />
          <Textarea label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Full shipping address"           disabled={saveLoading || user.role === ROLES.SALESMAN || user.role === ROLES.SUPER_ADMIN} />
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Credit Limit (₹)" 
              type="number" 
              min="0" 
              value={form.creditLimit} 
              onChange={(e) => setForm({ ...form, creditLimit: Number(e.target.value) })} 
              disabled={saveLoading || user.role === ROLES.SALESMAN || user.role === ROLES.SALES_EXECUTIVE || user.role === ROLES.SUPER_ADMIN} 
            />
            <Select 
              label="Payment Terms" 
              value={form.contractTerms} 
              onChange={(e) => setForm({ ...form, contractTerms: e.target.value })} 
              options={TERMS} 
              disabled={saveLoading || user.role === ROLES.SALESMAN || user.role === ROLES.SALES_EXECUTIVE || user.role === ROLES.SUPER_ADMIN} 
            />
          </div>
          <Select
            label="Assigned Salesman"
            value={form.assignedSalesmanId}
            onChange={(e) => {
              const selected = staff.find(s => s.id === e.target.value);
              setForm({
                ...form,
                assignedSalesmanId: e.target.value,
                assignedSalesmanEmail: selected?.email || '',
              });
            }}
            options={[
              { value: '', label: 'Unassigned' },
              ...staff.filter(s => s.role === 'Salesman' || s.role === 'salesman').map(s => ({ value: s.id, label: s.name }))
            ]}
                      disabled={saveLoading || user.role === ROLES.SALESMAN || user.role === ROLES.SUPER_ADMIN}
          />
          <div className="border-t border-[var(--border)] pt-4 mt-2">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Contact Person & Credentials</h3>
            <div className="flex flex-col gap-4">
              <Input label="Contact Name" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} placeholder="e.g. John Doe" disabled={saveLoading || (editing && user.role === 'Salesman') || user.role === ROLES.SUPER_ADMIN} />
              <Input label="Contact Email" required type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} placeholder="contact@institution.com" disabled={saveLoading || (editing && !!editing.contactPerson?.uid) || user.role === ROLES.SUPER_ADMIN} />
              {(!editing || !editing.contactPerson?.uid) && (
                <Input label="Temporary Password" required type="password" value={form.contactPassword} onChange={(e) => setForm({ ...form, contactPassword: e.target.value })} placeholder="Enter temporary password" disabled={saveLoading || user.role === ROLES.SUPER_ADMIN} />
              )}
              <Input label="Contact Phone" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} placeholder="+91 99999 88888" disabled={saveLoading || (editing && user.role === 'Salesman') || user.role === ROLES.SUPER_ADMIN} />
            </div>
          </div>
          
          {editing && (
            <div className="border-t border-[var(--border)] pt-4 mt-2">
              <Input 
                label="Modification Remark" 
                required 
                value={remark} 
                onChange={(e) => setRemark(e.target.value)} 
                placeholder="Describe the reason for this change (mandatory, min 5 characters)" 
                disabled={saveLoading} 
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saveLoading}>Cancel</Button>
            <Button onClick={handleSave} loading={saveLoading}>{editing ? 'Save Changes' : 'Create Institution'}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={govDialog.open} title="Governance Action Required" onClose={() => !govLoading && setGovDialog({ open: false, inst: null, action: null })}>
        <div className="flex flex-col gap-4">
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 flex items-start gap-3">
            <ShieldAlert className="text-amber-600 mt-0.5" size={20} />
            <div>
              <h3 className="text-sm font-bold text-amber-900">Mandatory Confirmation</h3>
              <p className="text-sm text-amber-800">
                You are about to <strong>{govDialog.action}</strong> {govDialog.inst?.name}. This action will be logged in the immutable audit trail and will immediately affect their ecosystem access.
              </p>
            </div>
          </div>
          
          <Textarea 
            label="Mandatory Reason" 
            required 
            value={govReason} 
            onChange={(e) => setGovReason(e.target.value)} 
            placeholder="Provide a detailed justification for this action..." 
            disabled={govLoading} 
          />
          
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setGovDialog({ open: false, inst: null, action: null })} disabled={govLoading}>
              Cancel
            </Button>
            <Button onClick={handleGovernanceAction} loading={govLoading} className="bg-rose-600 hover:bg-rose-700 text-white">
              Confirm Action
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
