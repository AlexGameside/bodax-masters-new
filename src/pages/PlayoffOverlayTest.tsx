import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { toast } from 'react-hot-toast';
import { 
  MapPin, 
  XCircle, 
  CheckCircle, 
  Shield, 
  Sword,
  Play,
  RotateCcw,
  Eye
} from 'lucide-react';
import { DEFAULT_MAP_POOL } from '../constants/mapPool';

const PlayoffOverlayTest: React.FC = () => {
  const [matchId, setMatchId] = useState('');
  const [currentPhase, setCurrentPhase] = useState('banning');
  const [bannedMaps, setBannedMaps] = useState<{ team1: string[], team2: string[] }>({ team1: [], team2: [] });
  const [selectedMaps, setSelectedMaps] = useState({ map1: '', map2: '', decider: '' });
  const [mapSides, setMapSides] = useState({ map1Side: '', map2Side: '', deciderSide: '' });
  const [team1Name, setTeam1Name] = useState('Glacial Guardians');
  const [team2Name, setTeam2Name] = useState('Flood eSports');

  const maps = [...DEFAULT_MAP_POOL];

  const simulateBan = async (mapName: string, team: 'team1' | 'team2') => {
    if (!matchId) {
      toast.error('Please enter a match ID first');
      return;
    }

    try {
      const newBans = {
        ...bannedMaps,
        [team]: [...bannedMaps[team], mapName]
      };
      setBannedMaps(newBans);

      await updateDoc(doc(db, 'matches', matchId), {
        bannedMaps: newBans,
        updatedAt: new Date()
      });

      toast.success(`${team === 'team1' ? team1Name : team2Name} banned ${mapName}`);
    } catch (error) {
      console.error('Error updating bans:', error);
      toast.error('Failed to update bans');
    }
  };

  const simulateMapSelection = async (mapName: string, mapType: 'map1' | 'map2' | 'decider') => {
    if (!matchId) {
      toast.error('Please enter a match ID first');
      return;
    }

    try {
      const updateData: any = { [mapType]: mapName };
      
      if (mapType === 'map1') {
        setSelectedMaps(prev => ({ ...prev, map1: mapName }));
      } else if (mapType === 'map2') {
        setSelectedMaps(prev => ({ ...prev, map2: mapName }));
      } else if (mapType === 'decider') {
        setSelectedMaps(prev => ({ ...prev, decider: mapName }));
      }

      await updateDoc(doc(db, 'matches', matchId), {
        ...updateData,
        updatedAt: new Date()
      });

      toast.success(`Selected ${mapName} as ${mapType}`);
    } catch (error) {
      console.error('Error updating map selection:', error);
      toast.error('Failed to update map selection');
    }
  };

  const simulateSideSelection = async (side: 'attack' | 'defense', mapType: 'map1Side' | 'map2Side' | 'deciderSide') => {
    if (!matchId) {
      toast.error('Please enter a match ID first');
      return;
    }

    try {
      setMapSides(prev => ({ ...prev, [mapType]: side }));

      await updateDoc(doc(db, 'matches', matchId), {
        [mapType]: side,
        updatedAt: new Date()
      });

      toast.success(`Set ${mapType} to ${side}`);
    } catch (error) {
      console.error('Error updating side selection:', error);
      toast.error('Failed to update side selection');
    }
  };

  const resetMatch = async () => {
    if (!matchId) {
      toast.error('Please enter a match ID first');
      return;
    }

    try {
      await updateDoc(doc(db, 'matches', matchId), {
        bannedMaps: { team1: [], team2: [] },
        map1: null,
        map2: null,
        deciderMap: null,
        map1Side: null,
        map2Side: null,
        deciderMapSide: null,
        updatedAt: new Date()
      });

      setBannedMaps({ team1: [], team2: [] });
      setSelectedMaps({ map1: '', map2: '', decider: '' });
      setMapSides({ map1Side: '', map2Side: '', deciderSide: '' });
      setCurrentPhase('banning');

      toast.success('Match reset successfully');
    } catch (error) {
      console.error('Error resetting match:', error);
      toast.error('Failed to reset match');
    }
  };

  const openOverlay = () => {
    if (!matchId) {
      toast.error('Please enter a match ID first');
      return;
    }
    window.open(`/playoff-stream/${matchId}`, '_blank');
  };

  const allBannedMaps = [...bannedMaps.team1, ...bannedMaps.team2];
  const availableMaps = maps.filter(map => !allBannedMaps.includes(map));

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Playoff Overlay Test</h1>
          <p className="text-gray-400 mb-6">
            Test the playoff streaming overlay by simulating map bans and selections
          </p>
        </div>

        {/* Match ID Input */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Match Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Match ID</label>
              <input
                type="text"
                value={matchId}
                onChange={(e) => setMatchId(e.target.value)}
                placeholder="Enter match ID"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Team 1 Name</label>
              <input
                type="text"
                value={team1Name}
                onChange={(e) => setTeam1Name(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Team 2 Name</label>
              <input
                type="text"
                value={team2Name}
                onChange={(e) => setTeam2Name(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-4 mt-4">
            <button
              onClick={openOverlay}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
            >
              <Eye className="w-4 h-4" />
              Open Overlay
            </button>
            <button
              onClick={resetMatch}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset Match
            </button>
          </div>
        </div>

        {/* Map Banning Simulation */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Map Banning Simulation</h2>
          <div className="grid grid-cols-2 gap-6">
            {/* Team 1 Bans */}
            <div>
              <h3 className="text-lg font-medium mb-3 text-blue-400">{team1Name} Bans</h3>
              <div className="space-y-2">
                {bannedMaps.team1.map((map, index) => (
                  <div key={map} className="flex items-center justify-between p-2 bg-red-900/30 rounded-lg">
                    <span className="text-red-200">{map}</span>
                    <span className="text-xs text-red-400">Ban #{index + 1}</span>
                  </div>
                ))}
                {availableMaps.map(map => (
                  <button
                    key={map}
                    onClick={() => simulateBan(map, 'team1')}
                    className="w-full flex items-center justify-between p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    <span>{map}</span>
                    <XCircle className="w-4 h-4 text-red-400" />
                  </button>
                ))}
              </div>
            </div>

            {/* Team 2 Bans */}
            <div>
              <h3 className="text-lg font-medium mb-3 text-red-400">{team2Name} Bans</h3>
              <div className="space-y-2">
                {bannedMaps.team2.map((map, index) => (
                  <div key={map} className="flex items-center justify-between p-2 bg-red-900/30 rounded-lg">
                    <span className="text-red-200">{map}</span>
                    <span className="text-xs text-red-400">Ban #{index + 1}</span>
                  </div>
                ))}
                {availableMaps.map(map => (
                  <button
                    key={map}
                    onClick={() => simulateBan(map, 'team2')}
                    className="w-full flex items-center justify-between p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    <span>{map}</span>
                    <XCircle className="w-4 h-4 text-red-400" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Map Selection Simulation */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Map Selection Simulation</h2>
          <div className="grid grid-cols-3 gap-4">
            {/* Map 1 */}
            <div>
              <h3 className="text-lg font-medium mb-3 text-blue-400">Map 1</h3>
              {selectedMaps.map1 ? (
                <div className="p-3 bg-blue-900/30 rounded-lg border border-blue-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-blue-300">{selectedMaps.map1}</span>
                    <CheckCircle className="w-4 h-4 text-blue-400" />
                  </div>
                  {!mapSides.map1Side && (
                    <div className="space-y-2">
                      <button
                        onClick={() => simulateSideSelection('attack', 'map1Side')}
                        className="w-full flex items-center gap-2 p-2 bg-orange-600 hover:bg-orange-500 rounded text-sm"
                      >
                        <Sword className="w-4 h-4" />
                        Attack
                      </button>
                      <button
                        onClick={() => simulateSideSelection('defense', 'map1Side')}
                        className="w-full flex items-center gap-2 p-2 bg-blue-600 hover:bg-blue-500 rounded text-sm"
                      >
                        <Shield className="w-4 h-4" />
                        Defense
                      </button>
                    </div>
                  )}
                  {mapSides.map1Side && (
                    <div className="flex items-center gap-2 text-sm">
                      {mapSides.map1Side === 'attack' ? (
                        <Sword className="w-4 h-4 text-orange-400" />
                      ) : (
                        <Shield className="w-4 h-4 text-blue-400" />
                      )}
                      <span className="text-gray-300">{mapSides.map1Side}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {availableMaps.map(map => (
                    <button
                      key={map}
                      onClick={() => simulateMapSelection(map, 'map1')}
                      className="w-full p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                    >
                      {map}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Map 2 */}
            <div>
              <h3 className="text-lg font-medium mb-3 text-purple-400">Map 2</h3>
              {selectedMaps.map2 ? (
                <div className="p-3 bg-purple-900/30 rounded-lg border border-purple-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-purple-300">{selectedMaps.map2}</span>
                    <CheckCircle className="w-4 h-4 text-purple-400" />
                  </div>
                  {!mapSides.map2Side && (
                    <div className="space-y-2">
                      <button
                        onClick={() => simulateSideSelection('attack', 'map2Side')}
                        className="w-full flex items-center gap-2 p-2 bg-orange-600 hover:bg-orange-500 rounded text-sm"
                      >
                        <Sword className="w-4 h-4" />
                        Attack
                      </button>
                      <button
                        onClick={() => simulateSideSelection('defense', 'map2Side')}
                        className="w-full flex items-center gap-2 p-2 bg-blue-600 hover:bg-blue-500 rounded text-sm"
                      >
                        <Shield className="w-4 h-4" />
                        Defense
                      </button>
                    </div>
                  )}
                  {mapSides.map2Side && (
                    <div className="flex items-center gap-2 text-sm">
                      {mapSides.map2Side === 'attack' ? (
                        <Sword className="w-4 h-4 text-orange-400" />
                      ) : (
                        <Shield className="w-4 h-4 text-blue-400" />
                      )}
                      <span className="text-gray-300">{mapSides.map2Side}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {availableMaps.map(map => (
                    <button
                      key={map}
                      onClick={() => simulateMapSelection(map, 'map2')}
                      className="w-full p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                    >
                      {map}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Decider Map */}
            <div>
              <h3 className="text-lg font-medium mb-3 text-yellow-400">Decider Map</h3>
              {selectedMaps.decider ? (
                <div className="p-3 bg-yellow-900/30 rounded-lg border border-yellow-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-yellow-300">{selectedMaps.decider}</span>
                    <CheckCircle className="w-4 h-4 text-yellow-400" />
                  </div>
                  {!mapSides.deciderSide && (
                    <div className="space-y-2">
                      <button
                        onClick={() => simulateSideSelection('attack', 'deciderSide')}
                        className="w-full flex items-center gap-2 p-2 bg-orange-600 hover:bg-orange-500 rounded text-sm"
                      >
                        <Sword className="w-4 h-4" />
                        Attack
                      </button>
                      <button
                        onClick={() => simulateSideSelection('defense', 'deciderSide')}
                        className="w-full flex items-center gap-2 p-2 bg-blue-600 hover:bg-blue-500 rounded text-sm"
                      >
                        <Shield className="w-4 h-4" />
                        Defense
                      </button>
                    </div>
                  )}
                  {mapSides.deciderSide && (
                    <div className="flex items-center gap-2 text-sm">
                      {mapSides.deciderSide === 'attack' ? (
                        <Sword className="w-4 h-4 text-orange-400" />
                      ) : (
                        <Shield className="w-4 h-4 text-blue-400" />
                      )}
                      <span className="text-gray-300">{mapSides.deciderSide}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {availableMaps.map(map => (
                    <button
                      key={map}
                      onClick={() => simulateMapSelection(map, 'decider')}
                      className="w-full p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                    >
                      {map}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Current Status */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Current Status</h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium mb-3">Banned Maps</h3>
              <div className="space-y-1">
                {allBannedMaps.map((map, index) => (
                  <div key={map} className="text-red-400 text-sm">
                    {index + 1}. {map}
                  </div>
                ))}
                {allBannedMaps.length === 0 && (
                  <div className="text-gray-400 text-sm">No maps banned yet</div>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-3">Selected Maps</h3>
              <div className="space-y-1">
                {selectedMaps.map1 && (
                  <div className="text-blue-400 text-sm">
                    Map 1: {selectedMaps.map1} {mapSides.map1Side && `(${mapSides.map1Side})`}
                  </div>
                )}
                {selectedMaps.map2 && (
                  <div className="text-purple-400 text-sm">
                    Map 2: {selectedMaps.map2} {mapSides.map2Side && `(${mapSides.map2Side})`}
                  </div>
                )}
                {selectedMaps.decider && (
                  <div className="text-yellow-400 text-sm">
                    Decider: {selectedMaps.decider} {mapSides.deciderSide && `(${mapSides.deciderSide})`}
                  </div>
                )}
                {!selectedMaps.map1 && !selectedMaps.map2 && !selectedMaps.decider && (
                  <div className="text-gray-400 text-sm">No maps selected yet</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayoffOverlayTest;
