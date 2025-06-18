import React, { useState, useEffect } from 'react';
import { AlertTriangle, MessageCircle, ExternalLink, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface GlobalDiscordNotificationProps {
  discordLinked: boolean;
  inDiscordServer: boolean;
}

const DISCORD_INVITE = 'https://discord.gg/MZzEyX3peN';

const GlobalDiscordNotification: React.FC<GlobalDiscordNotificationProps> = ({
  discordLinked,
  inDiscordServer
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!discordLinked) {
      // Show notification after a short delay
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [discordLinked]);

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsVisible(false);
  };

  const handleLinkDiscord = () => {
    navigate('/profile');
  };

  const handleJoinServer = () => {
    window.open(DISCORD_INVITE, '_blank', 'noopener,noreferrer');
  };

  // Don't show if requirements are met or dismissed
  if (discordLinked || isDismissed) {
    return null;
  }

  return (
    <>
      {/* Persistent floating notification */}
      {isVisible && (
        <div className="fixed bottom-4 right-4 z-50 animate-bounce">
          <div className="bg-gradient-to-r from-red-900 to-red-800 border-2 border-red-500 rounded-lg p-4 shadow-2xl max-w-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-300 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-bold text-red-100 text-sm mb-1">Discord Required!</div>
                <div className="text-red-200 text-xs mb-3">
                  Link Discord & join server to participate in tournaments
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleLinkDiscord}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-bold transition-colors"
                  >
                    Link Discord
                  </button>
                  <button
                    onClick={handleJoinServer}
                    className="bg-gray-700 hover:bg-gray-800 text-white px-3 py-1 rounded text-xs font-bold transition-colors"
                  >
                    Join Server
                  </button>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="text-red-300 hover:text-white text-lg font-bold"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Corner indicator */}
      {isVisible && (
        <div className="fixed top-4 right-4 z-40">
          <div className="bg-red-600 text-white text-xs px-2 py-1 rounded-full font-bold animate-pulse">
            DISCORD REQUIRED
          </div>
        </div>
      )}
    </>
  );
};

export default GlobalDiscordNotification; 