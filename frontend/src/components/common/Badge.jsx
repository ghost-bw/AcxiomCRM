import React from 'react';
import clsx from 'clsx';

export const Badge = ({ children, variant = 'slate', size = 'sm', className = '' }) => {
  const variants = {
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    sky: 'bg-sky-50 text-sky-700 border-sky-200',
  };

  const sizes = {
    xs: 'px-1.5 py-0.5 text-[10px]',
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center font-medium rounded-full border',
        variants[variant] || variants.slate,
        sizes[size],
        className
      )}
    >
      {children}
    </span>
  );
};

export const StatusBadge = ({ status }) => {
  let variant = 'slate';
  switch (status) {
    case 'Active':
    case 'Qualified':
    case 'Won':
    case 'Completed':
      variant = 'emerald';
      break;
    case 'New':
    case 'Planned':
    case 'Open':
    case 'Pending':
      variant = 'sky';
      break;
    case 'Contacted':
    case 'Proposal':
    case 'Negotiation':
      variant = 'indigo';
      break;
    case 'Converted':
      variant = 'purple';
      break;
    case 'Unqualified':
    case 'Missed':
    case 'Lost':
    case 'Cancelled':
    case 'Inactive':
      variant = 'rose';
      break;
    case 'High':
    case 'Urgent':
      variant = 'amber';
      break;
    default:
      variant = 'slate';
  }

  return (
    <Badge variant={variant} className="capitalize">
      {status}
    </Badge>
  );
};
