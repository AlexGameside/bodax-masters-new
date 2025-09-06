import { useState, useEffect } from 'react';
import { X, Mail, Lock, UserPlus, TestTube, User, ArrowLeft } from 'lucide-react';
import { loginUser, registerUser, resetPassword } from '../services/authService';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: any) => void;
}

const LoginModal = ({ isOpen, onClose, onLoginSuccess }: LoginModalProps) => {
  if (!isOpen) return null;

  const [isLogin, setIsLogin] = useState(true);
  const [isResetMode, setIsResetMode] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [testLoginAvailable, setTestLoginAvailable] = useState(false);

  useEffect(() => {
    // Check if test login credentials are available
    const testLogin = localStorage.getItem('testLogin');
    setTestLoginAvailable(!!testLogin);
  }, [isOpen]);

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

        const userData = {
          username: username.trim(),
          email: email.trim(),
          riotId: '',
          discordUsername: '',
          teamIds: [],
          isAdmin: false,
          password
        };
        
        await registerUser(userData);
        // The useAuth hook will automatically detect the user via onAuthStateChanged
        onClose();
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred');
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl shadow-2xl border border-gray-700 max-w-md w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-t-2xl p-6 border-b border-gray-700">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-white">
                {isResetMode ? 'Passwort zurücksetzen' : isLogin ? 'Willkommen zurück' : 'Unity League beitreten'}
              </h2>
              <p className="text-gray-400 mt-1">
                {isResetMode 
                  ? 'Gib deine E-Mail-Adresse ein, um dein Passwort zurückzusetzen'
                  : isLogin ? 'Melde dich in deinem Konto an' : 'Erstelle dein Konto'
                }
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-800 rounded-lg"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="p-6">
          {isResetMode && (
            <button
              onClick={goBackToLogin}
              className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Zurück zum Login</span>
            </button>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isResetMode ? (
              // Password reset form - only email field
              <div>
                <label className="block text-gray-300 font-medium mb-2">E-Mail Adresse</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                    placeholder="Deine E-Mail eingeben"
                    required
                  />
                </div>
              </div>
            ) : isLogin ? (
              // Login form - username OR email field
              <div>
                <label className="block text-gray-300 font-medium mb-2">Benutzername oder E-Mail</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
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
                    className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                    placeholder="Benutzername oder E-Mail eingeben"
                    required
                  />
                </div>
              </div>
            ) : (
              // Registration form - separate username and email fields
              <>
                <div>
                  <label className="block text-gray-300 font-medium mb-2">Benutzername</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                      placeholder="Deinen Benutzernamen eingeben"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 font-medium mb-2">E-Mail Adresse</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                      placeholder="Deine E-Mail eingeben"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            {!isResetMode && (
              <div>
                <label className="block text-gray-300 font-medium mb-2">Passwort</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                    placeholder="Dein Passwort eingeben"
                    required
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {message && (
              <div className="bg-green-900/50 border border-green-700 text-green-300 px-4 py-3 rounded-lg">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white py-3 rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>
                    {isResetMode ? 'E-Mail senden...' : isLogin ? 'Anmelden...' : 'Konto erstellen...'}
                  </span>
                </div>
              ) : (
                isResetMode ? 'Passwort zurücksetzen' : isLogin ? 'Anmelden' : 'Konto erstellen'
              )}
            </button>
          </form>

          {/* Forgot Password Link (only show on login mode) */}
          {isLogin && !isResetMode && (
            <div className="mt-4 text-center">
              <button
                onClick={goToResetMode}
                className="text-primary-400 hover:text-primary-300 font-medium transition-colors"
              >
                Passwort vergessen?
              </button>
            </div>
          )}

          {/* Toggle between login/register (only show when not in reset mode) */}
          {!isResetMode && (
            <div className="mt-6 text-center">
              <button
                onClick={toggleMode}
                className="text-primary-400 hover:text-primary-300 font-medium flex items-center justify-center space-x-2 mx-auto transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                <span>
                  {isLogin ? "Noch kein Konto? Registrieren" : 'Bereits ein Konto? Anmelden'}
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
                className="text-gray-400 hover:text-gray-300 font-medium flex items-center justify-center space-x-2 mx-auto transition-colors disabled:opacity-50"
              >
                <TestTube className="w-4 h-4" />
                <span>Test Login verwenden</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginModal; 