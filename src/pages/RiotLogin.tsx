import { useEffect } from 'react';
import { getRiotAuthUrl } from '../services/riotOAuthService';
import { Loader } from 'lucide-react';

const RiotLogin = () => {
  useEffect(() => {
    // Redirect to Riot OAuth immediately
    try {
      const authUrl = getRiotAuthUrl();
      window.location.href = authUrl;
    } catch (error) {
      console.error('Failed to get Riot auth URL:', error);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-white relative overflow-hidden flex items-center justify-center">
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

      <div className="relative z-20 max-w-md w-full mx-4 text-center">
        <div className="bg-[#0a0a0a] border border-gray-800 shadow-2xl p-8">
          <Loader className="w-12 h-12 text-red-500 animate-spin mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-white mb-2 font-bodax tracking-wide uppercase leading-none">
            Signing In
          </h1>
          <p className="text-gray-400 font-mono uppercase tracking-widest text-sm mb-4">
            Redirecting to Riot Sign-On...
          </p>
          <p className="text-gray-500 text-xs">
            You will be redirected to Riot Games to sign in with your Riot account.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RiotLogin;

