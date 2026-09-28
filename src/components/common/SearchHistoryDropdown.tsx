import React from 'react';
import { Clock, X, Trash2 } from 'lucide-react';
import { SearchHistoryContext } from '../../services/searchHistory';

interface SearchHistoryDropdownProps {
  context: SearchHistoryContext;
  history: string[];
  onSelectTerm: (term: string) => void;
  onRemoveTerm: (term: string, e: React.MouseEvent) => void;
  onClearAll: (e: React.MouseEvent) => void;
  onClose?: () => void;
  className?: string;
}

export const SearchHistoryDropdown: React.FC<SearchHistoryDropdownProps> = ({
  context,
  history,
  onSelectTerm,
  onRemoveTerm,
  onClearAll,
  onClose,
  className = '',
}) => {
  if (history.length === 0) return null;

  const contextTitle =
    context === 'home'
      ? 'Recent Event Searches'
      : context === 'messages'
      ? 'Recent People & Colleges'
      : 'Recent College Searches';

  return (
    <div
      className={`absolute left-0 right-0 top-full mt-2 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] shadow-2xl overflow-hidden z-50 animate-in fade-in-50 zoom-in-95 backdrop-blur-md ${className}`}
    >
      <div className="p-3 border-b border-[var(--border-color)] flex items-center justify-between">
        <span className="text-[11px] font-black uppercase tracking-wider text-[var(--text-muted)]">
          {contextTitle}
        </span>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onClearAll}
          className="text-[11px] font-bold text-[var(--primary-color)] hover:underline flex items-center gap-1 cursor-pointer"
        >
          <Trash2 className="w-3 h-3" /> Clear All
        </button>
      </div>

      <div className="max-h-60 overflow-y-auto divide-y divide-[var(--border-color)]/50">
        {history.map((term) => (
          <div
            key={term}
            onMouseDown={(e) => {
              // prevent input onBlur before onClick fires
              e.preventDefault();
            }}
            onClick={() => onSelectTerm(term)}
            className="px-3.5 py-2.5 flex items-center justify-between gap-2 hover:bg-[var(--surface-hover)] transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Clock className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
              <span className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--primary-color)] truncate">
                {term}
              </span>
            </div>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation();
                onRemoveTerm(term, e);
              }}
              className="p-1 rounded-md text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
              title="Remove from history"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
