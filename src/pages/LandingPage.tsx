import { Link } from 'react-router-dom';
import { 
  Trophy, 
  Users, 
  Zap, 
  Crown, 
  ArrowRight,
  CheckCircle,
  Gamepad2,
  Sparkles,
  Target,
  Award
} from 'lucide-react';

const LandingPage = () => {
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

      {/* Hero Section */}
      <section className="relative py-24 overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20">
          <div className="text-center max-w-5xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center space-x-2 mb-8 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium text-purple-300">Valorant Gaming Liga</span>
            </div>
            
            {/* Main heading */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-8 leading-tight text-white tracking-tight">
              Unity League
            </h1>
            
            {/* Subtitle */}
            <p className="text-xl sm:text-2xl text-gray-300 mb-12 font-light max-w-3xl mx-auto">
              Erlebe das ultimative Competitive Gaming mit unserem innovativen Turniersystem
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Link to="/register" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-4 px-8 rounded-xl shadow-xl transition-all duration-300 text-lg inline-flex items-center justify-center space-x-2 transform hover:scale-105">
                <span>Jetzt starten</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link to="/tournaments" className="bg-white/10 hover:bg-white/20 text-white font-semibold py-4 px-8 rounded-xl border border-white/20 transition-all duration-300 text-lg backdrop-blur-sm">
                Turniere anzeigen
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 relative z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Warum Unity League?
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Erlebe Competitive Gaming wie nie zuvor mit unseren einzigartigen Features
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Swiss System */}
            <div className="group bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300 hover:border-purple-500/30">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Swiss Turniersystem</h3>
              <p className="text-gray-400 leading-relaxed">
                Faires Matchmaking mit mehreren Chancen, durch das Turnier aufzusteigen
              </p>
            </div>

            {/* Team Scheduling */}
            <div className="group bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300 hover:border-cyan-500/30">
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Flexibles Team Scheduling</h3>
              <p className="text-gray-400 leading-relaxed">
                Plane Matches zu Zeiten, die für dein Team funktionieren
              </p>
            </div>

            {/* Competitive Experience */}
            <div className="group bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300 hover:border-pink-500/30">
              <div className="w-16 h-16 bg-gradient-to-br from-pink-600 to-red-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Target className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Professionelle Erfahrung</h3>
              <p className="text-gray-400 leading-relaxed">
                Konkurriere in einer strukturierten Umgebung für ernsthafte Spieler und Teams
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-white/5 relative z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Wie es funktioniert
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Einfache Schritte, um mit Unity League zu starten
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-white">1</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Team registrieren</h3>
              <p className="text-gray-400">
                Erstelle dein Team-Profil und tritt der Liga bei
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Matches spielen</h3>
              <p className="text-gray-400">
                Konkurriere in geplanten Matches und steige auf der Leiter auf
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-pink-600 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-white">3</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Gewinnen & Aufsteigen</h3>
              <p className="text-gray-400">
                Komme durch das Turnier voran und kämpfe um Preise
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 relative z-10">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 backdrop-blur-sm border border-white/10 rounded-3xl p-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
              Bereit zu konkurrieren?
            </h2>
            <p className="text-lg sm:text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Tritt Unity League heute bei und erlebe Competitive Gaming in seiner besten Form
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-4 px-8 rounded-xl shadow-xl transition-all duration-300 text-lg inline-flex items-center justify-center space-x-2 transform hover:scale-105">
                <span>Jetzt beitreten</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage; 