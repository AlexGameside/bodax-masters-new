import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Gamepad2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-hot-toast';
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
      toast.success('Account created successfully! Welcome to Unity League! 🎉');
      // Small delay to show the toast before redirecting
      setTimeout(() => {
        navigate('/profile');
      }, 1000);
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
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Join Unity League</h1>
            <p className="text-pink-200">Create your account and start competing</p>
            <p className="text-pink-100 text-sm mt-2">You can link your Discord account later in your profile</p>
          </div>

          {errors.general && (
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 mb-6">
              <p className="text-red-300 text-sm">{errors.general}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-pink-200 mb-2">
                Username *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-cyan-400" />
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 bg-black/40 border rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all text-white placeholder-pink-300 ${
                    errors.username ? 'border-red-500' : 'border-pink-400/30'
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
              <label className="block text-sm font-medium text-pink-200 mb-2">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-cyan-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 bg-black/40 border rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all text-white placeholder-pink-300 ${
                    errors.email ? 'border-red-500' : 'border-pink-400/30'
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
              <label className="block text-sm font-medium text-pink-200 mb-2">
                Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-cyan-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className={`w-full pl-10 pr-12 py-3 bg-black/40 border rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all text-white placeholder-pink-300 ${
                    errors.password ? 'border-red-500' : 'border-pink-400/30'
                  }`}
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-pink-300 hover:text-cyan-400 transition-colors"
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
              <label className="block text-sm font-medium text-pink-200 mb-2">
                Confirm Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-cyan-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  className={`w-full pl-10 pr-12 py-3 bg-black/40 border rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all text-white placeholder-pink-300 ${
                    errors.confirmPassword ? 'border-red-500' : 'border-pink-400/30'
                  }`}
                  placeholder="Confirm password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-pink-300 hover:text-cyan-400 transition-colors"
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
              <label className="block text-sm font-medium text-pink-200 mb-2">
                Riot ID *
              </label>
              <div className="relative">
                <Gamepad2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-cyan-400" />
                <input
                  type="text"
                  value={formData.riotId}
                  onChange={(e) => handleInputChange('riotId', e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 bg-black/40 border rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all text-white placeholder-pink-300 ${
                    errors.riotId ? 'border-red-500' : 'border-pink-400/30'
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
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-black font-bold py-3 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-pink-200 text-sm">
              Already have an account?{' '}
              <button
                onClick={() => navigate('/login')}
                className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
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