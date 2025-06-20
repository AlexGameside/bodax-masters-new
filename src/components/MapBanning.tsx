import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { banMap, selectMap } from '../services/firebaseService';

interface MapBanningProps {
  match: any;
  userTeam: any;
  onMapBanningComplete: () => void;
}

const MapBanning: React.FC<MapBanningProps> = ({ match, userTeam, onMapBanningComplete }) => {
  const [selectedMap, setSelectedMap] = useState<string>('');
  const [banningLoading, setBanningLoading] = useState(false);

  const maps = [
    'Ascent',
    'Icebox',
    'Sunset',
    'Haven',
    'Lotus',
    'Pearl',
    'Split'
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
  
  // Determine which team should pick the map (Team 1 picks when 2 maps remain)
  const isMapSelectionTurn = isMapSelectionPhase && isTeam1Turn;

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

    if (!isMapSelectionTurn || !isTeam1) {
      toast.error("Only Team 1 can select the final map.");
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
      if (isMapSelectionTurn) {
        return "Team 1's turn to select the final map";
      } else {
        return "Team 1 has selected the map. Team 2 will choose attack/defense next.";
      }
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
      if (isMapSelectionTurn && isTeam1) {
        return `Select ${mapName}`;
      } else {
        return `${mapName} (Waiting for Team 1 to select)`;
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
      return !isMapSelectionTurn || !isTeam1;
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
              ? `${availableMaps.length} maps remaining - ${isMapSelectionTurn ? 'Select one' : 'Waiting for Team 1'}`
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
              <p>Team 1 selects the final map from the 2 remaining options.</p>
              <p>After selection, Team 2 will choose to start on attack or defense.</p>
            </div>
          ) : (
            <div>
              <p>Teams take turns banning maps: Team 1 → Team 2 → Team 1 → Team 2...</p>
              <p>Continue until only 2 maps remain, then Team 1 selects the final map.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MapBanning; 