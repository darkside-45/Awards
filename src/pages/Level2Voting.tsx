import { useState, useMemo, useEffect } from 'react';
import { useApp } from '../lib/context';
import { supabase } from '../lib/supabase';
import CandidateCard from '../components/CandidateCard';
import { Vote, CheckCircle, AlertCircle } from 'lucide-react';

export default function Level2Voting() {
  const { candidates, categories, voter } = useApp();
  const [votedCategories, setVotedCategories] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [votingInProgress, setVotingInProgress] = useState<string | null>(null);

  const myClassCandidates = useMemo(() => {
    if (!voter) return [];
    return candidates.filter((c) => c.class_id === voter.class_id);
  }, [candidates, voter]);

  const groupedByCategory = useMemo(() => {
    const groups: Record<string, typeof myClassCandidates> = {};
    myClassCandidates.forEach((c) => {
      const catId = c.category_id;
      if (!groups[catId]) groups[catId] = [];
      groups[catId].push(c);
    });
    return groups;
  }, [myClassCandidates]);

  useEffect(() => {
    if (!voter) return;
    supabase
      .from('votes')
      .select('category_id')
      .eq('voter_id', voter.id)
      .eq('level', 2)
      .then(({ data }) => {
        if (data) setVotedCategories(new Set(data.map((v) => v.category_id)));
      });
  }, [voter]);

  const handleVote = async (candidateId: string) => {
    if (!voter) return;
    const candidate = candidates.find((c) => c.id === candidateId);
    if (!candidate) return;

    if (votedCategories.has(candidate.category_id)) {
      setMessage({ type: 'error', text: 'Vous avez déjà voté dans cette catégorie !' });
      return;
    }

    setVotingInProgress(candidateId);
    try {
      const { error: dbError } = await supabase.from('votes').insert({
        voter_id: voter.id,
        candidate_id: candidateId,
        category_id: candidate.category_id,
        level: 2,
      });
      if (dbError) throw dbError;

      setVotedCategories((prev) => new Set([...prev, candidate.category_id]));
      setMessage({ type: 'success', text: 'Votre vote a été enregistré !' });
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage({ type: 'error', text: 'Erreur lors du vote. Réessayez.' });
    } finally {
      setVotingInProgress(null);
    }
  };

  const totalCategoriesInClass = Object.keys(groupedByCategory).length;
  const votedCount = votedCategories.size;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* Hero */}
      <div className="text-center mb-8 sm:mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-full text-blue-700 text-sm font-poppins font-medium mb-4">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          Vote Intra-Classes en cours
        </div>
        <h2 className="font-poppins font-bold text-3xl sm:text-4xl lg:text-5xl text-gray-900 mb-3">
          Votez pour vos <span className="text-gradient">camarades</span>
        </h2>
        <p className="font-lato text-gray-500 max-w-xl mx-auto">
          Soutenez les candidats de votre classe en leur accordant votre vote unique par catégorie
        </p>
      </div>

      {/* Progress */}
      <div className="max-w-xl mx-auto mb-8">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <span className="font-poppins font-medium text-sm text-gray-700">
              Progression de votre vote
            </span>
            <span className="font-poppins font-bold text-primary-900">
              {votedCount}/{totalCategoriesInClass}
            </span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-900 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${totalCategoriesInClass > 0 ? (votedCount / totalCategoriesInClass) * 100 : 0}%` }}
            />
          </div>
          <p className="font-lato text-xs text-gray-400 mt-2">
            Un seul vote par catégorie. {totalCategoriesInClass - votedCount} catégorie(s) restante(s)
          </p>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`max-w-xl mx-auto mb-6 flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-lato ${
          message.type === 'success'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          {message.text}
        </div>
      )}

      {/* Candidate grid by category */}
      {!voter ? (
        <div className="text-center py-16">
          <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="font-poppins text-gray-400">
            Veuillez vous identifier pour voter
          </p>
        </div>
      ) : myClassCandidates.length === 0 ? (
        <div className="text-center py-16">
          <Vote className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="font-poppins font-semibold text-xl text-gray-400 mb-2">
            Aucun candidat dans votre classe
          </h3>
          <p className="font-lato text-gray-400">
            Les candidats de votre classe ({voter.classes?.name}) n'ont pas encore été inscrits
          </p>
        </div>
      ) : (
        Object.entries(groupedByCategory).map(([catId, catCandidates]) => {
          const cat = categories.find((c) => c.id === catId);
          const hasVoted = votedCategories.has(catId);
          return (
            <div key={catId} className="mb-10">
              <div className="flex items-center gap-3 mb-5">
                <div className={`w-1 h-8 rounded-full ${hasVoted ? 'bg-green-500' : 'bg-primary-900'}`} />
                <h3 className="font-poppins font-bold text-xl text-gray-900">
                  {cat?.name}
                </h3>
                {hasVoted && (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 bg-green-50 text-green-600 text-xs font-semibold rounded-full">
                    <CheckCircle className="w-3 h-3" /> Voté
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {catCandidates.map((candidate) => (
                  <CandidateCard
                    key={candidate.id}
                    candidate={candidate}
                    variant="voting"
                    onVote={handleVote}
                    hasVoted={hasVoted || votingInProgress === candidate.id}
                  />
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
