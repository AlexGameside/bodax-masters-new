import React from 'react';
import { Shield, Users, Clock, Trophy, AlertTriangle, CheckCircle, X, Info } from 'lucide-react';

const TournamentRules = () => {
  return (
    <div className="min-h-screen bg-black text-white font-mono relative overflow-hidden">
      {/* Subtle grid/code background */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-10" style={{backgroundImage: 'repeating-linear-gradient(0deg, #fff1 0 1px, transparent 1px 40px), repeating-linear-gradient(90deg, #fff1 0 1px, transparent 1px 40px)'}} />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-0">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Shield className="w-8 h-8 text-red-400" />
            <h1 className="text-4xl font-bold text-white">Tournament Rules</h1>
            <Shield className="w-8 h-8 text-red-400" />
          </div>
          <p className="text-gray-300 text-lg">Official rules and regulations for Bodax Masters Valorant Tournament</p>
        </div>

        {/* Rules Sections */}
        <div className="space-y-8">
          {/* Team Registration Rules */}
          <div className="bg-black/60 border border-gray-700 rounded-xl p-6 shadow-lg">
            <div className="flex items-center space-x-3 mb-4">
              <Users className="w-6 h-6 text-red-400" />
              <h2 className="text-2xl font-bold text-white">Team Registration Rules</h2>
            </div>
            <div className="space-y-4 text-gray-300">
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="text-white">Team Size:</strong> Each team must have exactly 5 active players and up to 2 substitutes (7 total players maximum).
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="text-white">Team Naming Convention:</strong> Teams must follow the format: <span className="text-red-400 font-mono">"Team Name (TAG)"</span>. Example: <span className="text-red-400 font-mono">"Sentinels TenZ (SEN)"</span> or <span className="text-red-400 font-mono">"Cloud9 (C9)"</span>.
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="text-white">Riot ID Requirements:</strong> All players must use Riot IDs that match their team format for screenshot verification. Example: If your team is <span className="text-red-400 font-mono">"Sentinels TenZ (SEN)"</span>, your Riot ID must be <span className="text-red-400 font-mono">"SEN TenZ"</span>.
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="text-white">Player Registration:</strong> All players must provide valid Riot ID and Discord username during registration.
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="text-white">Team Captain:</strong> Each team must designate one captain who will be responsible for communication and match coordination.
                </div>
              </div>
            </div>
          </div>

          {/* Match Rules */}
          <div className="bg-black/60 border border-gray-700 rounded-xl p-6 shadow-lg">
            <div className="flex items-center space-x-3 mb-4">
              <Clock className="w-6 h-6 text-red-400" />
              <h2 className="text-2xl font-bold text-white">Match Rules</h2>
            </div>
            <div className="space-y-4 text-gray-300">
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="text-white">Match Format:</strong> Best of 1 (BO1) for all matches. Single elimination format for finals.
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="text-white">Map Pool:</strong> Ascent, Icebox, Sunset, Haven, Lotus, Pearl, Split.
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="text-white">Map Selection:</strong> Teams will participate in map banning phase. Loser's pick format.
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="text-white">Side Selection:</strong> Teams will choose their starting side (Attack/Defense) through side selection phase.
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="text-white">Ready Up:</strong> Teams must ready up within 10 minutes of match start time or forfeit.
                </div>
              </div>
            </div>
          </div>

          {/* Fair Play Rules */}
          <div className="bg-black/60 border border-gray-700 rounded-xl p-6 shadow-lg">
            <div className="flex items-center space-x-3 mb-4">
              <Shield className="w-6 h-6 text-red-400" />
              <h2 className="text-2xl font-bold text-white">Fair Play & Anti-Cheat</h2>
            </div>
            <div className="space-y-4 text-gray-300">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="text-white">Anti-Cheat:</strong> Vanguard must be running. Any detection of cheating will result in immediate disqualification.
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="text-white">Account Sharing:</strong> Players must use their own accounts. Account sharing is strictly prohibited.
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="text-white">Communication:</strong> Teams must use the provided Discord channels for match communication.
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="text-white">Stream Sniping:</strong> Watching opponent streams during matches is prohibited and will result in disqualification.
                </div>
              </div>
            </div>
          </div>

          {/* Technical Rules */}
          <div className="bg-black/60 border border-gray-700 rounded-xl p-6 shadow-lg">
            <div className="flex items-center space-x-3 mb-4">
              <Info className="w-6 h-6 text-red-400" />
              <h2 className="text-2xl font-bold text-white">Technical Requirements</h2>
            </div>
            <div className="space-y-4 text-gray-300">
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="text-white">Game Version:</strong> Latest version of Valorant must be installed and updated.
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="text-white">Connection:</strong> Stable internet connection required. Disconnections may result in match forfeit.
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="text-white">Discord:</strong> All players must be in the tournament Discord server and available for communication.
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="text-white">Screenshots:</strong> Teams must provide screenshots of match results when requested by admins.
                </div>
              </div>
            </div>
          </div>

          {/* Prize Distribution */}
          <div className="bg-black/60 border border-gray-700 rounded-xl p-6 shadow-lg">
            <div className="flex items-center space-x-3 mb-4">
              <Trophy className="w-6 h-6 text-red-400" />
              <h2 className="text-2xl font-bold text-white">Prize Distribution</h2>
            </div>
            <div className="space-y-4 text-gray-300">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-red-900/20 border border-red-700 rounded-lg">
                  <div className="text-2xl font-bold text-red-400">€150</div>
                  <div className="text-white font-medium">1st Place</div>
                </div>
                <div className="text-center p-4 bg-gray-800/20 border border-gray-600 rounded-lg">
                  <div className="text-2xl font-bold text-gray-400">€100</div>
                  <div className="text-white font-medium">2nd Place</div>
                </div>
                <div className="text-center p-4 bg-amber-900/20 border border-amber-700 rounded-lg">
                  <div className="text-2xl font-bold text-amber-400">€50</div>
                  <div className="text-white font-medium">3rd Place</div>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="text-white">Payment:</strong> Prizes will be distributed via PayPal or bank transfer within 30 days of tournament completion.
                </div>
              </div>
            </div>
          </div>

          {/* Disqualification Rules */}
          <div className="bg-black/60 border border-red-700 rounded-xl p-6 shadow-lg">
            <div className="flex items-center space-x-3 mb-4">
              <X className="w-6 h-6 text-red-400" />
              <h2 className="text-2xl font-bold text-white">Disqualification & Penalties</h2>
            </div>
            <div className="space-y-4 text-gray-300">
              <div className="flex items-start space-x-3">
                <X className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="text-white">Immediate Disqualification:</strong> Cheating, account sharing, stream sniping, or any form of unfair advantage.
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <X className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="text-white">Match Forfeit:</strong> Not readying up within time limit, excessive disconnections, or failure to show up.
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <X className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="text-white">Behavior:</strong> Toxic behavior, harassment, or violation of Discord community guidelines.
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <X className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="text-white">Appeal Process:</strong> Disqualified teams may appeal within 24 hours. Final decision rests with tournament admins.
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-black/60 border border-gray-700 rounded-xl p-6 shadow-lg">
            <div className="flex items-center space-x-3 mb-4">
              <Info className="w-6 h-6 text-red-400" />
              <h2 className="text-2xl font-bold text-white">Discord Integration & Support</h2>
            </div>
            <div className="space-y-4 text-gray-300">
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="text-white">Discord Account Linking:</strong> All participants must link their Discord account to receive tournament notifications, match reminders, and important updates.
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="text-white">Tournament Discord Server:</strong> Join our official Discord server for tournament communication, match coordination, and community support.
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="text-white">Support:</strong> For questions, technical issues, or rule clarifications, contact tournament admins through Discord or email.
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="text-white">Email:</strong> support@bodaxmasters.com
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TournamentRules; 