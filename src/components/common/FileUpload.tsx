import React, { useState, useRef } from 'react';
import { Upload, X, FileText, CheckCircle2, Loader2, Image as ImageIcon } from 'lucide-react';
import { api } from '../../services/api';

interface FileUploadProps {
  label?: string;
  helperText?: string;
  value?: string;
  onChange: (fileUrl: string) => void;
  accept?: string;
  maxSizeMB?: number;
  showPreview?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  label,
  helperText,
  value,
  onChange,
  accept = 'image/jpeg,image/png,image/webp,application/pdf',
  maxSizeMB = 15,
  showPreview = true,
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File size exceeds limit (${maxSizeMB}MB). Please choose a smaller file.`);
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const res = await api.uploadFile(file);
      if (res.success && res.fileUrl) {
        onChange(res.fileUrl);
      } else {
        setError('Upload failed. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Error uploading file.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = () => {
    onChange('');
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isPdf = value?.toLowerCase().endsWith('.pdf');
  const isImage = value && !isPdf;

  return (
    <div className="w-full space-y-2">
      {label && <label className="block text-sm font-semibold text-[var(--text-primary)]">{label}</label>}

      {value ? (
        <div className="relative rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] p-3 overflow-hidden">
          {showPreview && (
            <div className="mb-2">
              {isImage ? (
                <div className="relative aspect-video w-full max-h-48 overflow-hidden rounded-lg bg-black/5 flex items-center justify-center">
                  <img
                    src={value}
                    alt="Preview"
                    className="h-full w-full object-contain"
                    onError={(e) => {
                      (e.target as any).src = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&auto=format&fit=crop&q=80';
                    }}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-[var(--surface)] border border-[var(--border-color)]">
                  <FileText className="w-8 h-8 text-[var(--primary-color)]" />
                  <div className="grow">
                    <p className="text-sm font-medium text-[var(--text-primary)]">PDF Document Uploaded</p>
                    <a
                      href={value}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-[var(--primary-color)] hover:underline"
                    >
                      View / Download file
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--border-color)]/60 text-xs">
            <span className="flex items-center gap-1 text-[var(--success)] font-medium">
              <CheckCircle2 className="w-4 h-4" /> Ready to save
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1 rounded-md bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border-color)] hover:bg-[var(--surface-hover)] transition-colors font-medium"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={handleRemove}
                className="px-2.5 py-1 rounded-md bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-colors font-medium flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" /> Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed border-[var(--border-color)] hover:border-[var(--primary-color)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] transition-all cursor-pointer text-center group ${
            uploading ? 'pointer-events-none opacity-60' : ''
          }`}
        >
          {uploading ? (
            <div className="flex flex-col items-center py-2">
              <Loader2 className="w-8 h-8 text-[var(--primary-color)] animate-spin mb-2" />
              <span className="text-sm font-medium text-[var(--text-primary)]">Uploading to server...</span>
            </div>
          ) : (
            <>
              <div className="p-3 rounded-full bg-[var(--surface)] border border-[var(--border-color)] group-hover:scale-105 transition-transform text-[var(--primary-color)] mb-2 shadow-xs">
                <Upload className="w-5 h-5" />
              </div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Click to browse or drop file here
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                {helperText || `Supports JPG, PNG, WEBP, PDF (max ${maxSizeMB}MB)`}
              </p>
            </>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
      />

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
};
