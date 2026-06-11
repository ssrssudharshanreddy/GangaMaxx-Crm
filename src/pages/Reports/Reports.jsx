import { useMemo, useState, useCallback } from 'react';
import { useCollection } from '../../hooks/useDb';
import { useAuth } from '../../context/AuthContext';
import { PageHeader, Card, SectionCard, Button, Select } from '../../components/ui/ui-components';
import { BarChart3, TrendingUp, DollarSign, Users, Package, ShoppingCart, Receipt, Headset, MapPin, CalendarCheck, Download, FileText, CheckCircle } from 'lucide-react';
import { ROLES } from '../../config/permissions';
import { logAuditAction } from '../../services';

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

const downloadCSV = (filename, headers, rows) => {
  const content = [headers, ...rows]
    .map(r => r.map(c => `"${String(c ?? '').replace(/"/g,'""')}"`).join(','))
    .join('\n');
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([content], {type:'text/csv'})),
    download: filename
  });
  a.click(); URL.revokeObjectURL(a.href);
};

const MetricCard = ({ icon: Icon, label, value, sub, color = '' }) => (
  <Card className="space-y-1">
    <div className="flex items-center gap-2">
      {Icon && <Icon className={`h-4 w-4 ${color || 'text-[var(--text-tertiary)]'}`} />}
      <div className="text-xs uppercase tracking-widest text-[var(--text-tertiary)]">{label}</div>
    </div>
    <div className={`text-2xl font-bold ${color || 'text-[var(--text-primary)]'}`}>{value}</div>
    {sub && <div className="text-[11px] text-[var(--text-secondary)]">{sub}</div>}
  </Card>
);

export default function Reports() {
  const { user } = useAuth();
  
  const institutions = useCollection('institutions');
  const orders = useCollection('orders');
  const invoices = useCollection('invoices');
  const payments = useCollection('payments');
  const products = useCollection('products');
  const tickets = useCollection('tickets');
  const followUps = useCollection('followUps');
  const visitLogs = useCollection('visitLogs');
  const procurement = useCollection('procurement');
  const returns = useCollection('returns');
  const staff = useCollection('staff');
  const quotations = useCollection('quotations');

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedSalesman, setSelectedSalesman] = useState('');

  const filterByDate = useCallback((items, field = 'createdAt') => {
    if (!dateFrom && !dateTo) return items;
    return items.filter(item => {
      const d = item[field] || '';
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
      return true;
    });
  }, [dateFrom, dateTo]);

  const filterBySalesman = useCallback((items, field = 'salesmanId') => {
    if (!selectedSalesman) return items;
    return items.filter(item => item[field] === selectedSalesman);
  }, [selectedSalesman]);

  const activeSalesmen = useMemo(() => staff.filter(s => s.role === ROLES.SALESMAN && s.status !== 'inactive'), [staff]);
  
  const isSalesExec = user?.role === ROLES.SALES_EXECUTIVE;
  const isSalesman = user?.role === ROLES.SALESMAN;
  const isWarehouseExec = user?.role === ROLES.WAREHOUSE_EXECUTIVE;
  const isWarehouseStaff = user?.role === ROLES.WAREHOUSE_STAFF;
  const isAccountsExec = user?.role === ROLES.ACCOUNTS_EXECUTIVE;
  const isSuperAdmin = user?.role === ROLES.SUPER_ADMIN;

  // ─── Sales Operations Metrics ───────────────────────────────────────────────
  
  // 1. Sales Team Performance
  const filteredSalesOrders = useMemo(() => filterBySalesman(filterByDate(orders)), [orders, filterByDate, filterBySalesman]);
  const teamPerformance = useMemo(() => {
    const data = {};
    activeSalesmen.forEach(s => {
      data[s.id] = { id: s.id, name: s.name, orders: 0, revenue: 0, quotes: 0, acceptedQuotes: 0, visits: 0 };
    });
    
    filteredSalesOrders.forEach(o => {
      if (o.salesmanId && data[o.salesmanId]) {
        data[o.salesmanId].orders += 1;
        data[o.salesmanId].revenue += Number(o.total || 0);
      }
    });

    filterByDate(quotations).forEach(q => {
      if (q.salesmanId && data[q.salesmanId]) {
        data[q.salesmanId].quotes += 1;
        if (q.status === 'accepted') data[q.salesmanId].acceptedQuotes += 1;
      }
    });

    filterByDate(visitLogs).forEach(v => {
      if (v.salesmanId && data[v.salesmanId]) {
        data[v.salesmanId].visits += 1;
      }
    });

    return Object.values(data).sort((a, b) => b.revenue - a.revenue);
  }, [activeSalesmen, filteredSalesOrders, quotations, visitLogs, filterByDate]);

  // 2. Quotation Analytics
  const filteredQuotes = useMemo(() => filterBySalesman(filterByDate(quotations)), [quotations, filterByDate, filterBySalesman]);
  const totalQuotes = filteredQuotes.length;
  const acceptedQuotes = filteredQuotes.filter(q => q.status === 'accepted').length;
  const quoteWinRate = totalQuotes > 0 ? Math.round((acceptedQuotes / totalQuotes) * 100) : 0;
  const totalQuoteValue = filteredQuotes.reduce((s, q) => s + Number(q.total || 0), 0);

  // 3. Customer Conversion Pipeline
  const filteredInsts = useMemo(() => filterBySalesman(filterByDate(institutions), 'assignedSalesmanId'), [institutions, filterByDate, filterBySalesman]);
  const totalApps = filteredInsts.filter(i => i.status !== 'Draft').length;
  const approvedApps = filteredInsts.filter(i => ['Approved By Sales', 'Activated', 'Pending Finance Setup', 'Credit Assessment'].includes(i.status)).length;
  const activatedApps = filteredInsts.filter(i => i.status === 'Activated').length;
  const conversionRate = totalApps > 0 ? Math.round((approvedApps / totalApps) * 100) : 0;

  // 4. Field Activity
  const filteredVisits = useMemo(() => filterBySalesman(filterByDate(visitLogs)), [visitLogs, filterByDate, filterBySalesman]);
  const filteredFollowUps = useMemo(() => filterBySalesman(filterByDate(followUps)), [followUps, filterByDate, filterBySalesman]);

  // ─── Financial & Operational Metrics (Super Admin / Accounts) ───────────────
  
  const totalRevenue = useMemo(() => filterByDate(payments).reduce((s, p) => s + Number(p.amount || 0), 0), [payments, filterByDate]);
  const totalInvoiced = useMemo(() => filterByDate(invoices).reduce((s, i) => s + Number(i.total || i.amount || 0), 0), [invoices, filterByDate]);
  const totalOutstanding = useMemo(() => filterByDate(invoices).filter((i) => ['unpaid', 'overdue'].includes(i.status)).reduce((s, i) => s + Number(i.total || i.amount || 0), 0), [invoices, filterByDate]);
  const collectionRate = totalInvoiced > 0 ? Math.round((totalRevenue / totalInvoiced) * 100) : 0;

  const totalSKUs = products.length;
  const lowStock = products.filter((p) => (p.stockLevel || 0) <= (p.reorderPoint || 10) && (p.stockLevel || 0) > 0).length;
  const outOfStock = products.filter((p) => (p.stockLevel || 0) === 0).length;

  const filteredProcurement = useMemo(() => filterByDate(procurement), [procurement, filterByDate]);
  const activePOs = filteredProcurement.filter((p) => !['received', 'cancelled'].includes(p.status)).length;
  const procurementSpend = useMemo(() => filteredProcurement.filter((p) => p.status === 'received').reduce((s, p) => s + Number(p.totalCost || 0), 0), [filteredProcurement]);

  const exportTeamPerformance = () => {
    logAuditAction(user, 'export_sales_report', 'Team Performance');
    downloadCSV(`sales-performance-${new Date().toISOString().slice(0,10)}.csv`,
      ['Salesman', 'Orders', 'Revenue', 'Quotes Sent', 'Quotes Accepted', 'Field Visits'],
      teamPerformance.map(s => [s.name, s.orders, s.revenue, s.quotes, s.acceptedQuotes, s.visits])
    );
  };

  const exportQuotationData = () => {
    logAuditAction(user, 'export_sales_report', 'Quotations');
    downloadCSV(`quotations-${new Date().toISOString().slice(0,10)}.csv`,
      ['Quote ID', 'Customer', 'Status', 'Total Value', 'Salesman'],
      filteredQuotes.map(q => [q.id, q.institutionName, q.status, q.total, staff.find(s => s.id === q.salesmanId)?.name || 'Unknown'])
    );
  };

  const exportSalesExecutiveReport = (reportName) => {
    logAuditAction(user, 'export_sales_report', reportName);
    
    // In a real app, this would dynamically generate the CSV based on reportName
    // For now, we simulate downloading the requested report
    downloadCSV(`${reportName.toLowerCase().replace(/ /g, '-')}-${new Date().toISOString().slice(0,10)}.csv`,
      ['Report Name', 'Date Generated', 'Status'],
      [[reportName, new Date().toISOString(), 'Completed']]
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={isSalesExec ? 'Sales Operations Center' : isSalesman ? 'Salesman Reports' : isWarehouseExec ? 'Warehouse Reports' : isWarehouseStaff ? 'My Reports' : isAccountsExec ? 'Financial Reports' : 'Reports & Analytics'}
        subtitle={isSalesExec ? 'Oversight and team performance metrics.' : isSalesman ? 'Your performance and customer insights.' : isWarehouseExec ? 'Inventory, fulfillment, and operational reports.' : isWarehouseStaff ? 'Your personal delivery and collection performance.' : isAccountsExec ? 'Credit, collection, and financial performance reports.' : 'Comprehensive business intelligence across all modules.'}
        actions={
          (isSuperAdmin || isAccountsExec) && (
            <Button icon={Download} variant="secondary" size="sm"
              onClick={() => downloadCSV(`report-${new Date().toISOString().slice(0,10)}.csv`,
                ['Metric', 'Value'],
                [
                  ['Total Revenue', totalRevenue],
                  ['Total Invoiced', totalInvoiced],
                  ['Outstanding', totalOutstanding],
                  ['Collection Rate %', collectionRate]
                ]
              )}>Export Report</Button>
          )
        }
      />

      {/* Global Filters */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-[var(--bg-base)] border border-[var(--border)] rounded-xl">
        <span className="text-sm font-medium text-[var(--text-secondary)]">Date Range:</span>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1.5 text-sm text-[var(--text-primary)] focus:border-[var(--brand)] focus:outline-none" />
        <span className="text-sm text-[var(--text-tertiary)]">to</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1.5 text-sm text-[var(--text-primary)] focus:border-[var(--brand)] focus:outline-none" />
        
        {isSalesExec && (
          <>
            <div className="w-[1px] h-6 bg-[var(--border)] mx-2" />
            <span className="text-sm font-medium text-[var(--text-secondary)]">Salesman:</span>
            <Select 
              value={selectedSalesman} 
              onChange={(e) => setSelectedSalesman(e.target.value)}
              options={[{label: 'All Team Members', value: ''}, ...activeSalesmen.map(s => ({label: s.name, value: s.id}))]}
            />
          </>
        )}

        {(dateFrom || dateTo || selectedSalesman) && (
          <button onClick={() => { setDateFrom(''); setDateTo(''); setSelectedSalesman(''); }} className="text-xs text-[var(--danger)] hover:underline ml-2">Clear Filters</button>
        )}
      </div>

      {isSalesExec ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            { name: 'Customer Application Report', desc: 'Full list of all applications and their current status.' },
            { name: 'Customer Approval Report', desc: 'Approved customers and turnaround times.' },
            { name: 'Customer Rejection Report', desc: 'Rejected applications with mandatory remarks.' },
            { name: 'Customer Growth Report', desc: 'Customer acquisition and onboarding trends.' },
            { name: 'Salesman Performance Report', desc: 'Field visits, quotes, and order generation by salesman.' },
            { name: 'Proposal Conversion Report', desc: 'Quotation acceptance and conversion analytics.' },
            { name: 'Customer Registration Report', desc: 'New self-registrations and salesman proposals.' },
            { name: 'Application Aging Report', desc: 'Time elapsed for pending and on-hold applications.' },
          ].map((report, idx) => (
            <Card key={idx} className="flex flex-col gap-4">
              <div>
                <h3 className="font-semibold text-[var(--text-primary)]">{report.name}</h3>
                <p className="text-sm text-[var(--text-secondary)] mt-1">{report.desc}</p>
              </div>
              <div className="mt-auto pt-4 border-t border-[var(--border)]">
                <Button variant="secondary" size="sm" icon={Download} className="w-full justify-center" onClick={() => exportSalesExecutiveReport(report.name)}>
                  Export CSV
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : isSalesman ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[
            { name: 'Customer Report', desc: 'Overview of all your assigned customers.' },
            { name: 'Quotation Report', desc: 'Status of all your drafted and sent quotations.' },
            { name: 'Quotation Conversion Report', desc: 'Analysis of your quotation win rates.' },
            { name: 'Follow-Up Report', desc: 'Summary of completed and pending follow-ups.' },
            { name: 'Visit Report', desc: 'Log of your field visits and activities.' },
            { name: 'Customer Growth Report', desc: 'New customer acquisition metrics.' },
            { name: 'Customer Retention Report', desc: 'Activity and ordering patterns of existing customers.' },
            { name: 'Return Report', desc: 'Returns processed and approved by you.' },
            { name: 'Outstanding Summary Report', desc: 'Open invoices and overdue amounts for your customers.' },
          ].map((report, idx) => (
            <Card key={idx} className="flex flex-col gap-4 border-l-4 border-l-blue-500">
              <div>
                <h3 className="font-semibold text-[var(--text-primary)]">{report.name}</h3>
                <p className="text-sm text-[var(--text-secondary)] mt-1">{report.desc}</p>
              </div>
              <div className="mt-auto pt-4 border-t border-[var(--border)]">
                <Button variant="secondary" size="sm" icon={Download} className="w-full justify-center" onClick={() => exportSalesExecutiveReport(report.name)}>
                  Export CSV
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : isWarehouseExec ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            { name: 'Inventory Report', desc: 'Full stock levels, SKU counts, and valuation across all products.' },
            { name: 'Stock Movement Report', desc: 'Stock adjustments, corrections, and inbound/outbound transactions.' },
            { name: 'Product Report', desc: 'Product catalog with status, pricing, and availability.' },
            { name: 'Category Report', desc: 'Category structure, active/archived categories, and product mapping.' },
            { name: 'Order Fulfillment Report', desc: 'Orders assigned, packed, dispatched, and delivered.' },
            { name: 'Delivery Report', desc: 'Delivery performance, delays, and completion rates.' },
            { name: 'Return Report', desc: 'Returns verified, accepted, rejected, and pending inspection.' },
            { name: 'Warehouse Performance Report', desc: 'Overall warehouse KPIs and staff efficiency metrics.' },
          ].map((report, idx) => (
            <Card key={idx} className="flex flex-col gap-4 border-l-4 border-l-orange-500">
              <div>
                <h3 className="font-semibold text-[var(--text-primary)]">{report.name}</h3>
                <p className="text-sm text-[var(--text-secondary)] mt-1">{report.desc}</p>
              </div>
              <div className="mt-auto pt-4 border-t border-[var(--border)]">
                <Button variant="secondary" size="sm" icon={Download} className="w-full justify-center" onClick={() => exportSalesExecutiveReport(report.name)}>
                  Export CSV
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : isWarehouseStaff ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[
            { name: 'Personal Delivery Report', desc: 'Your assigned deliveries, completions, and PIN verifications.' },
            { name: 'Delivery Performance Report', desc: 'Your on-time delivery rate and failure analysis.' },
            { name: 'Collection Performance Report', desc: 'Return collections completed vs pending.' },
            { name: 'Task Completion Report', desc: 'Daily task assignments and completion status.' },
            { name: 'Daily Activity Report', desc: 'Full log of your delivery and collection activity for any date.' },
          ].map((report, idx) => (
            <Card key={idx} className="flex flex-col gap-4 border-l-4 border-l-cyan-500">
              <div>
                <h3 className="font-semibold text-[var(--text-primary)]">{report.name}</h3>
                <p className="text-sm text-[var(--text-secondary)] mt-1">{report.desc}</p>
              </div>
              <div className="mt-auto pt-4 border-t border-[var(--border)]">
                <Button variant="secondary" size="sm" icon={Download} className="w-full justify-center" onClick={() => exportSalesExecutiveReport(report.name)}>
                  Export CSV
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : isAccountsExec ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[
            { name: 'Credit Report', desc: 'Credit limit utilization and risk assessment across accounts.' },
            { name: 'Customer Credit Report', desc: 'Detailed credit history and exposure by customer.' },
            { name: 'Outstanding Report', desc: 'Aging of open invoices and unpaid balances.' },
            { name: 'Overdue Report', desc: 'Accounts with overdue invoices and dunning status.' },
            { name: 'Collection Report', desc: 'Collection performance and payment realization metrics.' },
            { name: 'Payment Report', desc: 'Summary of all recorded and reconciled payments.' },
            { name: 'Invoice Report', desc: 'Log of issued, paid, and cancelled invoices.' },
            { name: 'Ledger Report', desc: 'Comprehensive financial ledger across all accounts.' },
            { name: 'Financial Performance Report', desc: 'Revenue, outstanding, and collection efficiency trends.' },
          ].map((report, idx) => (
            <Card key={idx} className="flex flex-col gap-4 border-l-4 border-l-emerald-500">
              <div>
                <h3 className="font-semibold text-[var(--text-primary)]">{report.name}</h3>
                <p className="text-sm text-[var(--text-secondary)] mt-1">{report.desc}</p>
              </div>
              <div className="mt-auto pt-4 border-t border-[var(--border)]">
                <Button variant="secondary" size="sm" icon={Download} className="w-full justify-center" onClick={() => exportSalesExecutiveReport(report.name)}>
                  Export CSV
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : isSuperAdmin ? (
        <>
          {/* Legacy Super Admin / Finance Metrics */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={DollarSign} label="Revenue Collected" value={currency.format(totalRevenue)} sub={`${filterByDate(payments).length} payments`} color="text-emerald-600" />
            <MetricCard icon={Receipt} label="Total Invoiced" value={currency.format(totalInvoiced)} sub={`${filterByDate(invoices).length} invoices`} />
            <MetricCard icon={TrendingUp} label="Outstanding" value={currency.format(totalOutstanding)} sub={`Collection rate: ${collectionRate}%`} color="text-amber-600" />
            <MetricCard icon={ShoppingCart} label="Total Orders" value={filterByDate(orders).length} />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={Users} label="Institutions" value={institutions.length} sub={`${institutions.filter((i) => i.status === 'Activated').length} activated`} />
            <MetricCard icon={Package} label="Inventory" value={`${totalSKUs} SKUs`} sub={`${lowStock} low, ${outOfStock} out of stock`} color={outOfStock > 0 ? 'text-rose-600' : ''} />
            <MetricCard icon={Headset} label="Support" value={`${tickets.length} tickets`} />
            <MetricCard icon={Package} label="Procurement" value={`${activePOs} active POs`} sub={`${currency.format(procurementSpend)} received`} />
          </div>
        </>
      ) : null}

    </div>
  );
}
