import { useState } from 'react';
import { ArrowLeft, Mail, MessageSquare, Clock, Send, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

const ContactUs = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    setTimeout(() => {
      setSubmitStatus('success');
      setIsSubmitting(false);
      setFormData({ name: '', email: '', subject: '', message: '' });
    }, 2000);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

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
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">Kontaktiere uns</h1>
          <p className="text-xl text-gray-300">Hast du Fragen zu Unity League? Wir sind hier, um zu helfen!</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Information */}
          <div className="space-y-8">
            {/* Unity League Info */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Unity League Support</h2>
              </div>
              <p className="text-gray-300">
                Unser Team steht dir bei allen Fragen zu Turnieren, Team-Management und der Plattform zur Verfügung.
              </p>
            </div>

            {/* Contact Methods */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
              <h2 className="text-xl font-semibold text-white mb-6">Kontaktmöglichkeiten</h2>
              
              <div className="space-y-6">
                <div className="flex items-start space-x-4 group">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <Mail className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium">E-Mail Support</h3>
                    <p className="text-purple-300 text-sm">support@unityleague.com</p>
                    <p className="text-gray-400 text-xs">Für allgemeine Anfragen und Support</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4 group">
                  <div className="w-12 h-12 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <MessageSquare className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium">Discord Community</h3>
                    <p className="text-cyan-300 text-sm">Unity League Discord</p>
                    <p className="text-gray-400 text-xs">Für Echtzeit-Support und Community</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4 group">
                  <div className="w-12 h-12 bg-gradient-to-br from-pink-600 to-red-600 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium">Antwortzeit</h3>
                    <p className="text-pink-300 text-sm">Innerhalb von 24 Stunden</p>
                    <p className="text-gray-400 text-xs">Wir antworten schnell auf alle Anfragen</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Sende uns eine Nachricht</h2>
            
            {submitStatus === 'success' && (
              <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4 mb-6">
                <p className="text-green-200 text-sm">
                  Vielen Dank für deine Nachricht! Wir melden uns innerhalb von 24 Stunden bei dir.
                </p>
              </div>
            )}

            {submitStatus === 'error' && (
              <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 mb-6">
                <p className="text-red-200 text-sm">
                  Beim Senden deiner Nachricht ist ein Fehler aufgetreten. Bitte versuche es erneut oder kontaktiere uns direkt per E-Mail.
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-200 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-white placeholder-gray-400 backdrop-blur-sm"
                  placeholder="Dein vollständiger Name"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-200 mb-2">
                  E-Mail *
                </label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-white placeholder-gray-400 backdrop-blur-sm"
                  placeholder="deine.email@beispiel.com"
                />
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-200 mb-2">
                  Betreff *
                </label>
                <select
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => handleInputChange('subject', e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-white backdrop-blur-sm"
                >
                  <option value="">Wähle einen Betreff</option>
                  <option value="general">Allgemeine Anfrage</option>
                  <option value="support">Technischer Support</option>
                  <option value="tournament">Turnier-Frage</option>
                  <option value="team">Team-Management</option>
                  <option value="partnership">Partnerschaft</option>
                  <option value="other">Sonstiges</option>
                </select>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-200 mb-2">
                  Nachricht *
                </label>
                <textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => handleInputChange('message', e.target.value)}
                  required
                  rows={6}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-white placeholder-gray-400 resize-none backdrop-blur-sm"
                  placeholder="Beschreibe deine Anfrage im Detail..."
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-600 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 transform hover:scale-105 disabled:transform-none"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Wird gesendet...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>Nachricht senden</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-white/20">
              <p className="text-gray-400 text-sm">
                Durch das Absenden dieses Formulars stimmst du unserer{' '}
                <Link to="/privacy-policy" className="text-purple-400 hover:text-purple-300">
                  Datenschutzerklärung
                </Link>{' '}
                und unseren{' '}
                <Link to="/terms-of-service" className="text-purple-400 hover:text-purple-300">
                  Nutzungsbedingungen
                </Link>
                zu.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactUs; 