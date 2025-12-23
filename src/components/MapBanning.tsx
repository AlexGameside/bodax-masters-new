import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { banMap, selectMap } from '../services/firebaseService';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { DEFAULT_MAP_POOL } from '../constants/mapPool';

interface MapBanningProps {
  match: any;
  userTeam: any | null;
  team1?: any;
  team2?: any;
  onMapBanningComplete: () => void;
}

const MapBanning: React.FC<MapBanningProps> = ({ match, userTeam, team1, team2, onMapBanningComplete }) => {
  const [banningLoading, setBanningLoading] = useState(false);
  const [localMatch, setLocalMatch] = useState(match);

  // Listen for real-time match updates
  useEffect(() => {
    if (!match?.id) return;

    const matchRef = doc(db, 'matches', match.id);
    const unsubscribe = onSnapshot(matchRef, (docSnap) => {
      if (docSnap.exists()) {
        const updatedMatch = { ...docSnap.data(), id: docSnap.id };
        setLocalMatch(updatedMatch);
      }
    });

    return () => unsubscribe();
  }, [match?.id]);

  // Use localMatch for all calculations instead of the prop
  const currentMatch = localMatch || match;

  const matchFormat: 'BO1' | 'BO3' =
    currentMatch?.matchFormat === 'BO3' || currentMatch?.bracketType === 'grand_final' ? 'BO3' : 'BO1';
  const isBO3 = matchFormat === 'BO3';

  // IMPORTANT: Do not early-return before all hooks run (Rules of Hooks).
  const hasUserTeam = !!userTeam;
  const isUserInMatch =
    !!userTeam &&
    (userTeam.id === currentMatch.team1Id || userTeam.id === currentMatch.team2Id);

  // Map pool (prefer match-provided pool)
  const maps: string[] =
    Array.isArray(currentMatch.mapPool) && currentMatch.mapPool.length > 0
      ? currentMatch.mapPool
      : [...DEFAULT_MAP_POOL];

  const isTeam1 = !!userTeam && userTeam.id === currentMatch.team1Id;
  const isTeam2 = !!userTeam && userTeam.id === currentMatch.team2Id;
  
  // Get current banned maps
  const bannedMaps = currentMatch.bannedMaps || { team1: [], team2: [] };
  const allBannedMaps = [...bannedMaps.team1, ...bannedMaps.team2];
  
  // Available maps (not banned AND not picked)
  const availableMaps = maps.filter(map => 
    !allBannedMaps.includes(map) && 
    map !== currentMatch.map1 && 
    map !== currentMatch.map2 && 
    map !== currentMatch.deciderMap
  );


  // BO3 Phase Logic - Corrected and simplified
  const totalBans = allBannedMaps.length;
  
  // Determine current phase and what needs to happen
  let phaseInfo: {
    phase: string;
    description: string;
    isBanPhase: boolean;
    isMapSelectionPhase: boolean;
    isSideSelectionPhase: boolean;
    isUserTeamTurn: boolean;
    actionText: string;
    currentStep: string;
  };
  
  // BO3 Flow Logic (German rules):
  // 1. Team A bans 1 map (7 → 6 maps)
  // 2. Team B bans 1 map (6 → 5 maps) 
  // 3. Team A picks Map 1 from 5 remaining maps
  // 4. Team B picks side for Map 1
  // 5. Team B picks Map 2 from 5 remaining maps (immediately, no more banning yet)
  // 6. Team A picks side for Map 2
  // 7. Team A bans 1 map (5 → 4 maps)
  // 8. Team B bans 1 map (4 → 3 maps)
  // 9. Remaining map = Decider Map (automatically)
  // 10. Team A picks side for Decider Map

  // Default phaseInfo so we never read an uninitialized variable
  phaseInfo = {
    phase: 'Unknown',
    description: 'Waiting for team / match context',
    isBanPhase: false,
    isMapSelectionPhase: false,
    isSideSelectionPhase: false,
    isUserTeamTurn: false,
    actionText: 'Waiting',
    currentStep: 'Waiting'
  };

  if (isBO3 && isUserInMatch && !currentMatch.map1) {
    // Phase 1: Map 1 Selection
    if (totalBans < 2) {
      // Still banning maps for Map 1
      const isTeam1Turn = totalBans === 0; // Team A bans first, then Team B
      const isUserTeamTurn = (isTeam1 && isTeam1Turn) || (isTeam2 && !isTeam1Turn);
      
      phaseInfo = {
        phase: 'Map 1 Banning',
        description: 'Ban maps until 5 remain for Map 1 selection',
        isBanPhase: true,
        isMapSelectionPhase: false,
        isSideSelectionPhase: false,
        isUserTeamTurn,
        actionText: totalBans === 0 ? 'Ban first map' : 'Ban second map',
        currentStep: totalBans === 0 ? 'Team A bans 1 map' : 'Team B bans 1 map'
      };
    } else if (totalBans >= 2) {
      // Map 1 selection phase - after 2 bans, 5 maps remain
      // Team A should pick Map 1 (they banned first)
      const isUserTeamTurn = currentMatch.team1Id === userTeam.id;
      
      phaseInfo = {
        phase: 'Map 1 Selection',
        description: 'Choose Map 1 from remaining maps',
        isBanPhase: false,
        isMapSelectionPhase: true,
        isSideSelectionPhase: false,
        isUserTeamTurn,
        actionText: 'Select Map 1',
        currentStep: 'Team A picks Map 1'
      };
    } else {
      // Fallback case
      phaseInfo = {
        phase: 'Unknown',
        description: 'Unknown state',
        isBanPhase: false,
        isMapSelectionPhase: false,
        isSideSelectionPhase: false,
        isUserTeamTurn: false,
        actionText: 'Unknown',
        currentStep: 'Unknown state'
      };
    }
  } else if (isBO3 && isUserInMatch && currentMatch.map1 && !currentMatch.map1Side) {
    // Side selection for Map 1
    const isUserTeamTurn = currentMatch.team2Id === userTeam.id; // Team B picks side for Map 1
    
    phaseInfo = {
      phase: 'Map 1 Side Selection',
      description: 'Select side for Map 1',
      isBanPhase: false,
      isMapSelectionPhase: false,
      isSideSelectionPhase: true,
      isUserTeamTurn,
      actionText: 'Pick side for Map 1',
      currentStep: 'Team B picks side for Map 1'
    };
  } else if (isBO3 && isUserInMatch && currentMatch.map1 && currentMatch.map1Side && !currentMatch.map2) {
    // Map 2 selection phase - Team B picks Map 2 immediately after Map 1 side selection
    // Team B should pick Map 2 from 5 remaining maps
    const isUserTeamTurn = currentMatch.team2Id === userTeam.id;
    
    phaseInfo = {
      phase: 'Map 2 Selection',
      description: 'Choose Map 2 from remaining maps',
      isBanPhase: false,
      isMapSelectionPhase: true,
      isSideSelectionPhase: false,
      isUserTeamTurn,
      actionText: 'Select Map 2',
      currentStep: 'Team B picks Map 2'
    };
  } else if (isBO3 && isUserInMatch && currentMatch.map2 && !currentMatch.map2Side) {
    // Side selection for Map 2
    const isUserTeamTurn = currentMatch.team1Id === userTeam.id; // Team A picks side for Map 2
    
    phaseInfo = {
      phase: 'Map 2 Side Selection',
      description: 'Select side for Map 2',
      isBanPhase: false,
      isMapSelectionPhase: false,
      isSideSelectionPhase: true,
      isUserTeamTurn,
      actionText: 'Pick side for Map 2',
      currentStep: 'Team A picks side for Map 2'
    };
  } else if (isBO3 && isUserInMatch && currentMatch.map2 && currentMatch.map2Side && !currentMatch.deciderMap) {
    // Phase 3: Ban 2 more maps for Decider
    if (totalBans < 4) {
      // Still banning maps for Decider
      const isTeam1Turn = totalBans === 2; // Team A bans first for Decider, then Team B
      const isUserTeamTurn = (isTeam1 && isTeam1Turn) || (isTeam2 && !isTeam1Turn);
      
      phaseInfo = {
        phase: 'Decider Banning',
        description: 'Ban maps until 3 remain for Decider selection',
        isBanPhase: true,
        isMapSelectionPhase: false,
        isSideSelectionPhase: false,
        isUserTeamTurn,
        actionText: totalBans === 2 ? 'Ban third map' : 'Ban fourth map',
        currentStep: totalBans === 2 ? 'Team A bans 1 map' : 'Team B bans 1 map'
      };
    } else if (totalBans >= 4) {
      // Decider map selection - after 4 bans, 3 maps remain
      // Remaining map automatically becomes Decider
      const remainingMaps = maps.filter(map => 
        !allBannedMaps.includes(map) && 
        map !== currentMatch.map1 && 
        map !== currentMatch.map2
      );
      
      if (remainingMaps.length === 1) {
        // Automatically set decider map
        const deciderMap = remainingMaps[0];
        // Update the match with decider map
        updateDoc(doc(db, 'matches', currentMatch.id), {
          deciderMap: deciderMap
        });
        
        phaseInfo = {
          phase: 'Decider Side Selection',
          description: 'Select side for Decider Map',
          isBanPhase: false,
          isMapSelectionPhase: false,
          isSideSelectionPhase: true,
          isUserTeamTurn: currentMatch.team1Id === userTeam.id, // Team A picks side for Decider
          actionText: 'Pick side for Decider',
          currentStep: 'Team A picks side for Decider Map'
        };
      } else {
        // Should not happen, but fallback
        phaseInfo = {
          phase: 'Decider Selection',
          description: 'Selecting Decider Map',
          isBanPhase: false,
          isMapSelectionPhase: true,
          isSideSelectionPhase: false,
          isUserTeamTurn: false,
          actionText: 'Select Decider',
          currentStep: 'Select Decider Map'
        };
      }
    } else {
      // Fallback case
      phaseInfo = {
        phase: 'Unknown',
        description: 'Unknown state',
        isBanPhase: false,
        isMapSelectionPhase: false,
        isSideSelectionPhase: false,
        isUserTeamTurn: false,
        actionText: 'Unknown',
        currentStep: 'Unknown state'
      };
    }
  } else if (isBO3 && isUserInMatch && currentMatch.deciderMap && !currentMatch.deciderMapSide) {
    // Side selection for Decider Map
    const isUserTeamTurn = currentMatch.team1Id === userTeam.id; // Team A picks side for Decider
    
    phaseInfo = {
      phase: 'Decider Side Selection',
      description: 'Select side for Decider Map',
      isBanPhase: false,
      isMapSelectionPhase: false,
      isSideSelectionPhase: true,
      isUserTeamTurn,
      actionText: 'Pick side for Decider',
      currentStep: 'Team A picks side for Decider Map'
    };
  } else if (isBO3 && isUserInMatch) {
    // All phases complete
    phaseInfo = {
      phase: 'Complete',
      description: 'All maps and sides selected',
      isBanPhase: false,
      isMapSelectionPhase: false,
      isSideSelectionPhase: false,
      isUserTeamTurn: false,
      actionText: 'Complete',
      currentStep: 'All phases complete'
    };
  }

  // BO1 flow (until finals): ban until 1 map remains, backend auto-selects `selectedMap`
  const bansNeededBO1 = Math.max(0, maps.length - 1);
  const remainingMapsBO1 = maps.filter(m => !allBannedMaps.includes(m));
  const isTeam1TurnBO1 = totalBans % 2 === 0; // Team 1 starts
  const isUserTeamTurnBO1 = (isTeam1 && isTeam1TurnBO1) || (isTeam2 && !isTeam1TurnBO1);

  const getTurnIndicator = () => {
    if (phaseInfo.isBanPhase) {
      return phaseInfo.isUserTeamTurn 
        ? `🎯 Your turn to BAN a map` 
        : `⏳ Waiting for ${isTeam1 ? 'Team B' : 'Team A'} to ban a map`;
    } else if (phaseInfo.isMapSelectionPhase) {
      return phaseInfo.isUserTeamTurn 
        ? `🎯 Your turn to SELECT a map` 
        : `⏳ Waiting for ${isTeam1 ? 'Team A' : 'Team B'} to select a map`;
    } else if (phaseInfo.isSideSelectionPhase) {
      return phaseInfo.isUserTeamTurn 
        ? `🎯 Your turn to pick ATTACK or DEFENSE` 
        : `⏳ Waiting for ${isTeam1 ? 'Team B' : 'Team A'} to pick their side`;
    }
    return '⏳ Waiting...';
  };

  const getActionButtonText = (mapName: string) => {
    if (phaseInfo.isBanPhase) {
      return 'BAN';
    } else if (phaseInfo.isMapSelectionPhase) {
      return 'SELECT';
    }
    return '';
  };

  const handleBanMap = async (mapName: string) => {
    if (!isBO3) return;
    if (!phaseInfo.isBanPhase || !phaseInfo.isUserTeamTurn) return;
    
    setBanningLoading(true);
    try {
      await banMap(currentMatch.id, userTeam.id, mapName);
      toast.success(`Banned ${mapName}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to ban map');
    } finally {
      setBanningLoading(false);
    }
  };

  const handleBanMapBO1 = async (mapName: string) => {
    if (isBO3) return;
    if (!isUserTeamTurnBO1) return;
    if (banningLoading) return;
    if (allBannedMaps.includes(mapName)) return;
    if (currentMatch.selectedMap) return; // already selected by backend

    setBanningLoading(true);
    try {
      await banMap(currentMatch.id, userTeam.id, mapName);
      toast.success(`Banned ${mapName}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to ban map');
    } finally {
      setBanningLoading(false);
    }
  };

  const handleSelectMap = async (mapName: string) => {
    if (!phaseInfo.isMapSelectionPhase || !phaseInfo.isUserTeamTurn) return;
    
    setBanningLoading(true);
    try {
      await selectMap(currentMatch.id, userTeam.id, mapName);
      toast.success(`Selected ${mapName}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to select map');
    } finally {
      setBanningLoading(false);
    }
  };

  const handleSideSelection = async (side: string) => {
    if (!phaseInfo.isSideSelectionPhase || !phaseInfo.isUserTeamTurn) return;
    
    setBanningLoading(true);
    try {
      const updateData: any = {};
      
      if (phaseInfo.phase === 'Map 1 Side Selection') {
        updateData.map1Side = side;
      } else if (phaseInfo.phase === 'Map 2 Side Selection') {
        updateData.map2Side = side;
      } else if (phaseInfo.phase === 'Decider Side Selection') {
        updateData.deciderMapSide = side;
      }
      
      await updateDoc(doc(db, 'matches', currentMatch.id), updateData);
      toast.success(`Selected ${side} side`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to select side');
    } finally {
      setBanningLoading(false);
    }
  };

  const isButtonDisabled = (mapName: string) => {
    if (banningLoading) return true;
    if (phaseInfo.isBanPhase || phaseInfo.isMapSelectionPhase) {
      return !phaseInfo.isUserTeamTurn;
    }
    return false;
  };

  const handleMapAction = (mapName: string) => {
    if (phaseInfo.isBanPhase) {
      handleBanMap(mapName);
    } else if (phaseInfo.isMapSelectionPhase) {
      handleSelectMap(mapName);
    }
  };

  // Handle transition to playing state when map banning is complete
  useEffect(() => {
    if (!isBO3) return;
    if (!isUserInMatch) return;
    if (phaseInfo.phase === 'Complete' && currentMatch.matchState !== 'playing') {
      const transitionToPlaying = async () => {
        try {
          // Ensure all map selection data is preserved during transition
          const updateData = {
            matchState: 'playing',
            // Explicitly preserve all map selection data
            map1: currentMatch.map1,
            map1Side: currentMatch.map1Side,
            map2: currentMatch.map2,
            map2Side: currentMatch.map2Side,
            deciderMap: currentMatch.deciderMap,
            deciderMapSide: currentMatch.deciderMapSide,
            updatedAt: new Date()
          };
          
          await updateDoc(doc(db, 'matches', currentMatch.id), updateData);
          toast.success('Match is now starting!');
        } catch (error) {

        }
      };
      
      transitionToPlaying();
    }
  }, [isBO3, isUserInMatch, phaseInfo.phase, currentMatch.matchState, currentMatch.id, currentMatch.map1, currentMatch.map1Side, currentMatch.map2, currentMatch.map2Side, currentMatch.deciderMap, currentMatch.deciderMapSide]);

  // Render guards AFTER hooks (Rules of Hooks)
  if (!hasUserTeam) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 mb-4">No team information available</div>
        <div className="text-sm text-gray-500">Please ensure you are part of a team in this match</div>
      </div>
    );
  }

  if (!isUserInMatch) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 mb-4">Not part of this match</div>
        <div className="text-sm text-gray-500">You are not a member of either team in this match</div>
      </div>
    );
  }

  // BO1 UI (until finals)
  if (!isBO3) {
    return (
      <div className="bg-[#0a0a0a] border border-gray-800 p-6 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage:
              'linear-gradient(rgba(50, 50, 50, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(50, 50, 50, 0.5) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}
        />

        <div className="relative">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h3 className="text-3xl font-bold text-white font-bodax tracking-wide uppercase leading-none">
                Map Banning <span className="text-red-500">BO1</span>
              </h3>
              <p className="mt-2 text-sm text-gray-400 font-mono uppercase tracking-widest">
                Ban until 1 map remains · then pick starting sides
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500 font-mono uppercase tracking-widest">Turn</div>
              <div className={`mt-1 text-sm font-mono uppercase tracking-widest ${isUserTeamTurnBO1 ? 'text-red-500' : 'text-gray-400'}`}>
                {isUserTeamTurnBO1 ? 'Your Team' : 'Opponent'}
              </div>
            </div>
          </div>

          <div className="mb-6 bg-black/30 border border-gray-800 p-4">
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500 font-mono uppercase tracking-widest">Bans</div>
              <div className="text-xs text-gray-400 font-mono uppercase tracking-widest">
                {Math.min(totalBans, bansNeededBO1)}/{bansNeededBO1}
              </div>
            </div>
            <div className="mt-3 h-1 bg-gray-900 border border-gray-800">
              <div
                className="h-1 bg-red-600"
                style={{ width: `${bansNeededBO1 === 0 ? 100 : Math.min(100, (totalBans / bansNeededBO1) * 100)}%` }}
              />
            </div>
          </div>

          {currentMatch.selectedMap ? (
            <div className="mb-6 bg-green-900/10 border border-green-900 p-4">
              <div className="text-green-300 font-mono uppercase tracking-widest text-sm">Selected Map</div>
              <div className="mt-1 text-white font-bodax text-3xl uppercase tracking-wide">{currentMatch.selectedMap}</div>
              <div className="mt-2 text-xs text-gray-400 font-mono uppercase tracking-widest">
                Moving to side selection...
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {maps.map((mapName) => {
                const isBanned = allBannedMaps.includes(mapName);
                const isActionable = !isBanned && isUserTeamTurnBO1 && !banningLoading && totalBans < bansNeededBO1;

                return (
                  <button
                    key={mapName}
                    type="button"
                    onClick={() => isActionable && handleBanMapBO1(mapName)}
                    disabled={!isActionable}
                    className={`text-left border p-4 transition-colors relative ${
                      isBanned
                        ? 'bg-red-900/20 border-red-600/50 text-gray-300 cursor-not-allowed'
                        : isActionable
                          ? 'bg-[#0a0a0a] border-gray-800 hover:border-red-600'
                          : 'bg-[#0a0a0a] border-gray-800 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {isBanned && (
                      <div className="absolute top-2 right-2 px-2 py-1 bg-red-600 border border-red-500">
                        <span className="text-red-100 font-bold text-xs font-mono uppercase tracking-widest">BANNED</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-3">
                      <div className={`font-bodax text-2xl uppercase tracking-wide ${isBanned ? 'text-gray-400 line-through' : 'text-white'}`}>{mapName}</div>
                      {!isBanned && (
                        <div className="text-xs font-mono uppercase tracking-widest text-red-500">
                          Ban
                        </div>
                      )}
                    </div>
                    <div className={`mt-2 text-xs font-mono uppercase tracking-widest ${isBanned ? 'text-red-400' : 'text-gray-500'}`}>
                      {isBanned ? 'Unavailable' : isUserTeamTurnBO1 ? 'Click to ban' : 'Waiting'}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Don't render if all phases are complete
  if (phaseInfo.phase === 'Complete') {
    return (
      <div className="bg-[#0a0a0a] border border-gray-800 p-6 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage:
              'linear-gradient(rgba(50, 50, 50, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(50, 50, 50, 0.5) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}
        />
        <div className="relative text-center">
          <h3 className="text-3xl font-bold text-white font-bodax tracking-wide uppercase leading-none">
            Map Banning <span className="text-red-500">Complete</span>
          </h3>
          <div className="mt-3 text-gray-400 font-mono uppercase tracking-widest text-sm">
            BO3 maps and sides locked in
          </div>
          <div className="mt-6 bg-black/30 border border-gray-800 p-4 text-left max-w-2xl mx-auto">
            <div className="text-xs text-gray-500 font-mono uppercase tracking-widest">Summary</div>
            <div className="mt-2 text-white font-mono">
              <div>Map 1: <span className="text-red-500">{currentMatch.map1}</span> ({currentMatch.map1Side})</div>
              <div>Map 2: <span className="text-red-500">{currentMatch.map2}</span> ({currentMatch.map2Side})</div>
              <div>Decider: <span className="text-red-500">{currentMatch.deciderMap}</span> ({currentMatch.deciderMapSide})</div>
            </div>
          </div>
          <div className="mt-5 text-gray-500 font-mono uppercase tracking-widest text-xs">
            Transitioning to playing...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0a0a0a] border border-gray-800 p-6 relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            'linear-gradient(rgba(50, 50, 50, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(50, 50, 50, 0.5) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />
      <div className="relative">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h3 className="text-3xl font-bold text-white font-bodax tracking-wide uppercase leading-none">
              Map Banning <span className="text-red-500">BO3</span>
            </h3>
            <p className="mt-2 text-sm text-gray-400 font-mono uppercase tracking-widest">{phaseInfo.currentStep}</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500 font-mono uppercase tracking-widest">Turn</div>
            <div className={`mt-1 text-sm font-mono uppercase tracking-widest ${phaseInfo.isUserTeamTurn ? 'text-red-500' : 'text-gray-400'}`}>
              {phaseInfo.isUserTeamTurn ? 'Your Team' : 'Opponent'}
            </div>
          </div>
        </div>
      {/* MAP SUMMARY - Always visible at the top */}
      <div className="mb-6 p-4 bg-black/30 border border-gray-800">
        <h4 className="text-white font-bold mb-3 text-center font-mono uppercase tracking-widest text-sm">Map & Side Summary</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div className={`p-3 border ${currentMatch.map1 && currentMatch.map1Side ? 'bg-green-900/10 border-green-900' : 'bg-black/30 border-gray-800'}`}>
            <div className="text-xs text-gray-500 mb-1 font-mono uppercase tracking-widest">Map 1</div>
            <div className="text-white font-bodax text-2xl uppercase tracking-wide">{currentMatch.map1 || '—'}</div>
            <div className="text-xs text-gray-400 font-mono uppercase tracking-widest mt-1">
              {currentMatch.map1 && currentMatch.map1Side ? (
                <div>
                  <div className="text-gray-300">Team 2: {currentMatch.map1Side}</div>
                  <div className="text-gray-300">Team 1: {currentMatch.map1Side === 'Attack' ? 'Defense' : 'Attack'}</div>
                </div>
              ) : 'No Side'}
            </div>
          </div>
          <div className={`p-3 border ${currentMatch.map2 && currentMatch.map2Side ? 'bg-green-900/10 border-green-900' : 'bg-black/30 border-gray-800'}`}>
            <div className="text-xs text-gray-500 mb-1 font-mono uppercase tracking-widest">Map 2</div>
            <div className="text-white font-bodax text-2xl uppercase tracking-wide">{currentMatch.map2 || '—'}</div>
            <div className="text-xs text-gray-400 font-mono uppercase tracking-widest mt-1">
              {currentMatch.map2 && currentMatch.map2Side ? (
                <div>
                  <div className="text-gray-300">Team 1: {currentMatch.map2Side}</div>
                  <div className="text-gray-300">Team 2: {currentMatch.map2Side === 'Attack' ? 'Defense' : 'Attack'}</div>
                </div>
              ) : 'No Side'}
            </div>
          </div>
          <div className={`p-3 border ${currentMatch.deciderMap && currentMatch.deciderMapSide ? 'bg-green-900/10 border-green-900' : 'bg-black/30 border-gray-800'}`}>
            <div className="text-xs text-gray-500 mb-1 font-mono uppercase tracking-widest">Decider</div>
            <div className="text-white font-bodax text-2xl uppercase tracking-wide">{currentMatch.deciderMap || '—'}</div>
            <div className="text-xs text-gray-400 font-mono uppercase tracking-widest mt-1">
              {currentMatch.deciderMap && currentMatch.deciderMapSide ? (
                <div>
                  <div className="text-gray-300">Team 1: {currentMatch.deciderMapSide}</div>
                  <div className="text-gray-300">Team 2: {currentMatch.deciderMapSide === 'Attack' ? 'Defense' : 'Attack'}</div>
                </div>
              ) : 'No Side'}
            </div>
          </div>
        </div>
      </div>
      </div>

      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-white mb-2">BO3 Map Banning Phase</h3>
        <div className="text-blue-200 text-lg mb-4">{phaseInfo.description}</div>
        
        {/* PHASE INDICATOR - Enhanced with colors */}
        <div className={`text-xl font-bold p-3 rounded-lg ${
          phaseInfo.isBanPhase 
            ? 'bg-red-600/20 text-red-300 border border-red-500/30' 
            : phaseInfo.isMapSelectionPhase 
            ? 'bg-green-600/20 text-green-300 border border-green-500/30'
            : 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
        }`}>
          {phaseInfo.isBanPhase && '🚫 BANNING PHASE'}
          {phaseInfo.isMapSelectionPhase && '✅ MAP SELECTION PHASE'}
          {phaseInfo.isSideSelectionPhase && '🎯 SIDE SELECTION PHASE'}
        </div>
        
        <div className="text-yellow-400 text-xl font-bold mt-3">{getTurnIndicator()}</div>
      </div>

      {/* Phase Progress */}
      <div className="flex justify-center mb-6">
        <div className="flex space-x-2">
          {['Map 1', 'Map 2', 'Decider'].map((phase, index) => {
            let isActive = false;
            let isComplete = false;
            
            if (phase === 'Map 1') {
              isComplete = currentMatch.map1 && currentMatch.map1Side;
              isActive = !isComplete && (!currentMatch.map1 || !currentMatch.map1Side);
            } else if (phase === 'Map 2') {
              isComplete = currentMatch.map2 && currentMatch.map2Side;
              isActive = !isComplete && currentMatch.map1 && currentMatch.map1Side && (!currentMatch.map2 || !currentMatch.map2Side);
            } else if (phase === 'Decider') {
              isComplete = currentMatch.deciderMap && currentMatch.deciderMapSide;
              isActive = !isComplete && currentMatch.map1 && currentMatch.map1Side && currentMatch.map2 && currentMatch.map2Side;
            }
            
            return (
              <div
                key={phase}
                className={`w-4 h-4 rounded-full ${
                  isComplete
                    ? 'bg-green-500'
                    : isActive
                    ? 'bg-blue-500 animate-pulse'
                    : 'bg-gray-500'
                }`}
                title={phase}
              />
            );
          })}
        </div>
      </div>

      {/* Available Maps - Enhanced with better visual distinction */}
      <div className="mb-6">
        <h4 className="text-white font-bold mb-3 text-center">
          {phaseInfo.isBanPhase ? '🚫 Available Maps to Ban' : '✅ Available Maps to Select'}
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {availableMaps.map((mapName) => {
            const isBanned = allBannedMaps.includes(mapName);
            return (
              <button
                key={mapName}
                onClick={() => handleMapAction(mapName)}
                disabled={isButtonDisabled(mapName) || isBanned}
                className={`p-4 rounded-xl border-2 transition-all duration-200 relative ${
                  isBanned
                    ? 'border-red-600/50 bg-red-900/20 text-gray-400 cursor-not-allowed'
                    : phaseInfo.isBanPhase || phaseInfo.isMapSelectionPhase
                      ? phaseInfo.isUserTeamTurn
                        ? phaseInfo.isBanPhase
                          ? 'border-red-400 bg-[#0a0a0a] hover:bg-red-600/20 hover:border-red-600 text-white'
                          : 'border-green-400 bg-[#0a0a0a] hover:bg-green-600/20 hover:border-green-600 text-white'
                        : 'border-gray-800 bg-[#0a0a0a] text-gray-400 cursor-not-allowed'
                      : 'border-gray-800 bg-[#0a0a0a] text-gray-400 cursor-not-allowed'
                }`}
              >
                {isBanned && (
                  <div className="absolute top-2 right-2 px-2 py-1 bg-red-600 border border-red-500">
                    <span className="text-red-100 font-bold text-xs font-mono uppercase tracking-widest">BANNED</span>
                  </div>
                )}
                <div className={`text-lg font-bold font-bodax uppercase tracking-wide ${isBanned ? 'line-through' : ''}`}>{mapName}</div>
                {!isBanned && (
                  <div className={`text-sm font-bold font-mono uppercase tracking-widest ${
                    phaseInfo.isBanPhase ? 'text-red-300' : 'text-green-300'
                  }`}>
                    {getActionButtonText(mapName)}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Side Selection for Current Phase */}
      {phaseInfo.isSideSelectionPhase && phaseInfo.isUserTeamTurn && (
        <div className="text-center mb-6 p-4 bg-purple-600/20 rounded-xl border border-purple-500/30">
          {/* CURRENT MAP DISPLAY - Make it super clear which map */}
          <div className="mb-4 p-3 bg-purple-700/30 rounded-lg border border-purple-500/50">
            <div className="text-purple-200 text-sm mb-1">Currently Selecting Sides For:</div>
            <div className="text-white text-2xl font-bold">
              {phaseInfo.phase === 'Map 1 Side Selection' && currentMatch.map1 ? currentMatch.map1 : 
               phaseInfo.phase === 'Map 2 Side Selection' && currentMatch.map2 ? currentMatch.map2 : 
               phaseInfo.phase === 'Decider Side Selection' && currentMatch.deciderMap ? currentMatch.deciderMap : 
               'Unknown Map'}
            </div>
            <div className="text-purple-300 text-sm mt-1">
              {phaseInfo.phase === 'Map 1 Side Selection' ? 'Map 1' : 
               phaseInfo.phase === 'Map 2 Side Selection' ? 'Map 2' : 
               'Decider Map'}
            </div>
          </div>
          
          <div className="text-white text-lg mb-4">
            🎯 Select your side for {
              phaseInfo.phase === 'Map 1 Side Selection' ? 'Map 1' : 
              phaseInfo.phase === 'Map 2 Side Selection' ? 'Map 2' : 
              'Decider Map'
            }
          </div>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => handleSideSelection('attack')}
              disabled={banningLoading}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg font-bold transition-colors"
            >
              Attack
            </button>
            <button
              onClick={() => handleSideSelection('defense')}
              disabled={banningLoading}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg font-bold transition-colors"
            >
              Defense
            </button>
          </div>
        </div>
      )}

      {/* Show waiting message for team that's not picking the side */}
      {phaseInfo.isSideSelectionPhase && !phaseInfo.isUserTeamTurn && (
        <div className="text-center mb-6 p-4 bg-yellow-600/20 rounded-xl border border-yellow-500/30">
          {/* CURRENT MAP DISPLAY - Show which map they're waiting for */}
          <div className="mb-3 p-3 bg-yellow-700/30 rounded-lg border border-yellow-500/50">
            <div className="text-yellow-200 text-sm mb-1">Waiting for sides to be selected for:</div>
            <div className="text-white text-xl font-bold">
              {phaseInfo.phase === 'Map 1 Side Selection' && currentMatch.map1 ? currentMatch.map1 : 
               phaseInfo.phase === 'Map 2 Side Selection' && currentMatch.map2 ? currentMatch.map2 : 
               phaseInfo.phase === 'Decider Side Selection' && currentMatch.deciderMap ? currentMatch.deciderMap : 
               'Unknown Map'}
            </div>
            <div className="text-yellow-300 text-sm mt-1">
              {phaseInfo.phase === 'Map 1 Side Selection' ? 'Map 1' : 
               phaseInfo.phase === 'Map 2 Side Selection' ? 'Map 2' : 
               'Decider Map'}
            </div>
          </div>
          
          <div className="text-yellow-400 text-lg">
            ⏳ Waiting for {
              phaseInfo.phase === 'Map 1 Side Selection' ? 'Team B' : 
              phaseInfo.phase === 'Map 2 Side Selection' ? 'Team A' : 
              'Team B'
            } to pick their side...
          </div>
        </div>
      )}

      {/* Banned Maps Display */}
      {allBannedMaps.length > 0 && (
        <div className="mt-6 p-4 bg-[#0a0a0a] border border-gray-800">
          <h4 className="text-white font-bold mb-3 font-mono uppercase tracking-widest text-sm flex items-center gap-2">
            <span className="text-red-500">🚫</span> Banned Maps
          </h4>
          <div className="flex flex-wrap gap-2">
            {allBannedMaps.map((mapName: string) => (
              <span
                key={mapName}
                className="px-3 py-1.5 bg-red-900/30 text-red-400 border border-red-600/50 rounded font-mono uppercase tracking-widest text-xs font-bold"
              >
                <span className="text-red-500">BANNED:</span> {mapName}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Loading State */}
      {banningLoading && (
        <div className="text-center mt-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto"></div>
          <p className="text-blue-200 mt-2">Processing...</p>
        </div>
      )}
    </div>
  );
};

export default MapBanning; 