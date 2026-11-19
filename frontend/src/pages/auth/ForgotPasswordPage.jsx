import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient.js';
import { Input } from '../../components/common/Input.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const schema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
});

export const ForgotPasswordPage = () => {
  const [loading, setLoading] = useState(false);
  const [successInfo, setSuccessInfo] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await axiosClient.post('/auth/forgot-password', { email: data.email });
      setSuccessInfo(res.data);
      toast.success('Password reset instructions generated.');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to request password reset.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <h2 className="text-center text-2xl font-bold tracking-tight text-white">Reset Password</h2>
        <p className="mt-1 text-center text-xs text-slate-400">
          Enter your registered email address to receive reset instructions
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-3xl sm:px-10 border border-slate-100">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successInfo ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-2">
                <div className="flex items-center gap-2 font-semibold text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Reset Token Generated
                </div>
                <p>
                  In a production environment, an email is dispatched. For local testing, your reset token is:
                </p>
                <div className="p-2 bg-white rounded border border-emerald-300 font-mono text-[11px] select-all break-all">
                  {successInfo.resetToken || 'Token sent'}
                </div>
              </div>
              <Button
                variant="primary"
                className="w-full"
                onClick={() => navigate(`/reset-password?token=${successInfo.resetToken || ''}`)}
              >
                Proceed to Enter New Password
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                placeholder="name@company.com"
                icon={Mail}
                error={errors.email?.message}
                {...register('email')}
              />

              <Button type="submit" variant="primary" className="w-full" loading={loading}>
                Generate Reset Token
              </Button>
            </form>
          )}

          <div className="mt-6 text-center border-t border-slate-100 pt-4">
            <Link to="/login" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
