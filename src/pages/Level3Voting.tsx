import { useState, useMemo, useEffect } from 'react';
import { useApp } from '../lib/context';
import { supabase } from '../lib/supabase';
import CandidateCard from '../components/CandidateCard';
import { Globe, CheckCircle, AlertCircle, Shield } from 'lucide-react';

export default function Level3Voting() {
  const { candidates, categories, voter } = useApp();
  const [votedCategories, setVotedCategories] = useState<Set<string>>(new Set());
  const [selectedCandidates, setSelectedCandidates] = useState<Record<string, Set<string>>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const qualifiedCandidates = useMemo(() => {
    return candidates.filter((c) => c.is_qualified);
  }, [candidates]);

  const groupedByCategory = useMemo(() => {
    const groups: Record<string, typeof qualifiedCandidates> = {};
    qualifiedCandidates.forEach((c) => {
      const catId = c.category_id;
      if (!groups[catId]) groups[catId] = [];
      groups[catId].push(c);
    });
    return groups;
  }, [qualifiedCandidates]);

  useEffect(() => {
    if (!voter) return;
    supabase
      .from('votes')
      .select('category_id')
      .eq('voter_id', voter.id)
      .eq('level', 3)
      .then(({ data }) => {
        if (data) setVotedCategories(new Set(data.map((v) => v.category_id)));
      });
  }, [voter]);

  const toggleCandidate = (categoryId: string, candidateId: string) => {
    if (votedCategories.has(categoryId)) return;
    setSelectedCandidates((prev) => {
      const newSet = new Set(prev[categoryId] || []);
      if (newSet.has(candidateId)) {
        newSet.delete(candidateId);
      } else {
        newSet.add(candidateId);
      }
      return { ...prev, [categoryId]: newSet };
    });
  };

  const validateAndSubmit = async (categoryId: string) => {
    if (!voter) return;
    const selected = selectedCandidates[categoryId];
    if (!selected || selected.size < 2) {
      setMessage({
        type: 'error',
        text: 'Vous devez voter pour au minimum 2 finalistes dans chaque catégorie !',
      });
      return;
    }

    setSubmitting(true);
    try {
      const votes = Array.from(selected).map((candidateId) => ({
        voter_id: voter.id,
        candidate_id: candidateId,
        category_id: categoryId,
        level: 3,
      }));

      const { error: dbError } = await supabase.from('votes').insert(votes);
      if (dbError) throw dbError;

      setVotedCategories((prev) => new Set([...prev, categoryId]));
      setMessage({ type: 'success', text: 'Vos votes ont été enregistrés !' });
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage({ type: 'error', text: 'Erreur lors du vote. Réessayez.' });
    } finally {
      setSubmitting(false);
    }
  };

  const totalCategories = Object.keys(groupedByCategory).length;
  const votedCount = votedCategories.size;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* Hero */}
      <div className="text-center mb-8 sm:mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-full text-yellow-700 text-sm font-poppins font-medium mb-4">
          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
          Vote Inter-Classes en cours
        </div>
        <h2 className="font-poppins font-bold text-3xl sm:text-4xl lg:text-5xl text-gray-900 mb-3">
          Les <span className="text-gradient">Finalistes</span>
        </h2>
        <p className="font-lato text-gray-500 max-w-xl mx-auto">
          Votez pour les meilleurs finalistes du campus - minimum 2 votes par catégorie
        </p>
      </div>

      {/* Info Banner */}
      <div className="max-w-xl mx-auto mb-6 bg-primary-900/5 border border-primary-900/20 rounded-xl p-4 flex items-start gap-3">
        <Shield className="w-5 h-5 text-primary-900 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-poppins font-medium text-sm text-primary-900">
            Règle de vote inter-classes
          </p>
          <p className="font-lato text-xs text-primary-900/70 mt-1">
            Vous devez voter pour au minimum 2 finalistes dans chaque catégorie pour valider votre bulletin. Un seul vote par catégorie.
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="max-w-xl mx-auto mb-8">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <span className="font-poppins font-medium text-sm text-gray-700">
              Progression de votre vote
            </span>
            <span className="font-poppins font-bold text-primary-900">
              {votedCount}/{totalCategories}
            </span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-900 rounded-full transition-all duration-700"
              style={{ width: `${totalCategories > 0 ? (votedCount / totalCategories) * 100 : 0}%` }}
            />
          </div>
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

      {!voter ? (
        <div className="text-center py-16">
          <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="font-poppins text-gray-400">
            Veuillez vous identifier pour voter
          </p>
        </div>
      ) : qualifiedCandidates.length === 0 ? (
        <div className="text-center py-16">
          <Globe className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="font-poppins font-semibold text-xl text-gray-400 mb-2">
            Aucun finaliste qualifié
          </h3>
          <p className="font-lato text-gray-400">
            Les finalistes seront annoncés après la phase de vote intra-classes
          </p>
        </div>
      ) : (
        Object.entries(groupedByCategory).map(([catId, catCandidates]) => {
          const cat = categories.find((c) => c.id === catId);
          const hasVoted = votedCategories.has(catId);
          const selected = selectedCandidates[catId] || new Set();

          return (
            <div key={catId} className="mb-10">
              <div className="flex items-center gap-3 mb-2">
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
              {!hasVoted && (
                <p className="font-lato text-sm text-gray-400 ml-4 mb-4">
                  Sélectionnez au moins 2 finalistes puis validez
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {catCandidates.map((candidate) => (
                  <div
                    key={candidate.id}
                    className={`relative transition-all duration-300 ${
                      selected.has(candidate.id) ? 'ring-2 ring-primary-900 ring-offset-2 rounded-2xl' : ''
                    } ${hasVoted ? 'opacity-70' : 'cursor-pointer'}`}
                    onClick={() => !hasVoted && toggleCandidate(catId, candidate.id)}
                  >
                    {selected.has(candidate.id) && (
                      <div className="absolute top-3 right-3 z-10 w-6 h-6 bg-primary-900 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <CandidateCard
                      candidate={candidate}
                      variant="registration"
                    />
                  </div>
                ))}
              </div>

              {!hasVoted && (
                <div className="mt-4 flex items-center gap-3">
                  <button
                    onClick={() => validateAndSubmit(catId)}
                    disabled={submitting || selected.size < 2}
                    className="px-6 py-2.5 bg-primary-900 text-white rounded-xl font-poppins font-semibold text-sm hover:bg-primary-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Enregistrement...' : `Valider (${selected.size} sélectionné${selected.size !== 1 ? 's' : ''})`}
                  </button>
                  {selected.size > 0 && selected.size < 2 && (
                    <span className="font-lato text-xs text-orange-500">
                      Minimum 2 finalistes requis
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
