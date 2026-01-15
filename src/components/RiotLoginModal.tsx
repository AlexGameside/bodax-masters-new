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
      <div className="relative bg-[#0a0a0a] border-2 border-[#C89B3C] rounded-lg shadow-2xl max-w-md w-full p-8 z-10">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Riot Games Logo/Branding */}
        <div className="text-center mb-8">
          <div className="mb-6">
            {/* Riot Games Logo - Using their official brand colors */}
            <div className="flex items-center justify-center mb-3">
              <div 
                className="text-5xl font-bold tracking-tight"
                style={{ 
                  color: '#C89B3C',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  letterSpacing: '0.05em'
                }}
              >
                RIOT
              </div>
              <div 
                className="text-5xl font-bold ml-3 tracking-tight"
                style={{ 
                  color: '#F0E6D2',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  letterSpacing: '0.05em'
                }}
              >
                GAMES
              </div>
            </div>
            <div 
              className="text-sm font-semibold uppercase tracking-widest mb-1"
              style={{ color: '#C89B3C' }}
            >
              Sign On
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-3 font-bodax uppercase tracking-wide">
            Welcome to Bodax Masters
          </h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            Sign in or create an account with your Riot Games account.<br />
            New users will be asked to choose a username after signing in.
          </p>
        </div>

        {/* Riot Sign-On Button - Official Riot styling */}
        <button
          onClick={handleRiotLogin}
          className="w-full py-4 px-6 rounded-lg font-bold text-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-xl hover:shadow-2xl"
          style={{
            background: 'linear-gradient(135deg, #C89B3C 0%, #D4AF37 50%, #F0E6D2 100%)',
            color: '#0A1428',
            border: '2px solid #C89B3C',
            boxShadow: '0 4px 15px rgba(200, 155, 60, 0.3)'
          }}
        >
          <div className="flex items-center justify-center space-x-3">
            {/* Riot Shield Icon */}
            <svg 
              className="w-7 h-7" 
              viewBox="0 0 24 24" 
              fill="currentColor"
              style={{ color: '#0A1428' }}
            >
              <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5zm0 2.18l8 4v8.64c0 4.3-2.8 8.36-6.8 9.54-4-1.18-6.8-5.24-6.8-9.54V8.18l8-4z"/>
            </svg>
            <span className="font-semibold tracking-wide">Sign in with Riot Games</span>
          </div>
        </button>

        {/* Info text */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500 leading-relaxed">
            By signing in, you agree to our{' '}
            <a href="/terms-of-service" className="underline hover:text-gray-400" onClick={(e) => { e.stopPropagation(); onClose(); }}>
              Terms of Service
            </a>
            {' '}and{' '}
            <a href="/privacy-policy" className="underline hover:text-gray-400" onClick={(e) => { e.stopPropagation(); onClose(); }}>
              Privacy Policy
            </a>
          </p>
        </div>

        {/* Riot Games branding footer */}
        <div className="mt-6 pt-6 border-t" style={{ borderColor: '#C89B3C', opacity: 0.3 }}>
          <div className="flex items-center justify-center space-x-2">
            <div className="text-xs" style={{ color: '#C89B3C' }}>
              Powered by
            </div>
            <div className="text-xs font-bold" style={{ color: '#F0E6D2' }}>
              Riot Games Sign-On
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiotLoginModal;

