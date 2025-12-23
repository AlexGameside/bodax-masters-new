import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const TermsOfService = () => {
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
          <h1 className="text-4xl font-bodax tracking-wide text-white uppercase">Terms of Service</h1>
          <p className="text-sm font-mono text-gray-500">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        <div className="bg-[#0a0a0a] border border-gray-800 p-8 space-y-10">
          <section className="space-y-3">
            <h2 className="text-2xl font-bodax tracking-wide text-white uppercase">1. Acceptance of Terms</h2>
            <p className="text-gray-300 font-mono text-sm leading-relaxed">
              By accessing and using the Bodax Masters tournament platform ("Service"), you accept and agree to be bound by these terms. If you do not agree, do not use the Service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bodax tracking-wide text-white uppercase">2. Description of Service</h2>
            <div className="text-gray-300 space-y-3 font-mono text-sm leading-relaxed">
              <p>Bodax Masters provides a tournament management platform for Valorant competitions, including:</p>
              <ul className="list-disc list-inside space-y-1 pl-1">
                <li>Tournament registration and management</li>
                <li>Team creation and management</li>
                <li>Match scheduling and results tracking</li>
                <li>Bracket generation and management</li>
                <li>Communication tools for participants</li>
                <li>Prize distribution management</li>
              </ul>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bodax tracking-wide text-white uppercase">3. User Accounts</h2>
            <div className="text-gray-300 space-y-3 font-mono text-sm leading-relaxed">
              <p>To use certain features of the Service, you must create an account. You agree to:</p>
              <ul className="list-disc list-inside space-y-1 pl-1">
                <li>Provide accurate and complete information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Notify us immediately of any unauthorized use</li>
                <li>Accept responsibility for all activities under your account</li>
                <li>Be at least 13 years old to create an account</li>
              </ul>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bodax tracking-wide text-white uppercase">4. Tournament Rules and Fair Play</h2>
            <div className="text-gray-300 space-y-3 font-mono text-sm leading-relaxed">
              <p>All participants must adhere to the following rules:</p>
              <ul className="list-disc list-inside space-y-1 pl-1">
                <li>Follow Valorant's Terms of Service and Community Guidelines</li>
                <li>Maintain fair play and sportsmanship</li>
                <li>Not use cheats, hacks, or unauthorized software</li>
                <li>Respect other players and tournament officials</li>
                <li>Follow tournament-specific rules and schedules</li>
                <li>Accept tournament decisions as final</li>
              </ul>
              <p>Violation of these rules may result in disqualification and account suspension.</p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bodax tracking-wide text-white uppercase">5. Team Management</h2>
            <div className="text-gray-300 space-y-3 font-mono text-sm leading-relaxed">
              <p>Team captains and members agree to:</p>
              <ul className="list-disc list-inside space-y-1 pl-1">
                <li>Ensure all team members meet eligibility requirements</li>
                <li>Maintain accurate team rosters</li>
                <li>Communicate tournament information to team members</li>
                <li>Represent the team in official communications</li>
                <li>Ensure team compliance with all rules and regulations</li>
              </ul>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bodax tracking-wide text-white uppercase">6. Prize Distribution</h2>
            <div className="text-gray-300 space-y-3 font-mono text-sm leading-relaxed">
              <p>Prize distribution is subject to the following terms:</p>
              <ul className="list-disc list-inside space-y-1 pl-1">
                <li>Prizes are awarded to winning teams as specified in tournament details</li>
                <li>Prize distribution is the responsibility of team captains</li>
                <li>We are not responsible for internal team prize distribution</li>
                <li>Prizes may be subject to taxation in your jurisdiction</li>
                <li>Disqualification may result in forfeiture of prizes</li>
              </ul>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bodax tracking-wide text-white uppercase">7. Intellectual Property</h2>
            <div className="text-gray-300 space-y-3 font-mono text-sm leading-relaxed">
              <p>You retain ownership of your content, but grant us a license to:</p>
              <ul className="list-disc list-inside space-y-1 pl-1">
                <li>Use your content to provide the Service</li>
                <li>Display tournament results and statistics</li>
                <li>Promote tournaments and the platform</li>
                <li>Improve our services</li>
              </ul>
              <p>We retain all rights to the platform, including design, code, and branding.</p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bodax tracking-wide text-white uppercase">8. Prohibited Activities</h2>
            <div className="text-gray-300 space-y-3 font-mono text-sm leading-relaxed">
              <p>You agree not to:</p>
              <ul className="list-disc list-inside space-y-1 pl-1">
                <li>Use the Service for illegal purposes</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Interfere with the Service or other users</li>
                <li>Harass, abuse, or harm other users</li>
                <li>Share inappropriate or offensive content</li>
                <li>Attempt to manipulate tournament results</li>
                <li>Use automated tools or bots</li>
              </ul>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bodax tracking-wide text-white uppercase">9. Disclaimers and Limitations</h2>
            <div className="text-gray-300 space-y-3 font-mono text-sm leading-relaxed">
              <p>The Service is provided "as is" without warranties. We are not responsible for:</p>
              <ul className="list-disc list-inside space-y-1 pl-1">
                <li>Technical issues during matches</li>
                <li>Disputes between team members</li>
                <li>External factors affecting gameplay</li>
                <li>Loss of data or account access</li>
                <li>Third-party services or integrations</li>
              </ul>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bodax tracking-wide text-white uppercase">10. Termination</h2>
            <div className="text-gray-300 space-y-3 font-mono text-sm leading-relaxed">
              <p>We may terminate or suspend your account at any time for:</p>
              <ul className="list-disc list-inside space-y-1 pl-1">
                <li>Violation of these terms</li>
                <li>Fraudulent or abusive behavior</li>
                <li>Extended periods of inactivity</li>
                <li>At our sole discretion with reasonable cause</li>
              </ul>
              <p>You may terminate your account at any time by contacting us.</p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bodax tracking-wide text-white uppercase">11. Changes to Terms</h2>
            <p className="text-gray-300 font-mono text-sm leading-relaxed">
              We reserve the right to modify these terms at any time. Changes are effective immediately upon posting. Your continued use of the Service constitutes acceptance of the modified terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bodax tracking-wide text-white uppercase">12. Contact Information</h2>
            <div className="text-gray-300 space-y-3 font-mono text-sm leading-relaxed">
              <p>For questions about these Terms of Service, please contact us:</p>
              <div className="bg-black/40 border border-red-900/40 p-4">
                <p><strong>Email:</strong> legal@bodax.dev</p>
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

export default TermsOfService; 