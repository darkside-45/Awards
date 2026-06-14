import { useState } from 'react';
import { useApp } from '../lib/context';
import { supabase } from '../lib/supabase';
import { Users, ChevronDown, X } from 'lucide-react';

interface VoterSetupProps {
  onComplete: () => void;
  onClose: () => void;
}

export default function VoterSetup({ onComplete, onClose }: VoterSetupProps) {
  const { classes, voter, setVoter } = useApp();
  const [displayName, setDisplayName] = useState('');
  const [classId, setClassId] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (voter) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!displayName.trim() || !classId) {
      setError('Veuillez remplir tous les champs');
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
