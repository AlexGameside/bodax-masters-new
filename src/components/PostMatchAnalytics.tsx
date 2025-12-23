import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { Trophy, Target, Zap, DollarSign, Skull, Award, TrendingUp, Shield, Flame, Crosshair, Coins, Activity, RefreshCw, Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import type { Match, Team } from '../types/tournament';
import { useAuth } from '../hooks/useAuth';
import { getTeamById, getPublicUserData, getTournamentById } from '../services/firebaseService';
import { autoDetectMatchResult, getMatchDetails } from '../services/riotApiService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

interface PostMatchAnalyticsProps {
  match: Match;
  teams: Team[];
  currentUserTeamId?: string;
}

interface PlayerStats {
  puuid: string;
  gameName: string;
  tagLine: string;
  teamId: string;
  kills: number;
  deaths: number;
  assists: number;
  score: number;
  acs: number;
  damage: number;
  headshots: number;
  bodyshots: number;
  legshots: number;
  firstBloods: number;
  firstDeaths: number;
  economy: {
    spent: number;
    loadoutValue: number;
  };
  clutches: number;
  entryFrags: number;
  hsPercent: number;
  kdRatio: number;
  roundsPlayed: number;
}

interface PlayerAchievement {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const PostMatchAnalytics: React.FC<PostMatchAnalyticsProps> = ({ match, teams, currentUserTeamId }) => {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.isAdmin || false;
  const [matchDetails, setMatchDetails] = useState<any>(match.autoDetectedResult?.matchDetails || null);
  const [loading, setLoading] = useState(!match.autoDetectedResult?.matchDetails);
  const [error, setError] = useState<string | null>(null);
  const [hasTriedFetching, setHasTriedFetching] = useState(false);
  const [tournament, setTournament] = useState<any>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  
  // Extract players and roundResults - MUST be at top level (Rules of Hooks)
  const players = matchDetails?.players || [];
  const roundResults = matchDetails?.roundResults || [];
  
  // Process player stats - MUST be before any early returns (Rules of Hooks)
  const playerStats: PlayerStats[] = useMemo(() => {
    if (!players || players.length === 0) return [];
    
    return players.map((player: any) => {
      const stats = player.stats || {};
      const character = player.characterId || player.character || 'Unknown';
      
      // Extract damage
      let totalDamage = 0;
      if (stats.damage) {
        if (Array.isArray(stats.damage)) {
          totalDamage = stats.damage.reduce((sum: number, d: any) => {
            if (typeof d === 'number') return sum + d;
            if (typeof d === 'object' && d !== null) {
              return sum + (d.damage || d.value || d.total || d.dealt || 0);
            }
            return sum;
          }, 0);
        } else if (typeof stats.damage === 'number') {
          totalDamage = stats.damage;
        } else if (typeof stats.damage === 'object' && stats.damage !== null) {
          totalDamage = stats.damage.total || stats.damage.dealt || stats.damage.value || 0;
        }
      }
      
      // Extract economy
      const economy = player.economy || {};
      const spent = economy.spent || economy.spentTotal || economy.totalSpent || 0;
      const loadoutValue = economy.loadoutValue || economy.loadout_value || 0;
      
      // Extract headshots, bodyshots, legshots
      const headshots = stats.headshots || stats.headShots || stats.head_shots || 
                       stats.shotsHead || stats.shots_head || 0;
      const bodyshots = stats.bodyshots || stats.bodyShots || stats.body_shots || 
                       stats.shotsBody || stats.shots_body || 0;
      const legshots = stats.legshots || stats.legShots || stats.leg_shots || 
                      stats.shotsLeg || stats.shots_leg || 0;
      
      const totalShots = headshots + bodyshots + legshots;
      const hsPercent = totalShots > 0 ? Math.round((headshots / totalShots) * 100) : 0;
      
      // Extract first bloods and first deaths
      let firstBloods = stats.firstBloods || stats.firstBloodsFirstDeath || 
                       stats.firstBlood || stats.first_blood || 0;
      let firstDeaths = stats.firstDeaths || stats.firstDeathsFirstBlood || 
                       stats.firstDeath || stats.first_death || 0;
      
      // Count from round results if not available
      if (firstBloods === 0 || firstDeaths === 0) {
        roundResults.forEach((round: any) => {
          if (round.playerStats) {
            round.playerStats.forEach((p: any) => {
              if (p.subject === player.subject || p.puuid === player.puuid) {
                if (p.firstKill) firstBloods++;
                if (p.firstDeath) firstDeaths++;
              }
            });
          }
        });
      }
      
      // Calculate ACS (Average Combat Score)
      const roundsPlayed = stats.roundsPlayed || stats.rounds_played || 1;
      const acs = roundsPlayed > 0 ? Math.round((stats.score || 0) / roundsPlayed) : 0;
      
      // Calculate K/D ratio
      const kdRatio = stats.deaths > 0 ? (stats.kills || 0) / stats.deaths : (stats.kills || 0);
      
      // Count clutches (1vX situations won)
      let clutches = 0;
      roundResults.forEach((round: any) => {
        if (round.playerStats) {
          const playerRoundStats = round.playerStats.filter((p: any) => 
            p.subject === player.subject || p.puuid === player.puuid
          );
          if (playerRoundStats.length > 0) {
            const playerStat = playerRoundStats[0];
            // Check if this player won a clutch (1v2, 1v3, 1v4, 1v5)
            if (playerStat.clutches) {
              clutches += playerStat.clutches;
            }
          }
        }
      });
      
      // Count entry frags (first kill in a round)
      let entryFrags = 0;
      roundResults.forEach((round: any) => {
        if (round.firstKill) {
          const firstKillPuuid = round.firstKill.puuid || round.firstKill.subject;
          if (firstKillPuuid === player.puuid || firstKillPuuid === player.subject) {
            entryFrags++;
          }
        }
      });
      
      return {
        puuid: player.puuid || player.subject || '',
        gameName: player.gameName || player.name || 'Unknown',
        tagLine: player.tagLine || player.tag || '',
        teamId: player.teamId || player.team_id || '',
        kills: stats.kills || 0,
        deaths: stats.deaths || 0,
        assists: stats.assists || 0,
        score: stats.score || 0,
        acs,
        damage: totalDamage,
        headshots,
        bodyshots,
        legshots,
        firstBloods,
        firstDeaths,
        economy: {
          spent,
          loadoutValue
        },
        clutches,
        entryFrags,
        hsPercent,
        kdRatio: Math.round(kdRatio * 100) / 100,
        roundsPlayed
      };
    });
  }, [players, roundResults]);
  
  console.log('[PostMatchAnalytics] Component rendered:', {
    matchId: match.id,
    matchState: match.matchState,
    isComplete: match.isComplete,
    hasAutoDetectedResult: !!match.autoDetectedResult,
    hasMatchDetails: !!match.autoDetectedResult?.matchDetails,
    isAdmin,
    teamsCount: teams.length,
    currentUserTeamId,
    initialMatchDetails: match.autoDetectedResult?.matchDetails ? 'EXISTS' : 'NULL',
    initialMatchDetailsType: typeof match.autoDetectedResult?.matchDetails,
    initialMatchDetailsKeys: match.autoDetectedResult?.matchDetails ? Object.keys(match.autoDetectedResult.matchDetails).slice(0, 5) : [],
    stateMatchDetails: matchDetails ? 'EXISTS' : 'NULL',
    stateLoading: loading,
    stateError: error
  });
  
  // Try to find the match from Riot API
  const fetchMatchDetails = useCallback(async (force: boolean = false) => {
    console.log('[PostMatchAnalytics] fetchMatchDetails called:', { force, hasTriedFetching, isAdmin });
    
    // Don't auto-fetch if already tried and not admin forcing
    if (hasTriedFetching && !force && !isAdmin) {
      console.log('[PostMatchAnalytics] Already tried fetching, skipping (not admin forcing)');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setHasTriedFetching(true);
      
      console.log('[PostMatchAnalytics] Starting fetch process...');
      
      // Get both teams
      const team1 = teams.find(t => t.id === match.team1Id);
      const team2 = teams.find(t => t.id === match.team2Id);
      
      console.log('[PostMatchAnalytics] Teams found:', {
        team1Id: match.team1Id,
        team2Id: match.team2Id,
        team1Found: !!team1,
        team2Found: !!team2,
        teamsArray: teams.map(t => ({ id: t.id, name: t.name }))
      });
      
      if (!team1 || !team2) {
        const errorMsg = 'Teams not found';
        console.error('[PostMatchAnalytics]', errorMsg);
        setError(errorMsg);
        setLoading(false);
        return;
      }
        
        // Get Riot IDs from team members
        const getTeamRiotIds = async (team: Team): Promise<string[]> => {
          const riotIds: string[] = [];
          if (!team.members) return riotIds;
          
          for (const member of team.members) {
            try {
              const userData = await getPublicUserData(member.userId);
              if (userData?.riotId) {
                riotIds.push(userData.riotId);
              }
            } catch (error) {
              console.error('Error getting user Riot ID:', error);
            }
          }
          return riotIds;
        };
        
        const team1RiotIds = await getTeamRiotIds(team1);
        const team2RiotIds = await getTeamRiotIds(team2);
        
        console.log('[PostMatchAnalytics] Riot IDs collected:', {
          team1RiotIds: team1RiotIds.length,
          team2RiotIds: team2RiotIds.length,
          team1RiotIdsList: team1RiotIds,
          team2RiotIdsList: team2RiotIds
        });
        
        // Need at least 3 players with Riot IDs per team
        if (team1RiotIds.length < 3 || team2RiotIds.length < 3) {
          const errorMsg = `Not enough players with Riot IDs. Team 1: ${team1RiotIds.length}, Team 2: ${team2RiotIds.length} (need at least 3 each)`;
          console.warn('[PostMatchAnalytics]', errorMsg);
          setError(errorMsg);
          setLoading(false);
          return;
        }
        
        // Get match scheduled time if available
        const matchStartTime = match.scheduledTime 
          ? (match.scheduledTime instanceof Date ? match.scheduledTime.getTime() : (match.scheduledTime as any)?.toMillis?.() || match.scheduledTime)
          : undefined;
        
        console.log('[PostMatchAnalytics] Calling autoDetectMatchResult...', {
          team1RiotIdsCount: team1RiotIds.length,
          team2RiotIdsCount: team2RiotIds.length,
          matchStartTime
        });
        
        // Try to auto-detect the match
        const detectionResult = await autoDetectMatchResult(
          team1RiotIds,
          team2RiotIds,
          matchStartTime,
          20160 // 14 days window
        );
        
        console.log('[PostMatchAnalytics] Detection result:', {
          detected: detectionResult?.detected,
          matchId: detectionResult?.matchId,
          team1Score: detectionResult?.team1Score,
          team2Score: detectionResult?.team2Score,
          confidence: detectionResult?.confidence
        });
        
        if (detectionResult?.detected && detectionResult.matchId) {
          console.log('[PostMatchAnalytics] Match detected! Fetching full details...');
          // Fetch full match details
          const details = await getMatchDetails(detectionResult.matchId);
          console.log('[PostMatchAnalytics] Match details fetched:', {
            hasPlayers: !!details?.players,
            playersCount: details?.players?.length || 0,
            hasTeams: !!details?.teams,
            hasRoundResults: !!details?.roundResults,
            detailsType: typeof details,
            detailsIsNull: details === null,
            detailsIsUndefined: details === undefined,
            detailsKeys: details ? Object.keys(details) : [],
            fullDetails: details // Log full object for debugging
          });
          
          if (details && typeof details === 'object' && details !== null) {
            console.log('[PostMatchAnalytics] ✅ Valid details object received, setting state...', {
              detailsStringified: JSON.stringify(details).substring(0, 200),
              detailsType: typeof details,
              detailsIsNull: details === null,
              detailsIsUndefined: details === undefined,
              detailsHasPlayers: !!details.players,
              detailsPlayersLength: details.players?.length || 0,
              detailsKeys: Object.keys(details).slice(0, 10),
              detailsFullObject: details
            });
            // Set state directly - React will handle the update
            console.log('[PostMatchAnalytics] Calling setMatchDetails with:', {
              details,
              detailsType: typeof details,
              detailsIsObject: typeof details === 'object',
              detailsIsNotNull: details !== null
            });
            setMatchDetails(details);
            console.log('[PostMatchAnalytics] ✅ setMatchDetails called successfully');
            console.log('[PostMatchAnalytics] State update queued, component should re-render with new matchDetails');
            // Force a small delay to ensure state update propagates
            await new Promise(resolve => setTimeout(resolve, 100));
            console.log('[PostMatchAnalytics] After state update delay');
            // Don't set loading to false here - let finally block handle it
          } else {
            console.error('[PostMatchAnalytics] Invalid details object:', {
              details,
              type: typeof details,
              isNull: details === null,
              isUndefined: details === undefined,
              detailsValue: details
            });
            setError('Invalid match details received from API');
          }
          
          // Optionally store it in the match document for future use
          try {
            const matchRef = doc(db, 'matches', match.id);
            await getDoc(matchRef).then(async (matchDoc) => {
              if (matchDoc.exists()) {
                const matchData = matchDoc.data();
                // Only update if we don't already have autoDetectedResult
                if (!matchData.autoDetectedResult) {
                  const { updateDoc, serverTimestamp } = await import('firebase/firestore');
                  await updateDoc(matchRef, {
                    autoDetectedResult: {
                      detected: true,
                      matchId: detectionResult.matchId,
                      team1Score: detectionResult.team1Score,
                      team2Score: detectionResult.team2Score,
                      detectedAt: serverTimestamp(),
                      confidence: detectionResult.confidence,
                      matchDetails: details
                    }
                  });
                }
              }
            });
          } catch (updateError) {
            console.error('Error updating match with detected result:', updateError);
            // Don't fail the whole thing if update fails
          }
        } else {
          // Check if the error is due to rate limits
          const isRateLimitError = detectionResult?.error?.includes('rate limit') || 
                                   detectionResult?.error?.includes('429') ||
                                   (team1RiotIds.length === 0 && team2RiotIds.length === 0);
          
          let errorMsg = 'Match not found in Riot API. The match may not have been played yet, or players may not have Riot IDs set correctly.';
          
          if (isRateLimitError) {
            errorMsg = 'Riot API rate limit exceeded. Please wait a few minutes and try again, or check if match details are already stored in the database.';
            console.warn('[PostMatchAnalytics] Rate limit error during fetch');
          }
          
          console.warn('[PostMatchAnalytics]', errorMsg, {
            detectionResult: detectionResult ? {
              detected: detectionResult.detected,
              hasMatchId: !!detectionResult.matchId,
              team1Score: detectionResult.team1Score,
              team2Score: detectionResult.team2Score,
              error: detectionResult.error
            } : null,
            team1RiotIdsCount: team1RiotIds.length,
            team2RiotIdsCount: team2RiotIds.length
          });
          setError(errorMsg);
        }
      } catch (err: any) {
        console.error('[PostMatchAnalytics] Error fetching match details:', err);
        setError(err.message || 'Failed to fetch match details');
      } finally {
        console.log('[PostMatchAnalytics] Fetch completed, setting loading to false. Current matchDetails state:', {
          hasMatchDetails: !!matchDetails,
          matchDetailsType: typeof matchDetails
        });
        setLoading(false);
      }
    }, [match, teams, isAdmin, hasTriedFetching]);

  // Export to image function - MUST be before any early returns (Rules of Hooks)
  const handleExport = useCallback(async () => {
    if (!exportRef.current) return;
    
    try {
      // Temporarily make the export view visible for capture
      const exportElement = exportRef.current;
      const originalStyle = exportElement.style.cssText;
      exportElement.style.cssText = 'position: absolute; left: 0; top: 0; width: 1200px; visibility: visible; opacity: 1; z-index: 9999;';
      
      const canvas = await html2canvas(exportElement, {
        backgroundColor: '#0a0a0a',
        scale: 2,
        logging: false,
        useCORS: true,
        width: 1200,
        windowWidth: 1200,
      });
      
      // Restore original style
      exportElement.style.cssText = originalStyle;
      
      const link = document.createElement('a');
      link.download = `match-analytics-${match.id}-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error exporting image:', error);
      // Restore original style on error
      if (exportRef.current) {
        exportRef.current.style.cssText = 'position: absolute; left: 0; top: 0; visibility: hidden; opacity: 0; z-index: -1;';
      }
    }
  }, [match.id]);
  
  // Fetch tournament data
  useEffect(() => {
    const loadTournament = async () => {
      if (match.tournamentId) {
        try {
          const tournamentData = await getTournamentById(match.tournamentId);
          setTournament(tournamentData);
        } catch (error) {
          console.error('Error loading tournament:', error);
        }
      }
    };
    loadTournament();
  }, [match.tournamentId]);

  // Watch for matchDetails state changes
  useEffect(() => {
    console.log('[PostMatchAnalytics] 🔄 matchDetails state changed (useEffect triggered):', {
      hasMatchDetails: !!matchDetails,
      matchDetailsType: typeof matchDetails,
      matchDetailsIsNull: matchDetails === null,
      matchDetailsIsUndefined: matchDetails === undefined,
      matchDetailsKeys: matchDetails ? Object.keys(matchDetails).slice(0, 10) : [],
      matchDetailsHasPlayers: !!matchDetails?.players,
      matchDetailsPlayersLength: matchDetails?.players?.length || 0,
      matchDetailsHasTeams: !!matchDetails?.teams,
      fullMatchDetails: matchDetails ? 'EXISTS' : 'NULL/UNDEFINED',
      matchDetailsValue: matchDetails
    });
    
    // Log a sample of the matchDetails to see its structure
    if (matchDetails && typeof matchDetails === 'object') {
      console.log('[PostMatchAnalytics] matchDetails structure analysis:', {
        firstLevelKeys: Object.keys(matchDetails),
        hasPlayers: 'players' in matchDetails,
        hasTeams: 'teams' in matchDetails,
        hasRoundResults: 'roundResults' in matchDetails,
        playersType: typeof matchDetails.players,
        playersIsArray: Array.isArray(matchDetails.players),
        teamsType: typeof matchDetails.teams,
        playersValue: matchDetails.players,
        teamsValue: matchDetails.teams
      });
    } else {
      console.log('[PostMatchAnalytics] ⚠️ matchDetails is not a valid object:', {
        matchDetails,
        type: typeof matchDetails,
        isNull: matchDetails === null,
        isUndefined: matchDetails === undefined
      });
    }
  }, [matchDetails]);
  
  // Try to fetch match details if not already available
  useEffect(() => {
    console.log('[PostMatchAnalytics] useEffect triggered:', {
      hasAutoDetectedResult: !!match.autoDetectedResult,
      hasMatchDetails: !!match.autoDetectedResult?.matchDetails,
      matchState: match.matchState,
      isComplete: match.isComplete,
      autoDetectedResultKeys: match.autoDetectedResult ? Object.keys(match.autoDetectedResult) : []
    });
    
    // If we already have match details in the prop, use them
    if (match.autoDetectedResult?.matchDetails) {
      console.log('[PostMatchAnalytics] Using existing match details from autoDetectedResult prop');
      setMatchDetails(match.autoDetectedResult.matchDetails);
      setLoading(false);
      return;
    }
    
    // Try to load from database if not in prop (match might not have full data loaded)
    const loadFromDatabase = async () => {
      try {
        console.log('[PostMatchAnalytics] Checking database for stored match details...');
        const matchDoc = await getDoc(doc(db, 'matches', match.id));
        if (matchDoc.exists()) {
          const matchData = matchDoc.data();
          if (matchData.autoDetectedResult?.matchDetails) {
            console.log('[PostMatchAnalytics] Found match details in database!');
            setMatchDetails(matchData.autoDetectedResult.matchDetails);
            setLoading(false);
            return;
          } else {
            console.log('[PostMatchAnalytics] No match details in database:', {
              hasAutoDetectedResult: !!matchData.autoDetectedResult,
              autoDetectedResultKeys: matchData.autoDetectedResult ? Object.keys(matchData.autoDetectedResult) : []
            });
          }
        }
      } catch (error) {
        console.error('[PostMatchAnalytics] Error loading from database:', error);
      }
      
      // Only try to fetch from Riot API for completed matches
      if (match.matchState !== 'completed' || !match.isComplete) {
        console.log('[PostMatchAnalytics] Match not completed, skipping fetch:', {
          matchState: match.matchState,
          isComplete: match.isComplete
        });
        setLoading(false);
        return;
      }
      
      console.log('[PostMatchAnalytics] No stored match details found, attempting to fetch from Riot API...');
      fetchMatchDetails();
    };
    
    loadFromDatabase();
  }, [match.id, match.autoDetectedResult, match.matchState, match.isComplete, fetchMatchDetails]);
  
  console.log('[PostMatchAnalytics] Render state:', {
    loading,
    error,
    hasMatchDetails: !!matchDetails,
    matchDetailsType: typeof matchDetails,
    matchDetailsIsNull: matchDetails === null,
    matchDetailsIsUndefined: matchDetails === undefined,
    matchDetailsKeys: matchDetails ? Object.keys(matchDetails) : [],
    isAdmin,
    willShow: !loading && (matchDetails || (error && isAdmin)),
    matchDetailsValue: matchDetails ? 'EXISTS' : 'NULL/UNDEFINED',
    matchDetailsStringified: matchDetails ? JSON.stringify(matchDetails).substring(0, 100) : 'N/A',
    renderConditionLoading: loading,
    renderConditionError: error,
    renderConditionMatchDetails: !!matchDetails,
    renderConditionWillShowErrorUI: error || !matchDetails,
    renderConditionIsAdmin: isAdmin,
    renderConditionWillReturnNull: !isAdmin && (error || !matchDetails)
  });

  if (loading) {
    console.log('[PostMatchAnalytics] Rendering loading state - loading is true');
    return (
      <div className="bg-[#050505] border border-gray-900 rounded-lg p-8">
        <div className="flex items-center justify-center gap-3">
          <RefreshCw className="w-5 h-5 text-red-500 animate-spin" />
          <span className="text-gray-500 font-mono uppercase tracking-widest text-xs">
            Loading match analytics...
          </span>
        </div>
      </div>
    );
  }

  // Show error/retry UI for admins, or hide for regular users
  if (error || !matchDetails) {
    console.log('[PostMatchAnalytics] No match details or error - checking render conditions:', { 
      error, 
      hasMatchDetails: !!matchDetails, 
      isAdmin,
      errorMessage: error,
      matchDetailsCheck: matchDetails === null ? 'NULL' : matchDetails === undefined ? 'UNDEFINED' : 'EXISTS',
      willRenderForAdmin: isAdmin && (error || !matchDetails),
      conditionError: !!error,
      conditionNoMatchDetails: !matchDetails,
      conditionBoth: error || !matchDetails,
      matchDetailsActualValue: matchDetails,
      matchDetailsType: typeof matchDetails,
      matchDetailsStringified: matchDetails ? JSON.stringify(matchDetails).substring(0, 200) : 'N/A'
    });
    if (!isAdmin) {
      console.log('[PostMatchAnalytics] Hiding for regular user (no admin) - returning null. Details:', {
        isAdmin,
        error,
        hasMatchDetails: !!matchDetails,
        matchDetails
      });
      return null; // Hide for regular users if no analytics available
    }
    
    console.log('[PostMatchAnalytics] Rendering error/retry UI for admin');
    
    // Show admin-only retry UI
    return (
      <div className="bg-[#050505] border border-gray-900 rounded-lg p-8">
        <div className="text-center">
          <Activity className="w-8 h-8 text-gray-700 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white font-bodax uppercase tracking-wider mb-2">
            Post-Match Analytics
          </h3>
          {error && (
            <p className="text-red-500 font-mono uppercase tracking-widest text-xs mb-4">
              {error}
            </p>
          )}
          {!error && (
            <p className="text-gray-500 font-mono uppercase tracking-widest text-xs mb-4">
              Match analytics not available
            </p>
          )}
          <button
            onClick={() => fetchMatchDetails(true)}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-[#0a0a0a] border border-gray-900 hover:border-red-500/50 disabled:border-gray-900 text-white rounded-lg font-bold font-mono uppercase tracking-widest transition-colors mx-auto"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Load Analytics
              </>
            )}
          </button>
          <p className="text-gray-600 text-xs font-mono mt-3">
            Admin Only: Try to fetch match data from Riot API
          </p>
        </div>
      </div>
    );
  }

  console.log('[PostMatchAnalytics] ✅ PASSED ALL RENDER CONDITIONS - Rendering analytics with match details');
  console.log('[PostMatchAnalytics] matchDetails object:', {
    type: typeof matchDetails,
    isNull: matchDetails === null,
    isUndefined: matchDetails === undefined,
    hasPlayers: !!matchDetails?.players,
    playersLength: matchDetails?.players?.length || 0,
    hasRoundResults: !!matchDetails?.roundResults,
    roundResultsLength: matchDetails?.roundResults?.length || 0,
    hasTeams: !!matchDetails?.teams,
    teamsKeys: matchDetails?.teams ? Object.keys(matchDetails.teams) : [],
    allKeys: matchDetails ? Object.keys(matchDetails) : [],
    fullMatchDetails: matchDetails
  });
  
  const team1 = teams.find(t => t.id === match.team1Id);
  const team2 = teams.find(t => t.id === match.team2Id);
  const teamsData = matchDetails?.teams || {};
  const redTeam = teamsData.red || teamsData.Red || {};
  const blueTeam = teamsData.blue || teamsData.Blue || {};
  
  console.log('[PostMatchAnalytics] Match details structure:', {
    playersCount: players.length,
    roundResultsCount: roundResults.length,
    hasRedTeam: !!redTeam,
    hasBlueTeam: !!blueTeam,
    team1Found: !!team1,
    team2Found: !!team2,
    team1Id: match.team1Id,
    team2Id: match.team2Id,
    teamsArray: teams.map(t => ({ id: t.id, name: t.name }))
  });

  // Separate players by team
  const redPlayers = playerStats.filter(p => p.teamId === 'Red' || p.teamId === 'red');
  const bluePlayers = playerStats.filter(p => p.teamId === 'Blue' || p.teamId === 'blue');
  
  // Determine which team is which by matching scores
  // Get scores from match details
  const redScore = redTeam.roundsWon ?? redTeam.rounds_won ?? redTeam.numRoundWins ?? 0;
  const blueScore = blueTeam.roundsWon ?? blueTeam.rounds_won ?? blueTeam.numRoundWins ?? 0;
  
  // Match teams based on scores (if scores match, assume team1 is red)
  const team1IsRed = match.team1Score === redScore && match.team2Score === blueScore;
  const team1Players = team1IsRed ? redPlayers : bluePlayers;
  const team2Players = team1IsRed ? bluePlayers : redPlayers;

  // Calculate achievements for each player
  const calculateAchievements = (player: PlayerStats, allPlayers: PlayerStats[]): PlayerAchievement[] => {
    const achievements: PlayerAchievement[] = [];
    
    // MVP (Highest ACS)
    const highestACS = Math.max(...allPlayers.map(p => p.acs));
    if (player.acs === highestACS && player.acs > 0) {
      achievements.push({
        title: '🏆 MVP',
        description: 'Highest Average Combat Score',
        icon: <Trophy className="w-5 h-5" />,
        color: 'text-yellow-400'
      });
    }
    
    // Entry Fragger
    const mostEntryFrags = Math.max(...allPlayers.map(p => p.entryFrags));
    if (player.entryFrags === mostEntryFrags && player.entryFrags > 0) {
      achievements.push({
        title: '⚔️ Entry Fragger',
        description: 'Most First Kills',
        icon: <Crosshair className="w-5 h-5" />,
        color: 'text-red-400'
      });
    }
    
    // Clutch Master
    const mostClutches = Math.max(...allPlayers.map(p => p.clutches));
    if (player.clutches === mostClutches && player.clutches > 0) {
      achievements.push({
        title: '🔥 Clutch Master',
        description: 'Most Clutch Rounds Won',
        icon: <Flame className="w-5 h-5" />,
        color: 'text-orange-400'
      });
    }
    
    // Money Spender
    const mostSpent = Math.max(...allPlayers.map(p => p.economy.spent));
    if (player.economy.spent === mostSpent && player.economy.spent > 0) {
      achievements.push({
        title: '💰 Big Spender',
        description: 'Most Money Spent',
        icon: <DollarSign className="w-5 h-5" />,
        color: 'text-green-400'
      });
    }
    
    // First Death King
    const mostFirstDeaths = Math.max(...allPlayers.map(p => p.firstDeaths));
    if (player.firstDeaths === mostFirstDeaths && player.firstDeaths > 0) {
      achievements.push({
        title: '💀 First Death King',
        description: 'Most First Deaths',
        icon: <Skull className="w-5 h-5" />,
        color: 'text-gray-400'
      });
    }
    
    // Headshot Machine
    const highestHS = Math.max(...allPlayers.map(p => p.hsPercent));
    if (player.hsPercent === highestHS && player.hsPercent > 50) {
      achievements.push({
        title: '🎯 Headshot Machine',
        description: `Highest HS% (${player.hsPercent}%)`,
        icon: <Target className="w-5 h-5" />,
        color: 'text-blue-400'
      });
    }
    
    // Damage Dealer
    const mostDamage = Math.max(...allPlayers.map(p => p.damage));
    if (player.damage === mostDamage && player.damage > 0) {
      achievements.push({
        title: '💥 Damage Dealer',
        description: 'Most Damage Dealt',
        icon: <Zap className="w-5 h-5" />,
        color: 'text-purple-400'
      });
    }
    
    // K/D Beast
    const highestKD = Math.max(...allPlayers.map(p => p.kdRatio));
    if (player.kdRatio === highestKD && player.kdRatio > 1.5) {
      achievements.push({
        title: '⚡ K/D Beast',
        description: `Highest K/D (${player.kdRatio})`,
        icon: <TrendingUp className="w-5 h-5" />,
        color: 'text-cyan-400'
      });
    }
    
    return achievements;
  };

  const allPlayers = [...team1Players, ...team2Players];

  console.log('[PostMatchAnalytics] About to render analytics UI:', {
    team1PlayersCount: team1Players.length,
    team2PlayersCount: team2Players.length,
    allPlayersCount: allPlayers.length,
    team1Found: !!team1,
    team2Found: !!team2,
    team1Name: team1?.name,
    team2Name: team2?.name,
    playersArray: players,
    playersLength: players.length,
    roundResultsArray: roundResults,
    roundResultsLength: roundResults.length
  });
  
  console.log('[PostMatchAnalytics] 🎨 RENDERING ANALYTICS UI NOW - All conditions passed!');

  // Combine all players for table display
  const allPlayersSorted = [...allPlayers].sort((a, b) => b.acs - a.acs);

  // Determine if BO3 match
  const isBO3Match = match.matchFormat === 'BO3' || match.map1 || match.map2 || match.deciderMap;
  const hasMapResults = match.mapResults && (match.mapResults.map1 || match.mapResults.map2 || match.mapResults.map3);

  // Format date and time
  const formatDate = (date: Date | null | undefined): string => {
    if (!date) return 'N/A';
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatTime = (date: Date | null | undefined): string => {
    if (!date) return 'N/A';
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  // Get match date for display
  const matchDate = match.resolvedAt || match.scheduledTime || match.createdAt;

  return (
    <div className="bg-[#0a0a0a] border border-gray-800 rounded-lg relative overflow-hidden shadow-2xl">
      {/* Export Button */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-white text-sm font-mono uppercase tracking-wider transition-colors shadow-lg"
          title="Export as image"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>
      
      <div className="relative p-6">
        {/* Match Completed Status - Compact Top Section */}
        <div className="mb-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-xs text-gray-500 font-mono uppercase tracking-widest">
              MATCH COMPLETED
            </span>
          </div>
        </div>

        {/* Map and Score Section - Single Display */}
        {(() => {
          // For BO3, show the decider map if available, otherwise show the last played map
          // For BO1, show the selected map
          let mapName = '';
          let mapScore = '';
          
          if (isBO3Match && hasMapResults) {
            // Prefer decider map, otherwise the last played map
            if (match.mapResults?.map3 && match.deciderMap) {
              mapName = match.deciderMap;
              mapScore = `${match.mapResults.map3.team1Score} - ${match.mapResults.map3.team2Score}`;
            } else if (match.mapResults?.map2 && match.map2) {
              mapName = match.map2;
              mapScore = `${match.mapResults.map2.team1Score} - ${match.mapResults.map2.team2Score}`;
            } else if (match.mapResults?.map1 && match.map1) {
              mapName = match.map1;
              mapScore = `${match.mapResults.map1.team1Score} - ${match.mapResults.map1.team2Score}`;
            }
          } else if (match.selectedMap && match.resultSubmission?.team1SubmittedScore) {
            mapName = match.selectedMap;
            mapScore = `${match.resultSubmission.team1SubmittedScore.team1Score} - ${match.resultSubmission.team1SubmittedScore.team2Score}`;
          }
          
          if (mapName && mapScore) {
            return (
              <div className="mb-4 pb-3 border-b border-gray-800">
                <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-3 text-center max-w-xs mx-auto">
                  <div className="text-xs text-gray-400 font-mono uppercase mb-1">MAP</div>
                  <div className="text-sm font-bold text-white font-bodax mb-1.5">{mapName}</div>
                  <div className="text-xl font-bold text-white font-bodax">
                    {mapScore}
                  </div>
                </div>
              </div>
            );
          }
          return null;
        })()}

        {/* Player Statistics Header */}
        <div className="mb-3">
          <h2 className="text-xl font-bold text-white font-bodax uppercase tracking-wider mb-1">
            Player Statistics
          </h2>
          <p className="text-gray-400 font-mono uppercase tracking-widest text-xs">
            {team1?.name || 'Team 1'} vs {team2?.name || 'Team 2'}
          </p>
        </div>

        {/* Player Statistics Table */}
        <div className="overflow-x-auto rounded-lg border border-gray-800">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/50">
                <th className="text-left py-2 px-3 text-xs font-bold text-gray-300 font-mono uppercase tracking-widest">PLAYER</th>
                <th className="text-center py-2 px-2 text-xs font-bold text-gray-300 font-mono uppercase tracking-widest">K</th>
                <th className="text-center py-2 px-2 text-xs font-bold text-gray-300 font-mono uppercase tracking-widest">D</th>
                <th className="text-center py-2 px-2 text-xs font-bold text-gray-300 font-mono uppercase tracking-widest">A</th>
                <th className="text-center py-2 px-2 text-xs font-bold text-gray-300 font-mono uppercase tracking-widest">K/D</th>
                <th className="text-center py-2 px-2 text-xs font-bold text-gray-300 font-mono uppercase tracking-widest">ACS</th>
                <th className="text-center py-2 px-2 text-xs font-bold text-gray-300 font-mono uppercase tracking-widest">FB</th>
                <th className="text-center py-2 px-2 text-xs font-bold text-gray-300 font-mono uppercase tracking-widest">FD</th>
                <th className="text-center py-2 px-2 text-xs font-bold text-gray-300 font-mono uppercase tracking-widest">HS%</th>
                <th className="text-center py-2 px-2 text-xs font-bold text-gray-300 font-mono uppercase tracking-widest">DAMAGE</th>
              </tr>
            </thead>
            <tbody>
              {allPlayersSorted.map((player, idx) => {
                const isTeam1 = team1Players.some(p => p.puuid === player.puuid);
                const isCurrentUser = currentUser?.id && (
                  (team1?.members?.some(m => m.userId === currentUser.id) && isTeam1) ||
                  (team2?.members?.some(m => m.userId === currentUser.id) && !isTeam1)
                );
                
                return (
                  <tr
                    key={player.puuid}
                    className={`border-b border-gray-900/50 hover:bg-gray-900/30 transition-colors ${
                      isCurrentUser ? 'bg-red-500/5' : idx % 2 === 0 ? 'bg-gray-900/20' : 'bg-transparent'
                    }`}
                  >
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${isTeam1 ? 'bg-red-500' : 'bg-blue-500'}`} />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-white font-semibold font-bodax text-xs">
                              {player.gameName}
                            </span>
                            {isCurrentUser && (
                              <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-1 py-0.5 rounded font-mono uppercase">
                                YOU
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 font-mono mt-0.5">
                            {player.puuid.substring(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="text-center py-2 px-2">
                      <span className="text-white font-semibold font-bodax text-xs">{player.kills}</span>
                    </td>
                    <td className="text-center py-2 px-2">
                      <span className="text-white font-semibold font-bodax text-xs">{player.deaths}</span>
                    </td>
                    <td className="text-center py-2 px-2">
                      <span className="text-white font-semibold font-bodax text-xs">{player.assists}</span>
                    </td>
                    <td className="text-center py-2 px-2">
                      <span className="text-white font-semibold font-bodax text-xs">{player.kdRatio.toFixed(2)}</span>
                    </td>
                    <td className="text-center py-2 px-2">
                      <span className="text-white font-semibold font-bodax text-xs">{player.acs}</span>
                    </td>
                    <td className="text-center py-2 px-2">
                      <span className="text-green-400 font-semibold font-bodax text-xs">{player.firstBloods}</span>
                    </td>
                    <td className="text-center py-2 px-2">
                      <span className="text-red-400 font-semibold font-bodax text-xs">{player.firstDeaths}</span>
                    </td>
                    <td className="text-center py-2 px-2">
                      <span className="text-white font-semibold font-bodax text-xs">{player.hsPercent}%</span>
                    </td>
                    <td className="text-center py-2 px-2">
                      <span className="text-white font-semibold font-bodax text-xs">{player.damage.toLocaleString()}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Achievements Section */}
        {allPlayers.some(p => calculateAchievements(p, allPlayers).length > 0) && (
          <div className="mt-4 pt-4 border-t border-gray-800">
            <h3 className="text-lg font-bold text-white mb-3 font-bodax uppercase tracking-wider">
              Achievements
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {allPlayers.map((player) => {
                const achievements = calculateAchievements(player, allPlayers);
                if (achievements.length === 0) return null;
                
                const isTeam1 = team1Players.some(p => p.puuid === player.puuid);
                const isCurrentUser = currentUser?.id && (
                  (team1?.members?.some(m => m.userId === currentUser.id) && isTeam1) ||
                  (team2?.members?.some(m => m.userId === currentUser.id) && !isTeam1)
                );
                
                return (
                  <div
                    key={player.puuid}
                    className={`bg-gray-900/50 border rounded-lg p-3 ${
                      isCurrentUser ? 'border-red-500/50' : 'border-gray-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${isTeam1 ? 'bg-red-500' : 'bg-blue-500'}`} />
                      <span className="text-white font-semibold font-bodax text-xs">
                        {player.gameName}
                      </span>
                      {isCurrentUser && (
                        <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-1 py-0.5 rounded font-mono uppercase">
                          YOU
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {achievements.map((achievement, idx) => (
                        <div
                          key={idx}
                          className={`flex items-center gap-1 ${achievement.color} text-xs font-semibold bg-gray-800/50 border border-gray-700 px-2 py-1 rounded`}
                          title={achievement.description}
                        >
                          {achievement.icon}
                          <span className="font-mono">{achievement.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Export View - Hidden but captured by html2canvas */}
      <div ref={exportRef} className="absolute left-0 top-0" style={{ width: '1200px', visibility: 'hidden', opacity: 0, zIndex: -1 }}>
        <div className="bg-[#0a0a0a] min-h-screen flex flex-col items-center justify-center p-8" style={{ width: '1200px', margin: '0 auto' }}>
          {/* BODAX Logo and Branding */}
          <div className="mb-8 flex flex-col items-center">
            <img 
              src="/bodax-pfp.png" 
              alt="BODAX Masters" 
              className="w-24 h-24 mb-4"
            />
            <div className="text-4xl font-bold font-bodax tracking-wider text-white mb-2">
              <span className="text-red-600">/</span> BODAX
            </div>
            <div className="text-sm text-gray-400 font-mono uppercase tracking-widest">
              MASTERS
            </div>
          </div>

          {/* Tournament Info */}
          <div className="mb-6 text-center">
            {tournament && (
              <div className="text-2xl font-bold text-white font-bodax mb-2">
                {tournament.name}
              </div>
            )}
            <div className="text-sm text-gray-400 font-mono space-y-1">
              {matchDate && (
                <>
                  <div>{formatDate(matchDate)}</div>
                  <div>{formatTime(matchDate)}</div>
                </>
              )}
            </div>
          </div>

          {/* Map and Score Section */}
          {(() => {
            let mapName = '';
            let mapScore = '';
            
            if (isBO3Match && hasMapResults) {
              if (match.mapResults?.map3 && match.deciderMap) {
                mapName = match.deciderMap;
                mapScore = `${match.mapResults.map3.team1Score} - ${match.mapResults.map3.team2Score}`;
              } else if (match.mapResults?.map2 && match.map2) {
                mapName = match.map2;
                mapScore = `${match.mapResults.map2.team1Score} - ${match.mapResults.map2.team2Score}`;
              } else if (match.mapResults?.map1 && match.map1) {
                mapName = match.map1;
                mapScore = `${match.mapResults.map1.team1Score} - ${match.mapResults.map1.team2Score}`;
              }
            } else if (match.selectedMap && match.resultSubmission?.team1SubmittedScore) {
              mapName = match.selectedMap;
              mapScore = `${match.resultSubmission.team1SubmittedScore.team1Score} - ${match.resultSubmission.team1SubmittedScore.team2Score}`;
            }
            
            if (mapName && mapScore) {
              return (
                <div className="mb-6">
                  <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 text-center max-w-xs mx-auto">
                    <div className="text-xs text-gray-400 font-mono uppercase mb-1">MAP</div>
                    <div className="text-lg font-bold text-white font-bodax mb-2">{mapName}</div>
                    <div className="text-2xl font-bold text-white font-bodax">
                      {mapScore}
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          })()}

          {/* Player Statistics Header */}
          <div className="mb-4 text-center">
            <h2 className="text-2xl font-bold text-white font-bodax uppercase tracking-wider mb-1">
              Player Statistics
            </h2>
            <p className="text-gray-400 font-mono uppercase tracking-widest text-sm">
              {team1?.name || 'Team 1'} vs {team2?.name || 'Team 2'}
            </p>
          </div>

          {/* Player Statistics Table */}
          <div className="w-full max-w-5xl overflow-x-auto rounded-lg border border-gray-800 mb-6">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900/50">
                  <th className="text-left py-3 px-4 text-xs font-bold text-gray-300 font-mono uppercase tracking-widest">PLAYER</th>
                  <th className="text-center py-3 px-3 text-xs font-bold text-gray-300 font-mono uppercase tracking-widest">K</th>
                  <th className="text-center py-3 px-3 text-xs font-bold text-gray-300 font-mono uppercase tracking-widest">D</th>
                  <th className="text-center py-3 px-3 text-xs font-bold text-gray-300 font-mono uppercase tracking-widest">A</th>
                  <th className="text-center py-3 px-3 text-xs font-bold text-gray-300 font-mono uppercase tracking-widest">K/D</th>
                  <th className="text-center py-3 px-3 text-xs font-bold text-gray-300 font-mono uppercase tracking-widest">ACS</th>
                  <th className="text-center py-3 px-3 text-xs font-bold text-gray-300 font-mono uppercase tracking-widest">FB</th>
                  <th className="text-center py-3 px-3 text-xs font-bold text-gray-300 font-mono uppercase tracking-widest">FD</th>
                  <th className="text-center py-3 px-3 text-xs font-bold text-gray-300 font-mono uppercase tracking-widest">HS%</th>
                  <th className="text-center py-3 px-3 text-xs font-bold text-gray-300 font-mono uppercase tracking-widest">DAMAGE</th>
                </tr>
              </thead>
              <tbody>
                {allPlayersSorted.map((player, idx) => {
                  const isTeam1 = team1Players.some(p => p.puuid === player.puuid);
                  
                  return (
                    <tr
                      key={player.puuid}
                      className={`border-b border-gray-900/50 ${idx % 2 === 0 ? 'bg-gray-900/20' : 'bg-transparent'}`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${isTeam1 ? 'bg-red-500' : 'bg-blue-500'}`} />
                          <div>
                            <div className="text-white font-semibold font-bodax text-sm">
                              {player.gameName}
                            </div>
                            <div className="text-xs text-gray-500 font-mono">
                              {player.puuid.substring(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="text-center py-3 px-3">
                        <span className="text-white font-semibold font-bodax text-sm">{player.kills}</span>
                      </td>
                      <td className="text-center py-3 px-3">
                        <span className="text-white font-semibold font-bodax text-sm">{player.deaths}</span>
                      </td>
                      <td className="text-center py-3 px-3">
                        <span className="text-white font-semibold font-bodax text-sm">{player.assists}</span>
                      </td>
                      <td className="text-center py-3 px-3">
                        <span className="text-white font-semibold font-bodax text-sm">{player.kdRatio.toFixed(2)}</span>
                      </td>
                      <td className="text-center py-3 px-3">
                        <span className="text-white font-semibold font-bodax text-sm">{player.acs}</span>
                      </td>
                      <td className="text-center py-3 px-3">
                        <span className="text-green-400 font-semibold font-bodax text-sm">{player.firstBloods}</span>
                      </td>
                      <td className="text-center py-3 px-3">
                        <span className="text-red-400 font-semibold font-bodax text-sm">{player.firstDeaths}</span>
                      </td>
                      <td className="text-center py-3 px-3">
                        <span className="text-white font-semibold font-bodax text-sm">{player.hsPercent}%</span>
                      </td>
                      <td className="text-center py-3 px-3">
                        <span className="text-white font-semibold font-bodax text-sm">{player.damage.toLocaleString()}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Achievements Section */}
          {allPlayers.some(p => calculateAchievements(p, allPlayers).length > 0) && (
            <div className="w-full max-w-5xl">
              <h3 className="text-xl font-bold text-white mb-4 font-bodax uppercase tracking-wider text-center">
                Achievements
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {allPlayers.map((player) => {
                  const achievements = calculateAchievements(player, allPlayers);
                  if (achievements.length === 0) return null;
                  
                  const isTeam1 = team1Players.some(p => p.puuid === player.puuid);
                  
                  return (
                    <div
                      key={player.puuid}
                      className="bg-gray-900/50 border border-gray-800 rounded-lg p-4"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-2 h-2 rounded-full ${isTeam1 ? 'bg-red-500' : 'bg-blue-500'}`} />
                        <span className="text-white font-semibold font-bodax text-sm">
                          {player.gameName}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {achievements.map((achievement, idx) => (
                          <div
                            key={idx}
                            className={`flex items-center gap-1 ${achievement.color} text-xs font-semibold bg-gray-800/50 border border-gray-700 px-2 py-1 rounded`}
                            title={achievement.description}
                          >
                            {achievement.icon}
                            <span className="font-mono">{achievement.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostMatchAnalytics;

