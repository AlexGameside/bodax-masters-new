import { useState } from 'react';
import { DEFAULT_MAP_POOL } from '../constants/mapPool';

const PickBanShowcase = () => {
  const [bannedMaps, setBannedMaps] = useState<string[]>([]);
  const [selectedMap, setSelectedMap] = useState<string | null>(null);
  const [currentTurn, setCurrentTurn] = useState<'team1' | 'team2'>('team1');
  const [banSequence, setBanSequence] = useState<Array<{ team: string; map: string; turn: number }>>([]);

  const availableMaps = DEFAULT_MAP_POOL.filter(map => !bannedMaps.includes(map) && map !== selectedMap);
  const remainingCount = availableMaps.length;

  const handleBan = (mapName: string) => {
    if (bannedMaps.includes(mapName) || selectedMap) return;
    
    const newBannedMaps = [...bannedMaps, mapName];
    setBannedMaps(newBannedMaps);
    setBanSequence([...banSequence, { team: currentTurn, map: mapName, turn: banSequence.length + 1 }]);
    
    // Check if only one map remains
    const remaining = DEFAULT_MAP_POOL.filter(map => !newBannedMaps.includes(map));
    if (remaining.length === 1) {
      setSelectedMap(remaining[0]);
    } else {
      // Switch turns
      setCurrentTurn(currentTurn === 'team1' ? 'team2' : 'team1');
    }
  };

  const resetDemo = () => {
    setBannedMaps([]);
    setSelectedMap(null);
    setCurrentTurn('team1');
    setBanSequence([]);
  };

  return (
    <div className="w-full h-full">
      <div className="bg-[#0a0a0a] border border-gray-800 rounded-lg p-3 h-full flex flex-col">
        {/* Header */}
        <div className="mb-2 text-center">
          <h3 className="text-sm font-bodax uppercase tracking-wide text-white mb-0.5">
            <span className="text-red-600">/</span> Pick & Ban (BO1)
          </h3>
          <p className="text-gray-400 font-mono text-[10px]">
            Teams alternate banning
          </p>
        </div>

        {/* Turn Indicator */}
        {!selectedMap && (
          <div className="mb-2 text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-900 border border-gray-700 rounded text-[10px]">
              <div className={`w-1.5 h-1.5 rounded-full ${currentTurn === 'team1' ? 'bg-red-500' : 'bg-blue-500'}`}></div>
              <span className="font-bodax text-white uppercase tracking-wide">
                {currentTurn === 'team1' ? 'Team Alpha' : 'Team Beta'}'s Turn
              </span>
            </div>
          </div>
        )}

        {/* Selected Map Display */}
        {selectedMap && (
          <div className="mb-2 text-center">
            <div className="inline-block px-4 py-2 bg-gradient-to-r from-red-900/30 to-red-800/30 border-2 border-red-600 rounded">
              <p className="text-gray-400 font-mono text-[9px] mb-0.5 uppercase tracking-wide">Selected Map</p>
              <p className="text-lg font-bodax text-red-500 uppercase tracking-wider">{selectedMap}</p>
            </div>
          </div>
        )}

        {/* Map Grid */}
        <div className="grid grid-cols-3 gap-2 mb-2 flex-1">
          {DEFAULT_MAP_POOL.map((map) => {
            const isBanned = bannedMaps.includes(map);
            const isSelected = selectedMap === map;
            const isAvailable = !isBanned && !isSelected && !selectedMap;

            return (
              <button
                key={map}
                onClick={() => isAvailable && !selectedMap && handleBan(map)}
                disabled={!isAvailable || selectedMap !== null}
                className={`
                  relative p-2 rounded border-2 transition-all duration-200 text-[10px]
                  ${isSelected 
                    ? 'bg-gradient-to-br from-red-900/40 to-red-800/40 border-red-600 cursor-default' 
                    : isBanned 
                    ? 'bg-gray-900/50 border-gray-700 opacity-50 cursor-not-allowed' 
                    : isAvailable && !selectedMap
                    ? 'bg-[#0f0f0f] border-gray-700 hover:border-red-600 hover:bg-red-900/10 cursor-pointer' 
                    : 'bg-[#0f0f0f] border-gray-800 opacity-60 cursor-not-allowed'
                  }
                `}
              >
                {isBanned && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-red-500 font-bodax text-sm">✕</span>
                  </div>
                )}
                {isSelected && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-[8px] font-bold">✓</span>
                  </div>
                )}
                <div className="text-center">
                  <p className={`font-bodax uppercase tracking-wide ${
                    isSelected ? 'text-red-500' : isBanned ? 'text-gray-600 line-through' : 'text-white'
                  }`}>
                    {map}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Stats */}
        <div className="flex justify-between items-center text-[10px] font-mono text-gray-400 mb-2">
          <div>
            <span className="text-gray-500">Banned: </span>
            <span className="text-white">{bannedMaps.length}</span>
          </div>
          <div>
            <span className="text-gray-500">Remaining: </span>
            <span className="text-white">{remainingCount}</span>
          </div>
        </div>

        {/* Reset Button */}
        <div className="text-center">
          <button
            onClick={resetDemo}
            className="px-3 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white font-mono text-[10px] uppercase tracking-wide transition-colors"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
};

export default PickBanShowcase;
