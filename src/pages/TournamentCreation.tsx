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
  PrizePool
} from '../types/tournament';
import { createTournament, publishTournament } from '../services/tournamentService';

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
  const [tournamentType, setTournamentType] = useState<'single-elimination' | 'double-elimination'>('single-elimination');
  const [matchFormat, setMatchFormat] = useState<'BO1' | 'BO3' | 'BO5'>('BO3');

  // Schedule
  const [endDate, setEndDate] = useState<string>('');

  // Prize pool
  const [totalPrize, setTotalPrize] = useState<number>(0);
  const [currency, setCurrency] = useState<'USD' | 'EUR' | 'GBP'>('USD');

  // Registration
  const [maxTeams, setMaxTeams] = useState<number>(4);
  const [requireRiotId, setRequireRiotId] = useState<boolean>(true);
  const [requireRankVerification, setRequireRankVerification] = useState<boolean>(false);
  const [minimumRank, setMinimumRank] = useState<string>('');
  const [entryFee, setEntryFee] = useState<number>(0);

  // Valid team sizes for elimination tournaments
  const validTeamSizes = [4, 8, 16, 32];

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

    // Validate team size for elimination tournaments
    if (!validTeamSizes.includes(maxTeams)) {
      setError(`Team size must be 4, 8, 16, or 32 for ${tournamentType} tournaments`);
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
        mapPool: ['Ascent', 'Icebox', 'Sunset', 'Haven', 'Lotus', 'Pearl', 'Split'],
        sideSelection: 'coin-flip',
        seedingMethod: 'random'
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
        startDate: new Date(), // Start immediately
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

      const tournamentId = await createTournament({
        name,
        description,
        format,
        rules,
        schedule,
        prizePool,
        region,
        isPublic: true,
        featured: false,
        tags: [tournamentType, region],
        createdBy: currentUser.id,
        adminIds: [currentUser.id]
      }, currentUser.id);

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
              </div>
            </div>

            {/* Schedule */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Schedule</h2>
              <div className="mb-4 p-3 bg-blue-900/30 border border-blue-500 rounded-md">
                <p className="text-sm text-blue-300">
                  <strong>Note:</strong> Tournaments start immediately when created. You can optionally set an end date.
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
                  Leave empty to set end date to 7 days from now
                </p>
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
                  <select
                    id="maxTeams"
                    value={maxTeams}
                    onChange={(e) => setMaxTeams(parseInt(e.target.value))}
                    className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    required
                  >
                    <option value={4}>4 Teams</option>
                    <option value={8}>8 Teams</option>
                    <option value={16}>16 Teams</option>
                    <option value={32}>32 Teams</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-400">
                    Valid sizes for {tournamentType} tournaments
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