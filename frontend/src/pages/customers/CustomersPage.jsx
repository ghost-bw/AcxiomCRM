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
  Users,
  Plus,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  Phone,
  Mail,
  Building2,
  MapPin,
  Calendar,
  Briefcase,
} from 'lucide-react';
import { toast } from 'sonner';

const phoneRegex = /^\+?[0-9\s\-()]{7,20}$/;

const customerFormSchema = z.object({
  name: z.string().trim().min(2, 'Customer Name is required.').max(120),
  email: z.string().trim().email('Enter a valid email address.').toLowerCase(),
  phone: z.string().trim().regex(phoneRegex, 'Enter a valid phone number.'),
  companyName: z.string().trim().max(150).optional().default(''),
  address: z.string().trim().max(250).optional().default(''),
  city: z.string().trim().max(100).optional().default(''),
  state: z.string().trim().max(100).optional().default(''),
  status: z.enum(['Active', 'Inactive']).default('Active'),
  assignedTo: z.string().optional(),
  notes: z.string().trim().max(1000).optional().default(''),
});

export const CustomersPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [viewingCustomerId, setViewingCustomerId] = useState(null);
  const [deletingCustomer, setDeletingCustomer] = useState(null);

  // Fetch Customers list
  const { data, isLoading } = useQuery({
    queryKey: ['customers', page, limit, search, statusFilter],
    queryFn: async () => {
      let url = `/customers?page=${page}&limit=${limit}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (statusFilter) url += `&status=${encodeURIComponent(statusFilter)}`;
      const res = await axiosClient.get(url);
      return res;
    },
  });

  // Fetch Assignees for Admin/Manager
  const { data: assigneesData } = useQuery({
    queryKey: ['assignees'],
    queryFn: async () => {
      const res = await axiosClient.get('/users/assignees');
      return res.data || [];
    },
    enabled: user?.role !== 'Sales Executive',
  });

  const customers = data?.data || [];
  const meta = data?.meta || { total: 0, totalPages: 1 };

  // Fetch single customer detail with relations
  const { data: customerDetailData, isLoading: isDetailLoading } = useQuery({
    queryKey: ['customer-detail', viewingCustomerId],
    queryFn: async () => {
      const res = await axiosClient.get(`/customers/${viewingCustomerId}`);
      return res.data;
    },
    enabled: !!viewingCustomerId,
  });

  // Create Customer Mutation
  const createMutation = useMutation({
    mutationFn: (newCust) => axiosClient.post('/customers', newCust),
    onSuccess: () => {
      toast.success('Customer created successfully.');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setIsCreateOpen(false);
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to create customer.');
    },
  });

  // Update Customer Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }) => axiosClient.put(`/customers/${id}`, updates),
    onSuccess: () => {
      toast.success('Customer updated successfully.');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer-detail'] });
      setEditingCustomer(null);
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to update customer.');
    },
  });

  // Deactivate Customer Mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => axiosClient.delete(`/customers/${id}`),
    onSuccess: () => {
      toast.success('Customer deactivated successfully.');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setDeletingCustomer(null);
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to deactivate customer.');
    },
  });

  return (
    <div className="space-y-6">
      {/* Header and Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Customer Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Maintain customer records, view relationship history, and manage accounts
          </p>
        </div>

        <Button
          variant="primary"
          icon={Plus}
          onClick={() => setIsCreateOpen(true)}
        >
          Add Customer
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, phone, company, or code..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-colors"
          />
        </div>

        <div className="w-full sm:w-48">
          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'Active', label: 'Active' },
              { value: 'Inactive', label: 'Inactive' },
            ]}
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : customers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No customers found"
            description="No customer accounts match your current search or filter query."
            actionText="Add New Customer"
            onAction={() => setIsCreateOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4">Location</th>
                  <th className="py-3.5 px-4">Owner</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {customers.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-bold text-slate-900 block">{c.name}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-semibold">
                            {c.customerCode}
                          </span>
                          {c.companyName && (
                            <span className="text-slate-500 text-[11px] flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-slate-400" /> {c.companyName}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{c.email}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{c.phone}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      {c.city || c.state ? (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {[c.city, c.state].filter(Boolean).join(', ')}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Not specified</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-medium text-slate-800">{c.assignedTo?.name || 'Unassigned'}</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusBadge status={c.status} />
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setViewingCustomerId(c._id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                          title="View 360 Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingCustomer(c)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                          title="Edit Customer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingCustomer(c)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Deactivate Customer"
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

      {/* CREATE CUSTOMER MODAL */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add New Customer"
        description="Enter customer details to register account in CRM."
        maxWidth="max-w-xl"
      >
        <CustomerForm
          assignees={assigneesData || []}
          canAssign={user?.role !== 'Sales Executive'}
          onSubmit={(values) => createMutation.mutate(values)}
          onCancel={() => setIsCreateOpen(false)}
          loading={createMutation.isPending}
        />
      </Modal>

      {/* EDIT CUSTOMER MODAL */}
      <Modal
        isOpen={!!editingCustomer}
        onClose={() => setEditingCustomer(null)}
        title={`Edit Customer: ${editingCustomer?.customerCode}`}
        description="Update contact information, status, or owner."
        maxWidth="max-w-xl"
      >
        {editingCustomer && (
          <CustomerForm
            defaultValues={editingCustomer}
            assignees={assigneesData || []}
            canAssign={user?.role !== 'Sales Executive'}
            onSubmit={(values) =>
              updateMutation.mutate({ id: editingCustomer._id, updates: values })
            }
            onCancel={() => setEditingCustomer(null)}
            loading={updateMutation.isPending}
          />
        )}
      </Modal>

      {/* VIEW CUSTOMER 360 DRAWER / MODAL */}
      <Modal
        isOpen={!!viewingCustomerId}
        onClose={() => setViewingCustomerId(null)}
        title="Customer 360° Profile"
        description="View related opportunities, leads, follow-ups, and activity logs."
        maxWidth="max-w-2xl"
      >
        {isDetailLoading || !customerDetailData ? (
          <div className="py-12 flex justify-center">
            <span className="text-xs text-slate-500">Loading customer history...</span>
          </div>
        ) : (
          <CustomerDetailView data={customerDetailData} />
        )}
      </Modal>

      {/* CONFIRM DEACTIVATE DIALOG */}
      <ConfirmDialog
        isOpen={!!deletingCustomer}
        onClose={() => setDeletingCustomer(null)}
        onConfirm={() => deleteMutation.mutate(deletingCustomer._id)}
        title="Deactivate Customer Account"
        message={`Are you sure you want to deactivate ${deletingCustomer?.name} (${deletingCustomer?.customerCode})? This will preserve history while hiding it from active views.`}
        confirmText="Deactivate"
        loading={deleteMutation.isPending}
      />
    </div>
  );
};

// Customer Create/Edit Form Component
const CustomerForm = ({ defaultValues, assignees, canAssign, onSubmit, onCancel, loading }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(customerFormSchema),
    defaultValues: defaultValues
      ? {
          name: defaultValues.name,
          email: defaultValues.email,
          phone: defaultValues.phone,
          companyName: defaultValues.companyName || '',
          address: defaultValues.address || '',
          city: defaultValues.city || '',
          state: defaultValues.state || '',
          status: defaultValues.status || 'Active',
          assignedTo: defaultValues.assignedTo?._id || defaultValues.assignedTo || '',
          notes: defaultValues.notes || '',
        }
      : {
          status: 'Active',
        },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Customer Name"
          required
          placeholder="Apex Global Inc"
          error={errors.name?.message}
          {...register('name')}
        />

        <Input
          label="Company Name"
          placeholder="Apex Global Tech Ltd"
          error={errors.companyName?.message}
          {...register('companyName')}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Email Address"
          type="email"
          required
          placeholder="contact@apexglobal.io"
          error={errors.email?.message}
          {...register('email')}
        />

        <Input
          label="Phone Number"
          required
          placeholder="+1 555-010-9921"
          error={errors.phone?.message}
          {...register('phone')}
        />
      </div>

      <Input
        label="Street Address"
        placeholder="100 Innovation Way, Suite 400"
        error={errors.address?.message}
        {...register('address')}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="City"
          placeholder="San Francisco"
          error={errors.city?.message}
          {...register('city')}
        />

        <Input
          label="State / Province"
          placeholder="CA"
          error={errors.state?.message}
          {...register('state')}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Account Status"
          options={[
            { value: 'Active', label: 'Active' },
            { value: 'Inactive', label: 'Inactive' },
          ]}
          error={errors.status?.message}
          {...register('status')}
        />

        {canAssign && (
          <Select
            label="Assigned Sales Representative"
            options={assignees.map((a) => ({
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
          Internal Notes
        </label>
        <textarea
          rows={3}
          className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
          placeholder="Add relationship context, background, or special handling notes..."
          {...register('notes')}
        />
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
        <Button variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={loading}>
          {defaultValues ? 'Save Changes' : 'Create Customer'}
        </Button>
      </div>
    </form>
  );
};

// Customer Detail 360 View Component
const CustomerDetailView = ({ data }) => {
  const { customer, opportunities = [], followUps = [], activities = [] } = data;

  return (
    <div className="space-y-6">
      {/* Customer Header Info */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-base font-bold text-slate-900">{customer.name}</h4>
            <span className="font-mono text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded font-semibold">
              {customer.customerCode}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">{customer.companyName}</p>
          <div className="flex flex-wrap gap-4 text-xs text-slate-600 mt-3">
            <span className="flex items-center gap-1">
              <Mail className="w-3.5 h-3.5 text-slate-400" /> {customer.email}
            </span>
            <span className="flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-slate-400" /> {customer.phone}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-slate-400" /> Rep: {customer.assignedTo?.name}
            </span>
          </div>
        </div>
        <StatusBadge status={customer.status} />
      </div>

      {/* Related Opportunities */}
      <div>
        <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Briefcase className="w-3.5 h-3.5 text-indigo-600" /> Linked Deals ({opportunities.length})
        </h5>
        {opportunities.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No opportunities linked to this customer.</p>
        ) : (
          <div className="space-y-2">
            {opportunities.map((opp) => (
              <div key={opp._id} className="p-3 rounded-xl border border-slate-100 bg-white flex justify-between items-center text-xs">
                <div>
                  <span className="font-semibold text-slate-900">{opp.name}</span>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Stage: <span className="font-medium text-slate-700">{opp.stage}</span> • Probability: {opp.probability}%
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold text-indigo-600 text-sm">
                    ${opp.amount.toLocaleString()}
                  </span>
                  <StatusBadge status={opp.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Related Follow-Ups */}
      <div>
        <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-indigo-600" /> Scheduled Follow-Ups ({followUps.length})
        </h5>
        {followUps.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No follow-ups recorded.</p>
        ) : (
          <div className="space-y-2">
            {followUps.map((f) => (
              <div key={f._id} className="p-3 rounded-xl border border-slate-100 bg-white flex justify-between items-center text-xs">
                <div>
                  <span className="font-semibold text-slate-900">{f.subject}</span>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {f.followUpType} on {new Date(f.followUpDate).toLocaleDateString()}
                  </div>
                </div>
                <StatusBadge status={f.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Activities Timeline */}
      <div>
        <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
          Activity History ({activities.length})
        </h5>
        {activities.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No activity logs recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {activities.map((act) => (
              <div key={act._id} className="p-3 rounded-xl border border-slate-100 bg-slate-50 text-xs">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-slate-900">{act.subject}</span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(act.activityDate).toLocaleDateString()}
                  </span>
                </div>
                {act.description && <p className="text-slate-600 text-[11px]">{act.description}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
