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
  ShieldCheck,
  Plus,
  Search,
  Filter,
  Lock,
  Unlock,
  Edit2,
  ShieldAlert,
  UserCheck,
  Mail,
  Shield,
  Briefcase,
} from 'lucide-react';
import { toast } from 'sonner';

const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_\-#])[A-Za-z\d@$!%*?&_\-#]{8,}$/;

const userCreateSchema = z.object({
  name: z.string().trim().min(2, 'Name is required').max(100),
  email: z.string().trim().email('Valid email is required').toLowerCase(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(strongPasswordRegex, 'Must include uppercase, lowercase, number, and special character'),
  role: z.enum(['Admin', 'Manager', 'Sales Executive']),
  managerId: z.string().optional(),
  isActive: z.boolean().default(true),
});

const userEditSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().toLowerCase(),
  role: z.enum(['Admin', 'Manager', 'Sales Executive']),
  managerId: z.string().optional(),
  isActive: z.boolean(),
  password: z.string().optional(),
});

export const UsersPage = () => {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [unlockingUser, setUnlockingUser] = useState(null);

  // Fetch users
  const { data, isLoading } = useQuery({
    queryKey: ['users', page, limit, search, roleFilter],
    queryFn: async () => {
      let url = `/users?page=${page}&limit=${limit}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (roleFilter) url += `&role=${encodeURIComponent(roleFilter)}`;
      const res = await axiosClient.get(url);
      return res;
    },
  });

  // Fetch potential managers
  const { data: managersData } = useQuery({
    queryKey: ['manager-options'],
    queryFn: async () => {
      const res = await axiosClient.get('/users?role=Manager');
      return res.data || [];
    },
  });

  const users = data?.data || [];
  const meta = data?.meta || { total: 0, totalPages: 1 };

  // Mutations
  const createMutation = useMutation({
    mutationFn: (newU) => axiosClient.post('/users', newU),
    onSuccess: () => {
      toast.success('User created successfully.');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsCreateOpen(false);
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to create user.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }) => axiosClient.put(`/users/${id}`, updates),
    onSuccess: () => {
      toast.success('User updated successfully.');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditingUser(null);
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to update user.');
    },
  });

  const unlockMutation = useMutation({
    mutationFn: (id) => axiosClient.post(`/users/${id}/unlock`),
    onSuccess: () => {
      toast.success('User account unlocked successfully.');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setUnlockingUser(null);
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to unlock user.');
    },
  });

  const getRoleBadge = (role) => {
    switch (role) {
      case 'Admin':
        return (
          <Badge variant="indigo" className="font-semibold flex items-center gap-1">
            <Shield className="w-3 h-3" /> Admin
          </Badge>
        );
      case 'Manager':
        return (
          <Badge variant="purple" className="font-semibold flex items-center gap-1">
            <Briefcase className="w-3 h-3" /> Manager
          </Badge>
        );
      case 'Sales Executive':
      default:
        return (
          <Badge variant="slate" className="font-semibold flex items-center gap-1">
            <UserCheck className="w-3 h-3" /> Sales Exec
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">User & Role Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Administer enterprise CRM accounts, enforce access scopes, and unlock accounts
          </p>
        </div>

        <Button variant="primary" icon={Plus} onClick={() => setIsCreateOpen(true)}>
          Create User
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
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
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            options={[
              { value: '', label: 'All Roles' },
              { value: 'Admin', label: 'Admin' },
              { value: 'Manager', label: 'Manager' },
              { value: 'Sales Executive', label: 'Sales Executive' },
            ]}
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : users.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No users found"
            description="No user accounts match your search."
            actionText="Create User"
            onAction={() => setIsCreateOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Reports To (Manager)</th>
                  <th className="py-3.5 px-4">Account Status</th>
                  <th className="py-3.5 px-4">Security / Lockout</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {users.map((u) => {
                  const isLocked = u.lockoutUntil && new Date(u.lockoutUntil) > new Date();

                  return (
                    <tr key={u._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div>
                          <span className="font-bold text-slate-900 block">{u.name}</span>
                          <span className="text-slate-500 text-[11px] flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3 text-slate-400" /> {u.email}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">{getRoleBadge(u.role)}</td>

                      <td className="py-3.5 px-4 text-slate-600">
                        {u.managerId ? (
                          <span className="font-medium text-slate-800">{u.managerId.name}</span>
                        ) : (
                          <span className="text-slate-400 italic">None / Top-Level</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge variant={u.isActive ? 'emerald' : 'rose'}>
                          {u.isActive ? 'Active' : 'Deactivated'}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4">
                        {isLocked ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                            <Lock className="w-3 h-3" /> Locked Out
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Normal ({u.failedLoginCount || 0} failed)
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isLocked && (
                            <button
                              onClick={() => setUnlockingUser(u)}
                              className="px-2 py-1 rounded-lg text-rose-700 bg-rose-50 hover:bg-rose-100 font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                              title="Unlock Locked Account"
                            >
                              <Unlock className="w-3.5 h-3.5" /> Unlock
                            </button>
                          )}
                          <button
                            onClick={() => setEditingUser(u)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                            title="Edit User"
                          >
                            <Edit2 className="w-4 h-4" />
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

      {/* CREATE USER MODAL */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New User Account"
        description="Provision administrator, manager, or sales executive credentials."
        maxWidth="max-w-lg"
      >
        <UserCreateForm
          managers={managersData || []}
          onSubmit={(values) => createMutation.mutate(values)}
          onCancel={() => setIsCreateOpen(false)}
          loading={createMutation.isPending}
        />
      </Modal>

      {/* EDIT USER MODAL */}
      <Modal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        title={`Edit User: ${editingUser?.name}`}
        description="Update role permissions, team hierarchy, or account status."
        maxWidth="max-w-lg"
      >
        {editingUser && (
          <UserEditForm
            defaultValues={editingUser}
            managers={managersData || []}
            isSelf={editingUser._id === currentUser.userId}
            onSubmit={(values) => updateMutation.mutate({ id: editingUser._id, updates: values })}
            onCancel={() => setEditingUser(null)}
            loading={updateMutation.isPending}
          />
        )}
      </Modal>

      {/* CONFIRM UNLOCK MODAL */}
      <ConfirmDialog
        isOpen={!!unlockingUser}
        onClose={() => setUnlockingUser(null)}
        onConfirm={() => unlockMutation.mutate(unlockingUser._id)}
        title="Unlock User Account"
        message={`Are you sure you want to unlock ${unlockingUser?.name}'s account and reset failed login attempts?`}
        confirmText="Unlock Account"
        variant="subtle"
        loading={unlockMutation.isPending}
      />
    </div>
  );
};

const UserCreateForm = ({ managers, onSubmit, onCancel, loading }) => {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(userCreateSchema),
    defaultValues: {
      role: 'Sales Executive',
      isActive: true,
    },
  });

  const selectedRole = watch('role');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input label="Full Name" required placeholder="Marcus Sterling" error={errors.name?.message} {...register('name')} />
      <Input label="Email Address" type="email" required placeholder="marcus@acxiomcrm.com" error={errors.email?.message} {...register('email')} />
      <Input label="Initial Password" type="password" required placeholder="Min 8 chars with complexity" error={errors.password?.message} {...register('password')} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Assigned System Role"
          options={['Admin', 'Manager', 'Sales Executive']}
          error={errors.role?.message}
          {...register('role')}
        />

        {selectedRole === 'Sales Executive' && (
          <Select
            label="Reporting Manager (Optional)"
            options={managers.map((m) => ({ value: m._id, label: m.name }))}
            error={errors.managerId?.message}
            {...register('managerId')}
          />
        )}
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
        <Button variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={loading}>
          Create User
        </Button>
      </div>
    </form>
  );
};

const UserEditForm = ({ defaultValues, managers, isSelf, onSubmit, onCancel, loading }) => {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(userEditSchema),
    defaultValues: {
      name: defaultValues.name,
      email: defaultValues.email,
      role: defaultValues.role,
      managerId: defaultValues.managerId?._id || defaultValues.managerId || '',
      isActive: defaultValues.isActive,
    },
  });

  const selectedRole = watch('role');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input label="Full Name" required error={errors.name?.message} {...register('name')} />
      <Input label="Email Address" type="email" required error={errors.email?.message} {...register('email')} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Role"
          disabled={isSelf}
          options={['Admin', 'Manager', 'Sales Executive']}
          error={errors.role?.message}
          {...register('role')}
        />

        {selectedRole === 'Sales Executive' && (
          <Select
            label="Reporting Manager"
            options={managers.map((m) => ({ value: m._id, label: m.name }))}
            error={errors.managerId?.message}
            {...register('managerId')}
          />
        )}
      </div>

      <Input
        label="Reset Password (Optional)"
        type="password"
        placeholder="Leave blank to keep existing password"
        error={errors.password?.message}
        {...register('password')}
      />

      <div className="pt-2">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            disabled={isSelf}
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 disabled:opacity-50"
            {...register('isActive')}
          />
          <span className="text-xs font-semibold text-slate-800">Account is Active</span>
        </label>
        {isSelf && (
          <p className="text-[11px] text-slate-400 mt-0.5">
            You cannot change your own role or deactivate your active administrator session.
          </p>
        )}
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
        <Button variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={loading}>
          Save Changes
        </Button>
      </div>
    </form>
  );
};
