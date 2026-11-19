import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axiosClient from '../../api/axiosClient.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Input } from '../../components/common/Input.jsx';
import { Select } from '../../components/common/Select.jsx';
import { Modal } from '../../components/common/Modal.jsx';
import { StatusBadge } from '../../components/common/Badge.jsx';
import { Pagination } from '../../components/common/Pagination.jsx';
import { TableSkeleton } from '../../components/common/Skeleton.jsx';
import { EmptyState } from '../../components/common/EmptyState.jsx';
import {
  CalendarCheck,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  Clock,
  Phone,
  Mail,
  Video,
  ListTodo,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

const followUpSchema = z
  .object({
    relatedType: z.enum(['Customer', 'Lead', 'Opportunity']),
    relatedId: z.string().min(1, 'Please select the associated record.'),
    followUpDate: z.string().min(1, 'Date is required.'),
    followUpType: z.enum(['Call', 'Meeting', 'Email', 'Task']).default('Call'),
    subject: z.string().trim().min(2, 'Subject is required.').max(150),
    remarks: z.string().trim().max(1000).optional().default(''),
    status: z.enum(['Planned', 'Completed', 'Missed', 'Cancelled']).default('Planned'),
    assignedTo: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.status === 'Planned') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const fDate = new Date(data.followUpDate);
        return fDate >= today;
      }
      return true;
    },
    {
      message: 'Follow-up date cannot be earlier than today for a new/planned follow-up.',
      path: ['followUpDate'],
    }
  );

export const FollowUpsPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [filterType, setFilterType] = useState(''); // '', 'upcoming', 'overdue', 'today', 'pending'
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // Modals state
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [completingFollowUp, setCompletingFollowUp] = useState(null);
  const [completionRemarks, setCompletionRemarks] = useState('');
  const [reschedulingFollowUp, setReschedulingFollowUp] = useState(null);
  const [newRescheduleDate, setNewRescheduleDate] = useState('');

  // Fetch Follow-Ups
  const { data, isLoading } = useQuery({
    queryKey: ['followups', page, limit, search, statusFilter, filterType],
    queryFn: async () => {
      let url = `/followups?page=${page}&limit=${limit}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (statusFilter) url += `&status=${encodeURIComponent(statusFilter)}`;
      if (filterType) url += `&filterType=${encodeURIComponent(filterType)}`;
      const res = await axiosClient.get(url);
      return res;
    },
  });

  // Fetch related collections for selection
  const { data: customersData } = useQuery({
    queryKey: ['customers-list-mini'],
    queryFn: async () => {
      const res = await axiosClient.get('/customers?limit=100');
      return res.data || [];
    },
  });

  const { data: leadsData } = useQuery({
    queryKey: ['leads-list-mini'],
    queryFn: async () => {
      const res = await axiosClient.get('/leads?limit=100');
      return res.data || [];
    },
  });

  const { data: oppsData } = useQuery({
    queryKey: ['opps-list-mini'],
    queryFn: async () => {
      const res = await axiosClient.get('/opportunities?limit=100');
      return res.data || [];
    },
  });

  const { data: assigneesData } = useQuery({
    queryKey: ['assignees'],
    queryFn: async () => {
      const res = await axiosClient.get('/users/assignees');
      return res.data || [];
    },
    enabled: user?.role !== 'Sales Executive',
  });

  const followUps = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
  const meta = data?.meta || { total: 0, totalPages: 1 };

  const customersList = Array.isArray(customersData)
    ? customersData
    : Array.isArray(customersData?.data)
    ? customersData.data
    : [];
  const leadsList = Array.isArray(leadsData)
    ? leadsData
    : Array.isArray(leadsData?.data)
    ? leadsData.data
    : [];
  const oppsList = Array.isArray(oppsData)
    ? oppsData
    : Array.isArray(oppsData?.data)
    ? oppsData.data
    : [];
  const assigneesList = Array.isArray(assigneesData)
    ? assigneesData
    : Array.isArray(assigneesData?.data)
    ? assigneesData.data
    : [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: (newFU) => axiosClient.post('/followups', newFU),
    onSuccess: () => {
      toast.success('Follow-up scheduled successfully.');
      queryClient.invalidateQueries({ queryKey: ['followups'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setIsScheduleOpen(false);
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to schedule follow-up.');
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status, remarks }) =>
      axiosClient.patch(`/followups/${id}/status`, { status, remarks }),
    onSuccess: () => {
      toast.success('Follow-up updated successfully.');
      queryClient.invalidateQueries({ queryKey: ['followups'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setCompletingFollowUp(null);
      setCompletionRemarks('');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to update follow-up.');
    },
  });

  const rescheduleMutation = useMutation({
    mutationFn: ({ id, followUpDate }) =>
      axiosClient.put(`/followups/${id}`, { followUpDate }),
    onSuccess: () => {
      toast.success('Follow-up rescheduled.');
      queryClient.invalidateQueries({ queryKey: ['followups'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setReschedulingFollowUp(null);
      setNewRescheduleDate('');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to reschedule.');
    },
  });

  const getTypeIcon = (type) => {
    switch (type) {
      case 'Call':
        return <Phone className="w-4 h-4 text-sky-600" />;
      case 'Meeting':
        return <Video className="w-4 h-4 text-purple-600" />;
      case 'Email':
        return <Mail className="w-4 h-4 text-indigo-600" />;
      case 'Task':
      default:
        return <ListTodo className="w-4 h-4 text-amber-600" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Follow-Up Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Schedule customer check-ins, reminders, meetings, and prevent overdue tasks
          </p>
        </div>

        <Button variant="primary" icon={Plus} onClick={() => setIsScheduleOpen(true)}>
          Schedule Follow-Up
        </Button>
      </div>

      {/* Quick Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { label: 'All Tasks', value: '' },
          { label: 'Upcoming', value: 'upcoming' },
          { label: 'Today', value: 'today' },
          { label: 'Overdue', value: 'overdue' },
          { label: 'Pending', value: 'pending' },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setFilterType(tab.value);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              filterType === tab.value
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search follow-ups by subject..."
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
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'Planned', label: 'Planned' },
              { value: 'Completed', label: 'Completed' },
              { value: 'Missed', label: 'Missed' },
              { value: 'Cancelled', label: 'Cancelled' },
            ]}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : followUps.length === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            title="No follow-up items found"
            description="You are caught up! No tasks match the selected filter."
            actionText="Schedule Follow-Up"
            onAction={() => setIsScheduleOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Type & Subject</th>
                  <th className="py-3.5 px-4">Associated Entity</th>
                  <th className="py-3.5 px-4">Follow-Up Date</th>
                  <th className="py-3.5 px-4">Assigned To</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {followUps.map((f) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const isOverdue = f.status === 'Planned' && new Date(f.followUpDate) < today;

                  return (
                    <tr key={f._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 shrink-0">
                            {getTypeIcon(f.followUpType)}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">{f.subject}</span>
                            {f.remarks && (
                              <span className="text-[11px] text-slate-500 line-clamp-1">{f.remarks}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                            {f.relatedType}
                          </span>
                          <span className="font-semibold text-slate-800">
                            {f.relatedEntity?.name || f.relatedEntity?.customerCode || 'Record'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-semibold ${
                              isOverdue ? 'text-rose-600 flex items-center gap-1' : 'text-slate-800'
                            }`}
                          >
                            {isOverdue && <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />}
                            {new Date(f.followUpDate).toLocaleDateString()}
                          </span>
                          {isOverdue && (
                            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded">
                              Overdue
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-medium text-slate-800">{f.assignedTo?.name}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <StatusBadge status={f.status} />
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {f.status === 'Planned' && (
                            <>
                              <button
                                onClick={() => setCompletingFollowUp(f)}
                                className="px-2 py-1 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                                title="Mark Completed"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Complete
                              </button>
                              <button
                                onClick={() => {
                                  setReschedulingFollowUp(f);
                                  setNewRescheduleDate(
                                    new Date(f.followUpDate).toISOString().split('T')[0]
                                  );
                                }}
                                className="px-2 py-1 rounded-lg text-amber-700 bg-amber-50 hover:bg-amber-100 font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                                title="Reschedule Date"
                              >
                                <Calendar className="w-3.5 h-3.5" /> Reschedule
                              </button>
                            </>
                          )}
                          {f.status === 'Completed' && (
                            <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Done
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
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

      {/* SCHEDULE FOLLOW-UP MODAL */}
      <Modal
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
        title="Schedule Follow-Up Task"
        description="Set date and channel to contact or follow up with accounts."
        maxWidth="max-w-lg"
      >
        <FollowUpForm
          customers={customersList}
          leads={leadsList}
          opportunities={oppsList}
          assignees={assigneesList}
          canAssign={user?.role !== 'Sales Executive'}
          onSubmit={(values) => createMutation.mutate(values)}
          onCancel={() => setIsScheduleOpen(false)}
          loading={createMutation.isPending}
        />
      </Modal>

      {/* MARK COMPLETED MODAL */}
      <Modal
        isOpen={!!completingFollowUp}
        onClose={() => setCompletingFollowUp(null)}
        title="Complete Follow-Up"
        description={`Record notes and mark '${completingFollowUp?.subject}' as completed.`}
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Completion Remarks / Outcome
            </label>
            <textarea
              rows={3}
              value={completionRemarks}
              onChange={(e) => setCompletionRemarks(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
              placeholder="e.g. Call held successfully, client requested quote revision..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setCompletingFollowUp(null)}>
              Cancel
            </Button>
            <Button
              variant="success"
              onClick={() =>
                statusMutation.mutate({
                  id: completingFollowUp._id,
                  status: 'Completed',
                  remarks: completionRemarks,
                })
              }
              loading={statusMutation.isPending}
              icon={CheckCircle2}
            >
              Confirm Completion
            </Button>
          </div>
        </div>
      </Modal>

      {/* RESCHEDULE MODAL */}
      <Modal
        isOpen={!!reschedulingFollowUp}
        onClose={() => setReschedulingFollowUp(null)}
        title="Reschedule Follow-Up"
        description={`Choose a new date for '${reschedulingFollowUp?.subject}'.`}
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              New Date
            </label>
            <input
              type="date"
              value={newRescheduleDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setNewRescheduleDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setReschedulingFollowUp(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() =>
                rescheduleMutation.mutate({
                  id: reschedulingFollowUp._id,
                  followUpDate: newRescheduleDate,
                })
              }
              loading={rescheduleMutation.isPending}
            >
              Save New Date
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// Follow-Up Form
const FollowUpForm = ({ customers = [], leads = [], opportunities = [], assignees = [], canAssign, onSubmit, onCancel, loading }) => {
  const [relatedType, setRelatedType] = useState('Customer');
  const todayStr = new Date().toISOString().split('T')[0];

  const safeCustomers = Array.isArray(customers) ? customers : [];
  const safeLeads = Array.isArray(leads) ? leads : [];
  const safeOpportunities = Array.isArray(opportunities) ? opportunities : [];
  const safeAssignees = Array.isArray(assignees) ? assignees : [];

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(followUpSchema),
    defaultValues: {
      relatedType: 'Customer',
      followUpType: 'Call',
      followUpDate: todayStr,
      status: 'Planned',
    },
  });

  const getEntityOptions = () => {
    if (relatedType === 'Customer') {
      return safeCustomers.map((c) => ({ value: c._id, label: `${c.name} (${c.customerCode || 'CUST'})` }));
    }
    if (relatedType === 'Lead') {
      return safeLeads.map((l) => ({ value: l._id, label: `${l.name} (${l.leadCode || 'LEAD'})` }));
    }
    return safeOpportunities.map((o) => ({ value: o._id, label: `${o.name} (${o.opportunityCode || 'OPP'})` }));
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Relates To Entity <span className="text-rose-500">*</span>
          </label>
          <select
            value={relatedType}
            onChange={(e) => {
              setRelatedType(e.target.value);
              setValue('relatedType', e.target.value);
              setValue('relatedId', '');
            }}
            className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
          >
            <option value="Customer">Customer Account</option>
            <option value="Lead">Lead Prospect</option>
            <option value="Opportunity">Opportunity / Deal</option>
          </select>
        </div>

        <Select
          label="Select Entity Record"
          required
          options={getEntityOptions()}
          error={errors.relatedId?.message}
          {...register('relatedId')}
        />
      </div>

      <Input
        label="Follow-Up Subject"
        required
        placeholder="Contract review phone call"
        error={errors.subject?.message}
        {...register('subject')}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Communication Channel"
          options={['Call', 'Meeting', 'Email', 'Task']}
          error={errors.followUpType?.message}
          {...register('followUpType')}
        />

        <Input
          label="Follow-Up Date"
          type="date"
          required
          error={errors.followUpDate?.message}
          {...register('followUpDate')}
        />
      </div>

      {canAssign && (
        <Select
          label="Assigned User"
          options={safeAssignees.map((a) => ({
            value: a._id,
            label: `${a.name} (${a.role})`,
          }))}
          error={errors.assignedTo?.message}
          {...register('assignedTo')}
        />
      )}

      <div>
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
          Follow-up Instructions / Remarks
        </label>
        <textarea
          rows={3}
          className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
          placeholder="Points to discuss, agendas, or reminders..."
          {...register('remarks')}
        />
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
        <Button variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={loading}>
          Schedule
        </Button>
      </div>
    </form>
  );
};
