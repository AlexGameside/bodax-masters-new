import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const GDPR = () => {
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
          <h1 className="text-4xl font-bodax tracking-wide text-white uppercase">GDPR Compliance</h1>
          <p className="text-sm font-mono text-gray-500">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        <div className="bg-[#0a0a0a] border border-gray-800 p-8 space-y-10">
          <section className="space-y-3">
            <h2 className="text-2xl font-bodax tracking-wide text-white uppercase">1. Introduction</h2>
            <p className="text-gray-300 font-mono text-sm leading-relaxed">
              The General Data Protection Regulation (GDPR) applies to organizations in the EU and to those offering goods or services to individuals in the EU. This page outlines how Bodax Masters complies with GDPR requirements.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bodax tracking-wide text-white uppercase">2. Your Rights Under GDPR</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-300 font-mono text-sm leading-relaxed">
              {[
                { title: 'Right of Access', desc: 'Request access to your personal data and how we process it.' },
                { title: 'Right to Rectification', desc: 'Request correction of inaccurate or incomplete data.' },
                { title: 'Right to Erasure', desc: 'Request deletion of your personal data in certain circumstances.' },
                { title: 'Right to Restriction', desc: 'Request limitation of processing in specific situations.' },
                { title: 'Right to Portability', desc: 'Request your data in a structured, machine-readable format.' },
                { title: 'Right to Object', desc: 'Object to processing based on legitimate interests or direct marketing.' },
              ].map((item) => (
                <div key={item.title} className="bg-black/40 border border-gray-800 p-4">
                  <h3 className="text-lg font-bodax text-white mb-2 uppercase">{item.title}</h3>
                  <p className="text-sm">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bodax tracking-wide text-white uppercase">3. Data We Collect and Process</h2>
            <div className="text-gray-300 space-y-4 font-mono text-sm leading-relaxed">
              <div className="bg-black/40 border border-gray-800 p-4">
                <h3 className="text-lg font-bodax text-white mb-2 uppercase">Personal Data</h3>
                <ul className="space-y-1">
                  <li>• Name, email address, and username</li>
                  <li>• Riot ID and Discord username</li>
                  <li>• Tournament participation and match results</li>
                  <li>• Team membership and roles</li>
                  <li>• Communication preferences</li>
                </ul>
              </div>
              
              <div className="bg-black/40 border border-gray-800 p-4">
                <h3 className="text-lg font-bodax text-white mb-2 uppercase">Technical Data</h3>
                <ul className="space-y-1">
                  <li>• IP address and device information</li>
                  <li>• Browser type and version</li>
                  <li>• Usage patterns and analytics</li>
                  <li>• Cookie data and session information</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bodax tracking-wide text-white uppercase">4. Legal Basis for Processing</h2>
            <div className="text-gray-300 space-y-3 font-mono text-sm leading-relaxed">
              <p>We process your personal data based on the following legal grounds:</p>
              <ul className="list-disc list-inside space-y-1 pl-1">
                <li><strong>Consent:</strong> When you explicitly agree to data processing</li>
                <li><strong>Contract Performance:</strong> To provide tournament services</li>
                <li><strong>Legitimate Interests:</strong> To improve our services and ensure security</li>
                <li><strong>Legal Obligations:</strong> To comply with applicable laws</li>
              </ul>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bodax tracking-wide text-white uppercase">5. Data Retention</h2>
            <div className="text-gray-300 space-y-3 font-mono text-sm leading-relaxed">
              <p>We retain your personal data for the following periods:</p>
              <ul className="list-disc list-inside space-y-1 pl-1">
                <li><strong>Account Data:</strong> Until account deletion or 2 years of inactivity</li>
                <li><strong>Tournament Data:</strong> 5 years for historical records</li>
                <li><strong>Match Results:</strong> Indefinitely for statistical purposes</li>
                <li><strong>Communication Data:</strong> 2 years from last interaction</li>
                <li><strong>Technical Logs:</strong> 90 days for security purposes</li>
              </ul>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bodax tracking-wide text-white uppercase">6. Data Security</h2>
            <div className="text-gray-300 space-y-3 font-mono text-sm leading-relaxed">
              <p>We implement appropriate technical and organizational measures to protect your personal data:</p>
              <ul className="list-disc list-inside space-y-1 pl-1">
                <li>Encryption of data in transit and at rest</li>
                <li>Regular security assessments and updates</li>
                <li>Access controls and authentication</li>
                <li>Data backup and disaster recovery</li>
                <li>Staff training on data protection</li>
              </ul>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bodax tracking-wide text-white uppercase">7. International Transfers</h2>
            <div className="text-gray-300 space-y-3 font-mono text-sm leading-relaxed">
              <p>Your data may be transferred to countries outside the EU/EEA. We ensure such transfers comply with GDPR requirements through:</p>
              <ul className="list-disc list-inside space-y-1 pl-1">
                <li>Adequacy decisions by the European Commission</li>
                <li>Standard Contractual Clauses (SCCs)</li>
                <li>Certification schemes and codes of conduct</li>
                <li>Binding corporate rules</li>
              </ul>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bodax tracking-wide text-white uppercase">8. Exercising Your Rights</h2>
            <div className="text-gray-300 space-y-3 font-mono text-sm leading-relaxed">
              <p>To exercise your GDPR rights, please contact us using the information below. We will respond to your request within 30 days.</p>
              
              <div className="bg-black/40 border border-blue-700/40 p-4">
                <h3 className="text-lg font-bodax text-blue-200 mb-2 uppercase">Request Form</h3>
                <p className="text-sm text-blue-100">Please include in your request:</p>
                <ul className="text-sm text-blue-100 space-y-1 ml-4 list-disc list-inside">
                  <li>Your full name and email address</li>
                  <li>Specific right you wish to exercise</li>
                  <li>Description of the data concerned</li>
                  <li>Any additional context or requirements</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bodax tracking-wide text-white uppercase">9. Data Protection Officer</h2>
            <div className="text-gray-300 space-y-3 font-mono text-sm leading-relaxed">
              <p>We have appointed a Data Protection Officer (DPO) to oversee our GDPR compliance:</p>
              <div className="bg-black/40 border border-gray-800 p-4">
                <p><strong>Email:</strong> dpo@bodax.dev</p>
                <p><strong>Response Time:</strong> Within 72 hours for urgent matters</p>
                <p><strong>Languages:</strong> English, Greek</p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bodax tracking-wide text-white uppercase">10. Breach Notification</h2>
            <div className="text-gray-300 space-y-3 font-mono text-sm leading-relaxed">
              <p>In the event of a data breach that poses a risk to your rights and freedoms, we will:</p>
              <ul className="list-disc list-inside space-y-1 pl-1">
                <li>Notify the relevant supervisory authority within 72 hours</li>
                <li>Inform affected individuals without undue delay</li>
                <li>Document all breaches and our response</li>
                <li>Take immediate steps to mitigate any risks</li>
              </ul>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bodax tracking-wide text-white uppercase">11. Contact Information</h2>
            <div className="text-gray-300 space-y-3 font-mono text-sm leading-relaxed">
              <p>For GDPR-related inquiries and requests:</p>
              <div className="bg-black/40 border border-red-900/40 p-4">
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