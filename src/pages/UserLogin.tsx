import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Eye, EyeOff } from 'lucide-react';

interface UserLoginProps {
  onLogin: (username: string, password: string) => Promise<void>;
}

const UserLogin = ({ onLogin }: UserLoginProps) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.username.trim() || !formData.password) {
      setError('Please enter both username and password');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      await onLogin(formData.username.trim(), formData.password);
      navigate('/profile');
    } catch (error: any) {
      console.error('Login error:', error);
      setError(error.message || 'Invalid username or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  return (
    <div className="min-h-screen bg-black text-white font-mono relative overflow-hidden flex items-center justify-center py-12">
      {/* Subtle grid/code background */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-10" style={{backgroundImage: 'repeating-linear-gradient(0deg, #fff1 0 1px, transparent 1px 40px), repeating-linear-gradient(90deg, #fff1 0 1px, transparent 1px 40px)'}} />
      
      {/* Code/terminal style header overlay */}
      <div className="absolute top-0 left-0 w-full px-4 pt-8 z-10 select-none pointer-events-none">
        <div className="text-sm md:text-lg lg:text-2xl text-gray-400 tracking-tight">
          <span className="text-gray-600">function</span> <span className="text-red-500 font-bold">UserLogin</span><span className="text-white">()</span> <span className="text-gray-600">&#123;</span>
        </div>
      </div>

      <div className="relative z-20 max-w-md w-full mx-4">
        <div className="bg-black/60 border border-gray-700 rounded-2xl shadow-xl p-8 backdrop-blur-sm">
          <div className="text-center mb-8">
            <div className="bg-gradient-to-r from-red-500 to-red-600 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <User className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Welcome Back</h1>
            <p className="text-gray-300">Sign in to your account</p>
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 mb-6">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username/Email */}
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Username or Email
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-black/40 border border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all text-white placeholder-gray-400"
                  placeholder="Enter username or email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="w-full pl-10 pr-12 py-3 bg-black/40 border border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all text-white placeholder-gray-400"
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-3 rounded-lg font-bold hover:from-red-700 hover:to-red-800 transition-all disabled:bg-gray-600 disabled:cursor-not-allowed shadow-lg border border-red-800"
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-300">
              Don't have an account?{' '}
              <button
                onClick={() => navigate('/register')}
                className="text-red-400 hover:text-red-300 font-semibold transition-colors"
              >
                Create Account
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserLogin; 