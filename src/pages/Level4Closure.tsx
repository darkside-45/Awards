import { useState, useEffect } from 'react';
import { useApp } from '../lib/context';
import { Ticket, PartyPopper, Star, Calendar, Phone, MapPin, Building, Clock } from 'lucide-react';

function Countdown({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calc = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      return {
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      };
    };
    setTimeLeft(calc());
    const interval = setInterval(() => setTimeLeft(calc()), 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return (
    <div className="grid grid-cols-4 gap-3 sm:gap-4 max-w-md mx-auto">
      {[
        { value: timeLeft.days, label: 'Jours' },
        { value: timeLeft.hours, label: 'Heures' },
        { value: timeLeft.minutes, label: 'Minutes' },
        { value: timeLeft.seconds, label: 'Secondes' },
      ].map((item) => (
        <div key={item.label} className="bg-white rounded-2xl p-3 sm:p-4 shadow-lg border border-gray-100 text-center">
          <p className="font-poppins font-bold text-2xl sm:text-4xl text-primary-900">
            {String(item.value).padStart(2, '0')}
          </p>
          <p className="font-lato text-[10px] sm:text-xs text-gray-500 mt-1">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

export default function Level4Closure() {
  const { gala } = useApp();

  const hasDate = gala?.gala_date && new Date(gala.gala_date).getTime() > Date.now();
  const contact = gala?.contact_info || {
    phones: ['+241 77 68 79 95', '+241 77 18 15 65'],
    mutuelle: 'Mutuelle LUMINAE',
    institution: 'Collège de Paris Supérieur Gabon',
    location: 'Libreville, Gabon',
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col">
      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-10 sm:py-16 relative">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-32 h-32 bg-primary-900/5 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-48 h-48 bg-primary-900/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary-900/3 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 text-center max-w-2xl mx-auto">
          {/* Trophy Icon */}
          <div className="w-24 h-24 sm:w-32 sm:h-32 gradient-primary rounded-3xl flex items-center justify-center mx-auto mb-8 animate-pulse_glow shadow-2xl shadow-primary-900/30">
            <Star className="w-12 h-12 sm:w-16 sm:h-16 text-yellow-400" />
          </div>

          {/* Main Message */}
          <h1 className="font-poppins font-bold text-4xl sm:text-5xl lg:text-6xl text-gray-900 mb-4 leading-tight">
            Les Votes Sont <span className="text-gradient">Terminés</span>
          </h1>

          <div className="w-20 h-1 bg-primary-900 rounded-full mx-auto mb-6" />

          <p className="font-lato text-lg sm:text-xl text-gray-600 mb-8 max-w-lg mx-auto leading-relaxed">
            Merci à tous les étudiants du campus pour votre participation aux Awards 2026 !
            Les résultats seront annoncés lors du grand bal.
          </p>

          {/* Gala image */}
          {gala?.gala_image_url && (
            <div className="mb-8 rounded-2xl overflow-hidden shadow-xl max-w-lg mx-auto">
              <img src={gala.gala_image_url} alt="Grand Bal" className="w-full h-48 sm:h-64 object-cover" />
            </div>
          )}

          {/* Countdown or pending date */}
          {hasDate ? (
            <div className="mb-8">
              <p className="font-poppins font-semibold text-sm text-primary-900 mb-4 flex items-center justify-center gap-2">
                <Clock className="w-4 h-4" />
                Compte à rebours avant le Grand Bal
              </p>
              <Countdown targetDate={gala!.gala_date!} />
            </div>
          ) : (
            <div className="mb-8 bg-white rounded-2xl p-6 shadow-lg border border-gray-100 max-w-md mx-auto">
              <Calendar className="w-10 h-10 text-primary-900/30 mx-auto mb-3" />
              <p className="font-poppins font-semibold text-gray-900 mb-1">
                La date sera bientôt disponible
              </p>
              <p className="font-lato text-sm text-gray-400">
                Restez connecté pour connaître la date du grand bal
              </p>
            </div>
          )}

          {/* CTA */}
          <div className="inline-flex flex-col sm:flex-row items-center gap-4">
            <a
              href={`tel:${contact.phones[0]?.replace(/\s/g, '')}`}
              className="flex items-center gap-3 px-8 py-4 bg-primary-900 text-white rounded-2xl font-poppins font-bold text-lg hover:bg-primary-800 transition-all shadow-xl shadow-primary-900/25 active:scale-[0.97]"
            >
              <Ticket className="w-6 h-6" />
              Achetez vos billets
            </a>
          </div>

          {/* Fun message */}
          <div className="mt-10 flex items-center justify-center gap-2 text-primary-900/60">
            <PartyPopper className="w-5 h-5" />
            <p className="font-lato text-sm italic">
              Préparez vos plus belles tenues, la soirée s'annonce mémorable !
            </p>
            <PartyPopper className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Footer */}
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
    </div>
  );
}
