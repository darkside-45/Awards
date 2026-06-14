import { useApp } from '../lib/context';
import { LEVEL_NAMES } from '../lib/types';
import { Trophy, Settings, Home, LogOut, Shield } from 'lucide-react';

interface HeaderProps {
  page: string;
  setPage: (page: string) => void;
}

export default function Header({ page, setPage }: HeaderProps) {
  const { level, isAdmin, setAdmin, voter, setVoter } = useApp();

  return (
    <header className="gradient-dark text-white sticky top-0 z-50 shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 sm:h-20">
          <button
            onClick={() => setPage('home')}
            className="flex items-center gap-2 sm:gap-3 hover:opacity-90 transition-opacity"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400" />
            </div>
            <div>
              <h1 className="font-poppins font-bold text-lg sm:text-xl tracking-tight">
                Les Awards 2026
              </h1>
              <p className="text-[10px] sm:text-xs text-blue-200 font-lato">
                {LEVEL_NAMES[level]}
              </p>
            </div>
          </button>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden sm:flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
              <div className={`w-2 h-2 rounded-full ${
                level === 1 ? 'bg-green-400' :
                level === 2 ? 'bg-blue-400' :
                level === 3 ? 'bg-yellow-400' :
                'bg-red-400'
              } animate-pulse`} />
              <span className="text-sm font-lato">Niveau {level}</span>
            </div>

            <button
              onClick={() => setPage('home')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all ${
                page === 'home'
                  ? 'bg-white/20 font-semibold'
                  : 'hover:bg-white/10'
              }`}
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Accueil</span>
            </button>

            {isAdmin ? (
              <button
                onClick={() => setPage('admin')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all ${
                  page === 'admin'
                    ? 'bg-white/20 font-semibold'
                    : 'hover:bg-white/10'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span className="hidden sm:inline">Admin</span>
              </button>
            ) : (
              <button
                onClick={() => setPage('admin')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm hover:bg-white/10 transition-all"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Admin</span>
              </button>
            )}

            {isAdmin && (
              <button
                onClick={() => { setAdmin(false); if (page === 'admin') setPage('home'); }}
                className="p-2 rounded-lg hover:bg-white/10 transition-all"
                title="Déconnexion admin"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}

            {voter && (
              <button
                onClick={() => { setVoter(null); }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm hover:bg-white/10 transition-all"
                title="Changer d'identité"
              >
                <span className="text-xs text-blue-200">{voter.display_name}</span>
                <LogOut className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
