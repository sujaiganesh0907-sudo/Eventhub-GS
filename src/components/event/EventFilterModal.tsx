import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Filter, X, Check } from 'lucide-react';
import { ICollege } from '../../types';

export interface FilterState {
  category: string;
  isFree: string; // 'all' | 'free' | 'paid'
  mode: string; // 'all' | 'Offline' | 'Online' | 'Hybrid'
  sort: string; // 'upcoming' | 'popular' | 'latest'
  collegeId: string;
}

interface EventFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters?: FilterState;
  currentFilters?: FilterState;
  onApplyFilters: (newFilters: FilterState) => void;
  colleges?: ICollege[];
}

export const CATEGORIES = [
  'All',
  'Hackathon',
  'Robotics',
  'Design',
  'Technical',
  'Cultural',
  'Workshop',
  'Seminar',
  'Sports',
  'Management',
];

export const EventFilterModal: React.FC<EventFilterModalProps> = ({
  isOpen,
  onClose,
  filters,
  currentFilters,
  onApplyFilters,
  colleges = [],
}) => {
  const initialFilters = currentFilters || filters || {
    category: 'All',
    isFree: 'all',
    mode: 'all',
    sort: 'upcoming',
    collegeId: '',
  };

  const [localFilters, setLocalFilters] = useState<FilterState>({ ...initialFilters });

  const handleApply = () => {
    onApplyFilters(localFilters);
    onClose();
  };

  const handleClear = () => {
    const cleared: FilterState = {
      category: 'All',
      isFree: 'all',
      mode: 'all',
      sort: 'upcoming',
      collegeId: '',
    };
    setLocalFilters(cleared);
    onApplyFilters(cleared);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Filter & Sort Events"
      subtitle="Refine discovery across colleges, modes, and categories"
      maxWidth="lg"
    >
      <div className="space-y-5 py-2">
        {/* Category */}
        <div>
          <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
            Event Category
          </label>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => {
              const active = localFilters.category === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setLocalFilters({ ...localFilters, category: cat })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    active
                      ? 'bg-[var(--primary-color)] text-[var(--primary-text)] shadow-xs'
                      : 'border border-[var(--border-color)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Price: Free or Paid */}
        <div>
          <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
            Registration Fee
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'all', label: 'All Pricing' },
              { id: 'free', label: 'Free Only' },
              { id: 'paid', label: 'Paid Only' },
            ].map((p) => {
              const active = localFilters.isFree === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setLocalFilters({ ...localFilters, isFree: p.id })}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border text-center transition-all cursor-pointer ${
                    active
                      ? 'bg-[var(--primary-color)] border-[var(--primary-color)] text-[var(--primary-text)]'
                      : 'border-[var(--border-color)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Mode: Offline, Online, Hybrid */}
        <div>
          <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
            Event Mode
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'all', label: 'All Modes' },
              { id: 'Offline', label: 'Offline' },
              { id: 'Online', label: 'Online' },
              { id: 'Hybrid', label: 'Hybrid' },
            ].map((m) => {
              const active = localFilters.mode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setLocalFilters({ ...localFilters, mode: m.id })}
                  className={`py-2 px-2.5 rounded-lg text-xs font-semibold border text-center transition-all cursor-pointer ${
                    active
                      ? 'bg-[var(--primary-color)] border-[var(--primary-color)] text-[var(--primary-text)]'
                      : 'border-[var(--border-color)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sort */}
        <div>
          <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
            Sort Order
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'upcoming', label: 'Upcoming First' },
              { id: 'popular', label: 'Most Popular' },
              { id: 'latest', label: 'Recently Added' },
            ].map((s) => {
              const active = localFilters.sort === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setLocalFilters({ ...localFilters, sort: s.id })}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border text-center transition-all cursor-pointer ${
                    active
                      ? 'bg-[var(--primary-color)] border-[var(--primary-color)] text-[var(--primary-text)]'
                      : 'border-[var(--border-color)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* College Filter */}
        {colleges.length > 0 && (
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              Host College
            </label>
            <select
              value={localFilters.collegeId}
              onChange={(e) => setLocalFilters({ ...localFilters, collegeId: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-sm text-[var(--text-primary)] focus:outline-hidden"
            >
              <option value="">All Colleges</option>
              {colleges.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-[var(--border-color)]">
          <button
            type="button"
            onClick={handleClear}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
          >
            Clear All
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-5 py-2 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-semibold transition-all shadow-xs cursor-pointer active:scale-95 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" /> Apply Filters
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
