import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Bell, Users, Zap } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const DiscordLinkPopup: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const { currentUser } = useAuth();

  useEffect(() => {
    // Only show popup if user is not logged in or Discord is not linked
    if (!currentUser || currentUser.discordLinked) {
      return;
    }

    // Check if user has already dismissed the popup
    // Note: localStorage persists across browser sessions, refreshes, and cookie clears
    // This ensures users only see the popup once, even if they clear cookies
    const hasSeenPopup = localStorage.getItem('discord-link-popup-dismissed');
    console.log('Discord popup check:', { hasSeenPopup, willShow: !hasSeenPopup, discordLinked: currentUser.discordLinked });
    
    // Development helper - add reset function to window for testing
    if (process.env.NODE_ENV === 'development') {
      (window as any).resetDiscordPopup = () => {
        localStorage.removeItem('discord-link-popup-dismissed');
        console.log('Discord popup reset - refresh page to see it again');
      };
    }
    
    if (!hasSeenPopup) {
      // Show popup after a short delay to ensure page is loaded
      const timer = setTimeout(() => {
        console.log('Showing Discord popup');
        setIsVisible(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [currentUser]);

  const handleDismiss = () => {
    console.log('Discord popup dismissed');
    setIsVisible(false);
    // Mark as dismissed in localStorage so it won't show again
    localStorage.setItem('discord-link-popup-dismissed', 'true');
  };

  if (!isVisible) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" 
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0,
        height: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-pink-400/30 rounded-xl shadow-2xl max-w-2xl w-full mx-6 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 to-cyan-500/5"></div>
        
        {/* Close Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Close button clicked');
            handleDismiss();
          }}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-50 bg-gray-800/50 hover:bg-gray-700/50 rounded-full p-2"
          aria-label="Close popup"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8 relative z-10">
          {/* News Article Header */}
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-3 h-3 bg-pink-400 rounded-full"></div>
            <span className="text-sm text-pink-400 font-medium uppercase tracking-wide">Unity League News</span>
          </div>

          {/* Main Content */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-4 text-cyan-400 mb-6">
              <Bell className="w-8 h-8" />
              <h3 className="text-2xl font-bold text-white">Stay Connected with Unity League!</h3>
            </div>
            
            <div className="text-gray-300 text-base leading-relaxed space-y-4">
              <p>
                <strong className="text-white">Join our Discord community</strong> and never miss important updates!
              </p>
              
              <div className="flex items-center justify-center space-x-6 text-sm">
                <div className="flex items-center space-x-2">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  <span>Match notifications</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-blue-400" />
                  <span>Community chat</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MessageSquare className="w-5 h-5 text-green-400" />
                  <span>Quick support</span>
                </div>
              </div>

              <p className="text-gray-400">
                <strong className="text-pink-400">Link your Discord account</strong> to get instant notifications about your matches and easier access to our support team.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            <a
              href="/profile"
              className="block w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-4 px-8 rounded-lg shadow-md transition-colors duration-200 flex items-center justify-center space-x-3"
              onClick={handleDismiss}
            >
              <MessageSquare className="w-6 h-6" />
              <span>Link Discord Account</span>
            </a>
            <a
              href="https://discord.gg/ewAk7wBgHT"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-semibold py-4 px-8 rounded-lg shadow-md transition-colors duration-200 flex items-center justify-center space-x-3"
              onClick={handleDismiss}
            >
              <Users className="w-6 h-6" />
              <span>Join Discord Server</span>
            </a>
            <button
              onClick={handleDismiss}
              className="block w-full bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium py-3 px-8 rounded-lg transition-colors duration-200"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiscordLinkPopup;