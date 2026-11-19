import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '../components/common/Button.jsx';

export const UnauthorizedPage = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4">
      <div className="p-4 rounded-full bg-rose-100 text-rose-600 mb-4">
        <ShieldAlert className="w-12 h-12" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900">403 - Access Forbidden</h1>
      <p className="text-xs text-slate-500 mt-2 max-w-sm text-center">
        Your current role does not have authorization to view this resource. Contact your CRM administrator for permissions.
      </p>
      <div className="mt-6">
        <Link to="/">
          <Button variant="primary" icon={ArrowLeft}>
            Return to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
};
