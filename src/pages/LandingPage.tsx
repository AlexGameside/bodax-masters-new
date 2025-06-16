import { Link } from 'react-router-dom';
import { Calendar, Trophy, Users, Euro, ArrowRight, Star, Zap, Shield, Play } from 'lucide-react';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-black text-white font-mono relative overflow-hidden">
      {/* Subtle grid/code background */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-10" style={{backgroundImage: 'repeating-linear-gradient(0deg, #fff1 0 1px, transparent 1px 40px), repeating-linear-gradient(90deg, #fff1 0 1px, transparent 1px 40px)'}} />
      
      {/* Hero Section */}
      <section className="relative section-padding overflow-hidden">
        <div className="container-modern relative z-20">
          <div className="text-center max-w-4xl mx-auto">
            <div className="flex items-center justify-center space-x-2 mb-6">
              <Star className="w-6 h-6 text-red-400" />
              <span className="text-sm font-medium text-red-300 bg-black/60 px-3 py-1 rounded-full border border-red-700 shadow shadow-black/20">
                Registration Now Open
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold mb-6 leading-tight drop-shadow-lg bg-gradient-to-r from-red-500 to-white bg-clip-text text-transparent uppercase tracking-tight">
              Bodax Masters
            </h1>
            <p className="text-lg sm:text-xl lg:text-2xl text-gray-300 mb-8 font-medium">
              Valorant Tournament 2025
            </p>
            <p className="text-base sm:text-lg text-gray-400 mb-12 max-w-2xl mx-auto">
              Join the ultimate competitive Valorant experience. Compete against the best teams 
              and claim your share of the €300 prize pool.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8 mb-12">
              <div className="bg-black/60 border border-gray-700 rounded-xl p-6 shadow-lg shadow-black/20 text-center card-hover">
                <Euro className="w-10 h-10 sm:w-12 sm:h-12 text-red-400 mx-auto mb-4" />
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">€300</h3>
                <p className="text-sm sm:text-base text-gray-400">Prize Pool</p>
              </div>
              <div className="bg-black/60 border border-gray-700 rounded-xl p-6 shadow-lg shadow-black/20 text-center card-hover">
                <Users className="w-10 h-10 sm:w-12 sm:h-12 text-red-400 mx-auto mb-4" />
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">8 Teams</h3>
                <p className="text-sm sm:text-base text-gray-400">Tournament</p>
              </div>
              <div className="bg-black/60 border border-gray-700 rounded-xl p-6 shadow-lg shadow-black/20 text-center card-hover">
                <Trophy className="w-10 h-10 sm:w-12 sm:h-12 text-red-400 mx-auto mb-4" />
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">Single</h3>
                <p className="text-sm sm:text-base text-gray-400">Elimination</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register" className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 sm:py-4 px-6 sm:px-8 rounded-lg shadow-lg border border-red-800 transition-all duration-200 text-base sm:text-lg inline-flex items-center justify-center space-x-2">
                <span>Register Your Team</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/tournaments" className="bg-black/60 hover:bg-black/80 text-white font-bold py-3 sm:py-4 px-6 sm:px-8 rounded-lg shadow-lg border border-gray-700 transition-all duration-200 text-base sm:text-lg">
                View Tournaments
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Tournament Section */}
      <section className="section-padding bg-black/40">
        <div className="container-modern">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Featured Tournament
            </h2>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              Don't miss out on our premier Valorant tournament. Register now and compete for glory!
            </p>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <div className="bg-black/60 border border-gray-700 rounded-2xl p-8 shadow-2xl shadow-black/30">
              <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8">
                <div className="flex-shrink-0">
                  <div className="w-24 h-24 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-lg">
                    <Trophy className="w-12 h-12 text-white" />
                  </div>
                </div>
                
                <div className="flex-1 text-center lg:text-left">
                  <div className="flex items-center justify-center lg:justify-start space-x-2 mb-4">
                    <span className="bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-sm font-medium border border-green-500/30">
                      Registration Open
                    </span>
                    <span className="bg-red-500/20 text-red-300 px-3 py-1 rounded-full text-sm font-medium border border-red-500/30">
                      July 26, 2025
                    </span>
                  </div>
                  
                  <h3 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                    Bodax Masters Championship
                  </h3>
                  
                  <p className="text-gray-300 mb-6 text-lg">
                    The ultimate Valorant tournament featuring the best teams competing for a €300 prize pool. 
                    Single elimination format with live streaming and professional casting.
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
                      <div className="text-2xl font-bold text-red-400">7</div>
                      <div className="text-sm text-gray-400">Matches</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-400">Live</div>
                      <div className="text-sm text-gray-400">Streamed</div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                    <Link 
                      to="/register" 
                      className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg border border-red-800 transition-all duration-200 text-lg font-medium inline-flex items-center justify-center space-x-2"
                    >
                      <Play className="w-5 h-5" />
                      <span>Register Now</span>
                    </Link>
                    <Link 
                      to="/tournaments" 
                      className="bg-black/60 hover:bg-black/80 text-white font-bold py-3 px-6 rounded-lg shadow-lg border border-gray-700 transition-all duration-200 text-lg font-medium"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="section-padding-sm bg-black/20">
        <div className="container-modern">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-900/50 border border-red-700 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="font-semibold text-white mb-2">Fast Registration</h3>
              <p className="text-sm text-gray-400">Quick and easy team registration process</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-red-900/50 border border-red-700 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="font-semibold text-white mb-2">Fair Play</h3>
              <p className="text-sm text-gray-400">Anti-cheat and fair competition guaranteed</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-red-900/50 border border-red-700 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="font-semibold text-white mb-2">Real Prizes</h3>
              <p className="text-sm text-gray-400">Cash prizes for top performing teams</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-red-900/50 border border-red-700 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="font-semibold text-white mb-2">Community</h3>
              <p className="text-sm text-gray-400">Join our growing Valorant community</p>
            </div>
          </div>
        </div>
      </section>

      {/* Event Details Section */}
      <section className="section-padding bg-black/40">
        <div className="container-modern">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-12 sm:mb-16 text-center">
            Tournament Details
          </h2>
          <div className="max-w-4xl mx-auto">
            <div className="bg-black/60 border border-gray-700 rounded-xl p-8 shadow-lg shadow-black/20 card-hover">
              <div className="flex items-center mb-6">
                <Trophy className="w-8 h-8 text-red-400 mr-4" />
                <h3 className="text-xl sm:text-2xl font-bold text-white">Bodax Masters Championship</h3>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-red-400 mb-4">July 26, 2025</p>
              <ul className="text-gray-400 space-y-2 text-sm sm:text-base">
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-red-400 rounded-full mr-3"></div>
                  Single Elimination Format
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-red-400 rounded-full mr-3"></div>
                  8 Teams Maximum
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-red-400 rounded-full mr-3"></div>
                  €300 Prize Pool
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-red-400 rounded-full mr-3"></div>
                  Live Streamed Event
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-red-400 rounded-full mr-3"></div>
                  Professional Casting
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-red-400 rounded-full mr-3"></div>
                  Anti-Cheat Protection
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Prize Pool Section */}
      <section className="section-padding bg-black/20">
        <div className="container-modern text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-12 sm:mb-16">
            Prize Distribution
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 max-w-4xl mx-auto">
            <div className="bg-black/60 border border-gray-700 rounded-xl p-8 shadow-lg shadow-black/20 text-center card-hover">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-400/90 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-xl sm:text-2xl font-bold text-white">1</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-red-200 mb-2">€150</h3>
              <p className="text-gray-300 text-sm sm:text-base">First Place</p>
            </div>
            <div className="bg-black/60 border border-gray-700 rounded-xl p-8 shadow-lg shadow-black/20 text-center card-hover">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-500/80 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-xl sm:text-2xl font-bold text-white">2</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-200 mb-2">€100</h3>
              <p className="text-gray-300 text-sm sm:text-base">Second Place</p>
            </div>
            <div className="bg-black/60 border border-gray-700 rounded-xl p-8 shadow-lg shadow-black/20 text-center card-hover">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-amber-400/90 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-xl sm:text-2xl font-bold text-white">3</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-amber-200 mb-2">€50</h3>
              <p className="text-gray-300 text-sm sm:text-base">Third Place</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding bg-black/40">
        <div className="container-modern text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6 sm:mb-8">
            Ready to Compete?
          </h2>
          <p className="text-lg sm:text-xl text-gray-300 mb-8 sm:mb-12 max-w-2xl mx-auto">
            Join the ultimate Valorant tournament and prove your team's worth. 
            Registration is now open for the Bodax Masters Championship 2025.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center">
            <Link to="/register" className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 sm:py-4 px-6 sm:px-8 rounded-lg shadow-lg border border-red-800 transition-all duration-200 text-base sm:text-lg inline-flex items-center justify-center space-x-2">
              <span>Register Now</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/tournaments" className="bg-black/60 hover:bg-black/80 text-white font-bold py-3 sm:py-4 px-6 sm:px-8 rounded-lg shadow-lg border border-gray-700 transition-all duration-200 text-base sm:text-lg">
              View All Tournaments
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage; 