import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { exchangeCodeForToken, getRiotAccount } from '../services/riotOAuthService';
import { getUserByRiotId } from '../services/firebaseService';
import { signInWithRiot } from '../services/authService';
import RiotUsernameSelection from './RiotUsernameSelection';
import { CheckCircle, XCircle, Loader, AlertTriangle } from 'lucide-react';

const RiotCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'username-selection'>('loading');
  const [message, setMessage] = useState('');
  const [riotAccount, setRiotAccount] = useState<{
    puuid: string;
    gameName: string;
    tagLine: string;
    riotId: string;
  } | null>(null);

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

      try {
        // Exchange code for access token
        const { access_token } = await exchangeCodeForToken(code);
        
        // Get Riot account information
        const account = await getRiotAccount(access_token);
        setRiotAccount(account);
        
        // Check if user exists with this Riot ID
        const existingUser = await getUserByRiotId(account.riotId);
        
        if (existingUser) {
          // User exists - sign them in
          await signInWithRiot(existingUser.id);
          setStatus('success');
          setMessage(`Welcome back! Signed in as ${account.riotId}`);
          
          // Redirect to profile page after 2 seconds
          setTimeout(() => {
            navigate('/profile');
          }, 2000);
        } else {
          // New user - show username selection
          setStatus('username-selection');
        }
        
      } catch (error) {
        console.error('Riot callback error:', error);
        setStatus('error');
        setMessage(`Failed to sign in: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    // Start the process if we have a code
    if (searchParams.get('code')) {
      handleRiotCallback();
    }
  }, [searchParams, navigate]);

  // If no code and no error, show error
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

  // Show username selection for new users
  if (status === 'username-selection' && riotAccount) {
    return <RiotUsernameSelection riotAccount={riotAccount} />;
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md mx-auto px-6 py-8 bg-black/60 border border-gray-700 rounded-xl shadow-lg text-center">
        {status === 'loading' && (
          <>
            <Loader className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Signing In</h2>
            <p className="text-gray-300">Please wait while we sign you in with Riot...</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Success!</h2>
            <p className="text-gray-300 mb-4">{message}</p>
            <p className="text-sm text-gray-400">Redirecting to profile page...</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Sign In Failed</h2>
            <p className="text-gray-300 mb-4">{message}</p>
            
            <div className="space-y-3">
              <button
                onClick={() => navigate('/login')}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Try Again
              </button>
              
              <button
                onClick={() => navigate('/')}
                className="block w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Go to Home
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RiotCallback;

