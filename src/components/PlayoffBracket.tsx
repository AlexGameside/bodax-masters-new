import React, { useState } from 'react';
import type { Match, Team, Tournament } from '../types/tournament';

interface PlayoffBracketProps {
  tournament: Tournament;
  matches: Match[];
  teams: Team[];
  onUpdate: () => void;
}

const PlayoffBracket: React.FC<PlayoffBracketProps> = ({
  tournament,
  matches,
  teams,
  onUpdate
}) => {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  const playoffMatches = matches.filter(m => m.tournamentType === 'playoff');
  const swissStage = tournament.stageManagement?.swissStage;
  const playoffStage = tournament.stageManagement?.playoffStage;
  
  // Check if playoffs are active (new system) or legacy teams advancing
  const hasActivePlayoffs = playoffStage?.isActive || (swissStage?.teamsAdvancingToPlayoffs && swissStage.teamsAdvancingToPlayoffs.length > 0);
  
  console.log('🏆 PlayoffBracket Debug:');
  console.log('  - Total matches passed:', matches.length);
  console.log('  - Playoff matches found:', playoffMatches.length);
  console.log('  - Playoff stage data:', playoffStage);
  console.log('  - Swiss stage data:', swissStage);
  console.log('  - Teams advancing (legacy):', swissStage?.teamsAdvancingToPlayoffs);
  console.log('  - hasActivePlayoffs:', hasActivePlayoffs);
  
  if (!hasActivePlayoffs) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-2xl font-bold text-white mb-4">Playoff Bracket</h2>
        <div className="text-gray-400 text-center py-8">
          Playoff bracket will be available after Swiss rounds are completed.
          <br />
          <span className="text-blue-400">
            Top {tournament.format.swissConfig?.teamsAdvanceToPlayoffs || 8} teams will advance.
          </span>
        </div>
      </div>
    );
  }

  const getTeamName = (teamId: string | null) => {
    if (!teamId || teamId === 'BYE') return 'TBD';
    const team = teams.find(t => t.id === teamId);
    return team?.name || 'Unknown Team';
  };

  const getMatchStatus = (match: Match) => {
    switch (match.matchState) {
      case 'completed':
        return { status: 'completed', color: 'bg-green-600', text: 'Completed' };
      case 'playing':
        return { status: 'playing', color: 'bg-blue-600', text: 'In Progress' };
      case 'scheduled':
        return { status: 'scheduled', color: 'bg-yellow-600', text: 'Scheduled' };
      case 'ready_up':
        return { status: 'ready', color: 'bg-purple-600', text: 'Ready Up' };
      default:
        return { status: 'pending', color: 'bg-gray-600', text: 'Pending' };
    }
  };

  const formatDateTime = (date: Date | string | any | undefined) => {
    if (!date) return 'TBD';
    
    try {
      let dateObj: Date;
      
      // Handle Firestore Timestamp objects
      if (date && typeof date === 'object' && date.seconds !== undefined) {
        dateObj = new Date(date.seconds * 1000);
      } else if (typeof date === 'string') {
        dateObj = new Date(date);
      } else if (date instanceof Date) {
        dateObj = date;
      } else {

        return 'TBD';
      }
      
      // Check if the date is valid
      if (isNaN(dateObj.getTime())) {

        return 'TBD';
      }
      
      return new Intl.DateTimeFormat('de-DE', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Berlin'
      }).format(dateObj);
    } catch (error) {

      return 'TBD';
    }
  };

  const getMatchDisplay = (match: Match, isFinal = false) => {
    const status = getMatchStatus(match);
    const team1Name = getTeamName(match.team1Id);
    const team2Name = getTeamName(match.team2Id);
    
    return (
      <div 
        key={match.id}
        className={`${
          isFinal 
            ? 'bg-gradient-to-br from-yellow-900/30 to-orange-900/30 border-2 border-yellow-500/50' 
            : 'bg-gray-800/50 border border-gray-600/50'
        } rounded-xl p-6 cursor-pointer hover:scale-105 transition-all duration-200 min-w-[280px] ${
          selectedMatch?.id === match.id ? 'ring-2 ring-cyan-500 shadow-lg' : ''
        }`}
        onClick={() => setSelectedMatch(match)}
      >
        <div className="flex items-center justify-between mb-4">
          <div className={`text-sm font-medium ${isFinal ? 'text-yellow-400' : 'text-gray-400'}`}>
            {isFinal ? '🏆 GRAND FINAL' : `Match #${match.matchNumber}`}
          </div>
          <span className={`text-xs px-3 py-1 rounded-full font-medium ${status.color} text-white`}>
            {status.text}
          </span>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className={`font-semibold text-lg truncate max-w-[180px] ${match.winnerId === match.team1Id ? 'text-green-400' : 'text-white'}`} title={team1Name}>
              {team1Name}
            </div>
            <div className={`text-4xl font-bold ml-3 ${isFinal ? 'text-yellow-400' : 'text-blue-400'}`}>
              {match.team1Score}
            </div>
          </div>
          
          <div className="flex items-center justify-center">
            <div className="text-gray-500 text-sm font-medium">VS</div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className={`font-semibold text-lg truncate max-w-[180px] ${match.winnerId === match.team2Id ? 'text-green-400' : 'text-white'}`} title={team2Name}>
              {team2Name}
            </div>
            <div className={`text-4xl font-bold ml-3 ${isFinal ? 'text-yellow-400' : 'text-red-400'}`}>
              {match.team2Score}
            </div>
          </div>
        </div>
        
        {match.scheduledTime && (
          <div className="mt-5 pt-4 border-t border-gray-600/50">
            <div className="text-gray-400 text-xs">Scheduled:</div>
            <div className="text-white text-sm font-medium">{formatDateTime(match.scheduledTime)}</div>
          </div>
        )}
        
        {match.winnerId && (
          <div className="mt-5 pt-4 border-t border-gray-600/50">
            <div className="text-center">
              <div className="text-green-400 font-bold text-sm flex items-center justify-center space-x-1">
                <span>🏆</span>
                <span className="truncate" title={getTeamName(match.winnerId)}>Winner: {getTeamName(match.winnerId)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const getBracketStructure = () => {
    // Use playoff stage teams or fallback to legacy teams advancing
    const teamsCount = (playoffStage as any)?.teams?.length || swissStage?.teamsAdvancingToPlayoffs?.length || 8;
    const rounds = Math.ceil(Math.log2(teamsCount));
    const bracketStructure: { round: number; matches: Match[] }[] = [];
    
    for (let round = 1; round <= rounds; round++) {
      const roundMatches = playoffMatches.filter(m => m.round === round);
      bracketStructure.push({ round, matches: roundMatches });
    }
    
    return bracketStructure;
  };

  const bracketStructure = getBracketStructure();

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700">
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <h2 className="text-2xl font-bold text-white mb-2">Playoff Bracket</h2>
        <div className="text-gray-400">
          {tournament.format.knockoutStage?.type || 'Single Elimination'} • 
          {(playoffStage as any)?.teams?.length || swissStage?.teamsAdvancingToPlayoffs?.length || 8} Teams from Swiss Rounds
        </div>
      </div>

      {/* Bracket Display */}
      <div className="p-6">
        <div className="flex justify-center">
          <div className="flex items-center gap-12 overflow-x-auto pb-4">
            {/* Quarter Finals */}
            <div className="flex-shrink-0">
              <div className="text-center text-gray-400 font-bold mb-6 text-sm uppercase tracking-wider">
                Quarter Finals
              </div>
              <div className="space-y-8">
                {playoffMatches.filter(m => m.round === 1).map((match, index) => (
                  <div key={match.id} className="relative">
                    {getMatchDisplay(match)}
                    {/* Connection lines to semifinals */}
                    <div className="absolute top-1/2 -right-6 w-12 h-px bg-gray-600 transform -translate-y-1/2"></div>
                    {/* Vertical connector */}
                    <div className={`absolute -right-6 w-px bg-gray-600 ${
                      index === 0 ? 'top-1/2 h-8' : 
                      index === 1 ? 'bottom-1/2 h-8' :
                      index === 2 ? 'top-1/2 h-8' :
                      'bottom-1/2 h-8'
                    }`}></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Semifinals */}
            <div className="flex-shrink-0">
              <div className="text-center text-gray-400 font-bold mb-6 text-sm uppercase tracking-wider">
                Semifinals
              </div>
              <div className="space-y-16">
                {playoffMatches.filter(m => m.round === 2).map((match, index) => (
                  <div key={match.id} className="relative">
                    {getMatchDisplay(match)}
                    {/* Connection line to final */}
                    <div className="absolute top-1/2 -right-6 w-12 h-px bg-gray-600 transform -translate-y-1/2"></div>
                    {/* Vertical connector to final */}
                    <div className={`absolute -right-6 w-px bg-gray-600 ${
                      index === 0 ? 'top-1/2 h-16' : 'bottom-1/2 h-16'
                    }`}></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Grand Final */}
            <div className="flex-shrink-0">
              <div className="text-center text-gray-400 font-bold mb-6 text-sm uppercase tracking-wider">
                Grand Final
              </div>
              <div className="space-y-6">
                {playoffMatches.filter(m => m.round === 3).map((match) => (
                  <div key={match.id} className="relative">
                    {getMatchDisplay(match, true)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Match Details */}
      {selectedMatch && (
        <div className="p-6 border-t border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-white">
              Match Details - #{selectedMatch.matchNumber}
            </h3>
            <button
              onClick={() => setSelectedMatch(null)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-700 rounded-lg p-4">
              <h4 className="text-white font-medium mb-3">Match Information</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Status:</span>
                  <span className={`${getMatchStatus(selectedMatch).color} text-white px-2 py-1 rounded text-xs`}>
                    {getMatchStatus(selectedMatch).text}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Round:</span>
                  <span className="text-white">{selectedMatch.round}</span>
                </div>
                {selectedMatch.bracketType && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Bracket:</span>
                    <span className="text-white capitalize">{selectedMatch.bracketType}</span>
                  </div>
                )}
                {selectedMatch.scheduledTime && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Scheduled:</span>
                    <span className="text-white">{formatDateTime(selectedMatch.scheduledTime)}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="bg-gray-700 rounded-lg p-4">
              <h4 className="text-white font-medium mb-3">Teams</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-white font-medium">
                    {getTeamName(selectedMatch.team1Id)}
                  </div>
                  <div className="text-2xl font-bold text-blue-400">
                    {selectedMatch.team1Score}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="text-white font-medium">
                    {getTeamName(selectedMatch.team2Id)}
                  </div>
                  <div className="text-2xl font-bold text-red-400">
                    {selectedMatch.team2Score}
                  </div>
                </div>
                
                {selectedMatch.winnerId && (
                  <div className="mt-3 pt-3 border-t border-gray-600">
                    <div className="text-green-400 font-medium text-center">
                      🏆 Winner: {getTeamName(selectedMatch.winnerId)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="p-6 bg-gray-700 border-t border-gray-600">
        <div className="text-gray-300 text-sm">
          <div className="font-medium mb-2">Playoff Bracket:</div>
          <ul className="space-y-1 text-xs">
            <li>• Top teams from Swiss rounds advance to playoffs</li>
            <li>• Single elimination bracket format</li>
            <li>• Winners advance to next round</li>
            <li>• Final winner becomes tournament champion</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PlayoffBracket; 