import { useState, useEffect } from 'react';
import { Mail, Lock, UserPlus, TestTube, User, ArrowLeft, Flag } from 'lucide-react';
import { loginUser, registerUser, resetPassword } from '../services/authService';
import { BodaxModal } from './ui';

const NATIONALITIES = [
  'Germany', 'Austria', 'Switzerland', 'France', 'Spain', 'Italy', 'Netherlands', 'Belgium',
  'Poland', 'Czech Republic', 'Slovakia', 'Hungary', 'Romania', 'Bulgaria', 'Croatia', 'Slovenia',
  'Serbia', 'Bosnia and Herzegovina', 'Montenegro', 'North Macedonia', 'Albania', 'Kosovo',
  'United Kingdom', 'Ireland', 'Denmark', 'Sweden', 'Norway', 'Finland', 'Iceland', 'Portugal',
  'Greece', 'Cyprus', 'Malta', 'Luxembourg', 'Estonia', 'Latvia', 'Lithuania', 'United States',
  'Canada', 'Australia', 'New Zealand', 'Brazil', 'Argentina', 'Chile', 'Colombia', 'Mexico',
  'Japan', 'South Korea', 'China', 'India', 'Russia', 'Ukraine', 'Belarus', 'Turkey', 'Israel',
  'United Arab Emirates', 'Saudi Arabia', 'Egypt', 'South Africa', 'Nigeria', 'Kenya',
  'Morocco', 'Tunisia', 'Algeria', 'Other'
];

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: any) => void;
}

const LoginModal = ({ isOpen, onClose, onLoginSuccess }: LoginModalProps) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isResetMode, setIsResetMode] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [riotId, setRiotId] = useState('');
  const [nationality, setNationality] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [testLoginAvailable, setTestLoginAvailable] = useState(false);

  useEffect(() => {
    // Check if test login credentials are available
    const testLogin = localStorage.getItem('testLogin');
    setTestLoginAvailable(!!testLogin);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (isResetMode) {
        // Handle password reset
        if (!email.trim()) {
          setError('Please enter your email address');
          setLoading(false);
          return;
        }
        
        await resetPassword(email.trim());
        setMessage('Password reset email sent! Check your inbox.');
        setTimeout(() => {
          setIsResetMode(false);
          setMessage('');
        }, 3000);
      } else if (isLogin) {
        // For login, use either username or email
        const loginIdentifier = username || email;
        if (!loginIdentifier) {
          setError('Please enter your username or email');
          setLoading(false);
          return;
        }
        
        await loginUser(loginIdentifier, password);
        // The useAuth hook will automatically detect the user via onAuthStateChanged
        onClose();
      } else {
        // For registration, require both username and email
        if (!username.trim()) {
          setError('Username is required');
          setLoading(false);
          return;
        }
        
        if (!email.trim()) {
          setError('Email is required');
          setLoading(false);
          return;
        }

        if (!riotId.trim()) {
          setError('Riot ID is required');
          setLoading(false);
          return;
        }

        if (!riotId.includes('#')) {
          setError('Riot ID must contain a # symbol');
          setLoading(false);
          return;
        }

        if (!nationality.trim()) {
          setError('Nationality is required');
          setLoading(false);
          return;
        }

        const userData = {
          username: username.trim(),
          email: email.trim(),
          riotId: riotId.trim(),
          nationality: nationality.trim(),
          discordUsername: '',
          teamIds: [],
          isAdmin: false,
          riotIdSet: !!riotId && riotId.trim() !== '',
          riotIdSetAt: !!riotId && riotId.trim() !== '' ? new Date() : undefined,
          password
        };
        
        await registerUser(userData);
        // The useAuth hook will automatically detect the user via onAuthStateChanged
        onClose();
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      
      // Handle specific error types with better messages
      if (error.message === 'USERNAME_EXISTS') {
        setError('This username is already taken. Please choose a different one.');
      } else if (error.message === 'EMAIL_EXISTS') {
        setError('This email is already registered. Please use a different email or try logging in.');
      } else if (error.message.includes('Password is too weak')) {
        setError('Password is too weak. Please choose a stronger password with at least 6 characters.');
      } else if (error.message.includes('valid email')) {
        setError('Please enter a valid email address.');
      } else if (error.message.includes('Registration is currently disabled')) {
        setError('Registration is temporarily disabled. Please contact support for assistance.');
      } else if (error.message.includes('Too many registration attempts')) {
        setError('Too many registration attempts. Please wait a few minutes before trying again.');
      } else {
        setError(error.message || 'An error occurred during registration. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTestLogin = async () => {
    const testLogin = localStorage.getItem('testLogin');
    if (!testLogin) return;

    try {
      const { email: testEmail, password: testPassword } = JSON.parse(testLogin);
      setLoading(true);
      setError('');

      await loginUser(testEmail, testPassword);
      onClose();
      
      // Clear the test login data after successful login
      localStorage.removeItem('testLogin');
    } catch (error: any) {
      setError(error.message || 'Test login failed');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setUsername('');
    setEmail('');
    setPassword('');
    setError('');
    setMessage('');
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setIsResetMode(false);
    resetForm();
  };

  const goToResetMode = () => {
    setIsResetMode(true);
    setIsLogin(true);
    resetForm();
  };

  const goBackToLogin = () => {
    setIsResetMode(false);
    resetForm();
  };

  return (
    <BodaxModal
      isOpen={isOpen}
      onClose={onClose}
      title={isResetMode ? 'Reset Password' : isLogin ? 'Login' : 'Create Account'}
      subtitle={isResetMode ? 'email recovery' : isLogin ? 'sign in to Bodax' : 'create your Bodax account'}
      maxWidthClassName="max-w-md"
    >
      {isResetMode && (
        <button
          onClick={goBackToLogin}
          className="flex items-center space-x-2 text-gray-400 hover:text-red-500 transition-colors mb-4 font-mono uppercase tracking-widest text-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
            {isResetMode ? (
              // Password reset form - only email field
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-2 font-mono uppercase tracking-widest">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-black/40 border border-gray-800 text-white placeholder-gray-600 focus:border-red-600 focus:outline-none transition-colors"
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>
            ) : isLogin ? (
              // Login form - username OR email field
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-2 font-mono uppercase tracking-widest">Username or Email</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
                  <input
                    type="text"
                    value={username || email}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Clear both fields and set the one being typed in
                      if (value.includes('@')) {
                        setEmail(value);
                        setUsername('');
                      } else {
                        setUsername(value);
                        setEmail('');
                      }
                    }}
                    className="w-full pl-10 pr-4 py-3 bg-black/40 border border-gray-800 text-white placeholder-gray-600 focus:border-red-600 focus:outline-none transition-colors"
                    placeholder="username or email"
                    required
                  />
                </div>
              </div>
            ) : (
              // Registration form - separate username and email fields
              <>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-2 font-mono uppercase tracking-widest">Username</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-black/40 border border-gray-800 text-white placeholder-gray-600 focus:border-red-600 focus:outline-none transition-colors"
                      placeholder="username"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-2 font-mono uppercase tracking-widest">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-black/40 border border-gray-800 text-white placeholder-gray-600 focus:border-red-600 focus:outline-none transition-colors"
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            {!isResetMode && (
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-2 font-mono uppercase tracking-widest">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-black/40 border border-gray-800 text-white placeholder-gray-600 focus:border-red-600 focus:outline-none transition-colors"
                    placeholder="password"
                    required
                  />
                </div>
              </div>
            )}

            {!isLogin && !isResetMode && (
              <>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-2 font-mono uppercase tracking-widest">Riot ID</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
                    <input
                      type="text"
                      value={riotId}
                      onChange={(e) => setRiotId(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-black/40 border border-gray-800 text-white placeholder-gray-600 focus:border-red-600 focus:outline-none transition-colors"
                      placeholder="PlayerName#TAG"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-2 font-mono uppercase tracking-widest">Nationality</label>
                  <div className="relative">
                    <Flag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
                    <select
                      value={nationality}
                      onChange={(e) => setNationality(e.target.value)}
                      className="w-full pl-10 pr-10 py-3 bg-black/40 border border-gray-800 text-white focus:border-red-600 focus:outline-none transition-colors appearance-none cursor-pointer"
                      required
                    >
                      <option value="">Choose your nationality...</option>
                      {NATIONALITIES.map((nat) => (
                        <option key={nat} value={nat}>
                          {nat}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </>
            )}

            {error && (
              <div className="bg-red-900/10 border border-red-900 text-red-300 px-4 py-3">
                {error}
              </div>
            )}

            {message && (
              <div className="bg-green-900/10 border border-green-900 text-green-300 px-4 py-3">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white border border-red-800 py-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-bodax text-2xl uppercase tracking-wider"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>
                    {isResetMode ? 'Sending...' : isLogin ? 'Logging in...' : 'Creating...'}
                  </span>
                </div>
              ) : (
                isResetMode ? 'Send reset email' : isLogin ? 'Login' : 'Create account'
              )}
            </button>
          </form>

          {/* Forgot Password Link (only show on login mode) */}
          {isLogin && !isResetMode && (
            <div className="mt-4 text-center">
              <button
                onClick={goToResetMode}
                className="text-gray-400 hover:text-red-500 font-mono uppercase tracking-widest text-xs transition-colors"
              >
                Forgot password?
              </button>
            </div>
          )}

          {/* Toggle between login/register (only show when not in reset mode) */}
          {!isResetMode && (
            <div className="mt-6 text-center">
              <button
                onClick={toggleMode}
                className="text-gray-300 hover:text-red-500 font-mono uppercase tracking-widest text-xs flex items-center justify-center space-x-2 mx-auto transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                <span>
                  {isLogin ? 'Create account' : 'Back to login'}
                </span>
              </button>
            </div>
          )}

          {/* Test Login (only show when not in reset mode) */}
          {testLoginAvailable && !isResetMode && (
            <div className="mt-6 pt-6 border-t border-gray-700 text-center">
              <button
                onClick={handleTestLogin}
                disabled={loading}
                className="text-gray-400 hover:text-white font-mono uppercase tracking-widest text-xs flex items-center justify-center space-x-2 mx-auto transition-colors disabled:opacity-50"
              >
                <TestTube className="w-4 h-4" />
                <span>Use test login</span>
              </button>
            </div>
          )}
    </BodaxModal>
  );
};

export default LoginModal; 