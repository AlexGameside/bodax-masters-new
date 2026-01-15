import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createUserFromRiot, getUserByRiotId } from '../services/firebaseService';
import { signInWithRiot } from '../services/authService';
import { Loader, CheckCircle, XCircle, User } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

interface RiotUsernameSelectionProps {
  riotAccount: {
    puuid: string;
    gameName: string;
    tagLine: string;
    riotId: string;
  };
}

const RiotUsernameSelection = ({ riotAccount }: RiotUsernameSelectionProps) => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

  // Check username availability
  useEffect(() => {
    const checkUsername = async () => {
      if (!username.trim()) {
        setIsAvailable(null);
        return;
      }

      // Basic validation
      if (username.length < 3) {
        setError('Username must be at least 3 characters');
        setIsAvailable(false);
        return;
      }

      if (username.length > 20) {
        setError('Username must be less than 20 characters');
        setIsAvailable(false);
        return;
      }

      // Check for valid characters (alphanumeric, underscore, hyphen)
      if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
        setError('Username can only contain letters, numbers, underscores, and hyphens');
        setIsAvailable(false);
        return;
      }

      setChecking(true);
      setError('');

      try {
        // Check if username exists in public_users collection
        const usernameQuery = query(
          collection(db, 'public_users'),
          where('username', '==', username.trim())
        );
        const usernameSnapshot = await getDocs(usernameQuery);

        if (usernameSnapshot.empty) {
          setIsAvailable(true);
          setError('');
        } else {
          setIsAvailable(false);
          setError('This username is already taken');
        }
      } catch (err) {
        console.error('Error checking username:', err);
        setError('Error checking username availability');
        setIsAvailable(false);
      } finally {
        setChecking(false);
      }
    };

    // Debounce the check
    const timeoutId = setTimeout(checkUsername, 500);
    return () => clearTimeout(timeoutId);
  }, [username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    if (!isAvailable) {
      setError('Please choose an available username');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Create user with chosen username
      const userId = await createUserFromRiot(riotAccount, username.trim());
      await signInWithRiot(userId);

      // Redirect to profile page
      navigate('/profile');
    } catch (error) {
      console.error('Error creating user:', error);
      setError(error instanceof Error ? error.message : 'Failed to create account');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white relative overflow-hidden flex items-center justify-center py-12">
      {/* Bodax grid */}
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            'linear-gradient(rgba(50, 50, 50, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(50, 50, 50, 0.5) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />
      {/* subtle vignette */}
      <div className="absolute inset-0 z-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(255,0,0,0.08),transparent_55%)]" />

      <div className="relative z-20 max-w-md w-full mx-4">
        <div className="bg-[#0a0a0a] border border-gray-800 shadow-2xl p-8">
          <div className="text-center mb-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-4xl font-bold text-white mb-2 font-bodax tracking-wide uppercase leading-none">
              Choose Your Username
            </h1>
            <p className="text-gray-400 font-mono uppercase tracking-widest text-sm mb-2">
              Welcome, {riotAccount.riotId}
            </p>
            <p className="text-gray-500 text-xs">
              This username will be displayed in matches and on your profile
            </p>
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 mb-6">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-2 font-mono uppercase tracking-widest">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setError('');
                  }}
                  className="w-full pl-10 pr-4 py-3 bg-black/40 border border-gray-800 focus:border-red-600 focus:outline-none transition-colors text-white placeholder-gray-600"
                  placeholder="Enter your username"
                  disabled={loading}
                  autoFocus
                />
              </div>
              
              {/* Username availability indicator */}
              {username.trim() && (
                <div className="mt-2">
                  {checking ? (
                    <p className="text-xs text-gray-500 flex items-center">
                      <Loader className="w-3 h-3 mr-2 animate-spin" />
                      Checking availability...
                    </p>
                  ) : isAvailable === true ? (
                    <p className="text-xs text-green-500">✓ Username available</p>
                  ) : isAvailable === false ? (
                    <p className="text-xs text-red-500">✗ Username not available</p>
                  ) : null}
                </div>
              )}

              <p className="text-xs text-gray-500 mt-2">
                3-20 characters, letters, numbers, underscores, and hyphens only
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !isAvailable || checking}
              className="w-full bg-red-600 hover:bg-red-700 text-white border border-red-800 font-bodax text-2xl uppercase tracking-wider py-3 px-6 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RiotUsernameSelection;

