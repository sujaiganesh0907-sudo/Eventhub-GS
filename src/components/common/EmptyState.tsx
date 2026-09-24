import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] shadow-xs">
      <div className="p-4 rounded-2xl bg-[var(--surface-subtle)] text-[var(--primary-color)] mb-4 border border-[var(--border-color)]">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-bold text-[var(--text-primary)]">{title}</h3>
      <p className="text-sm text-[var(--text-secondary)] max-w-sm mt-1 mb-5">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] font-semibold text-sm transition-all shadow-xs cursor-pointer active:scale-95"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
