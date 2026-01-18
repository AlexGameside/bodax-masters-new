import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRiotAuthUrl } from '../services/riotOAuthService';
import { Loader, ArrowLeft } from 'lucide-react';

const RiotLogin = () => {
  const navigate = useNavigate();
  const [autoRedirect, setAutoRedirect] = useState(true);

  useEffect(() => {
    if (autoRedirect) {
      // Redirect to Riot OAuth after a short delay
      const timer = setTimeout(() => {
        try {
          const authUrl = getRiotAuthUrl();
          window.location.href = authUrl;
        } catch (error) {
          console.error('Failed to get Riot auth URL:', error);
          setAutoRedirect(false);
        }
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [autoRedirect]);

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
          {autoRedirect ? (
            <>
              <Loader className="w-12 h-12 text-red-500 animate-spin mx-auto mb-4" />
              <h1 className="text-4xl font-bold text-white mb-2 font-bodax tracking-wide uppercase leading-none">
                Signing In
              </h1>
              <p className="text-gray-400 font-mono uppercase tracking-widest text-sm mb-4">
                Redirecting to Riot Sign-On...
              </p>
              <p className="text-gray-500 text-xs mb-4">
                You will be redirected to Riot Games to sign in with your Riot account.
              </p>
              <button
                onClick={() => setAutoRedirect(false)}
                className="text-gray-400 hover:text-red-500 text-xs font-mono uppercase tracking-widest transition-colors"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <h1 className="text-4xl font-bold text-white mb-2 font-bodax tracking-wide uppercase leading-none">
                Riot Sign-On
              </h1>
              <p className="text-gray-400 font-mono uppercase tracking-widest text-sm mb-6">
                Sign in with your Riot Games account
              </p>
              <button
                onClick={() => {
                  try {
                    const authUrl = getRiotAuthUrl();
                    window.location.href = authUrl;
                  } catch (error) {
                    console.error('Failed to get Riot auth URL:', error);
                  }
                }}
                className="w-full bg-red-600 hover:bg-red-700 text-white border border-red-800 font-bodax text-xl uppercase tracking-wider py-3 px-6 transition-colors mb-4"
              >
                Continue with Riot
              </button>
              <div className="border-t border-gray-800 pt-4">
                <p className="text-gray-500 text-xs font-mono uppercase tracking-widest mb-2">
                  Or use
                </p>
                <button
                  onClick={() => navigate('/login')}
                  className="text-blue-400 hover:text-blue-300 transition-colors text-sm font-mono uppercase tracking-widest"
                >
                  Email / Password Login
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RiotLogin;

