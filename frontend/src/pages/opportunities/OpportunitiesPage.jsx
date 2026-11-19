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
import { ConfirmDialog } from '../../components/common/ConfirmDialog.jsx';
import { StatusBadge } from '../../components/common/Badge.jsx';
import { Pagination } from '../../components/common/Pagination.jsx';
import { TableSkeleton } from '../../components/common/Skeleton.jsx';
import { EmptyState } from '../../components/common/EmptyState.jsx';
import {
  Briefcase,
  Plus,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  Calendar,
  Building2,
  DollarSign,
  TrendingUp,
  LayoutGrid,
  List,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

const opportunitySchema = z
  .object({
    name: z.string().trim().min(2, 'Opportunity Name is required.').max(150),
    customer: z.string().min(1, 'Customer is required.'),
    amount: z.coerce.number().gt(0, 'Opportunity Amount must be greater than 0.'),
    stage: z.enum(['Qualification', 'Proposal', 'Negotiation', 'Won', 'Lost']).default('Qualification'),
    probability: z.coerce.number().min(0, 'Probability must be between 0 and 100.').max(100, 'Probability must be between 0 and 100.'),
    expectedCloseDate: z.string().min(1, 'Expected close date is required.'),
    assignedTo: z.string().optional(),
    notes: z.string().trim().max(1000).optional().default(''),
  })
  .refine(
    (data) => {
      if (data.stage !== 'Won' && data.stage !== 'Lost') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const closeDate = new Date(data.expectedCloseDate);
        return closeDate >= today;
      }
      return true;
    },
    {
      message: 'Expected Close Date cannot be in the past for an active Opportunity.',
      path: ['expectedCloseDate'],
    }
  );

export const OpportunitiesPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState('table'); // 'table' | 'pipeline'
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingOpp, setEditingOpp] = useState(null);
  const [deletingOpp, setDeletingOpp] = useState(null);
  const [viewingOpp, setViewingOpp] = useState(null);

  // Fetch Opportunities
  const { data, isLoading } = useQuery({
    queryKey: ['opportunities', page, limit, search, stageFilter, statusFilter],
    queryFn: async () => {
      let url = `/opportunities?page=${page}&limit=${limit}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (stageFilter) url += `&stage=${encodeURIComponent(stageFilter)}`;
      if (statusFilter) url += `&status=${encodeURIComponent(statusFilter)}`;
      const res = await axiosClient.get(url);
      return res;
    },
  });

  // Fetch Customers for select dropdown
  const { data: customersData } = useQuery({
    queryKey: ['customer-options'],
    queryFn: async () => {
      const res = await axiosClient.get('/customers?limit=100');
      return res.data || [];
    },
  });

  // Fetch Assignees
  const { data: assigneesData } = useQuery({
    queryKey: ['assignees'],
    queryFn: async () => {
      const res = await axiosClient.get('/users/assignees');
      return res.data || [];
    },
    enabled: user?.role !== 'Sales Executive',
  });

  const opportunities = data?.data || [];
  const meta = data?.meta || { total: 0, totalPages: 1 };

  // Mutations
  const createMutation = useMutation({
    mutationFn: (newOpp) => axiosClient.post('/opportunities', newOpp),
    onSuccess: () => {
      toast.success('Opportunity created successfully.');
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setIsCreateOpen(false);
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to create opportunity.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }) => axiosClient.put(`/opportunities/${id}`, updates),
    onSuccess: () => {
      toast.success('Opportunity updated successfully.');
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setEditingOpp(null);
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to update opportunity.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => axiosClient.delete(`/opportunities/${id}`),
    onSuccess: () => {
      toast.success('Opportunity deactivated successfully.');
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setDeletingOpp(null);
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to deactivate opportunity.');
    },
  });

  const STAGES = ['Qualification', 'Proposal', 'Negotiation', 'Won', 'Lost'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Opportunity Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage sales pipeline, deal stages, probability, and weighted revenue forecasts
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                viewMode === 'table' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('pipeline')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                viewMode === 'pipeline' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Pipeline Stages Kanban View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          <Button variant="primary" icon={Plus} onClick={() => setIsCreateOpen(true)}>
            Create Opportunity
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search deals by name or code..."
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
            value={stageFilter}
            onChange={(e) => {
              setStageFilter(e.target.value);
              setPage(1);
            }}
            options={[
              { value: '', label: 'All Stages' },
              { value: 'Qualification', label: 'Qualification' },
              { value: 'Proposal', label: 'Proposal' },
              { value: 'Negotiation', label: 'Negotiation' },
              { value: 'Won', label: 'Won' },
              { value: 'Lost', label: 'Lost' },
            ]}
          />
        </div>

        <div className="w-full sm:w-40">
          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'Open', label: 'Open' },
              { value: 'Won', label: 'Won' },
              { value: 'Lost', label: 'Lost' },
            ]}
          />
        </div>
      </div>

      {/* VIEW 1: TABLE VIEW */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {isLoading ? (
            <TableSkeleton rows={6} cols={6} />
          ) : opportunities.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title="No opportunities found"
              description="No active deals match your criteria."
              actionText="Create Opportunity"
              onAction={() => setIsCreateOpen(true)}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Deal / Opportunity</th>
                    <th className="py-3.5 px-4">Customer</th>
                    <th className="py-3.5 px-4">Amount & Weighted</th>
                    <th className="py-3.5 px-4">Stage & Prob.</th>
                    <th className="py-3.5 px-4">Expected Close</th>
                    <th className="py-3.5 px-4">Owner</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {opportunities.map((opp) => {
                    const weighted = Math.round((opp.amount * opp.probability) / 100);
                    return (
                      <tr key={opp._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div>
                            <span className="font-bold text-slate-900 block">{opp.name}</span>
                            <span className="font-mono text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-semibold mt-0.5 inline-block">
                              {opp.opportunityCode}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-slate-800 block">
                            {opp.customer?.name || 'Customer'}
                          </span>
                          <span className="text-[11px] text-slate-500">{opp.customer?.companyName}</span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div>
                            <span className="font-bold text-slate-900 text-sm">
                              ${opp.amount.toLocaleString()}
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              Weighted: ${weighted.toLocaleString()}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <StatusBadge status={opp.stage} />
                            <span className="text-[11px] text-slate-500 font-semibold">
                              ({opp.probability}%)
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-600">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {new Date(opp.expectedCloseDate).toLocaleDateString()}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-medium text-slate-800">{opp.assignedTo?.name}</span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setViewingOpp(opp)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingOpp(opp)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                              title="Edit Opportunity"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeletingOpp(opp)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Deactivate Opportunity"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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
      ) : (
        /* VIEW 2: PIPELINE KANBAN STAGES VIEW */
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto pb-4">
          {STAGES.map((stage) => {
            const stageOpps = opportunities.filter((o) => o.stage === stage);
            const totalStageVal = stageOpps.reduce((sum, o) => sum + o.amount, 0);

            return (
              <div key={stage} className="bg-slate-100/70 rounded-2xl p-3 border border-slate-200/80 flex flex-col min-w-[220px]">
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{stage}</h4>
                    <span className="text-[10px] text-slate-500 font-semibold">${totalStageVal.toLocaleString()}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-slate-700 border border-slate-200">
                    {stageOpps.length}
                  </span>
                </div>

                {/* Cards in this stage */}
                <div className="space-y-2 flex-1">
                  {stageOpps.length === 0 ? (
                    <div className="p-4 text-center text-[11px] text-slate-400 italic">No deals</div>
                  ) : (
                    stageOpps.map((opp) => (
                      <div
                        key={opp._id}
                        className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow cursor-pointer"
                        onClick={() => setViewingOpp(opp)}
                      >
                        <span className="text-xs font-bold text-slate-900 line-clamp-1">{opp.name}</span>
                        <span className="text-[10px] text-slate-500 block truncate">{opp.customer?.name}</span>

                        <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-100">
                          <span className="text-xs font-extrabold text-indigo-600">
                            ${opp.amount.toLocaleString()}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500">
                            {opp.probability}%
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE MODAL */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New Sales Opportunity"
        description="Enter deal particulars, expected close date, and probability."
        maxWidth="max-w-xl"
      >
        <OpportunityForm
          customers={customersData || []}
          assignees={assigneesData || []}
          canAssign={user?.role !== 'Sales Executive'}
          onSubmit={(values) => createMutation.mutate(values)}
          onCancel={() => setIsCreateOpen(false)}
          loading={createMutation.isPending}
        />
      </Modal>

      {/* EDIT MODAL */}
      <Modal
        isOpen={!!editingOpp}
        onClose={() => setEditingOpp(null)}
        title={`Edit Opportunity: ${editingOpp?.opportunityCode}`}
        description="Update stage, amount, probability, or close date."
        maxWidth="max-w-xl"
      >
        {editingOpp && (
          <OpportunityForm
            defaultValues={editingOpp}
            customers={customersData || []}
            assignees={assigneesData || []}
            canAssign={user?.role !== 'Sales Executive'}
            onSubmit={(values) => updateMutation.mutate({ id: editingOpp._id, updates: values })}
            onCancel={() => setEditingOpp(null)}
            loading={updateMutation.isPending}
          />
        )}
      </Modal>

      {/* DETAILS MODAL */}
      <Modal
        isOpen={!!viewingOpp}
        onClose={() => setViewingOpp(null)}
        title={`Deal Overview: ${viewingOpp?.opportunityCode}`}
        description="Full opportunity specifications and weighted value breakdown."
        maxWidth="max-w-md"
      >
        {viewingOpp && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{viewingOpp.name}</h4>
                  <span className="text-[11px] text-slate-500">{viewingOpp.customer?.name}</span>
                </div>
                <StatusBadge status={viewingOpp.status} />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Deal Amount</span>
                  <span className="font-extrabold text-base text-slate-900">${viewingOpp.amount?.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Weighted Value</span>
                  <span className="font-extrabold text-base text-indigo-600">
                    ${Math.round((viewingOpp.amount * viewingOpp.probability) / 100).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="pt-2 text-slate-600 space-y-1">
                <p>Stage: <span className="font-semibold text-slate-800">{viewingOpp.stage}</span></p>
                <p>Probability: <span className="font-semibold text-slate-800">{viewingOpp.probability}%</span></p>
                <p>Close Date: <span className="font-semibold text-slate-800">{new Date(viewingOpp.expectedCloseDate).toLocaleDateString()}</span></p>
                <p>Owner: <span className="font-semibold text-slate-800">{viewingOpp.assignedTo?.name}</span></p>
              </div>
            </div>

            {viewingOpp.notes && (
              <div>
                <span className="font-semibold text-slate-700 block mb-1">Deal Notes:</span>
                <p className="p-3 bg-white rounded-lg border border-slate-200 text-slate-600">{viewingOpp.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* CONFIRM DEACTIVATE */}
      <ConfirmDialog
        isOpen={!!deletingOpp}
        onClose={() => setDeletingOpp(null)}
        onConfirm={() => deleteMutation.mutate(deletingOpp._id)}
        title="Deactivate Opportunity"
        message={`Are you sure you want to deactivate ${deletingOpp?.name}?`}
        confirmText="Deactivate"
        loading={deleteMutation.isPending}
      />
    </div>
  );
};

// Opportunity Form Component
const OpportunityForm = ({ defaultValues, customers = [], assignees = [], canAssign, onSubmit, onCancel, loading }) => {
  const safeCustomers = Array.isArray(customers) ? customers : [];
  const safeAssignees = Array.isArray(assignees) ? assignees : [];
  const defaultCloseDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(opportunitySchema),
    defaultValues: defaultValues
      ? {
          name: defaultValues.name,
          customer: defaultValues.customer?._id || defaultValues.customer || '',
          amount: defaultValues.amount,
          stage: defaultValues.stage || 'Qualification',
          probability: defaultValues.probability,
          expectedCloseDate: defaultValues.expectedCloseDate
            ? new Date(defaultValues.expectedCloseDate).toISOString().split('T')[0]
            : defaultCloseDate,
          assignedTo: defaultValues.assignedTo?._id || defaultValues.assignedTo || '',
          notes: defaultValues.notes || '',
        }
      : {
          stage: 'Qualification',
          probability: 25,
          amount: 25000,
          expectedCloseDate: defaultCloseDate,
        },
  });

  const amountVal = watch('amount', 0);
  const probVal = watch('probability', 0);
  const weightedCalc = Math.round((Number(amountVal || 0) * Number(probVal || 0)) / 100);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Opportunity Name"
        required
        placeholder="Apex Global Cloud Integration"
        error={errors.name?.message}
        {...register('name')}
      />

      <Select
        label="Customer Account"
        required
        options={safeCustomers.map((c) => ({
          value: c._id,
          label: `${c.name} (${c.customerCode || 'CUST'})`,
        }))}
        error={errors.customer?.message}
        {...register('customer')}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Deal Amount ($) > 0"
          type="number"
          step="100"
          required
          placeholder="50000"
          error={errors.amount?.message}
          {...register('amount')}
        />

        <Input
          label="Probability (0 - 100%)"
          type="number"
          min="0"
          max="100"
          required
          placeholder="25"
          error={errors.probability?.message}
          {...register('probability')}
        />
      </div>

      {/* Real-time weighted formula preview */}
      <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 flex items-center justify-between text-xs">
        <span className="text-slate-600 font-medium">Weighted Pipeline Forecast (Amount × Probability):</span>
        <span className="font-extrabold text-indigo-700 text-sm">${weightedCalc.toLocaleString()}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Sales Stage"
          options={['Qualification', 'Proposal', 'Negotiation', 'Won', 'Lost']}
          error={errors.stage?.message}
          {...register('stage')}
        />

        <Input
          label="Expected Close Date"
          type="date"
          required
          error={errors.expectedCloseDate?.message}
          {...register('expectedCloseDate')}
        />
      </div>

      {canAssign && (
        <Select
          label="Assigned Sales Representative"
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
          Opportunity Notes
        </label>
        <textarea
          rows={3}
          className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
          placeholder="Next steps, proposal conditions, competitors..."
          {...register('notes')}
        />
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
        <Button variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={loading}>
          {defaultValues ? 'Save Changes' : 'Create Opportunity'}
        </Button>
      </div>
    </form>
  );
};
