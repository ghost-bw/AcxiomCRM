import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { Input } from '../../components/common/Input.jsx';
import { Button } from '../../components/common/Button.jsx';
import { User, Mail, Lock, AlertCircle, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_\-#])[A-Za-z\d@$!%*?&_\-#]{8,}$/;

const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
    email: z.string().trim().email('Enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        strongPasswordRegex,
        'Must contain uppercase, lowercase, number, and special character (@$!%*?&_-#)'
      ),
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const RegisterPage = () => {
  const { register: registerAuth } = useAuth();
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
  });

  const passwordVal = watch('password', '');

  const hasUpper = /[A-Z]/.test(passwordVal);
  const hasLower = /[a-z]/.test(passwordVal);
  const hasNumber = /\d/.test(passwordVal);
  const hasSpecial = /[@$!%*?&_\-#]/.test(passwordVal);
  const hasMinLength = passwordVal.length >= 8;

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      setErrorMsg('');
      await registerAuth(data.name, data.email, data.password);
      toast.success('Registration successful! Welcome to AcxiomCRM.');
      navigate('/');
    } catch (err) {
      setErrorMsg(err.message || 'Registration failed.');
      toast.error(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-0 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-40 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white font-black text-2xl shadow-xl shadow-indigo-500/30">
            A
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-white">
          Create an AcxiomCRM Account
        </h2>
        <p className="mt-1 text-center text-xs text-slate-400">
          Standard self-registration creates a Sales Executive account
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-3xl sm:px-10 border border-slate-100">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Full Name"
              type="text"
              placeholder="Alex Morgan"
              icon={User}
              error={errors.name?.message}
              {...register('name')}
            />

            <Input
              label="Email Address"
              type="email"
              placeholder="alex@company.com"
              icon={Mail}
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Password"
              type="password"
              placeholder="Min 8 characters with complexity"
              icon={Lock}
              error={errors.password?.message}
              {...register('password')}
            />

            {/* Password checklist */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 text-[11px] space-y-1">
              <span className="font-semibold text-slate-700 block mb-1">Password Requirements:</span>
              <div className="grid grid-cols-2 gap-1 text-slate-500">
                <span className={hasMinLength ? 'text-emerald-600 font-medium' : ''}>
                  • 8+ characters
                </span>
                <span className={hasUpper ? 'text-emerald-600 font-medium' : ''}>
                  • 1 uppercase letter
                </span>
                <span className={hasLower ? 'text-emerald-600 font-medium' : ''}>
                  • 1 lowercase letter
                </span>
                <span className={hasNumber ? 'text-emerald-600 font-medium' : ''}>
                  • 1 number
                </span>
                <span className={hasSpecial ? 'text-emerald-600 font-medium' : ''}>
                  • 1 special char (@$!%*?&_-#)
                </span>
              </div>
            </div>

            <Input
              label="Confirm Password"
              type="password"
              placeholder="Re-enter password"
              icon={Lock}
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />

            <Button type="submit" variant="primary" className="w-full mt-2" loading={loading}>
              Create Account
            </Button>
          </form>

          <div className="mt-6 text-center border-t border-slate-100 pt-4">
            <p className="text-xs text-slate-600">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-800">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
