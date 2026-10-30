import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  UserPlus,
  UserCheck,
  Building2,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { DEFAULT_STUDENT_AVATAR } from '../../services/imageDefaults';

interface SameCollegeStudentsSectionProps {
  collegeName?: string;
  onSelectStudent?: (studentId: string) => void;
}

export const SameCollegeStudentsSection: React.FC<SameCollegeStudentsSectionProps> = ({
  collegeName,
  onSelectStudent,
}) => {
  const { studentProfile } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchSameCollege = async () => {
    try {
      setLoading(true);
      const res = await api.get<any>('/students/same-college');
      if (res.success && Array.isArray(res.students)) {
        setStudents(res.students);
      }
    } catch (err) {
      console.error('Failed to load same college students', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSameCollege();
  }, []);

  const handleToggleFollow = async (targetStudentId: string) => {
    try {
      setActionLoadingId(targetStudentId);
      const res = await api.post<any>('/social/student/follow', { targetStudentId });
      if (res.success) {
        setStudents((prev) =>
          prev.map((s) =>
            s._id === targetStudentId ? { ...s, isFollowing: res.following } : s
          )
        );
      }
    } catch (err) {
      console.error('Failed to toggle same college follow', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  if (!loading && students.length === 0) return null;

  return (
    <div className="p-4 sm:p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
          <h3 className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">
            Peers from {collegeName || studentProfile?.collegeName || 'Your College'}
          </h3>
        </div>
        <span className="text-[11px] font-semibold text-[var(--text-muted)]">
          {students.length} students
        </span>
      </div>

      {loading ? (
        <div className="py-6 flex items-center justify-center text-xs text-[var(--text-muted)] gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
          <span>Discovering campus peers...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {students.map((student) => {
            const isLoading = actionLoadingId === student._id;

            return (
              <div
                key={student._id}
                className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] flex items-center justify-between gap-2.5 transition-all hover:border-indigo-300 dark:hover:border-indigo-800"
              >
                <div
                  onClick={() => onSelectStudent && onSelectStudent(student._id)}
                  className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1"
                >
                  <img
                    src={student.profilePhoto || DEFAULT_STUDENT_AVATAR}
                    alt={student.fullName}
                    className="w-9 h-9 rounded-xl object-cover border border-[var(--border-color)] shrink-0"
                    onError={(e) => {
                      (e.target as any).src = DEFAULT_STUDENT_AVATAR;
                    }}
                  />
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-[var(--text-primary)] truncate hover:text-indigo-600 transition-colors">
                      {student.fullName}
                    </h4>
                    <p className="text-[10px] text-[var(--text-muted)] truncate">
                      {student.department || 'Student'} • {student.yearOfStudy || ''}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleToggleFollow(student._id)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all shrink-0 cursor-pointer active:scale-95 flex items-center gap-1 ${
                    student.isFollowing
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs'
                  }`}
                >
                  {isLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : student.isFollowing ? (
                    <>
                      <UserCheck className="w-3 h-3" />
                      <span>Following</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3 h-3" />
                      <span>Follow</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
