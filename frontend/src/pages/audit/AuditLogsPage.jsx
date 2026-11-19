import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosClient from '../../api/axiosClient.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Input } from '../../components/common/Input.jsx';
import { Select } from '../../components/common/Select.jsx';
import { Modal } from '../../components/common/Modal.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import { Pagination } from '../../components/common/Pagination.jsx';
import { TableSkeleton } from '../../components/common/Skeleton.jsx';
import { EmptyState } from '../../components/common/EmptyState.jsx';
import {
  FileText,
  Search,
  Filter,
  Eye,
  ShieldAlert,
  Calendar,
  User,
  Clock,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';

export const AuditLogsPage = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [viewingLog, setViewingLog] = useState(null);

  // Fetch Audit Logs
  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page, limit, search, actionFilter, entityFilter],
    queryFn: async () => {
      let url = `/reports/audit?page=${page}&limit=${limit}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (actionFilter) url += `&action=${encodeURIComponent(actionFilter)}`;
      if (entityFilter) url += `&entityName=${encodeURIComponent(entityFilter)}`;
      const res = await axiosClient.get(url);
      return res;
    },
  });

  const logs = data?.data || [];
  const meta = data?.meta || { total: 0, totalPages: 1 };

  const handleExportCSV = () => {
    window.open('/api/v1/reports/audit?format=csv', '_blank');
  };

  const getActionBadge = (action) => {
    switch (action) {
      case 'CREATE':
        return <Badge variant="emerald">{action}</Badge>;
      case 'CONVERT':
      case 'STAGE_CHANGE':
        return <Badge variant="purple">{action}</Badge>;
      case 'UPDATE':
      case 'RESCHEDULE':
        return <Badge variant="indigo">{action}</Badge>;
      case 'DELETE':
      case 'DEACTIVATE':
      case 'LOCKOUT':
      case 'LOGIN_FAILED':
        return <Badge variant="rose">{action}</Badge>;
      case 'LOGIN':
      case 'LOGOUT':
      case 'UNLOCK':
        return <Badge variant="sky">{action}</Badge>;
      default:
        return <Badge variant="slate">{action}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">System Audit Trail</h1>
          <p className="text-xs text-slate-500 mt-1">
            Immutable log of all business CRUD operations, status changes, and authentication events
          </p>
        </div>

        <Button variant="outline" icon={Download} onClick={handleExportCSV}>
          Export Audit CSV
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by details, user email, action, or entity..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-colors"
          />
        </div>

        <div className="w-full sm:w-44">
          <Select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            options={[
              { value: '', label: 'All Actions' },
              { value: 'LOGIN', label: 'LOGIN' },
              { value: 'LOGIN_FAILED', label: 'LOGIN_FAILED' },
              { value: 'LOGOUT', label: 'LOGOUT' },
              { value: 'CREATE', label: 'CREATE' },
              { value: 'UPDATE', label: 'UPDATE' },
              { value: 'DELETE', label: 'DELETE' },
              { value: 'CONVERT', label: 'CONVERT' },
              { value: 'STAGE_CHANGE', label: 'STAGE_CHANGE' },
              { value: 'STATUS_CHANGE', label: 'STATUS_CHANGE' },
              { value: 'RESCHEDULE', label: 'RESCHEDULE' },
              { value: 'ROLE_CHANGE', label: 'ROLE_CHANGE' },
              { value: 'LOCKOUT', label: 'LOCKOUT' },
              { value: 'UNLOCK', label: 'UNLOCK' },
            ]}
          />
        </div>

        <div className="w-full sm:w-40">
          <Select
            value={entityFilter}
            onChange={(e) => {
              setEntityFilter(e.target.value);
              setPage(1);
            }}
            options={[
              { value: '', label: 'All Modules' },
              { value: 'Customer', label: 'Customer' },
              { value: 'Lead', label: 'Lead' },
              { value: 'Opportunity', label: 'Opportunity' },
              { value: 'FollowUp', label: 'FollowUp' },
              { value: 'Activity', label: 'Activity' },
              { value: 'User', label: 'User' },
              { value: 'Authentication', label: 'Authentication' },
            ]}
          />
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={8} cols={6} />
        ) : logs.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No audit entries"
            description="No log events match your query."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">User & Role</th>
                  <th className="py-3.5 px-4">Action</th>
                  <th className="py-3.5 px-4">Entity / Module</th>
                  <th className="py-3.5 px-4">Summary Details</th>
                  <th className="py-3.5 px-4">Result</th>
                  <th className="py-3.5 px-4 text-right">Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-bold text-slate-900 block">{log.userEmail}</span>
                        <span className="text-[10px] text-indigo-600 font-semibold">{log.role}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">{getActionBadge(log.action)}</td>

                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        {log.entityName}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="text-slate-800 line-clamp-1 max-w-xs">{log.details}</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <Badge variant={log.result === 'SUCCESS' ? 'emerald' : 'rose'}>
                        {log.result}
                      </Badge>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {(log.oldValue || log.newValue) && (
                        <button
                          onClick={() => setViewingLog(log)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                          title="View Changes Payload"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          page={page}
          totalPages={meta.totalPages}
          total={meta.total}
          limit={limit}
          onPageChange={setPage}
        />
      </div>

      {/* DIFF / PAYLOAD MODAL */}
      <Modal
        isOpen={!!viewingLog}
        onClose={() => setViewingLog(null)}
        title="Audit Event Details"
        description={`Action: ${viewingLog?.action} on ${viewingLog?.entityName} (${viewingLog?.recordId})`}
        maxWidth="max-w-2xl"
      >
        {viewingLog && (
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <p className="font-semibold text-slate-900">{viewingLog.details}</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Recorded by {viewingLog.userEmail} on {new Date(viewingLog.createdAt).toLocaleString()} (IP: {viewingLog.ipAddress || '127.0.0.1'})
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="font-bold text-slate-700 block mb-1">Previous State (Old Value):</span>
                <pre className="p-3 bg-slate-900 text-slate-200 rounded-xl overflow-x-auto text-[11px] max-h-60 font-mono">
                  {viewingLog.oldValue
                    ? JSON.stringify(viewingLog.oldValue, null, 2)
                    : '// No previous record state'}
                </pre>
              </div>

              <div>
                <span className="font-bold text-slate-700 block mb-1">New State (Saved Value):</span>
                <pre className="p-3 bg-slate-900 text-slate-200 rounded-xl overflow-x-auto text-[11px] max-h-60 font-mono">
                  {viewingLog.newValue
                    ? JSON.stringify(viewingLog.newValue, null, 2)
                    : '// No new record state'}
                </pre>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
