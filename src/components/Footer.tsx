import { Link } from 'react-router-dom';
import { Twitter, Mail, MessageSquare } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#050505] border-t border-red-900/40 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div className="space-y-4">
            <div className="text-3xl font-bodax tracking-wider text-white">
              <span className="text-red-600">/</span> BODAX
            </div>
            <p className="text-sm font-mono text-gray-400">
              Tournament platform for Bodax events and organizers who want the same sharp control room.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-bodax tracking-wide text-white uppercase mb-4">Platform</h3>
            <ul className="space-y-2 text-sm font-mono">
              <li>
                <Link to="/" className="hover:text-red-500 transition-colors duration-150">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/tournaments" className="hover:text-red-500 transition-colors duration-150">
                  Tournaments
                </Link>
              </li>
              <li>
                <Link to="/admin/tournaments/create" className="hover:text-red-500 transition-colors duration-150">
                  Host a Tournament
                </Link>
              </li>
              <li>
                {/* My Matches removed from nav; users jump to active matches via navbar */}
              </li>
              <li className="flex items-center gap-2">
                <Link to="/login" className="hover:text-red-500 transition-colors duration-150">
                  Login
                </Link>
                <span className="text-gray-600">/</span>
                <Link to="/register" className="hover:text-red-500 transition-colors duration-150">
                  Register
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-bodax tracking-wide text-white uppercase mb-4">Support</h3>
            <ul className="space-y-2 text-sm font-mono">
              <li>
                <Link to="/contact" className="hover:text-red-500 transition-colors duration-150 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Contact
                </Link>
              </li>
              <li>
                <a
                  href="https://discord.gg/ewAk7wBgHT"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-red-500 transition-colors duration-150 flex items-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  Discord
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-bodax tracking-wide text-white uppercase mb-4">Legal</h3>
            <ul className="space-y-2 text-sm font-mono">
              <li>
                <Link to="/privacy-policy" className="hover:text-red-500 transition-colors duration-150">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms-of-service" className="hover:text-red-500 transition-colors duration-150">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/cookie-policy" className="hover:text-red-500 transition-colors duration-150">
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link to="/gdpr" className="hover:text-red-500 transition-colors duration-150">
                  GDPR
                </Link>
              </li>
              <li>
                <Link to="/impressum" className="hover:text-red-500 transition-colors duration-150">
                  Impressum
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-red-900/30 mt-10 pt-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-sm font-mono text-gray-400">
          <div>© {currentYear} Bodax Masters. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <a
              href="https://x.com/GamingBodax"
              target="_blank"
              rel="noreferrer"
              className="hover:text-red-500 transition-colors duration-150 flex items-center gap-2"
            >
              <Twitter className="w-4 h-4" />
              X
            </a>
            <a
              href="https://discord.gg/ewAk7wBgHT"
              target="_blank"
              rel="noreferrer"
              className="hover:text-red-500 transition-colors duration-150 flex items-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              Discord
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/privacy-policy" className="hover:text-red-500 transition-colors duration-150">
              Privacy
            </Link>
            <span className="text-gray-700">|</span>
            <Link to="/terms-of-service" className="hover:text-red-500 transition-colors duration-150">
              Terms
            </Link>
            <span className="text-gray-700">|</span>
            <Link to="/impressum" className="hover:text-red-500 transition-colors duration-150">
              Impressum
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 