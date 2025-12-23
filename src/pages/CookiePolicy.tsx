import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const CookiePolicy = () => {
  return (
    <div className="min-h-screen bg-[#050505] text-gray-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        <Link
          to="/"
          className="inline-flex items-center text-red-500 hover:text-white transition-colors font-mono uppercase text-xs tracking-[0.25em]"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Link>

        <div className="space-y-2">
          <h1 className="text-4xl font-bodax tracking-wide text-white uppercase">Cookie Policy</h1>
          <p className="text-sm font-mono text-gray-500">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        <div className="bg-[#0a0a0a] border border-gray-800 p-8 space-y-10">
          <section className="space-y-3">
            <h2 className="text-2xl font-bodax tracking-wide text-white uppercase">1. What Are Cookies</h2>
            <p className="text-gray-300 font-mono text-sm leading-relaxed">
              Cookies are small text files stored on your device when you visit our website. They help us provide you with a better experience by remembering your preferences and settings.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bodax tracking-wide text-white uppercase">2. How We Use Cookies</h2>
            <div className="text-gray-300 space-y-3 font-mono text-sm leading-relaxed">
              <p>We use cookies for the following purposes:</p>
              <ul className="list-disc list-inside space-y-1 pl-1">
                <li><strong>Essential Cookies:</strong> Required for the website to function properly</li>
                <li><strong>Authentication Cookies:</strong> To keep you logged in during your session</li>
                <li><strong>Preference Cookies:</strong> To remember your settings and preferences</li>
                <li><strong>Analytics Cookies:</strong> To understand how visitors use our website</li>
                <li><strong>Security Cookies:</strong> To protect against fraud and ensure security</li>
              </ul>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bodax tracking-wide text-white uppercase">3. Types of Cookies We Use</h2>
            <div className="text-gray-300 space-y-4 font-mono text-sm leading-relaxed">
              <div>
                <h3 className="text-lg font-bodax text-white mb-2 uppercase">Session Cookies</h3>
                <p>Temporary and deleted when you close your browser. They help maintain your session and keep you logged in.</p>
              </div>
              
              <div>
                <h3 className="text-lg font-bodax text-white mb-2 uppercase">Persistent Cookies</h3>
                <p>Remain on your device for a set period or until you delete them. They remember your preferences and settings for future visits.</p>
              </div>
              
              <div>
                <h3 className="text-lg font-bodax text-white mb-2 uppercase">Third-Party Cookies</h3>
                <p>Set by third-party services we use, such as analytics providers. These help us understand website usage and improve our services.</p>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bodax tracking-wide text-white uppercase">4. Specific Cookies We Use</h2>
            <div className="text-gray-300 space-y-4 font-mono text-sm leading-relaxed">
              <div className="bg-black/40 border border-red-900/30 p-4">
                <h3 className="text-lg font-bodax text-white mb-2 uppercase">Authentication</h3>
                <ul className="space-y-1">
                  <li><strong>auth_token:</strong> Keeps you logged in during your session</li>
                  <li><strong>user_preferences:</strong> Remembers your account settings</li>
                </ul>
              </div>
              
              <div className="bg-black/40 border border-red-900/30 p-4">
                <h3 className="text-lg font-bodax text-white mb-2 uppercase">Analytics</h3>
                <ul className="space-y-1">
                  <li><strong>_ga:</strong> Google Analytics - tracks website usage</li>
                  <li><strong>_gid:</strong> Google Analytics - session tracking</li>
                  <li><strong>_gat:</strong> Google Analytics - request rate limiting</li>
                </ul>
              </div>
              
              <div className="bg-black/40 border border-red-900/30 p-4">
                <h3 className="text-lg font-bodax text-white mb-2 uppercase">Functionality</h3>
                <ul className="space-y-1">
                  <li><strong>theme_preference:</strong> Remembers your dark/light mode choice</li>
                  <li><strong>language_preference:</strong> Stores your language selection</li>
                  <li><strong>notification_settings:</strong> Remembers your notification preferences</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bodax tracking-wide text-white uppercase">5. Managing Cookies</h2>
            <div className="text-gray-300 space-y-3 font-mono text-sm leading-relaxed">
              <p>You can control and manage cookies in several ways:</p>
              <ul className="list-disc list-inside space-y-1 pl-1">
                <li><strong>Browser Settings:</strong> Most browsers allow you to control cookies through their settings</li>
                <li><strong>Cookie Consent:</strong> We provide options to accept or decline non-essential cookies</li>
                <li><strong>Third-Party Opt-Out:</strong> You can opt out of third-party analytics cookies</li>
                <li><strong>Manual Deletion:</strong> You can delete cookies manually through your browser</li>
              </ul>
              <div className="bg-yellow-900/20 border border-yellow-500/40 p-4 text-yellow-100">
                <strong>Note:</strong> Disabling certain cookies may affect the functionality of our website and your user experience.
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bodax tracking-wide text-white uppercase">6. Browser-Specific Instructions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-300 font-mono text-sm leading-relaxed">
              <div className="bg-black/40 border border-gray-800 p-4">
                <h3 className="text-lg font-bodax text-white mb-2 uppercase">Chrome</h3>
                <p>Settings → Privacy and Security → Cookies and other site data</p>
              </div>
              <div className="bg-black/40 border border-gray-800 p-4">
                <h3 className="text-lg font-bodax text-white mb-2 uppercase">Firefox</h3>
                <p>Options → Privacy &amp; Security → Cookies and Site Data</p>
              </div>
              <div className="bg-black/40 border border-gray-800 p-4">
                <h3 className="text-lg font-bodax text-white mb-2 uppercase">Safari</h3>
                <p>Preferences → Privacy → Manage Website Data</p>
              </div>
              <div className="bg-black/40 border border-gray-800 p-4">
                <h3 className="text-lg font-bodax text-white mb-2 uppercase">Edge</h3>
                <p>Settings → Cookies and site permissions → Cookies and site data</p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bodax tracking-wide text-white uppercase">7. Third-Party Services</h2>
            <div className="text-gray-300 space-y-3 font-mono text-sm leading-relaxed">
              <p>We use the following third-party services that may set cookies:</p>
              <ul className="list-disc list-inside space-y-1 pl-1">
                <li><strong>Google Analytics:</strong> Website analytics and usage tracking</li>
                <li><strong>Firebase:</strong> Authentication and database services</li>
                <li><strong>Cloudflare:</strong> Content delivery and security</li>
              </ul>
              <p>These services have their own privacy policies and cookie practices.</p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bodax tracking-wide text-white uppercase">8. Updates to This Policy</h2>
            <p className="text-gray-300 font-mono text-sm leading-relaxed">
              We may update this Cookie Policy to reflect changes in our practices or for operational, legal, or regulatory reasons. We will notify you of any material changes by posting the updated policy on our website.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bodax tracking-wide text-white uppercase">9. Contact Us</h2>
            <div className="text-gray-300 space-y-3 font-mono text-sm leading-relaxed">
              <p>If you have any questions about our use of cookies, please contact us:</p>
              <div className="bg-black/40 border border-red-900/40 p-4">
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