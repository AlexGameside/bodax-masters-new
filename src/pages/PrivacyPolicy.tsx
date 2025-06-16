import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const PrivacyPolicy = () => {
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
          <h1 className="text-3xl font-bold text-white mb-4">Privacy Policy</h1>
          <p className="text-gray-400">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        {/* Content */}
        <div className="bg-gray-800 rounded-lg p-8 space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">1. Information We Collect</h2>
            <div className="text-gray-300 space-y-3">
              <p>We collect information you provide directly to us when you:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Create an account and register for tournaments</li>
                <li>Join or create teams</li>
                <li>Participate in matches and competitions</li>
                <li>Contact us for support</li>
                <li>Subscribe to our newsletter</li>
              </ul>
              <p>This information may include:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Name, email address, and username</li>
                <li>Riot ID and Discord username</li>
                <li>Team information and tournament participation</li>
                <li>Match results and statistics</li>
                <li>Communication preferences</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">2. How We Use Your Information</h2>
            <div className="text-gray-300 space-y-3">
              <p>We use the information we collect to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Provide and maintain our tournament platform</li>
                <li>Process tournament registrations and manage competitions</li>
                <li>Communicate with you about tournaments and updates</li>
                <li>Send important notifications about matches and results</li>
                <li>Improve our services and user experience</li>
                <li>Ensure fair play and prevent cheating</li>
                <li>Comply with legal obligations</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">3. Information Sharing</h2>
            <div className="text-gray-300 space-y-3">
              <p>We do not sell, trade, or otherwise transfer your personal information to third parties except in the following circumstances:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>With your explicit consent</li>
                <li>To tournament organizers and administrators</li>
                <li>To comply with legal requirements</li>
                <li>To protect our rights and safety</li>
                <li>In connection with a business transfer or merger</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">4. Data Security</h2>
            <div className="text-gray-300 space-y-3">
              <p>We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. These measures include:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Encryption of sensitive data</li>
                <li>Regular security assessments</li>
                <li>Access controls and authentication</li>
                <li>Secure data transmission</li>
                <li>Regular backups and disaster recovery</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">5. Your Rights</h2>
            <div className="text-gray-300 space-y-3">
              <p>You have the right to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Access your personal information</li>
                <li>Correct inaccurate or incomplete data</li>
                <li>Request deletion of your personal information</li>
                <li>Object to processing of your data</li>
                <li>Withdraw consent at any time</li>
                <li>Request data portability</li>
              </ul>
              <p>To exercise these rights, please contact us using the information provided below.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">6. Cookies and Tracking</h2>
            <div className="text-gray-300 space-y-3">
              <p>We use cookies and similar tracking technologies to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Remember your preferences and settings</li>
                <li>Analyze website usage and performance</li>
                <li>Provide personalized content</li>
                <li>Ensure security and prevent fraud</li>
              </ul>
              <p>You can control cookie settings through your browser preferences.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">7. Children's Privacy</h2>
            <div className="text-gray-300 space-y-3">
              <p>Our services are not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you believe we have collected information from a child under 13, please contact us immediately.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">8. International Transfers</h2>
            <div className="text-gray-300 space-y-3">
              <p>Your information may be transferred to and processed in countries other than your own. We ensure that such transfers comply with applicable data protection laws and implement appropriate safeguards.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">9. Changes to This Policy</h2>
            <div className="text-gray-300 space-y-3">
              <p>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. Your continued use of our services after such changes constitutes acceptance of the updated policy.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">10. Contact Us</h2>
            <div className="text-gray-300 space-y-3">
              <p>If you have any questions about this Privacy Policy or our data practices, please contact us:</p>
              <div className="bg-gray-700 rounded-lg p-4">
                <p><strong>Email:</strong> privacy@bodax.dev</p>
                <p><strong>Website:</strong> https://bodax.dev</p>
                <p><strong>Response Time:</strong> We aim to respond to all inquiries within 48 hours.</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy; 