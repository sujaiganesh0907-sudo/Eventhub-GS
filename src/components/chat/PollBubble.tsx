import React, { useState } from 'react';
import { IPoll } from '../../types';
import { BarChart2, Check, Loader2 } from 'lucide-react';
import { api } from '../../services/api';

interface PollBubbleProps {
  messageId: string;
  poll: IPoll;
  currentUserId: string;
  isMine: boolean;
  onPollUpdated?: (updatedPoll: IPoll) => void;
}

export const PollBubble: React.FC<PollBubbleProps> = ({
  messageId,
  poll,
  currentUserId,
  isMine,
  onPollUpdated,
}) => {
  const [votingOptionId, setVotingOptionId] = useState<string | null>(null);

  const totalVotes = poll.totalVotes || 0;

  const handleVote = async (optionId: string) => {
    if (poll.closed) return;
    try {
      setVotingOptionId(optionId);
      const res = await api.post<any>(`/messages/${messageId}/poll/vote`, { optionId });
      if (res.success && res.poll) {
        if (onPollUpdated) {
          onPollUpdated(res.poll);
        }
      }
    } catch (err: any) {
      console.error('Failed to vote in poll:', err);
    } finally {
      setVotingOptionId(null);
    }
  };

  return (
    <div className="w-full max-w-sm rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)]/70 p-3 space-y-2.5 text-xs text-[var(--text-primary)] shadow-xs">
      {/* Header */}
      <div className="flex items-start gap-2">
        <div className="p-1.5 rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 shrink-0">
          <BarChart2 className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="font-bold text-xs sm:text-sm text-[var(--text-primary)] leading-tight">
            {poll.question}
          </h4>
          <span className="text-[10px] text-[var(--text-muted)] font-medium">
            {poll.allowMultiple ? 'Select one or more options' : 'Select one option'}
          </span>
        </div>
      </div>

      {/* Options List */}
      <div className="space-y-1.5 pt-1">
        {poll.options.map((opt) => {
          const votesCount = opt.votes ? opt.votes.length : 0;
          const percentage = totalVotes > 0 ? Math.round((votesCount / totalVotes) * 100) : 0;
          const hasVoted = Boolean(opt.votes && opt.votes.includes(currentUserId));
          const isVoting = votingOptionId === opt.id;

          return (
            <button
              key={opt.id}
              type="button"
              disabled={isVoting || poll.closed}
              onClick={() => handleVote(opt.id)}
              className={`w-full relative overflow-hidden rounded-xl border p-2 text-left transition-all cursor-pointer group active:scale-[0.99] ${
                hasVoted
                  ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 font-semibold'
                  : 'border-[var(--border-color)] bg-[var(--surface)] hover:border-indigo-400'
              }`}
            >
              {/* Progress bar background fill */}
              <div
                className="absolute inset-y-0 left-0 bg-indigo-500/15 dark:bg-indigo-500/20 transition-all duration-300 pointer-events-none rounded-xl"
                style={{ width: `${percentage}%` }}
              />

              <div className="relative z-10 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                      hasVoted
                        ? 'border-indigo-600 bg-indigo-600 text-white'
                        : 'border-[var(--border-color)] group-hover:border-indigo-400'
                    }`}
                  >
                    {isVoting ? (
                      <Loader2 className="w-2.5 h-2.5 animate-spin" />
                    ) : hasVoted ? (
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    ) : null}
                  </div>
                  <span className="text-xs text-[var(--text-primary)] truncate font-medium">
                    {opt.text}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 text-[11px] font-bold text-[var(--text-secondary)]">
                  <span>{votesCount}</span>
                  <span className="text-[10px] text-[var(--text-muted)] font-normal">
                    ({percentage}%)
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-[var(--border-color)] text-[10px] text-[var(--text-muted)]">
        <span>{totalVotes} vote{totalVotes === 1 ? '' : 's'} total</span>
        {poll.closed ? (
          <span className="text-red-500 font-bold">Closed</span>
        ) : (
          <span className="text-emerald-600 font-bold">Active</span>
        )}
      </div>
    </div>
  );
};
