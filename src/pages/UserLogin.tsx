import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-hot-toast';

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
      toast.success('Successfully logged in! 🎉');
      // Small delay to show the toast before redirecting
      setTimeout(() => {
        navigate('/profile');
      }, 1000);
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
    <div className="min-h-screen bg-gradient-to-br from-pink-500 via-magenta-600 to-purple-700 text-white font-sans relative overflow-hidden flex items-center justify-center py-12">
      {/* Geometric background pattern inspired by Unity League */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20" 
           style={{
             backgroundImage: `
               linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.1) 50%, transparent 60%),
               linear-gradient(-45deg, transparent 40%, rgba(255,255,255,0.1) 50%, transparent 60%),
               radial-gradient(circle at 25% 25%, rgba(0,255,255,0.1) 0 1px, transparent 1px 100px),
               radial-gradient(circle at 75% 75%, rgba(255,255,255,0.1) 0 1px, transparent 1px 100px)
             `
           }} />
      
      {/* Diagonal accent lines like Unity League poster */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-32 h-1 bg-cyan-400 transform rotate-45 origin-top-right"></div>
        <div className="absolute bottom-20 right-10 w-24 h-1 bg-cyan-400 transform -rotate-45 origin-bottom-right"></div>
        <div className="absolute top-40 left-0 w-20 h-1 bg-white transform rotate-45 origin-top-left"></div>
      </div>

      <div className="relative z-20 max-w-md w-full mx-4">
        <div className="bg-black/60 border border-pink-400/30 rounded-2xl shadow-2xl p-8 backdrop-blur-sm">
          <div className="text-center mb-8">
            <div className="bg-gradient-to-r from-cyan-500 to-blue-600 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <User className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Welcome Back</h1>
            <p className="text-pink-200">Sign in to your Unity League account</p>
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 mb-6">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username/Email */}
            <div>
              <label className="block text-sm font-medium text-pink-200 mb-2">
                Username or Email
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-cyan-400" />
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-black/40 border border-pink-400/30 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all text-white placeholder-pink-300"
                  placeholder="Enter username or email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-pink-200 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-cyan-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="w-full pl-10 pr-12 py-3 bg-black/40 border border-pink-400/30 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all text-white placeholder-pink-300"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-pink-300 hover:text-cyan-400 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-black font-bold py-3 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          {/* Additional Links */}
          <div className="mt-6 text-center">
            <p className="text-pink-200 text-sm">
              Don't have an account?{' '}
              <button
                onClick={() => navigate('/register')}
                className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
              >
                Sign up here
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserLogin; 