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
import { Badge, StatusBadge } from '../../components/common/Badge.jsx';
import { Pagination } from '../../components/common/Pagination.jsx';
import { TableSkeleton } from '../../components/common/Skeleton.jsx';
import { EmptyState } from '../../components/common/EmptyState.jsx';
import {
  Target,
  Plus,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  CheckCircle2,
  ArrowRightCircle,
  Building2,
  DollarSign,
  User,
  Mail,
  Phone,
  Briefcase,
} from 'lucide-react';
import { toast } from 'sonner';

const phoneRegex = /^\+?[0-9\s\-()]{7,20}$/;

const leadSchema = z.object({
  name: z.string().trim().min(2, 'Lead name is mandatory.').max(120),
  email: z.string().trim().email('Enter a valid email address.').toLowerCase(),
  phone: z.string().trim().regex(phoneRegex, 'Enter a valid phone number.'),
  companyName: z.string().trim().max(150).optional().default(''),
  source: z.enum(['Website', 'Referral', 'Cold Call', 'Advertisement', 'Partner', 'Other']).default('Website'),
  status: z.enum(['New', 'Contacted', 'Qualified', 'Unqualified', 'Converted', 'Lost']).default('New'),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).default('Medium'),
  expectedValue: z.coerce.number().min(0, 'Expected value cannot be negative.').default(0),
  assignedTo: z.string().optional(),
  notes: z.string().trim().max(1000).optional().default(''),
});

const convertSchema = z.object({
  createOpportunity: z.boolean().default(true),
  opportunityName: z.string().trim().max(150).optional(),
  opportunityAmount: z.coerce.number().min(0.01, 'Opportunity Amount must be greater than 0.').optional(),
  opportunityCloseDate: z.string().optional(),
  opportunityStage: z.enum(['Qualification', 'Proposal', 'Negotiation']).default('Qualification'),
});

export const LeadsPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [convertingLead, setConvertingLead] = useState(null);
  const [deletingLead, setDeletingLead] = useState(null);
  const [viewingLead, setViewingLead] = useState(null);

  // Fetch Leads list
  const { data, isLoading } = useQuery({
    queryKey: ['leads', page, limit, search, statusFilter, priorityFilter],
    queryFn: async () => {
      let url = `/leads?page=${page}&limit=${limit}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (statusFilter) url += `&status=${encodeURIComponent(statusFilter)}`;
      if (priorityFilter) url += `&priority=${encodeURIComponent(priorityFilter)}`;
      const res = await axiosClient.get(url);
      return res;
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

  const leads = data?.data || [];
  const meta = data?.meta || { total: 0, totalPages: 1 };

  // Mutations
  const createMutation = useMutation({
    mutationFn: (newLead) => axiosClient.post('/leads', newLead),
    onSuccess: () => {
      toast.success('Lead created successfully.');
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setIsCreateOpen(false);
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to create lead.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }) => axiosClient.put(`/leads/${id}`, updates),
    onSuccess: () => {
      toast.success('Lead updated successfully.');
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setEditingLead(null);
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to update lead.');
    },
  });

  const convertMutation = useMutation({
    mutationFn: ({ id, payload }) => axiosClient.post(`/leads/${id}/convert`, payload),
    onSuccess: (res) => {
      toast.success('Lead converted to Customer and Opportunity successfully!');
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setConvertingLead(null);
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to convert lead.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => axiosClient.delete(`/leads/${id}`),
    onSuccess: () => {
      toast.success('Lead deactivated successfully.');
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setDeletingLead(null);
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to deactivate lead.');
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Lead Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Capture, qualify prospects, track deal probabilities, and convert to enterprise customers
          </p>
        </div>

        <Button variant="primary" icon={Plus} onClick={() => setIsCreateOpen(true)}>
          Capture New Lead
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search leads by name, email, phone, company, or lead code..."
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
              { value: 'New', label: 'New' },
              { value: 'Contacted', label: 'Contacted' },
              { value: 'Qualified', label: 'Qualified' },
              { value: 'Unqualified', label: 'Unqualified' },
              { value: 'Converted', label: 'Converted' },
              { value: 'Lost', label: 'Lost' },
            ]}
          />
        </div>

        <div className="w-full sm:w-40">
          <Select
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value);
              setPage(1);
            }}
            options={[
              { value: '', label: 'All Priorities' },
              { value: 'Low', label: 'Low' },
              { value: 'Medium', label: 'Medium' },
              { value: 'High', label: 'High' },
              { value: 'Urgent', label: 'Urgent' },
            ]}
          />
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : leads.length === 0 ? (
          <EmptyState
            icon={Target}
            title="No leads found"
            description="No prospective leads match your current search criteria."
            actionText="Capture New Lead"
            onAction={() => setIsCreateOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Lead</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4">Source & Value</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4">Owner</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {leads.map((l) => (
                  <tr key={l._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-bold text-slate-900 block">{l.name}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-semibold">
                            {l.leadCode}
                          </span>
                          {l.companyName && (
                            <span className="text-slate-500 text-[11px] flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-slate-400" /> {l.companyName}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{l.email}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{l.phone}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-semibold text-slate-800">
                          ${(l.expectedValue || 0).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Source: {l.source}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusBadge status={l.priority} />
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-medium text-slate-800">{l.assignedTo?.name || 'Unassigned'}</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusBadge status={l.status} />
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Lead Conversion Button */}
                        {l.status !== 'Converted' ? (
                          <button
                            onClick={() => setConvertingLead(l)}
                            className="px-2 py-1 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                            title="Convert Lead to Customer & Deal"
                          >
                            <ArrowRightCircle className="w-3.5 h-3.5" /> Convert
                          </button>
                        ) : (
                          <span className="text-[10px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full font-semibold">
                            Converted
                          </span>
                        )}

                        <button
                          onClick={() => setViewingLead(l)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingLead(l)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                          title="Edit Lead"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingLead(l)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Deactivate Lead"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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

      {/* CREATE LEAD MODAL */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Capture Prospective Lead"
        description="Enter lead contact and sales expectation information."
        maxWidth="max-w-xl"
      >
        <LeadForm
          assignees={assigneesData || []}
          canAssign={user?.role !== 'Sales Executive'}
          onSubmit={(values) => createMutation.mutate(values)}
          onCancel={() => setIsCreateOpen(false)}
          loading={createMutation.isPending}
        />
      </Modal>

      {/* EDIT LEAD MODAL */}
      <Modal
        isOpen={!!editingLead}
        onClose={() => setEditingLead(null)}
        title={`Edit Lead: ${editingLead?.leadCode}`}
        description="Update status, priority, or assigned sales executive."
        maxWidth="max-w-xl"
      >
        {editingLead && (
          <LeadForm
            defaultValues={editingLead}
            assignees={assigneesData || []}
            canAssign={user?.role !== 'Sales Executive'}
            onSubmit={(values) => updateMutation.mutate({ id: editingLead._id, updates: values })}
            onCancel={() => setEditingLead(null)}
            loading={updateMutation.isPending}
          />
        )}
      </Modal>

      {/* CONVERT LEAD WORKFLOW MODAL */}
      <Modal
        isOpen={!!convertingLead}
        onClose={() => setConvertingLead(null)}
        title="Convert Lead to Customer & Opportunity"
        description="Verify details to graduate lead into active customer account and create deal."
        maxWidth="max-w-lg"
      >
        {convertingLead && (
          <ConvertLeadWorkflowModal
            lead={convertingLead}
            onSubmit={(payload) =>
              convertMutation.mutate({ id: convertingLead._id, payload })
            }
            onCancel={() => setConvertingLead(null)}
            loading={convertMutation.isPending}
          />
        )}
      </Modal>

      {/* VIEW LEAD DETAILS MODAL */}
      <Modal
        isOpen={!!viewingLead}
        onClose={() => setViewingLead(null)}
        title={`Lead Summary: ${viewingLead?.leadCode}`}
        description="Prospective customer information and conversion status."
        maxWidth="max-w-lg"
      >
        {viewingLead && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-sm text-slate-900">{viewingLead.name}</span>
                <StatusBadge status={viewingLead.status} />
              </div>
              <p className="text-slate-600">{viewingLead.companyName}</p>
              <div className="flex flex-col gap-1 text-slate-500 pt-2 border-t border-slate-200">
                <span>Email: {viewingLead.email}</span>
                <span>Phone: {viewingLead.phone}</span>
                <span>Source: {viewingLead.source}</span>
                <span>Priority: {viewingLead.priority}</span>
                <span>Expected Deal Size: ${viewingLead.expectedValue?.toLocaleString()}</span>
                <span>Assigned To: {viewingLead.assignedTo?.name}</span>
              </div>
            </div>

            {viewingLead.notes && (
              <div>
                <span className="font-semibold text-slate-700 block mb-1">Notes:</span>
                <p className="p-3 bg-white rounded-lg border border-slate-200 text-slate-600">
                  {viewingLead.notes}
                </p>
              </div>
            )}

            {viewingLead.convertedTo?.customerId && (
              <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-purple-900">
                <span className="font-bold block mb-1">Graduated Customer Record</span>
                <p>Converted on {new Date(viewingLead.convertedTo.convertedAt).toLocaleDateString()}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* CONFIRM DEACTIVATE LEAD */}
      <ConfirmDialog
        isOpen={!!deletingLead}
        onClose={() => setDeletingLead(null)}
        onConfirm={() => deleteMutation.mutate(deletingLead._id)}
        title="Deactivate Lead"
        message={`Are you sure you want to deactivate ${deletingLead?.name}?`}
        confirmText="Deactivate"
        loading={deleteMutation.isPending}
      />
    </div>
  );
};

// Lead Create/Edit Form
const LeadForm = ({ defaultValues, assignees = [], canAssign, onSubmit, onCancel, loading }) => {
  const safeAssignees = Array.isArray(assignees) ? assignees : [];
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(leadSchema),
    defaultValues: defaultValues
      ? {
          name: defaultValues.name,
          email: defaultValues.email,
          phone: defaultValues.phone,
          companyName: defaultValues.companyName || '',
          source: defaultValues.source || 'Website',
          status: defaultValues.status || 'New',
          priority: defaultValues.priority || 'Medium',
          expectedValue: defaultValues.expectedValue || 0,
          assignedTo: defaultValues.assignedTo?._id || defaultValues.assignedTo || '',
          notes: defaultValues.notes || '',
        }
      : {
          source: 'Website',
          status: 'New',
          priority: 'Medium',
          expectedValue: 0,
        },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Lead Name"
          required
          placeholder="Jonathan Taylor"
          error={errors.name?.message}
          {...register('name')}
        />

        <Input
          label="Company Name"
          placeholder="Acme Tech Labs"
          error={errors.companyName?.message}
          {...register('companyName')}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Email Address"
          type="email"
          required
          placeholder="j.taylor@acme.com"
          error={errors.email?.message}
          {...register('email')}
        />

        <Input
          label="Phone Number"
          required
          placeholder="+1 555-019-3388"
          error={errors.phone?.message}
          {...register('phone')}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Select
          label="Lead Source"
          options={['Website', 'Referral', 'Cold Call', 'Advertisement', 'Partner', 'Other']}
          error={errors.source?.message}
          {...register('source')}
        />

        <Select
          label="Lead Status"
          options={['New', 'Contacted', 'Qualified', 'Unqualified', 'Converted', 'Lost']}
          error={errors.status?.message}
          {...register('status')}
        />

        <Select
          label="Priority"
          options={['Low', 'Medium', 'High', 'Urgent']}
          error={errors.priority?.message}
          {...register('priority')}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Expected Deal Value ($)"
          type="number"
          step="100"
          placeholder="25000"
          error={errors.expectedValue?.message}
          {...register('expectedValue')}
        />

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
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
          Discovery Notes
        </label>
        <textarea
          rows={3}
          className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
          placeholder="Details on lead requirements, budget, or timeline..."
          {...register('notes')}
        />
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
        <Button variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={loading}>
          {defaultValues ? 'Save Changes' : 'Capture Lead'}
        </Button>
      </div>
    </form>
  );
};

// Lead Conversion Modal Component
const ConvertLeadWorkflowModal = ({ lead, onSubmit, onCancel, loading }) => {
  const [createOpportunity, setCreateOpportunity] = useState(true);

  // default close date 30 days ahead
  const defaultCloseDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(convertSchema),
    defaultValues: {
      createOpportunity: true,
      opportunityName: `${lead.companyName || lead.name} - Deal`,
      opportunityAmount: lead.expectedValue > 0 ? lead.expectedValue : 15000,
      opportunityCloseDate: defaultCloseDate,
      opportunityStage: 'Qualification',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
        <span className="font-semibold text-slate-800">Target Customer:</span>
        <div className="text-slate-600">
          <p className="font-bold text-slate-900">{lead.name}</p>
          <p>{lead.email} • {lead.phone}</p>
          {lead.companyName && <p className="font-medium text-indigo-600">{lead.companyName}</p>}
        </div>
      </div>

      <div className="pt-2">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={createOpportunity}
            onChange={(e) => setCreateOpportunity(e.target.checked)}
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
          />
          <span className="text-xs font-semibold text-slate-800">
            Automatically create an associated Sales Opportunity deal
          </span>
        </label>
      </div>

      {createOpportunity && (
        <div className="space-y-3 p-3.5 bg-indigo-50/40 rounded-xl border border-indigo-100">
          <Input
            label="Opportunity Name"
            placeholder="Expansion Deal"
            error={errors.opportunityName?.message}
            {...register('opportunityName')}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Opportunity Amount ($)"
              type="number"
              step="100"
              placeholder="15000"
              error={errors.opportunityAmount?.message}
              {...register('opportunityAmount')}
            />

            <Input
              label="Expected Close Date"
              type="date"
              error={errors.opportunityCloseDate?.message}
              {...register('opportunityCloseDate')}
            />
          </div>

          <Select
            label="Initial Stage"
            options={['Qualification', 'Proposal', 'Negotiation']}
            error={errors.opportunityStage?.message}
            {...register('opportunityStage')}
          />
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
        <Button variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" variant="success" loading={loading} icon={CheckCircle2}>
          Convert to Customer
        </Button>
      </div>
    </form>
  );
};
