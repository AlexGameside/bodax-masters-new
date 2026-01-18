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
      toast.success('Account created successfully! Welcome to Bodax!');
      // Small delay to show the toast before redirecting
      setTimeout(() => {
        navigate('/profile');
      }, 1000);
    } catch (error: any) {
      console.error('Registration error:', error);
      
      // Handle specific error types with better messages
      if (error.message === 'USERNAME_EXISTS') {
        setErrors({ username: 'This username is already taken. Please choose a different one.' });
      } else if (error.message === 'EMAIL_EXISTS') {
        setErrors({ email: 'This email is already registered. Please use a different email or try logging in.' });
      } else if (error.message.includes('Password is too weak')) {
        setErrors({ password: 'Password is too weak. Please choose a stronger password with at least 6 characters.' });
      } else if (error.message.includes('valid email')) {
        setErrors({ email: 'Please enter a valid email address.' });
      } else if (error.message.includes('Registration is currently disabled')) {
        setErrors({ general: 'Registration is temporarily disabled. Please contact support for assistance.' });
      } else if (error.message.includes('Too many registration attempts')) {
        setErrors({ general: 'Too many registration attempts. Please wait a few minutes before trying again.' });
      } else if (error.message.includes('username')) {
        setErrors({ username: 'Username already exists' });
      } else if (error.message.includes('email')) {
        setErrors({ email: 'Email already registered' });
      } else {
        setErrors({ general: 'Registration failed. Please check your information and try again.' });
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
    <div className="min-h-screen bg-[#050505] text-white relative overflow-hidden flex items-center justify-center py-12">
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            'linear-gradient(rgba(50, 50, 50, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(50, 50, 50, 0.5) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />
      <div className="absolute inset-0 z-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(255,0,0,0.08),transparent_55%)]" />

      <div className="relative z-20 max-w-md w-full mx-4">
        <div className="bg-[#0a0a0a] border border-gray-800 shadow-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2 font-bodax tracking-wide uppercase leading-none">
              Create Account
            </h1>
            <p className="text-gray-400 font-mono uppercase tracking-widest text-sm">
              Join Bodax and start competing
            </p>
            <p className="text-gray-500 text-xs mt-2 font-mono uppercase tracking-widest">
              You can link Discord later in your profile
            </p>
          </div>

          {errors.general && (
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 mb-6">
              <p className="text-red-300 text-sm">{errors.general}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username */}
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-2 font-mono uppercase tracking-widest">
                Username *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 bg-black/40 border focus:outline-none transition-colors text-white placeholder-gray-600 ${
                    errors.username ? 'border-red-600' : 'border-gray-800 focus:border-red-600'
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
              <label className="block text-xs font-bold text-gray-400 mb-2 font-mono uppercase tracking-widest">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 bg-black/40 border focus:outline-none transition-colors text-white placeholder-gray-600 ${
                    errors.email ? 'border-red-600' : 'border-gray-800 focus:border-red-600'
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
              <label className="block text-xs font-bold text-gray-400 mb-2 font-mono uppercase tracking-widest">
                Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className={`w-full pl-10 pr-12 py-3 bg-black/40 border focus:outline-none transition-colors text-white placeholder-gray-600 ${
                    errors.password ? 'border-red-600' : 'border-gray-800 focus:border-red-600'
                  }`}
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-red-500 transition-colors"
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
              <label className="block text-xs font-bold text-gray-400 mb-2 font-mono uppercase tracking-widest">
                Confirm Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  className={`w-full pl-10 pr-12 py-3 bg-black/40 border focus:outline-none transition-colors text-white placeholder-gray-600 ${
                    errors.confirmPassword ? 'border-red-600' : 'border-gray-800 focus:border-red-600'
                  }`}
                  placeholder="Confirm password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-red-500 transition-colors"
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
              <label className="block text-xs font-bold text-gray-400 mb-2 font-mono uppercase tracking-widest">
                Riot ID *
              </label>
              <div className="relative">
                <Gamepad2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  value={formData.riotId}
                  onChange={(e) => handleInputChange('riotId', e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 bg-black/40 border focus:outline-none transition-colors text-white placeholder-gray-600 ${
                    errors.riotId ? 'border-red-600' : 'border-gray-800 focus:border-red-600'
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
              className="w-full bg-red-600 hover:bg-red-700 text-white border border-red-800 font-bodax text-2xl uppercase tracking-wider py-3 px-6 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 space-y-3 text-center">
            <p className="text-gray-400 text-sm font-mono uppercase tracking-widest">
              Already have an account?{' '}
              <button
                onClick={() => navigate('/login')}
                className="text-red-500 hover:text-red-400 transition-colors"
              >
                Sign In
              </button>
            </p>
            <div className="border-t border-gray-800 pt-4">
              <p className="text-gray-500 text-xs font-mono uppercase tracking-widest mb-2">
                Or sign up with
              </p>
              <button
                onClick={() => navigate('/riot-login')}
                className="text-blue-400 hover:text-blue-300 transition-colors text-sm font-mono uppercase tracking-widest"
              >
                Riot Sign-On
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserRegistration; 