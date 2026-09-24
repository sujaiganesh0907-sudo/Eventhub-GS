import React from 'react';

export const EventCardSkeleton: React.FC = () => {
  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] overflow-hidden shadow-xs animate-pulse">
      <div className="aspect-video w-full bg-[var(--surface-subtle)]" />
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[var(--surface-subtle)]" />
          <div className="h-3 w-28 bg-[var(--surface-subtle)] rounded-sm" />
        </div>
        <div className="h-5 w-4/5 bg-[var(--surface-subtle)] rounded-sm" />
        <div className="h-3 w-full bg-[var(--surface-subtle)] rounded-sm" />
        <div className="h-3 w-2/3 bg-[var(--surface-subtle)] rounded-sm" />
        <div className="pt-2 flex items-center justify-between border-t border-[var(--border-color)]">
          <div className="h-4 w-16 bg-[var(--surface-subtle)] rounded-sm" />
          <div className="h-8 w-24 bg-[var(--surface-subtle)] rounded-lg" />
        </div>
      </div>
    </div>
  );
};

export const CardSkeleton: React.FC<{ rows?: number }> = ({ rows = 3 }) => {
  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] p-6 space-y-4 animate-pulse">
      <div className="h-6 w-1/3 bg-[var(--surface-subtle)] rounded-sm" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-4 bg-[var(--surface-subtle)] rounded-sm" style={{ width: `${85 - i * 15}%` }} />
      ))}
    </div>
  );
};
