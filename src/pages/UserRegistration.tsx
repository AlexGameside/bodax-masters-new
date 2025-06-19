import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Gamepad2, Eye, EyeOff } from 'lucide-react';
import type { User as UserType } from '../types/tournament';

interface UserRegistrationProps {
  onRegister: (user: Omit<UserType, 'id' | 'createdAt'> & { password: string }) => Promise<void>;
}

const UserRegistration = ({ onRegister }: UserRegistrationProps) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    riotId: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Username validation
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }

    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Riot ID validation
    if (!formData.riotId.trim()) {
      newErrors.riotId = 'Riot ID is required';
    } else if (!formData.riotId.includes('#')) {
      newErrors.riotId = 'Riot ID must contain a # symbol';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const userData: Omit<UserType, 'id' | 'createdAt'> & { password: string } = {
        username: formData.username.trim(),
        email: formData.email.trim().toLowerCase(),
        riotId: formData.riotId.trim(),
        discordUsername: '', // Will be set when user links Discord
        teamIds: [],
        isAdmin: false,
        password: formData.password
      };

      await onRegister(userData);
      navigate('/profile');
    } catch (error: any) {
      console.error('Registration error:', error);
      if (error.message.includes('username')) {
        setErrors({ username: 'Username already exists' });
      } else if (error.message.includes('email')) {
        setErrors({ email: 'Email already registered' });
      } else {
        setErrors({ general: 'Registration failed. Please try again.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-mono relative overflow-hidden flex items-center justify-center py-12">
      {/* Subtle grid/code background */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-10" style={{backgroundImage: 'repeating-linear-gradient(0deg, #fff1 0 1px, transparent 1px 40px), repeating-linear-gradient(90deg, #fff1 0 1px, transparent 1px 40px)'}} />
      
      {/* Code/terminal style header overlay */}
      <div className="absolute top-0 left-0 w-full px-4 pt-8 z-10 select-none pointer-events-none">
        <div className="text-sm md:text-lg lg:text-2xl text-gray-400 tracking-tight">
          <span className="text-gray-600">function</span> <span className="text-red-500 font-bold">UserRegistration</span><span className="text-white">()</span> <span className="text-gray-600">&#123;</span>
        </div>
      </div>

      <div className="relative z-20 max-w-md w-full mx-4">
        <div className="bg-black/60 border border-gray-700 rounded-2xl shadow-xl p-8 backdrop-blur-sm">
          <div className="text-center mb-8">
            <div className="bg-gradient-to-r from-red-500 to-red-600 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <User className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Create Account</h1>
            <p className="text-gray-300">Join Bodax Masters Tournament</p>
            <p className="text-gray-400 text-sm mt-2">You can link your Discord account later in your profile</p>
          </div>

          {errors.general && (
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 mb-6">
              <p className="text-red-300 text-sm">{errors.general}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Username *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 bg-black/40 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all text-white placeholder-gray-400 ${
                    errors.username ? 'border-red-500' : 'border-gray-600'
                  }`}
                  placeholder="Enter username"
                />
              </div>
              {errors.username && (
                <p className="text-red-400 text-sm mt-1">{errors.username}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 bg-black/40 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all text-white placeholder-gray-400 ${
                    errors.email ? 'border-red-500' : 'border-gray-600'
                  }`}
                  placeholder="Enter email address"
                />
              </div>
              {errors.email && (
                <p className="text-red-400 text-sm mt-1">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className={`w-full pl-10 pr-12 py-3 bg-black/40 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all text-white placeholder-gray-400 ${
                    errors.password ? 'border-red-500' : 'border-gray-600'
                  }`}
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
              {errors.password && (
                <p className="text-red-400 text-sm mt-1">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Confirm Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  className={`w-full pl-10 pr-12 py-3 bg-black/40 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all text-white placeholder-gray-400 ${
                    errors.confirmPassword ? 'border-red-500' : 'border-gray-600'
                  }`}
                  placeholder="Confirm password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-red-400 text-sm mt-1">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Riot ID */}
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Riot ID *
              </label>
              <div className="relative">
                <Gamepad2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.riotId}
                  onChange={(e) => handleInputChange('riotId', e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 bg-black/40 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all text-white placeholder-gray-400 ${
                    errors.riotId ? 'border-red-500' : 'border-gray-600'
                  }`}
                  placeholder="e.g., PlayerName#TAG"
                />
              </div>
              {errors.riotId && (
                <p className="text-red-400 text-sm mt-1">{errors.riotId}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-3 rounded-lg font-bold hover:from-red-700 hover:to-red-800 transition-all disabled:bg-gray-600 disabled:cursor-not-allowed shadow-lg border border-red-800"
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-300">
              Already have an account?{' '}
              <button
                onClick={() => navigate('/login')}
                className="text-red-400 hover:text-red-300 font-semibold transition-colors"
              >
                Sign In
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserRegistration; 