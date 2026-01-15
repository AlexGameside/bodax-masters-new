import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  banMap,
  selectMap,
  performVetoCoinflip,
  setVetoCoinflipWinnerChoice,
  adminSetVetoTeams,
  adminSetVetoBanTurnOrder,
  adminClearVetoOverride
} from '../services/firebaseService';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { DEFAULT_MAP_POOL } from '../constants/mapPool';

interface MapBanningProps {
  match: any;
  userTeam: any | null;
  team1?: any;
  team2?: any;
  isAdmin?: boolean;
  currentUserId?: string;
  onMapBanningComplete: () => void;
}

const MapBanning: React.FC<MapBanningProps> = ({ match, userTeam, team1, team2, isAdmin = false, currentUserId, onMapBanningComplete }) => {
  const [banningLoading, setBanningLoading] = useState(false);
  const [localMatch, setLocalMatch] = useState(match);
  const [setupLoading, setSetupLoading] = useState(false);
  const [coinflipAnimating, setCoinflipAnimating] = useState(false);
  const [choiceLoading, setChoiceLoading] = useState(false);
  const [adminTeamAId, setAdminTeamAId] = useState<string>('');
  const [adminOverrideEnabled, setAdminOverrideEnabled] = useState(false);
  const [adminBanOrder, setAdminBanOrder] = useState<string[]>([]);

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

  const getTeamName = (teamId?: string | null) => {
    if (!teamId) return 'Unknown';
    if (team1?.id === teamId) return team1?.name || 'Team 1';
    if (team2?.id === teamId) return team2?.name || 'Team 2';
    return 'Team';
  };

  const teamAId: string | null = (() => {
    const a = currentMatch?.veto?.teamAId;
    if (a && (a === currentMatch.team1Id || a === currentMatch.team2Id)) return a;
    return currentMatch.team1Id || null; // legacy default
  })();
  const teamBId: string | null = (() => {
    const b = currentMatch?.veto?.teamBId;
    if (b && (b === currentMatch.team1Id || b === currentMatch.team2Id)) return b;
    if (!teamAId) return currentMatch.team2Id || null;
    return teamAId === currentMatch.team1Id ? currentMatch.team2Id : currentMatch.team1Id;
  })();

  const isTeamA = !!userTeam?.id && !!teamAId && userTeam.id === teamAId;
  const isTeamB = !!userTeam?.id && !!teamBId && userTeam.id === teamBId;
  
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

  const canConfigureVeto =
    totalBans === 0 &&
    !currentMatch.selectedMap &&
    !currentMatch.map1 &&
    !currentMatch.map2 &&
    !currentMatch.deciderMap;

  const winnerTeamId: string | null | undefined = currentMatch?.veto?.coinflip?.winnerTeamId;
  const winnerChoice: 'A' | 'B' | undefined = currentMatch?.veto?.coinflip?.winnerChoice;

  const hasExplicitVetoTeams = !!currentMatch?.veto?.teamAId && !!currentMatch?.veto?.teamBId;
  const vetoOverrideEnabled = !!currentMatch?.veto?.adminOverride?.enabled;
  const coinflipRequired = canConfigureVeto && !vetoOverrideEnabled && !hasExplicitVetoTeams;
  const vetoLocked = coinflipRequired && (!winnerTeamId || !winnerChoice);

  const isCurrentUserOnTeam = (teamId?: string | null) => {
    if (!teamId || !currentUserId) return false;
    if (team1?.id === teamId) return !!team1?.members?.some?.((m: any) => m.userId === currentUserId);
    if (team2?.id === teamId) return !!team2?.members?.some?.((m: any) => m.userId === currentUserId);
    return false;
  };

  const isCurrentUserOnRoster = (teamId?: string | null) => {
    if (!teamId || !currentUserId) return false;
    if (teamId === currentMatch?.team1Id) {
      const ids: string[] = currentMatch?.team1Roster?.mainPlayers || [];
      return ids.includes(currentUserId);
    }
    if (teamId === currentMatch?.team2Id) {
      const ids: string[] = currentMatch?.team2Roster?.mainPlayers || [];
      return ids.includes(currentUserId);
    }
    return false;
  };

  // IMPORTANT: Only the WINNING TEAM may choose Team A/B.
  // Admins can still override via the Admin Override panel (separate path).
  const canWinnerChoose =
    !!winnerTeamId &&
    (
      // Primary: your detected match team
      userTeam?.id === winnerTeamId ||
      // Fallbacks: roster membership or team members
      isCurrentUserOnRoster(winnerTeamId) ||
      isCurrentUserOnTeam(winnerTeamId)
    );

  const handleChooseTeamLetter = async (choice: 'A' | 'B') => {
    // DEBUG: click handler visibility
    console.log('[MapBanning] handleChooseTeamLetter: click', {
      choice,
      isAdmin,
      currentUserId,
      userTeamId: userTeam?.id,
      winnerTeamId,
      canWinnerChoose,
      setupLoading,
      coinflipRequired,
      vetoLocked,
      matchId: currentMatch?.id,
      team1Id: currentMatch?.team1Id,
      team2Id: currentMatch?.team2Id,
      team1HasMembers: !!team1?.members?.length,
      team2HasMembers: !!team2?.members?.length,
      team1RosterMainCount: currentMatch?.team1Roster?.mainPlayers?.length || 0,
      team2RosterMainCount: currentMatch?.team2Roster?.mainPlayers?.length || 0,
      isCurrentUserOnTeamWinner: isCurrentUserOnTeam(winnerTeamId),
      isCurrentUserOnRosterWinner: isCurrentUserOnRoster(winnerTeamId)
    });
    if (!winnerTeamId) return;
    if (!canWinnerChoose) {
      toast.error(`Only ${getTeamName(winnerTeamId)} can choose Team A/B`);
      return;
    }
    try {
      setChoiceLoading(true);
      console.log('[MapBanning] calling setVetoCoinflipWinnerChoice', {
        matchId: currentMatch.id,
        choice,
        currentUserId
      });
      await setVetoCoinflipWinnerChoice(currentMatch.id, choice, currentUserId);
      toast.success(`${getTeamName(winnerTeamId)} chose Team ${choice}`);
    } catch (e: any) {
      console.error('[MapBanning] setVetoCoinflipWinnerChoice failed', e);
      toast.error(e?.message || 'Failed to set veto order');
    } finally {
      setChoiceLoading(false);
    }
  };

  // Watchdog: if coinflip winner is already known, never keep the A/B buttons disabled due to setupLoading.
  useEffect(() => {
    if (!winnerTeamId) return;
    if (winnerChoice) return;
    if (!setupLoading) return;
    const t = setTimeout(() => {
      console.warn('[MapBanning] watchdog clearing setupLoading (winner is known but setupLoading still true)', {
        matchId: currentMatch?.id,
        winnerTeamId
      });
      setSetupLoading(false);
      setCoinflipAnimating(false);
    }, 1200);
    return () => clearTimeout(t);
  }, [winnerTeamId, winnerChoice, setupLoading, currentMatch?.id]);

  // DEBUG: state snapshot when coinflip is pending / blocked
  useEffect(() => {
    if (!coinflipRequired) return;
    if (!winnerTeamId) return;
    if (winnerChoice) return;
    console.log('[MapBanning] coinflip pending: state snapshot', {
      isAdmin,
      currentUserId,
      userTeamId: userTeam?.id,
      winnerTeamId,
      canWinnerChoose,
      setupLoading,
      matchId: currentMatch?.id
    });
  }, [coinflipRequired, winnerTeamId, winnerChoice, canWinnerChoose, setupLoading, isAdmin, currentUserId, userTeam?.id, currentMatch?.id]);

  // Keep admin control state in sync with match data
  useEffect(() => {
    if (!isAdmin) return;
    const initialTeamA = (teamAId || currentMatch.team1Id || '').toString();
    setAdminTeamAId(initialTeamA);
    const enabled = !!currentMatch?.veto?.adminOverride?.enabled;
    setAdminOverrideEnabled(enabled);
    const order = Array.isArray(currentMatch?.veto?.adminOverride?.banTurnOrderTeamIds)
      ? currentMatch.veto.adminOverride.banTurnOrderTeamIds
      : [];
    setAdminBanOrder(order);
  }, [isAdmin, teamAId, currentMatch?.id, currentMatch?.veto?.adminOverride?.enabled, currentMatch?.veto?.adminOverride?.banTurnOrderTeamIds, currentMatch?.team1Id, currentMatch?.team2Id]);

  const banStepsTotal = isBO3 ? 4 : Math.max(0, maps.length - 1);

  const getExpectedBanTeamId = (banIndex: number): string | null => {
    // Block banning until coinflip + winner choice completes (unless admin set explicit teams / override)
    if (vetoLocked) return null;
    if (!teamAId || !teamBId) return null;
    const override = currentMatch?.veto?.adminOverride?.enabled ? currentMatch?.veto?.adminOverride?.banTurnOrderTeamIds : undefined;
    if (Array.isArray(override) && override.length > banIndex && (override[banIndex] === teamAId || override[banIndex] === teamBId)) {
      return override[banIndex];
    }
    if (isBO3) {
      if (banIndex === 0 || banIndex === 2) return teamAId;
      return teamBId;
    }
    return banIndex % 2 === 0 ? teamAId : teamBId;
  };

  // Auto-start coinflip when both teams are ready and veto hasn't started yet
  useEffect(() => {
    const bothTeamsReady = !!currentMatch?.team1Ready && !!currentMatch?.team2Ready;
    if (!coinflipRequired) return;
    if (!bothTeamsReady) return;
    if (!!winnerTeamId) return; // already done/started
    if (setupLoading) return;

    let cancelled = false;
    const run = async () => {
      try {
        setSetupLoading(true);
        setCoinflipAnimating(true);
        await performVetoCoinflip(currentMatch.id, currentUserId);
        // Keep the animation briefly even if Firestore updates fast
        setTimeout(() => {
          if (!cancelled) setCoinflipAnimating(false);
        }, 900);
      } catch (e: any) {
        if (!cancelled) {
          setCoinflipAnimating(false);
          toast.error(e?.message || 'Coinflip failed');
        }
      } finally {
        if (!cancelled) setSetupLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [coinflipRequired, currentMatch?.team1Ready, currentMatch?.team2Ready, winnerTeamId, setupLoading, currentMatch?.id, currentUserId]);
  
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

  if (vetoLocked) {
    phaseInfo = {
      phase: 'Coinflip',
      description: winnerTeamId ? 'Coinflip complete — waiting for winner to choose Team A/B' : 'Coinflip in progress…',
      isBanPhase: false,
      isMapSelectionPhase: false,
      isSideSelectionPhase: false,
      isUserTeamTurn: false,
      actionText: 'Waiting',
      currentStep: 'Complete coinflip setup to start veto'
    };
  }

  if (!vetoLocked && isBO3 && (isUserInMatch || isAdmin) && !currentMatch.map1) {
    // Phase 1: Map 1 Selection
    if (totalBans < 2) {
      // Still banning maps for Map 1
      const expectedTeamId = getExpectedBanTeamId(totalBans);
      const isUserTeamTurn = !!userTeam?.id && !!expectedTeamId && userTeam.id === expectedTeamId;
      
      phaseInfo = {
        phase: 'Map 1 Banning',
        description: 'Ban maps until 5 remain for Map 1 selection',
        isBanPhase: true,
        isMapSelectionPhase: false,
        isSideSelectionPhase: false,
        isUserTeamTurn,
        actionText: totalBans === 0 ? 'Ban first map' : 'Ban second map',
        currentStep: `Ban step ${totalBans + 1}/${banStepsTotal} · ${expectedTeamId ? getTeamName(expectedTeamId) : 'Team A/B'} bans`
      };
    } else if (totalBans >= 2) {
      // Map 1 selection phase - after 2 bans, 5 maps remain
      // Team A should pick Map 1 (they banned first)
      const isUserTeamTurn = !!userTeam?.id && !!teamAId && userTeam.id === teamAId;
      
      phaseInfo = {
        phase: 'Map 1 Selection',
        description: 'Choose Map 1 from remaining maps',
        isBanPhase: false,
        isMapSelectionPhase: true,
        isSideSelectionPhase: false,
        isUserTeamTurn,
        actionText: 'Select Map 1',
        currentStep: `Team A (${teamAId ? getTeamName(teamAId) : '—'}) picks Map 1`
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
  } else if (!vetoLocked && isBO3 && (isUserInMatch || isAdmin) && currentMatch.map1 && !currentMatch.map1Side) {
    // Side selection for Map 1
    const isUserTeamTurn = !!userTeam?.id && !!teamBId && userTeam.id === teamBId; // Team B picks side for Map 1
    
    phaseInfo = {
      phase: 'Map 1 Side Selection',
      description: 'Select side for Map 1',
      isBanPhase: false,
      isMapSelectionPhase: false,
      isSideSelectionPhase: true,
      isUserTeamTurn,
      actionText: 'Pick side for Map 1',
      currentStep: `Team B (${teamBId ? getTeamName(teamBId) : '—'}) picks side for Map 1`
    };
  } else if (!vetoLocked && isBO3 && (isUserInMatch || isAdmin) && currentMatch.map1 && currentMatch.map1Side && !currentMatch.map2) {
    // Map 2 selection phase - Team B picks Map 2 immediately after Map 1 side selection
    // Team B should pick Map 2 from 5 remaining maps
    const isUserTeamTurn = !!userTeam?.id && !!teamBId && userTeam.id === teamBId;
    
    phaseInfo = {
      phase: 'Map 2 Selection',
      description: 'Choose Map 2 from remaining maps',
      isBanPhase: false,
      isMapSelectionPhase: true,
      isSideSelectionPhase: false,
      isUserTeamTurn,
      actionText: 'Select Map 2',
      currentStep: `Team B (${teamBId ? getTeamName(teamBId) : '—'}) picks Map 2`
    };
  } else if (!vetoLocked && isBO3 && (isUserInMatch || isAdmin) && currentMatch.map2 && !currentMatch.map2Side) {
    // Side selection for Map 2
    const isUserTeamTurn = !!userTeam?.id && !!teamAId && userTeam.id === teamAId; // Team A picks side for Map 2
    
    phaseInfo = {
      phase: 'Map 2 Side Selection',
      description: 'Select side for Map 2',
      isBanPhase: false,
      isMapSelectionPhase: false,
      isSideSelectionPhase: true,
      isUserTeamTurn,
      actionText: 'Pick side for Map 2',
      currentStep: `Team A (${teamAId ? getTeamName(teamAId) : '—'}) picks side for Map 2`
    };
  } else if (!vetoLocked && isBO3 && (isUserInMatch || isAdmin) && currentMatch.map2 && currentMatch.map2Side && !currentMatch.deciderMap) {
    // Phase 3: Ban 2 more maps for Decider
    if (totalBans < 4) {
      // Still banning maps for Decider
      const expectedTeamId = getExpectedBanTeamId(totalBans);
      const isUserTeamTurn = !!userTeam?.id && !!expectedTeamId && userTeam.id === expectedTeamId;
      
      phaseInfo = {
        phase: 'Decider Banning',
        description: 'Ban maps until 3 remain for Decider selection',
        isBanPhase: true,
        isMapSelectionPhase: false,
        isSideSelectionPhase: false,
        isUserTeamTurn,
        actionText: totalBans === 2 ? 'Ban third map' : 'Ban fourth map',
        currentStep: `Ban step ${totalBans + 1}/${banStepsTotal} · ${expectedTeamId ? getTeamName(expectedTeamId) : 'Team A/B'} bans`
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
          isUserTeamTurn: !!userTeam?.id && !!teamAId && userTeam.id === teamAId, // Team A picks side for Decider
          actionText: 'Pick side for Decider',
          currentStep: `Team A (${teamAId ? getTeamName(teamAId) : '—'}) picks side for Decider Map`
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
  } else if (!vetoLocked && isBO3 && (isUserInMatch || isAdmin) && currentMatch.deciderMap && !currentMatch.deciderMapSide) {
    // Side selection for Decider Map
    const isUserTeamTurn = !!userTeam?.id && !!teamAId && userTeam.id === teamAId; // Team A picks side for Decider
    
    phaseInfo = {
      phase: 'Decider Side Selection',
      description: 'Select side for Decider Map',
      isBanPhase: false,
      isMapSelectionPhase: false,
      isSideSelectionPhase: true,
      isUserTeamTurn,
      actionText: 'Pick side for Decider',
      currentStep: `Team A (${teamAId ? getTeamName(teamAId) : '—'}) picks side for Decider Map`
    };
  } else if (!vetoLocked && isBO3 && (isUserInMatch || isAdmin)) {
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
  const expectedBanTeamIdBO1 = getExpectedBanTeamId(totalBans);
  const isUserTeamTurnBO1 = !!userTeam?.id && !!expectedBanTeamIdBO1 && userTeam.id === expectedBanTeamIdBO1;

  const getTurnIndicator = () => {
    if (phaseInfo.isBanPhase) {
      return phaseInfo.isUserTeamTurn 
        ? `🎯 Your turn to BAN a map` 
        : `⏳ Waiting for the other team to ban a map`;
    } else if (phaseInfo.isMapSelectionPhase) {
      return phaseInfo.isUserTeamTurn 
        ? `🎯 Your turn to SELECT a map` 
        : `⏳ Waiting for the other team to select a map`;
    } else if (phaseInfo.isSideSelectionPhase) {
      return phaseInfo.isUserTeamTurn 
        ? `🎯 Your turn to pick ATTACK or DEFENSE` 
        : `⏳ Waiting for the other team to pick their side`;
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
    if (!userTeam?.id) return;
    
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
      if (!userTeam?.id) throw new Error('No team context');
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
    if (!userTeam?.id) return;
    
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
    if (!userTeam?.id) return;
    
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
  if (!hasUserTeam && !isAdmin) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 mb-4">No team information available</div>
        <div className="text-sm text-gray-500">Please ensure you are part of a team in this match</div>
      </div>
    );
  }

  if (!isUserInMatch && !isAdmin) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 mb-4">Not part of this match</div>
        <div className="text-sm text-gray-500">You are not a member of either team in this match</div>
      </div>
    );
  }

  const renderVetoSetup = () => {
    return (
      <div className="mb-6 bg-black/30 border border-gray-800 p-4">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs text-gray-500 font-mono uppercase tracking-widest">Veto Setup</div>
            <div className="mt-2 text-sm text-gray-200 font-mono">
              Team A (starts): <span className="text-white font-semibold">{teamAId ? getTeamName(teamAId) : '—'}</span>
              <span className="text-gray-600 mx-2">/</span>
              Team B: <span className="text-white font-semibold">{teamBId ? getTeamName(teamBId) : '—'}</span>
            </div>
            <div className="mt-2 text-xs text-gray-500 font-mono uppercase tracking-widest">
              {currentMatch?.veto?.adminOverride?.enabled ? 'Admin override: ON' : 'Admin override: OFF'}
            </div>
          </div>

          {(isUserInMatch || isAdmin) && (
            <div className="flex flex-wrap gap-2 justify-start lg:justify-end">
              {/* Keep this section minimal once veto order is set */}
              {!vetoLocked && (
                <div className="px-4 py-2 border border-gray-800 bg-[#0a0a0a] text-gray-300 font-mono text-xs uppercase tracking-widest">
                  Veto order locked: <span className="text-white">{teamAId ? getTeamName(teamAId) : '—'}</span> starts
                </div>
              )}
            </div>
          )}
        </div>

        {isAdmin && (
          <div className="mt-4 pt-4 border-t border-gray-800">
            <div className="text-xs text-gray-500 font-mono uppercase tracking-widest mb-2">Admin override</div>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3 items-start">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-gray-500 font-mono uppercase tracking-widest mb-1">Team A</div>
                  <select
                    className="w-full bg-[#0a0a0a] text-white border border-gray-700 rounded px-3 py-2 font-mono text-sm"
                    value={adminTeamAId || ''}
                    onChange={(e) => setAdminTeamAId(e.target.value)}
                    disabled={!currentMatch.team1Id || !currentMatch.team2Id}
                  >
                    <option value="" disabled>Select Team A</option>
                    {currentMatch.team1Id && <option value={currentMatch.team1Id}>{getTeamName(currentMatch.team1Id)}</option>}
                    {currentMatch.team2Id && <option value={currentMatch.team2Id}>{getTeamName(currentMatch.team2Id)}</option>}
                  </select>
                  <div className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mt-1">
                    Team A starts banning and picks Map 1 (BO3).
                  </div>
                </div>

                <div>
                  <div className="text-xs text-gray-500 font-mono uppercase tracking-widest mb-1">Custom ban turn order</div>
                  <label className="flex items-center gap-2 text-sm text-gray-300 font-mono">
                    <input
                      type="checkbox"
                      checked={adminOverrideEnabled}
                      onChange={(e) => setAdminOverrideEnabled(e.target.checked)}
                    />
                    Enable per-ban order
                  </label>
                  <div className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mt-1">
                    Allows repeats (e.g. Team X bans twice).
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!canConfigureVeto || setupLoading || !adminTeamAId}
                  onClick={async () => {
                    try {
                      setSetupLoading(true);
                      await adminSetVetoTeams(currentMatch.id, adminTeamAId, currentUserId, 'admin set Team A/B');
                      toast.success('Set Team A/B');
                    } catch (e: any) {
                      toast.error(e?.message || 'Failed to set Team A/B');
                    } finally {
                      setSetupLoading(false);
                    }
                  }}
                  className="px-4 py-2 border border-gray-700 hover:border-red-700 bg-[#0a0a0a] hover:bg-white/5 text-white font-mono uppercase tracking-widest text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  title={!canConfigureVeto ? 'Only available before veto actions start' : 'Set Team A/B'}
                >
                  Save Team A/B
                </button>

                <button
                  type="button"
                  disabled={setupLoading || !currentMatch?.veto?.adminOverride?.enabled}
                  onClick={async () => {
                    try {
                      setSetupLoading(true);
                      await adminClearVetoOverride(currentMatch.id, currentUserId);
                      toast.success('Cleared override');
                    } catch (e: any) {
                      toast.error(e?.message || 'Failed to clear override');
                    } finally {
                      setSetupLoading(false);
                    }
                  }}
                  className="px-4 py-2 border border-gray-700 hover:border-gray-500 bg-transparent hover:bg-white/5 text-white font-mono uppercase tracking-widest text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Clear override
                </button>
              </div>
            </div>

            {adminOverrideEnabled && (
              <div className="mt-4 bg-[#0a0a0a] border border-gray-800 p-3">
                <div className="text-xs text-gray-500 font-mono uppercase tracking-widest mb-2">
                  Ban order ({banStepsTotal} steps)
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Array.from({ length: banStepsTotal }).map((_, idx) => {
                    const value = adminBanOrder[idx] || getExpectedBanTeamId(idx) || '';
                    return (
                      <div key={`ban-order-${idx}`}>
                        <div className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-1">Ban #{idx + 1}</div>
                        <select
                          className="w-full bg-black text-white border border-gray-700 rounded px-3 py-2 font-mono text-sm"
                          value={value}
                          onChange={(e) => {
                            const next = [...adminBanOrder];
                            next[idx] = e.target.value;
                            setAdminBanOrder(next);
                          }}
                        >
                          <option value="" disabled>Select team</option>
                          {currentMatch.team1Id && <option value={currentMatch.team1Id}>{getTeamName(currentMatch.team1Id)}</option>}
                          {currentMatch.team2Id && <option value={currentMatch.team2Id}>{getTeamName(currentMatch.team2Id)}</option>}
                        </select>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={!canConfigureVeto || setupLoading}
                    onClick={async () => {
                      try {
                        setSetupLoading(true);
                        const normalized = Array.from({ length: banStepsTotal }).map((_, i) => {
                          const v = adminBanOrder[i] || getExpectedBanTeamId(i) || '';
                          return v;
                        });
                        await adminSetVetoBanTurnOrder(currentMatch.id, normalized, currentUserId, 'admin set ban order');
                        toast.success('Saved ban order override');
                      } catch (e: any) {
                        toast.error(e?.message || 'Failed to save ban order');
                      } finally {
                        setSetupLoading(false);
                      }
                    }}
                    className="px-4 py-2 border border-gray-700 hover:border-red-700 bg-[#0a0a0a] hover:bg-white/5 text-white font-mono uppercase tracking-widest text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                    title={!canConfigureVeto ? 'Only available before veto actions start' : 'Save ban order'}
                  >
                    Save ban order
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };
  // If coinflip/choice is required, block the banning UI entirely and show a guided panel.
  if (vetoLocked) {
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
                Veto Setup <span className="text-red-500">Required</span>
              </h3>
              <p className="mt-2 text-sm text-gray-400 font-mono uppercase tracking-widest">
                Step 1: coinflip · Step 2: winner chooses Team A/B · then veto starts
              </p>
            </div>
          </div>

          <div className="bg-black/30 border border-gray-800 p-4 mb-6">
            <div className="text-gray-500 font-mono text-[11px] uppercase tracking-[0.3em] mb-2">What’s happening?</div>
            <div className="text-gray-300 font-mono text-sm leading-relaxed">
              A coinflip decides which team gets to choose the veto order.
              <div className="mt-2 text-gray-400 text-xs">
                - <span className="text-white">Team A</span> starts banning first.<br />
                - <span className="text-white">Team B</span> bans second.
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div className="flex items-center gap-3 px-4 py-3 border border-gray-800 bg-[#0a0a0a]">
              <div
                className={`w-10 h-10 rounded-full border border-red-800 bg-red-900/10 flex items-center justify-center ${
                  coinflipAnimating ? 'animate-spin' : winnerTeamId ? '' : 'animate-pulse'
                }`}
                title="Coinflip"
              >
                <span className="text-red-400 font-bodax text-base">C</span>
              </div>
              <div className="text-gray-300 font-mono text-xs uppercase tracking-widest">
                {!winnerTeamId ? (coinflipAnimating ? 'Coinflip…' : 'Coinflip starting…') : (
                  <>Winner: <span className="text-white">{getTeamName(winnerTeamId)}</span></>
                )}
              </div>
            </div>

            {winnerTeamId && !winnerChoice && (
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={choiceLoading || !canWinnerChoose}
                  onClick={() => handleChooseTeamLetter('A')}
                  title={!canWinnerChoose && winnerTeamId ? `Only ${getTeamName(winnerTeamId)} can choose Team A/B` : ''}
                  className="px-5 py-3 border border-gray-700 hover:border-red-700 bg-[#0a0a0a] hover:bg-red-900/10 text-white font-mono uppercase tracking-widest text-xs disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-gray-700 disabled:hover:bg-[#0a0a0a]"
                >
                  Be Team A (ban first)
                </button>
                <button
                  type="button"
                  disabled={choiceLoading || !canWinnerChoose}
                  onClick={() => handleChooseTeamLetter('B')}
                  title={!canWinnerChoose && winnerTeamId ? `Only ${getTeamName(winnerTeamId)} can choose Team A/B` : ''}
                  className="px-5 py-3 border border-gray-700 hover:border-red-700 bg-[#0a0a0a] hover:bg-white/5 text-white font-mono uppercase tracking-widest text-xs disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-gray-700 disabled:hover:bg-[#0a0a0a]"
                >
                  Be Team B (ban second)
                </button>
              </div>
            )}
          </div>

          {winnerTeamId && !winnerChoice && (
            <div className="bg-black/30 border border-gray-800 p-4 text-gray-400 font-mono text-xs uppercase tracking-widest">
              Waiting for <span className="text-white">{getTeamName(winnerTeamId)}</span> to choose Team A/B…
              {isAdmin && !canWinnerChoose && (
                <span className="block mt-2 text-gray-500">
                  Admin: if needed, use the override section below to set Team A/B.
                </span>
              )}
            </div>
          )}

          {/* Keep admin override visible even during lock */}
          {isAdmin && (
            <div className="mt-6">
              {renderVetoSetup()}
            </div>
          )}
        </div>
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
          {renderVetoSetup()}
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
        {renderVetoSetup()}
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
                  <div className="text-gray-300">Team B: {currentMatch.map1Side}</div>
                  <div className="text-gray-300">Team A: {currentMatch.map1Side === 'Attack' ? 'Defense' : 'Attack'}</div>
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
                  <div className="text-gray-300">Team A: {currentMatch.map2Side}</div>
                  <div className="text-gray-300">Team B: {currentMatch.map2Side === 'Attack' ? 'Defense' : 'Attack'}</div>
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
                  <div className="text-gray-300">Team A: {currentMatch.deciderMapSide}</div>
                  <div className="text-gray-300">Team B: {currentMatch.deciderMapSide === 'Attack' ? 'Defense' : 'Attack'}</div>
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