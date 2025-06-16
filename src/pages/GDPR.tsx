import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const GDPR = () => {
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
          <h1 className="text-3xl font-bold text-white mb-4">GDPR Compliance</h1>
          <p className="text-gray-400">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        {/* Content */}
        <div className="bg-gray-800 rounded-lg p-8 space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">1. Introduction</h2>
            <div className="text-gray-300 space-y-3">
              <p>The General Data Protection Regulation (GDPR) is a comprehensive data protection law that applies to all organizations operating within the EU and those that offer goods or services to individuals in the EU. This page outlines how Bodax Masters complies with GDPR requirements.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">2. Your Rights Under GDPR</h2>
            <div className="text-gray-300 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-white mb-2">Right of Access</h3>
                  <p className="text-sm">You have the right to request access to your personal data and information about how we process it.</p>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-white mb-2">Right to Rectification</h3>
                  <p className="text-sm">You can request correction of inaccurate or incomplete personal data.</p>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-white mb-2">Right to Erasure</h3>
                  <p className="text-sm">You can request deletion of your personal data in certain circumstances.</p>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-white mb-2">Right to Restriction</h3>
                  <p className="text-sm">You can request limitation of processing in specific situations.</p>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-white mb-2">Right to Portability</h3>
                  <p className="text-sm">You can request your data in a structured, machine-readable format.</p>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-white mb-2">Right to Object</h3>
                  <p className="text-sm">You can object to processing based on legitimate interests or direct marketing.</p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">3. Data We Collect and Process</h2>
            <div className="text-gray-300 space-y-4">
              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-medium text-white mb-2">Personal Data</h3>
                <ul className="space-y-1 text-sm">
                  <li>• Name, email address, and username</li>
                  <li>• Riot ID and Discord username</li>
                  <li>• Tournament participation and match results</li>
                  <li>• Team membership and roles</li>
                  <li>• Communication preferences</li>
                </ul>
              </div>
              
              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-medium text-white mb-2">Technical Data</h3>
                <ul className="space-y-1 text-sm">
                  <li>• IP address and device information</li>
                  <li>• Browser type and version</li>
                  <li>• Usage patterns and analytics</li>
                  <li>• Cookie data and session information</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">4. Legal Basis for Processing</h2>
            <div className="text-gray-300 space-y-3">
              <p>We process your personal data based on the following legal grounds:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Consent:</strong> When you explicitly agree to data processing</li>
                <li><strong>Contract Performance:</strong> To provide tournament services</li>
                <li><strong>Legitimate Interests:</strong> To improve our services and ensure security</li>
                <li><strong>Legal Obligations:</strong> To comply with applicable laws</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">5. Data Retention</h2>
            <div className="text-gray-300 space-y-3">
              <p>We retain your personal data for the following periods:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Account Data:</strong> Until account deletion or 2 years of inactivity</li>
                <li><strong>Tournament Data:</strong> 5 years for historical records</li>
                <li><strong>Match Results:</strong> Indefinitely for statistical purposes</li>
                <li><strong>Communication Data:</strong> 2 years from last interaction</li>
                <li><strong>Technical Logs:</strong> 90 days for security purposes</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">6. Data Security</h2>
            <div className="text-gray-300 space-y-3">
              <p>We implement appropriate technical and organizational measures to protect your personal data:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Encryption of data in transit and at rest</li>
                <li>Regular security assessments and updates</li>
                <li>Access controls and authentication</li>
                <li>Data backup and disaster recovery</li>
                <li>Staff training on data protection</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">7. International Transfers</h2>
            <div className="text-gray-300 space-y-3">
              <p>Your data may be transferred to countries outside the EU/EEA. We ensure such transfers comply with GDPR requirements through:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Adequacy decisions by the European Commission</li>
                <li>Standard Contractual Clauses (SCCs)</li>
                <li>Certification schemes and codes of conduct</li>
                <li>Binding corporate rules</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">8. Exercising Your Rights</h2>
            <div className="text-gray-300 space-y-3">
              <p>To exercise your GDPR rights, please contact us using the information below. We will respond to your request within 30 days.</p>
              
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                <h3 className="text-lg font-medium text-blue-200 mb-2">Request Form</h3>
                <p className="text-sm text-blue-100">Please include in your request:</p>
                <ul className="text-sm text-blue-100 space-y-1 ml-4">
                  <li>• Your full name and email address</li>
                  <li>• Specific right you wish to exercise</li>
                  <li>• Description of the data concerned</li>
                  <li>• Any additional context or requirements</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">9. Data Protection Officer</h2>
            <div className="text-gray-300 space-y-3">
              <p>We have appointed a Data Protection Officer (DPO) to oversee our GDPR compliance:</p>
              <div className="bg-gray-700 rounded-lg p-4">
                <p><strong>Email:</strong> dpo@bodax.dev</p>
                <p><strong>Response Time:</strong> Within 72 hours for urgent matters</p>
                <p><strong>Languages:</strong> English, Greek</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">10. Breach Notification</h2>
            <div className="text-gray-300 space-y-3">
              <p>In the event of a data breach that poses a risk to your rights and freedoms, we will:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Notify the relevant supervisory authority within 72 hours</li>
                <li>Inform affected individuals without undue delay</li>
                <li>Document all breaches and our response</li>
                <li>Take immediate steps to mitigate any risks</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">11. Contact Information</h2>
            <div className="text-gray-300 space-y-3">
              <p>For GDPR-related inquiries and requests:</p>
              <div className="bg-gray-700 rounded-lg p-4">
                <p><strong>Data Protection Officer:</strong> dpo@bodax.dev</p>
                <p><strong>General Privacy Inquiries:</strong> privacy@bodax.dev</p>
                <p><strong>Website:</strong> https://bodax.dev</p>
                <p><strong>Response Time:</strong> Within 30 days for standard requests</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default GDPR; 