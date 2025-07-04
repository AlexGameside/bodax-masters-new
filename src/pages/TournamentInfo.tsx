import { Link } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { 
  Calendar, 
  Trophy, 
  Users, 
  Euro, 
  ArrowLeft, 
  Star, 
  Zap, 
  Shield, 
  Play, 
  Gamepad2, 
  Target, 
  TrendingUp, 
  Globe, 
  Smartphone, 
  Headphones, 
  Video, 
  Award, 
  Crown, 
  Sparkles, 
  Rocket, 
  Eye, 
  BarChart3, 
  MessageSquare, 
  Heart, 
  Clock, 
  CheckCircle, 
  XCircle,
  Monitor,
  Mic,
  Camera,
  DollarSign,
  Gift,
  BookOpen,
  Brain,
  Network,
  Lock,
  Unlock,
  Palette,
  Wifi,
  Database,
  Cpu,
  Server,
  ExternalLink,
  Info,
  MapPin,
  UserCheck,
  Users2,
  CalendarDays,
  Timer,
  Flame,
  Target as TargetIcon,
  Sword,
  Shield as ShieldIcon,
  ChevronRight,
  ChevronDown,
  Minus,
  Plus
} from 'lucide-react';

const TournamentInfo = () => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const formatRef = useRef<HTMLDivElement>(null);
  const requirementsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
        }
      });
    }, observerOptions);

    const elements = document.querySelectorAll('.scroll-animate');
    elements.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white font-mono relative overflow-hidden">
      {/* Enhanced animated background with more graphics */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-red-900/20 via-purple-900/20 to-blue-900/20"></div>
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(239, 68, 68, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(147, 51, 234, 0.1) 0%, transparent 50%), radial-gradient(circle at 40% 40%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)',
          animation: 'pulse 8s ease-in-out infinite alternate'
        }}></div>
        
        {/* Enhanced floating particles with different sizes and speeds */}
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-red-400 rounded-full animate-ping" style={{animationDelay: '0s', animationDuration: '2s'}}></div>
        <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-blue-400 rounded-full animate-ping" style={{animationDelay: '1s', animationDuration: '3s'}}></div>
        <div className="absolute bottom-1/3 left-1/3 w-1.5 h-1.5 bg-purple-400 rounded-full animate-ping" style={{animationDelay: '2s', animationDuration: '2.5s'}}></div>
        <div className="absolute top-2/3 right-1/4 w-1 h-1 bg-green-400 rounded-full animate-ping" style={{animationDelay: '3s', animationDuration: '3.5s'}}></div>
        <div className="absolute top-1/2 left-1/2 w-0.5 h-0.5 bg-yellow-400 rounded-full animate-ping" style={{animationDelay: '0.5s', animationDuration: '4s'}}></div>
        <div className="absolute bottom-1/4 right-1/3 w-1.5 h-1.5 bg-pink-400 rounded-full animate-ping" style={{animationDelay: '1.5s', animationDuration: '2.8s'}}></div>
        
        {/* Bracket-style decorative elements */}
        <div className="absolute top-20 left-10 w-32 h-32 border border-red-500/30 rounded-lg transform rotate-45 animate-pulse" style={{animationDuration: '4s'}}></div>
        <div className="absolute bottom-20 right-10 w-24 h-24 border border-blue-500/30 rounded-lg transform -rotate-45 animate-pulse" style={{animationDuration: '5s'}}></div>
        <div className="absolute top-1/2 left-5 w-16 h-16 border border-purple-500/30 rounded-full animate-pulse" style={{animationDuration: '6s'}}></div>
        <div className="absolute bottom-1/3 right-5 w-20 h-20 border border-green-500/30 transform rotate-12 animate-pulse" style={{animationDuration: '4.5s'}}></div>
        
        {/* Tournament bracket lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
          <defs>
            <pattern id="bracket-pattern" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
              <path d="M10 20 L90 20 M10 80 L90 80 M50 20 L50 80" stroke="rgba(239, 68, 68, 0.3)" strokeWidth="1" fill="none"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#bracket-pattern)"/>
        </svg>
      </div>

      {/* Header with enhanced graphics */}
      <section className="relative section-padding overflow-hidden">
        <div className="container-modern relative z-20">
          <div className="flex items-center mb-8">
            <Link to="/" className="flex items-center text-gray-400 hover:text-white transition-colors group">
              <ArrowLeft className="w-5 h-5 mr-2 group-hover:translate-x-[-2px] transition-transform" />
              Back to Home
            </Link>
          </div>
          
          <div className="text-center max-w-5xl mx-auto">
            <div className="flex items-center justify-center space-x-3 mb-8">
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg shadow-red-500/25 animate-bounce" style={{animationDuration: '2s'}}>
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <span className="text-lg font-medium text-red-300 bg-black/60 px-4 py-2 rounded-full border border-red-700 shadow-lg shadow-black/20 backdrop-blur-sm">
                Tournament Information
              </span>
            </div>
            
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-8 leading-tight drop-shadow-2xl bg-gradient-to-r from-red-500 via-purple-500 to-blue-500 bg-clip-text text-transparent uppercase tracking-tight animate-pulse">
              Bodax Masters 2025
            </h1>
            
            <div className="flex items-center justify-center space-x-4 mb-8">
              <div className="flex items-center space-x-2">
                <Flame className="w-6 h-6 text-red-400 animate-pulse" />
                <span className="text-xl font-bold text-red-300">Community Valorant Tournament</span>
              </div>
            </div>
            
            <p className="text-xl text-gray-300 mb-12 max-w-4xl mx-auto leading-relaxed">
              Join the ultimate competitive Valorant experience. <span className="text-red-400 font-bold">32 teams</span> in the qualifier, 
              <span className="text-purple-400 font-bold"> 8 teams</span> in the main event. Fight for glory and claim the 
              <span className="text-green-400 font-bold"> €300 prize pool</span>!
            </p>
          </div>
        </div>
      </section>

      {/* Hero Prize Pool Section with bracket graphics */}
      <section className="section-padding bg-gradient-to-r from-green-900/30 to-blue-900/30 border-y border-green-700/30 relative">
        {/* Bracket decoration */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="absolute top-10 left-10 w-20 h-20 border-l-2 border-t-2 border-green-500/30"></div>
          <div className="absolute top-10 right-10 w-20 h-20 border-r-2 border-t-2 border-green-500/30"></div>
          <div className="absolute bottom-10 left-10 w-20 h-20 border-l-2 border-b-2 border-green-500/30"></div>
          <div className="absolute bottom-10 right-10 w-20 h-20 border-r-2 border-b-2 border-green-500/30"></div>
        </div>
        
        <div className="container-modern">
          <div className="text-center mb-12">
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
              <Crown className="w-12 h-12 text-yellow-400 inline mr-4" />
              Prize Pool
            </h2>
          </div>
          
          <div className="max-w-3xl mx-auto">
            <div className="relative">
              {/* Enhanced glowing background effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-3xl blur-xl animate-pulse" style={{animationDuration: '3s'}}></div>
              
              <div className="relative bg-black/80 border border-green-700/50 rounded-3xl p-12 shadow-2xl backdrop-blur-sm">
                <div className="text-center">
                  <div className="text-8xl font-bold bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent mb-6 animate-pulse">
                    €300
                  </div>
                  <p className="text-2xl text-gray-300 mb-8">Winner Takes All</p>
                  
                  <div className="bg-gradient-to-r from-green-900/50 to-blue-900/50 rounded-2xl p-6 border border-green-600/30">
                    <div className="flex items-center justify-center space-x-4">
                      <Crown className="w-8 h-8 text-yellow-400" />
                      <span className="text-xl font-bold text-white">First Place Only</span>
                      <Crown className="w-8 h-8 text-yellow-400" />
                    </div>
                    <p className="text-gray-300 mt-2">The champion claims the entire prize pool</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Timeline Section with scroll animations */}
      <section ref={timelineRef} className="section-padding bg-black/40">
        <div className="container-modern">
          <div className="text-center mb-16 scroll-animate opacity-0 translate-y-10 transition-all duration-1000">
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
              <Calendar className="w-12 h-12 text-red-400 inline mr-4" />
              Tournament Timeline
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Mark your calendars for the most epic Valorant tournament of 2025
            </p>
          </div>
          
          <div className="max-w-6xl mx-auto">
            <div className="relative">
              {/* Enhanced timeline line with gradient */}
              <div className="absolute left-1/2 transform -translate-x-1/2 w-2 h-full bg-gradient-to-b from-red-500 via-blue-500 to-purple-500 rounded-full shadow-lg"></div>
              
              <div className="space-y-12">
                {/* Registration */}
                <div className="flex items-center scroll-animate opacity-0 translate-x-[-50px] transition-all duration-1000" style={{transitionDelay: '200ms'}}>
                  <div className="w-1/2 pr-8 text-right">
                    <div className="bg-black/80 border border-red-700/50 rounded-2xl p-6 shadow-xl backdrop-blur-sm relative group">
                      {/* Bracket decoration */}
                      <div className="absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 border-red-500/50 group-hover:border-red-400 transition-colors"></div>
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-red-500/50 group-hover:border-red-400 transition-colors"></div>
                      
                      <div className="flex items-center justify-end space-x-3 mb-3">
                        <span className="text-sm font-medium text-red-300 bg-red-900/50 px-3 py-1 rounded-full">STEP 1</span>
                        <CalendarDays className="w-6 h-6 text-red-400" />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-2">Registration Opens</h3>
                      <p className="text-3xl font-bold text-red-400 mb-2">July 7, 2025</p>
                      <p className="text-gray-300">Monday - Get ready to secure your spot!</p>
                    </div>
                  </div>
                  
                  <div className="w-6 h-6 bg-red-500 rounded-full border-4 border-black shadow-lg relative">
                    <div className="absolute inset-0 bg-red-400 rounded-full animate-ping" style={{animationDuration: '2s'}}></div>
                  </div>
                  
                  <div className="w-1/2 pl-8"></div>
                </div>
                
                {/* Qualifier */}
                <div className="flex items-center scroll-animate opacity-0 translate-x-[50px] transition-all duration-1000" style={{transitionDelay: '400ms'}}>
                  <div className="w-1/2 pr-8"></div>
                  
                  <div className="w-6 h-6 bg-blue-500 rounded-full border-4 border-black shadow-lg relative">
                    <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping" style={{animationDuration: '2s', animationDelay: '0.5s'}}></div>
                  </div>
                  
                  <div className="w-1/2 pl-8">
                    <div className="bg-black/80 border border-blue-700/50 rounded-2xl p-6 shadow-xl backdrop-blur-sm relative group">
                      {/* Bracket decoration */}
                      <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-blue-500/50 group-hover:border-blue-400 transition-colors"></div>
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 border-blue-500/50 group-hover:border-blue-400 transition-colors"></div>
                      
                      <div className="flex items-center space-x-3 mb-3">
                        <Users2 className="w-6 h-6 text-blue-400" />
                        <span className="text-sm font-medium text-blue-300 bg-blue-900/50 px-3 py-1 rounded-full">STEP 2</span>
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-2">Qualifier Tournament</h3>
                      <p className="text-3xl font-bold text-blue-400 mb-2">July 19-20</p>
                      <p className="text-gray-300">32 Teams • Double Elimination • Best of 1</p>
                    </div>
                  </div>
                </div>
                
                {/* Main Event */}
                <div className="flex items-center scroll-animate opacity-0 translate-x-[-50px] transition-all duration-1000" style={{transitionDelay: '600ms'}}>
                  <div className="w-1/2 pr-8 text-right">
                    <div className="bg-black/80 border border-purple-700/50 rounded-2xl p-6 shadow-xl backdrop-blur-sm relative group">
                      {/* Bracket decoration */}
                      <div className="absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 border-purple-500/50 group-hover:border-purple-400 transition-colors"></div>
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-purple-500/50 group-hover:border-purple-400 transition-colors"></div>
                      
                      <div className="flex items-center justify-end space-x-3 mb-3">
                        <span className="text-sm font-medium text-purple-300 bg-purple-900/50 px-3 py-1 rounded-full">STEP 3</span>
                        <Crown className="w-6 h-6 text-purple-400" />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-2">Main Event</h3>
                      <p className="text-3xl font-bold text-purple-400 mb-2">July 26</p>
                      <p className="text-gray-300">8 Teams • Single Elimination • Championship Day</p>
                    </div>
                  </div>
                  
                  <div className="w-6 h-6 bg-purple-500 rounded-full border-4 border-black shadow-lg relative">
                    <div className="absolute inset-0 bg-purple-400 rounded-full animate-ping" style={{animationDuration: '2s', animationDelay: '1s'}}></div>
                  </div>
                  
                  <div className="w-1/2 pl-8"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Format Overview with bracket graphics */}
      <section ref={formatRef} className="section-padding bg-black/20">
        <div className="container-modern">
          <div className="text-center mb-16 scroll-animate opacity-0 translate-y-10 transition-all duration-1000">
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
              <Sword className="w-12 h-12 text-blue-400 inline mr-4" />
              Tournament Format
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Two-stage elimination system designed for maximum excitement
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
            {/* Qualifier Card with bracket graphics */}
            <div className="relative group scroll-animate opacity-0 translate-x-[-50px] transition-all duration-1000" style={{transitionDelay: '200ms'}}>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
              <div className="relative bg-black/90 border border-blue-700/50 rounded-3xl p-8 shadow-2xl backdrop-blur-sm group-hover:border-blue-600/70 transition-all duration-500">
                {/* Bracket corner decorations */}
                <div className="absolute top-4 left-4 w-6 h-6 border-l-2 border-t-2 border-blue-500/50 group-hover:border-blue-400 transition-colors"></div>
                <div className="absolute top-4 right-4 w-6 h-6 border-r-2 border-t-2 border-blue-500/50 group-hover:border-blue-400 transition-colors"></div>
                <div className="absolute bottom-4 left-4 w-6 h-6 border-l-2 border-b-2 border-blue-500/50 group-hover:border-blue-400 transition-colors"></div>
                <div className="absolute bottom-4 right-4 w-6 h-6 border-r-2 border-b-2 border-blue-500/50 group-hover:border-blue-400 transition-colors"></div>
                
                <div className="flex items-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
                    <Users2 className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold text-white">Qualifier Stage</h3>
                    <p className="text-blue-300">The Battle Begins</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
                    <span className="text-gray-300"><strong className="text-white">32 Teams</strong> - Open registration</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                    <span className="text-gray-300"><strong className="text-white">Double Elimination</strong> - Second chance bracket</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                    <span className="text-gray-300"><strong className="text-white">Best of 1</strong> - Single map matches</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse" style={{animationDelay: '0.6s'}}></div>
                    <span className="text-gray-300"><strong className="text-white">Top 4 teams</strong> qualify for Main Event</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse" style={{animationDelay: '0.8s'}}></div>
                    <span className="text-gray-300"><strong className="text-white">July 19-20, 2025</strong> - Weekend tournament</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Main Event Card with bracket graphics */}
            <div className="relative group scroll-animate opacity-0 translate-x-[50px] transition-all duration-1000" style={{transitionDelay: '400ms'}}>
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
              <div className="relative bg-black/90 border border-purple-700/50 rounded-3xl p-8 shadow-2xl backdrop-blur-sm group-hover:border-purple-600/70 transition-all duration-500">
                {/* Bracket corner decorations */}
                <div className="absolute top-4 left-4 w-6 h-6 border-l-2 border-t-2 border-purple-500/50 group-hover:border-purple-400 transition-colors"></div>
                <div className="absolute top-4 right-4 w-6 h-6 border-r-2 border-t-2 border-purple-500/50 group-hover:border-purple-400 transition-colors"></div>
                <div className="absolute bottom-4 left-4 w-6 h-6 border-l-2 border-b-2 border-purple-500/50 group-hover:border-purple-400 transition-colors"></div>
                <div className="absolute bottom-4 right-4 w-6 h-6 border-r-2 border-b-2 border-purple-500/50 group-hover:border-purple-400 transition-colors"></div>
                
                <div className="flex items-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
                    <Crown className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold text-white">Main Event</h3>
                    <p className="text-purple-300">Championship Day</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse"></div>
                    <span className="text-gray-300"><strong className="text-white">8 Teams</strong> - 4 Qualified + 4 Invited</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                    <span className="text-gray-300"><strong className="text-white">Single Elimination</strong> - Direct knockout</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                    <span className="text-gray-300"><strong className="text-white">Best of 1</strong> - High stakes matches</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse" style={{animationDelay: '0.6s'}}></div>
                    <span className="text-gray-300"><strong className="text-white">Live Streamed</strong> - Professional casting</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse" style={{animationDelay: '0.8s'}}></div>
                    <span className="text-gray-300"><strong className="text-white">July 26, 2025</strong> - Championship day</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Requirements Section with bracket graphics */}
      <section ref={requirementsRef} className="section-padding bg-gradient-to-r from-green-900/20 to-blue-900/20">
        <div className="container-modern">
          <div className="text-center mb-16 scroll-animate opacity-0 translate-y-10 transition-all duration-1000">
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
              <ShieldIcon className="w-12 h-12 text-green-400 inline mr-4" />
              Requirements
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Everything you need to know to participate
            </p>
          </div>
          
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Team Requirements with bracket graphics */}
              <div className="relative group scroll-animate opacity-0 translate-x-[-50px] transition-all duration-1000" style={{transitionDelay: '200ms'}}>
                <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-3xl blur-xl"></div>
                <div className="relative bg-black/90 border border-green-700/50 rounded-3xl p-8 shadow-2xl backdrop-blur-sm">
                  {/* Bracket corner decorations */}
                  <div className="absolute top-4 left-4 w-6 h-6 border-l-2 border-t-2 border-green-500/50 group-hover:border-green-400 transition-colors"></div>
                  <div className="absolute top-4 right-4 w-6 h-6 border-r-2 border-t-2 border-green-500/50 group-hover:border-green-400 transition-colors"></div>
                  <div className="absolute bottom-4 left-4 w-6 h-6 border-l-2 border-b-2 border-green-500/50 group-hover:border-green-400 transition-colors"></div>
                  <div className="absolute bottom-4 right-4 w-6 h-6 border-r-2 border-b-2 border-green-500/50 group-hover:border-green-400 transition-colors"></div>
                  
                  <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
                    <Users className="w-8 h-8 text-green-400 mr-3" />
                    Team Requirements
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 animate-pulse" />
                      <span className="text-gray-300">Full team of <strong className="text-white">5 players</strong></span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 animate-pulse" style={{animationDelay: '0.2s'}} />
                      <span className="text-gray-300">Valid <strong className="text-white">Riot IDs</strong> for all players</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 animate-pulse" style={{animationDelay: '0.4s'}} />
                      <span className="text-gray-300"><strong className="text-white">Discord contact</strong> for communication</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 animate-pulse" style={{animationDelay: '0.6s'}} />
                      <span className="text-gray-300">All players must be <strong className="text-white">16+ years old</strong></span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Eligibility with bracket graphics */}
              <div className="relative group scroll-animate opacity-0 translate-x-[50px] transition-all duration-1000" style={{transitionDelay: '400ms'}}>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-3xl blur-xl"></div>
                <div className="relative bg-black/90 border border-blue-700/50 rounded-3xl p-8 shadow-2xl backdrop-blur-sm">
                  {/* Bracket corner decorations */}
                  <div className="absolute top-4 left-4 w-6 h-6 border-l-2 border-t-2 border-blue-500/50 group-hover:border-blue-400 transition-colors"></div>
                  <div className="absolute top-4 right-4 w-6 h-6 border-r-2 border-t-2 border-blue-500/50 group-hover:border-blue-400 transition-colors"></div>
                  <div className="absolute bottom-4 left-4 w-6 h-6 border-l-2 border-b-2 border-blue-500/50 group-hover:border-blue-400 transition-colors"></div>
                  <div className="absolute bottom-4 right-4 w-6 h-6 border-r-2 border-b-2 border-blue-500/50 group-hover:border-blue-400 transition-colors"></div>
                  
                  <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
                    <Globe className="w-8 h-8 text-blue-400 mr-3" />
                    Eligibility
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-6 h-6 text-blue-400 flex-shrink-0 animate-pulse" />
                      <span className="text-gray-300"><strong className="text-white">EU teams only</strong> - European region</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-6 h-6 text-blue-400 flex-shrink-0 animate-pulse" style={{animationDelay: '0.2s'}} />
                      <span className="text-gray-300"><strong className="text-white">No rank restrictions</strong> - All skill levels welcome</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-6 h-6 text-blue-400 flex-shrink-0 animate-pulse" style={{animationDelay: '0.4s'}} />
                      <span className="text-gray-300"><strong className="text-white">Community tournament</strong> - Open to everyone</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-6 h-6 text-blue-400 flex-shrink-0 animate-pulse" style={{animationDelay: '0.6s'}} />
                      <span className="text-gray-300"><strong className="text-white">Fair play</strong> - Anti-cheat protection</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Streaming Section with bracket graphics */}
      <section className="section-padding bg-black/40">
        <div className="container-modern">
          <div className="text-center mb-16 scroll-animate opacity-0 translate-y-10 transition-all duration-1000">
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
              <Video className="w-12 h-12 text-purple-400 inline mr-4" />
              Live Streaming
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Watch the action live with professional casting
            </p>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <div className="relative group scroll-animate opacity-0 scale-95 transition-all duration-1000">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
              <div className="relative bg-black/90 border border-purple-700/50 rounded-3xl p-12 shadow-2xl backdrop-blur-sm text-center">
                {/* Bracket corner decorations */}
                <div className="absolute top-6 left-6 w-8 h-8 border-l-2 border-t-2 border-purple-500/50 group-hover:border-purple-400 transition-colors"></div>
                <div className="absolute top-6 right-6 w-8 h-8 border-r-2 border-t-2 border-purple-500/50 group-hover:border-purple-400 transition-colors"></div>
                <div className="absolute bottom-6 left-6 w-8 h-8 border-l-2 border-b-2 border-purple-500/50 group-hover:border-purple-400 transition-colors"></div>
                <div className="absolute bottom-6 right-6 w-8 h-8 border-r-2 border-b-2 border-purple-500/50 group-hover:border-purple-400 transition-colors"></div>
                
                <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl animate-bounce" style={{animationDuration: '2s'}}>
                  <Video className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-3xl font-bold text-white mb-6">Live on Twitch</h3>
                <p className="text-xl text-gray-300 mb-8 leading-relaxed">
                  Selected qualifier matches and the full main event will be streamed live with professional casting
                </p>
                <a 
                  href="https://twitch.tv/bodaxalex" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-4 px-8 rounded-2xl shadow-2xl border border-purple-800 transition-all duration-300 text-lg font-medium group"
                >
                  <ExternalLink className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  <span>Watch on Twitch</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Final CTA Section with bracket graphics */}
      <section className="section-padding bg-gradient-to-r from-red-900/40 via-purple-900/40 to-blue-900/40 border-t border-red-700/30 relative">
        {/* Bracket decoration */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="absolute top-10 left-10 w-32 h-32 border-l-4 border-t-4 border-red-500/30"></div>
          <div className="absolute top-10 right-10 w-32 h-32 border-r-4 border-t-4 border-red-500/30"></div>
          <div className="absolute bottom-10 left-10 w-32 h-32 border-l-4 border-b-4 border-red-500/30"></div>
          <div className="absolute bottom-10 right-10 w-32 h-32 border-r-4 border-b-4 border-red-500/30"></div>
        </div>
        
        <div className="container-modern text-center">
          <div className="max-w-4xl mx-auto scroll-animate opacity-0 translate-y-10 transition-all duration-1000">
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-8">
              Ready to Claim Your Glory?
            </h2>
            <p className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
              Registration opens on <span className="text-red-400 font-bold">July 7, 2025</span>. 
              Be ready to secure your spot in the qualifier and fight for the <span className="text-green-400 font-bold">€300 prize pool</span>!
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <a 
                href="https://masters.bodax.dev/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="group inline-flex items-center space-x-3 bg-gradient-to-r from-red-600 to-purple-600 hover:from-red-700 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-2xl shadow-2xl border border-red-800 transition-all duration-300 text-xl font-medium"
              >
                <ExternalLink className="w-6 h-6 group-hover:scale-110 transition-transform" />
                <span>Register on July 7</span>
              </a>
              <Link 
                to="/" 
                className="inline-flex items-center space-x-3 bg-black/60 hover:bg-black/80 text-white font-bold py-4 px-8 rounded-2xl shadow-2xl border border-gray-700 transition-all duration-300 text-xl font-medium"
              >
                <ArrowLeft className="w-6 h-6" />
                <span>Back to Home</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Add CSS for scroll animations */}
      <style>{`
        .scroll-animate {
          opacity: 0;
          transform: translateY(30px);
          transition: all 0.8s ease-out;
        }
        
        .scroll-animate.animate-in {
          opacity: 1;
          transform: translateY(0);
        }
        
        @keyframes bracket-glow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
        
        .bracket-glow {
          animation: bracket-glow 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default TournamentInfo; 