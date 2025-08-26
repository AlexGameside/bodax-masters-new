import React, { useState, useEffect } from 'react';
import { Calendar, Users, Trophy, Clock, Star, ArrowRight, CheckCircle, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { logoutUser } from '../services/authService';
import { useAuth } from '../hooks/useAuth';
import LoginModal from '../components/LoginModal';
import ComingSoonNavbar from '../components/ComingSoonNavbar';
import ComingSoonFooter from '../components/ComingSoonFooter';
import type { User } from '../types/tournament';

const ComingSoon = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [countdown, setCountdown] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  // Check if user was redirected from a restricted route
  const isRedirected = window.location.search.includes('redirected=true') || 
                      (window.location.pathname !== '/' && window.location.pathname !== '/landing');

  // Set launch date (you can adjust this)
  const launchDate = new Date('2025-09-08T16:00:00Z').getTime(); // 6pm CEST = 4pm UTC

  useEffect(() => {
    // The onAuthStateChange listener is now handled by useAuth
    // This useEffect is no longer needed for local state management
  }, []);

  // Clear redirect parameter when component unmounts or user navigates away
  useEffect(() => {
    const clearRedirectParam = () => {
      if (window.location.search.includes('redirected=true')) {
        const url = new URL(window.location.href);
        url.searchParams.delete('redirected');
        window.history.replaceState({}, '', url.toString());
      }
    };

    // Clear on unmount
    return clearRedirectParam;
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = launchDate - now;

      if (distance > 0) {
        setCountdown({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000)
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [launchDate]);

  const handleLoginSuccess = (user: any) => {
    // The useAuth hook will update currentUser
    setShowLoginModal(false);
    toast.success('Willkommen zurück! Du kannst jetzt dein Team verwalten.');
  };

  const handleCreateTeam = () => {
    if (!currentUser) {
      setShowLoginModal(true);
      return;
    }
    // Navigate to team creation
    navigate('/create-team');
  };

  const handleViewProfile = () => {
    if (!currentUser) {
      setShowLoginModal(true);
      return;
    }
    // Navigate to profile
    navigate('/profile');
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      // The useAuth hook will update currentUser
      toast.success('Erfolgreich abgemeldet');
    } catch (error) {
      toast.error('Fehler beim Abmelden');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* Custom Navbar */}
      <ComingSoonNavbar currentUser={currentUser} onLogout={handleLogout} />
      
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-black/50"></div>
        
        <div className="relative z-10 container-modern pt-32 pb-16">
          <div className="text-center max-w-4xl mx-auto">
            {/* Redirect Notice */}
            {isRedirected && (
              <div className="mb-8 p-6 bg-gradient-to-r from-orange-900/30 to-red-900/30 border border-orange-500/40 rounded-2xl backdrop-blur-sm shadow-lg">
                <div className="flex items-center justify-center space-x-3 mb-3">
                  <span className="text-2xl">🔒</span>
                  <h3 className="text-xl font-bold text-orange-200">Zugriff eingeschränkt</h3>
                </div>
                <p className="text-orange-100 text-center">
                  Diese Funktion ist während der Vorbereitungsphase noch nicht verfügbar. 
                  Du wirst automatisch zur Coming Soon Seite weitergeleitet.
                </p>
              </div>
            )}

            {/* Logo/Brand */}
            <div className="mb-8">
              <img 
                src="/logo.png" 
                alt="Unity League" 
                className="w-24 h-24 mx-auto mb-6 rounded-full shadow-2xl"
              />
              <h1 className="text-6xl font-bold text-white mb-4">
                Unity League 2025
              </h1>
              <p className="text-2xl text-purple-300 mb-8">
            
            
        Die Utimative Valorant League mit Swiss System
              </p>
            </div>

            {/* Countdown */}
            <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-8 mb-12 border border-purple-500/30">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center justify-center">
                <Clock className="w-6 h-6 mr-3 text-purple-400" />
                Turnier Start Countdown
              </h2>
              
              <div className="grid grid-cols-4 gap-6 max-w-md mx-auto">
                <div className="text-center">
                  <div className="text-4xl font-bold text-purple-400">{countdown.days}</div>
                  <div className="text-sm text-gray-300">Tage</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-purple-400">{countdown.hours}</div>
                  <div className="text-sm text-gray-300">Stunden</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-purple-400">{countdown.minutes}</div>
                  <div className="text-sm text-gray-300">Minuten</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-purple-400">{countdown.seconds}</div>
                  <div className="text-sm text-gray-300">Sekunden</div>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="space-y-4 mb-12">
              {!currentUser ? (
                <>
                  <button
                    onClick={() => setShowLoginModal(true)}
                    className="btn-primary text-lg px-8 py-4 inline-flex items-center"
                  >
                    <Users className="w-5 h-5 mr-3" />
                    Anmelden / Registrieren
                  </button>
                  <p className="text-gray-400 text-sm">
                    Erhalte frühzeitigen Zugang zum Team-Management
                  </p>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="bg-green-900/30 border border-green-500/30 rounded-xl p-6">
                    <div className="flex items-center justify-center mb-4">
                      <CheckCircle className="w-8 h-8 text-green-400 mr-3" />
                      <span className="text-xl font-bold text-green-300">Willkommen zurück, {currentUser.username}!</span>
                    </div>
                    <p className="text-green-200 text-center mb-4">
                      Du bist bereit! Beginne mit der Vorbereitung deines Teams für das Turnier.
                    </p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                      onClick={handleCreateTeam}
                      className="btn-primary text-lg px-6 py-3 inline-flex items-center"
                    >
                      <Users className="w-5 h-5 mr-3" />
                      Team erstellen
                    </button>
                    <button
                      onClick={handleViewProfile}
                      className="btn-secondary text-lg px-6 py-3 inline-flex items-center"
                    >
                      <Star className="w-5 h-5 mr-3" />
                      Profil anzeigen
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Preparation Phase Info */}
      <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-3xl p-12 border border-blue-500/30 mb-16 backdrop-blur-sm">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mb-6 shadow-lg">
            <Clock className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-3xl font-bold text-white mb-4">
            Vorbereitungsphase läuft!
          </h3>
          <p className="text-xl text-blue-100 mb-12 max-w-4xl mx-auto leading-relaxed">
            Das Turnier startet bald, aber du kannst dich bereits jetzt vorbereiten! 
            Nutze diese Zeit, um dein Team zu organisieren und alle Teammitglieder zu sammeln.
          </p>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
            <div className="bg-gradient-to-br from-green-900/40 to-emerald-900/40 border border-green-500/40 rounded-2xl p-8 backdrop-blur-sm shadow-xl">
              <div className="flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-full mb-6 mx-auto">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <h4 className="text-2xl font-bold text-green-300 mb-6 text-center">
                Was du JETZT tun kannst
              </h4>
              <div className="space-y-4">
                {[
                  { text: 'Account erstellen und einloggen', icon: '👤' },
                  { text: 'Team erstellen und verwalten', icon: '🏆' },
                  { text: 'Teammitglieder einladen', icon: '📨' },
                  { text: 'Team-Roster organisieren', icon: '📋' },
                  { text: 'Profil und Einstellungen anpassen', icon: '⚙️' }
                ].map((item, index) => (
                  <div key={index} className="flex items-center space-x-4 p-3 bg-green-800/20 rounded-lg border border-green-500/20">
                    <span className="text-2xl">{item.icon}</span>
                    <span className="text-green-200 font-medium">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-orange-900/40 to-red-900/40 border border-orange-500/40 rounded-2xl p-8 backdrop-blur-sm shadow-xl">
              <div className="flex items-center justify-center w-16 h-16 bg-orange-500/20 rounded-full mb-6 mx-auto">
                <Lock className="w-8 h-8 text-orange-400" />
              </div>
              <h4 className="text-2xl font-bold text-orange-300 mb-6 text-center">
                Was noch nicht verfügbar ist
              </h4>
              <div className="space-y-4">
                {[
                  { text: 'Turnier-Registrierung', icon: '🎯' },
                  { text: 'Match-Scheduling', icon: '📅' },
                  { text: 'Bracket-Ansicht', icon: '🏗️' },
                  { text: 'Spiel-Ergebnisse', icon: '📊' },
                  { text: 'Turnier-Statistiken', icon: '📈' }
                ].map((item, index) => (
                  <div key={index} className="flex items-center space-x-4 p-3 bg-orange-800/20 rounded-lg border border-orange-500/20">
                    <span className="text-2xl">{item.icon}</span>
                    <span className="text-orange-200 font-medium">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tournament Info */}
      <div className="container-modern py-16">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-6">
            Turnier Details
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Ein einzigartiges Valorant Turnier mit Swiss System und Offline-Finals in Linz, Österreich.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Swiss System */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 text-center">
            <div className="w-16 h-16 bg-purple-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-8 h-8 text-purple-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Swiss System</h3>
            <p className="text-gray-300 mb-4">
              Faire Spielpaarungen basierend auf der aktuellen Leistung deines Teams
            </p>
            <div className="flex items-center justify-center text-purple-400">
              <CheckCircle className="w-4 h-4 mr-2" />
              <span className="text-sm">Bestätigt</span>
            </div>
          </div>

          {/* Offline Finals */}
          <div className="bg-gray-800/50 border border-blue-700 rounded-xl p-6 text-center">
            <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Offline Finals in Linz</h3>
            <p className="text-gray-300 mb-4">
              Die besten Teams treffen sich in Linz, Österreich für die Finalrunde
            </p>
            <div className="flex items-center justify-center text-blue-400">
              <CheckCircle className="w-4 h-4 mr-2" />
              <span className="text-sm">Bestätigt</span>
            </div>
          </div>

          {/* Team Management */}
          <div className="bg-gray-800/50 border border-green-700 rounded-xl p-6 text-center">
            <div className="w-16 h-16 bg-green-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-green-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Team Management</h3>
            <p className="text-gray-300 mb-4">
              Erstelle Teams, verwalte Roster und koordiniere mit deinen Teammitgliedern
            </p>
            <div className="flex items-center justify-center text-green-400">
              <CheckCircle className="w-4 h-4 mr-2" />
              <span className="text-sm">Verfügbar</span>
            </div>
          </div>

          {/* Discord Integration */}
          <div className="bg-gray-800/50 border border-indigo-700 rounded-xl p-6 text-center">
            <div className="w-16 h-16 bg-indigo-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Star className="w-8 h-8 text-indigo-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Discord Integration</h3>
            <p className="text-gray-300 mb-4">
              Nahtlose Discord Bot Integration für Benachrichtigungen und Team-Kommunikation
            </p>
            <div className="flex items-center justify-center text-indigo-400">
              <CheckCircle className="w-4 h-4 mr-2" />
              <span className="text-sm">Verfügbar</span>
            </div>
          </div>

          {/* Scheduling */}
          <div className="bg-gray-800/50 border border-yellow-700 rounded-xl p-6 text-center">
            <div className="w-16 h-16 bg-yellow-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-yellow-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Match Scheduling</h3>
            <p className="text-gray-300 mb-4">
              Automatisches Match-Scheduling basierend auf Team-Verfügbarkeit und Swiss System
            </p>
            <div className="flex items-center justify-center text-yellow-400">
              <Lock className="w-4 h-4 mr-2" />
              <span className="text-sm">Demnächst</span>
            </div>
          </div>

          {/* Tournament Start */}
          <div className="bg-gray-800/50 border border-pink-700 rounded-xl p-6 text-center">
            <div className="w-16 h-16 bg-pink-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-8 h-8 text-pink-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Turnier Start</h3>
            <p className="text-gray-300 mb-4">
              Das Turnier beginnt am 8. September 2025 um 18:00 CEST
            </p>
            <div className="flex items-center justify-center text-pink-400">
              <CheckCircle className="w-4 h-4 mr-2" />
              <span className="text-sm">8. September</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="container-modern py-16 text-center">
        <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-2xl p-8 border border-purple-500/30">
          <h3 className="text-3xl font-bold text-white mb-4">
            Bereit für den Kampf?
          </h3>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Warte nicht bis zum Start! Bereite dein Team jetzt vor und sichere dir einen Vorsprung.
          </p>
          
          {!currentUser ? (
            <button
              onClick={() => setShowLoginModal(true)}
              className="btn-primary text-xl px-8 py-4 inline-flex items-center"
            >
              <ArrowRight className="w-6 h-6 mr-3" />
              Jetzt starten
            </button>
          ) : (
            <div className="space-y-4">
              <p className="text-green-300 text-lg font-semibold">
                🎉 Du bist bereit! Beginne mit dem Aufbau deines Traumteams.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={handleCreateTeam}
                  className="btn-primary text-lg px-6 py-3 inline-flex items-center"
                >
                  <Users className="w-5 h-5 mr-3" />
                  Team erstellen
                </button>
                <button
                  onClick={handleViewProfile}
                  className="btn-secondary text-lg px-6 py-3 inline-flex items-center"
                >
                  <Star className="w-5 h-5 mr-3" />
                  Profil anzeigen
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={handleLoginSuccess}
      />
      
      {/* Footer */}
      <ComingSoonFooter />
    </div>
  );
};

export default ComingSoon; 