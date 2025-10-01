import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { toast } from 'react-hot-toast';
import { Target, Trophy, Clock, Users, BarChart3, Filter, RefreshCw } from 'lucide-react';
import { PredictionService } from '../services/predictionService';
import type { Match, Team, Tournament, Prediction, PredictionLeaderboardEntry } from '../types/tournament';

interface PredictionsPageProps {
  currentUser: any;
}

const PredictionsPage: React.FC<PredictionsPageProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'matches' | 'leaderboard'>('matches');
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [leaderboard, setLeaderboard] = useState<PredictionLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingPrediction, setSubmittingPrediction] = useState<string | null>(null);
  const [leaderboardFilter, setLeaderboardFilter] = useState<'all' | 'tournament'>('all');

  // Initialize data once
  useEffect(() => {
    const initializeData = async () => {
      try {
        console.log('Initializing predictions page...');
        
        // Get tournaments
        const tournamentsRef = collection(db, 'tournaments');
        const tournamentsSnapshot = await getDocs(tournamentsRef);
        
        console.log('All tournaments:', tournamentsSnapshot.docs.map(doc => ({ id: doc.id, status: doc.data().status, name: doc.data().name })));
        
        const activeTournament = tournamentsSnapshot.docs.find(doc => {
          const data = doc.data();
          return data.status === 'in-progress' || data.status === 'registration-open';
        });
        
        // Also check ALL matches to see if there are any at all
        const allMatchesRef = collection(db, 'matches');
        const allMatchesSnapshot = await getDocs(allMatchesRef);
        console.log('Total matches in database:', allMatchesSnapshot.docs.length);
        if (allMatchesSnapshot.docs.length > 0) {
          console.log('Sample match:', allMatchesSnapshot.docs[0].data());
        }
        
        if (activeTournament) {
          console.log('Found active tournament:', activeTournament.id);
          const tournamentData = { id: activeTournament.id, ...activeTournament.data() } as Tournament;
          setTournament(tournamentData);
          
          // Get matches for this tournament
          const matchesRef = collection(db, 'matches');
          const matchesQuery = query(
            matchesRef,
            where('tournamentId', '==', tournamentData.id),
            orderBy('scheduledTime', 'asc')
          );
          
          const matchesSnapshot = await getDocs(matchesQuery);
          console.log('Matches query result:', matchesSnapshot.docs.length, 'docs');
          
          const matchesData = matchesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            scheduledTime: doc.data().scheduledTime?.toDate?.() || doc.data().scheduledTime,
            createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt
          })) as Match[];
          
          setMatches(matchesData);
          console.log('All matches found:', matchesData.length);
          console.log('Match details:', matchesData.map(m => ({ 
            id: m.id, 
            state: m.matchState, 
            complete: m.isComplete,
            scheduled: m.scheduledTime,
            team1: m.team1Id,
            team2: m.team2Id,
            swissRound: m.swissRound
          })));
          
          // Let's also check what states we have
          const states = [...new Set(matchesData.map(m => m.matchState))];
          console.log('All match states found:', states);
          
          // Let's also check for matches without scheduledTime
          const unscheduledMatches = matchesData.filter(m => !m.scheduledTime);
          console.log('Unscheduled matches:', unscheduledMatches.length);
          if (unscheduledMatches.length > 0) {
            console.log('Unscheduled match details:', unscheduledMatches.map(m => ({
              id: m.id,
              state: m.matchState,
              complete: m.isComplete,
              team1: m.team1Id,
              team2: m.team2Id,
              swissRound: m.swissRound
            })));
          }
          
          // Get teams for this tournament - try multiple approaches
          const teamsRef = collection(db, 'teams');
          
          // First try: teams with tournamentIds array
          let teamsQuery = query(teamsRef, where('tournamentIds', 'array-contains', tournamentData.id));
          let teamsSnapshot = await getDocs(teamsQuery);
          console.log('Teams with tournamentIds array:', teamsSnapshot.docs.length);
          
          // If no teams found, try getting all teams and filter manually
          if (teamsSnapshot.docs.length === 0) {
            console.log('No teams found with tournamentIds array, trying all teams...');
            const allTeamsSnapshot = await getDocs(teamsRef);
            console.log('All teams in database:', allTeamsSnapshot.docs.length);
            
            const teamsData = allTeamsSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
              createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt
            })) as Team[];
            
            console.log('All team names:', teamsData.map(t => t.name));
            setTeams(teamsData);
          } else {
            const teamsData = teamsSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
              createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt
            })) as Team[];
            
            console.log('Teams found:', teamsData.map(t => ({ id: t.id, name: t.name })));
            setTeams(teamsData);
          }
          
          // Get user predictions if logged in
          if (currentUser) {
            try {
              const userPredictions = await PredictionService.getUserPredictions(currentUser.id);
              setPredictions(userPredictions);
            } catch (error) {
              console.error('Error fetching user predictions:', error);
            }
          }
          
          // Get leaderboard
          try {
            const leaderboardData = await PredictionService.getLeaderboard(tournamentData.id);
            setLeaderboard(leaderboardData);
          } catch (error) {
            console.error('Error fetching leaderboard:', error);
          }
        } else {
          console.log('No active tournament found');
          setTournament(null);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error initializing data:', error);
        setLoading(false);
      }
    };

    initializeData();
  }, []); // Empty dependency array - run once only

  const getUserPrediction = (matchId: string): Prediction | null => {
    return predictions.find(p => p.matchId === matchId) || null;
  };

  const getTeamName = (teamId: string | null): string => {
    if (!teamId) return 'TBD';
    const team = teams.find(t => t.id === teamId);
    return team?.name || 'Unknown Team';
  };

  const canPredict = (match: Match): boolean => {
    if (!match.scheduledTime) return false;
    const scheduledTime = match.scheduledTime instanceof Date ? match.scheduledTime : new Date(match.scheduledTime);
    const predictionDeadline = new Date(scheduledTime.getTime() - (60 * 60 * 1000)); // 1 hour before
    const now = new Date();
    return now < predictionDeadline;
  };

  const handlePredictionSubmit = async (
    matchId: string,
    predictedWinner: 'team1' | 'team2',
    predictedScore: { team1Score: number; team2Score: number }
  ) => {
    if (!currentUser || !tournament) return;

    setSubmittingPrediction(matchId);
    try {
      await PredictionService.createOrUpdatePrediction(
        currentUser.id,
        matchId,
        tournament.id,
        predictedWinner,
        predictedScore
      );

      // Refresh predictions
      const userPredictions = await PredictionService.getUserPredictions(currentUser.id);
      setPredictions(userPredictions);

      toast.success('Prediction saved successfully!');
    } catch (error) {
      console.error('Error submitting prediction:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save prediction');
    } finally {
      setSubmittingPrediction(null);
    }
  };

  const formatTimeUntilMatch = (scheduledTime: Date): string => {
    const now = new Date();
    const timeDiff = scheduledTime.getTime() - now.getTime();
    
    if (timeDiff <= 0) return 'Match started';
    
    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const PredictionForm: React.FC<{ match: Match; existingPrediction?: Prediction | null }> = ({ 
    match, 
    existingPrediction 
  }) => {
    const [predictedWinner, setPredictedWinner] = useState<'team1' | 'team2'>(
      existingPrediction?.predictedWinner || 'team1'
    );
    const [team1Score, setTeam1Score] = useState(
      existingPrediction?.predictedScore.team1Score || 1
    );
    const [team2Score, setTeam2Score] = useState(
      existingPrediction?.predictedScore.team2Score || 1
    );

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      handlePredictionSubmit(match.id, predictedWinner, { team1Score, team2Score });
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-1">
            <input
              type="radio"
              id={`team1-${match.id}`}
              name={`winner-${match.id}`}
              value="team1"
              checked={predictedWinner === 'team1'}
              onChange={(e) => setPredictedWinner(e.target.value as 'team1')}
              className="text-pink-500"
            />
            <label htmlFor={`team1-${match.id}`} className="text-white text-xs">
              {getTeamName(match.team1Id)}
            </label>
          </div>
          <div className="flex items-center space-x-1">
            <input
              type="radio"
              id={`team2-${match.id}`}
              name={`winner-${match.id}`}
              value="team2"
              checked={predictedWinner === 'team2'}
              onChange={(e) => setPredictedWinner(e.target.value as 'team2')}
              className="text-pink-500"
            />
            <label htmlFor={`team2-${match.id}`} className="text-white text-xs">
              {getTeamName(match.team2Id)}
            </label>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 text-xs">
          <label className="text-gray-300">Score:</label>
          <input
            type="number"
            min="0"
            max="3"
            value={team1Score}
            onChange={(e) => setTeam1Score(parseInt(e.target.value) || 0)}
            className="w-12 px-1 py-1 bg-gray-800 border border-gray-600 rounded text-white text-center text-xs"
          />
          <span className="text-gray-400">-</span>
          <input
            type="number"
            min="0"
            max="3"
            value={team2Score}
            onChange={(e) => setTeam2Score(parseInt(e.target.value) || 0)}
            className="w-12 px-1 py-1 bg-gray-800 border border-gray-600 rounded text-white text-center text-xs"
          />
        </div>
        
        <button
          type="submit"
          disabled={submittingPrediction === match.id}
          className="w-full bg-gradient-to-r from-pink-600 to-pink-700 hover:from-pink-700 hover:to-pink-800 text-white font-medium py-1.5 px-3 rounded text-xs transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submittingPrediction === match.id ? 'Saving...' : existingPrediction ? 'Update' : 'Predict'}
        </button>
      </form>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-pink-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-300">Loading predictions...</p>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Target className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">No Active Tournament</h1>
          <p className="text-gray-300">There are currently no active tournaments available for predictions.</p>
          <p className="text-sm text-gray-500 mt-2">Check back when a tournament is running!</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Target className="w-16 h-16 text-pink-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Predictions</h1>
          <p className="text-gray-300">Please log in to make predictions</p>
        </div>
      </div>
    );
  }


  // Show ALL matches that are not completed, including unscheduled ones
  const allPredictableMatches = matches.filter(match => {
    // Allow prediction for matches that are not completed and not currently playing
    const isPredictable = !match.isComplete && 
      match.matchState !== 'playing' && 
      match.matchState !== 'completed' &&
      match.matchState !== 'forfeited';
    
    // If match has scheduledTime, check if we're within prediction window
    // If no scheduledTime, allow prediction (matches not yet scheduled)
    const canPredictMatch = match.scheduledTime ? canPredict(match) : true;
    
    console.log(`Match ${match.id}: state=${match.matchState}, complete=${match.isComplete}, predictable=${isPredictable}, canPredict=${canPredictMatch}, scheduled=${!!match.scheduledTime}, teams=${match.team1Id}/${match.team2Id}`);
    return isPredictable && canPredictMatch;
  });
  
  console.log('All predictable matches:', allPredictableMatches.length);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Target className="w-8 h-8 text-pink-400" />
            <h1 className="text-3xl font-bold text-white">Predictions</h1>
          </div>
          <p className="text-gray-300">
            Predict match outcomes and compete on the leaderboard!
          </p>
          <div className="mt-2 text-sm text-pink-300">
            <span className="font-semibold">Scoring:</span> Correct Winner = 25 points | Correct Score = 5 points
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 bg-black/40 rounded-xl p-1 shadow-lg mb-8 border border-white/20 backdrop-blur-sm">
          {[
            { id: 'matches', label: 'MATCHES', icon: Target },
            { id: 'leaderboard', label: 'LEADERBOARD', icon: Trophy }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'matches' | 'leaderboard')}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition-all duration-200 font-mono tracking-tight ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-pink-600 to-pink-700 text-white shadow-lg'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Matches Tab */}
        {activeTab === 'matches' && (
          <div className="bg-black/40 border border-pink-400/20 rounded-lg backdrop-blur-sm">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                  <Target className="w-5 h-5 text-pink-400" />
                  <span>Upcoming Matches</span>
                </h2>
                <div className="text-sm text-gray-300">
                  {allPredictableMatches.length} matches available for prediction
                </div>
              </div>

              {allPredictableMatches.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">No matches available for prediction</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Check back when new matches are scheduled
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {allPredictableMatches.map((match) => {
                    const existingPrediction = getUserPrediction(match.id);
                    const scheduledTime = match.scheduledTime ? (match.scheduledTime instanceof Date ? match.scheduledTime : new Date(match.scheduledTime)) : null;
                    
                    return (
                      <div key={match.id} className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:bg-gray-800/70 transition-colors">
                        {/* Match Header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-white font-medium text-sm">
                            {getTeamName(match.team1Id)} vs {getTeamName(match.team2Id)}
                          </div>
                          <div className="text-xs text-gray-400">
                            {match.matchState === 'scheduled' ? 'Scheduled' : 
                             match.matchState === 'ready_up' ? 'Ready Up' : 
                             match.matchState === 'pending_scheduling' ? 'Not Scheduled' : 
                             match.matchState}
                          </div>
                        </div>

                        {/* Match Details */}
                        <div className="flex items-center justify-between mb-3 text-xs text-gray-400">
                          <div>
                            {scheduledTime ? (
                              <>
                                <div>{scheduledTime.toLocaleDateString()}</div>
                                <div>{scheduledTime.toLocaleTimeString()}</div>
                              </>
                            ) : (
                              <div>Not scheduled yet</div>
                            )}
                          </div>
                          <div>
                            {scheduledTime ? (
                              <span className="text-orange-400 font-medium">
                                {formatTimeUntilMatch(scheduledTime)}
                              </span>
                            ) : (
                              <span className="text-green-400">Available</span>
                            )}
                          </div>
                        </div>

                        {/* Current Prediction */}
                        {existingPrediction && (
                          <div className="mb-3 p-2 bg-green-900/20 border border-green-500/30 rounded text-xs">
                            <div className="text-green-400 font-medium">
                              Predicted: {getTeamName(existingPrediction.predictedWinner === 'team1' ? match.team1Id : match.team2Id)}
                            </div>
                            <div className="text-gray-300">
                              Score: {existingPrediction.predictedScore.team1Score} - {existingPrediction.predictedScore.team2Score}
                            </div>
                          </div>
                        )}
                        
                        {/* Prediction Form */}
                        <PredictionForm match={match} existingPrediction={existingPrediction} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && (
          <div className="bg-black/40 border border-pink-400/20 rounded-lg backdrop-blur-sm">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                  <Trophy className="w-5 h-5 text-pink-400" />
                  <span>Leaderboard</span>
                </h2>
                <div className="flex items-center space-x-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <select
                    value={leaderboardFilter}
                    onChange={(e) => setLeaderboardFilter(e.target.value as 'all' | 'tournament')}
                    className="bg-gray-800 border border-gray-600 rounded px-3 py-1 text-white text-sm"
                  >
                    <option value="all">All Time</option>
                    <option value="tournament">Current Tournament</option>
                  </select>
                </div>
              </div>

              {leaderboard.length === 0 ? (
                <div className="text-center py-12">
                  <Trophy className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">No predictions yet</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Be the first to make a prediction!
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-4 text-pink-300 font-medium">Rank</th>
                        <th className="text-left py-3 px-4 text-pink-300 font-medium">Player</th>
                        <th className="text-left py-3 px-4 text-pink-300 font-medium">Points</th>
                        <th className="text-left py-3 px-4 text-pink-300 font-medium">Accuracy</th>
                        <th className="text-left py-3 px-4 text-pink-300 font-medium">Predictions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.map((entry, index) => (
                        <tr key={entry.userId} className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors">
                          <td className="py-4 px-4">
                            <div className="flex items-center space-x-2">
                              {index === 0 && <Trophy className="w-4 h-4 text-yellow-400" />}
                              {index === 1 && <Trophy className="w-4 h-4 text-gray-400" />}
                              {index === 2 && <Trophy className="w-4 h-4 text-orange-400" />}
                              <span className={`font-bold ${index < 3 ? 'text-pink-400' : 'text-gray-300'}`}>
                                #{index + 1}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-white font-medium">{entry.username}</div>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-green-400 font-bold text-lg">{entry.totalPoints}</span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center space-x-2">
                              <div className="w-16 bg-gray-700 rounded-full h-2">
                                <div 
                                  className="bg-gradient-to-r from-pink-500 to-pink-600 h-2 rounded-full"
                                  style={{ width: `${entry.accuracy}%` }}
                                ></div>
                              </div>
                              <span className="text-gray-300 text-sm">{entry.accuracy.toFixed(1)}%</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-gray-300">
                            {entry.correctPredictions}/{entry.totalPredictions}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PredictionsPage;