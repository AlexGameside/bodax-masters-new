import React, { useState } from 'react';
import type { Match, Team, Tournament, User } from '../types/tournament';
import { ArrowRight, RotateCcw, ArrowRightLeft, X, Plus } from 'lucide-react';
import { adminResetMatchToPreVeto, adminMoveTeamBetweenMatches, adminRemoveTeamFromMatch, adminAddTeamToMatch } from '../services/firebaseService';
import { toast } from 'react-hot-toast';

interface DoubleEliminationBracketProps {
  tournament: Tournament;
  matches: Match[];
  teams: Team[];
  variant?: 'embedded' | 'fullscreen';
  isAdmin?: boolean;
  currentUser?: User | null;
  onUpdate?: () => void;
}

const getTeamName = (teams: Team[], teamId: string | null | undefined) => {
  if (!teamId) return 'TBD';
  const t = teams.find(x => x.id === teamId);
  return t?.name || 'TBD';
};

// Calculate where teams advance to
const getAdvancementInfo = (match: Match, allMatches: Match[], teams: Team[]) => {
  if (!match.isComplete || !match.winnerId) return null;
  
  const winnerId = match.winnerId;
  const loserId = match.team1Id === winnerId ? match.team2Id : match.team1Id;
  const winnerName = getTeamName(teams, winnerId);
  const loserName = getTeamName(teams, loserId);
  
  const advancements: { team: string; destination: string; bracket: string }[] = [];
  
  if (match.bracketType === 'winners') {
    // Winner advances to next WB round or Grand Final
    const nextWinnersRound = match.round + 1;
    const nextWinnersMatchNumber = Math.ceil(match.matchNumber / 2);
    
    const nextWinnersMatch = allMatches.find(m => 
      m.tournamentId === match.tournamentId &&
      m.bracketType === 'winners' &&
      m.round === nextWinnersRound &&
      m.matchNumber === nextWinnersMatchNumber
    );
    
    if (nextWinnersMatch) {
      const winnersMaxRound = Math.max(...allMatches.filter(m => m.bracketType === 'winners').map(m => m.round));
      const roundLabel = nextWinnersRound === winnersMaxRound ? 'WB Final' : `WB Round ${nextWinnersRound}`;
      advancements.push({
        team: winnerName,
        destination: `${roundLabel} Match #${nextWinnersMatchNumber}`,
        bracket: 'winners'
      });
    } else {
      // Goes to Grand Final
      const grandFinal = allMatches.find(m =>
        m.tournamentId === match.tournamentId &&
        m.bracketType === 'grand_final' &&
        m.matchNumber === 1
      );
      if (grandFinal) {
        advancements.push({
          team: winnerName,
          destination: 'Grand Final',
          bracket: 'grand_final'
        });
      }
    }
    
    // Loser goes to losers bracket
    const losersBracketMatch = findLosersBracketMatchForPreview(match, allMatches);
    if (losersBracketMatch) {
      const losersMaxRound = Math.max(...allMatches.filter(m => m.bracketType === 'losers').map(m => m.round));
      const roundLabel = losersBracketMatch.round === losersMaxRound ? 'LB Final' : `LB Round ${losersBracketMatch.round}`;
      advancements.push({
        team: loserName,
        destination: `${roundLabel} Match #${losersBracketMatch.matchNumber}`,
        bracket: 'losers'
      });
    }
  } else if (match.bracketType === 'losers') {
    // Winner advances to next LB round or Grand Final
    const nextLosersRound = match.round + 1;
    const nextLosersMatchNumber = match.round % 2 === 1 ? match.matchNumber : Math.ceil(match.matchNumber / 2);
    
    const nextLosersMatch = allMatches.find(m => 
      m.tournamentId === match.tournamentId &&
      m.bracketType === 'losers' &&
      m.round === nextLosersRound &&
      m.matchNumber === nextLosersMatchNumber
    );
    
    if (nextLosersMatch) {
      const losersMaxRound = Math.max(...allMatches.filter(m => m.bracketType === 'losers').map(m => m.round));
      const roundLabel = nextLosersRound === losersMaxRound ? 'LB Final' : `LB Round ${nextLosersRound}`;
      advancements.push({
        team: winnerName,
        destination: `${roundLabel} Match #${nextLosersMatchNumber}`,
        bracket: 'losers'
      });
    } else {
      // Check if this is losers final - goes to Grand Final
      const losersMaxRound = Math.max(...allMatches.filter(m => m.bracketType === 'losers').map(m => m.round));
      if (match.round === losersMaxRound) {
        advancements.push({
          team: winnerName,
          destination: 'Grand Final',
          bracket: 'grand_final'
        });
      }
    }
  } else if (match.bracketType === 'grand_final') {
    // Grand final winner wins tournament
    advancements.push({
      team: winnerName,
      destination: 'Tournament Champion',
      bracket: 'champion'
    });
  }
  
  return advancements.length > 0 ? advancements : null;
};

// Helper to find losers bracket match (same logic as backend)
const findLosersBracketMatchForPreview = (match: Match, allMatches: Match[]): Match | null => {
  const winnersRound = match.round;
  const winnersMatchNumber = match.matchNumber;
  
  if (winnersRound === 1) {
    const losersRound = 1;
    const losersMatchNumber = Math.ceil(winnersMatchNumber / 2);
    return (
      allMatches.find(m =>
        m.tournamentId === match.tournamentId &&
        m.bracketType === 'losers' &&
        m.round === losersRound &&
        m.matchNumber === losersMatchNumber
      ) || null
    );
  }
  
  const losersRound = 2 * (winnersRound - 1);
  const losersMatchNumber = winnersMatchNumber;
  return (
    allMatches.find(m =>
      m.tournamentId === match.tournamentId &&
      m.bracketType === 'losers' &&
      m.round === losersRound &&
      m.matchNumber === losersMatchNumber
    ) || null
  );
};

const getFormatTag = (match: Match) => {
  if (match.matchFormat) return match.matchFormat;
  if (match.bracketType === 'grand_final') return 'BO3';
  return 'BO1';
};

// Calculate a unique visual match number for display (doesn't affect backend)
const getVisualMatchNumber = (match: Match, allMatches: Match[]): number => {
  // Sort all matches to create a consistent ordering
  const sortedMatches = [...allMatches].sort((a, b) => {
    // First by bracket type: winners, then losers, then grand_final
    const bracketOrder = { 'winners': 1, 'losers': 2, 'grand_final': 3 };
    const aOrder = bracketOrder[a.bracketType as keyof typeof bracketOrder] || 99;
    const bOrder = bracketOrder[b.bracketType as keyof typeof bracketOrder] || 99;
    
    if (aOrder !== bOrder) return aOrder - bOrder;
    
    // Then by round
    if (a.round !== b.round) return a.round - b.round;
    
    // Then by matchNumber within the round
    return a.matchNumber - b.matchNumber;
  });
  
  // Find the index of this match in the sorted array and add 1 (for 1-based numbering)
  const index = sortedMatches.findIndex(m => m.id === match.id);
  return index >= 0 ? index + 1 : match.matchNumber;
};

const MatchCard: React.FC<{ 
  match: Match; 
  teams: Team[]; 
  allMatches: Match[];
  tournament: Tournament;
  isAdmin?: boolean;
  currentUser?: User | null;
  onUpdate?: () => void;
}> = ({ match, teams, allMatches, tournament, isAdmin, currentUser, onUpdate }) => {
  const team1 = getTeamName(teams, match.team1Id);
  const team2 = getTeamName(teams, match.team2Id);
  const format = getFormatTag(match);
  const [showAdvancement, setShowAdvancement] = useState(false);
  const [showAdminControls, setShowAdminControls] = useState(false);
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [selectedTeamForAdd, setSelectedTeamForAdd] = useState<string>('');
  const [addingTeamSlot, setAddingTeamSlot] = useState<'team1Id' | 'team2Id' | null>(null);
  const [addingTeam, setAddingTeam] = useState(false);
  const [moveTeamMode, setMoveTeamMode] = useState<{ teamId: string; teamSlot: 'team1Id' | 'team2Id' } | null>(null);
  const [targetMatchId, setTargetMatchId] = useState<string>('');
  const [targetSlot, setTargetSlot] = useState<'team1Id' | 'team2Id'>('team1Id');
  const [resettingMatch, setResettingMatch] = useState(false);
  const [removingTeam, setRemovingTeam] = useState<string | null>(null);
  
  const advancementInfo = isAdmin && match.isComplete ? getAdvancementInfo(match, allMatches, teams) : null;
  const visualMatchNumber = getVisualMatchNumber(match, allMatches);

  const handleResetToPreVeto = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser?.isAdmin) return;
    
    if (!window.confirm('Reset this match to pre-veto state? This will clear all map bans, side selections, and scores, but keep the teams.')) {
      return;
    }

    setResettingMatch(true);
    try {
      await adminResetMatchToPreVeto(match.id, currentUser.id);
      toast.success('Match reset to pre-veto state!');
      if (onUpdate) onUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to reset match');
    } finally {
      setResettingMatch(false);
    }
  };

  const handleRemoveTeam = async (e: React.MouseEvent, teamSlot: 'team1Id' | 'team2Id') => {
    e.stopPropagation();
    if (!currentUser?.isAdmin) return;
    
    const teamId = match[teamSlot];
    if (!teamId) return;

    if (!window.confirm(`Remove ${getTeamName(teams, teamId)} from this match?`)) {
      return;
    }

    setRemovingTeam(teamSlot);
    try {
      await adminRemoveTeamFromMatch(match.id, teamSlot, currentUser.id);
      toast.success('Team removed from match!');
      if (onUpdate) onUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove team');
    } finally {
      setRemovingTeam(null);
    }
  };

  const handleMoveTeam = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser?.isAdmin || !moveTeamMode || !targetMatchId) {
      toast.error('Please select a target match');
      return;
    }

    if (!window.confirm(`Move ${getTeamName(teams, moveTeamMode.teamId)} to the target match? This will reset both matches.`)) {
      return;
    }

    try {
      await adminMoveTeamBetweenMatches(
        match.id,
        targetMatchId,
        moveTeamMode.teamId,
        targetSlot,
        currentUser.id
      );
      toast.success('Team moved successfully!');
      setMoveTeamMode(null);
      setTargetMatchId('');
      setTargetSlot('team1Id');
      if (onUpdate) onUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to move team');
    }
  };

  const handleAddTeam = async (e: React.MouseEvent, slot: 'team1Id' | 'team2Id') => {
    e.stopPropagation();
    if (!currentUser?.isAdmin) return;
    
    setAddingTeamSlot(slot);
    setShowAddTeam(true);
  };

  const handleConfirmAddTeam = async () => {
    if (!currentUser?.isAdmin || !selectedTeamForAdd || !addingTeamSlot) {
      toast.error('Please select a team');
      return;
    }

    setAddingTeam(true);
    try {
      await adminAddTeamToMatch(match.id, selectedTeamForAdd, addingTeamSlot, currentUser.id);
      toast.success('Team added to match!');
      setSelectedTeamForAdd('');
      setAddingTeamSlot(null);
      setShowAddTeam(false);
      if (onUpdate) onUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add team');
    } finally {
      setAddingTeam(false);
    }
  };

  // Get available teams (only teams registered for the tournament, not already in this match or other matches)
  const getAvailableTeams = () => {
    // Get tournament registered team IDs (check both teams and approvedTeams arrays)
    const tournamentTeamIds = new Set([
      ...(tournament?.teams || []),
      ...(tournament?.approvedTeams || [])
    ]);
    
    // Get teams already in matches (EXCLUDE completed matches - those teams are done)
    const tournamentMatchIds = new Set(
      allMatches
        .filter(m => 
          m.tournamentId === match.tournamentId && 
          m.id !== match.id &&
          !m.isComplete  // Exclude completed matches
        )
        .flatMap(m => [m.team1Id, m.team2Id])
        .filter(Boolean)
    );
    
    // Filter teams - teams prop should already be tournament teams, but verify
    const available = teams.filter(team => {
      // Verify team is registered for tournament (if tournament has teams list, check it)
      if (tournamentTeamIds.size > 0 && !tournamentTeamIds.has(team.id)) {
        return false;
      }
      
      // Not already in this match
      if (team.id === match.team1Id || team.id === match.team2Id) {
        return false;
      }
      
      // Not already in other INCOMPLETE matches (completed matches don't count)
      if (tournamentMatchIds.has(team.id)) {
        return false;
      }
      
      return true;
    });
    
    // Debug logging
    console.log('Available teams filter:', {
      totalTeams: teams.length,
      tournamentTeamIds: Array.from(tournamentTeamIds),
      tournamentMatchIds: Array.from(tournamentMatchIds),
      completedMatches: allMatches.filter(m => m.tournamentId === match.tournamentId && m.isComplete).length,
      availableCount: available.length,
      availableTeams: available.map(t => ({ id: t.id, name: t.name }))
    });
    
    return available;
  };

  return (
    <div className="relative match-card-container">
      <div
        className="w-full text-left bg-black/30 border border-gray-800 hover:border-red-600 transition-colors relative"
        onMouseEnter={() => {
          if (isAdmin) {
            setShowAdminControls(true);
            if (!match.team1Id || !match.team2Id) {
              setShowAddTeam(true);
            }
          }
        }}
        onMouseLeave={(e) => {
          // Only hide if mouse is not moving to a child popup
          const relatedTarget = e.relatedTarget as HTMLElement;
          if (!relatedTarget || !relatedTarget.closest('.admin-popup')) {
            if (!moveTeamMode && !showAddTeam) {
              setShowAdminControls(false);
            }
          }
        }}
      >
        <div className="px-3 py-2 border-b border-gray-800 flex items-center justify-between">
          <div className="text-xs text-gray-500 font-mono uppercase tracking-widest">
            #{visualMatchNumber}
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && showAdminControls && match.matchState !== 'ready_up' && (
              <button
                onClick={handleResetToPreVeto}
                disabled={resettingMatch}
                className="text-orange-500 hover:text-orange-400 transition-colors"
                title="Reset to Pre-Veto"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
            <div className="text-xs text-red-500 font-mono uppercase tracking-widest">
              {format}
            </div>
          </div>
        </div>

        <div 
          className="w-full cursor-pointer"
          onClick={() => {
            // eslint-disable-next-line no-restricted-globals
            location.href = `/match/${match.id}`;
          }}
          onMouseEnter={() => isAdmin && advancementInfo && setShowAdvancement(true)}
          onMouseLeave={() => setShowAdvancement(false)}
        >
          <div className="p-3 space-y-2">
            {/* Team 1 */}
            <div className="flex items-center justify-between gap-3 group">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="text-white font-bodax uppercase tracking-wide text-lg truncate">
                  {team1}
                </div>
                {isAdmin && showAdminControls && match.team1Id && !match.isComplete && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMoveTeamMode({ teamId: match.team1Id!, teamSlot: 'team1Id' });
                        setShowAddTeam(false);
                      }}
                      className="text-purple-500 hover:text-purple-400 transition-colors"
                      title="Move Team"
                    >
                      <ArrowRightLeft className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveTeam(e, 'team1Id');
                        setShowAddTeam(false);
                      }}
                      disabled={removingTeam === 'team1Id'}
                      className="text-red-500 hover:text-red-400 transition-colors disabled:opacity-50"
                      title="Remove Team"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
              <div className="text-gray-300 font-mono text-lg">
                {match.isComplete ? match.team1Score : 0}
              </div>
            </div>
            
            {/* Team 2 */}
            <div className="flex items-center justify-between gap-3 group">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="text-white font-bodax uppercase tracking-wide text-lg truncate">
                  {team2}
                </div>
                {isAdmin && showAdminControls && match.team2Id && !match.isComplete && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMoveTeamMode({ teamId: match.team2Id!, teamSlot: 'team2Id' });
                        setShowAddTeam(false);
                      }}
                      className="text-purple-500 hover:text-purple-400 transition-colors"
                      title="Move Team"
                    >
                      <ArrowRightLeft className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveTeam(e, 'team2Id');
                        setShowAddTeam(false);
                      }}
                      disabled={removingTeam === 'team2Id'}
                      className="text-red-500 hover:text-red-400 transition-colors disabled:opacity-50"
                      title="Remove Team"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
              <div className="text-gray-300 font-mono text-lg">
                {match.isComplete ? match.team2Score : 0}
              </div>
            </div>
          </div>
        </div>

        {/* Move Team Interface */}
        {isAdmin && moveTeamMode && (
          <div 
            className="admin-popup absolute left-full ml-4 top-0 z-50 min-w-[320px] bg-[#0a0a0a] border border-purple-500/50 shadow-xl p-4 rounded"
            onMouseEnter={() => setShowAdminControls(true)}
            onMouseLeave={(e) => {
              const relatedTarget = e.relatedTarget as HTMLElement;
              if (!relatedTarget || !relatedTarget.closest('.match-card-container')) {
                setMoveTeamMode(null);
                setTargetMatchId('');
                setTargetSlot('team1Id');
                setShowAdminControls(false);
              }
            }}
          >
            <div className="text-xs text-purple-500 font-mono uppercase tracking-widest mb-3">
              Move {getTeamName(teams, moveTeamMode.teamId)}
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Target Match</label>
                <select
                  value={targetMatchId}
                  onChange={(e) => setTargetMatchId(e.target.value)}
                  className="w-full px-2 py-1 bg-gray-900 border border-gray-700 rounded text-white text-sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  <option value="">Select match...</option>
                  {allMatches
                    .filter(m => m.id !== match.id && !m.isComplete && m.tournamentId === match.tournamentId)
                    .map(m => (
                      <option key={m.id} value={m.id}>
                        Match #{getVisualMatchNumber(m, allMatches)} - Round {m.round} ({getTeamName(teams, m.team1Id)} vs {getTeamName(teams, m.team2Id)})
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Target Slot</label>
                <select
                  value={targetSlot}
                  onChange={(e) => setTargetSlot(e.target.value as 'team1Id' | 'team2Id')}
                  className="w-full px-2 py-1 bg-gray-900 border border-gray-700 rounded text-white text-sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  <option value="team1Id">Team 1 Slot</option>
                  <option value="team2Id">Team 2 Slot</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleMoveTeam}
                  disabled={!targetMatchId}
                  className="flex-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 disabled:cursor-not-allowed text-white text-xs rounded transition-colors"
                >
                  Move
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMoveTeamMode(null);
                    setTargetMatchId('');
                    setTargetSlot('team1Id');
                  }}
                  className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Team Interface */}
        {isAdmin && showAddTeam && !match.isComplete && (!match.team1Id || !match.team2Id) && (
          <div 
            className="admin-popup absolute left-full ml-4 top-0 z-50 min-w-[320px] bg-[#0a0a0a] border border-green-500/50 shadow-xl p-4 rounded"
            onMouseEnter={() => {
              setShowAddTeam(true);
              setShowAdminControls(true);
            }}
            onMouseLeave={(e) => {
              const relatedTarget = e.relatedTarget as HTMLElement;
              if (!relatedTarget || !relatedTarget.closest('.match-card-container')) {
                if (!addingTeamSlot) {
                  setShowAddTeam(false);
                  setShowAdminControls(false);
                }
              }
            }}
          >
            {addingTeamSlot ? (
              <div className="space-y-3">
                <div className="text-xs text-green-500 font-mono uppercase tracking-widest mb-2">
                  Add Team to {addingTeamSlot === 'team1Id' ? 'Team 1' : 'Team 2'} Slot
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Select Team</label>
                  <select
                    value={selectedTeamForAdd}
                    onChange={(e) => setSelectedTeamForAdd(e.target.value)}
                    className="w-full px-2 py-1.5 bg-gray-900 border border-gray-700 rounded text-white text-sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <option value="">Choose a team...</option>
                    {getAvailableTeams().length > 0 ? (
                      getAvailableTeams().map(team => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>No available teams</option>
                    )}
                  </select>
                  {getAvailableTeams().length === 0 && (
                    <div className="text-xs text-yellow-400 mt-1">
                      All tournament teams are already in matches
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleConfirmAddTeam}
                    disabled={addingTeam || !selectedTeamForAdd}
                    className="flex-1 px-3 py-1.5 bg-green-600 hover:bg-green-500 disabled:bg-green-800 disabled:cursor-not-allowed text-white text-xs rounded transition-colors"
                  >
                    {addingTeam ? 'Adding...' : 'Add Team'}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setAddingTeamSlot(null);
                      setSelectedTeamForAdd('');
                      setShowAddTeam(false);
                    }}
                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-xs text-green-500 font-mono uppercase tracking-widest mb-3">
                  Add Team
                </div>
                {!match.team1Id && (
                  <button
                    onClick={(e) => handleAddTeam(e, 'team1Id')}
                    className="w-full px-3 py-2 bg-green-600 hover:bg-green-500 text-white text-xs rounded transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-3 h-3" />
                    Add Team 1
                  </button>
                )}
                {!match.team2Id && (
                  <button
                    onClick={(e) => handleAddTeam(e, 'team2Id')}
                    className="w-full px-3 py-2 bg-green-600 hover:bg-green-500 text-white text-xs rounded transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-3 h-3" />
                    Add Team 2
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      
      {showAdvancement && advancementInfo && (
        <div className="absolute left-full ml-4 top-0 z-50 min-w-[280px] bg-[#0a0a0a] border border-red-500/50 shadow-xl p-4 rounded">
          <div className="text-xs text-red-500 font-mono uppercase tracking-widest mb-3">
            Advancement Preview
          </div>
          <div className="space-y-2">
            {advancementInfo.map((adv, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                <span className="text-white font-bodax uppercase truncate flex-1">{adv.team}</span>
                <ArrowRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <span className={`font-mono text-xs ${
                  adv.bracket === 'winners' ? 'text-blue-400' :
                  adv.bracket === 'losers' ? 'text-purple-400' :
                  adv.bracket === 'grand_final' ? 'text-yellow-400' :
                  'text-green-400'
                }`}>
                  {adv.destination}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const RoundColumn: React.FC<{ 
  title: string; 
  matches: Match[]; 
  teams: Team[];
  allMatches: Match[];
  tournament: Tournament;
  isAdmin?: boolean;
  currentUser?: User | null;
  onUpdate?: () => void;
}> = ({ title, matches, teams, allMatches, tournament, isAdmin, currentUser, onUpdate }) => {
  return (
    <div className="min-w-[260px]">
      <div className="mb-3">
        <div className="text-gray-300 font-mono uppercase tracking-widest text-xs">{title}</div>
        <div className="mt-1.5 h-px bg-gray-800" />
      </div>
      <div className="space-y-3">
        {matches.map(m => (
          <MatchCard 
            key={m.id} 
            match={m} 
            teams={teams} 
            allMatches={allMatches}
            tournament={tournament}
            isAdmin={isAdmin}
            currentUser={currentUser}
            onUpdate={onUpdate}
          />
        ))}
      </div>
    </div>
  );
};

const DoubleEliminationBracket: React.FC<DoubleEliminationBracketProps> = ({ tournament, matches, teams, variant = 'embedded', isAdmin = false, currentUser, onUpdate }) => {
  const viewVariant: 'embedded' | 'fullscreen' = variant;

  const winners = matches.filter(m => m.bracketType === 'winners');
  const losers = matches.filter(m => m.bracketType === 'losers');
  const grandFinals = matches.filter(m => m.bracketType === 'grand_final').sort((a, b) => a.matchNumber - b.matchNumber);

  const winnersMaxRound = winners.length ? Math.max(...winners.map(m => m.round)) : 0;
  const losersMaxRound = losers.length ? Math.max(...losers.map(m => m.round)) : 0;
  const columns = Math.max(winnersMaxRound, losersMaxRound);

  const getWinnersTitle = (round: number) => {
    if (round === winnersMaxRound) return 'Finale (WB)';
    return `Runde ${round} (WB)`;
  };
  const getLosersTitle = (round: number) => {
    if (round === losersMaxRound) return 'Finale (LB)';
    return `Runde ${round} (LB)`;
  };

  return (
    <div className={viewVariant === 'fullscreen' ? '' : 'bg-[#0a0a0a] border border-gray-800 p-6 relative overflow-hidden'}>
      {viewVariant !== 'fullscreen' && (
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage:
              'linear-gradient(rgba(50, 50, 50, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(50, 50, 50, 0.5) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}
        />
      )}

      <div className="relative">
        {viewVariant !== 'fullscreen' && (
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h2 className="text-3xl font-bold text-white font-bodax tracking-wide uppercase leading-none">
                Bracket <span className="text-red-500">Double Elimination</span>
              </h2>
              <div className="mt-2 text-gray-400 font-mono uppercase tracking-widest text-sm">
                {tournament.name}
              </div>
            </div>
            <div className="text-xs text-gray-500 font-mono uppercase tracking-widest">
              {isAdmin ? 'Hover matches for admin controls' : 'Click a match to open'}
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <div className="min-w-max">
            {/* Winners Bracket Section with Grand Final in Middle */}
            <div className="mb-6">
              <div className="mb-4">
                <div className="text-green-400 font-mono uppercase tracking-widest text-sm font-bold mb-2">
                  Winners Bracket
                </div>
                <div className="h-px bg-gradient-to-r from-green-500 via-green-400 to-transparent" />
              </div>
              <div className="flex gap-4 items-center">
                {/* Winners Bracket Rounds */}
                {Array.from({ length: winnersMaxRound }).map((_, idx) => {
                  const r = idx + 1;
                  const wr = winners.filter(m => m.round === r).sort((a, b) => a.matchNumber - b.matchNumber);
                  
                  if (wr.length === 0) return null;
                  
                  // Show Grand Final after the Winners Bracket Final (last round)
                  const isWinnersFinal = r === winnersMaxRound;
                  
                  return (
                    <React.Fragment key={`wb-${r}`}>
                      <RoundColumn 
                        title={getWinnersTitle(r)} 
                        matches={wr} 
                        teams={teams} 
                        allMatches={matches}
                        tournament={tournament}
                        isAdmin={isAdmin}
                        currentUser={currentUser}
                        onUpdate={onUpdate}
                      />
                      {/* Insert Grand Final after Winners Bracket Final */}
                      {isWinnersFinal && grandFinals.length > 0 && (
                        <div className="min-w-[260px] flex flex-col justify-center mx-2">
                          <div className="mb-3">
                            <div className="text-yellow-400 font-mono uppercase tracking-widest text-xs font-bold mb-1">
                              Grand Finale
                            </div>
                            <div className="h-px bg-gradient-to-r from-yellow-500 via-yellow-400 to-transparent" />
                          </div>
                          <div className="space-y-3">
                            {grandFinals.map(m => (
                              <MatchCard 
                                key={m.id} 
                                match={m} 
                                teams={teams} 
                                allMatches={matches}
                                tournament={tournament}
                                isAdmin={isAdmin}
                                currentUser={currentUser}
                                onUpdate={onUpdate}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* Divider Line */}
            <div className="my-4 relative">
              <div className="h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent" />
            </div>

            {/* Losers Bracket Section */}
            <div className="mb-4">
              <div className="mb-4">
                <div className="text-red-400 font-mono uppercase tracking-widest text-sm font-bold mb-2">
                  Losers Bracket
                </div>
                <div className="h-px bg-gradient-to-r from-red-500 via-red-400 to-transparent" />
              </div>
              <div className="flex gap-4">
                {Array.from({ length: losersMaxRound }).map((_, idx) => {
                  const r = idx + 1;
                  const lr = losers.filter(m => m.round === r).sort((a, b) => a.matchNumber - b.matchNumber);
                  
                  if (lr.length === 0) return null;
                  
                  return (
                    <RoundColumn 
                      key={`lb-${r}`}
                      title={getLosersTitle(r)} 
                      matches={lr} 
                      teams={teams} 
                      allMatches={matches}
                      tournament={tournament}
                      isAdmin={isAdmin}
                      currentUser={currentUser}
                      onUpdate={onUpdate}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoubleEliminationBracket;


