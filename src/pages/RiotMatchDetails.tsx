import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getMatchDetails } from '../services/riotApiService';
import { Shield, ArrowLeft, Loader2, AlertCircle, Users, Target, Trophy, Clock, MapPin, Gamepad2, BarChart3, Download, Copy, CheckCircle, Zap, TrendingUp, Activity, Skull, Crosshair, DollarSign, Award } from 'lucide-react';
import { toast } from 'react-hot-toast';

const RiotMatchDetails = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { currentUser, loading: authLoading } = useAuth();
  
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [matchDetails, setMatchDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Check admin status
  useEffect(() => {
    const checkAdmin = async () => {
      if (authLoading) return;
      
      if (!currentUser) {
        toast.error('Please log in to access this page.');
        navigate('/');
        return;
      }
      
      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('../config/firebase');
        const userDoc = await getDoc(doc(db, 'users', currentUser.id));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const adminStatus = userData.isAdmin || false;
          setIsAdmin(adminStatus);
          
          if (!adminStatus) {
            toast.error('Access denied. Admin only.');
            navigate('/');
          }
        } else {
          setIsAdmin(false);
          navigate('/');
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
        navigate('/');
      }
    };
    
    checkAdmin();
  }, [currentUser, authLoading, navigate]);

  // Load match details
  useEffect(() => {
    if (isAdmin === true && matchId) {
      loadMatchDetails();
    }
  }, [isAdmin, matchId]);

  const loadMatchDetails = async () => {
    if (!matchId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const details = await getMatchDetails(matchId);
      console.log('Full match details:', details);
      
      // Log team scores for debugging
      if (details.teams) {
        console.log('Team scores:', {
          red: details.teams.red || details.teams.Red,
          blue: details.teams.blue || details.teams.Blue,
          teamsKeys: Object.keys(details.teams)
        });
      }
      
      // Log player stats structure for debugging
      if (details.players && details.players.length > 0) {
        const samplePlayer = details.players[0];
        console.log('Sample player stats structure:', {
          player: samplePlayer,
          stats: samplePlayer.stats,
          statsKeys: samplePlayer.stats ? Object.keys(samplePlayer.stats) : [],
          damageType: typeof samplePlayer.stats?.damage,
          damageIsArray: Array.isArray(samplePlayer.stats?.damage),
          damageValue: samplePlayer.stats?.damage
        });
      }
      
      // Log round results structure
      if (details.roundResults && details.roundResults.length > 0) {
        console.log('Round results count:', details.roundResults.length);
        console.log('Sample round result structure:', details.roundResults[0]);
        console.log('Round winners:', details.roundResults.map((r: any) => r.winningTeam || r.winner || r.teamId));
      }
      
      setMatchDetails(details);
    } catch (error: any) {
      console.error('Error loading match details:', error);
      setError(error.message || 'Failed to load match details');
      toast.error(`Failed to load match: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const downloadJSON = () => {
    if (!matchDetails) return;
    const dataStr = JSON.stringify(matchDetails, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `match-${matchId}-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Match data downloaded!');
  };

  if (authLoading || isAdmin === null || loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
      </div>
    );
  }

  if (isAdmin === false) {
    return null;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="bg-[#0a0a0a] border border-gray-800 p-8 max-w-md mx-auto">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-4 font-bodax text-center uppercase tracking-wider">Error Loading Match</h1>
          <p className="text-gray-400 font-mono text-center mb-6">{error}</p>
          <button
            onClick={() => navigate('/admin/riot-api-testing')}
            className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white border border-red-800 font-bodax uppercase tracking-wider transition-colors"
          >
            Back to Riot API Testing
          </button>
        </div>
      </div>
    );
  }

  if (!matchDetails) {
    return null;
  }

  const matchInfo = matchDetails.matchInfo || {};
  const teams = matchDetails.teams || {};
  const players = matchDetails.players || [];
  const roundResults = matchDetails.roundResults || [];

  // Extract all possible stats
  const redTeam = teams.red || teams.Red || {};
  const blueTeam = teams.blue || teams.Blue || {};
  const redPlayers = players.filter((p: any) => (p.teamId || p.team_id) === 'Red' || (p.teamId || p.team_id) === 'red');
  const bluePlayers = players.filter((p: any) => (p.teamId || p.team_id) === 'Blue' || (p.teamId || p.team_id) === 'blue');

  // Calculate team stats
  const calculateTeamStats = (teamPlayers: any[]) => {
    const stats = {
      totalKills: 0,
      totalDeaths: 0,
      totalAssists: 0,
      totalScore: 0,
      totalDamage: 0,
      totalHeadshots: 0,
      totalBodyshots: 0,
      totalLegshots: 0,
      firstBloods: 0,
      firstDeaths: 0,
      roundsPlayed: 0,
      averageACS: 0,
      postPlants: 0,
      clutches: 0,
    };

    teamPlayers.forEach((player: any) => {
      const pStats = player.stats || {};
      stats.totalKills += pStats.kills || 0;
      stats.totalDeaths += pStats.deaths || 0;
      stats.totalAssists += pStats.assists || 0;
      stats.totalScore += pStats.score || 0;
      
      if (pStats.damage) {
        if (Array.isArray(pStats.damage)) {
          // Handle array of numbers or objects
          stats.totalDamage += pStats.damage.reduce((sum: number, d: any) => {
            if (typeof d === 'number') return sum + d;
            if (typeof d === 'object' && d !== null) {
              return sum + (d.damage || d.value || d.total || d.dealt || 0);
            }
            return sum;
          }, 0);
        } else if (typeof pStats.damage === 'number') {
          stats.totalDamage += pStats.damage;
        } else if (typeof pStats.damage === 'object' && pStats.damage !== null) {
          stats.totalDamage += pStats.damage.total || pStats.damage.dealt || pStats.damage.value || 0;
        }
      }
      
      // Headshots with multiple field name fallbacks
      stats.totalHeadshots += pStats.headshots || pStats.headShots || pStats.head_shots || 
                             pStats.shotsHead || pStats.shots_head || 0;
      stats.totalBodyshots += pStats.bodyshots || pStats.bodyShots || pStats.body_shots || 
                             pStats.shotsBody || pStats.shots_body || 0;
      stats.totalLegshots += pStats.legshots || pStats.legShots || pStats.leg_shots || 
                            pStats.shotsLeg || pStats.shots_leg || 0;
      stats.firstBloods += pStats.firstBloods || pStats.firstBloodsFirstDeath || 
                          pStats.firstBlood || pStats.first_blood || 0;
      stats.firstDeaths += pStats.firstDeaths || pStats.firstDeathsFirstBlood || 
                          pStats.firstDeath || pStats.first_death || 0;
      stats.roundsPlayed = Math.max(stats.roundsPlayed, pStats.roundsPlayed || pStats.rounds_played || 0);
    });

    stats.averageACS = teamPlayers.length > 0 ? Math.round(stats.totalScore / (stats.roundsPlayed || 1) / teamPlayers.length) : 0;

    // Count post plants and clutches from round results
    roundResults.forEach((round: any) => {
      const winningTeam = round.winningTeam || round.winner;
      const isTeamRound = (winningTeam === 'Red' || winningTeam === 'red') ? 'red' : 'blue';
      
      if (round.plantRoundTime && isTeamRound === (teamPlayers[0]?.teamId === 'Red' || teamPlayers[0]?.teamId === 'red' ? 'red' : 'blue')) {
        stats.postPlants++;
      }
      
      // Clutches: 1vX situations won
      if (round.playerStats) {
        const teamPlayerStats = round.playerStats.filter((p: any) => {
          const pTeamId = p.teamId || p.team_id;
          return teamPlayers.some((tp: any) => (tp.teamId || tp.team_id) === pTeamId);
        });
        
        if (teamPlayerStats.length === 1 && winningTeam === (teamPlayers[0]?.teamId === 'Red' || teamPlayers[0]?.teamId === 'red' ? 'Red' : 'Blue')) {
          stats.clutches++;
        }
      }
    });

    return stats;
  };

  const redTeamStats = calculateTeamStats(redPlayers);
  const blueTeamStats = calculateTeamStats(bluePlayers);

  // Count first kills per team from rounds
  let redFirstKills = 0;
  let blueFirstKills = 0;
  roundResults.forEach((round: any) => {
    if (round.firstKill) {
      const firstKillTeam = redPlayers.some((p: any) => p.puuid === round.firstKill.puuid || p.subject === round.firstKill.subject) ? 'red' : 'blue';
      if (firstKillTeam === 'red') redFirstKills++;
      else blueFirstKills++;
    }
  });

  // Sort players by ACS (score)
  const sortedRedPlayers = [...redPlayers].sort((a: any, b: any) => {
    const aScore = (a.stats?.score || 0) / (a.stats?.roundsPlayed || a.stats?.rounds_played || 1);
    const bScore = (b.stats?.score || 0) / (b.stats?.roundsPlayed || b.stats?.rounds_played || 1);
    return bScore - aScore;
  });

  const sortedBluePlayers = [...bluePlayers].sort((a: any, b: any) => {
    const aScore = (a.stats?.score || 0) / (a.stats?.roundsPlayed || a.stats?.rounds_played || 1);
    const bScore = (b.stats?.score || 0) / (b.stats?.roundsPlayed || b.stats?.rounds_played || 1);
    return bScore - aScore;
  });

  // Round wins tracking
  const redRoundWins: number[] = [];
  const blueRoundWins: number[] = [];
  roundResults.forEach((round: any, idx: number) => {
    const winningTeam = round.winningTeam || round.winner;
    if (winningTeam === 'Red' || winningTeam === 'red') {
      redRoundWins.push(idx + 1);
    } else {
      blueRoundWins.push(idx + 1);
    }
  });

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Background Grid Pattern */}
      <div
        className="fixed inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage:
            'linear-gradient(rgba(50, 50, 50, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(50, 50, 50, 0.5) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />

      <div className="relative container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 border-b border-gray-800 pb-6">
          <button
            onClick={() => navigate('/admin/riot-api-testing')}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 font-mono text-sm uppercase tracking-wider transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Riot API Testing
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white font-bodax uppercase tracking-wider mb-2">Match Details</h1>
              <p className="text-gray-400 font-mono text-sm uppercase tracking-widest">Complete Match Analysis</p>
            </div>
            <button
              onClick={downloadJSON}
              className="flex items-center gap-2 px-4 py-2 bg-[#0a0a0a] hover:bg-black border border-gray-800 hover:border-red-600 text-white font-bodax uppercase tracking-wider transition-colors"
            >
              <Download className="w-4 h-4" />
              Download JSON
            </button>
          </div>
        </div>

        {/* Main Content - Esports Overlay Style */}
        <div className="space-y-6">
          {/* Match Results Section */}
          <div className="bg-[#0a0a0a] border border-gray-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="text-5xl font-bold font-bodax">
                  <span className="text-red-500">
                    {(() => {
                      // Try multiple sources for red team score
                      let redScore = redTeam.roundsWon ?? redTeam.rounds_won ?? redTeam.numRoundWins;
                      if (redScore === undefined || redScore === null) {
                        // Calculate from round results
                        redScore = roundResults.filter((r: any) => {
                          const winner = r.winningTeam || r.winner || r.teamId;
                          return winner === 'Red' || winner === 'red' || winner === 'RED';
                        }).length;
                      }
                      return redScore || 0;
                    })()}
                  </span>
                  <span className="text-gray-600 mx-4">-</span>
                  <span className="text-blue-500">
                    {(() => {
                      // Try multiple sources for blue team score
                      let blueScore = blueTeam.roundsWon ?? blueTeam.rounds_won ?? blueTeam.numRoundWins;
                      if (blueScore === undefined || blueScore === null) {
                        // Calculate from round results
                        blueScore = roundResults.filter((r: any) => {
                          const winner = r.winningTeam || r.winner || r.teamId;
                          return winner === 'Blue' || winner === 'blue' || winner === 'BLUE';
                        }).length;
                      }
                      return blueScore || 0;
                    })()}
                  </span>
                </div>
                <div className="border-l border-gray-800 pl-4">
                  <div className="text-2xl font-bold font-bodax uppercase tracking-wider text-white mb-1">
                    {matchInfo.mapId || 'UNKNOWN MAP'}
                  </div>
                  <div className="text-gray-400 font-mono text-xs uppercase tracking-widest">
                    {matchInfo.gameMode || 'N/A'} • {matchInfo.queueID || 'N/A'}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-gray-400 font-mono text-xs uppercase tracking-widest mb-1">Match ID</div>
                <div className="flex items-center gap-2">
                  <div className="text-white font-mono text-sm">{matchId?.substring(0, 20)}...</div>
                  <button
                    onClick={() => copyToClipboard(matchId || '', 'matchId')}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {copiedField === 'matchId' ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Team Summary Stats */}
            <div className="grid grid-cols-2 gap-6 mt-6 pt-6 border-t border-gray-800">
              <div className="space-y-3">
                <div className="text-red-500 font-bodax text-sm uppercase tracking-wider mb-3">Red Team Stats</div>
                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div>
                    <div className="text-gray-400 uppercase tracking-widest mb-1">First Kills</div>
                    <div className="text-white text-lg font-bold">{redFirstKills}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 uppercase tracking-widest mb-1">Post Plants</div>
                    <div className="text-white text-lg font-bold">{redTeamStats.postPlants}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 uppercase tracking-widest mb-1">Clutches</div>
                    <div className="text-white text-lg font-bold">{redTeamStats.clutches}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 uppercase tracking-widest mb-1">Ø ACS</div>
                    <div className="text-white text-lg font-bold">{redTeamStats.averageACS}</div>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="text-blue-500 font-bodax text-sm uppercase tracking-wider mb-3">Blue Team Stats</div>
                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div>
                    <div className="text-gray-400 uppercase tracking-widest mb-1">First Kills</div>
                    <div className="text-white text-lg font-bold">{blueFirstKills}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 uppercase tracking-widest mb-1">Post Plants</div>
                    <div className="text-white text-lg font-bold">{blueTeamStats.postPlants}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 uppercase tracking-widest mb-1">Clutches</div>
                    <div className="text-white text-lg font-bold">{blueTeamStats.clutches}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 uppercase tracking-widest mb-1">Ø ACS</div>
                    <div className="text-white text-lg font-bold">{blueTeamStats.averageACS}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Player Stats Table */}
          <div className="bg-[#0a0a0a] border border-gray-800">
            <div className="border-b border-gray-800 p-4">
              <h2 className="text-xl font-bold font-bodax uppercase tracking-wider text-white">Player Statistics</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left p-4 font-bodax uppercase tracking-wider text-xs text-gray-400">Player</th>
                    <th className="text-center p-4 font-bodax uppercase tracking-wider text-xs text-gray-400">K</th>
                    <th className="text-center p-4 font-bodax uppercase tracking-wider text-xs text-gray-400">D</th>
                    <th className="text-center p-4 font-bodax uppercase tracking-wider text-xs text-gray-400">A</th>
                    <th className="text-center p-4 font-bodax uppercase tracking-wider text-xs text-gray-400">K/D</th>
                    <th className="text-center p-4 font-bodax uppercase tracking-wider text-xs text-gray-400">ACS</th>
                    <th className="text-center p-4 font-bodax uppercase tracking-wider text-xs text-gray-400">FB</th>
                    <th className="text-center p-4 font-bodax uppercase tracking-wider text-xs text-gray-400">FD</th>
                    <th className="text-center p-4 font-bodax uppercase tracking-wider text-xs text-gray-400">HS%</th>
                    <th className="text-center p-4 font-bodax uppercase tracking-wider text-xs text-gray-400">Damage</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRedPlayers.map((player: any, idx: number) => {
                    const stats = player.stats || {};
                    const kills = stats.kills || 0;
                    const deaths = stats.deaths || 0;
                    const assists = stats.assists || 0;
                    const score = stats.score || 0;
                    const roundsPlayed = stats.roundsPlayed || stats.rounds_played || 1;
                    const acs = Math.round(score / roundsPlayed);
                    const kd = deaths > 0 ? (kills / deaths).toFixed(2) : kills > 0 ? kills.toFixed(2) : '0.00';
                    
                    // Headshots - try multiple field names
                    const headshots = stats.headshots || stats.headShots || stats.head_shots || 
                                     stats.shotsHead || stats.shots_head || 0;
                    const bodyshots = stats.bodyshots || stats.bodyShots || stats.body_shots || 
                                     stats.shotsBody || stats.shots_body || 0;
                    const legshots = stats.legshots || stats.legShots || stats.leg_shots || 
                                    stats.shotsLeg || stats.shots_leg || 0;
                    const totalShots = headshots + bodyshots + legshots;
                    const hsPercent = totalShots > 0 ? Math.round((headshots / totalShots) * 100) : 0;
                    
                    // Damage - try multiple formats
                    let totalDamage = 0;
                    if (stats.damage) {
                      if (Array.isArray(stats.damage)) {
                        // Handle array of numbers or array of objects
                        totalDamage = stats.damage.reduce((sum: number, d: any) => {
                          if (typeof d === 'number') {
                            return sum + d;
                          } else if (typeof d === 'object' && d !== null) {
                            // If it's an object, try to extract damage value
                            return sum + (d.damage || d.value || d.total || d.dealt || 0);
                          }
                          return sum;
                        }, 0);
                      } else if (typeof stats.damage === 'number') {
                        totalDamage = stats.damage;
                      } else if (typeof stats.damage === 'object' && stats.damage !== null) {
                        // If damage is an object, extract the value
                        totalDamage = stats.damage.total || stats.damage.dealt || stats.damage.value || stats.damage.damage || 0;
                      }
                    }
                    // Also try alternative field names
                    if (totalDamage === 0) {
                      totalDamage = stats.totalDamage || stats.total_damage || 
                                   stats.damageDealt || stats.damage_dealt || 0;
                    }
                    
                    // Calculate damage from round results if still 0
                    if (totalDamage === 0 && roundResults.length > 0) {
                      roundResults.forEach((round: any) => {
                        if (round.playerStats) {
                          const playerRoundStats = round.playerStats.find((prs: any) => 
                            (prs.puuid === player.puuid || prs.subject === player.subject || prs.playerId === player.puuid)
                          );
                          if (playerRoundStats && playerRoundStats.damage) {
                            let roundDamage = 0;
                            if (Array.isArray(playerRoundStats.damage)) {
                              roundDamage = playerRoundStats.damage.reduce((sum: number, d: any) => {
                                if (typeof d === 'number') return sum + d;
                                if (typeof d === 'object' && d !== null) {
                                  return sum + (d.damage || d.value || d.total || d.dealt || 0);
                                }
                                return sum;
                              }, 0);
                            } else if (typeof playerRoundStats.damage === 'number') {
                              roundDamage = playerRoundStats.damage;
                            } else if (typeof playerRoundStats.damage === 'object') {
                              roundDamage = playerRoundStats.damage.total || playerRoundStats.damage.dealt || playerRoundStats.damage.value || 0;
                            }
                            totalDamage += roundDamage;
                          }
                        }
                      });
                    }
                    
                    // First Bloods - calculate from round results if not in stats
                    let firstBloods = stats.firstBloods || stats.firstBloodsFirstDeath || 
                                     stats.firstBlood || stats.first_blood || 
                                     stats.firstBloodsFirstDeath || 0;
                    let firstDeaths = stats.firstDeaths || stats.firstDeathsFirstBlood || 
                                    stats.firstDeath || stats.first_death || 
                                    stats.firstDeathsFirstBlood || 0;
                    
                    // If still 0, calculate from round results
                    if (firstBloods === 0 || firstDeaths === 0) {
                      roundResults.forEach((round: any) => {
                        // Try multiple field names for first kill
                        const firstKill = round.firstKill || round.firstKillEvent || round.killEvents?.[0] || round.kills?.[0];
                        if (firstKill) {
                          const firstKillPuuid = firstKill.puuid || firstKill.subject || firstKill.playerId || firstKill.killer || firstKill.assistant;
                          if (firstKillPuuid && (firstKillPuuid === player.puuid || firstKillPuuid === player.subject || firstKillPuuid === player.playerId)) {
                            firstBloods++;
                          }
                        }
                        // Try multiple field names for first death
                        const firstDeath = round.firstDeath || round.firstDeathEvent || round.deathEvents?.[0] || round.deaths?.[0];
                        if (firstDeath) {
                          const firstDeathPuuid = firstDeath.puuid || firstDeath.subject || firstDeath.playerId || firstDeath.victim;
                          if (firstDeathPuuid && (firstDeathPuuid === player.puuid || firstDeathPuuid === player.subject || firstDeathPuuid === player.playerId)) {
                            firstDeaths++;
                          }
                        }
                      });
                    }

                    return (
                      <tr key={idx} className="border-b border-gray-900 hover:bg-red-500/5 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-red-500"></div>
                            <div>
                              <div className="text-white font-mono font-semibold">
                                {player.gameName || player.displayName || player.subject || `Player ${idx + 1}`}
                              </div>
                              {player.characterId && (
                                <div className="text-gray-500 text-xs font-mono mt-0.5">
                                  {player.characterId.split('/').pop()}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="text-center p-4 text-white font-mono">{kills}</td>
                        <td className="text-center p-4 text-white font-mono">{deaths}</td>
                        <td className="text-center p-4 text-white font-mono">{assists}</td>
                        <td className="text-center p-4 text-white font-mono">{kd}</td>
                        <td className="text-center p-4 text-white font-mono font-bold">{acs}</td>
                        <td className="text-center p-4 text-green-400 font-mono">{firstBloods}</td>
                        <td className="text-center p-4 text-red-400 font-mono">{firstDeaths}</td>
                        <td className="text-center p-4 text-white font-mono">{hsPercent}%</td>
                        <td className="text-center p-4 text-white font-mono">{totalDamage}</td>
                      </tr>
                    );
                  })}
                  {sortedBluePlayers.map((player: any, idx: number) => {
                    const stats = player.stats || {};
                    const kills = stats.kills || 0;
                    const deaths = stats.deaths || 0;
                    const assists = stats.assists || 0;
                    const score = stats.score || 0;
                    const roundsPlayed = stats.roundsPlayed || stats.rounds_played || 1;
                    const acs = Math.round(score / roundsPlayed);
                    const kd = deaths > 0 ? (kills / deaths).toFixed(2) : kills > 0 ? kills.toFixed(2) : '0.00';
                    
                    // Headshots - try multiple field names
                    const headshots = stats.headshots || stats.headShots || stats.head_shots || 
                                     stats.shotsHead || stats.shots_head || 0;
                    const bodyshots = stats.bodyshots || stats.bodyShots || stats.body_shots || 
                                     stats.shotsBody || stats.shots_body || 0;
                    const legshots = stats.legshots || stats.legShots || stats.leg_shots || 
                                    stats.shotsLeg || stats.shots_leg || 0;
                    const totalShots = headshots + bodyshots + legshots;
                    const hsPercent = totalShots > 0 ? Math.round((headshots / totalShots) * 100) : 0;
                    
                    // Damage - try multiple formats
                    let totalDamage = 0;
                    if (stats.damage) {
                      if (Array.isArray(stats.damage)) {
                        // Handle array of numbers or array of objects
                        totalDamage = stats.damage.reduce((sum: number, d: any) => {
                          if (typeof d === 'number') {
                            return sum + d;
                          } else if (typeof d === 'object' && d !== null) {
                            // If it's an object, try to extract damage value
                            return sum + (d.damage || d.value || d.total || d.dealt || 0);
                          }
                          return sum;
                        }, 0);
                      } else if (typeof stats.damage === 'number') {
                        totalDamage = stats.damage;
                      } else if (typeof stats.damage === 'object' && stats.damage !== null) {
                        // If damage is an object, extract the value
                        totalDamage = stats.damage.total || stats.damage.dealt || stats.damage.value || stats.damage.damage || 0;
                      }
                    }
                    // Also try alternative field names
                    if (totalDamage === 0) {
                      totalDamage = stats.totalDamage || stats.total_damage || 
                                   stats.damageDealt || stats.damage_dealt || 0;
                    }
                    
                    // Calculate damage from round results if still 0
                    if (totalDamage === 0 && roundResults.length > 0) {
                      roundResults.forEach((round: any) => {
                        if (round.playerStats) {
                          const playerRoundStats = round.playerStats.find((prs: any) => 
                            (prs.puuid === player.puuid || prs.subject === player.subject || prs.playerId === player.puuid)
                          );
                          if (playerRoundStats && playerRoundStats.damage) {
                            let roundDamage = 0;
                            if (Array.isArray(playerRoundStats.damage)) {
                              roundDamage = playerRoundStats.damage.reduce((sum: number, d: any) => {
                                if (typeof d === 'number') return sum + d;
                                if (typeof d === 'object' && d !== null) {
                                  return sum + (d.damage || d.value || d.total || d.dealt || 0);
                                }
                                return sum;
                              }, 0);
                            } else if (typeof playerRoundStats.damage === 'number') {
                              roundDamage = playerRoundStats.damage;
                            } else if (typeof playerRoundStats.damage === 'object') {
                              roundDamage = playerRoundStats.damage.total || playerRoundStats.damage.dealt || playerRoundStats.damage.value || 0;
                            }
                            totalDamage += roundDamage;
                          }
                        }
                      });
                    }
                    
                    // First Bloods - calculate from round results if not in stats
                    let firstBloods = stats.firstBloods || stats.firstBloodsFirstDeath || 
                                     stats.firstBlood || stats.first_blood || 
                                     stats.firstBloodsFirstDeath || 0;
                    let firstDeaths = stats.firstDeaths || stats.firstDeathsFirstBlood || 
                                    stats.firstDeath || stats.first_death || 
                                    stats.firstDeathsFirstBlood || 0;
                    
                    // If still 0, calculate from round results
                    if (firstBloods === 0 || firstDeaths === 0) {
                      roundResults.forEach((round: any) => {
                        // Try multiple field names for first kill
                        const firstKill = round.firstKill || round.firstKillEvent || round.killEvents?.[0] || round.kills?.[0];
                        if (firstKill) {
                          const firstKillPuuid = firstKill.puuid || firstKill.subject || firstKill.playerId || firstKill.killer || firstKill.assistant;
                          if (firstKillPuuid && (firstKillPuuid === player.puuid || firstKillPuuid === player.subject || firstKillPuuid === player.playerId)) {
                            firstBloods++;
                          }
                        }
                        // Try multiple field names for first death
                        const firstDeath = round.firstDeath || round.firstDeathEvent || round.deathEvents?.[0] || round.deaths?.[0];
                        if (firstDeath) {
                          const firstDeathPuuid = firstDeath.puuid || firstDeath.subject || firstDeath.playerId || firstDeath.victim;
                          if (firstDeathPuuid && (firstDeathPuuid === player.puuid || firstDeathPuuid === player.subject || firstDeathPuuid === player.playerId)) {
                            firstDeaths++;
                          }
                        }
                      });
                    }

                    return (
                      <tr key={`blue-${idx}`} className="border-b border-gray-900 hover:bg-blue-500/5 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            <div>
                              <div className="text-white font-mono font-semibold">
                                {player.gameName || player.displayName || player.subject || `Player ${idx + 1}`}
                              </div>
                              {player.characterId && (
                                <div className="text-gray-500 text-xs font-mono mt-0.5">
                                  {player.characterId.split('/').pop()}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="text-center p-4 text-white font-mono">{kills}</td>
                        <td className="text-center p-4 text-white font-mono">{deaths}</td>
                        <td className="text-center p-4 text-white font-mono">{assists}</td>
                        <td className="text-center p-4 text-white font-mono">{kd}</td>
                        <td className="text-center p-4 text-white font-mono font-bold">{acs}</td>
                        <td className="text-center p-4 text-green-400 font-mono">{firstBloods}</td>
                        <td className="text-center p-4 text-red-400 font-mono">{firstDeaths}</td>
                        <td className="text-center p-4 text-white font-mono">{hsPercent}%</td>
                        <td className="text-center p-4 text-white font-mono">{totalDamage}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Round Tracker */}
          {roundResults.length > 0 && (
            <div className="bg-[#0a0a0a] border border-gray-800 p-6">
              <h2 className="text-xl font-bold font-bodax uppercase tracking-wider text-white mb-4">Round Tracker</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-24 text-red-500 font-bodax text-sm uppercase tracking-wider">Red Team</div>
                  <div className="flex-1 flex items-center gap-1 flex-wrap">
                    {Array.from({ length: roundResults.length }, (_, i) => i + 1).map((roundNum) => (
                      <div
                        key={roundNum}
                        className={`w-8 h-8 flex items-center justify-center text-xs font-mono border ${
                          redRoundWins.includes(roundNum)
                            ? 'bg-red-500/20 border-red-500 text-red-300'
                            : 'bg-gray-900 border-gray-800 text-gray-600'
                        }`}
                      >
                        {redRoundWins.includes(roundNum) ? '✓' : roundNum}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-24 text-blue-500 font-bodax text-sm uppercase tracking-wider">Blue Team</div>
                  <div className="flex-1 flex items-center gap-1 flex-wrap">
                    {Array.from({ length: roundResults.length }, (_, i) => i + 1).map((roundNum) => (
                      <div
                        key={roundNum}
                        className={`w-8 h-8 flex items-center justify-center text-xs font-mono border ${
                          blueRoundWins.includes(roundNum)
                            ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                            : 'bg-gray-900 border-gray-800 text-gray-600'
                        }`}
                      >
                        {blueRoundWins.includes(roundNum) ? '✓' : roundNum}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Detailed Round Results */}
          {roundResults.length > 0 && (
            <div className="bg-[#0a0a0a] border border-gray-800 p-6">
              <h2 className="text-xl font-bold font-bodax uppercase tracking-wider text-white mb-4">Round Details</h2>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {roundResults.map((round: any, idx: number) => {
                  const roundNum = idx + 1;
                  const winningTeam = round.winningTeam || round.winner || 'N/A';
                  const isRedWin = winningTeam === 'Red' || winningTeam === 'red';
                  
                  return (
                    <div key={idx} className="bg-[#050505] border border-gray-900 p-4 hover:border-gray-800 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-white font-bold font-mono text-lg">Round {roundNum}</div>
                        <div className={`px-3 py-1 border text-xs font-mono uppercase tracking-wider ${
                          isRedWin
                            ? 'bg-red-500/10 border-red-500/30 text-red-300'
                            : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                        }`}>
                          {winningTeam} Won
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono mb-3">
                        <div>
                          <div className="text-gray-400 uppercase tracking-widest mb-1">Type</div>
                          <div className="text-white">{round.roundType || round.roundResult || 'N/A'}</div>
                        </div>
                        {round.plantRoundTime && (
                          <div>
                            <div className="text-gray-400 uppercase tracking-widest mb-1">Plant Time</div>
                            <div className="text-white">{Math.round(round.plantRoundTime / 1000)}s</div>
                          </div>
                        )}
                        {round.defuseRoundTime && (
                          <div>
                            <div className="text-gray-400 uppercase tracking-widest mb-1">Defuse Time</div>
                            <div className="text-white">{Math.round(round.defuseRoundTime / 1000)}s</div>
                          </div>
                        )}
                        {round.plantLocation && (
                          <div>
                            <div className="text-gray-400 uppercase tracking-widest mb-1">Plant Site</div>
                            <div className="text-white">{round.plantLocation.x}, {round.plantLocation.y}</div>
                          </div>
                        )}
                      </div>
                      
                      {(round.firstKill || round.firstDeath) && (
                        <div className="flex items-center gap-3 pt-3 border-t border-gray-900">
                          {round.firstKill && (
                            <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 px-3 py-1.5 rounded">
                              <Target className="w-3 h-3 text-green-400" />
                              <div className="text-xs font-mono">
                                <span className="text-green-400">First Kill: </span>
                                <span className="text-white">
                                  {round.firstKill.gameName || round.firstKill.displayName || round.firstKill.puuid?.substring(0, 8) || 'N/A'}
                                </span>
                                {round.firstKillTime && (
                                  <span className="text-green-400/60 ml-2">
                                    ({Math.round(round.firstKillTime / 1000)}s)
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                          {round.firstDeath && (
                            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 px-3 py-1.5 rounded">
                              <Skull className="w-3 h-3 text-red-400" />
                              <div className="text-xs font-mono">
                                <span className="text-red-400">First Death: </span>
                                <span className="text-white">
                                  {round.firstDeath.gameName || round.firstDeath.displayName || round.firstDeath.puuid?.substring(0, 8) || 'N/A'}
                                </span>
                                {round.firstDeathTime && (
                                  <span className="text-red-400/60 ml-2">
                                    ({Math.round(round.firstDeathTime / 1000)}s)
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Complete Data Section */}
          <details className="bg-[#0a0a0a] border border-gray-800">
            <summary className="p-6 cursor-pointer hover:bg-[#050505] transition-colors">
              <div className="flex items-center gap-3">
                <BarChart3 className="w-5 h-5 text-gray-400" />
                <span className="text-white font-bodax uppercase tracking-wider">View Complete Raw Data</span>
              </div>
            </summary>
            <div className="p-6 border-t border-gray-800">
              <div className="bg-[#050505] rounded border border-gray-900 p-4 max-h-[600px] overflow-auto">
                <pre className="text-xs text-gray-400 font-mono">
                  {JSON.stringify(matchDetails, null, 2)}
                </pre>
              </div>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
};

export default RiotMatchDetails;
