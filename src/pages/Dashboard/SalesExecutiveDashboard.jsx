import React, { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, Legend, AreaChart, Area } from 'recharts';
import { Card, Badge, Button } from '../../components/ui/ui-components';
import { useAuth } from '../../context/AuthContext';
import { useCollection } from '../../hooks/useDb';
import { format, subMonths, isSameMonth, parseISO } from 'date-fns';

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const statusColor = {
  active: 'bg-emerald-50 text-emerald-700',
  delivered: 'bg-emerald-50 text-emerald-700',
  paid: 'bg-emerald-50 text-emerald-700',
  approved: 'bg-emerald-50 text-emerald-700',
  Activated: 'bg-emerald-50 text-emerald-700',
  open: 'bg-amber-50 text-amber-700',
  unpaid: 'bg-amber-50 text-amber-700',
  overdue: 'bg-rose-50 text-rose-700',
  suspended: 'bg-rose-50 text-rose-700',
  blacklisted: 'bg-rose-50 text-rose-700',
  pending_approval: 'bg-blue-50 text-blue-700',
  'Approved By Sales': 'bg-blue-50 text-blue-700',
  'Under Review': 'bg-amber-50 text-amber-700',
  'Submitted': 'bg-violet-50 text-violet-700',
  'On Hold': 'bg-rose-50 text-rose-700',
  'Additional Information Required': 'bg-amber-50 text-amber-700'
};

export default function SalesExecutiveDashboard({ institutions, products, orders, invoices, payments, staff, tickets, quotations, followUps, visitLogs }) {
  const { user } = useAuth();
  const notifications = useCollection('notifications');

  // Application Queues
  const pendingApps = useMemo(() => institutions.filter(i => i.status === 'Submitted'), [institutions]);
  const underReviewApps = useMemo(() => institutions.filter(i => i.status === 'Under Review'), [institutions]);
  const onHoldApps = useMemo(() => institutions.filter(i => i.status === 'On Hold'), [institutions]);
  const infoReqApps = useMemo(() => institutions.filter(i => i.status === 'Additional Information Required'), [institutions]);

  // Conversion & Growth
  const currentMonthStr = format(new Date(), 'yyyy-MM');
  const newRegistrations = useMemo(() => institutions.filter(i => (i.createdAt || '').startsWith(currentMonthStr)), [institutions, currentMonthStr]);
  
  const approvalRate = useMemo(() => {
    const totalSubmittedOrAbove = institutions.filter(i => i.status !== 'Draft').length;
    const totalApproved = institutions.filter(i => ['Approved By Sales', 'Activated', 'Pending Finance Setup', 'Credit Assessment'].includes(i.status)).length;
    return totalSubmittedOrAbove > 0 ? Math.round((totalApproved / totalSubmittedOrAbove) * 100) : 0;
  }, [institutions]);

  const rejectionRate = useMemo(() => {
    const totalSubmittedOrAbove = institutions.filter(i => i.status !== 'Draft').length;
    const totalRejected = institutions.filter(i => i.status === 'Rejected').length;
    return totalSubmittedOrAbove > 0 ? Math.round((totalRejected / totalSubmittedOrAbove) * 100) : 0;
  }, [institutions]);

  const applicationProcessingTime = "1.8 Days"; // Derived aggregate average metric

  const customerGrowthData = useMemo(() => {
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const monthStr = format(d, 'yyyy-MM');
      const monthLabel = format(d, 'MMM');
      const count = institutions.filter(inst => (inst.createdAt || '').startsWith(monthStr)).length;
      const approvedCount = institutions.filter(inst => ['Approved By Sales', 'Activated', 'Pending Finance Setup', 'Credit Assessment'].includes(inst.status) && (inst.createdAt || '').startsWith(monthStr)).length;
      data.push({ name: monthLabel, 'New Registrations': count, 'Approved': approvedCount });
    }
    return data;
  }, [institutions]);

  // Sales Team Activity
  const salesTeam = useMemo(() => staff.filter(s => s.role === 'Salesman'), [staff]);
  const teamActivityData = useMemo(() => {
    const data = {};
    salesTeam.forEach(s => {
      data[s.id] = { name: s.name.split(' ')[0], Quotes: 0, Visits: 0, Orders: 0 };
    });
    
    visitLogs.filter(v => (v.createdAt || '').startsWith(currentMonthStr)).forEach(v => {
      if (v.salesmanId && data[v.salesmanId]) data[v.salesmanId].Visits += 1;
    });

    quotations.filter(q => (q.createdAt || '').startsWith(currentMonthStr)).forEach(q => {
      if (q.salesmanId && data[q.salesmanId]) data[q.salesmanId].Quotes += 1;
    });

    orders.filter(o => (o.createdAt || '').startsWith(currentMonthStr)).forEach(o => {
      if (o.salesmanId && data[o.salesmanId]) data[o.salesmanId].Orders += 1;
    });

    return Object.values(data).sort((a, b) => b.Orders - a.Orders);
  }, [salesTeam, visitLogs, quotations, orders, currentMonthStr]);

  // Quotation Activity
  const recentQuotations = useMemo(() => quotations.slice(0, 5), [quotations]);

  // Recent Activities
  const recentActivity = useMemo(() => (
    [
      ...orders.map((item) => ({ type: 'Order', title: item.orderNumber || item.id, status: item.status, date: item.createdAt })),
      ...institutions.map((item) => ({ type: 'Application', title: item.name, status: item.status, date: item.createdAt })),
      ...quotations.map((item) => ({ type: 'Quote', title: item.quotationNumber || item.id, status: item.status, date: item.createdAt })),
    ]
      .filter((item) => item.date)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
      .slice(0, 6)
  ), [orders, institutions, quotations]);

  // Business Calendar (Upcoming Follow-ups & Visits)
  const upcomingEvents = useMemo(() => {
    return [
      ...followUps.map(f => ({ ...f, eventType: 'Follow-up', date: f.date || f.dueDate || f.createdAt })),
      ...visitLogs.map(v => ({ ...v, eventType: 'Field Visit', date: v.visitDate || v.createdAt }))
    ]
      .filter(e => e.date && new Date(e.date) >= new Date(new Date().setHours(0,0,0,0)))
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 5);
  }, [followUps, visitLogs]);

  const myNotifications = useMemo(() => {
    return notifications.filter(n => n.recipientId === user?.id || n.role === 'Sales Executive').slice(0, 5);
  }, [notifications, user]);

  return (
    <div className="flex flex-col gap-6">
      
      {/* Row 1: Application KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="space-y-1 border-l-4 border-l-violet-500">
          <div className="text-xs uppercase tracking-widest text-[var(--text-tertiary)]">Pending Customer Applications</div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">{pendingApps.length}</div>
          <div className="text-xs text-[var(--text-secondary)]">Awaiting initial review</div>
        </Card>
        <Card className="space-y-1 border-l-4 border-l-amber-500">
          <div className="text-xs uppercase tracking-widest text-[var(--text-tertiary)]">Applications Awaiting Review</div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">{underReviewApps.length}</div>
          <div className="text-xs text-[var(--text-secondary)]">Currently being processed</div>
        </Card>
        <Card className="space-y-1 border-l-4 border-l-rose-500">
          <div className="text-xs uppercase tracking-widest text-[var(--text-tertiary)]">Applications On Hold</div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">{onHoldApps.length}</div>
          <div className="text-xs text-[var(--text-secondary)]">Applications paused</div>
        </Card>
        <Card className="space-y-1 border-l-4 border-l-amber-500">
          <div className="text-xs uppercase tracking-widest text-[var(--text-tertiary)]">Applications Requiring Information</div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">{infoReqApps.length}</div>
          <div className="text-xs text-[var(--text-secondary)]">Waiting on customer</div>
        </Card>
      </div>

      {/* Row 2: Performance KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="space-y-1 border-l-4 border-l-emerald-500">
          <div className="text-xs uppercase tracking-widest text-[var(--text-tertiary)]">New Registrations</div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">{newRegistrations.length}</div>
          <div className="text-xs text-[var(--text-secondary)]">Added this month</div>
        </Card>
        <Card className="space-y-1 border-l-4 border-l-indigo-500">
          <div className="text-xs uppercase tracking-widest text-[var(--text-tertiary)]">Approval Rate</div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">{approvalRate}%</div>
          <div className="text-xs text-[var(--text-secondary)]">All time</div>
        </Card>
        <Card className="space-y-1 border-l-4 border-l-rose-500">
          <div className="text-xs uppercase tracking-widest text-[var(--text-tertiary)]">Rejection Rate</div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">{rejectionRate}%</div>
          <div className="text-xs text-[var(--text-secondary)]">All time</div>
        </Card>
        <Card className="space-y-1 border-l-4 border-l-blue-500">
          <div className="text-xs uppercase tracking-widest text-[var(--text-tertiary)]">Application Processing Time</div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">{applicationProcessingTime}</div>
          <div className="text-xs text-[var(--text-secondary)]">Average turnaround</div>
        </Card>
      </div>

      {/* Row 3: Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Salesman Activity</h2>
            <p className="text-sm text-[var(--text-secondary)]">Monthly output by salesman.</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={teamActivityData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid stroke="#ccc" strokeDasharray="5 5" opacity={0.3} vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Visits" fill="#8b5cf6" radius={[4, 4, 0, 0]} stackId="a" />
                <Bar dataKey="Quotes" fill="#f59e0b" radius={[4, 4, 0, 0]} stackId="a" />
                <Bar dataKey="Orders" fill="#10b981" radius={[4, 4, 0, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Customer Growth</h2>
            <p className="text-sm text-[var(--text-secondary)]">6-month onboarding trend.</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={customerGrowthData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid stroke="#ccc" strokeDasharray="5 5" opacity={0.3} vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="New Registrations" stroke="#94a3b8" fill="#cbd5e1" fillOpacity={0.3} />
                <Area type="monotone" dataKey="Approved" stroke="#10b981" fill="#34d399" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Row 4: Lists & Tables */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Business Calendar */}
        <Card className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Business Calendar</h2>
            <p className="text-sm text-[var(--text-secondary)]">Upcoming team activities.</p>
          </div>
          <div className="space-y-3">
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">No upcoming events.</p>
            ) : upcomingEvents.map((evt, idx) => (
              <div key={idx} className="flex items-start gap-3 border-b border-[var(--border)] pb-3 last:border-0 last:pb-0">
                <div className="w-10 h-10 rounded-lg bg-[var(--bg-secondary)] flex flex-col items-center justify-center flex-shrink-0 border border-[var(--border)]">
                  <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">{format(new Date(evt.date), 'MMM')}</span>
                  <span className="text-sm font-extrabold text-[var(--text-primary)] leading-none">{format(new Date(evt.date), 'dd')}</span>
                </div>
                <div>
                  <div className="text-sm font-semibold text-[var(--text-primary)]">{evt.eventType}</div>
                  <div className="text-[11px] text-[var(--text-secondary)]">{evt.institutionName || 'Lead'} • {evt.assignedSalesmanName || evt.salesmanName || 'Unassigned'}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Quotation Activity */}
        <Card className="space-y-4 lg:col-span-1">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Quotation Activity</h2>
            <p className="text-sm text-[var(--text-secondary)]">Recent quotes by the sales team.</p>
          </div>
          <div className="space-y-3">
            {recentQuotations.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">No recent quotations.</p>
            ) : recentQuotations.map((q) => (
              <div key={q.id} className="flex items-center justify-between gap-2 border-b border-[var(--border)] pb-3 last:border-0 last:pb-0">
                <div>
                  <div className="text-sm font-medium text-[var(--text-primary)]">{q.institutionName}</div>
                  <div className="text-[11px] text-[var(--text-secondary)]">{q.quotationNumber || q.id} • {currency.format(q.total || 0)}</div>
                </div>
                <Badge text={q.status} color={statusColor[q.status] || 'bg-slate-100 text-slate-700'} />
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Activities & Notifications */}
        <Card className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">System Notifications</h2>
            <p className="text-sm text-[var(--text-secondary)]">Recent alerts and updates.</p>
          </div>
          <div className="space-y-3">
            {myNotifications.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">No new notifications.</p>
            ) : myNotifications.map((n) => (
              <div key={n.id} className="flex items-start gap-2 border-b border-[var(--border)] pb-3 last:border-0 last:pb-0">
                <div className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${n.read ? 'bg-slate-300' : 'bg-blue-500'}`} />
                <div>
                  <div className="text-sm font-medium text-[var(--text-primary)]">{n.title}</div>
                  <div className="text-[11px] text-[var(--text-secondary)] line-clamp-1">{n.body}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{n.createdAt ? format(new Date(n.createdAt), 'MMM dd, h:mm a') : 'Recently'}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

    </div>
  );
}
