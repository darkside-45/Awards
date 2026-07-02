import { useState } from 'react';
import { useApp } from '../lib/context';
import { supabase } from '../lib/supabase';
import { Users, ChevronDown, X } from 'lucide-react';

interface VoterSetupProps {
  onComplete: () => void;
  onClose: () => void;
}

// Normalise une chaîne pour la comparaison : minuscules, sans accents,
// sans espaces superflus et sans ponctuation.
function normalize(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // enlève les accents
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Distance de Levenshtein classique.
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[] = Array(n + 1).fill(0).map((_, i) => i);

  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];
      dp[j] = a[i - 1] === b[j - 1]
        ? prev
        : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = temp;
    }
  }
  return dp[n];
}

// Ratio de similarité entre 0 (rien en commun) et 1 (identique).
function similarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  // Si l'une contient l'autre (ex: caractères en trop), on considère
  // que c'est une correspondance quasi parfaite.
  if (na.includes(nb) || nb.includes(na)) return 0.95;
  const dist = levenshtein(na, nb);
  const maxLen = Math.max(na.length, nb.length);
  return 1 - dist / maxLen;
}

// En dessous de ce seuil, on considère que le nom saisi ne correspond pas
// à la classe sélectionnée. Volontairement permissif pour tolérer les
// fautes de frappe et les caractères en trop.
const MATCH_THRESHOLD = 0.55;

export default function VoterSetup({ onComplete, onClose }: VoterSetupProps) {
  const { classes, voter, setVoter } = useApp();
  const [displayName, setDisplayName] = useState('');
  const [classId, setClassId] = useState('');
  const [classNameInput, setClassNameInput] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (voter) return null;

  const selectedClass = classes.find((c) => c.id === classId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!displayName.trim() || !classId || !classNameInput.trim()) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    if (!selectedClass) {
      setError('Classe invalide, veuillez réessayer.');
      return;
    }

    if (similarity(classNameInput, selectedClass.name) < MATCH_THRESHOLD) {
      setError(
        `Le nom saisi ne correspond pas à la classe sélectionnée (${selectedClass.name}). Vérifiez l'orthographe.`
      );
      return;
    }

    setSubmitting(true);
    try {
      const token = crypto.randomUUID();
      const { data, error: dbError } = await supabase
        .from('voters')
        .insert({
          session_token: token,
          class_id: classId,
          display_name: displayName.trim(),
        })
        .select()
        .single();

      if (dbError) throw dbError;
      setVoter(data);
      onComplete();
    } catch {
      setError("Erreur lors de l'inscription. Veuillez réessayer.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 animate-scale-in relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-primary-900/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-primary-900" />
          </div>
          <h2 className="font-poppins font-bold text-xl text-primary-900">
            Bienvenue aux Awards 2026
          </h2>
          <p className="font-lato text-gray-500 text-sm mt-2">
            Identifiez-vous pour participer
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-poppins font-medium text-gray-700 mb-1.5">
              Votre nom
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-900 focus:ring-2 focus:ring-primary-900/20 outline-none transition-all font-lato"
              placeholder="Entrez votre nom..."
            />
          </div>

          <div>
            <label className="block text-sm font-poppins font-medium text-gray-700 mb-1.5">
              Votre classe
            </label>
            <div className="relative">
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-900 focus:ring-2 focus:ring-primary-900/20 outline-none transition-all font-lato appearance-none bg-white"
              >
                <option value="">Sélectionnez votre classe</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-poppins font-medium text-gray-700 mb-1.5">
              Confirmez le nom de votre classe
            </label>
            {/* Champ volontairement en texte visible (pas de type="password") :
                l'utilisateur doit pouvoir vérifier ce qu'il écrit. La comparaison
                avec le nom réel de la classe tolère les fautes de frappe. */}
            <input
              type="text"
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              value={classNameInput}
              onChange={(e) => setClassNameInput(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-900 focus:ring-2 focus:ring-primary-900/20 outline-none transition-all font-lato"
              placeholder="Ex : Terminale D2"
            />
            <p className="text-xs text-gray-400 font-lato mt-1">
              Petites fautes ou lettres en trop ? Pas de souci, tant que c'est reconnaissable.
            </p>
          </div>

          {error && (
            <p className="text-red-500 text-sm font-lato bg-red-50 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-primary-900 text-white rounded-xl font-poppins font-semibold hover:bg-primary-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Inscription...' : 'Commencer'}
          </button>
        </form>
      </div>
    </div>
  );
}
