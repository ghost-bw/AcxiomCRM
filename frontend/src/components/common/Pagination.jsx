import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button.jsx';

export const Pagination = ({ page, totalPages, total, limit, onPageChange }) => {
  if (totalPages <= 1) return null;

  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-slate-200 sm:px-6">
      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
        <div>
          <p className="text-xs text-slate-600">
            Showing <span className="font-semibold text-slate-900">{startItem}</span> to{' '}
            <span className="font-semibold text-slate-900">{endItem}</span> of{' '}
            <span className="font-semibold text-slate-900">{total}</span> results
          </p>
        </div>
        <div>
          <nav className="inline-flex items-center -space-x-px rounded-md shadow-xs gap-1" aria-label="Pagination">
            <Button
              variant="outline"
              size="xs"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              icon={ChevronLeft}
            >
              Previous
            </Button>

            <span className="px-3 py-1 text-xs font-medium text-slate-700">
              Page {page} of {totalPages}
            </span>

            <Button
              variant="outline"
              size="xs"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              icon={ChevronRight}
            >
              Next
            </Button>
          </nav>
        </div>
      </div>
    </div>
  );
};
