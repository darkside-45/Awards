import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Shield, LogIn, AlertCircle } from 'lucide-react';

interface AdminLoginProps {
  onLogin: () => void;
}

async function sha256(message: string) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default function AdminLogin({ onLogin }: AdminLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Veuillez remplir tous les champs');
      return;
    }
    setSubmitting(true);
    try {
      const hash = await sha256(password + 'awards2026salt');
      const { data, error: dbError } = await supabase
        .from('admin_users')
        .select('id')
        .eq('email', email.trim().toLowerCase())
        .eq('password_hash', hash)
        .single();

      if (dbError || !data) {
        setError('Email ou mot de passe incorrect');
        return;
      }
      // log and notify parent that admin mode should be enabled
      // eslint-disable-next-line no-console
      console.log('Admin login successful for', email.trim().toLowerCase());
      onLogin();
    } catch {
      setError('Erreur de connexion. Réessayez.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 animate-scale-in">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-primary-900/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-primary-900" />
          </div>
          <h2 className="font-poppins font-bold text-xl text-primary-900">
            Accès Administrateur
          </h2>
          <p className="font-lato text-gray-500 text-sm mt-2">
            Connectez-vous pour gérer les Awards 2026
          </p>
        </div>

        {/* prevent browser autofill: form and inputs marked autocomplete off and use non-standard names
            Add a hidden dummy input to catch some browser autofill behaviors */}
        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          <input type="text" name="__fake_username__" autoComplete="off" style={{ display: 'none' }} />
          <div>
            <label className="block text-sm font-poppins font-medium text-gray-700 mb-1.5">
              Email
            </label>
            <input
              type="email"
              name="awards_admin_email"
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-900 focus:ring-2 focus:ring-primary-900/20 outline-none transition-all font-lato"
              placeholder="admin@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-poppins font-medium text-gray-700 mb-1.5">
              Mot de passe
            </label>
            <input
              type="password"
              name="awards_admin_password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-900 focus:ring-2 focus:ring-primary-900/20 outline-none transition-all font-lato"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-500 text-sm font-lato bg-red-50 px-4 py-2.5 rounded-xl">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-primary-900 text-white rounded-xl font-poppins font-semibold hover:bg-primary-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <LogIn className="w-5 h-5" />
            {submitting ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}
