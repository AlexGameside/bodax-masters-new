import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Calendar, 
  Clock, 
  Users, 
  Trophy, 
  Eye, 
  Filter, 
  Search,
  AlertCircle,
  CheckCircle,
  XCircle,
  Play,
  Pause,
  MapPin,
  MessageSquare,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  User as UserIcon,
  Gamepad2
} from 'lucide-react';
import type { Match, Team, Tournament, User } from '../types/tournament';
import { getUsersByIds } from '../services/firebaseService';

interface AllMatchesManagementProps {
  matches: Match[];
  teams: Team[];
  tournaments: Tournament[];
}

type MatchState = 'all' | 'pending_scheduling' | 'scheduled' | 'ready_up' | 'map_banning' | 'playing' | 'completed' | 'cancelled' | 'scheduling_requested';

const AllMatchesManagement: React.FC<AllMatchesManagementProps> = ({
  matches,
  teams,
  tournaments
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [stateFilter, setStateFilter] = useState<MatchState>('all');
  const [tournamentFilter, setTournamentFilter] = useState<string>('all');
  const [matchdayFilter, setMatchdayFilter] = useState<string>('all');
  const [doneFilter, setDoneFilter] = useState<string>('all');
  const [tickboxFilter, setTickboxFilter] = useState<string>('all');
  const [expandedMatches, setExpandedMatches] = useState<Set<string>>(new Set());
  const [teamRosters, setTeamRosters] = useState<Record<string, User[]>>({});
  const [loadingRosters, setLoadingRosters] = useState<Set<string>>(new Set());
  const [matchTickboxes, setMatchTickboxes] = useState<Set<string>>(new Set());

  // Get unique tournaments for filter
  const tournamentOptions = useMemo(() => {
    const tournamentMap = new Map();
    tournaments.forEach(tournament => {
      tournamentMap.set(tournament.id, tournament.name);
    });
    return Array.from(tournamentMap.entries()).map(([id, name]) => ({ id, name }));
  }, [tournaments]);

  // Get unique matchdays for filter
  const matchdayOptions = useMemo(() => {
    const matchdays = new Set<number>();
    
    matches.forEach(match => {
      // Check for matchday field first
      if (match.matchday) {
        matchdays.add(match.matchday);
      }
      // Also check round field as fallback for some tournament types
      else if (match.round && (match.tournamentType === 'group-stage' || match.tournamentType === 'swiss-round')) {
        matchdays.add(match.round);
      }
    });
    
    return Array.from(matchdays).sort((a, b) => a - b);
  }, [matches]);

  // Load team roster data
  const loadTeamRoster = async (teamId: string) => {
    if (teamRosters[teamId] || loadingRosters.has(teamId)) {
      return;
    }

    setLoadingRosters(prev => new Set(prev).add(teamId));

    try {
      const team = teams.find(t => t.id === teamId);
      if (!team || !team.members) {
        setTeamRosters(prev => ({ ...prev, [teamId]: [] }));
        return;
      }

      const userIds = team.members.map(member => member.userId);
      const users = await getUsersByIds(userIds);
      setTeamRosters(prev => ({ ...prev, [teamId]: users }));
    } catch (error) {
      console.error('Error loading team roster:', error);
      setTeamRosters(prev => ({ ...prev, [teamId]: [] }));
    } finally {
      setLoadingRosters(prev => {
        const newSet = new Set(prev);
        newSet.delete(teamId);
        return newSet;
      });
    }
  };

  // Toggle match expansion
  const toggleMatchExpansion = (matchId: string, team1Id: string | null, team2Id: string | null) => {
    const newExpanded = new Set(expandedMatches);
    if (newExpanded.has(matchId)) {
      newExpanded.delete(matchId);
    } else {
      newExpanded.add(matchId);
      // Load rosters when expanding
      if (team1Id) loadTeamRoster(team1Id);
      if (team2Id) loadTeamRoster(team2Id);
    }
    setExpandedMatches(newExpanded);
  };

  // Toggle match tickbox
  const toggleMatchTickbox = (matchId: string) => {
    const newTickboxes = new Set(matchTickboxes);
    if (newTickboxes.has(matchId)) {
      newTickboxes.delete(matchId);
    } else {
      newTickboxes.add(matchId);
    }
    setMatchTickboxes(newTickboxes);
  };

  // Generate Valorant Tracker URLs
  const getValorantTrackerUrls = (riotId: string) => {
    // Handle Riot ID encoding properly for Valorant Tracker
    // Replace # with %23 and encode spaces as %20
    const encodedRiotId = riotId.replace(/#/g, '%23').replace(/ /g, '%20');
    
    return {
      overview: `https://tracker.gg/valorant/profile/riot/${encodedRiotId}/overview`,
      customs: `https://tracker.gg/valorant/profile/riot/${encodedRiotId}/customs?platform=pc&playlist=competitive&season=5adc33fa-4f30-2899-f131-6fba64c5dd3a`
    };
  };

  // Enhanced match state detection
  const getMatchState = (match: Match): string => {
    // Debug: Log all matches with scheduling proposals
    if (match.schedulingProposals && match.schedulingProposals.length > 0) {
      console.log('[AllMatchesManagement] Match has scheduling proposals:', {
        matchId: match.id,
        proposals: match.schedulingProposals,
        proposalStatuses: match.schedulingProposals.map(p => p.status)
      });
      
      const hasPendingProposal = match.schedulingProposals.some(p => p.status === 'pending');
      if (hasPendingProposal) {
        console.log('[AllMatchesManagement] Found scheduling_requested match:', match.id, match.schedulingProposals);
        return 'scheduling_requested';
      }
    }

    // Return the actual match state
    return match.matchState || 'pending_scheduling';
  };

  // Filter matches based on search term, state, and tournament
  const filteredMatches = useMemo(() => {
    console.log('[AllMatchesManagement] Filtering matches:', {
      totalMatches: matches.length,
      stateFilter,
      searchTerm,
      tournamentFilter
    });
    
    // Debug: Show all match states
    const matchStates = matches.map(match => ({
      matchId: match.id,
      matchState: match.matchState,
      detectedState: getMatchState(match),
      hasProposals: !!(match.schedulingProposals && match.schedulingProposals.length > 0)
    }));
    console.log('[AllMatchesManagement] All match states:', matchStates);
    
    return matches.filter(match => {
      const matchState = getMatchState(match);
      
      // Search filter
      if (searchTerm) {
        const team1 = teams.find(t => t.id === match.team1Id);
        const team2 = teams.find(t => t.id === match.team2Id);
        const tournament = tournaments.find(t => t.id === match.tournamentId);
        
        const searchLower = searchTerm.toLowerCase();
        const team1Name = team1?.name?.toLowerCase() || '';
        const team2Name = team2?.name?.toLowerCase() || '';
        const tournamentName = tournament?.name?.toLowerCase() || '';
        const matchId = match.id?.toLowerCase() || '';
        
        if (!team1Name.includes(searchLower) && 
            !team2Name.includes(searchLower) && 
            !tournamentName.includes(searchLower) &&
            !matchId.includes(searchLower)) {
          return false;
        }
      }

      // State filter
      if (stateFilter !== 'all') {
        if (matchState !== stateFilter) {
          return false;
        }
      }

      // Tournament filter
      if (tournamentFilter !== 'all' && match.tournamentId !== tournamentFilter) {
        return false;
      }

      // Matchday filter
      if (matchdayFilter !== 'all') {
        const filterMatchday = parseInt(matchdayFilter);
        const matchMatchday = match.matchday || (match.round && (match.tournamentType === 'group-stage' || match.tournamentType === 'swiss-round') ? match.round : null);
        
        if (matchMatchday !== filterMatchday) {
          return false;
        }
      }

      // Done filter
      if (doneFilter !== 'all') {
        const isMatchDone = match.isComplete || match.matchState === 'completed';
        if (doneFilter === 'done' && !isMatchDone) {
          return false;
        }
        if (doneFilter === 'not-done' && isMatchDone) {
          return false;
        }
      }

      // Tickbox filter
      if (tickboxFilter !== 'all') {
        const hasTickbox = matchTickboxes.has(match.id);
        if (tickboxFilter === 'ticked' && !hasTickbox) {
          return false;
        }
        if (tickboxFilter === 'not-ticked' && hasTickbox) {
          return false;
        }
      }

      return true;
    });
  }, [matches, teams, tournaments, searchTerm, stateFilter, tournamentFilter, matchdayFilter, doneFilter, tickboxFilter, matchTickboxes]);

  // Get team name helper
  const getTeamName = (teamId: string | null) => {
    if (!teamId) return 'Unknown Team';
    const team = teams.find(t => t.id === teamId);
    return team?.name || 'Unknown Team';
  };

  // Get tournament name helper
  const getTournamentName = (tournamentId: string | undefined) => {
    if (!tournamentId) return 'Unknown Tournament';
    const tournament = tournaments.find(t => t.id === tournamentId);
    return tournament?.name || 'Unknown Tournament';
  };

  // Format scheduled time
  const formatScheduledTime = (scheduledTime: Date | any) => {
    if (!scheduledTime) return 'TBD';
    
    const date = scheduledTime instanceof Date ? scheduledTime : new Date(scheduledTime.seconds * 1000);
    return date.toLocaleString();
  };

  // Get state icon and color
  const getStateInfo = (match: Match) => {
    const state = getMatchState(match);
    
    switch (state) {
      case 'pending_scheduling':
        return { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-900/20', label: 'Pending Scheduling' };
      case 'scheduling_requested':
        return { icon: MessageSquare, color: 'text-blue-400', bg: 'bg-blue-900/20', label: 'Scheduling Requested' };
      case 'scheduled':
        return { icon: Calendar, color: 'text-green-400', bg: 'bg-green-900/20', label: 'Scheduled' };
      case 'ready_up':
        return { icon: Users, color: 'text-purple-400', bg: 'bg-purple-900/20', label: 'Ready Up' };
      case 'map_banning':
        return { icon: MapPin, color: 'text-blue-400', bg: 'bg-blue-900/20', label: 'Map Banning' };
      case 'playing':
        return { icon: Play, color: 'text-red-400', bg: 'bg-red-900/20', label: 'Playing' };
      case 'completed':
        return { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-900/20', label: 'Completed' };
      case 'cancelled':
        return { icon: XCircle, color: 'text-gray-400', bg: 'bg-gray-900/20', label: 'Cancelled' };
      default:
        return { icon: AlertCircle, color: 'text-gray-400', bg: 'bg-gray-900/20', label: 'Unknown' };
    }
  };

  // Get match score display
  const getScoreDisplay = (match: Match) => {
    if (match.isComplete && match.team1Score !== undefined && match.team2Score !== undefined) {
      return `${match.team1Score} - ${match.team2Score}`;
    }
    return 'TBD';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-400" />
            All Matches Management
          </h2>
          <p className="text-gray-400 mt-1">
            Manage and monitor all tournament matches
          </p>
        </div>
        <div className="text-sm text-gray-400">
          {filteredMatches.length} of {matches.length} matches
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search matches..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* State Filter */}
          <div>
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value as MatchState)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All States</option>
              <option value="pending_scheduling">Pending Scheduling</option>
              <option value="scheduling_requested">Scheduling Requested</option>
              <option value="scheduled">Scheduled</option>
              <option value="ready_up">Ready Up</option>
              <option value="map_banning">Map Banning</option>
              <option value="playing">Playing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Tournament Filter */}
          <div>
            <select
              value={tournamentFilter}
              onChange={(e) => setTournamentFilter(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Tournaments</option>
              {tournamentOptions.map(tournament => (
                <option key={tournament.id} value={tournament.id}>
                  {tournament.name}
                </option>
              ))}
            </select>
          </div>

          {/* Matchday Filter */}
          <div>
            <select
              value={matchdayFilter}
              onChange={(e) => setMatchdayFilter(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Matchdays</option>
              {matchdayOptions.map(matchday => (
                <option key={matchday} value={matchday}>
                  Matchday {matchday}
                </option>
              ))}
            </select>
          </div>

          {/* Done Filter */}
          <div>
            <select
              value={doneFilter}
              onChange={(e) => setDoneFilter(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Matches</option>
              <option value="done">Done</option>
              <option value="not-done">Not Done</option>
            </select>
          </div>

          {/* Tickbox Filter */}
          <div>
            <select
              value={tickboxFilter}
              onChange={(e) => setTickboxFilter(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Matches</option>
              <option value="ticked">Ticked</option>
              <option value="not-ticked">Not Ticked</option>
            </select>
          </div>

          {/* Clear Filters */}
          <button
            onClick={() => {
              setSearchTerm('');
              setStateFilter('all');
              setTournamentFilter('all');
              setMatchdayFilter('all');
              setDoneFilter('all');
              setTickboxFilter('all');
            }}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Clear Filters
          </button>
        </div>
      </div>

      {/* Matches List */}
      <div className="space-y-4">
        {filteredMatches.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-400 mb-2">No matches found</h3>
            <p className="text-gray-500">Try adjusting your filters or search terms</p>
          </div>
        ) : (
          filteredMatches.map((match) => {
            const stateInfo = getStateInfo(match);
            const StateIcon = stateInfo.icon;
            
            return (
              <div
                key={match.id}
                className="bg-gray-900/50 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors"
              >
                <div className="flex items-center justify-between">
                  {/* Match Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      {/* State Badge */}
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${stateInfo.bg} border border-gray-600`}>
                        <StateIcon className={`w-4 h-4 ${stateInfo.color}`} />
                        <span className={`text-sm font-medium ${stateInfo.color}`}>
                          {stateInfo.label}
                        </span>
                      </div>

                      {/* Done Badge */}
                      {(match.isComplete || match.matchState === 'completed') && (
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-900/20 border border-green-700">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          <span className="text-sm font-medium text-green-400">
                            Done
                          </span>
                        </div>
                      )}

                      {/* Tournament */}
                      <div className="text-sm text-gray-400">
                        {getTournamentName(match.tournamentId)}
                      </div>

                      {/* Round Info */}
                      {(match.round || match.swissRound) && (
                        <div className="text-sm text-gray-400">
                          Round {match.round || match.swissRound}
                        </div>
                      )}
                    </div>

                    {/* Teams */}
                    <div className="flex items-center gap-4 mb-2">
                      <div className="text-lg font-semibold text-white">
                        {getTeamName(match.team1Id)}
                      </div>
                      <div className="text-gray-400">vs</div>
                      <div className="text-lg font-semibold text-white">
                        {getTeamName(match.team2Id)}
                      </div>
                      {match.isComplete && (
                        <div className="text-lg font-bold text-yellow-400">
                          {getScoreDisplay(match)}
                        </div>
                      )}
                    </div>

                    {/* Schedule Info */}
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {formatScheduledTime(match.scheduledTime)}
                      </div>
                      {match.matchFormat && (
                        <div>
                          {match.matchFormat}
                        </div>
                      )}
                      {(match.matchday || (match.round && (match.tournamentType === 'group-stage' || match.tournamentType === 'swiss-round'))) && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Matchday {match.matchday || match.round}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {/* Tickbox */}
                    <button
                      onClick={() => toggleMatchTickbox(match.id)}
                      className={`p-2 rounded-lg border-2 transition-colors ${
                        matchTickboxes.has(match.id)
                          ? 'bg-green-600 border-green-500 text-white'
                          : 'bg-gray-700 border-gray-600 hover:bg-gray-600 text-gray-300'
                      }`}
                      title={matchTickboxes.has(match.id) ? 'Untick' : 'Tick'}
                    >
                      {matchTickboxes.has(match.id) ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <div className="w-5 h-5 border-2 border-current rounded-sm"></div>
                      )}
                    </button>
                    
                    <button
                      onClick={() => toggleMatchExpansion(match.id, match.team1Id, match.team2Id)}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Users className="w-4 h-4" />
                      {expandedMatches.has(match.id) ? 'Hide Rosters' : 'Show Rosters'}
                      {expandedMatches.has(match.id) ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                    <Link
                      to={`/match/${match.id}`}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      View Match
                    </Link>
                  </div>
                </div>

                {/* Expanded Roster Information */}
                {expandedMatches.has(match.id) && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Team 1 Roster */}
                      <div>
                        <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                          <Users className="w-5 h-5 text-blue-400" />
                          {getTeamName(match.team1Id)}
                        </h4>
                        {match.team1Id ? (
                          <div className="space-y-2">
                            {loadingRosters.has(match.team1Id) ? (
                              <div className="flex items-center justify-center py-4">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                                <span className="ml-2 text-gray-400">Loading roster...</span>
                              </div>
                            ) : teamRosters[match.team1Id] && teamRosters[match.team1Id].length > 0 ? (
                              teamRosters[match.team1Id].map((user) => (
                                <div key={user.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-600">
                                  <div className="flex items-center gap-3">
                                    <UserIcon className="w-4 h-4 text-gray-400" />
                                    <div>
                                      <div className="text-white font-medium">{user.username}</div>
                                      <div className="text-sm text-gray-400">{user.email}</div>
                                    </div>
                                  </div>
                                  {user.riotId ? (
                                    <div className="flex gap-2">
                                      <a
                                        href={getValorantTrackerUrls(user.riotId).overview}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm"
                                        title="View Profile Overview"
                                      >
                                        <Gamepad2 className="w-3 h-3" />
                                        {user.riotId}
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                      <a
                                        href={getValorantTrackerUrls(user.riotId).customs}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm"
                                        title="View Competitive Matches"
                                      >
                                        <Trophy className="w-3 h-3" />
                                        Customs
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    </div>
                                  ) : (
                                    <span className="text-gray-500 text-sm">No Riot ID</span>
                                  )}
                                </div>
                              ))
                            ) : (
                              <div className="text-center py-4 text-gray-400">
                                No roster data available
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-4 text-gray-400">
                            No team assigned
                          </div>
                        )}
                      </div>

                      {/* Team 2 Roster */}
                      <div>
                        <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                          <Users className="w-5 h-5 text-red-400" />
                          {getTeamName(match.team2Id)}
                        </h4>
                        {match.team2Id ? (
                          <div className="space-y-2">
                            {loadingRosters.has(match.team2Id) ? (
                              <div className="flex items-center justify-center py-4">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-500"></div>
                                <span className="ml-2 text-gray-400">Loading roster...</span>
                              </div>
                            ) : teamRosters[match.team2Id] && teamRosters[match.team2Id].length > 0 ? (
                              teamRosters[match.team2Id].map((user) => (
                                <div key={user.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-600">
                                  <div className="flex items-center gap-3">
                                    <UserIcon className="w-4 h-4 text-gray-400" />
                                    <div>
                                      <div className="text-white font-medium">{user.username}</div>
                                      <div className="text-sm text-gray-400">{user.email}</div>
                                    </div>
                                  </div>
                                  {user.riotId ? (
                                    <div className="flex gap-2">
                                      <a
                                        href={getValorantTrackerUrls(user.riotId).overview}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm"
                                        title="View Profile Overview"
                                      >
                                        <Gamepad2 className="w-3 h-3" />
                                        {user.riotId}
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                      <a
                                        href={getValorantTrackerUrls(user.riotId).customs}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm"
                                        title="View Competitive Matches"
                                      >
                                        <Trophy className="w-3 h-3" />
                                        Customs
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    </div>
                                  ) : (
                                    <span className="text-gray-500 text-sm">No Riot ID</span>
                                  )}
                                </div>
                              ))
                            ) : (
                              <div className="text-center py-4 text-gray-400">
                                No roster data available
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-4 text-gray-400">
                            No team assigned
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Additional Info */}
                {match.schedulingProposals && match.schedulingProposals.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-700">
                    <div className="text-sm text-gray-400">
                      <MessageSquare className="w-4 h-4 inline mr-1" />
                      {match.schedulingProposals.length} scheduling proposal(s)
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AllMatchesManagement;
