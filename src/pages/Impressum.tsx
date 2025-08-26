import { ArrowLeft, Building, MapPin, Mail, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';

const Impressum = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white font-sans relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-5" 
           style={{
             backgroundImage: `
               radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
               radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%),
               radial-gradient(circle at 40% 40%, rgba(120, 119, 255, 0.3) 0%, transparent 50%)
             `
           }} />
      
      {/* Floating elements */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-20 right-20 w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
        <div className="absolute top-40 left-20 w-1 h-1 bg-cyan-400 rounded-full animate-pulse delay-1000"></div>
        <div className="absolute bottom-40 right-40 w-1.5 h-1.5 bg-pink-400 rounded-full animate-pulse delay-2000"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-12">
          <Link 
            to="/" 
            className="inline-flex items-center text-purple-400 hover:text-purple-300 transition-colors mb-6 group"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Zurück zur Startseite
          </Link>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">Impressum</h1>
          <p className="text-xl text-gray-300">Rechtliche Informationen zu Unity League</p>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Company Information */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 mb-8">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                <Building className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">Angaben gemäß § 5 TMG</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Building className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-medium">Betreiber</h3>
                  <p className="text-purple-300">Bodax GbR</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-cyan-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-medium">Anschrift</h3>
                  <p className="text-cyan-300">Comeniusstr. 3</p>
                  <p className="text-cyan-300">81667 München</p>
                  <p className="text-gray-400 text-sm">Deutschland</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-pink-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Mail className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-medium">E-Mail</h3>
                  <p className="text-pink-300">info@unityleague.com</p>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Legal Information */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 mb-8">
            <h2 className="text-xl font-bold text-white mb-6">Weitere rechtliche Informationen</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Verantwortlich für den Inhalt</h3>
                <p className="text-gray-300">
                  Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV ist die Bodax GbR, vertreten durch die Gesellschafter.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Haftungsausschluss</h3>
                <p className="text-gray-300">
                  Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die Inhalte externer Links. 
                  Für den Inhalt der verlinkten Seiten sind ausschließlich deren Betreiber verantwortlich.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Urheberrecht</h3>
                <p className="text-gray-300">
                  Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. 
                  Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes 
                  bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
                </p>
              </div>
            </div>
          </div>

          {/* Unity League Information */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
            <h2 className="text-xl font-bold text-white mb-6">Über Unity League</h2>
            
            <div className="space-y-4">
              <p className="text-gray-300">
                Unity League ist eine Plattform für Competitive Gaming, die von der Bodax GbR betrieben wird. 
                Wir bieten Turniere, Team-Management und eine Community-Plattform für Valorant-Spieler.
              </p>
              
              <p className="text-gray-300">
                Für Fragen zu unseren Dienstleistungen oder rechtliche Angelegenheiten kontaktieren Sie uns gerne 
                über die angegebenen Kontaktdaten.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Impressum; 