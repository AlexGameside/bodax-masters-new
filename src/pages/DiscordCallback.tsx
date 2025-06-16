import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { exchangeCodeForToken, getDiscordUser } from '../services/discordService';
import { updateUserDiscordInfo } from '../services/firebaseService';
import { CheckCircle, XCircle, Loader } from 'lucide-react';

const DiscordCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser, refreshUser } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleDiscordCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');

      if (error) {
        setStatus('error');
        setMessage('Discord authorization was cancelled or failed.');
        return;
      }

      if (!code) {
        setStatus('error');
        setMessage('No authorization code received from Discord.');
        return;
      }

      if (!currentUser) {
        setStatus('error');
        setMessage('You must be logged in to link your Discord account.');
        return;
      }

      try {
        // Exchange code for access token
        const accessToken = await exchangeCodeForToken(code);
        
        // Get Discord user information
        const discordUser = await getDiscordUser(accessToken);
        
        // Update user profile with Discord information
        await updateUserDiscordInfo(currentUser.id, {
          discordId: discordUser.id,
          discordUsername: discordUser.username,
          discordAvatar: discordUser.avatar,
          discordLinked: true,
        });

        // Refresh user data to show updated Discord status
        if (refreshUser) {
          await refreshUser();
        }

        setStatus('success');
        setMessage(`Successfully linked Discord account: ${discordUser.username}#${discordUser.discriminator}`);
        
        // Redirect to profile page after 3 seconds
        setTimeout(() => {
          navigate('/profile');
        }, 3000);
      } catch (error) {
        console.error('Error linking Discord account:', error);
        setStatus('error');
        setMessage('Failed to link Discord account. Please try again.');
      }
    };

    handleDiscordCallback();
  }, [searchParams, currentUser, navigate, refreshUser]);

  return (
    <div className="min-h-screen bg-black text-white font-mono flex items-center justify-center relative overflow-hidden">
      {/* Subtle grid/code background */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-10" style={{backgroundImage: 'repeating-linear-gradient(0deg, #fff1 0 1px, transparent 1px 40px), repeating-linear-gradient(90deg, #fff1 0 1px, transparent 1px 40px)'}} />
      
      <div className="max-w-md mx-auto px-6 py-8 bg-black/60 border border-gray-700 rounded-xl shadow-lg relative z-10">
        <div className="text-center">
          {status === 'loading' && (
            <>
              <Loader className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Linking Discord Account</h2>
              <p className="text-gray-300">Please wait while we link your Discord account...</p>
            </>
          )}
          
          {status === 'success' && (
            <>
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Discord Account Linked!</h2>
              <p className="text-gray-300 mb-4">{message}</p>
              <p className="text-sm text-gray-400">Redirecting to profile page...</p>
            </>
          )}
          
          {status === 'error' && (
            <>
              <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Link Failed</h2>
              <p className="text-gray-300 mb-4">{message}</p>
              <button
                onClick={() => navigate('/profile')}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Go to Profile
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DiscordCallback; 