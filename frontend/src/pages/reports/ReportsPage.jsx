import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosClient from '../../api/axiosClient.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Button } from '../../components/common/Button.jsx';
import { StatusBadge } from '../../components/common/Badge.jsx';
import { TableSkeleton } from '../../components/common/Skeleton.jsx';
import { EmptyState } from '../../components/common/EmptyState.jsx';
import {
  BarChart3,
  Download,
  Users,
  Target,
  Briefcase,
  CalendarCheck,
  TrendingUp,
  Activity,
  FileText,
  Filter,
} from 'lucide-react';
import clsx from 'clsx';

export const ReportsPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('pipeline');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const tabs = [
    { id: 'pipeline', name: 'Pipeline Breakdown', icon: Briefcase },
    { id: 'conversion', name: 'Sales Conversion', icon: TrendingUp },
    { id: 'customers', name: 'Customer Report', icon: Users },
    { id: 'leads', name: 'Lead Report', icon: Target },
    { id: 'followups', name: 'Follow-Up Report', icon: CalendarCheck },
    { id: 'opportunities', name: 'Opportunity Report', icon: Briefcase },
    ...(user?.role !== 'Sales Executive'
      ? [{ id: 'user-activity', name: 'User Activity', icon: Activity }]
      : []),
    ...(user?.role !== 'Sales Executive'
      ? [{ id: 'audit', name: 'Audit Report', icon: FileText }]
      : []),
  ];

  // Fetch active report data
  const { data, isLoading } = useQuery({
    queryKey: ['report', activeTab, startDate, endDate],
    queryFn: async () => {
      let url = `/reports/${activeTab}`;
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const queryStr = params.toString();
      if (queryStr) url += `?${queryStr}`;
      const res = await axiosClient.get(url);
      return res.data;
    },
  });

  const handleExportCSV = (reportType) => {
    let url = `/api/v1/reports/${reportType}?format=csv`;
    if (startDate) url += `&startDate=${encodeURIComponent(startDate)}`;
    if (endDate) url += `&endDate=${encodeURIComponent(endDate)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Enterprise Reports Hub</h1>
          <p className="text-xs text-slate-500 mt-1">
            Generate and export role-scoped business intelligence, sales conversions, and customer analytics
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Date range filter */}
          <div className="flex items-center gap-2 text-xs bg-white p-1.5 rounded-xl border border-slate-200">
            <span className="text-slate-400 font-semibold pl-1">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border-none text-xs focus:ring-0 text-slate-700"
            />
            <span className="text-slate-400 font-semibold">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border-none text-xs focus:ring-0 text-slate-700"
            />
          </div>

          <Button
            variant="outline"
            icon={Download}
            onClick={() => handleExportCSV(activeTab)}
          >
            Export to CSV
          </Button>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200/80">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer',
                isActive
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.name}
            </button>
          );
        })}
      </div>

      {/* Report Content */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
        {isLoading ? (
          <TableSkeleton rows={8} cols={5} />
        ) : (
          <div>
            {activeTab === 'pipeline' && <PipelineReportView data={data} />}
            {activeTab === 'conversion' && <ConversionReportView data={data} />}
            {activeTab === 'customers' && <CustomerReportView data={data} />}
            {activeTab === 'leads' && <LeadReportView data={data} />}
            {activeTab === 'followups' && <FollowUpReportView data={data} />}
            {activeTab === 'opportunities' && <OpportunityReportView data={data} />}
            {activeTab === 'user-activity' && <UserActivityReportView data={data} />}
            {activeTab === 'audit' && <AuditReportView data={data} />}
          </div>
        )}
      </div>
    </div>
  );
};

// 1. Pipeline Breakdown View
const PipelineReportView = ({ data }) => {
  const byStage = data?.byStage || [];
  const byOwner = data?.byOwner || [];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold text-slate-900 mb-2">Stage-Wise Pipeline Distribution</h3>
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
              <th className="py-2.5 px-3">Stage</th>
              <th className="py-2.5 px-3">Deals Count</th>
              <th className="py-2.5 px-3">Total Pipeline Value</th>
              <th className="py-2.5 px-3">Weighted Expected Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {byStage.map((s) => (
              <tr key={s._id}>
                <td className="py-2.5 px-3 font-semibold text-slate-800">{s._id}</td>
                <td className="py-2.5 px-3">{s.count}</td>
                <td className="py-2.5 px-3 font-bold text-slate-900">${s.totalAmount.toLocaleString()}</td>
                <td className="py-2.5 px-3 font-bold text-indigo-600">${Math.round(s.weightedAmount).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {byOwner.length > 0 && (
        <div className="pt-4 border-t border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 mb-2">Owner-Wise Sales Rep Pipeline</h3>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
                <th className="py-2.5 px-3">Sales Rep</th>
                <th className="py-2.5 px-3">Assigned Deals</th>
                <th className="py-2.5 px-3">Total Value</th>
                <th className="py-2.5 px-3">Weighted Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {byOwner.map((o) => (
                <tr key={o.ownerId}>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">{o.ownerName} ({o.ownerEmail})</td>
                  <td className="py-2.5 px-3">{o.count}</td>
                  <td className="py-2.5 px-3 font-bold text-slate-900">${o.totalAmount.toLocaleString()}</td>
                  <td className="py-2.5 px-3 font-bold text-indigo-600">${Math.round(o.weightedAmount).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// 2. Conversion Report View
const ConversionReportView = ({ data }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Total Leads</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{data?.totalLeads || 0}</p>
        </div>
        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
          <span className="text-[11px] font-bold text-emerald-700 uppercase">Converted Leads</span>
          <p className="text-2xl font-bold text-emerald-800 mt-1">{data?.convertedLeads || 0}</p>
        </div>
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Unconverted Leads</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{data?.unconvertedLeads || 0}</p>
        </div>
        <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-200">
          <span className="text-[11px] font-bold text-indigo-700 uppercase">Conversion Rate</span>
          <p className="text-2xl font-bold text-indigo-800 mt-1">{data?.conversionRate || '0%'}</p>
        </div>
      </div>

      <div>
        <h4 className="text-xs font-bold text-slate-800 uppercase mb-2">Deal Outcomes Status</h4>
        <div className="grid grid-cols-3 gap-3">
          {(data?.opportunityOutcomes || []).map((outcome) => (
            <div key={outcome._id} className="p-3 bg-white rounded-xl border border-slate-200 text-xs">
              <span className="font-semibold text-slate-600 block">{outcome._id} Deals</span>
              <p className="font-extrabold text-base text-slate-900 mt-1">
                ${(outcome.totalValue || 0).toLocaleString()} ({outcome.count} deals)
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// 3. Customer Report View
const CustomerReportView = ({ data = [] }) => (
  <table className="w-full text-left border-collapse text-xs">
    <thead>
      <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
        <th className="py-2.5 px-3">Code</th>
        <th className="py-2.5 px-3">Customer Name</th>
        <th className="py-2.5 px-3">Email</th>
        <th className="py-2.5 px-3">Phone</th>
        <th className="py-2.5 px-3">Owner</th>
        <th className="py-2.5 px-3">Status</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-slate-100">
      {data.map((c) => (
        <tr key={c._id}>
          <td className="py-2.5 px-3 font-mono text-indigo-600">{c.customerCode}</td>
          <td className="py-2.5 px-3 font-bold text-slate-900">{c.name}</td>
          <td className="py-2.5 px-3 text-slate-600">{c.email}</td>
          <td className="py-2.5 px-3 text-slate-600">{c.phone}</td>
          <td className="py-2.5 px-3">{c.assignedTo?.name}</td>
          <td className="py-2.5 px-3"><StatusBadge status={c.status} /></td>
        </tr>
      ))}
    </tbody>
  </table>
);

// 4. Lead Report View
const LeadReportView = ({ data = [] }) => (
  <table className="w-full text-left border-collapse text-xs">
    <thead>
      <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
        <th className="py-2.5 px-3">Code</th>
        <th className="py-2.5 px-3">Lead Name</th>
        <th className="py-2.5 px-3">Source</th>
        <th className="py-2.5 px-3">Priority</th>
        <th className="py-2.5 px-3">Expected Deal</th>
        <th className="py-2.5 px-3">Owner</th>
        <th className="py-2.5 px-3">Status</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-slate-100">
      {data.map((l) => (
        <tr key={l._id}>
          <td className="py-2.5 px-3 font-mono text-indigo-600">{l.leadCode}</td>
          <td className="py-2.5 px-3 font-bold text-slate-900">{l.name}</td>
          <td className="py-2.5 px-3 text-slate-600">{l.source}</td>
          <td className="py-2.5 px-3"><StatusBadge status={l.priority} /></td>
          <td className="py-2.5 px-3 font-semibold">${(l.expectedValue || 0).toLocaleString()}</td>
          <td className="py-2.5 px-3">{l.assignedTo?.name}</td>
          <td className="py-2.5 px-3"><StatusBadge status={l.status} /></td>
        </tr>
      ))}
    </tbody>
  </table>
);

// 5. Follow-Up Report View
const FollowUpReportView = ({ data = [] }) => (
  <table className="w-full text-left border-collapse text-xs">
    <thead>
      <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
        <th className="py-2.5 px-3">Subject</th>
        <th className="py-2.5 px-3">Channel</th>
        <th className="py-2.5 px-3">Related Type</th>
        <th className="py-2.5 px-3">Date</th>
        <th className="py-2.5 px-3">Owner</th>
        <th className="py-2.5 px-3">Status</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-slate-100">
      {data.map((f) => (
        <tr key={f._id}>
          <td className="py-2.5 px-3 font-bold text-slate-900">{f.subject}</td>
          <td className="py-2.5 px-3 text-slate-600">{f.followUpType}</td>
          <td className="py-2.5 px-3 text-slate-600">{f.relatedType}</td>
          <td className="py-2.5 px-3 font-semibold">{new Date(f.followUpDate).toLocaleDateString()}</td>
          <td className="py-2.5 px-3">{f.assignedTo?.name}</td>
          <td className="py-2.5 px-3"><StatusBadge status={f.status} /></td>
        </tr>
      ))}
    </tbody>
  </table>
);

// 6. Opportunity Report View
const OpportunityReportView = ({ data = [] }) => (
  <table className="w-full text-left border-collapse text-xs">
    <thead>
      <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
        <th className="py-2.5 px-3">Code</th>
        <th className="py-2.5 px-3">Deal Name</th>
        <th className="py-2.5 px-3">Customer</th>
        <th className="py-2.5 px-3">Amount</th>
        <th className="py-2.5 px-3">Stage</th>
        <th className="py-2.5 px-3">Close Date</th>
        <th className="py-2.5 px-3">Owner</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-slate-100">
      {data.map((o) => (
        <tr key={o._id}>
          <td className="py-2.5 px-3 font-mono text-indigo-600">{o.opportunityCode}</td>
          <td className="py-2.5 px-3 font-bold text-slate-900">{o.name}</td>
          <td className="py-2.5 px-3 text-slate-600">{o.customer?.name}</td>
          <td className="py-2.5 px-3 font-bold text-slate-900">${o.amount?.toLocaleString()}</td>
          <td className="py-2.5 px-3"><StatusBadge status={o.stage} /></td>
          <td className="py-2.5 px-3">{new Date(o.expectedCloseDate).toLocaleDateString()}</td>
          <td className="py-2.5 px-3">{o.assignedTo?.name}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

// 7. User Activity Report View
const UserActivityReportView = ({ data = [] }) => (
  <table className="w-full text-left border-collapse text-xs">
    <thead>
      <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
        <th className="py-2.5 px-3">Staff Name</th>
        <th className="py-2.5 px-3">Role</th>
        <th className="py-2.5 px-3">Total Actions</th>
        <th className="py-2.5 px-3">Calls Held</th>
        <th className="py-2.5 px-3">Meetings</th>
        <th className="py-2.5 px-3">Emails</th>
        <th className="py-2.5 px-3">Tasks</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-slate-100">
      {data.map((u) => (
        <tr key={u.userId}>
          <td className="py-2.5 px-3 font-bold text-slate-900">{u.name} ({u.email})</td>
          <td className="py-2.5 px-3 text-indigo-600 font-semibold">{u.role}</td>
          <td className="py-2.5 px-3 font-extrabold text-slate-900">{u.totalActivities}</td>
          <td className="py-2.5 px-3">{u.calls}</td>
          <td className="py-2.5 px-3">{u.meetings}</td>
          <td className="py-2.5 px-3">{u.emails}</td>
          <td className="py-2.5 px-3">{u.tasks}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

// 8. Audit Report View
const AuditReportView = ({ data }) => {
  const logs = data?.logs || [];
  return (
    <table className="w-full text-left border-collapse text-xs">
      <thead>
        <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
          <th className="py-2.5 px-3">Timestamp</th>
          <th className="py-2.5 px-3">User</th>
          <th className="py-2.5 px-3">Action</th>
          <th className="py-2.5 px-3">Module</th>
          <th className="py-2.5 px-3">Details</th>
          <th className="py-2.5 px-3">Result</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {logs.map((l) => (
          <tr key={l._id}>
            <td className="py-2.5 px-3 font-mono">{new Date(l.createdAt).toLocaleString()}</td>
            <td className="py-2.5 px-3 font-semibold">{l.userEmail}</td>
            <td className="py-2.5 px-3 font-bold text-indigo-600">{l.action}</td>
            <td className="py-2.5 px-3">{l.entityName}</td>
            <td className="py-2.5 px-3 text-slate-600 max-w-sm truncate">{l.details}</td>
            <td className="py-2.5 px-3"><StatusBadge status={l.result} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
