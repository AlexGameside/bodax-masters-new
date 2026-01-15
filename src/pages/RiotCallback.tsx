import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { exchangeCodeForToken, getRiotAccount } from '../services/riotOAuthService';
import { updateUserRiotId } from '../services/firebaseService';
import { CheckCircle, XCircle, Loader, AlertTriangle } from 'lucide-react';

const RiotCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleRiotCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');

      if (error) {
        setStatus('error');
        setMessage('Riot authorization was cancelled or failed.');
        return;
      }

      if (!code) {
        setStatus('error');
        setMessage('No authorization code received from Riot.');
        return;
      }

      if (!currentUser) {
        setStatus('error');
        setMessage('You must be logged in to link your Riot account.');
        return;
      }

      try {
        // Exchange code for access token (redirect_uri must match what's configured in Riot Developer Portal)
        const { access_token } = await exchangeCodeForToken(code);
        
        // Get Riot account information
        const riotAccount = await getRiotAccount(access_token);
        
        // Update user profile with Riot ID
        await updateUserRiotId(currentUser.id, riotAccount.riotId);

        // Show success and redirect
        setStatus('success');
        setMessage(`Successfully linked Riot account: ${riotAccount.riotId}`);
        
        // Redirect to profile page after 2 seconds
        setTimeout(() => {
          navigate('/profile');
        }, 2000);
        
      } catch (error) {
        console.error('Riot callback error:', error);
        setStatus('error');
        setMessage(`Failed to link Riot account: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    // Only start the process if we have a code and currentUser
    if (searchParams.get('code') && currentUser) {
      handleRiotCallback();
    }
  }, [searchParams, currentUser, navigate]);

  // Show loading while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md mx-auto px-6 py-8 bg-black/60 border border-gray-700 rounded-xl shadow-lg text-center">
          <Loader className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Loading...</h2>
          <p className="text-gray-300">Please wait while we verify your login status...</p>
        </div>
      </div>
    );
  }

  // If no code, show error
  if (!searchParams.get('code') && !searchParams.get('error')) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md mx-auto px-6 py-8 bg-black/60 border border-gray-700 rounded-xl shadow-lg text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">No Authorization Code</h2>
          <p className="text-gray-300 mb-4">No authorization code was received from Riot.</p>
          <button
            onClick={() => navigate('/profile')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Go to Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md mx-auto px-6 py-8 bg-black/60 border border-gray-700 rounded-xl shadow-lg text-center">
        {status === 'loading' && (
          <>
            <Loader className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Linking Riot Account</h2>
            <p className="text-gray-300">Please wait while we link your Riot account...</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Riot Account Linked!</h2>
            <p className="text-gray-300 mb-4">{message}</p>
            <p className="text-sm text-gray-400">Redirecting to profile page...</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Link Failed</h2>
            <p className="text-gray-300 mb-4">{message}</p>
            
            <div className="space-y-3">
              <button
                onClick={() => navigate('/profile')}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Go to Profile
              </button>
              
              <button
                onClick={() => window.location.reload()}
                className="block w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RiotCallback;

