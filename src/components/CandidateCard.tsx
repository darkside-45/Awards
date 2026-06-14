import { useState } from 'react';
import { useApp } from '../lib/context';
import type { Candidate, Comment as TComment } from '../lib/types';
import { supabase } from '../lib/supabase';
import { MessageCircle, Send, Flag, User, Trash2, Reply, CornerDownRight } from 'lucide-react';

interface CandidateCardProps {
  candidate: Candidate;
  variant: 'registration' | 'voting';
  onVote?: (candidateId: string) => void;
  hasVoted?: boolean;
  showVotes?: boolean;
  voteCount?: number;
}

function CommentItem({
  comment,
  onReply,
}: {
  comment: TComment;
  onReply: (parentId: string) => void;
}) {
  return (
    <div className={`p-3 rounded-xl text-sm ${
      comment.is_flagged ? 'bg-red-50 border border-red-100' : 'bg-gray-50'
    }`}>
      <div className="flex items-center justify-between mb-1">
        <span className="font-poppins font-medium text-gray-800 text-xs">
          Anonyme
        </span>
        <div className="flex items-center gap-1">
          {comment.is_flagged && <Flag className="w-3 h-3 text-red-400" />}
          <span className="text-[10px] text-gray-400">
            {new Date(comment.created_at).toLocaleDateString('fr-FR', {
              day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
            })}
          </span>
        </div>
      </div>
      <p className="font-lato text-gray-600">{comment.content}</p>
      <button
        onClick={() => onReply(comment.id)}
        className="mt-1.5 flex items-center gap-1 text-xs text-primary-900/60 hover:text-primary-900 transition-colors"
      >
        <Reply className="w-3 h-3" /> Répondre
      </button>

      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-2 ml-4 space-y-2 border-l-2 border-primary-900/10 pl-3">
          {comment.replies.map((reply) => (
            <div key={reply.id} className={`p-2.5 rounded-lg ${
              reply.is_flagged ? 'bg-red-50 border border-red-100' : 'bg-gray-100/60'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-poppins font-medium text-gray-700 text-[11px]">Anonyme</span>
                <span className="text-[9px] text-gray-400">
                  {new Date(reply.created_at).toLocaleDateString('fr-FR', {
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </div>
              <p className="font-lato text-gray-600 text-xs">{reply.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CandidateCard({
  candidate,
  variant,
  onVote,
  hasVoted,
  showVotes,
  voteCount,
}: CandidateCardProps) {
  const { comments, level } = useApp();
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);

  const candidateComments = comments.filter(
    (c: TComment) => c.candidate_id === candidate.id
  );

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setSubmittingComment(true);
    try {
      await supabase.from('comments').insert({
        candidate_id: candidate.id,
        author_name: 'Anonyme',
        content: newComment.trim(),
        parent_comment_id: replyingTo,
      });
      setNewComment('');
      setReplyingTo(null);
    } catch { /* ignore */ } finally {
      setSubmittingComment(false);
    }
  };

  const commentsEnabled = level >= 1 && level <= 3;

  return (
    <div className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden card-hover">
      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden flex-shrink-0 bg-primary-900/10 flex items-center justify-center">
            {candidate.photo_url ? (
              <img
                src={candidate.photo_url}
                alt={candidate.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-7 h-7 sm:w-8 sm:h-8 text-primary-900" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-poppins font-semibold text-lg text-gray-900 truncate">
              {candidate.name}
            </h3>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-900/10 text-primary-900">
                {candidate.classes?.name}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">
                {candidate.categories?.name}
              </span>
              {candidate.is_qualified && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                  Qualifié
                </span>
              )}
            </div>
          </div>
        </div>

        {showVotes && voteCount !== undefined && (
          <div className="mt-4 flex items-center gap-2">
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-900 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(voteCount * 10, 100)}%` }}
              />
            </div>
            <span className="text-sm font-poppins font-semibold text-primary-900">
              {voteCount} vote{voteCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {variant === 'voting' && onVote && (
          <button
            onClick={() => onVote(candidate.id)}
            disabled={hasVoted}
            className={`mt-4 w-full py-2.5 rounded-xl font-poppins font-semibold text-sm transition-all ${
              hasVoted
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-primary-900 text-white hover:bg-primary-800 active:scale-[0.98]'
            }`}
          >
            {hasVoted ? 'Déjà voté' : 'Voter'}
          </button>
        )}

        {commentsEnabled && (
          <div className="mt-4 border-t border-gray-100 pt-3">
            <button
              onClick={() => setShowComments(!showComments)}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-900 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>{candidateComments.length} commentaire{candidateComments.length !== 1 ? 's' : ''}</span>
            </button>

            {showComments && (
              <div className="mt-3 space-y-3">
                {candidateComments.length === 0 && (
                  <p className="text-xs text-gray-400 italic font-lato">
                    Aucun commentaire encore. Soyez le premier !
                  </p>
                )}

                {candidateComments.map((comment: TComment) => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    onReply={(parentId) => setReplyingTo(parentId)}
                  />
                ))}

                {level < 4 && (
                  <form onSubmit={handleComment} className="space-y-2">
                    {replyingTo && (
                      <div className="flex items-center gap-2 text-xs text-primary-900 bg-primary-900/5 px-3 py-2 rounded-lg">
                        <CornerDownRight className="w-3 h-3" />
                        <span>Réponse à un commentaire</span>
                        <button
                          type="button"
                          onClick={() => setReplyingTo(null)}
                          className="ml-auto text-gray-400 hover:text-gray-600"
                        >
                          Annuler
                        </button>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder={replyingTo ? "Écrivez votre réponse..." : "Laissez un commentaire..."}
                        className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-primary-900 focus:ring-1 focus:ring-primary-900/20 outline-none font-lato"
                      />
                      <button
                        type="submit"
                        disabled={submittingComment || !newComment.trim()}
                        className="px-3 py-2 bg-primary-900 text-white rounded-lg hover:bg-primary-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function CommentModerationItem({
  comment,
  onAction,
}: {
  comment: TComment;
  onAction: (id: string, action: 'flag' | 'unflag' | 'delete') => void;
}) {
  return (
    <div className={`p-4 rounded-xl border ${
      comment.is_flagged ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-poppins font-medium text-sm text-gray-900">
              Anonyme
            </span>
            {comment.is_flagged && (
              <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-semibold rounded-full">
                Signalé
              </span>
            )}
            <span className="text-[10px] text-gray-400">
              {new Date(comment.created_at).toLocaleDateString('fr-FR', {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
              })}
            </span>
          </div>
          <p className="font-lato text-sm text-gray-700">{comment.content}</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onAction(comment.id, comment.is_flagged ? 'unflag' : 'flag')}
            className={`p-1.5 rounded-lg transition-all ${
              comment.is_flagged
                ? 'text-green-600 hover:bg-green-50'
                : 'text-orange-500 hover:bg-orange-50'
            }`}
            title={comment.is_flagged ? 'Approuver' : 'Signaler'}
          >
            <Flag className="w-4 h-4" />
          </button>
          <button
            onClick={() => onAction(comment.id, 'delete')}
            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-all"
            title="Supprimer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
