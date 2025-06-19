import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Youtube, Mail, Phone, MapPin, ExternalLink, Heart } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-black/80 border-t border-gray-700">
      <div className="container-modern py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-gray-300 hover:text-red-400 transition-colors duration-200">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/tournaments" className="text-gray-300 hover:text-red-400 transition-colors duration-200">
                  Tournaments
                </Link>
              </li>
              <li>
                <Link to="/register" className="text-gray-300 hover:text-red-400 transition-colors duration-200">
                  Register
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-gray-300 hover:text-red-400 transition-colors duration-200">
                  Login
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Support</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/contact" className="text-gray-300 hover:text-red-400 transition-colors duration-200 flex items-center">
                  <Mail className="w-4 h-4 mr-2" />
                  Contact Us
                </Link>
              </li>
              <li>
                <Link to="/help-center" className="text-gray-300 hover:text-red-400 transition-colors duration-200 flex items-center">
                  <Phone className="w-4 h-4 mr-2" />
                  Help Center
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-gray-300 hover:text-red-400 transition-colors duration-200 flex items-center">
                  <MapPin className="w-4 h-4 mr-2" />
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/privacy-policy" className="text-gray-300 hover:text-red-400 transition-colors duration-200">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms-of-service" className="text-gray-300 hover:text-red-400 transition-colors duration-200">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/cookie-policy" className="text-gray-300 hover:text-red-400 transition-colors duration-200">
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link to="/gdpr" className="text-gray-300 hover:text-red-400 transition-colors duration-200">
                  GDPR
                </Link>
              </li>
            </ul>
          </div>

          {/* Social Media */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Follow Us</h3>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-300 hover:text-red-400 transition-colors duration-200">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-300 hover:text-red-400 transition-colors duration-200">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-300 hover:text-red-400 transition-colors duration-200">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-300 hover:text-red-400 transition-colors duration-200">
                <Youtube className="w-5 h-5" />
              </a>
            </div>
            <p className="text-gray-400 text-sm mt-4">
              Join our community for updates, tournaments, and more!
            </p>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-700 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <img src="/bodax-pfp.png" alt="Bodax Masters" className="w-8 h-8" />
            <span className="text-white font-semibold">Bodax Masters</span>
          </div>
          
          <div className="text-gray-300 text-sm">
            © {currentYear} Bodax Masters. All rights reserved.
          </div>
          
          <div className="flex items-center space-x-2 text-sm text-gray-300">
            <span>made by</span>
            <a 
              href="https://bodax.dev" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-red-400 transition-colors duration-200 flex items-center"
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              bodax.dev
            </a>
            <span>with</span>
            <Heart className="w-4 h-4 text-red-500" />
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 