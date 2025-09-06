import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  ArrowLeft, 
  Save, 
  Shield,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import type { 
  Tournament, 
  TournamentFormat,
  TournamentRules,
  TournamentSchedule,
  PrizePool,
  RegistrationRequirements
} from '../types/tournament';
import { createTournament, publishTournament } from '../services/tournamentService';

// Helper function to clean objects for Firestore (remove undefined values)
const cleanForFirestore = (obj: any): any => {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== 'object') return obj;
  
  // Preserve Date objects
  if (obj instanceof Date) return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(cleanForFirestore).filter(item => item !== null);
  }
  
  const cleaned: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = cleanForFirestore(value);
    }
  }
  return cleaned;
};

const TournamentCreation = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Basic tournament info
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [region, setRegion] = useState<string>('Global');

  // Tournament format
  const [tournamentType, setTournamentType] = useState<'single-elimination' | 'double-elimination' | 'swiss-system'>('single-elimination');
  const [matchFormat, setMatchFormat] = useState<'BO1' | 'BO3' | 'BO5'>('BO3');
  const [seedingMethod, setSeedingMethod] = useState<'random' | 'manual'>('random');
  
  // Swiss system specific
  const [swissRounds, setSwissRounds] = useState<number>(5);
  const [teamsAdvanceToPlayoffs, setTeamsAdvanceToPlayoffs] = useState<number>(8);
  const [schedulingWindow, setSchedulingWindow] = useState<number>(7);

  // Schedule
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Prize pool
  const [totalPrize, setTotalPrize] = useState<number>(0);
  const [currency, setCurrency] = useState<'USD' | 'EUR' | 'GBP'>('USD');

  // Registration
  const [maxTeams, setMaxTeams] = useState<number>(2);
  const [requireRiotId, setRequireRiotId] = useState<boolean>(true);
  const [requireRankVerification, setRequireRankVerification] = useState<boolean>(false);
  const [minimumRank, setMinimumRank] = useState<string>('');
  const [entryFee, setEntryFee] = useState<number>(0);
  
  // Team composition
  const [minMainPlayers, setMinMainPlayers] = useState<number>(5);
  const [maxMainPlayers, setMaxMainPlayers] = useState<number>(5);
  const [minSubstitutes, setMinSubstitutes] = useState<number>(0);
  const [maxSubstitutes, setMaxSubstitutes] = useState<number>(2);
  const [allowCoaches, setAllowCoaches] = useState<boolean>(true);
  const [allowAssistantCoaches, setAllowAssistantCoaches] = useState<boolean>(true);
  const [allowManagers, setAllowManagers] = useState<boolean>(true);

  // Valid team sizes for elimination tournaments
  const validTeamSizes = [2, 4, 8, 16, 32];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser?.isAdmin) {
      setError('Only admins can create tournaments');
      return;
    }

    if (!name || !description) {
      setError('Please fill in all required fields');
      return;
    }

    // Validate team composition settings
    if (minMainPlayers < 1 || maxMainPlayers < minMainPlayers) {
      setError('Invalid main player configuration');
      return;
    }

    if (minSubstitutes < 0 || maxSubstitutes < minSubstitutes) {
      setError('Invalid substitute configuration');
      return;
    }

    if (maxMainPlayers + maxSubstitutes > 10) {
      setError('Total team size cannot exceed 10 members');
      return;
    }

    // Validate team size for elimination tournaments
    if (tournamentType !== 'swiss-system' && !validTeamSizes.includes(maxTeams)) {
      setError(`Team size must be 2, 4, 8, 16, or 32 for ${tournamentType} tournaments`);
      return;
    }
    
    // Validate team size for Swiss system tournaments
    if (tournamentType === 'swiss-system' && maxTeams < 4) {
      setError('Swiss system tournaments require at least 4 teams');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      // Calculate prize distribution
      const firstPrize = Math.floor(totalPrize * 0.6);
      const secondPrize = Math.floor(totalPrize * 0.3);
      const thirdPrize = totalPrize - firstPrize - secondPrize;

      const format: TournamentFormat = {
        type: tournamentType,
        teamCount: maxTeams,
        matchFormat,
        mapPool: ['Corrode', 'Ascent', 'Bind', 'Haven', 'Icebox', 'Lotus', 'Sunset'],
        sideSelection: 'coin-flip',
        seedingMethod: seedingMethod,
        ...(tournamentType === 'swiss-system' && {
          swissConfig: {
            rounds: swissRounds,
            teamsAdvanceToPlayoffs,
            tiebreakerMethod: 'buchholz' as const,
            schedulingWindow
          }
        })
      };

      const rules: TournamentRules = {
        overtimeRules: 'Overtime will be played as first to 2 rounds with 1 round each side.',
        pauseRules: 'Teams may request one tactical timeout per match.',
        substitutionRules: 'Substitutions are allowed between maps.',
        disputeProcess: 'Disputes must be submitted within 10 minutes of match completion.',
        forfeitRules: 'Teams that forfeit will be disqualified from the tournament.',
        technicalIssues: 'Technical issues will be handled on a case-by-case basis.',
        codeOfConduct: 'All participants must follow the tournament code of conduct.',
        antiCheatPolicy: 'Cheating will result in immediate disqualification.',
        streamingRules: 'Teams may stream their own matches.',
        communicationRules: 'Teams must use the designated communication channels.'
      };

      const schedule: TournamentSchedule = {
        startDate: startDate ? new Date(startDate) : new Date(), // Use selected start date or start immediately
        endDate: endDate ? new Date(endDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now if no end date
        timeZone: 'UTC',
        matchDuration: 60,
        breakTime: 15,
        checkInTime: 30,
        maxMatchesPerDay: 4,
        preferredMatchTimes: ['18:00', '20:00', '22:00'],
        blackoutDates: []
      };

      const prizePool: PrizePool = {
        total: totalPrize,
        distribution: {
          first: firstPrize,
          second: secondPrize,
          third: thirdPrize
        },
        currency,
        paymentMethod: 'PayPal',
        taxInfo: 'Prizes are subject to applicable taxes.'
      };

      const requirements: RegistrationRequirements = {
        minPlayers: minMainPlayers + minSubstitutes,
        maxPlayers: maxMainPlayers + maxSubstitutes + (allowCoaches ? 1 : 0) + (allowAssistantCoaches ? 1 : 0) + (allowManagers ? 1 : 0),
        requiredRoles: ['owner', 'captain'],
        requireDiscord: false,
        requireRiotId: requireRiotId,
        requireRankVerification: requireRankVerification,
        minimumRank: minimumRank || null,
        entryFee: entryFee || null,
        approvalProcess: 'automatic',
        maxTeams: maxTeams,
        registrationDeadline: endDate ? new Date(endDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        teamValidationRules: ['All team members must be verified', 'Team must have valid roster'],
        
        // Team composition requirements
        minMainPlayers,
        maxMainPlayers,
        minSubstitutes,
        maxSubstitutes,
        allowCoaches,
        allowAssistantCoaches,
        allowManagers
      };

      // Clean requirements object to remove undefined values for Firestore
      const cleanRequirements: RegistrationRequirements = {
        minPlayers: requirements.minPlayers,
        maxPlayers: requirements.maxPlayers,
        requiredRoles: requirements.requiredRoles,
        requireDiscord: requirements.requireDiscord,
        requireRiotId: requirements.requireRiotId,
        requireRankVerification: requirements.requireRankVerification,
        minimumRank: requirements.minimumRank || null,
        entryFee: requirements.entryFee || null,
        approvalProcess: requirements.approvalProcess,
        maxTeams: requirements.maxTeams,
        registrationDeadline: requirements.registrationDeadline,
        teamValidationRules: requirements.teamValidationRules,
        minMainPlayers: requirements.minMainPlayers,
        maxMainPlayers: requirements.maxMainPlayers,
        minSubstitutes: requirements.minSubstitutes,
        maxSubstitutes: requirements.maxSubstitutes,
        allowCoaches: requirements.allowCoaches,
        allowAssistantCoaches: requirements.allowAssistantCoaches,
        allowManagers: requirements.allowManagers
      };

      const tournamentData = {
        name,
        description,
        format,
        rules,
        requirements: cleanRequirements,
        schedule,
        prizePool,
        region,
        isPublic: true,
        featured: false,
        tags: [tournamentType, region],
        createdBy: currentUser.id,
        adminIds: [currentUser.id]
      };

      // Clean the entire tournament data for Firestore
      const cleanTournamentData = cleanForFirestore(tournamentData);

      const tournamentId = await createTournament(cleanTournamentData, currentUser.id);

      await publishTournament(tournamentId);

      setMessage('Tournament created and published successfully! It is now available for team registrations.');
      setTimeout(() => {
        navigate(`/tournaments/${tournamentId}`);
      }, 2000);

    } catch (error: any) {
      setError(error.message || 'Failed to create tournament');
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser?.isAdmin) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-gray-400">You need admin privileges to create tournaments.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Create Tournament</h1>
          <button
            onClick={() => navigate('/admin/tournaments/manage')}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-gray-700 rounded-md hover:bg-gray-600"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tournaments
          </button>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-900/50 border border-red-500 rounded-md flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <p className="text-red-500">{error}</p>
          </div>
        )}
        {message && (
          <div className="mb-4 p-4 bg-green-900/50 border border-green-500 rounded-md flex items-center">
            <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
            <p className="text-green-500">{message}</p>
          </div>
        )}

        {/* Form */}
        <div className="bg-gray-800 rounded-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-200">
                    Tournament Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder="Enter tournament name"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-200">
                    Description *
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder="Enter tournament description"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="region" className="block text-sm font-medium text-gray-200">
                    Region
                  </label>
                  <select
                    id="region"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="Global">Global</option>
                    <option value="NA">North America</option>
                    <option value="EU">Europe</option>
                    <option value="ASIA">Asia</option>
                    <option value="OCE">Oceania</option>
                  </select>
                </div>
                
                {/* Swiss System Configuration */}
                {tournamentType === 'swiss-system' && (
                  <div className="col-span-2 space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label htmlFor="swissRounds" className="block text-sm font-medium text-gray-200">
                          Swiss Rounds
                        </label>
                        <select
                          id="swissRounds"
                          value={swissRounds}
                          onChange={(e) => setSwissRounds(Number(e.target.value))}
                          className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        >
                          <option value={3}>3 Rounds</option>
                          <option value={4}>4 Rounds</option>
                          <option value={5}>5 Rounds</option>
                          <option value={6}>6 Rounds</option>
                          <option value={7}>7 Rounds</option>
                        </select>
                        <p className="mt-1 text-xs text-gray-400">
                          Number of Swiss rounds before playoffs
                        </p>
                      </div>
                      
                      <div>
                        <label htmlFor="teamsAdvanceToPlayoffs" className="block text-sm font-medium text-gray-200">
                          Teams to Playoffs
                        </label>
                        <select
                          id="teamsAdvanceToPlayoffs"
                          value={teamsAdvanceToPlayoffs}
                          onChange={(e) => setTeamsAdvanceToPlayoffs(Number(e.target.value))}
                          className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        >
                          <option value={4}>4 Teams</option>
                          <option value={8}>8 Teams</option>
                          <option value={16}>16 Teams</option>
                        </select>
                        <p className="mt-1 text-xs text-gray-400">
                          Top teams advance to playoff bracket
                        </p>
                      </div>
                      
                      <div>
                        <label htmlFor="schedulingWindow" className="block text-sm font-medium text-gray-200">
                          Scheduling Window (Days)
                        </label>
                        <select
                          id="schedulingWindow"
                          value={schedulingWindow}
                          onChange={(e) => setSchedulingWindow(Number(e.target.value))}
                          className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        >
                          <option value={5}>5 Days</option>
                          <option value={7}>7 Days</option>
                          <option value={10}>10 Days</option>
                          <option value={14}>14 Days</option>
                        </select>
                        <p className="mt-1 text-xs text-gray-400">
                          Time teams have to schedule each match
                        </p>
                      </div>
                    </div>
                    
                    <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                      <div className="text-blue-400 font-medium mb-2">Swiss System Features:</div>
                      <ul className="text-blue-300 text-sm space-y-1">
                        <li>• Teams play against opponents with similar records</li>
                        <li>• Self-scheduling system for flexible match times</li>
                        <li>• Top teams advance to single elimination playoffs</li>
                        <li>• Automatic tiebreakers using Buchholz scoring</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Format */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Tournament Format</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="tournamentType" className="block text-sm font-medium text-gray-200">
                    Tournament Type
                  </label>
                  <select
                    id="tournamentType"
                    value={tournamentType}
                    onChange={(e) => setTournamentType(e.target.value as 'single-elimination' | 'double-elimination')}
                    className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="single-elimination">Single Elimination</option>
                    <option value="double-elimination">Double Elimination</option>
                    <option value="swiss-system">Swiss System + Playoffs</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="matchFormat" className="block text-sm font-medium text-gray-200">
                    Match Format
                  </label>
                  <select
                    id="matchFormat"
                    value={matchFormat}
                    onChange={(e) => setMatchFormat(e.target.value as 'BO1' | 'BO3' | 'BO5')}
                    className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="BO1">Best of 1</option>
                    <option value="BO3">Best of 3</option>
                    <option value="BO5">Best of 5</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="seedingMethod" className="block text-sm font-medium text-gray-200">
                    Seeding Method
                  </label>
                  <select
                    id="seedingMethod"
                    value={seedingMethod}
                    onChange={(e) => setSeedingMethod(e.target.value as 'random' | 'manual')}
                    className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="random">Random Seeding</option>
                    <option value="manual">Manual Seeding</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-400">
                    Manual seeding allows you to arrange teams in custom order
                  </p>
                </div>
              </div>
            </div>

            {/* Schedule */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Schedule</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-gray-200">
                    Start Date *
                  </label>
                  <input
                    type="datetime-local"
                    id="startDate"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                    }}
                    className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    When the tournament will begin
                  </p>
                </div>
                <div>
                  <label htmlFor="endDate" className="block text-sm font-medium text-gray-200">
                    End Date (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    id="endDate"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    Leave empty to set end date to 7 days from start
                  </p>
                </div>
              </div>
            </div>

            {/* Team Composition */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Team Composition</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label htmlFor="minMainPlayers" className="block text-sm font-medium text-gray-200">
                    Min Main Players
                  </label>
                  <input
                    type="number"
                    id="minMainPlayers"
                    value={minMainPlayers}
                    onChange={(e) => setMinMainPlayers(parseInt(e.target.value) || 5)}
                    min={1}
                    max={10}
                    className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label htmlFor="maxMainPlayers" className="block text-sm font-medium text-gray-200">
                    Max Main Players
                  </label>
                  <input
                    type="number"
                    id="maxMainPlayers"
                    value={maxMainPlayers}
                    onChange={(e) => setMaxMainPlayers(parseInt(e.target.value) || 5)}
                    min={minMainPlayers}
                    max={10}
                    className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label htmlFor="minSubstitutes" className="block text-sm font-medium text-gray-200">
                    Min Substitutes
                  </label>
                  <input
                    type="number"
                    id="minSubstitutes"
                    value={minSubstitutes}
                    onChange={(e) => setMinSubstitutes(parseInt(e.target.value) || 0)}
                    min={0}
                    max={5}
                    className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label htmlFor="maxSubstitutes" className="block text-sm font-medium text-gray-200">
                    Max Substitutes
                  </label>
                  <input
                    type="number"
                    id="maxSubstitutes"
                    value={maxSubstitutes}
                    onChange={(e) => setMaxSubstitutes(parseInt(e.target.value) || 2)}
                    min={minSubstitutes}
                    max={5}
                    className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              </div>
              
              <div className="mt-4 grid grid-cols-3 gap-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="allowCoaches"
                    checked={allowCoaches}
                    onChange={(e) => setAllowCoaches(e.target.checked)}
                    className="rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="allowCoaches" className="ml-2 text-sm text-gray-200">
                    Allow Coaches
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="allowAssistantCoaches"
                    checked={allowAssistantCoaches}
                    onChange={(e) => setAllowAssistantCoaches(e.target.checked)}
                    className="rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="allowAssistantCoaches" className="ml-2 text-sm text-gray-200">
                    Allow Assistant Coaches
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="allowManagers"
                    checked={allowManagers}
                    onChange={(e) => setAllowManagers(e.target.checked)}
                    className="rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="allowManagers" className="ml-2 text-sm text-gray-200">
                    Allow Managers
                  </label>
                </div>
              </div>
              
              <div className="mt-4 p-4 bg-gray-700 rounded-lg">
                <div className="text-gray-300 text-sm">
                  <div className="font-medium mb-2">Team Composition Summary:</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-gray-400">Main Players:</span>
                      <div className="text-white">{minMainPlayers}-{maxMainPlayers}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Substitutes:</span>
                      <div className="text-white">{minSubstitutes}-{maxSubstitutes}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Coaches:</span>
                      <div className="text-white">{allowCoaches ? 'Yes' : 'No'}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Managers:</span>
                      <div className="text-white">{allowManagers ? 'Yes' : 'No'}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Registration & Prize Pool */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Registration & Prize Pool</h2>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label htmlFor="maxTeams" className="block text-sm font-medium text-gray-200">
                    Max Teams *
                  </label>
                  {tournamentType === 'swiss-system' ? (
                    <input
                      type="number"
                      id="maxTeams"
                      value={maxTeams}
                      onChange={(e) => setMaxTeams(parseInt(e.target.value) || 4)}
                      min={4}
                      max={64}
                      className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      required
                    />
                  ) : (
                    <select
                      id="maxTeams"
                      value={maxTeams}
                      onChange={(e) => setMaxTeams(parseInt(e.target.value))}
                      className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      required
                    >
                      <option value={2}>2 Teams</option>
                      <option value={4}>4 Teams</option>
                      <option value={8}>8 Teams</option>
                      <option value={16}>16 Teams</option>
                      <option value={32}>32 Teams</option>
                    </select>
                  )}
                  <p className="mt-1 text-xs text-gray-400">
                    {tournamentType === 'swiss-system' 
                      ? 'Any number of teams (4-64) supported for Swiss system'
                      : `Valid sizes for ${tournamentType} tournaments`
                    }
                  </p>
                </div>

                <div>
                  <label htmlFor="totalPrize" className="block text-sm font-medium text-gray-200">
                    Total Prize Pool
                  </label>
                  <input
                    type="number"
                    id="totalPrize"
                    value={totalPrize}
                    onChange={(e) => setTotalPrize(parseInt(e.target.value) || 0)}
                    min={0}
                    className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="currency" className="block text-sm font-medium text-gray-200">
                    Currency
                  </label>
                  <select
                    id="currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as 'USD' | 'EUR' | 'GBP')}
                    className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
              </div>

              {/* Prize Distribution Preview */}
              {totalPrize > 0 && (
                <div className="mt-4 p-4 bg-gray-700 rounded-md">
                  <h3 className="text-sm font-medium text-gray-200 mb-2">Prize Distribution:</h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">1st Place:</span>
                      <p className="text-white">{Math.floor(totalPrize * 0.6)} {currency}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">2nd Place:</span>
                      <p className="text-white">{Math.floor(totalPrize * 0.3)} {currency}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">3rd Place:</span>
                      <p className="text-white">{totalPrize - Math.floor(totalPrize * 0.6) - Math.floor(totalPrize * 0.3)} {currency}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-6">
              <button
                type="submit"
                disabled={loading}
                className={`flex items-center px-6 py-3 text-sm font-medium text-white rounded-md ${
                  loading ? 'bg-gray-700 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500'
                }`}
              >
                {loading ? (
                  <>
                    <span className="animate-spin mr-2">⌛</span>
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Create Tournament
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TournamentCreation; 