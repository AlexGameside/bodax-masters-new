import { Link } from 'react-router-dom';
import { Trophy, Users } from 'lucide-react';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans relative overflow-hidden">
      
      {/* Hero Section */}
      <section className="relative py-28 sm:py-44 flex flex-col items-center justify-center text-center px-4 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,0,76,0.08),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(0,178,255,0.08),transparent_35%)] pointer-events-none" />
        <div className="max-w-6xl mx-auto z-10">
          <p className="text-sm uppercase tracking-[0.35em] text-red-500 font-mono mb-6">Bodax Masters Platform</p>
          <div className="text-5xl sm:text-7xl lg:text-8xl font-bold font-bodax tracking-wider text-white mb-4">
            Host. Compete. Win.
          </div>
          <p className="text-lg sm:text-2xl font-mono text-gray-300 max-w-3xl mx-auto mb-12">
            We run Bodax-led events and give organizers the same tools to launch, manage, and broadcast tournaments. Single elim, double elim, BO1 to BO3 finals — all in one sharp, Bodax-styled experience.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center">
            <Link 
              to="/tournaments" 
              className="bg-red-600 hover:bg-red-700 text-white py-4 px-10 font-bodax text-xl uppercase tracking-wider transition-all duration-300 border border-red-800 hover:border-red-500"
            >
              View Tournaments
            </Link>
            <Link 
              to="/register" 
              className="bg-transparent hover:bg-white/5 text-white py-4 px-10 font-bodax text-xl uppercase tracking-wider transition-all duration-300 border border-gray-700 hover:border-gray-500"
            >
              Create Account
            </Link>
            <Link
              to="/tournaments/create"
              className="bg-[#0a0a0a] hover:bg-black text-red-400 hover:text-white py-4 px-10 font-bodax text-xl uppercase tracking-wider transition-all duration-300 border border-red-900 hover:border-red-600"
            >
              Host A Tournament
            </Link>
          </div>
        </div>
      </section>

      {/* Platform Value */}
      <section className="py-16 border-t border-gray-900 bg-[#080808]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 mb-12">
            <h3 className="text-4xl font-bodax tracking-widest text-white uppercase">
              <span className="text-red-600">/</span> Built For Competition
            </h3>
            <p className="text-gray-400 font-mono max-w-2xl">
              Bodax Masters is a tournament control room: bracket engines, ready-checks, map veto, scheduling, and dispute handling — all skinned in the Bodax look.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-[#0a0a0a] border border-gray-800 hover:border-red-800 transition-colors p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gray-900 flex items-center justify-center border border-red-900">
                  <Trophy className="w-6 h-6 text-red-500" />
                </div>
                <span className="font-bodax text-2xl tracking-wide">Tournament Core</span>
              </div>
              <ul className="space-y-2 text-gray-400 font-mono text-sm leading-relaxed">
                <li>Single & Double Elim with BO1 → BO3 finals</li>
                <li>Live bracket updates and match hubs</li>
                <li>Automated map veto + side selection</li>
              </ul>
            </div>

            <div className="bg-[#0a0a0a] border border-gray-800 hover:border-red-800 transition-colors p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gray-900 flex items-center justify-center border border-red-900">
                  <Users className="w-6 h-6 text-red-500" />
                </div>
                <span className="font-bodax text-2xl tracking-wide">Teams & Players</span>
              </div>
              <ul className="space-y-2 text-gray-400 font-mono text-sm leading-relaxed">
                <li>Ready-up flows, roster checks, subs</li>
                <li>Match chat, scheduling, and admin tickets</li>
                <li>Clear status for captains and staff</li>
              </ul>
            </div>

            <div className="bg-[#0a0a0a] border border-gray-800 hover:border-red-800 transition-colors p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gray-900 flex items-center justify-center border border-red-900">
                  <div className="font-bodax text-xl text-red-500">/</div>
                </div>
                <span className="font-bodax text-2xl tracking-wide">For Organizers</span>
              </div>
              <ul className="space-y-2 text-gray-400 font-mono text-sm leading-relaxed">
                <li>Custom branding with Bodax styling</li>
                <li>Admin controls for reschedules & rulings</li>
                <li>Launch events in minutes with presets</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-18 border-t border-gray-900 bg-[#050505]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h3 className="text-4xl font-bodax tracking-wider text-white uppercase mb-4">Run Events, Bodax Style</h3>
            <p className="text-gray-400 font-mono max-w-3xl mx-auto">
              A streamlined flow for both players and staff — no fluff, just the essentials to get teams playing fast.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="bg-[#0a0a0a] border border-gray-800 p-8">
              <div className="text-red-500 font-bodax text-3xl mb-4">01</div>
              <h4 className="text-2xl font-bodax uppercase tracking-wide mb-3">Create or Join</h4>
              <p className="text-gray-400 font-mono text-sm">Spin up a bracket or join an open event. Configure formats, match lengths, and admin roles.</p>
            </div>
            <div className="bg-[#0a0a0a] border border-gray-800 p-8">
              <div className="text-red-500 font-bodax text-3xl mb-4">02</div>
              <h4 className="text-2xl font-bodax uppercase tracking-wide mb-3">Lock Teams In</h4>
              <p className="text-gray-400 font-mono text-sm">Ready checks, roster confirmations, and map bans keep everyone synced before each match.</p>
            </div>
            <div className="bg-[#0a0a0a] border border-gray-800 p-8">
              <div className="text-red-500 font-bodax text-3xl mb-4">03</div>
              <h4 className="text-2xl font-bodax uppercase tracking-wide mb-3">Play & Advance</h4>
              <p className="text-gray-400 font-mono text-sm">Real-time bracket updates, BO1 to BO3 finals, dispute handling, and result submission.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 border-t border-gray-900 bg-[#080808]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-4xl font-bodax tracking-wider text-white uppercase mb-4">Ready to host or play?</h3>
          <p className="text-gray-400 font-mono max-w-3xl mx-auto mb-10">
            Bodax Masters is open for organizers, teams, and players. Bring your bracket, your community, and we’ll handle the tournament flow.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center">
            <Link to="/tournaments" className="bg-red-600 hover:bg-red-700 text-white py-4 px-10 font-bodax text-xl uppercase tracking-wider transition-all duration-300">
              Explore Events
            </Link>
            <Link to="/tournaments/create" className="bg-transparent hover:bg-white/5 text-white py-4 px-10 font-bodax text-xl uppercase tracking-wider transition-all duration-300 border border-gray-700 hover:border-gray-500">
              Start Hosting
            </Link>
          </div>
        </div>
      </section>
      
    </div>
  );
};

export default LandingPage;