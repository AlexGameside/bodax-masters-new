import React, { useState } from 'react';
import type { Match, Team } from '../types/tournament';
import { updateMatchStateWithSides } from '../services/firebaseService';
import { toast } from 'react-hot-toast';
import { Shield, Sword, Target } from 'lucide-react';

// Helper function to determine which team should choose sides
// The team that picked the map should NOT choose sides
const getTeamThatShouldChooseSides = (match: Match): 'team1' | 'team2' | null => {
  if (!match.selectedMap) {
    return null; // No map selected yet
  }

  const currentBannedMaps = match.bannedMaps || { team1: [], team2: [] };
  const totalBans = currentBannedMaps.team1.length + currentBannedMaps.team2.length;

  // Determine which team should select the map based on ban counts
  // The team that banned last should NOT be the one to select
  let teamThatShouldSelect: 'team1' | 'team2';
  
  // After 5 bans: Team 1 has 3 bans, Team 2 has 2 bans
  // Ban order: Team 1, Team 2, Team 1, Team 2, Team 1
  // Team 1 banned last, so Team 2 should select
  if (totalBans === 5) {
    teamThatShouldSelect = 'team2';
  } else if (totalBans === 6) {
    // After 6 bans: Team 1 has 3 bans, Team 2 has 3 bans
    // Ban order: Team 1, Team 2, Team 1, Team 2, Team 1, Team 2
    // Team 2 banned last, so Team 1 should select
    teamThatShouldSelect = 'team1';
  } else if (totalBans === 7) {
    // After 7 bans: Team 1 has 4 bans, Team 2 has 3 bans
    // Ban order: Team 1, Team 2, Team 1, Team 2, Team 1, Team 2, Team 1
    // Team 1 banned last, so Team 2 should select
    teamThatShouldSelect = 'team2';
  } else {
    // After 8 bans: Team 1 has 4 bans, Team 2 has 4 bans
    // Ban order: Team 1, Team 2, Team 1, Team 2, Team 1, Team 2, Team 1, Team 2
    // Team 2 banned last, so Team 1 should select
    teamThatShouldSelect = 'team1';
  }

  // The team that should choose sides is the OPPOSITE of the team that should select the map
  return teamThatShouldSelect === 'team1' ? 'team2' : 'team1';
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

  // Determine which team should choose sides based on ban sequence
  const teamThatShouldChooseSides = getTeamThatShouldChooseSides(match);
  const isCurrentTeamShouldChoose = (teamThatShouldChooseSides === 'team1' && isTeam1) || (teamThatShouldChooseSides === 'team2' && isTeam2);
  
  // Only the team that should choose sides can choose, and only if no sides are selected yet
  const canChooseSide = isCurrentTeamShouldChoose && !match.team1Side && !match.team2Side;

  const handleSideSelection = async (side: 'attack' | 'defense') => {
    if (!currentUserTeamId || !isCurrentTeamShouldChoose) {
      const teamName = teamThatShouldChooseSides === 'team1' ? 'Team 1' : 'Team 2';
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
        teamThatShouldChooseSides === 'team1' ? choosingTeamSide : otherTeamSide,
        teamThatShouldChooseSides === 'team2' ? choosingTeamSide : otherTeamSide,
        new Date().toISOString()
      );

      const sideText = side === 'attack' ? 'Attack' : 'Defense';
      const otherSideText = side === 'attack' ? 'Defense' : 'Attack';
      const choosingTeamName = teamThatShouldChooseSides === 'team1' ? 'Team 1' : 'Team 2';
      const otherTeamName = teamThatShouldChooseSides === 'team1' ? 'Team 2' : 'Team 1';
      
      toast.success(`${choosingTeamName} selected ${sideText}, ${otherTeamName} automatically assigned ${otherSideText}`);
      toast.success('Match is now starting!');
      
      // Notify parent component that side selection is complete
      if (onSideSelectionComplete) {
        onSideSelectionComplete();
      }
      
    } catch (error: any) {
      toast.error(error.message || 'Failed to select side');
      console.error('Error selecting side:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg p-6 max-w-2xl mx-auto border border-gray-700">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Side Selection</h2>
        <p className="text-gray-300">
          {isCurrentTeamShouldChoose ? `${teamThatShouldChooseSides === 'team1' ? 'Team 1' : 'Team 2'} chooses starting side` : 
           `Waiting for ${teamThatShouldChooseSides === 'team1' ? 'Team 1' : 'Team 2'} to choose sides`}
        </p>
        <p className="text-sm text-gray-400 mt-1">
          {isCurrentTeamShouldChoose ? `Choose your side (${teamThatShouldChooseSides === 'team1' ? 'Team 2' : 'Team 1'} will get the opposite)` : 
           `The team that picked the map cannot choose sides, so ${teamThatShouldChooseSides === 'team1' ? 'Team 1' : 'Team 2'} gets to choose sides`}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="text-center">
          <h3 className="font-semibold text-lg mb-2 text-white">{team1?.name || 'Team 1'}</h3>
          <div className="text-sm text-gray-300">
            {match.team1Side ? (
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                match.team1Side === 'attack' 
                  ? 'bg-red-900 text-red-200' 
                  : 'bg-blue-900 text-blue-200'
              }`}>
                {match.team1Side === 'attack' ? <Sword className="w-4 h-4 mr-1" /> : <Shield className="w-4 h-4 mr-1" />}
                {match.team1Side === 'attack' ? 'Attack' : 'Defense'}
              </span>
            ) : (
              <span className="text-gray-500">Waiting for Team 2...</span>
            )}
          </div>
        </div>

        <div className="text-center">
          <h3 className="font-semibold text-lg mb-2 text-white">{team2?.name || 'Team 2'}</h3>
          <div className="text-sm text-gray-300">
            {match.team2Side ? (
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                match.team2Side === 'attack' 
                  ? 'bg-red-900 text-red-200' 
                  : 'bg-blue-900 text-blue-200'
              }`}>
                {match.team2Side === 'attack' ? <Sword className="w-4 h-4 mr-1" /> : <Shield className="w-4 h-4 mr-1" />}
                {match.team2Side === 'attack' ? 'Attack' : 'Defense'}
              </span>
            ) : (
              <span className="text-gray-500">Choose your side</span>
            )}
          </div>
        </div>
      </div>

      {canChooseSide && (
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-gray-300 mb-4">
              Choose your starting side ({teamThatShouldChooseSides === 'team1' ? 'Team 2' : 'Team 1'} will get the opposite)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleSideSelection('attack')}
              disabled={isLoading}
              className="flex items-center justify-center p-4 border-2 border-red-600 rounded-lg hover:border-red-400 hover:bg-red-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="text-center">
                <Sword className="w-8 h-8 text-red-400 mx-auto mb-2" />
                <div className="font-semibold text-red-300">Attack</div>
                <div className="text-sm text-red-400">Start on Attack</div>
              </div>
            </button>

            <button
              onClick={() => handleSideSelection('defense')}
              disabled={isLoading}
              className="flex items-center justify-center p-4 border-2 border-blue-600 rounded-lg hover:border-blue-400 hover:bg-blue-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="text-center">
                <Shield className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                <div className="font-semibold text-blue-300">Defense</div>
                <div className="text-sm text-blue-400">Start on Defense</div>
              </div>
            </button>
          </div>
        </div>
      )}

      {match.team1Side && match.team2Side && (
        <div className="text-center">
          <div className="bg-green-900/20 border border-green-600 rounded-lg p-4">
            <div className="flex items-center justify-center mb-2">
              <Target className="w-6 h-6 text-green-400 mr-2" />
              <span className="text-lg font-semibold text-green-300">Sides Selected!</span>
            </div>
            <p className="text-green-200">
              {team1?.name} will start on {match.team1Side}, {team2?.name} will start on {match.team2Side}
            </p>
            <p className="text-sm text-green-300 mt-2">Match is starting...</p>
          </div>
        </div>
      )}

      {!isTeam1 && !isTeam2 && (
        <div className="text-center text-gray-400">
          <p>You are not part of this match</p>
        </div>
      )}
    </div>
  );
};

export default SideSelection; 