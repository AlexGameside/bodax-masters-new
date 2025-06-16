import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const CookiePolicy = () => {
  return (
    <div className="min-h-screen bg-gray-900">
      <div className="container-modern py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            to="/" 
            className="inline-flex items-center text-primary-400 hover:text-primary-300 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-white mb-4">Cookie Policy</h1>
          <p className="text-gray-400">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        {/* Content */}
        <div className="bg-gray-800 rounded-lg p-8 space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">1. What Are Cookies</h2>
            <div className="text-gray-300 space-y-3">
              <p>Cookies are small text files that are stored on your device when you visit our website. They help us provide you with a better experience by remembering your preferences and settings.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">2. How We Use Cookies</h2>
            <div className="text-gray-300 space-y-3">
              <p>We use cookies for the following purposes:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Essential Cookies:</strong> Required for the website to function properly</li>
                <li><strong>Authentication Cookies:</strong> To keep you logged in during your session</li>
                <li><strong>Preference Cookies:</strong> To remember your settings and preferences</li>
                <li><strong>Analytics Cookies:</strong> To understand how visitors use our website</li>
                <li><strong>Security Cookies:</strong> To protect against fraud and ensure security</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">3. Types of Cookies We Use</h2>
            <div className="text-gray-300 space-y-4">
              <div>
                <h3 className="text-lg font-medium text-white mb-2">Session Cookies</h3>
                <p>These cookies are temporary and are deleted when you close your browser. They help maintain your session and keep you logged in while using our platform.</p>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-white mb-2">Persistent Cookies</h3>
                <p>These cookies remain on your device for a set period or until you delete them. They remember your preferences and settings for future visits.</p>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-white mb-2">Third-Party Cookies</h3>
                <p>Some cookies are set by third-party services we use, such as analytics providers. These help us understand website usage and improve our services.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">4. Specific Cookies We Use</h2>
            <div className="text-gray-300 space-y-4">
              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-medium text-white mb-2">Authentication</h3>
                <ul className="space-y-1 text-sm">
                  <li><strong>auth_token:</strong> Keeps you logged in during your session</li>
                  <li><strong>user_preferences:</strong> Remembers your account settings</li>
                </ul>
              </div>
              
              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-medium text-white mb-2">Analytics</h3>
                <ul className="space-y-1 text-sm">
                  <li><strong>_ga:</strong> Google Analytics - tracks website usage</li>
                  <li><strong>_gid:</strong> Google Analytics - session tracking</li>
                  <li><strong>_gat:</strong> Google Analytics - request rate limiting</li>
                </ul>
              </div>
              
              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-medium text-white mb-2">Functionality</h3>
                <ul className="space-y-1 text-sm">
                  <li><strong>theme_preference:</strong> Remembers your dark/light mode choice</li>
                  <li><strong>language_preference:</strong> Stores your language selection</li>
                  <li><strong>notification_settings:</strong> Remembers your notification preferences</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">5. Managing Cookies</h2>
            <div className="text-gray-300 space-y-3">
              <p>You can control and manage cookies in several ways:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Browser Settings:</strong> Most browsers allow you to control cookies through their settings</li>
                <li><strong>Cookie Consent:</strong> We provide options to accept or decline non-essential cookies</li>
                <li><strong>Third-Party Opt-Out:</strong> You can opt out of third-party analytics cookies</li>
                <li><strong>Manual Deletion:</strong> You can delete cookies manually through your browser</li>
              </ul>
              <p className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4 text-yellow-200">
                <strong>Note:</strong> Disabling certain cookies may affect the functionality of our website and your user experience.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">6. Browser-Specific Instructions</h2>
            <div className="text-gray-300 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-white mb-2">Chrome</h3>
                  <p className="text-sm">Settings → Privacy and Security → Cookies and other site data</p>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-white mb-2">Firefox</h3>
                  <p className="text-sm">Options → Privacy & Security → Cookies and Site Data</p>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-white mb-2">Safari</h3>
                  <p className="text-sm">Preferences → Privacy → Manage Website Data</p>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-white mb-2">Edge</h3>
                  <p className="text-sm">Settings → Cookies and site permissions → Cookies and site data</p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">7. Third-Party Services</h2>
            <div className="text-gray-300 space-y-3">
              <p>We use the following third-party services that may set cookies:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Google Analytics:</strong> Website analytics and usage tracking</li>
                <li><strong>Firebase:</strong> Authentication and database services</li>
                <li><strong>Cloudflare:</strong> Content delivery and security</li>
              </ul>
              <p>These services have their own privacy policies and cookie practices.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">8. Updates to This Policy</h2>
            <div className="text-gray-300 space-y-3">
              <p>We may update this Cookie Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. We will notify you of any material changes by posting the updated policy on our website.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">9. Contact Us</h2>
            <div className="text-gray-300 space-y-3">
              <p>If you have any questions about our use of cookies, please contact us:</p>
              <div className="bg-gray-700 rounded-lg p-4">
                <p><strong>Email:</strong> privacy@bodax.dev</p>
                <p><strong>Website:</strong> https://bodax.dev</p>
                <p><strong>Subject:</strong> Cookie Policy Inquiry</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default CookiePolicy; 