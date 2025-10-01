import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, setDoc, collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getMatch, getTeamById, getTournamentById } from '../services/firebaseService';
import type { Match, Team, Tournament } from '../types/tournament';
import { Users, Trophy, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface Prediction {
  id: string;
  matchId: string;
  predictedWinner: 'team1' | 'team2';
  voterIp: string;
  createdAt: Date;
}

const PredictionPage: React.FC = () => {
  const params = useParams<{ matchId: string }>();
  const { matchId } = params;
  
  const [match, setMatch] = useState<Match | null>(null);
  const [team1, setTeam1] = useState<Team | null>(null);
  const [team2, setTeam2] = useState<Team | null>(null);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<'team1' | 'team2' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [voterIp, setVoterIp] = useState<string>('');
  const [predictionStats, setPredictionStats] = useState({ team1: 0, team2: 0, total: 0 });
  const [error, setError] = useState('');

  // Get user's IP address
  useEffect(() => {
    const getUserIp = async () => {
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        setVoterIp(data.ip);
      } catch (error) {
        console.error('Error getting IP:', error);
        // Fallback to a random string if IP detection fails
        setVoterIp(Math.random().toString(36).substring(2, 15));
      }
    };
    getUserIp();
  }, []);

  // Load match data
  useEffect(() => {
    const loadMatchData = async () => {
      if (!matchId) return;

      try {
        const matchData = await getMatch(matchId);
        if (!matchData) {
          setError('Match not found');
          setLoading(false);
          return;
        }

        setMatch(matchData);

        // Load teams
        if (matchData.team1Id && matchData.team2Id) {
          const [team1Data, team2Data] = await Promise.all([
            getTeamById(matchData.team1Id),
            getTeamById(matchData.team2Id)
          ]);
          setTeam1(team1Data);
          setTeam2(team2Data);
        }

        // Load tournament
        if (matchData.tournamentId) {
          const tournamentData = await getTournamentById(matchData.tournamentId);
          setTournament(tournamentData);
        }

        // Check if user has already voted
        if (voterIp) {
          await checkExistingVote(matchId, voterIp);
        }

        // Load prediction stats
        await loadPredictionStats(matchId);

        setLoading(false);
      } catch (error) {
        console.error('Error loading match data:', error);
        setError('Failed to load match data');
        setLoading(false);
      }
    };

    loadMatchData();
  }, [matchId, voterIp]);

  const checkExistingVote = async (matchId: string, ip: string) => {
    try {
      const predictionsRef = collection(db, 'predictions');
      const voteQuery = query(
        predictionsRef,
        where('matchId', '==', matchId),
        where('voterIp', '==', ip)
      );
      const voteSnapshot = await getDocs(voteQuery);
      
      if (!voteSnapshot.empty) {
        setHasVoted(true);
        const existingVote = voteSnapshot.docs[0].data() as Prediction;
        setSelectedTeam(existingVote.predictedWinner);
      }
    } catch (error) {
      console.error('Error checking existing vote:', error);
    }
  };

  const loadPredictionStats = async (matchId: string) => {
    try {
      const predictionsRef = collection(db, 'predictions');
      const statsQuery = query(predictionsRef, where('matchId', '==', matchId));
      const statsSnapshot = await getDocs(statsQuery);
      
      let team1Votes = 0;
      let team2Votes = 0;
      
      statsSnapshot.docs.forEach(doc => {
        const prediction = doc.data() as Prediction;
        if (prediction.predictedWinner === 'team1') {
          team1Votes++;
        } else {
          team2Votes++;
        }
      });
      
      setPredictionStats({
        team1: team1Votes,
        team2: team2Votes,
        total: team1Votes + team2Votes
      });
    } catch (error) {
      console.error('Error loading prediction stats:', error);
    }
  };

  const submitPrediction = async () => {
    if (!selectedTeam || !matchId || !voterIp) return;

    setSubmitting(true);
    setError('');

    try {
      // Double-check if user has already voted
      const predictionsRef = collection(db, 'predictions');
      const voteQuery = query(
        predictionsRef,
        where('matchId', '==', matchId),
        where('voterIp', '==', voterIp)
      );
      const voteSnapshot = await getDocs(voteQuery);
      
      if (!voteSnapshot.empty) {
        setError('You have already voted for this match!');
        setSubmitting(false);
        return;
      }

      // Submit prediction
      await addDoc(collection(db, 'predictions'), {
        matchId,
        predictedWinner: selectedTeam,
        voterIp,
        createdAt: new Date(),
      });

      setHasVoted(true);
      await loadPredictionStats(matchId);
      
    } catch (error) {
      console.error('Error submitting prediction:', error);
      setError('Failed to submit prediction. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <div className="text-2xl font-bold text-white">Loading prediction...</div>
        </div>
      </div>
    );
  }

  if (error && !match) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <div className="text-2xl font-bold text-white mb-2">Error</div>
          <div className="text-gray-400">{error}</div>
        </div>
      </div>
    );
  }

  if (!match || !team1 || !team2) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-white mb-2">Match Not Found</div>
          <div className="text-gray-400">The requested match could not be found.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 py-4 px-4 sm:py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2">
            {tournament?.name || 'Tournament'} Prediction
          </h1>
          <div className="text-lg sm:text-xl text-gray-400">
            {tournament?.type === 'swiss-system' ? 'Swiss System' : 
             tournament?.type === 'single-elimination' ? 'Single Elimination' :
             tournament?.type === 'double-elimination' ? 'Double Elimination' :
             tournament?.type || 'Tournament'}
            {match.round ? ` - Round ${match.round}` : ''}
          </div>
        </div>

        {/* Match Info */}
        <div className="bg-gray-800 rounded-lg p-4 sm:p-6 mb-6 sm:mb-8 border border-gray-700">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 mb-4 sm:mb-6">
            {/* Team 1 */}
            <div className="text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-600 rounded-full mx-auto mb-2 sm:mb-3 flex items-center justify-center">
                <Users className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </div>
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-400">{team1.name}</div>
            </div>
            
            {/* VS */}
            <div className="text-center">
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1 sm:mb-2">VS</div>
              <div className="text-sm sm:text-base lg:text-lg text-gray-400">
                {match.matchState === 'completed' ? 'Match Complete' : 'Upcoming Match'}
              </div>
            </div>
            
            {/* Team 2 */}
            <div className="text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-600 rounded-full mx-auto mb-2 sm:mb-3 flex items-center justify-center">
                <Users className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </div>
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-red-400">{team2.name}</div>
            </div>
          </div>

          {/* Match Details */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-gray-400">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-sm sm:text-base">BO3 Format</span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-sm sm:text-base">{match.matchState || 'Scheduled'}</span>
            </div>
          </div>
        </div>

        {/* Prediction Section */}
        {!hasVoted ? (
          <div className="bg-gray-800 rounded-lg p-4 sm:p-6 mb-6 sm:mb-8 border border-gray-700">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 text-center">
              Who will win this match?
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
              {/* Team 1 Option */}
              <button
                onClick={() => setSelectedTeam('team1')}
                className={`p-4 sm:p-6 rounded-lg border-2 transition-all ${
                  selectedTeam === 'team1'
                    ? 'border-blue-500 bg-blue-900/20'
                    : 'border-gray-600 bg-gray-700 hover:border-blue-400'
                }`}
              >
                <div className="text-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-600 rounded-full mx-auto mb-2 sm:mb-3 flex items-center justify-center">
                    <Users className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                  </div>
                  <div className="text-lg sm:text-xl font-bold text-blue-400 mb-1 sm:mb-2">{team1.name}</div>
                  <div className="text-xs sm:text-sm text-gray-400">
                    {predictionStats.team1} votes ({predictionStats.total > 0 ? Math.round((predictionStats.team1 / predictionStats.total) * 100) : 0}%)
                  </div>
                </div>
              </button>

              {/* Team 2 Option */}
              <button
                onClick={() => setSelectedTeam('team2')}
                className={`p-4 sm:p-6 rounded-lg border-2 transition-all ${
                  selectedTeam === 'team2'
                    ? 'border-red-500 bg-red-900/20'
                    : 'border-gray-600 bg-gray-700 hover:border-red-400'
                }`}
              >
                <div className="text-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-red-600 rounded-full mx-auto mb-2 sm:mb-3 flex items-center justify-center">
                    <Users className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                  </div>
                  <div className="text-lg sm:text-xl font-bold text-red-400 mb-1 sm:mb-2">{team2.name}</div>
                  <div className="text-xs sm:text-sm text-gray-400">
                    {predictionStats.team2} votes ({predictionStats.total > 0 ? Math.round((predictionStats.team2 / predictionStats.total) * 100) : 0}%)
                  </div>
                </div>
              </button>
            </div>

            {error && (
              <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 text-red-400">
                  <XCircle className="w-5 h-5" />
                  <span>{error}</span>
                </div>
              </div>
            )}

            <button
              onClick={submitPrediction}
              disabled={!selectedTeam || submitting}
              className="w-full py-3 sm:py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors text-sm sm:text-base"
            >
              {submitting ? 'Submitting...' : 'Submit Prediction'}
            </button>
          </div>
        ) : (
          <div className="bg-green-900/20 border border-green-500 rounded-lg p-4 sm:p-6 mb-6 sm:mb-8">
            <div className="text-center">
              <CheckCircle className="w-12 h-12 sm:w-16 sm:h-16 text-green-500 mx-auto mb-3 sm:mb-4" />
              <h2 className="text-xl sm:text-2xl font-bold text-green-400 mb-2">Prediction Submitted!</h2>
              <p className="text-sm sm:text-base text-gray-300">
                You predicted <span className="font-bold text-white">
                  {selectedTeam === 'team1' ? team1.name : team2.name}
                </span> to win.
              </p>
            </div>
          </div>
        )}

        {/* Live Stats */}
        <div className="bg-gray-800 rounded-lg p-4 sm:p-6 border border-gray-700">
          <h3 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4 text-center">Live Prediction Stats</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {/* Team 1 Stats */}
            <div className="text-center">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-400 mb-1 sm:mb-2">{team1.name}</div>
              <div className="text-2xl sm:text-3xl font-bold text-white mb-1">{predictionStats.team1}</div>
              <div className="text-xs sm:text-sm text-gray-400">votes</div>
              <div className="w-full bg-gray-700 rounded-full h-2 sm:h-3 mt-2 sm:mt-3">
                <div 
                  className="bg-blue-500 h-2 sm:h-3 rounded-full transition-all duration-500"
                  style={{ 
                    width: predictionStats.total > 0 ? `${(predictionStats.team1 / predictionStats.total) * 100}%` : '0%' 
                  }}
                ></div>
              </div>
            </div>

            {/* Team 2 Stats */}
            <div className="text-center">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-red-400 mb-1 sm:mb-2">{team2.name}</div>
              <div className="text-2xl sm:text-3xl font-bold text-white mb-1">{predictionStats.team2}</div>
              <div className="text-xs sm:text-sm text-gray-400">votes</div>
              <div className="w-full bg-gray-700 rounded-full h-2 sm:h-3 mt-2 sm:mt-3">
                <div 
                  className="bg-red-500 h-2 sm:h-3 rounded-full transition-all duration-500"
                  style={{ 
                    width: predictionStats.total > 0 ? `${(predictionStats.team2 / predictionStats.total) * 100}%` : '0%' 
                  }}
                ></div>
              </div>
            </div>
          </div>
          
          <div className="text-center mt-4 sm:mt-6">
            <div className="text-sm sm:text-base text-gray-400">
              Total Predictions: <span className="font-bold text-white">{predictionStats.total}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PredictionPage;
