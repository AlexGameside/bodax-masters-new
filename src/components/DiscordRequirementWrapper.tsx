import React, { useState, useEffect } from 'react';
import { AlertTriangle, MessageCircle, ExternalLink, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DiscordRequirementWrapperProps {
  children: React.ReactNode;
  discordLinked: boolean;
  inDiscordServer: boolean;
  requiredFor?: string;
}

const DISCORD_INVITE = 'https://discord.gg/MZzEyX3peN';

const DiscordRequirementWrapper: React.FC<DiscordRequirementWrapperProps> = ({
  children,
  discordLinked,
  inDiscordServer,
  requiredFor = 'this feature'
}) => {
  const [showBlockingModal, setShowBlockingModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!discordLinked || !inDiscordServer) {
      setShowBlockingModal(true);
    }
  }, [discordLinked, inDiscordServer]);

  const handleLinkDiscord = () => {
    navigate('/profile');
  };

  const handleJoinServer = () => {
    window.open(DISCORD_INVITE, '_blank', 'noopener,noreferrer');
  };

  const handleGoBack = () => {
    navigate('/dashboard');
  };

  // If requirements are met, show the children
  if (discordLinked && inDiscordServer) {
    return <>{children}</>;
  }

  // Show blocking modal
  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
      <div className="bg-gradient-to-br from-red-900 to-red-800 border-4 border-red-500 rounded-xl p-8 max-w-2xl mx-4 shadow-2xl animate-pulse">
        <div className="text-center">
          <AlertTriangle className="w-20 h-20 text-red-300 mx-auto mb-6 animate-bounce" />
          <h2 className="text-4xl font-bold text-red-100 mb-4">🚨 ACCESS BLOCKED 🚨</h2>
          <p className="text-red-200 text-xl mb-6">
            You <strong>CANNOT</strong> access {requiredFor} without Discord setup!
          </p>
          
          <div className="bg-red-800/50 p-6 rounded-lg mb-8">
            <h3 className="font-bold text-red-100 mb-4 text-lg">Required Setup:</h3>
            <div className="space-y-3 text-left">
              <div className="flex items-center gap-3">
                <MessageCircle className="w-5 h-5 text-red-300" />
                <span className="text-red-200">Link your Discord account</span>
                {!discordLinked && <span className="text-red-400 text-sm">❌ NOT DONE</span>}
                {discordLinked && <span className="text-green-400 text-sm">✅ DONE</span>}
              </div>
              <div className="flex items-center gap-3">
                <MessageCircle className="w-5 h-5 text-red-300" />
                <span className="text-red-200">Join our Discord server</span>
                {!inDiscordServer && <span className="text-red-400 text-sm">❌ NOT DONE</span>}
                {inDiscordServer && <span className="text-green-400 text-sm">✅ DONE</span>}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
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
            onClick={handleGoBack}
            className="text-red-300 hover:text-white text-sm underline"
          >
            ← Go back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default DiscordRequirementWrapper; 