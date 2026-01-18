import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Eye, EyeOff, Mail, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { resetPassword } from '../services/authService';

interface UserLoginProps {
  onLogin: (username: string, password: string) => Promise<void>;
}

const UserLogin = ({ onLogin }: UserLoginProps) => {
  const navigate = useNavigate();
  const [isResetMode, setIsResetMode] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [resetEmail, setResetEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isResetMode) {
      // Handle password reset
      if (!resetEmail.trim()) {
        setError('Please enter your email address');
        return;
      }

      setIsLoading(true);
      setError('');
      setMessage('');
      
      try {
        await resetPassword(resetEmail.trim());
        setMessage('Password reset email sent! Check your inbox.');
        toast.success('Password reset email sent! 📧');
        setTimeout(() => {
          setIsResetMode(false);
          setMessage('');
          setResetEmail('');
        }, 3000);
      } catch (error: any) {
        setError(error.message || 'Failed to send reset email');
        toast.error(error.message || 'Failed to send reset email');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Handle login
    if (!formData.username.trim() || !formData.password) {
      setError('Please enter both username and password');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      await onLogin(formData.username.trim(), formData.password);
      toast.success('Successfully logged in! 🎉');
      // Small delay to show the toast before redirecting
      setTimeout(() => {
        navigate('/profile');
      }, 1000);
    } catch (error: any) {

      setError(error.message || 'Invalid username or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  const goToResetMode = () => {
    setIsResetMode(true);
    setError('');
    setMessage('');
  };

  const goBackToLogin = () => {
    setIsResetMode(false);
    setError('');
    setMessage('');
    setResetEmail('');
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
          {/* Back button for reset mode */}
          {isResetMode && (
            <button
              onClick={goBackToLogin}
              className="flex items-center space-x-2 text-gray-400 hover:text-red-500 transition-colors mb-4 font-mono uppercase tracking-widest text-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          )}

          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2 font-bodax tracking-wide uppercase leading-none">
              {isResetMode ? 'Reset Password' : 'Login'}
            </h1>
            <p className="text-gray-400 font-mono uppercase tracking-widest text-sm">
              {isResetMode 
                ? 'Enter your email to reset your password'
                : 'Sign in to your Bodax account'
              }
            </p>
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 mb-6">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {message && (
            <div className="bg-green-900/20 border border-green-700 rounded-lg p-4 mb-6">
              <p className="text-green-300 text-sm">{message}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {isResetMode ? (
              // Password reset form - only email field
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-2 font-mono uppercase tracking-widest">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-black/40 border border-gray-800 focus:border-red-600 focus:outline-none transition-colors text-white placeholder-gray-600"
                    placeholder="Enter your email address"
                  />
                </div>
              </div>
            ) : (
              // Login form
              <>
                {/* Username/Email */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-2 font-mono uppercase tracking-widest">
                    Username or Email
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => handleInputChange('username', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-black/40 border border-gray-800 focus:border-red-600 focus:outline-none transition-colors text-white placeholder-gray-600"
                      placeholder="Enter username or email"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-2 font-mono uppercase tracking-widest">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className="w-full pl-10 pr-12 py-3 bg-black/40 border border-gray-800 focus:border-red-600 focus:outline-none transition-colors text-white placeholder-gray-600"
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-red-500 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-red-600 hover:bg-red-700 text-white border border-red-800 font-bodax text-2xl uppercase tracking-wider py-3 px-6 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading 
                ? (isResetMode ? 'Sending Email...' : 'Signing In...') 
                : (isResetMode ? 'Reset Password' : 'Sign In')
              }
            </button>
          </form>

          {/* Forgot Password Link (only show on login mode) */}
          {!isResetMode && (
            <div className="mt-4 text-center">
              <button
                onClick={goToResetMode}
                className="text-gray-400 hover:text-red-500 font-mono uppercase tracking-widest text-xs transition-colors"
              >
                Forgot Password?
              </button>
            </div>
          )}

          {/* Additional Links (only show when not in reset mode) */}
          {!isResetMode && (
            <div className="mt-6 space-y-3 text-center">
              <p className="text-gray-400 text-sm font-mono uppercase tracking-widest">
                Don't have an account?{' '}
                <button
                  onClick={() => navigate('/register')}
                  className="text-red-500 hover:text-red-400 transition-colors"
                >
                  Sign up here
                </button>
              </p>
              <div className="border-t border-gray-800 pt-4">
                <p className="text-gray-500 text-xs font-mono uppercase tracking-widest mb-2">
                  Or sign in with
                </p>
                <button
                  onClick={() => navigate('/riot-login')}
                  className="text-blue-400 hover:text-blue-300 transition-colors text-sm font-mono uppercase tracking-widest"
                >
                  Riot Sign-On
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserLogin; 