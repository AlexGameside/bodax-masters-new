import React from 'react';
import { Star, Users, Trophy, Heart } from 'lucide-react';

const ComingSoonFooter = () => {
  return (
    <footer className="bg-gradient-to-t from-black via-gray-900/95 to-black/80 border-t border-purple-500/30 backdrop-blur-sm">
      <div className="container-modern py-12">
        <div className="text-center">
          {/* Brand */}
          <div className="mb-10">
            <div className="flex items-center justify-center mb-6">
              <div className="relative">
                <img 
                  src="/logo.png" 
                  alt="Unity League" 
                  className="w-16 h-16 rounded-full mr-4 shadow-2xl border-2 border-purple-500/30"
                />
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500/20 to-blue-500/20 animate-pulse"></div>
              </div>
              <span className="text-3xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                Unity League
              </span>
            </div>
            <p className="text-gray-300 max-w-2xl mx-auto text-lg leading-relaxed">
              The ultimate Valorant tournament platform. Get ready for epic battles, 
              strategic gameplay, and unforgettable moments.
            </p>
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10 max-w-4xl mx-auto">
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-600/20 to-purple-800/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-purple-500/30 group-hover:border-purple-400/50 transition-all duration-300 group-hover:scale-110">
                <Users className="w-8 h-8 text-purple-400 group-hover:text-purple-300 transition-colors" />
              </div>
              <h4 className="text-white font-bold mb-3 text-lg">Team Building</h4>
              <p className="text-gray-400 text-sm leading-relaxed">Create and manage your dream team</p>
            </div>
            
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600/20 to-blue-800/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/30 group-hover:border-blue-400/50 transition-all duration-300 group-hover:scale-110">
                <Trophy className="w-8 h-8 text-blue-400 group-hover:text-blue-300 transition-colors" />
              </div>
              <h4 className="text-white font-bold mb-3 text-lg">Tournaments</h4>
              <p className="text-gray-400 text-sm leading-relaxed">Compete in epic battles</p>
            </div>
            
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-green-600/20 to-green-800/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-green-500/30 group-hover:border-green-400/50 transition-all duration-300 group-hover:scale-110">
                <Star className="w-8 h-8 text-green-400 group-hover:text-green-300 transition-colors" />
              </div>
              <h4 className="text-white font-bold mb-3 text-lg">Discord Integration</h4>
              <p className="text-gray-400 text-sm leading-relaxed">Seamless team communication</p>
            </div>
          </div>

          {/* Social & Links */}
          <div className="border-t border-gray-700/50 pt-8 mb-8">
            <div className="flex flex-col sm:flex-row items-center justify-between text-sm text-gray-400 max-w-4xl mx-auto">
              <div className="mb-4 sm:mb-0">
                <span className="text-gray-300 font-medium">© 2025 Unity League.</span> All rights reserved.
              </div>
              <div className="flex items-center space-x-8">
                <a href="/privacy-policy" className="hover:text-white transition-colors duration-200 font-medium">
                  Privacy Policy
                </a>
                <a href="/terms-of-service" className="hover:text-white transition-colors duration-200 font-medium">
                  Terms of Service
                </a>
                <a href="/contact" className="hover:text-white transition-colors duration-200 font-medium">
                  Contact
                </a>
                <a href="/impressum" className="hover:text-white transition-colors duration-200 font-medium">
                  Impressum
                </a>
              </div>
            </div>
          </div>

          {/* Made with love */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-gray-800/50 to-gray-900/50 rounded-full border border-gray-600/30 backdrop-blur-sm">
              <p className="text-gray-400 text-sm flex items-center">
                Made with <Heart className="w-4 h-4 mx-2 text-red-400 animate-pulse" /> by{' '}
                <a 
                  href="https://x.com/GamingBodax" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 transition-all duration-200 font-semibold hover:scale-105 inline-block mx-1"
                >
                  Bodax
                </a>{' '}
                for the Valorant community
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default ComingSoonFooter; 