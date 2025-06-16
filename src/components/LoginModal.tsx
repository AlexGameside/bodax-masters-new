import { useState, useEffect } from 'react';
import { X, Mail, Lock, UserPlus, TestTube } from 'lucide-react';
import { loginUser, registerUser } from '../services/authService';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: any) => void;
}

const LoginModal = ({ isOpen, onClose, onLoginSuccess }: LoginModalProps) => {
  if (!isOpen) return null;

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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

    try {
      if (isLogin) {
        const user = await loginUser(email, password);
        onLoginSuccess(user);
        onClose();
      } else {
        const userData = {
          username: email.split('@')[0], // Use email prefix as username
          email,
          riotId: '',
          discordUsername: '',
          teamIds: [],
          isAdmin: false,
          password
        };
        await registerUser(userData);
        onLoginSuccess(userData);
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

      const user = await loginUser(testEmail, testPassword);
      onLoginSuccess(user);
      onClose();
      
      // Clear the test login data after successful login
      localStorage.removeItem('testLogin');
    } catch (error: any) {
      setError(error.message || 'Test login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl shadow-2xl border border-gray-700 max-w-md w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-t-2xl p-6 border-b border-gray-700">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-white">
                {isLogin ? 'Welcome Back' : 'Join Bodax Masters'}
              </h2>
              <p className="text-gray-400 mt-1">
                {isLogin ? 'Sign in to your account' : 'Create your account'}
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
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-300 font-medium mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-300 font-medium mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg">
                {error}
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
                  <span>{isLogin ? 'Signing In...' : 'Creating Account...'}</span>
                </div>
              ) : (
                isLogin ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          {/* Toggle between login/register */}
          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary-400 hover:text-primary-300 font-medium flex items-center justify-center space-x-2 mx-auto transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>
                {isLogin ? "Don't have an account? Register" : 'Already have an account? Sign In'}
              </span>
            </button>
          </div>

          {/* Test Login */}
          {testLoginAvailable && (
            <div className="mt-6 pt-6 border-t border-gray-700 text-center">
              <button
                onClick={handleTestLogin}
                disabled={loading}
                className="text-gray-400 hover:text-gray-300 font-medium flex items-center justify-center space-x-2 mx-auto transition-colors disabled:opacity-50"
              >
                <TestTube className="w-4 h-4" />
                <span>Use Test Login</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginModal; 