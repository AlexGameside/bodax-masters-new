import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { banMap, selectMap } from '../services/firebaseService';

interface MapBanningProps {
  match: any;
  userTeam: any;
  team1?: any;
  team2?: any;
  onMapBanningComplete: () => void;
}

const MapBanning: React.FC<MapBanningProps> = ({ match, userTeam, team1, team2, onMapBanningComplete }) => {
  const [selectedMap, setSelectedMap] = useState<string>('');
  const [banningLoading, setBanningLoading] = useState(false);

  const maps = [
    'Corrode',
    'Ascent',
    'Bind',
    'Haven',
    'Icebox',
    'Lotus',
    'Sunset'
  ];

  const isTeam1 = userTeam?.id === match.team1Id;
  const isTeam2 = userTeam?.id === match.team2Id;
  
  // Get current banned maps
  const bannedMaps = match.bannedMaps || { team1: [], team2: [] };
  const allBannedMaps = [...bannedMaps.team1, ...bannedMaps.team2];
  
  // Available maps (not banned)
  const availableMaps = maps.filter(map => !allBannedMaps.includes(map));
  
  // Calculate whose turn it is
  const totalBans = allBannedMaps.length;
  const isTeam1Turn = totalBans % 2 === 0; // Even ban count = Team 1's turn
  const isMapSelectionPhase = totalBans >= 5; // After 5 bans, 2 maps remain for selection (7-5=2)
  
  // Determine if it's the current user's team's turn
  const isUserTeamTurn = (isTeam1 && isTeam1Turn) || (isTeam2 && !isTeam1Turn);
  
  // Determine which team should pick the map based on ban sequence
  // The team that banned last should NOT be the one to select
  let teamThatShouldSelect: 'team1' | 'team2';
  
  const banSequence = match.banSequence || [];
  
  if (banSequence.length > 0) {
    const lastBan = banSequence[banSequence.length - 1];
    const lastBanTeamId = lastBan.teamId;
    
    // If Team 1 banned last, Team 2 should select
    // If Team 2 banned last, Team 1 should select
    if (lastBanTeamId === match.team1Id) {
      teamThatShouldSelect = 'team2';
    } else if (lastBanTeamId === match.team2Id) {
      teamThatShouldSelect = 'team1';
    } else {
      // Fallback to count-based logic if ban sequence is corrupted
      if (totalBans === 5) {
        teamThatShouldSelect = 'team1';
      } else if (totalBans === 6) {
        teamThatShouldSelect = 'team2';
      } else if (totalBans === 7) {
        teamThatShouldSelect = 'team1';
      } else {
        teamThatShouldSelect = 'team2';
      }
    }
  } else {
    // Fallback to count-based logic if no ban sequence
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
  }
  
  const isMapSelectionTurn = isMapSelectionPhase && (
    (teamThatShouldSelect === 'team1' && isTeam1) || 
    (teamThatShouldSelect === 'team2' && isTeam2)
  );

  const handleBanMap = async (mapName: string) => {
    if (!match || !userTeam) {
      toast.error('Match or team not available');
      return;
    }

    if (!isUserTeamTurn) {
      toast.error("It's not your team's turn to ban. Please wait for the other team.");
      return;
    }

    setBanningLoading(true);
    
    try {
      await banMap(match.id, userTeam.id, mapName);
      toast.success(`Banned ${mapName}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to ban map');
      console.error('Error banning map:', error);
    } finally {
      setBanningLoading(false);
    }
  };

  const handleSelectMap = async (mapName: string) => {
    if (!match || !userTeam) {
      toast.error('Match or team not available');
      return;
    }

    if (!isMapSelectionTurn) {
      const otherTeamName = teamThatShouldSelect === 'team1' ? 'Team 1' : 'Team 2';
      toast.error(`Only ${otherTeamName} can select the final map at this time.`);
      return;
    }

    setBanningLoading(true);
    
    try {
      await selectMap(match.id, userTeam.id, mapName);
      toast.success(`Selected ${mapName} as the match map`);
      onMapBanningComplete();
    } catch (error: any) {
      toast.error(error.message || 'Failed to select map');
      console.error('Error selecting map:', error);
    } finally {
      setBanningLoading(false);
    }
  };

  const getTurnIndicator = () => {
    if (isMapSelectionPhase) {
      const selectingTeamName = teamThatShouldSelect === 'team1' ? 'Team 1' : 'Team 2';
      return `${selectingTeamName}'s turn to select the final map`;
    } else {
      if (isTeam1Turn) {
        return "Team 1's turn to ban a map";
      } else {
        return "Team 2's turn to ban a map";
      }
    }
  };

  const getActionButtonText = (mapName: string) => {
    if (isMapSelectionPhase) {
      if (isMapSelectionTurn) {
        return `Select ${mapName}`;
      } else {
        const selectingTeamName = teamThatShouldSelect === 'team1' ? 'Team 1' : 'Team 2';
        return `${mapName} (Waiting for ${selectingTeamName})`;
      }
    } else {
      if (isUserTeamTurn) {
        return `Ban ${mapName}`;
      } else {
        return `${mapName} (Not your turn)`;
      }
    }
  };

  const isButtonDisabled = (mapName: string) => {
    if (banningLoading) return true;
    if (isMapSelectionPhase) {
      return !isMapSelectionTurn;
    } else {
      return !isUserTeamTurn;
    }
  };

  const handleMapAction = (mapName: string) => {
    if (isMapSelectionPhase) {
      handleSelectMap(mapName);
    } else {
      handleBanMap(mapName);
    }
  };

  return (
    <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-6 mb-8">
      <div className="text-center">
        <h3 className="text-xl font-semibold mb-4">Map Banning Phase</h3>
        
        {/* Turn Indicator */}
        <div className="mb-4 p-3 bg-blue-800/30 border border-blue-500/50 rounded-lg">
          <p className="text-blue-200 font-medium">{getTurnIndicator()}</p>
          <p className="text-sm text-gray-300 mt-1">
            {isMapSelectionPhase 
              ? `${availableMaps.length} maps remaining - ${teamThatShouldSelect === 'team1' ? 'Team 1' : 'Team 2'} select one`
              : `${totalBans}/5 bans completed - ${availableMaps.length} maps remaining`
            }
          </p>
        </div>

        {/* Banned Maps Display */}
        <div className="mb-6">
          <h4 className="font-medium mb-2">Banned Maps:</h4>
          <div className="flex flex-wrap gap-2 justify-center">
            {allBannedMaps.length > 0 ? (
              allBannedMaps.map((map: string) => (
                <span
                  key={map}
                  className="bg-red-600/20 border border-red-500/30 px-3 py-1 rounded text-sm"
                >
                  {map} ❌
                </span>
              ))
            ) : (
              <span className="text-gray-400">No maps banned yet</span>
            )}
          </div>
        </div>

        {/* Available Maps */}
        <div className="mb-6">
          <h4 className="font-medium mb-2">
            {isMapSelectionPhase ? 'Select Final Map:' : 'Available Maps:'}
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {availableMaps.map((map) => (
              <button
                key={map}
                onClick={() => handleMapAction(map)}
                disabled={isButtonDisabled(map)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  isButtonDisabled(map)
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                    : isMapSelectionPhase
                    ? 'bg-green-700 hover:bg-green-600 text-white'
                    : 'bg-gray-700 hover:bg-gray-600 text-white'
                }`}
              >
                {getActionButtonText(map)}
              </button>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className="text-sm text-gray-400">
          {isMapSelectionPhase ? (
            <div>
              <p><strong>DEBUG:</strong> Total bans: {totalBans}, Team 1 bans: {bannedMaps.team1.length}, Team 2 bans: {bannedMaps.team2.length}</p>
              <p><strong>DEBUG:</strong> Team that should select: {teamThatShouldSelect}</p>
              <p><strong>DEBUG:</strong> Is map selection turn: {isMapSelectionTurn ? 'Yes' : 'No'}</p>
              <p><strong>DEBUG:</strong> Current user team ID: {userTeam?.id}</p>
              <p><strong>DEBUG:</strong> Match Team 1 ID: {match.team1Id}</p>
              <p><strong>DEBUG:</strong> Match Team 2 ID: {match.team2Id}</p>
              <p><strong>DEBUG:</strong> Is Team 1: {isTeam1 ? 'Yes' : 'No'}</p>
              <p><strong>DEBUG:</strong> Is Team 2: {isTeam2 ? 'Yes' : 'No'}</p>
              <p><strong>DEBUG:</strong> User team name: {userTeam?.name}</p>
              <p><strong>DEBUG:</strong> Team 1 name: {team1?.name}</p>
              <p><strong>DEBUG:</strong> Team 2 name: {team2?.name}</p>
              <p><strong>DEBUG:</strong> Ban sequence length: {banSequence.length}</p>
              {banSequence.length > 0 && (
                <p><strong>DEBUG:</strong> Last ban: Team {banSequence[banSequence.length - 1].teamId === match.team1Id ? '1' : '2'} banned {banSequence[banSequence.length - 1].mapName}</p>
              )}
              <p>{teamThatShouldSelect === 'team1' ? 'Team 1' : 'Team 2'} selects the final map from the 2 remaining options.</p>
              <p>After selection, {teamThatShouldSelect === 'team1' ? 'Team 2' : 'Team 1'} will choose to start on attack or defense.</p>
            </div>
          ) : (
            <div>
              <p>Teams take turns banning maps. Ban order: Team 1 → Team 2 → Team 1 → Team 2 → Team 1 → Team 2 → Team 1 → Team 2</p>
              <p>After 5 bans, the team that did NOT ban last will select the final map from the 2 remaining options.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MapBanning; 