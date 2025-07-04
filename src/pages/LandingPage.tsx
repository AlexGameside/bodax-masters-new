import { Link } from 'react-router-dom';
import { 
  Calendar, 
  Trophy, 
  Users, 
  Euro, 
  ArrowRight, 
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
  Server
} from 'lucide-react';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-black text-white font-mono relative overflow-hidden">
      {/* Enhanced grid/code background with animated elements */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-10" 
           style={{
             backgroundImage: 'repeating-linear-gradient(0deg, #fff1 0 1px, transparent 1px 40px), repeating-linear-gradient(90deg, #fff1 0 1px, transparent 1px 40px)',
             animation: 'pulse 4s ease-in-out infinite alternate'
           }} />
      
      {/* Floating tech elements */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
        <div className="absolute top-40 right-20 w-1 h-1 bg-blue-400 rounded-full animate-ping"></div>
        <div className="absolute bottom-40 left-1/4 w-1 h-1 bg-green-400 rounded-full animate-bounce"></div>
      </div>

      {/* Hero Section */}
      <section className="relative section-padding overflow-hidden">
        <div className="container-modern relative z-20">
          <div className="text-center max-w-6xl mx-auto">
            <div className="flex items-center justify-center space-x-2 mb-6">
              <Sparkles className="w-6 h-6 text-red-400 animate-pulse" />
              <span className="text-sm font-medium text-red-300 bg-black/60 px-3 py-1 rounded-full border border-red-700 shadow shadow-black/20">
                The Future of Competitive Gaming
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold mb-6 leading-tight drop-shadow-lg bg-gradient-to-r from-red-500 via-purple-500 to-blue-500 bg-clip-text text-transparent uppercase tracking-tight">
              Gaming Hub
            </h1>
            <p className="text-lg sm:text-xl lg:text-2xl text-gray-300 mb-8 font-medium">
              Ultimate Tournament Platform & Competitive Gaming Ecosystem
            </p>
            <p className="text-base sm:text-lg text-gray-400 mb-12 max-w-3xl mx-auto">
              From competitive Valorant tournaments to a complete gaming ecosystem. Join the revolution where 
              competitive gaming meets cutting-edge technology. Build your legacy, compete globally, 
              and be part of the future of esports.
            </p>
            
            {/* Current Tournament Highlight */}
            <div className="bg-gradient-to-r from-red-900/40 to-purple-900/40 border border-red-700/50 rounded-2xl p-8 mb-12 shadow-2xl">
              <div className="flex items-center justify-center space-x-2 mb-4">
                <Trophy className="w-8 h-8 text-red-400" />
                <span className="text-xl font-bold text-red-300">COMING SOON</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                Bodax Masters Championship 2025
              </h2>
              <p className="text-gray-300 mb-6">
                Join the ultimate Valorant tournament with €300 prize pool. Registration opens July 7th!
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-400">€300</div>
                  <div className="text-sm text-gray-400">Prize Pool</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-400">8</div>
                  <div className="text-sm text-gray-400">Teams</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-400">Live</div>
                  <div className="text-sm text-gray-400">Streaming</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-400">07.07</div>
                  <div className="text-sm text-gray-400">Registration</div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/tournament-info" className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg border border-red-800 transition-all duration-200 text-lg font-medium inline-flex items-center justify-center space-x-2">
                  <Eye className="w-5 h-5" />
                  <span>View Full Details</span>
                </Link>
                <Link to="/register" className="bg-black/60 hover:bg-black/80 text-white font-bold py-3 px-6 rounded-lg shadow-lg border border-gray-700 transition-all duration-200 text-lg font-medium">
                  Get Notified
                </Link>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register" className="bg-gradient-to-r from-red-600 to-purple-600 hover:from-red-700 hover:to-purple-700 text-white font-bold py-3 sm:py-4 px-6 sm:px-8 rounded-lg shadow-lg border border-red-800 transition-all duration-200 text-base sm:text-lg inline-flex items-center justify-center space-x-2">
                <span>Start Competing</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/tournaments" className="bg-black/60 hover:bg-black/80 text-white font-bold py-3 sm:py-4 px-6 sm:px-8 rounded-lg shadow-lg border border-gray-700 transition-all duration-200 text-base sm:text-lg">
                Explore Platform
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Current Features Section */}
      <section className="section-padding bg-black/40">
        <div className="container-modern">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              <CheckCircle className="w-8 h-8 text-green-400 inline mr-3" />
              Available Now
            </h2>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              Experience the cutting-edge features that are already powering our platform
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Tournament System */}
            <div className="bg-black/60 border border-green-700/50 rounded-xl p-6 shadow-lg shadow-black/20 card-hover">
              <div className="w-12 h-12 bg-green-900/50 border border-green-700 rounded-lg flex items-center justify-center mb-4">
                <Trophy className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Advanced Tournament System</h3>
              <p className="text-gray-400 mb-4">Complete tournament management with brackets, match scheduling, and real-time updates</p>
              <div className="flex flex-wrap gap-2">
                <span className="bg-green-500/20 text-green-300 px-2 py-1 rounded text-xs">Single Elimination</span>
                <span className="bg-green-500/20 text-green-300 px-2 py-1 rounded text-xs">Live Brackets</span>
                <span className="bg-green-500/20 text-green-300 px-2 py-1 rounded text-xs">Auto-Advancement</span>
              </div>
            </div>

            {/* Team Management */}
            <div className="bg-black/60 border border-green-700/50 rounded-xl p-6 shadow-lg shadow-black/20 card-hover">
              <div className="w-12 h-12 bg-green-900/50 border border-green-700 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Team Management</h3>
              <p className="text-gray-400 mb-4">Create teams, manage members, handle invitations, and track team performance</p>
              <div className="flex flex-wrap gap-2">
                <span className="bg-green-500/20 text-green-300 px-2 py-1 rounded text-xs">Member Roles</span>
                <span className="bg-green-500/20 text-green-300 px-2 py-1 rounded text-xs">Invitations</span>
                <span className="bg-green-500/20 text-green-300 px-2 py-1 rounded text-xs">Team Stats</span>
              </div>
            </div>

            {/* Match System */}
            <div className="bg-black/60 border border-green-700/50 rounded-xl p-6 shadow-lg shadow-black/20 card-hover">
              <div className="w-12 h-12 bg-green-900/50 border border-green-700 rounded-lg flex items-center justify-center mb-4">
                <Gamepad2 className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Smart Match System</h3>
              <p className="text-gray-400 mb-4">Map banning, side selection, ready-up system, and automated match progression</p>
              <div className="flex flex-wrap gap-2">
                <span className="bg-green-500/20 text-green-300 px-2 py-1 rounded text-xs">Map Banning</span>
                <span className="bg-green-500/20 text-green-300 px-2 py-1 rounded text-xs">Side Selection</span>
                <span className="bg-green-500/20 text-green-300 px-2 py-1 rounded text-xs">Auto-Progress</span>
              </div>
            </div>

            {/* Real-time Updates */}
            <div className="bg-black/60 border border-green-700/50 rounded-xl p-6 shadow-lg shadow-black/20 card-hover">
              <div className="w-12 h-12 bg-green-900/50 border border-green-700 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Real-time Updates</h3>
              <p className="text-gray-400 mb-4">Live match updates, notifications, and instant synchronization across all users</p>
              <div className="flex flex-wrap gap-2">
                <span className="bg-green-500/20 text-green-300 px-2 py-1 rounded text-xs">Live Updates</span>
                <span className="bg-green-500/20 text-green-300 px-2 py-1 rounded text-xs">Notifications</span>
                <span className="bg-green-500/20 text-green-300 px-2 py-1 rounded text-xs">Sync</span>
              </div>
            </div>

            {/* Admin Panel */}
            <div className="bg-black/60 border border-green-700/50 rounded-xl p-6 shadow-lg shadow-black/20 card-hover">
              <div className="w-12 h-12 bg-green-900/50 border border-green-700 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Admin Control</h3>
              <p className="text-gray-400 mb-4">Comprehensive admin panel for tournament management, user oversight, and system control</p>
              <div className="flex flex-wrap gap-2">
                <span className="bg-green-500/20 text-green-300 px-2 py-1 rounded text-xs">User Management</span>
                <span className="bg-green-500/20 text-green-300 px-2 py-1 rounded text-xs">Tournament Control</span>
                <span className="bg-green-500/20 text-green-300 px-2 py-1 rounded text-xs">Analytics</span>
              </div>
            </div>

            {/* Discord Integration */}
            <div className="bg-black/60 border border-green-700/50 rounded-xl p-6 shadow-lg shadow-black/20 card-hover">
              <div className="w-12 h-12 bg-green-900/50 border border-green-700 rounded-lg flex items-center justify-center mb-4">
                <MessageSquare className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Discord Integration</h3>
              <p className="text-gray-400 mb-4">Seamless Discord integration with notifications, team channels, and community features</p>
              <div className="flex flex-wrap gap-2">
                <span className="bg-green-500/20 text-green-300 px-2 py-1 rounded text-xs">Notifications</span>
                <span className="bg-green-500/20 text-green-300 px-2 py-1 rounded text-xs">Team Channels</span>
                <span className="bg-green-500/20 text-green-300 px-2 py-1 rounded text-xs">Community</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Coming Soon Features */}
      <section className="section-padding bg-black/20">
        <div className="container-modern">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              <Rocket className="w-8 h-8 text-blue-400 inline mr-3" />
              Coming Soon
            </h2>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              The future of competitive gaming is being built right now
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Advanced Analytics */}
            <div className="bg-black/60 border border-blue-700/50 rounded-xl p-6 shadow-lg shadow-black/20 card-hover">
              <div className="w-12 h-12 bg-blue-900/50 border border-blue-700 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Advanced Analytics</h3>
              <p className="text-gray-400 mb-4">Detailed performance tracking, match statistics, and player insights</p>
              <div className="flex items-center text-blue-400 text-sm">
                <Clock className="w-4 h-4 mr-2" />
                <span>Q2 2025</span>
              </div>
            </div>

            {/* Global Rankings */}
            <div className="bg-black/60 border border-blue-700/50 rounded-xl p-6 shadow-lg shadow-black/20 card-hover">
              <div className="w-12 h-12 bg-blue-900/50 border border-blue-700 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Global Ranking System</h3>
              <p className="text-gray-400 mb-4">ELO-based rankings, skill-based matchmaking, and regional leaderboards</p>
              <div className="flex items-center text-blue-400 text-sm">
                <Clock className="w-4 h-4 mr-2" />
                <span>Q2 2025</span>
              </div>
            </div>

            {/* Live Streaming */}
            <div className="bg-black/60 border border-blue-700/50 rounded-xl p-6 shadow-lg shadow-black/20 card-hover">
              <div className="w-12 h-12 bg-blue-900/50 border border-blue-700 rounded-lg flex items-center justify-center mb-4">
                <Video className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Integrated Streaming</h3>
              <p className="text-gray-400 mb-4">Built-in streaming tools, overlay creation, and tournament broadcasting</p>
              <div className="flex items-center text-blue-400 text-sm">
                <Clock className="w-4 h-4 mr-2" />
                <span>Q3 2025</span>
              </div>
            </div>

            {/* Mobile App */}
            <div className="bg-black/60 border border-blue-700/50 rounded-xl p-6 shadow-lg shadow-black/20 card-hover">
              <div className="w-12 h-12 bg-blue-900/50 border border-blue-700 rounded-lg flex items-center justify-center mb-4">
                <Smartphone className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Mobile Application</h3>
              <p className="text-gray-400 mb-4">Full-featured mobile app with push notifications and cross-platform sync</p>
              <div className="flex items-center text-blue-400 text-sm">
                <Clock className="w-4 h-4 mr-2" />
                <span>Q3 2025</span>
              </div>
            </div>

            {/* Coaching Platform */}
            <div className="bg-black/60 border border-blue-700/50 rounded-xl p-6 shadow-lg shadow-black/20 card-hover">
              <div className="w-12 h-12 bg-blue-900/50 border border-blue-700 rounded-lg flex items-center justify-center mb-4">
                <BookOpen className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Coaching Platform</h3>
              <p className="text-gray-400 mb-4">Find coaches, book sessions, and access training resources</p>
              <div className="flex items-center text-blue-400 text-sm">
                <Clock className="w-4 h-4 mr-2" />
                <span>Q4 2025</span>
              </div>
            </div>

            {/* Community Hub */}
            <div className="bg-black/60 border border-blue-700/50 rounded-xl p-6 shadow-lg shadow-black/20 card-hover">
              <div className="w-12 h-12 bg-blue-900/50 border border-blue-700 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Community Hub</h3>
              <p className="text-gray-400 mb-4">Forums, strategy sharing, team recruitment, and social features</p>
              <div className="flex items-center text-blue-400 text-sm">
                <Clock className="w-4 h-4 mr-2" />
                <span>Q4 2025</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Statistics */}
      <section className="section-padding bg-black/40">
        <div className="container-modern">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              <BarChart3 className="w-8 h-8 text-purple-400 inline mr-3" />
              Platform Statistics
            </h2>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              Growing stronger every day with our amazing community
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-purple-400 mb-2">500+</div>
              <div className="text-gray-400">Active Players</div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-purple-400 mb-2">50+</div>
              <div className="text-gray-400">Teams Created</div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-purple-400 mb-2">100+</div>
              <div className="text-gray-400">Matches Played</div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-purple-400 mb-2">€1000+</div>
              <div className="text-gray-400">Prize Money Distributed</div>
            </div>
          </div>
        </div>
      </section>

      {/* Future Vision */}
      <section className="section-padding bg-black/20">
        <div className="container-modern">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              <Eye className="w-8 h-8 text-yellow-400 inline mr-3" />
              Future Vision
            </h2>
            <p className="text-lg text-gray-300 max-w-3xl mx-auto">
              We're building more than just a tournament platform. We're creating the ultimate 
              competitive gaming ecosystem that will revolutionize how players compete, connect, and grow.
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-black/60 border border-yellow-700/50 rounded-xl p-8 shadow-lg shadow-black/20">
              <h3 className="text-2xl font-bold text-white mb-4 flex items-center">
                <Globe className="w-6 h-6 text-yellow-400 mr-3" />
                Global Gaming Community
              </h3>
              <ul className="text-gray-300 space-y-3">
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mr-3 mt-2 flex-shrink-0"></div>
                  <span>Multi-language support for global accessibility</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mr-3 mt-2 flex-shrink-0"></div>
                  <span>Regional servers and localized content</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mr-3 mt-2 flex-shrink-0"></div>
                  <span>Cross-region tournaments and competitions</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mr-3 mt-2 flex-shrink-0"></div>
                  <span>International esports partnerships</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-black/60 border border-yellow-700/50 rounded-xl p-8 shadow-lg shadow-black/20">
              <h3 className="text-2xl font-bold text-white mb-4 flex items-center">
                <Crown className="w-6 h-6 text-yellow-400 mr-3" />
                Skill Development Platform
              </h3>
              <ul className="text-gray-300 space-y-3">
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mr-3 mt-2 flex-shrink-0"></div>
                  <span>Advanced coaching and mentorship programs</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mr-3 mt-2 flex-shrink-0"></div>
                  <span>Comprehensive skill assessment and tracking</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mr-3 mt-2 flex-shrink-0"></div>
                  <span>Training resources and strategy guides</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mr-3 mt-2 flex-shrink-0"></div>
                  <span>Career development and progression tracking</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Technology Stack */}
      <section className="section-padding bg-black/40">
        <div className="container-modern">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              <Cpu className="w-8 h-8 text-green-400 inline mr-3" />
              Powered by Cutting-Edge Technology
            </h2>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              Built with modern technologies for performance, scalability, and reliability
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-900/50 border border-green-700 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Database className="w-8 h-8 text-green-400" />
              </div>
              <div className="text-sm text-gray-400">Firebase</div>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-900/50 border border-blue-700 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Server className="w-8 h-8 text-blue-400" />
              </div>
              <div className="text-sm text-gray-400">React</div>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-900/50 border border-purple-700 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Network className="w-8 h-8 text-purple-400" />
              </div>
              <div className="text-sm text-gray-400">TypeScript</div>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-900/50 border border-yellow-700 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Wifi className="w-8 h-8 text-yellow-400" />
              </div>
              <div className="text-sm text-gray-400">Real-time</div>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-red-900/50 border border-red-700 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Lock className="w-8 h-8 text-red-400" />
              </div>
              <div className="text-sm text-gray-400">Secure</div>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-900/50 border border-indigo-700 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Zap className="w-8 h-8 text-indigo-400" />
              </div>
              <div className="text-sm text-gray-400">Fast</div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="section-padding bg-gradient-to-r from-red-900/40 via-purple-900/40 to-blue-900/40">
        <div className="container-modern text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6 sm:mb-8">
            Ready to Join the Future?
          </h2>
          <p className="text-lg sm:text-xl text-gray-300 mb-8 sm:mb-12 max-w-3xl mx-auto">
            Be part of the gaming revolution. Whether you're a casual player or aspiring pro, 
            our platform has everything you need to compete, grow, and succeed in the world of esports.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center">
            <Link to="/register" className="bg-gradient-to-r from-red-600 to-purple-600 hover:from-red-700 hover:to-purple-700 text-white font-bold py-3 sm:py-4 px-6 sm:px-8 rounded-lg shadow-lg border border-red-800 transition-all duration-200 text-base sm:text-lg inline-flex items-center justify-center space-x-2">
              <span>Start Your Journey</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/tournaments" className="bg-black/60 hover:bg-black/80 text-white font-bold py-3 sm:py-4 px-6 sm:px-8 rounded-lg shadow-lg border border-gray-700 transition-all duration-200 text-base sm:text-lg">
              Explore Tournaments
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage; 