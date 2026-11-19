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
  Activity as ActivityIcon,
  Plus,
  Phone,
  Mail,
  Video,
  ListTodo,
  Calendar,
  Building2,
  User,
} from 'lucide-react';
import { toast } from 'sonner';

const activitySchema = z.object({
  activityType: z.enum(['Call', 'Meeting', 'Email', 'Task']),
  subject: z.string().trim().min(2, 'Subject is required.').max(150),
  description: z.string().trim().max(1000).optional().default(''),
  customer: z.string().optional(),
  lead: z.string().optional(),
  status: z.enum(['Pending', 'Completed', 'Cancelled']).default('Completed'),
});

export const ActivitiesPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [isLogOpen, setIsLogOpen] = useState(false);

  // Fetch activities
  const { data, isLoading } = useQuery({
    queryKey: ['activities', page, limit, typeFilter],
    queryFn: async () => {
      let url = `/activities?page=${page}&limit=${limit}`;
      if (typeFilter) url += `&activityType=${encodeURIComponent(typeFilter)}`;
      const res = await axiosClient.get(url);
      return res;
    },
  });

  // Fetch related customer options
  const { data: customersData } = useQuery({
    queryKey: ['customers-list-mini'],
    queryFn: async () => (await axiosClient.get('/customers?limit=100')).data || [],
  });

  // Fetch lead options
  const { data: leadsData } = useQuery({
    queryKey: ['leads-list-mini'],
    queryFn: async () => (await axiosClient.get('/leads?limit=100')).data || [],
  });

  const activities = data?.data || [];
  const meta = data?.meta || { total: 0, totalPages: 1 };

  // Log activity mutation
  const logMutation = useMutation({
    mutationFn: (newAct) => axiosClient.post('/activities', newAct),
    onSuccess: () => {
      toast.success('Activity logged successfully.');
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setIsLogOpen(false);
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to log activity.');
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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Activity Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Audit communication touches, client calls, email logs, and completed tasks
          </p>
        </div>

        <Button variant="primary" icon={Plus} onClick={() => setIsLogOpen(true)}>
          Log Activity
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {['', 'Call', 'Meeting', 'Email', 'Task'].map((type) => (
          <button
            key={type}
            onClick={() => {
              setTypeFilter(type);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              typeFilter === type
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {type === '' ? 'All Activities' : type}
          </button>
        ))}
      </div>

      {/* Activity Timeline Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : activities.length === 0 ? (
          <EmptyState
            icon={ActivityIcon}
            title="No activities recorded"
            description="Start logging sales calls, meetings, or completed tasks."
            actionText="Log Activity"
            onAction={() => setIsLogOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Activity</th>
                  <th className="py-3.5 px-4">Subject & Description</th>
                  <th className="py-3.5 px-4">Associated Entity</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Logged By</th>
                  <th className="py-3.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {activities.map((a) => (
                  <tr key={a._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                          {getTypeIcon(a.activityType)}
                        </div>
                        <span className="font-semibold text-slate-800">{a.activityType}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-bold text-slate-900 block">{a.subject}</span>
                        {a.description && (
                          <span className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                            {a.description}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-700">
                      {a.customer ? (
                        <div className="flex items-center gap-1 font-semibold">
                          <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                          <span>{a.customer.name}</span>
                        </div>
                      ) : a.lead ? (
                        <div className="flex items-center gap-1 font-semibold">
                          <User className="w-3.5 h-3.5 text-sky-500" />
                          <span>{a.lead.name}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">General</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(a.activityDate).toLocaleDateString()}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-medium text-slate-800">{a.assignedTo?.name}</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusBadge status={a.status} />
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

      {/* LOG ACTIVITY MODAL */}
      <Modal
        isOpen={isLogOpen}
        onClose={() => setIsLogOpen(false)}
        title="Log Communication Activity"
        description="Record phone call notes, meeting summaries, or emails sent."
        maxWidth="max-w-lg"
      >
        <ActivityForm
          customers={customersData || []}
          leads={leadsData || []}
          onSubmit={(values) => logMutation.mutate(values)}
          onCancel={() => setIsLogOpen(false)}
          loading={logMutation.isPending}
        />
      </Modal>
    </div>
  );
};

const ActivityForm = ({ customers = [], leads = [], onSubmit, onCancel, loading }) => {
  const safeCustomers = Array.isArray(customers) ? customers : [];
  const safeLeads = Array.isArray(leads) ? leads : [];

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      activityType: 'Call',
      status: 'Completed',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Activity Channel"
          options={['Call', 'Meeting', 'Email', 'Task']}
          error={errors.activityType?.message}
          {...register('activityType')}
        />

        <Select
          label="Status"
          options={['Completed', 'Pending', 'Cancelled']}
          error={errors.status?.message}
          {...register('status')}
        />
      </div>

      <Input
        label="Subject"
        required
        placeholder="Reviewed updated contract pricing with CEO"
        error={errors.subject?.message}
        {...register('subject')}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Customer Account (Optional)"
          options={safeCustomers.map((c) => ({ value: c._id, label: `${c.name} (${c.customerCode || 'CUST'})` }))}
          error={errors.customer?.message}
          {...register('customer')}
        />

        <Select
          label="Lead Prospect (Optional)"
          options={safeLeads.map((l) => ({ value: l._id, label: `${l.name} (${l.leadCode || 'LEAD'})` }))}
          error={errors.lead?.message}
          {...register('lead')}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
          Detailed Discussion Notes
        </label>
        <textarea
          rows={3}
          className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
          placeholder="Client mentioned timeline for Q3, key decision makers..."
          {...register('description')}
        />
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
        <Button variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={loading}>
          Save Activity Log
        </Button>
      </div>
    </form>
  );
};
