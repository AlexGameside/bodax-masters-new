import React, { useState } from 'react';
import type { Match, Team } from '../types/tournament';
import { updateMatchStateWithSides } from '../services/firebaseService';
import { toast } from 'react-hot-toast';
import { Shield, Sword, Target } from 'lucide-react';

interface SideSelectionProps {
  match: Match;
  teams: Team[];
  currentUserTeamId?: string;
}

const SideSelection: React.FC<SideSelectionProps> = ({ match, teams, currentUserTeamId }) => {
  const [isLoading, setIsLoading] = useState(false);

  const team1 = teams.find(t => t.id === match.team1Id);
  const team2 = teams.find(t => t.id === match.team2Id);
  const isTeam1 = currentUserTeamId === match.team1Id;
  const isTeam2 = currentUserTeamId === match.team2Id;

  // Only Team 2 can choose sides (since Team 1 picked the map)
  const canChooseSide = isTeam2 && !match.team1Side && !match.team2Side;

  const handleSideSelection = async (side: 'attack' | 'defense') => {
    if (!currentUserTeamId || !isTeam2) {
      toast.error('Only Team 2 can select sides');
      return;
    }

    setIsLoading(true);
    
    try {
      // Team 2 chooses, Team 1 gets the opposite
      const team2Side = side;
      const team1Side = side === 'attack' ? 'defense' : 'attack';

      // Update match with both sides and transition to playing state
      await updateMatchStateWithSides(match.id, 'playing', {
        team1Side,
        team2Side,
        matchStartTime: new Date().toISOString()
      });

      const sideText = side === 'attack' ? 'Attack' : 'Defense';
      const otherSideText = side === 'attack' ? 'Defense' : 'Attack';
      
      toast.success(`Team 2 selected ${sideText}, Team 1 automatically assigned ${otherSideText}`);
      toast.success('Match is now starting!');
      
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
          {isTeam2 ? 'Team 2 chooses starting side' : 'Waiting for Team 2 to choose sides'}
        </p>
        <p className="text-sm text-gray-400 mt-1">
          {isTeam2 ? 'Choose your side (Team 1 will get the opposite)' : 
           'Team 1 picked the map, so Team 2 gets to choose sides'}
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
              Choose your starting side (Team 1 will get the opposite)
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