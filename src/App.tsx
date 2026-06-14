import { useState } from 'react';
import { AppProvider, useApp } from './lib/context';
import ErrorBoundary from './components/ErrorBoundary';
import Header from './components/Header';
import VoterSetup from './components/VoterSetup';
import Level1Registration from './pages/Level1Registration';
import Level2Voting from './pages/Level2Voting';
import Level3Voting from './pages/Level3Voting';
import Level4Closure from './pages/Level4Closure';
import AdminPanel from './pages/AdminPanel';
import { LEVEL_NAMES, LEVEL_DESCRIPTIONS } from './lib/types';
import { Loader2, Trophy, Sparkles, Phone, MapPin, Building } from 'lucide-react';

function Footer() {
  const { gala } = useApp();
  const contact = gala?.contact_info || {
    phones: ['+241 77 68 79 95', '+241 77 18 15 65'],
    mutuelle: 'Mutuelle LUMINAE',
    institution: 'Collège de Paris Supérieur Gabon',
    location: 'Libreville, Gabon',
  };

  return (
    <footer className="bg-primary-900 text-white py-8 sm:py-10">
      <div className="max-w-4xl mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
          <div className="flex items-start gap-3">
            <Phone className="w-5 h-5 text-blue-300 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-poppins font-semibold text-sm mb-1">Téléphone</p>
              {contact.phones.map((phone) => (
                <p key={phone} className="font-lato text-sm text-blue-200">{phone}</p>
              ))}
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Building className="w-5 h-5 text-blue-300 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-poppins font-semibold text-sm mb-1">{contact.mutuelle}</p>
              <p className="font-lato text-sm text-blue-200">{contact.institution}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-blue-300 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-poppins font-semibold text-sm mb-1">Adresse</p>
              <p className="font-lato text-sm text-blue-200">{contact.location}</p>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 pt-4 text-center">
          <p className="font-lato text-sm text-blue-200">
            Créé par{' '}
            <a
              href="https://pixora-community.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-white hover:underline"
            >
              PIXORA COMMUNITY
            </a>
            {' '}partenaire officiel
          </p>
        </div>
      </div>
    </footer>
  );
}

function HomePage() {
  const { level, loading, voter } = useApp();
  const [showVoterSetup, setShowVoterSetup] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-primary-900 animate-spin mx-auto mb-4" />
          <p className="font-poppins font-medium text-gray-500">Chargement des Awards 2026...</p>
        </div>
      </div>
    );
  }

  const needsVoterSetup = showVoterSetup && !voter && (level === 2 || level === 3);

  return (
    <>
      {needsVoterSetup && (
        <VoterSetup
          onComplete={() => setShowVoterSetup(false)}
          onClose={() => setShowVoterSetup(false)}
        />
      )}

      {/* Level 4 is a special full-page layout with its own footer */}
      {level === 4 ? (
        <Level4Closure />
      ) : (
        <>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
            {/* Dynamic Level Header */}
            <div className="text-center mb-8 sm:mb-12 relative">
              <div className="absolute inset-0 -z-10 overflow-hidden">
                <div className="absolute top-0 left-1/4 w-64 h-64 bg-primary-900/5 rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-primary-900/5 rounded-full blur-3xl" />
              </div>

              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-poppins font-medium mb-4 ${
                level === 1 ? 'bg-green-50 text-green-700 border border-green-200' :
                level === 2 ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                'bg-yellow-50 text-yellow-700 border border-yellow-200'
              }`}>
                <div className={`w-2 h-2 rounded-full animate-pulse ${
                  level === 1 ? 'bg-green-500' :
                  level === 2 ? 'bg-blue-500' :
                  'bg-yellow-500'
                }`} />
                {LEVEL_NAMES[level]}
              </div>

              <h2 className="font-poppins font-bold text-3xl sm:text-4xl lg:text-5xl text-gray-900 mb-3">
                {level === 1 && <>Les Candidats <span className="text-gradient">Awards 2026</span></>}
                {level === 2 && <>Votez pour vos <span className="text-gradient">camarades</span></>}
                {level === 3 && <>Les <span className="text-gradient">Finalistes</span></>}
              </h2>

              <p className="font-lato text-gray-500 max-w-xl mx-auto">
                {LEVEL_DESCRIPTIONS[level]}
              </p>

              {!voter && level !== 1 && (
                <button
                  onClick={() => setShowVoterSetup(true)}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary-900/10 text-primary-900 rounded-full text-sm font-poppins font-medium hover:bg-primary-900/20 transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  S'identifier pour voter
                </button>
              )}
            </div>

            {/* Level Content */}
            {level === 1 && <Level1Registration />}
            {level === 2 && <Level2Voting />}
            {level === 3 && <Level3Voting />}
          </div>
          <Footer />
        </>
      )}
    </>
  );
}

function AppContent() {
  const [page, setPage] = useState('home');
  const { loading } = useApp();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-20 h-20 gradient-primary rounded-3xl flex items-center justify-center mx-auto mb-6 animate-pulse_glow">
            <Trophy className="w-10 h-10 text-yellow-400" />
          </div>
          <h1 className="font-poppins font-bold text-2xl text-gray-900 mb-2">
            Les Awards 2026
          </h1>
          <Loader2 className="w-6 h-6 text-primary-900 animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header page={page} setPage={setPage} />
      <div className="flex-1">
        {page === 'home' ? <HomePage /> : <AdminPanel />}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <ErrorBoundary>
        <AppContent />
      </ErrorBoundary>
    </AppProvider>
  );
}
