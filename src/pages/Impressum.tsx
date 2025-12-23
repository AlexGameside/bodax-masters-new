import { ArrowLeft, Building, MapPin, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

const Impressum = () => {
  return (
    <div className="min-h-screen bg-[#050505] text-gray-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        <Link
          to="/"
          className="inline-flex items-center text-red-500 hover:text-white transition-colors font-mono uppercase text-xs tracking-[0.25em]"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Zurück
        </Link>

        <div className="space-y-2">
          <h1 className="text-4xl font-bodax tracking-wide text-white uppercase">Impressum</h1>
          <p className="text-sm font-mono text-gray-500">Rechtliche Informationen zu Bodax Masters</p>
        </div>

        <div className="bg-[#0a0a0a] border border-gray-800 p-8 space-y-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-black border border-red-900 flex items-center justify-center">
                <Building className="w-6 h-6 text-red-500" />
              </div>
              <h2 className="text-2xl font-bodax tracking-wide text-white uppercase">Angaben gemäß § 5 TMG</h2>
            </div>

            <div className="space-y-4 text-sm font-mono text-gray-300 leading-relaxed">
              <div>
                <p className="text-white font-semibold">Betreiber</p>
                <p>Bodax UG</p>
              </div>
              <div>
                <p className="text-white font-semibold">Anschrift</p>
                <p>Comeniusstr. 3</p>
                <p>81667 München</p>
                <p>Deutschland</p>
              </div>
              <div>
                <p className="text-white font-semibold">Kontakt</p>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-red-500" />
                  <span>legal@bodax.dev</span>
                </div>
                <p className="text-gray-400">Website: https://bodax-masters.web.app</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bodax tracking-wide text-white uppercase">Verantwortlich für den Inhalt</h2>
            <p className="text-gray-300 font-mono text-sm leading-relaxed">
              Verantwortlich nach § 55 Abs. 2 RStV ist die Bodax UG, vertreten durch die Gesellschafter.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bodax tracking-wide text-white uppercase">Haftungsausschluss</h2>
            <p className="text-gray-300 font-mono text-sm leading-relaxed">
              Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die Inhalte externer Links. Für den Inhalt der verlinkten Seiten sind ausschließlich deren Betreiber verantwortlich.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bodax tracking-wide text-white uppercase">Urheberrecht</h2>
            <p className="text-gray-300 font-mono text-sm leading-relaxed">
              Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bodax tracking-wide text-white uppercase">Über Bodax Masters</h2>
            <p className="text-gray-300 font-mono text-sm leading-relaxed">
              Bodax Masters ist eine Turnierplattform für Competitive Gaming, betrieben von der Bodax UG. Wir bieten Turniere, Team-Management, Ready-Checks, Map-Veto und eine Community-Plattform für Valorant-Spieler und Organisatoren.
            </p>
            <p className="text-gray-300 font-mono text-sm leading-relaxed">
              Für Fragen zu unseren Dienstleistungen oder rechtliche Angelegenheiten kontaktieren Sie uns gerne über die angegebenen Kontaktdaten.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Impressum; 