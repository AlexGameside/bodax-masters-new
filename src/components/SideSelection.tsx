import React, { useState } from 'react';
import type { Match, Team } from '../types/tournament';
import { updateMatchStateWithSides } from '../services/firebaseService';
import { toast } from 'react-hot-toast';
import { Shield, Sword, Target } from 'lucide-react';

// Helper: in BO1 the team that made the LAST ban effectively chose the map,
// so the OTHER team gets to pick starting side.
const getSideChoosingTeam = (match: Match): 'team1' | 'team2' | null => {
  if (!match.selectedMap) {
    return null;
  }

  const lastBan = match.banSequence?.[match.banSequence.length - 1];
  if (lastBan?.teamId) {
    if (lastBan.teamId === match.team1Id) return 'team2';
    if (lastBan.teamId === match.team2Id) return 'team1';
  }

  // Fallback: derive from ban count (Team 1 always starts banning in BO1)
  const totalBans =
    (match.bannedMaps?.team1?.length || 0) +
    (match.bannedMaps?.team2?.length || 0);

  if (totalBans > 0) {
    // If we don't have a banSequence (legacy/partial data), infer based on who started banning.
    // Team A starts; if Team A is team1 => odd total means team1 was last, else even total means team1 was last.
    const teamAId = match.veto?.teamAId || match.team1Id;
    const teamAIsTeam1 = teamAId === match.team1Id;
    const lastBanByTeam1 = teamAIsTeam1 ? totalBans % 2 === 1 : totalBans % 2 === 0;
    return lastBanByTeam1 ? 'team2' : 'team1';
  }

  return null;
};

interface SideSelectionProps {
  match: Match;
  teams: Team[];
  currentUserTeamId?: string;
  onSideSelectionComplete?: () => void;
}

const SideSelection: React.FC<SideSelectionProps> = ({ match, teams, currentUserTeamId, onSideSelectionComplete }) => {
  const [isLoading, setIsLoading] = useState(false);

  const team1 = teams.find(t => t.id === match.team1Id);
  const team2 = teams.find(t => t.id === match.team2Id);
  const isTeam1 = currentUserTeamId === match.team1Id;
  const isTeam2 = currentUserTeamId === match.team2Id;

  // Determine which team should choose sides based on ban sequence (BO1)
  const sideChoosingTeam = getSideChoosingTeam(match);
  const isCurrentTeamChooser =
    (sideChoosingTeam === 'team1' && isTeam1) ||
    (sideChoosingTeam === 'team2' && isTeam2);
  
  // Only the team that should choose sides can choose, and only if no sides are selected yet
  const canChooseSide =
    isCurrentTeamChooser &&
    !match.team1Side &&
    !match.team2Side &&
    !!match.selectedMap;

  const selectedMapName =
    match.selectedMap || match.map1 || match.map2 || match.deciderMap || 'Selected Map';
  const sideChoosingTeamName =
    sideChoosingTeam === 'team1' ? team1?.name || 'Team 1' : sideChoosingTeam === 'team2' ? team2?.name || 'Team 2' : null;

  const handleSideSelection = async (side: 'attack' | 'defense') => {
    if (!currentUserTeamId || !isCurrentTeamChooser || !sideChoosingTeam) {
      const teamName =
        sideChoosingTeam === 'team1'
          ? 'Team 1'
          : sideChoosingTeam === 'team2'
          ? 'Team 2'
          : 'the designated team';
      toast.error(`Only ${teamName} can select sides`);
      return;
    }

    setIsLoading(true);
    
    try {
      // The team that chooses sides gets their choice, the other team gets the opposite
      const choosingTeamSide = side;
      const otherTeamSide = side === 'attack' ? 'defense' : 'attack';

      // Update match with both sides and transition to playing state
      await updateMatchStateWithSides(
        match.id, 
        'playing', 
        sideChoosingTeam === 'team1' ? choosingTeamSide : otherTeamSide,
        sideChoosingTeam === 'team2' ? choosingTeamSide : otherTeamSide,
        new Date().toISOString()
      );

      const sideText = side === 'attack' ? 'Attack' : 'Defense';
      const otherSideText = side === 'attack' ? 'Defense' : 'Attack';
      const choosingTeamName = sideChoosingTeam === 'team1' ? 'Team 1' : 'Team 2';
      const otherTeamName = sideChoosingTeam === 'team1' ? 'Team 2' : 'Team 1';
      
      toast.success(`${choosingTeamName} selected ${sideText}, ${otherTeamName} automatically assigned ${otherSideText}`);
      toast.success('Match is now starting!');
      
      // Notify parent component that side selection is complete
      if (onSideSelectionComplete) {
        onSideSelectionComplete();
      }
      
    } catch (error: any) {
      toast.error(error.message || 'Failed to select side');

    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[#0a0a0a] border border-gray-800 p-6 max-w-2xl mx-auto relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            'linear-gradient(rgba(50, 50, 50, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(50, 50, 50, 0.5) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />
      <div className="relative">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-white font-bodax tracking-wide uppercase leading-none mb-2">Side Selection</h2>
        <p className="text-gray-400 font-mono uppercase tracking-widest text-sm mt-2">
          {sideChoosingTeamName
            ? isCurrentTeamChooser
              ? `${sideChoosingTeamName} chooses starting side on ${selectedMapName}`
              : `Waiting for ${sideChoosingTeamName} to choose sides on ${selectedMapName}`
            : 'Waiting for map selection to finish'}
        </p>
        <p className="text-xs text-gray-500 font-mono uppercase tracking-widest mt-2">
          {sideChoosingTeam
            ? isCurrentTeamChooser
              ? `Choose your side (${sideChoosingTeam === 'team1' ? team2?.name || 'Team 2' : team1?.name || 'Team 1'} will get the opposite)`
              : `The team that made the last ban picked the map, so ${sideChoosingTeamName} chooses starting sides`
            : 'Side selection unlocks after the final ban.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="text-center bg-[#0a0a0a] border border-gray-800 p-4">
          <h3 className="font-bold text-lg mb-2 text-white font-bodax uppercase tracking-wide">{team1?.name || 'Team 1'}</h3>
          <div className="text-sm">
            {match.team1Side ? (
              <span className={`inline-flex items-center px-3 py-1.5 rounded border font-mono uppercase tracking-widest text-xs font-bold ${
                match.team1Side === 'attack' 
                  ? 'bg-red-900/30 text-red-400 border-red-600/50' 
                  : 'bg-blue-900/30 text-blue-400 border-blue-600/50'
              }`}>
                {match.team1Side === 'attack' ? <Sword className="w-4 h-4 mr-1" /> : <Shield className="w-4 h-4 mr-1" />}
                {match.team1Side === 'attack' ? 'Attack' : 'Defense'}
              </span>
            ) : (
              <span className="text-gray-500 font-mono uppercase tracking-widest text-xs">Waiting...</span>
            )}
          </div>
        </div>

        <div className="text-center bg-[#0a0a0a] border border-gray-800 p-4">
          <h3 className="font-bold text-lg mb-2 text-white font-bodax uppercase tracking-wide">{team2?.name || 'Team 2'}</h3>
          <div className="text-sm">
            {match.team2Side ? (
              <span className={`inline-flex items-center px-3 py-1.5 rounded border font-mono uppercase tracking-widest text-xs font-bold ${
                match.team2Side === 'attack' 
                  ? 'bg-red-900/30 text-red-400 border-red-600/50' 
                  : 'bg-blue-900/30 text-blue-400 border-blue-600/50'
              }`}>
                {match.team2Side === 'attack' ? <Sword className="w-4 h-4 mr-1" /> : <Shield className="w-4 h-4 mr-1" />}
                {match.team2Side === 'attack' ? 'Attack' : 'Defense'}
              </span>
            ) : (
              <span className="text-gray-500 font-mono uppercase tracking-widest text-xs">Choose your side</span>
            )}
          </div>
        </div>
      </div>

      {canChooseSide && (
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-gray-300 mb-4">
              Choose your starting side ({sideChoosingTeam === 'team1' ? team2?.name || 'Team 2' : team1?.name || 'Team 1'} will get the opposite)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleSideSelection('attack')}
              disabled={isLoading}
              className="flex items-center justify-center p-6 border-2 border-red-600/50 bg-[#0a0a0a] hover:border-red-600 hover:bg-red-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="text-center">
                <Sword className="w-8 h-8 text-red-500 mx-auto mb-2" />
                <div className="font-bold text-red-400 font-bodax uppercase tracking-wide">Attack</div>
                <div className="text-xs text-red-500/70 font-mono uppercase tracking-widest mt-1">Start on Attack</div>
              </div>
            </button>

            <button
              onClick={() => handleSideSelection('defense')}
              disabled={isLoading}
              className="flex items-center justify-center p-6 border-2 border-blue-600/50 bg-[#0a0a0a] hover:border-blue-600 hover:bg-blue-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="text-center">
                <Shield className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                <div className="font-bold text-blue-400 font-bodax uppercase tracking-wide">Defense</div>
                <div className="text-xs text-blue-500/70 font-mono uppercase tracking-widest mt-1">Start on Defense</div>
              </div>
            </button>
          </div>
        </div>
      )}

      {match.team1Side && match.team2Side && (
        <div className="text-center">
          <div className="bg-green-900/20 border border-green-600/50 rounded-lg p-4">
            <div className="flex items-center justify-center mb-2">
              <Target className="w-6 h-6 text-green-400 mr-2" />
              <span className="text-lg font-bold text-green-300 font-bodax uppercase tracking-wide">Sides Selected!</span>
            </div>
            <p className="text-green-200 font-mono uppercase tracking-widest text-sm">
              {team1?.name} will start on {match.team1Side}, {team2?.name} will start on {match.team2Side}
            </p>
            <p className="text-xs text-green-300/70 font-mono uppercase tracking-widest mt-2">Match is starting...</p>
          </div>
        </div>
      )}

      {!isTeam1 && !isTeam2 && (
        <div className="text-center text-gray-400 font-mono uppercase tracking-widest text-sm">
          <p>You are not part of this match</p>
        </div>
      )}
      </div>
    </div>
  );
};

export default SideSelection; 