import React, { useState } from 'react';
import { Trophy, Users, Calendar, History, Settings, BarChart3 } from 'lucide-react';
import SwissStandings from './SwissStandings';
import MatchdayManagement from './MatchdayManagement';
import MatchdayHistory from './MatchdayHistory';
import SwissRoundManagement from './SwissRoundManagement';
import type { Tournament, Match, Team } from '../types/tournament';

interface SwissTournamentDashboardProps {
  tournament: Tournament;
  matches: Match[];
  teams: Team[];
  onUpdate: () => void;
}

type DashboardTab = 'standings' | 'rounds' | 'management' | 'history';

const SwissTournamentDashboard: React.FC<SwissTournamentDashboardProps> = ({
  tournament,
  matches,
  teams,
  onUpdate
}) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('standings');

  const swissStage = tournament.stageManagement?.swissStage;
  const currentRound = swissStage?.currentRound || 1;
  const totalRounds = swissStage?.totalRounds || 5;
  const currentMatchday = swissStage?.currentMatchday || 1;
  const teamsAdvancingToPlayoffs = swissStage?.teamsAdvancingToPlayoffs?.length || 8;

  const getTabIcon = (tab: DashboardTab) => {
    switch (tab) {
      case 'standings':
        return <BarChart3 className="w-5 h-5" />;
      case 'rounds':
        return <Trophy className="w-5 h-5" />;
      case 'management':
        return <Settings className="w-5 h-5" />;
      case 'history':
        return <History className="w-5 h-5" />;
      default:
        return <Trophy className="w-5 h-5" />;
    }
  };

  const getTabLabel = (tab: DashboardTab) => {
    switch (tab) {
      case 'standings':
        return 'Standings';
      case 'rounds':
        return 'Round Control';
      case 'management':
        return 'Matchday Management';
      case 'history':
        return 'Match History';
      default:
        return 'Tournament';
    }
  };

  const getTabDescription = (tab: DashboardTab) => {
    switch (tab) {
      case 'standings':
        return 'Current Swiss system standings with tiebreakers';
      case 'rounds':
        return 'Manually control round progression and seeding';
      case 'management':
        return 'Manage matchdays and match scheduling';
      case 'history':
        return 'Complete match history for all rounds';
      default:
        return 'Tournament overview and management';
    }
  };

  return (
    <div className="space-y-6">
      {/* Tournament Header */}
      <div className="bg-gradient-to-r from-cyan-900/40 to-blue-900/40 rounded-xl border border-cyan-400/30 backdrop-blur-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{tournament.name}</h1>
            <p className="text-cyan-200">{tournament.description}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-cyan-400">{currentRound}/{totalRounds}</div>
            <div className="text-cyan-200 text-sm">Rounds</div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-black/40 border border-cyan-400/20 rounded-lg p-4">
            <div className="flex items-center gap-2 text-cyan-200 text-sm mb-1">
              <Users className="w-4 h-4" />
              Teams
            </div>
            <div className="text-2xl font-bold text-white">{teams.length}</div>
          </div>
          
          <div className="bg-black/40 border border-cyan-400/20 rounded-lg p-4">
            <div className="flex items-center gap-2 text-cyan-200 text-sm mb-1">
              <Calendar className="w-4 h-4" />
              Current Matchday
            </div>
            <div className="text-2xl font-bold text-white">{currentMatchday}</div>
          </div>
          
          <div className="bg-black/40 border border-cyan-400/20 rounded-lg p-4">
            <div className="flex items-center gap-2 text-cyan-200 text-sm mb-1">
              <Trophy className="w-4 h-4" />
              Playoff Spots
            </div>
            <div className="text-2xl font-bold text-white">{teamsAdvancingToPlayoffs}</div>
          </div>
          
          <div className="bg-black/40 border border-cyan-400/20 rounded-lg p-4">
            <div className="flex items-center gap-2 text-cyan-200 text-sm mb-1">
              <BarChart3 className="w-4 h-4" />
              Progress
            </div>
            <div className="text-2xl font-bold text-white">
              {Math.round((currentRound / totalRounds) * 100)}%
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-black/60 rounded-xl border border-cyan-400/30 backdrop-blur-sm">
        <div className="flex border-b border-cyan-400/30">
          {(['standings', 'management', 'history'] as DashboardTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-all duration-200 ${
                activeTab === tab
                  ? 'text-cyan-200 border-b-2 border-cyan-400 bg-cyan-400/10'
                  : 'text-gray-400 hover:text-cyan-200 hover:bg-cyan-400/5'
              }`}
            >
              {getTabIcon(tab)}
              {getTabLabel(tab)}
            </button>
          ))}
        </div>
        
        <div className="p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-white mb-2">
              {getTabLabel(activeTab)}
            </h2>
            <p className="text-cyan-200 text-sm">
              {getTabDescription(activeTab)}
            </p>
          </div>
          
          {/* Tab Content */}
          {activeTab === 'standings' && (
            <SwissStandings
              standings={swissStage?.standings || []}
              teams={teams}
              currentRound={currentRound}
              totalRounds={totalRounds}
              teamsAdvancingToPlayoffs={teamsAdvancingToPlayoffs}
            />
          )}
          
          {activeTab === 'rounds' && (
            <SwissRoundManagement
              tournament={tournament}
              onRoundGenerated={onUpdate}
            />
          )}
          
          {activeTab === 'management' && (
            <MatchdayManagement
              tournament={tournament}
              matches={matches}
              onUpdate={onUpdate}
            />
          )}
          
          {activeTab === 'history' && (
            <MatchdayHistory
              tournament={tournament}
              matches={matches}
              teams={teams}
              onUpdate={onUpdate}
            />
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-black/60 rounded-xl border border-cyan-400/30 backdrop-blur-sm p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button
            onClick={() => setActiveTab('rounds')}
            className="bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-lg transition-colors flex items-center gap-3"
          >
            <Trophy className="w-5 h-5" />
            <div className="text-left">
              <div className="font-medium">Control Rounds</div>
              <div className="text-sm text-purple-200">Generate next round manually</div>
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('management')}
            className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg transition-colors flex items-center gap-3"
          >
            <Settings className="w-5 h-5" />
            <div className="text-left">
              <div className="font-medium">Manage Matchday</div>
              <div className="text-sm text-blue-200">Schedule matches & advance rounds</div>
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('history')}
            className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-lg transition-colors flex items-center gap-3"
          >
            <History className="w-5 h-5" />
            <div className="text-left">
              <div className="font-medium">View History</div>
              <div className="text-sm text-green-200">See match results & progress</div>
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('standings')}
            className="bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-lg transition-colors flex items-center gap-3"
          >
            <BarChart3 className="w-5 h-5" />
            <div className="text-left">
              <div className="font-medium">Check Standings</div>
              <div className="text-sm text-purple-200">Current rankings & tiebreakers</div>
            </div>
          </button>
        </div>
      </div>

      {/* Swiss System Explanation */}
      <div className="bg-black/60 rounded-xl border border-cyan-400/30 backdrop-blur-sm p-6">
        <h3 className="text-lg font-semibold text-white mb-4">How Swiss System Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-300">
          <div>
            <h4 className="font-medium text-cyan-200 mb-2">Tournament Structure</h4>
            <ul className="space-y-1">
              <li>• {teams.length} teams compete in {totalRounds} rounds</li>
              <li>• Each round is a matchday with 7-day scheduling window</li>
              <li>• Teams are paired based on similar performance</li>
              <li>• <strong>Rounds advance manually</strong> - admin controls progression</li>
              <li>• Top {teamsAdvancingToPlayoffs} teams advance to playoffs</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-cyan-200 mb-2">Scoring & Tiebreakers</h4>
            <ul className="space-y-1">
              <li>• 3 points for match win, 0 for loss</li>
              <li>• Tiebreakers: Match wins → Game wins → Rounds differential</li>
              <li>• Buchholz score (opponents' strength)</li>
              <li>• No rematches in subsequent rounds</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SwissTournamentDashboard;
