import React, { useState, useEffect } from 'react';
import { MessageCircle, ExternalLink, AlertTriangle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DiscordLinkBannerProps {
  discordLinked: boolean;
  inDiscordServer: boolean;
  onDismiss?: () => void;
}

const DISCORD_INVITE = 'https://discord.gg/MZzEyX3peN';

const DiscordLinkBanner: React.FC<DiscordLinkBannerProps> = ({ discordLinked, inDiscordServer, onDismiss }) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  // Show modal if Discord requirements not met and banner not dismissed
  useEffect(() => {
    if (!discordLinked || !inDiscordServer) {
      if (!isDismissed) {
        // Show modal after a short delay to make it more annoying
        const timer = setTimeout(() => {
          setShowModal(true);
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [discordLinked, inDiscordServer, isDismissed]);

  const handleDismiss = () => {
    setIsDismissed(true);
    setShowModal(false);
    onDismiss?.();
  };

  const handleLinkDiscord = () => {
    navigate('/profile');
  };

  const handleJoinServer = () => {
    window.open(DISCORD_INVITE, '_blank', 'noopener,noreferrer');
  };

  // Don't show anything if requirements are met
  if (discordLinked && inDiscordServer) return null;

  return (
    <>
      {/* Persistent banner at top */}
      {!isDismissed && (
        <div className="bg-gradient-to-r from-red-900 to-red-800 border-2 border-red-500 text-white px-6 py-4 rounded-lg flex items-center justify-between shadow-2xl mb-6 animate-pulse">
          <div className="flex items-center gap-4">
            <AlertTriangle className="w-8 h-8 text-red-300 animate-bounce" />
            <div>
              <div className="font-bold text-xl text-red-100">⚠️ URGENT: Discord Setup Required</div>
              <div className="text-red-200 text-base">
                You <strong>MUST</strong> link Discord and join our server to participate in tournaments!
              </div>
            </div>
          </div>
          <div className="flex gap-3 ml-6">
            <button
              onClick={handleLinkDiscord}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Link Discord NOW
            </button>
            <button
              onClick={handleJoinServer}
              className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Join Server NOW
            </button>
            <button
              onClick={handleDismiss}
              className="text-red-200 hover:text-white text-2xl font-bold px-2 transition-colors"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Annoying modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-red-900 to-red-800 border-4 border-red-500 rounded-xl p-8 max-w-2xl mx-4 shadow-2xl animate-pulse">
            <div className="text-center">
              <AlertTriangle className="w-16 h-16 text-red-300 mx-auto mb-4 animate-bounce" />
              <h2 className="text-3xl font-bold text-red-100 mb-4">🚨 DISCORD SETUP REQUIRED 🚨</h2>
              <p className="text-red-200 text-lg mb-6">
                You <strong>CANNOT</strong> participate in tournaments without linking your Discord account and joining our server!
              </p>
              
              <div className="space-y-4 mb-6">
                <div className="bg-red-800/50 p-4 rounded-lg">
                  <h3 className="font-bold text-red-100 mb-2">What you need to do:</h3>
                  <ul className="text-red-200 text-left space-y-1">
                    <li>• Link your Discord account in your profile</li>
                    <li>• Join our Discord server</li>
                    <li>• Verify you're a member of our server</li>
                  </ul>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={handleLinkDiscord}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg flex items-center justify-center gap-2 text-lg font-bold transition-colors"
                >
                  <ExternalLink className="w-5 h-5" />
                  Link Discord Account
                </button>
                <button
                  onClick={handleJoinServer}
                  className="bg-gray-700 hover:bg-gray-800 text-white px-6 py-3 rounded-lg flex items-center justify-center gap-2 text-lg font-bold transition-colors"
                >
                  <ExternalLink className="w-5 h-5" />
                  Join Discord Server
                </button>
              </div>

              <button
                onClick={handleDismiss}
                className="mt-6 text-red-300 hover:text-white text-sm underline"
              >
                I'll do this later (but you won't be able to join tournaments!)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DiscordLinkBanner; 