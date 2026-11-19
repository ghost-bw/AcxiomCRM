import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosClient from '../../api/axiosClient.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { StatCard } from '../../components/common/StatCard.jsx';
import { StatusBadge } from '../../components/common/Badge.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Skeleton } from '../../components/common/Skeleton.jsx';
import {
  Users,
  Target,
  Briefcase,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
} from 'recharts';

export const DashboardPage = () => {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState('All Time');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard', dateRange],
    queryFn: async () => {
      const res = await axiosClient.get(`/dashboard?dateRange=${encodeURIComponent(dateRange)}`);
      return res.data;
    },
  });

  const kpis = data?.kpis || {};
  const charts = data?.charts || {};
  const recent = data?.recent || {};

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Date Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {user?.role} Scope
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time customer metrics, sales pipeline, and upcoming follow-ups
          </p>
        </div>

        {/* Date Filter Pills */}
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
          <Filter className="w-3.5 h-3.5 text-slate-400 ml-2 mr-1" />
          {['Today', 'This Week', 'This Month', 'All Time'].map((r) => (
            <button
              key={r}
              onClick={() => setDateRange(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                dateRange === r
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Customers"
            value={kpis.totalCustomers ?? 0}
            subtitle="Active accounts in scope"
            icon={Users}
            color="indigo"
          />
          <StatCard
            title="Total Leads"
            value={kpis.totalLeads ?? 0}
            subtitle={`${kpis.openLeads ?? 0} active prospects`}
            icon={Target}
            color="sky"
          />
          <StatCard
            title="Open Opportunities"
            value={kpis.openOpportunities ?? 0}
            subtitle={`Out of ${kpis.totalOpportunities ?? 0} total deals`}
            icon={Briefcase}
            color="amber"
          />
          <StatCard
            title="Total Pipeline"
            value={formatCurrency(kpis.totalPipelineValue)}
            subtitle={`Weighted: ${formatCurrency(kpis.weightedPipelineValue)}`}
            icon={DollarSign}
            color="emerald"
          />
          <StatCard
            title="Won Opportunities"
            value={kpis.wonOpportunities ?? 0}
            subtitle="Successfully closed deals"
            icon={CheckCircle2}
            color="emerald"
          />
          <StatCard
            title="Lost Opportunities"
            value={kpis.lostOpportunities ?? 0}
            subtitle="Closed lost deals"
            icon={XCircle}
            color="rose"
          />
          <StatCard
            title="Overdue Follow-ups"
            value={recent.overdueFollowUps?.length ?? 0}
            subtitle="Needs urgent attention"
            icon={AlertTriangle}
            color="rose"
          />
          <StatCard
            title="Upcoming Follow-ups"
            value={recent.upcomingFollowUps?.length ?? 0}
            subtitle="Scheduled activities"
            icon={CalendarCheck}
            color="purple"
          />
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Opportunity Pipeline by Stage */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Pipeline by Stage</h3>
              <p className="text-xs text-slate-500">Value of deals across sales stages</p>
            </div>
            <Link to="/opportunities" className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1">
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="h-64 w-full">
            {isLoading ? (
              <Skeleton className="w-full h-full rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.opportunityPipelineChart || []} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="stage" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(val) => `$${val / 1000}k`} />
                  <Tooltip
                    formatter={(val, name) => [
                      formatCurrency(val),
                      name === 'totalValue' ? 'Total Pipeline' : 'Weighted Pipeline',
                    ]}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                  <Bar dataKey="totalValue" fill="#6366f1" radius={[4, 4, 0, 0]} name="totalValue" />
                  <Bar dataKey="weightedValue" fill="#a5b4fc" radius={[4, 4, 0, 0]} name="weightedValue" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 2: Lead Status Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Lead Status Funnel</h3>
              <p className="text-xs text-slate-500">Volume of leads across qualification stages</p>
            </div>
            <Link to="/leads" className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1">
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="h-64 w-full">
            {isLoading ? (
              <Skeleton className="w-full h-full rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.leadStatusChart || []} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="status" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                  <Bar dataKey="count" fill="#0ea5e9" radius={[6, 6, 0, 0]} name="Lead Count" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 3: Monthly Sales Trend */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Monthly Sales & Pipeline Growth</h3>
              <p className="text-xs text-slate-500">Won revenue versus total created deal pipeline (Last 6 Months)</p>
            </div>
            <Link to="/reports" className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1">
              Full Reports <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="h-64 w-full">
            {isLoading ? (
              <Skeleton className="w-full h-full rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.monthlySalesChart || []} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="wonSalesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="pipelineGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(val) => `$${val / 1000}k`} />
                  <Tooltip
                    formatter={(val, name) => [formatCurrency(val), name === 'wonSales' ? 'Won Revenue' : 'New Pipeline']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="pipelineValue" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#pipelineGrad)" name="pipelineValue" />
                  <Area type="monotone" dataKey="wonSales" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#wonSalesGrad)" name="wonSales" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Actionable Follow-Ups & Recent Feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Urgent & Upcoming Follow-Ups */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Upcoming & Pending Follow-Ups</h3>
            </div>
            <Link to="/followups" className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold">
              Manage
            </Link>
          </div>

          <div className="space-y-2.5 flex-1">
            {recent.overdueFollowUps && recent.overdueFollowUps.length > 0 && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 mb-3">
                <span className="text-xs font-bold text-rose-800 flex items-center gap-1.5 mb-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  Overdue Follow-up ({recent.overdueFollowUps.length})
                </span>
                {recent.overdueFollowUps.map((f) => (
                  <div key={f._id} className="text-xs text-rose-700 flex justify-between items-center py-1">
                    <span className="font-medium truncate mr-2">{f.subject}</span>
                    <span className="text-[10px] shrink-0 font-semibold">{new Date(f.followUpDate).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}

            {recent.upcomingFollowUps && recent.upcomingFollowUps.length > 0 ? (
              recent.upcomingFollowUps.map((f) => (
                <div key={f._id} className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-900">{f.subject}</p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                      <span className="capitalize font-medium text-slate-700">{f.followUpType}</span>
                      <span>•</span>
                      <span>{new Date(f.followUpDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <StatusBadge status={f.status} />
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 text-center py-6">No scheduled follow-ups pending.</p>
            )}
          </div>
        </div>

        {/* Recent Customers and Leads */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Recent Customer Accounts</h3>
            </div>
            <Link to="/customers" className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold">
              View All
            </Link>
          </div>

          <div className="space-y-2.5 flex-1">
            {recent.recentCustomers && recent.recentCustomers.length > 0 ? (
              recent.recentCustomers.map((c) => (
                <div key={c._id} className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{c.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{c.customerCode}</span>
                    </div>
                    <p className="text-[11px] text-slate-500">{c.companyName || c.email}</p>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 text-center py-6">No customers recorded yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
