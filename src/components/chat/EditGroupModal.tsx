import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { FileUpload } from '../common/FileUpload';
import { api } from '../../services/api';
import { Edit3, Loader2, AlertCircle } from 'lucide-react';

interface EditGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: any;
  onGroupUpdated: (updatedGroup: any) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const EditGroupModal: React.FC<EditGroupModalProps> = ({
  isOpen,
  onClose,
  group,
  onGroupUpdated,
  showToast,
}) => {
  const [name, setName] = useState(group.name || '');
  const [description, setDescription] = useState(group.description || '');
  const [imageUrl, setImageUrl] = useState(group.imageUrl || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Group name cannot be empty.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const res = await api.put<any>(`/groups/${group._id}`, {
        name: name.trim(),
        description: description.trim(),
        imageUrl: imageUrl || undefined,
      });

      if (res.success && res.group) {
        onGroupUpdated(res.group);
        showToast('Group details updated successfully!', 'success');
        onClose();
      } else {
        setError(res.message || 'Failed to update group.');
      }
    } catch (err: any) {
      setError(err.message || 'Error updating group.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Group Info"
      subtitle={`Update details for ${group.name}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-2">
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Group Photo */}
        <div className="space-y-1.5">
          <FileUpload
            label="Group Photo"
            helperText="Upload image for group avatar (JPG, PNG, WEBP)"
            value={imageUrl}
            onChange={(url) => setImageUrl(url)}
            accept="image/*"
          />
        </div>

        {/* Group Name */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-[var(--text-primary)]">
            Group Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. AI Research Group"
            className="w-full px-3.5 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] focus:bg-[var(--surface)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary-color)] transition-all font-medium"
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-[var(--text-primary)]">
            Description
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this group about?"
            className="w-full px-3.5 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] focus:bg-[var(--surface)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary-color)] transition-all font-medium resize-none"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Edit3 className="w-3.5 h-3.5" />
            )}
            <span>Save Changes</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
