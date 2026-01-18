import React from 'react';
import { X } from 'lucide-react';
import { getRiotAuthUrl } from '../services/riotOAuthService';

interface RiotLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const RiotLoginModal = ({ isOpen, onClose }: RiotLoginModalProps) => {
  if (!isOpen) return null;

  const handleRiotLogin = () => {
    try {
      const authUrl = getRiotAuthUrl();
      window.location.href = authUrl;
    } catch (error) {
      console.error('Failed to get Riot auth URL:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-[#0a0a0a] border border-gray-800 rounded-lg shadow-2xl max-w-md w-full p-8 z-10">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-20"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-2 font-bodax uppercase tracking-wide">
            Sign In / Register
          </h2>
          <p className="text-gray-400 text-sm">
            Use your Riot Games account to sign in or create an account
          </p>
        </div>

        {/* Official Riot Games Sign-In Button - Red with White Fist Logo */}
        <button
          onClick={handleRiotLogin}
          className="w-full py-4 px-6 rounded transition-all duration-200 transform hover:opacity-90 active:scale-[0.98] flex items-center justify-center space-x-3 relative overflow-hidden"
          style={{
            backgroundColor: '#D32F2F', // Riot Games red
            color: 'white'
          }}
        >
          {/* Riot Games Fist Logo - White (Official Style) */}
          <svg 
            className="w-8 h-8 flex-shrink-0" 
            viewBox="0 0 24 24" 
            fill="white"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Riot Fist - Simplified geometric fist matching official logo style */}
            <g fill="white">
              {/* Main fist body */}
              <rect x="9" y="7" width="6" height="7" rx="1" fill="white"/>
              {/* Thumb */}
              <rect x="6" y="9" width="3" height="3" rx="0.5" fill="white"/>
              {/* Knuckles - 4 circles representing fingers */}
              <circle cx="10.5" cy="8" r="0.8" fill="white"/>
              <circle cx="12.5" cy="7.5" r="0.8" fill="white"/>
              <circle cx="14.5" cy="8" r="0.8" fill="white"/>
              <circle cx="16" cy="9.5" r="0.8" fill="white"/>
            </g>
          </svg>
          
          <span className="text-white font-semibold text-lg">Sign in with Riot Games</span>
        </button>

        {/* Info text */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            New users will be asked to choose a username after signing in
          </p>
        </div>
      </div>
    </div>
  );
};

export default RiotLoginModal;
