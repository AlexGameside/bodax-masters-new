import { ArrowLeft, MessageSquare, ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

const ContactUs = () => {
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
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">Support & Kontakt</h1>
          <p className="text-xl text-gray-300">Wir haben unser Support-System verbessert!</p>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Main Content */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-12 text-center">
            {/* Icon */}
            <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-8">
              <Sparkles className="w-10 h-10 text-white" />
            </div>

            {/* Title */}
            <h2 className="text-3xl font-bold text-white mb-6">
              Neues Support-System
            </h2>

            {/* Description */}
            <div className="text-gray-300 mb-8 space-y-4">
              <p className="text-lg">
                Wir haben unser Support-System auf ein modernes Ticket-System umgestellt, um dir noch besseren Service zu bieten.
              </p>
              <p>
                Über unser Ticket-System kannst du:
              </p>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="bg-white/5 rounded-xl p-6">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-white font-semibold mb-2">Strukturierte Anfragen</h3>
                <p className="text-gray-400 text-sm">
                  Erstelle Tickets für verschiedene Support-Kategorien
                </p>
              </div>

              <div className="bg-white/5 rounded-xl p-6">
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-white font-semibold mb-2">Schnelle Antworten</h3>
                <p className="text-gray-400 text-sm">
                  Unser Team antwortet innerhalb von Stunden, bei Spielen innerhalb von Minuten.
                </p>
              </div>

              <div className="bg-white/5 rounded-xl p-6">
                <div className="w-12 h-12 bg-gradient-to-br from-pink-600 to-red-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-white font-semibold mb-2">Ticket-Verfolgung</h3>
                <p className="text-gray-400 text-sm">
                  Verfolge den Status deiner Anfragen in Echtzeit
                </p>
              </div>
            </div>

            {/* CTA Button */}
            <div className="mb-8">
              <Link 
                to="/tickets" 
                className="inline-flex items-center bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-4 px-8 rounded-xl shadow-xl transition-all duration-300 text-lg transform hover:scale-105"
              >
                <span>Zum Ticket-System</span>
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </div>

            {/* Additional Info */}
            <div className="bg-white/5 rounded-xl p-6">
              <h3 className="text-white font-semibold mb-3">Weitere Kontaktmöglichkeiten</h3>
                             <div className="text-gray-400 text-sm space-y-2">
                 <p><strong className="text-purple-300">E-Mail:</strong> gaming@unityleauge.com</p>
                 <p>
                   <strong className="text-cyan-300">Discord:</strong>{' '}
                   <a 
                     href="https://discord.gg/ewAk7wBgHT" 
                     target="_blank" 
                     rel="noopener noreferrer"
                     className="text-cyan-300 hover:text-cyan-200 underline"
                   >
                     Unity League Community
                   </a>
                 </p>
                 <p><strong className="text-pink-300">Antwortzeit:</strong> Innerhalb von 24 Stunden</p>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactUs; 