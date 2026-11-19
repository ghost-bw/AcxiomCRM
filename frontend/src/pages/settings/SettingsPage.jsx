import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axiosClient from '../../api/axiosClient.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Input } from '../../components/common/Input.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import { Shield, Lock, Key, User, Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_\-#])[A-Za-z\d@$!%*?&_\-#]{8,}$/;

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(strongPasswordRegex, 'Must include uppercase, lowercase, number, and special character'),
    confirmNewPassword: z.string().min(1, 'Confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'Passwords do not match',
    path: ['confirmNewPassword'],
  });

export const SettingsPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(changePasswordSchema),
  });

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      setErrorMsg('');
      await axiosClient.post('/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      toast.success('Your password has been changed successfully.');
      reset();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to change password.');
      toast.error(err.message || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="pb-2 border-b border-slate-200">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">User Settings & Security</h1>
        <p className="text-xs text-slate-500 mt-1">
          Review your account role credentials, system permissions, and update password
        </p>
      </div>

      {/* Profile Overview Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
        <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
          <User className="w-4 h-4 text-indigo-600" /> Account Identity
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Full Name</span>
            <span className="font-bold text-slate-900 text-sm">{user?.name}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Email Address</span>
            <span className="font-bold text-slate-900 text-sm">{user?.email}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Assigned Role</span>
            <div className="mt-1">
              <Badge variant="indigo" className="font-bold">
                {user?.role}
              </Badge>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Data Visibility Scope</span>
            <span className="font-semibold text-slate-700 mt-1 block">
              {user?.role === 'Admin'
                ? 'Full Organization-Wide Access'
                : user?.role === 'Manager'
                ? 'Managed Team Scope'
                : 'Assigned Business Records Only'}
            </span>
          </div>
        </div>
      </div>

      {/* Change Password Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
        <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
          <Lock className="w-4 h-4 text-indigo-600" /> Change Security Password
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Enforces enterprise complexity: min 8 characters, upper, lower, number, and special character.
        </p>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2 text-rose-800 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
          <Input
            label="Current Password"
            type="password"
            required
            placeholder="••••••••"
            error={errors.currentPassword?.message}
            {...register('currentPassword')}
          />

          <Input
            label="New Password"
            type="password"
            required
            placeholder="Min 8 characters"
            error={errors.newPassword?.message}
            {...register('newPassword')}
          />

          <Input
            label="Confirm New Password"
            type="password"
            required
            placeholder="Confirm new password"
            error={errors.confirmNewPassword?.message}
            {...register('confirmNewPassword')}
          />

          <Button type="submit" variant="primary" loading={loading} icon={Key}>
            Update Password
          </Button>
        </form>
      </div>
    </div>
  );
};
