// Riot API Service for fetching match data and player statistics
// API Key: RGAPI-6101ed87-aeb5-436d-a31e-fb40ccf991e1

const RIOT_API_KEY = 'RGAPI-6101ed87-aeb5-436d-a31e-fb40ccf991e1';
const RIOT_API_BASE_URL = 'https://europe.api.riotgames.com'; // For account endpoints
const RIOT_API_BASE_URL_EU = 'https://eu.api.riotgames.com'; // For Valorant match endpoints (EU region)

// Parse Riot ID into gameName and tagLine
export const parseRiotId = (riotId: string): { gameName: string; tagLine: string } | null => {
  if (!riotId || !riotId.includes('#')) {
    return null;
  }
  
  const parts = riotId.split('#');
  if (parts.length !== 2) {
    return null;
  }
  
  return {
    gameName: parts[0].trim(),
    tagLine: parts[1].trim()
  };
};

// Get account info by Riot ID
export const getAccountByRiotId = async (gameName: string, tagLine: string) => {
  try {
    const url = `${RIOT_API_BASE_URL}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}?api_key=${RIOT_API_KEY}`;
    console.log('Fetching Riot account:', { gameName, tagLine, url: url.replace(RIOT_API_KEY, '***') });
    
    const response = await fetch(url);
    
    console.log('Riot API Response:', { status: response.status, statusText: response.statusText });
    
    if (!response.ok) {
      // Try to get error details from response
      let errorMessage = '';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.status?.message || '';
        console.log('Riot API Error Data:', errorData);
      } catch (e) {
        // Response might not be JSON
        const text = await response.text();
        console.log('Riot API Error Text:', text);
      }
      
      if (response.status === 404) {
        throw new Error(`Riot account not found: "${gameName}#${tagLine}". ${errorMessage ? `Details: ${errorMessage}` : 'Please verify the Riot ID is correct.'}`);
      }
      if (response.status === 403) {
        throw new Error(`Riot API key invalid or expired. Riot API keys expire after 24 hours. Please update the key in riotApiService.ts. ${errorMessage ? `Details: ${errorMessage}` : ''}`);
      }
      if (response.status === 401) {
        throw new Error(`Riot API unauthorized. Please check the API key. ${errorMessage ? `Details: ${errorMessage}` : ''}`);
      }
      throw new Error(`Riot API error (${response.status}): ${response.statusText}. ${errorMessage ? `Details: ${errorMessage}` : ''}`);
    }
    
    const data = await response.json();
    console.log('Riot API Success:', data);
    return data;
  } catch (error: any) {
    console.error('Error fetching Riot account:', error);
    throw error;
  }
};

// Get PUUID by Riot ID
export const getPuuidByRiotId = async (riotId: string): Promise<string | null> => {
  const parsed = parseRiotId(riotId);
  if (!parsed) {
    return null;
  }
  
  try {
    const account = await getAccountByRiotId(parsed.gameName, parsed.tagLine);
    return account.puuid;
  } catch (error) {
    console.error('Error getting PUUID:', error);
    return null;
  }
};

// Get match history for a player (last 20 matches)
// Valorant API: /val/match/v1/matchlists/by-puuid/{puuid}
export const getMatchHistory = async (puuid: string, startIndex: number = 0, count: number = 20): Promise<string[]> => {
  try {
    // Use eu.api.riotgames.com for Valorant match endpoints (not europe.api.riotgames.com)
    const url = `${RIOT_API_BASE_URL_EU}/val/match/v1/matchlists/by-puuid/${puuid}?start=${startIndex}&count=${count}&api_key=${RIOT_API_KEY}`;
    console.log('Fetching match history:', { puuid, url: url.replace(RIOT_API_KEY, '***') });
    
    const response = await fetch(url);
    
    console.log('Match History API Response:', { 
      status: response.status, 
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });
    
    if (!response.ok) {
      // Try to get error details
      let errorMessage = '';
      let errorData = null;
      try {
        const text = await response.text();
        console.log('Match History Error Response Text:', text);
        try {
          errorData = JSON.parse(text);
          errorMessage = errorData.message || errorData.status?.message || '';
          console.log('Match History Error Data:', errorData);
        } catch (e) {
          errorMessage = text || '';
        }
      } catch (e) {
        console.error('Error reading error response:', e);
      }
      
      if (response.status === 404) {
        console.log('No match history found (404) - player may have no matches');
        return [];
      }
      if (response.status === 403) {
        // Check if it's actually a rate limit or permissions issue
        if (errorMessage?.toLowerCase().includes('rate limit') || response.headers.get('retry-after')) {
          throw new Error(`Riot API rate limit exceeded. ${response.headers.get('retry-after') ? `Retry after ${response.headers.get('retry-after')} seconds.` : ''}`);
        }
        // More specific error message for 403 on match history
        const detailedError = `Riot API returned 403 Forbidden for match history endpoint. 
        
Possible causes:
1. Development API keys may have limited access to match history endpoints
2. The API key may need to be refreshed (keys expire after 24 hours)
3. The API key may not have the required permissions/scopes for match data
4. You may need a Production API key instead of a Development key

The account endpoint works, which confirms your key is valid, but match history requires additional permissions.

Check your Riot Developer Portal to verify:
- Your API key has access to VAL-MATCH-V1 endpoints
- Your key type (Development vs Production)
- Your key hasn't expired

Error details: ${errorMessage || 'Forbidden'}`;
        throw new Error(detailedError);
      }
      if (response.status === 401) {
        throw new Error(`Riot API unauthorized. Please check the API key. ${errorMessage ? `Details: ${errorMessage}` : ''}`);
      }
      throw new Error(`Riot API error (${response.status}): ${response.statusText}. ${errorMessage ? `Details: ${errorMessage}` : ''}`);
    }
    
    const data = await response.json();
    console.log('Match History Data:', data);
    
    // Valorant API returns an object with history array containing match objects
    // Each match object has: matchId, gameStartTimeMillis, queueId
    if (data.history && Array.isArray(data.history)) {
      return data.history; // Return full match objects, not just IDs
    }
    // Or it might return an array directly
    if (Array.isArray(data)) {
      return data;
    }
    return [];
  } catch (error: any) {
    console.error('Error fetching match history:', error);
    throw error;
  }
};

// Get match details by match ID
// Note: Match endpoints use eu.api.riotgames.com, not europe.api.riotgames.com
export const getMatchDetails = async (matchId: string) => {
  try {
    // Use EU regional endpoint for Valorant matches (eu.api.riotgames.com)
    const url = `${RIOT_API_BASE_URL_EU}/val/match/v1/matches/${matchId}?api_key=${RIOT_API_KEY}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      // Handle rate limiting (429)
      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after') || '60';
        throw new Error(`Riot API rate limit exceeded. Please wait ${retryAfter} seconds before trying again.`);
      }
      // Handle other errors
      let errorMessage = '';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.status?.message || '';
      } catch (e) {
        // Response might not be JSON
      }
      throw new Error(`Riot API error (${response.status}): ${errorMessage || response.statusText}`);
    }
    
    return await response.json();
  } catch (error: any) {
    console.error('Error fetching match details:', error);
    throw error;
  }
};

// Get recent matches for multiple players and find matches where they all played together
export const findTeamMatches = async (
  riotIds: string[],
  maxMatchesToCheck: number = 20
): Promise<Array<{
  matchId: string;
  matchDetails: any;
  allPlayersFound: boolean;
  playersInMatch: string[];
  matchResult?: {
    team1Score: number;
    team2Score: number;
    winningTeam: 'team1' | 'team2';
  };
}>> => {
  try {
    // Get PUUIDs for all players
    const puuidMap: { [riotId: string]: string } = {};
    const puuids: string[] = [];
    
    for (const riotId of riotIds) {
      const puuid = await getPuuidByRiotId(riotId);
      if (puuid) {
        puuidMap[riotId] = puuid;
        puuids.push(puuid);
      }
    }
    
    if (puuids.length === 0) {
      return [];
    }
    
    // Get match history for the first player (as reference)
    const referencePuuid = puuids[0];
    const matchIds = await getMatchHistory(referencePuuid, 0, maxMatchesToCheck);
    
    const teamMatches: Array<{
      matchId: string;
      matchDetails: any;
      allPlayersFound: boolean;
      playersInMatch: string[];
      matchResult?: {
        team1Score: number;
        team2Score: number;
        winningTeam: 'team1' | 'team2';
      };
    }> = [];
    
    // Check each match to see if all players were in it
    for (const matchId of matchIds) {
      try {
        const matchDetails = await getMatchDetails(matchId);
        
        // Get all player PUUIDs from the match
        const matchPlayerPuuids = new Set<string>();
        // Valorant API structure: players is an array
        const players = matchDetails.players || [];
        players.forEach((player: any) => {
          if (player.puuid) {
            matchPlayerPuuids.add(player.puuid);
          }
        });
        
        // Check how many of our players are in this match
        const playersInMatch = puuids.filter(puuid => matchPlayerPuuids.has(puuid));
        const allPlayersFound = playersInMatch.length === puuids.length;
        
        // Only include matches where at least 3 players from the team are present
        if (playersInMatch.length >= 3) {
          // Determine match result
          let matchResult: {
            team1Score: number;
            team2Score: number;
            winningTeam: 'team1' | 'team2';
          } | undefined;
          
          // Valorant API structure: teams is an object with red and blue
          if (matchDetails.teams) {
            const redTeam = matchDetails.teams.red;
            const blueTeam = matchDetails.teams.blue;
            
            if (redTeam && blueTeam) {
              const redScore = redTeam.roundsWon || redTeam.rounds_won || 0;
              const blueScore = blueTeam.roundsWon || blueTeam.rounds_won || 0;
              
              matchResult = {
                team1Score: redScore,
                team2Score: blueScore,
                winningTeam: redScore > blueScore ? 'team1' : 'team2'
              };
            }
          }
          
          // Map PUUIDs back to Riot IDs
          const playersInMatchRiotIds = playersInMatch
            .map(puuid => {
              const riotId = Object.keys(puuidMap).find(id => puuidMap[id] === puuid);
              return riotId || puuid;
            });
          
          teamMatches.push({
            matchId,
            matchDetails,
            allPlayersFound,
            playersInMatch: playersInMatchRiotIds,
            matchResult
          });
        }
      } catch (error) {
        console.error(`Error processing match ${matchId}:`, error);
        // Continue to next match
      }
    }
    
    return teamMatches;
  } catch (error: any) {
    console.error('Error finding team matches:', error);
    throw error;
  }
};

// Get player statistics from a match
export const getPlayerMatchStats = (matchDetails: any, puuid: string) => {
  const players = matchDetails.players || [];
  const player = players.find((p: any) => p.puuid === puuid);
  if (!player) {
    return null;
  }
  
  const stats = player.stats || {};
  return {
    kills: stats.kills || 0,
    deaths: stats.deaths || 0,
    assists: stats.assists || 0,
    score: stats.score || 0,
    damage: stats.damage || [],
    headshots: stats.headshots || 0,
    bodyshots: stats.bodyshots || 0,
    legshots: stats.legshots || 0,
    roundsPlayed: stats.roundsPlayed || stats.rounds_played || 0,
    teamId: player.teamId || player.team_id,
    characterId: player.characterId || player.character_id
  };
};

// Auto-detect match result from Riot API
// This function checks if players from both teams played a match together recently
export const autoDetectMatchResult = async (
  team1RiotIds: string[],
  team2RiotIds: string[],
  matchStartTime?: number, // Optional: match scheduled start time to narrow search
  timeWindowMinutes: number = 60 // How many minutes after match start to search
): Promise<{
  detected: boolean;
  matchId?: string;
  matchDetails?: any;
  team1Score?: number;
  team2Score?: number;
  detectedAt?: Date;
  confidence?: 'high' | 'medium' | 'low';
  team1PlayersFound?: number;
  team2PlayersFound?: number;
  error?: string;
} | null> => {
  try {
    console.log('Auto-detecting match result for teams:', { team1RiotIds, team2RiotIds });
    
    // Get all Riot IDs from both teams
    const allRiotIds = [...team1RiotIds, ...team2RiotIds].filter(Boolean);
    
    if (allRiotIds.length < 6) {
      console.log('Not enough Riot IDs to detect match (need at least 6 players)');
      return null;
    }
    
    // Get PUUIDs for all players - handle errors gracefully
    const puuidMap: { [riotId: string]: string } = {};
    const team1Puuids: string[] = [];
    const team2Puuids: string[] = [];
    
    // Process team 1 Riot IDs - handle individual failures gracefully
    for (const riotId of team1RiotIds) {
      if (!riotId) continue;
      try {
        const puuid = await getPuuidByRiotId(riotId);
        if (puuid) {
          puuidMap[riotId] = puuid;
          team1Puuids.push(puuid);
        } else {
          console.warn(`Could not get PUUID for Team 1 player: ${riotId} (Riot ID may be invalid or not found)`);
        }
      } catch (error: any) {
        console.warn(`Failed to get PUUID for Team 1 player ${riotId}:`, error.message || error);
        // Continue processing other players even if one fails
      }
    }
    
    // Process team 2 Riot IDs - handle individual failures gracefully
    for (const riotId of team2RiotIds) {
      if (!riotId) continue;
      try {
        const puuid = await getPuuidByRiotId(riotId);
        if (puuid) {
          puuidMap[riotId] = puuid;
          team2Puuids.push(puuid);
        } else {
          console.warn(`Could not get PUUID for Team 2 player: ${riotId} (Riot ID may be invalid or not found)`);
        }
      } catch (error: any) {
        console.warn(`Failed to get PUUID for Team 2 player ${riotId}:`, error.message || error);
        // Continue processing other players even if one fails
      }
    }
    
    // Only need 3 valid players from each team (more lenient)
    if (team1Puuids.length < 3 || team2Puuids.length < 3) {
      console.log(`Not enough valid PUUIDs to detect match. Team 1: ${team1Puuids.length}/3, Team 2: ${team2Puuids.length}/3`);
      return null;
    }
    
    // Helper function to check matches from a player's history
    const checkMatchesFromHistory = async (matchHistory: any[], referenceTeam: 'team1' | 'team2'): Promise<any> => {
      // Filter matches by time if matchStartTime is provided
      // If no matchStartTime, check matches from the last 24 hours (more lenient for testing)
      const now = Date.now();
      let searchStartTime: number;
      let searchEndTime: number;
      
      if (matchStartTime) {
        // Use match scheduled time as center, search before and after
        searchStartTime = matchStartTime - (timeWindowMinutes * 60 * 1000); // Search before match time too
        searchEndTime = matchStartTime + (timeWindowMinutes * 60 * 1000); // And after
      } else {
        // No match time provided - check last 7 days for testing old matches
        const defaultTimeWindow = 10080; // 7 days in minutes
        searchStartTime = now - (defaultTimeWindow * 60 * 1000);
        searchEndTime = now;
      }
      
      console.log(`Checking ${matchHistory.length} matches from ${referenceTeam} player history (looking for custom/tournament matches)`);
      console.log(`Time window: ${new Date(searchStartTime).toISOString()} to ${new Date(searchEndTime).toISOString()}`);
      
      // Track statistics for debugging
      let matchesChecked = 0;
      let matchesSkippedTime = 0;
      let matchesSkippedQueue = 0;
      let matchesSkippedPlayers = 0;
      let matchesWithTeam1Only = 0;
      let matchesWithTeam2Only = 0;
      
      // Check each match
      for (const matchEntry of matchHistory) {
        try {
        // Match history returns match objects with matchId, queueId, gameStartTimeMillis
        let matchId: string;
        let queueId: string | undefined;
        let gameStartTime: number | undefined;
        
        if (typeof matchEntry === 'string') {
          matchId = matchEntry;
        } else if (matchEntry && typeof matchEntry === 'object') {
          matchId = matchEntry.matchId || (matchEntry as any).id || '';
          queueId = matchEntry.queueId || (matchEntry as any).queue_id;
          gameStartTime = matchEntry.gameStartTimeMillis || (matchEntry as any).gameStartTime || (matchEntry as any).game_start_time_millis;
        } else {
          continue;
        }
        
        if (!matchId || typeof matchId !== 'string') continue;
        
        // Filter for custom/tournament matches
        // Custom matches typically have queueId: "custom" or empty/null queueId
        // Skip competitive/ranked matches as those are not tournament matches
        let isCustomMatch = false;
        if (queueId) {
          const queueIdLower = queueId.toLowerCase();
          // Skip competitive, unrated, deathmatch, etc. - only check custom/tournament matches
          if (queueIdLower.includes('competitive') || 
              queueIdLower.includes('unrated') || 
              queueIdLower.includes('deathmatch') ||
              queueIdLower.includes('spike rush') ||
              queueIdLower.includes('escalation') ||
              queueIdLower.includes('replication')) {
            continue; // Skip non-custom matches
          }
          // Check if it's a custom match
          if (queueIdLower.includes('custom') || queueId === '' || queueId === null) {
            isCustomMatch = true;
            console.log(`Found potential custom match ${matchId} (queueId: ${queueId || 'empty'})`);
          }
        } else {
          // If no queueId, assume it might be a custom match and check it
          isCustomMatch = true;
          console.log(`Checking match ${matchId} (no queueId - likely custom)`);
        }
        
        // Pre-filter by time if we have gameStartTime from match history
        // Only filter if we have a matchStartTime to compare against
        if (gameStartTime && matchStartTime) {
          if (gameStartTime < searchStartTime || gameStartTime > searchEndTime) {
            const matchDate = new Date(gameStartTime).toISOString();
            const windowStart = new Date(searchStartTime).toISOString();
            const windowEnd = new Date(searchEndTime).toISOString();
            console.log(`Skipping match ${matchId} - outside time window (match: ${matchDate}, window: ${windowStart} to ${windowEnd})`);
            matchesSkippedTime++;
            continue; // Match is outside our time window
          }
        } else if (gameStartTime && !matchStartTime) {
          // If no matchStartTime provided, only check matches from last 7 days
          const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
          if (gameStartTime < sevenDaysAgo) {
            const matchDate = new Date(gameStartTime).toISOString();
            console.log(`Skipping match ${matchId} - too old (match: ${matchDate}, more than 7 days ago)`);
            matchesSkippedTime++;
            continue;
          }
        }
        
        // Fetch match details - handle rate limits gracefully
        let matchDetails;
        try {
          matchDetails = await getMatchDetails(matchId);
        } catch (error: any) {
          // If we hit a rate limit, log and skip this match but continue
          if (error.message?.includes('rate limit')) {
            console.warn(`Rate limit hit while fetching match ${matchId}. Skipping this match.`);
            continue;
          }
          // For other errors, also skip this match but continue searching
          console.warn(`Error fetching match details for ${matchId}:`, error.message || error);
          continue;
        }
        
        // Check match time (if we didn't already filter by it)
        const matchTime = matchDetails.matchInfo?.gameStartMillis || gameStartTime;
        if (matchTime && matchStartTime) {
          // Only filter by time if we have a matchStartTime to compare against
          if (matchTime < searchStartTime || matchTime > searchEndTime) {
            const matchDate = new Date(matchTime).toISOString();
            const windowStart = new Date(searchStartTime).toISOString();
            const windowEnd = new Date(searchEndTime).toISOString();
            console.log(`Skipping match ${matchId} - outside time window (match: ${matchDate}, window: ${windowStart} to ${windowEnd})`);
            matchesSkippedTime++;
            continue; // Match is outside our time window
          }
        } else if (matchTime && !matchStartTime) {
          // If no matchStartTime provided, only check matches from last 7 days
          const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
          if (matchTime < sevenDaysAgo) {
            const matchDate = new Date(matchTime).toISOString();
            console.log(`Skipping match ${matchId} - too old (match: ${matchDate}, more than 7 days ago)`);
            matchesSkippedTime++;
            continue;
          }
        } else {
          console.log(`Match ${matchId} has no timestamp - checking anyway`);
        }
        
        matchesChecked++;
        
        // Double-check queueId from match details if available
        const matchQueueId = matchDetails.matchInfo?.queueID || matchDetails.matchInfo?.queueId;
        if (matchQueueId) {
          const matchQueueIdLower = matchQueueId.toLowerCase();
          // Skip competitive/ranked matches
          if (matchQueueIdLower.includes('competitive') || 
              matchQueueIdLower.includes('unrated') || 
              matchQueueIdLower.includes('deathmatch') ||
              matchQueueIdLower.includes('spike rush') ||
              matchQueueIdLower.includes('escalation') ||
              matchQueueIdLower.includes('replication')) {
            console.log(`Skipping match ${matchId} - not a custom/tournament match (queueId: ${matchQueueId})`);
            matchesSkippedQueue++;
            continue;
          }
          // Mark as custom if queueId indicates it
          if (matchQueueIdLower.includes('custom') || matchQueueId === '' || matchQueueId === null) {
            isCustomMatch = true;
          }
        } else {
          // No queueId in match details either - likely custom
          isCustomMatch = true;
        }
        
        console.log(`Analyzing match ${matchId} (${isCustomMatch ? 'custom' : 'tournament'} match)`);
        
        // Get all player PUUIDs from the match
        const matchPlayers = matchDetails.players || [];
        const matchPlayerPuuids = new Set<string>();
        matchPlayers.forEach((player: any) => {
          if (player.puuid) {
            matchPlayerPuuids.add(player.puuid);
          }
        });
        
        // Count how many players from each team are in this match
        const team1PlayersInMatch = team1Puuids.filter(puuid => matchPlayerPuuids.has(puuid));
        const team2PlayersInMatch = team2Puuids.filter(puuid => matchPlayerPuuids.has(puuid));
        
        console.log(`Match ${matchId}: Team 1 players found: ${team1PlayersInMatch.length}/${team1Puuids.length}, Team 2 players found: ${team2PlayersInMatch.length}/${team2Puuids.length}`);
        
        // We need at least 3 players from each team (accounting for subs/coaches - only 5 actually play)
        const minPlayersPerTeam = 3;
        const hasTeam1 = team1PlayersInMatch.length >= minPlayersPerTeam;
        const hasTeam2 = team2PlayersInMatch.length >= minPlayersPerTeam;
        
        if (!hasTeam1 || !hasTeam2) {
          console.log(`Match ${matchId} doesn't have enough players: Team 1: ${team1PlayersInMatch.length} (need ${minPlayersPerTeam}), Team 2: ${team2PlayersInMatch.length} (need ${minPlayersPerTeam})`);
          matchesSkippedPlayers++;
          if (hasTeam1 && !hasTeam2) matchesWithTeam1Only++;
          if (hasTeam2 && !hasTeam1) matchesWithTeam2Only++;
        }
        
        if (hasTeam1 && hasTeam2) {
          // Found a match! Extract scores
          console.log('Match details structure:', {
            hasTeams: !!matchDetails.teams,
            teamsKeys: matchDetails.teams ? Object.keys(matchDetails.teams) : [],
            matchInfo: matchDetails.matchInfo ? {
              gameMode: matchDetails.matchInfo.gameMode,
              gameStartMillis: matchDetails.matchInfo.gameStartMillis,
              queueID: matchDetails.matchInfo.queueID
            } : null
          });
          
          const teams = matchDetails.teams || {};
          const redTeam = teams.red || teams.Red || {};
          const blueTeam = teams.blue || teams.Blue || {};
          
          console.log('Team scores structure:', {
            redTeam: redTeam,
            blueTeam: blueTeam,
            redTeamKeys: Object.keys(redTeam),
            blueTeamKeys: Object.keys(blueTeam)
          });
          
          // Try multiple possible score field names
          // Valorant API structure: teams.red.roundsWon or teams.red.rounds_won
          let redScore = redTeam.roundsWon ?? redTeam.rounds_won ?? redTeam.numRoundWins ?? redTeam.score ?? redTeam.roundsWon ?? 0;
          let blueScore = blueTeam.roundsWon ?? blueTeam.rounds_won ?? blueTeam.numRoundWins ?? blueTeam.score ?? blueTeam.roundsWon ?? 0;
          
          // Convert to numbers if they're strings
          redScore = typeof redScore === 'string' ? parseInt(redScore, 10) || 0 : (redScore || 0);
          blueScore = typeof blueScore === 'string' ? parseInt(blueScore, 10) || 0 : (blueScore || 0);
          
          // If scores are still 0, try to calculate from round results
          if (redScore === 0 && blueScore === 0 && matchDetails.roundResults) {
            console.log('Scores are 0, trying to calculate from round results');
            const roundResults = matchDetails.roundResults || [];
            redScore = roundResults.filter((round: any) => {
              const winningTeam = round.winningTeam || round.winner || round.teamId;
              return winningTeam === 'Red' || winningTeam === 'red' || winningTeam === 'RED';
            }).length;
            blueScore = roundResults.filter((round: any) => {
              const winningTeam = round.winningTeam || round.winner || round.teamId;
              return winningTeam === 'Blue' || winningTeam === 'blue' || winningTeam === 'BLUE';
            }).length;
            console.log('Calculated scores from rounds:', { redScore, blueScore, totalRounds: roundResults.length });
          }
          
          console.log('Final extracted scores:', { redScore, blueScore });
          
          // Determine which team is which based on player distribution
          // Players from team1 should be on one side, team2 on the other
          const team1OnRed = team1PlayersInMatch.some(puuid => {
            const player = matchPlayers.find((p: any) => p.puuid === puuid);
            return player && (player.teamId === 'Red' || player.teamId === 'red');
          });
          
          let team1Score: number;
          let team2Score: number;
          
          if (team1OnRed) {
            team1Score = redScore;
            team2Score = blueScore;
          } else {
            team1Score = blueScore;
            team2Score = redScore;
          }
          
          // Calculate confidence
          const totalPlayers = team1PlayersInMatch.length + team2PlayersInMatch.length;
          let confidence: 'high' | 'medium' | 'low' = 'low';
          if (totalPlayers >= 9) confidence = 'high';
          else if (totalPlayers >= 7) confidence = 'medium';
          
          // Ensure scores are valid numbers
          const finalTeam1Score = Number(team1Score) || 0;
          const finalTeam2Score = Number(team2Score) || 0;
          
          console.log('Match detected!', {
            matchId,
            team1Score: finalTeam1Score,
            team2Score: finalTeam2Score,
            team1Players: team1PlayersInMatch.length,
            team2Players: team2PlayersInMatch.length,
            confidence,
            redScore,
            blueScore,
            team1OnRed
          });
          
          if (finalTeam1Score === 0 && finalTeam2Score === 0) {
            console.warn('WARNING: Both scores are 0! This might indicate an issue with score extraction.');
            console.warn('Match details teams:', JSON.stringify(matchDetails.teams, null, 2));
          }
          
          return {
            detected: true,
            matchId,
            matchDetails,
            team1Score: finalTeam1Score,
            team2Score: finalTeam2Score,
            detectedAt: new Date(),
            confidence,
            team1PlayersFound: team1PlayersInMatch.length,
            team2PlayersFound: team2PlayersInMatch.length
          };
        }
      } catch (error) {
        console.error(`Error checking match ${matchEntry}:`, error);
        continue;
      }
    }
    
    console.log(`No matching match found in ${referenceTeam} player history`);
    console.log(`Match detection summary (${referenceTeam}):
      - Total matches in history: ${matchHistory.length}
      - Matches checked: ${matchesChecked}
      - Skipped (time window): ${matchesSkippedTime}
      - Skipped (queue type): ${matchesSkippedQueue}
      - Skipped (not enough players): ${matchesSkippedPlayers}
      - Matches with Team 1 only: ${matchesWithTeam1Only}
      - Matches with Team 2 only: ${matchesWithTeam2Only}
      - Team 1 PUUIDs available: ${team1Puuids.length}
      - Team 2 PUUIDs available: ${team2Puuids.length}`);
    return null;
    };
    
    // Get match history from a reference player
    // Try multiple players if the first one has no matches
    let matchHistory: any[] = [];
    let referencePuuid = team1Puuids[0];
    
    // Try team 1 players first
    for (const puuid of team1Puuids) {
      const history = await getMatchHistory(puuid, 0, 100);
      if (history && history.length > 0) {
        matchHistory = history;
        referencePuuid = puuid;
        console.log(`Using player ${puuid.substring(0, 8)}... as reference (${history.length} matches found)`);
        break;
      }
    }
    
    // Try checking matches from Team 1 player's history
    if (matchHistory.length > 0) {
      const result = await checkMatchesFromHistory(matchHistory, 'team1');
      if (result && result.detected) {
        return result;
      }
    }
    
    // If no match found with Team 1, try Team 2 players
    matchHistory = [];
    for (const puuid of team2Puuids) {
      const history = await getMatchHistory(puuid, 0, 100);
      if (history && history.length > 0) {
        matchHistory = history;
        referencePuuid = puuid;
        console.log(`Trying team 2 player ${puuid.substring(0, 8)}... as reference (${history.length} matches found)`);
        break;
      }
    }
    
    // Try checking matches from Team 2 player's history
    if (matchHistory.length > 0) {
      const result = await checkMatchesFromHistory(matchHistory, 'team2');
      if (result && result.detected) {
        return result;
      }
    }
    
    // If still no matches, log warning and return early
    if (matchHistory.length === 0) {
      console.warn('No match history found for any player. This might indicate:');
      console.warn('1. The players haven\'t played any matches recently');
      console.warn('2. The match wasn\'t actually played in-game');
      console.warn('3. The Riot API isn\'t returning match history (possible API issue)');
      console.warn(`Team 1 players checked: ${team1Puuids.length}, Team 2 players checked: ${team2Puuids.length}`);
      return { detected: false };
    }
    
    console.log('No matching match found after checking both Team 1 and Team 2 player histories');
    return null;
  } catch (error: any) {
    console.error('Error auto-detecting match result:', error);
    return null;
  }
};

// Get aggregated statistics for a team from multiple matches
export const getTeamStatistics = async (
  riotIds: string[],
  maxMatches: number = 10
): Promise<{
  totalMatches: number;
  wins: number;
  losses: number;
  averageScore: number;
  playerStats: Array<{
    riotId: string;
    totalKills: number;
    totalDeaths: number;
    totalAssists: number;
    averageKills: number;
    averageDeaths: number;
    averageAssists: number;
    kdRatio: number;
    matchesPlayed: number;
  }>;
}> => {
  const teamMatches = await findTeamMatches(riotIds, maxMatches);
  
  const playerStatsMap: { [riotId: string]: {
    totalKills: number;
    totalDeaths: number;
    totalAssists: number;
    matchesPlayed: number;
  } } = {};
  
  // Initialize stats for all players
  riotIds.forEach(riotId => {
    playerStatsMap[riotId] = {
      totalKills: 0,
      totalDeaths: 0,
      totalAssists: 0,
      matchesPlayed: 0
    };
  });
  
  let wins = 0;
  let losses = 0;
  let totalScore = 0;
  
  // Process each match
  for (const teamMatch of teamMatches) {
    if (!teamMatch.matchResult) continue;
    
    const { team1Score, team2Score, winningTeam } = teamMatch.matchResult;
    totalScore += Math.max(team1Score, team2Score);
    
    // Determine if this was a win or loss for our team
    // Note: This is simplified - we'd need to know which side our team was on
    // For now, we'll count matches where team1 won as wins
    if (winningTeam === 'team1') {
      wins++;
    } else {
      losses++;
    }
    
    // Get stats for each player in the match
    for (const riotId of teamMatch.playersInMatch) {
      const parsed = parseRiotId(riotId);
      if (!parsed) continue;
      
      const puuid = await getPuuidByRiotId(riotId);
      if (!puuid) continue;
      
      const stats = getPlayerMatchStats(teamMatch.matchDetails, puuid);
      if (stats) {
        if (!playerStatsMap[riotId]) {
          playerStatsMap[riotId] = {
            totalKills: 0,
            totalDeaths: 0,
            totalAssists: 0,
            matchesPlayed: 0
          };
        }
        
        playerStatsMap[riotId].totalKills += stats.kills;
        playerStatsMap[riotId].totalDeaths += stats.deaths;
        playerStatsMap[riotId].totalAssists += stats.assists;
        playerStatsMap[riotId].matchesPlayed++;
      }
    }
  }
  
  const playerStats = Object.entries(playerStatsMap).map(([riotId, stats]) => ({
    riotId,
    totalKills: stats.totalKills,
    totalDeaths: stats.totalDeaths,
    totalAssists: stats.totalAssists,
    averageKills: stats.matchesPlayed > 0 ? stats.totalKills / stats.matchesPlayed : 0,
    averageDeaths: stats.matchesPlayed > 0 ? stats.totalDeaths / stats.matchesPlayed : 0,
    averageAssists: stats.matchesPlayed > 0 ? stats.totalAssists / stats.matchesPlayed : 0,
    kdRatio: stats.totalDeaths > 0 ? stats.totalKills / stats.totalDeaths : stats.totalKills,
    matchesPlayed: stats.matchesPlayed
  }));
  
  return {
    totalMatches: teamMatches.length,
    wins,
    losses,
    averageScore: teamMatches.length > 0 ? totalScore / teamMatches.length : 0,
    playerStats
  };
};

// Suggest match outcome based on recent team matches
export const suggestMatchOutcome = async (
  team1RiotIds: string[],
  team2RiotIds: string[],
  maxMatchesToCheck: number = 10
): Promise<{
  suggestedScore?: {
    team1Score: number;
    team2Score: number;
  };
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  recentMatches: number;
  team1RecentWins: number;
  team2RecentWins: number;
  team1AverageScore: number;
  team2AverageScore: number;
} | null> => {
  try {
    // Get recent matches for both teams
    const team1Matches = await findTeamMatches(team1RiotIds, maxMatchesToCheck);
    const team2Matches = await findTeamMatches(team2RiotIds, maxMatchesToCheck);
    
    if (team1Matches.length === 0 && team2Matches.length === 0) {
      return {
        confidence: 'low',
        reasoning: 'No recent match data found for either team',
        recentMatches: 0,
        team1RecentWins: 0,
        team2RecentWins: 0,
        team1AverageScore: 0,
        team2AverageScore: 0
      };
    }
    
    // Calculate win rates and average scores
    let team1Wins = 0;
    let team1TotalScore = 0;
    let team1MatchCount = 0;
    
    let team2Wins = 0;
    let team2TotalScore = 0;
    let team2MatchCount = 0;
    
    team1Matches.forEach(match => {
      if (match.matchResult) {
        team1MatchCount++;
        team1TotalScore += Math.max(match.matchResult.team1Score, match.matchResult.team2Score);
        if (match.matchResult.winningTeam === 'team1') {
          team1Wins++;
        }
      }
    });
    
    team2Matches.forEach(match => {
      if (match.matchResult) {
        team2MatchCount++;
        team2TotalScore += Math.max(match.matchResult.team1Score, match.matchResult.team2Score);
        if (match.matchResult.winningTeam === 'team1') {
          team2Wins++;
        }
      }
    });
    
    const team1AverageScore = team1MatchCount > 0 ? team1TotalScore / team1MatchCount : 0;
    const team2AverageScore = team2MatchCount > 0 ? team2TotalScore / team2MatchCount : 0;
    const team1WinRate = team1MatchCount > 0 ? team1Wins / team1MatchCount : 0;
    const team2WinRate = team2MatchCount > 0 ? team2Wins / team2MatchCount : 0;
    
    // Determine confidence
    let confidence: 'high' | 'medium' | 'low' = 'low';
    if (team1MatchCount >= 5 && team2MatchCount >= 5) {
      confidence = 'high';
    } else if (team1MatchCount >= 3 || team2MatchCount >= 3) {
      confidence = 'medium';
    }
    
    // Suggest score based on average scores and win rates
    let suggestedScore: { team1Score: number; team2Score: number } | undefined;
    let reasoning = '';
    
    if (team1MatchCount > 0 || team2MatchCount > 0) {
      // Base score on average rounds won, but adjust for win rate
      const baseScore = 13; // Standard Valorant match length
      const team1Score = Math.round(team1AverageScore * (team1WinRate > 0.5 ? 1.1 : 0.9));
      const team2Score = Math.round(team2AverageScore * (team2WinRate > 0.5 ? 1.1 : 0.9));
      
      // Normalize to a realistic score (13-0 to 13-11 range)
      const total = team1Score + team2Score;
      if (total > 0) {
        const normalizedTeam1 = Math.round((team1Score / total) * 13);
        const normalizedTeam2 = Math.round((team2Score / total) * 13);
        
        // Ensure at least one team reaches 13
        if (normalizedTeam1 >= 13) {
          suggestedScore = { team1Score: 13, team2Score: Math.min(normalizedTeam2, 11) };
        } else if (normalizedTeam2 >= 13) {
          suggestedScore = { team1Score: Math.min(normalizedTeam1, 11), team2Score: 13 };
        } else {
          // Neither reached 13, pick winner based on win rate
          if (team1WinRate > team2WinRate) {
            suggestedScore = { team1Score: 13, team2Score: Math.max(0, normalizedTeam2) };
          } else {
            suggestedScore = { team1Score: Math.max(0, normalizedTeam1), team2Score: 13 };
          }
        }
      }
      
      reasoning = `Based on ${team1MatchCount + team2MatchCount} recent matches: Team 1 win rate ${(team1WinRate * 100).toFixed(0)}%, avg score ${team1AverageScore.toFixed(1)}. Team 2 win rate ${(team2WinRate * 100).toFixed(0)}%, avg score ${team2AverageScore.toFixed(1)}.`;
    }
    
    return {
      suggestedScore,
      confidence,
      reasoning,
      recentMatches: team1MatchCount + team2MatchCount,
      team1RecentWins: team1Wins,
      team2RecentWins: team2Wins,
      team1AverageScore,
      team2AverageScore
    };
  } catch (error: any) {
    console.error('Error suggesting match outcome:', error);
    return null;
  }
};

