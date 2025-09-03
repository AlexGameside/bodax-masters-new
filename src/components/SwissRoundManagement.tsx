import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Play, Clock, Users, Trophy } from 'lucide-react';
import { SwissTournamentService } from '../services/swissTournamentService';
import type { Tournament } from '../types/tournament';

interface SwissRoundManagementProps {
  tournament: Tournament;
  onRoundGenerated?: () => void;
}

const SwissRoundManagement: React.FC<SwissRoundManagementProps> = ({ 
  tournament, 
  onRoundGenerated 
}) => {
  const [completionStatus, setCompletionStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const swissStage = tournament.stageManagement?.swissStage;

  useEffect(() => {
    if (swissStage?.isActive) {
      loadCompletionStatus();
    }
  }, [tournament.id, swissStage?.currentMatchday]);

  const loadCompletionStatus = async () => {
    if (!swissStage?.isActive) return;
    
    setLoading(true);
    try {
      const status = await SwissTournamentService.checkMatchdayCompletion(tournament.id);
      setCompletionStatus(status);
      setError('');
    } catch (err) {
      setError('Failed to load completion status');
      console.error('Error loading completion status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateNextRound = async () => {
    if (!swissStage?.isActive) return;
    
    setGenerating(true);
    setMessage('');
    setError('');
    
    try {
      const result = await SwissTournamentService.manuallyGenerateNextRound(tournament.id);
      
      if (result.success) {
        setMessage(result.message);
        setCompletionStatus(null); // Reset status
        onRoundGenerated?.(); // Notify parent component
      } else {
        setError(result.message);
        if (result.errors) {
          console.error('Generation errors:', result.errors);
        }
        if (result.warnings) {
          console.warn('Generation warnings:', result.warnings);
        }
      }
    } catch (err) {
      setError('Failed to generate next round');
      console.error('Error generating next round:', err);
    } finally {
      setGenerating(false);
    }
  };

  if (!swissStage?.isActive) {
    return (
      <div className="bg-gradient-to-br from-gray-500/10 to-gray-600/10 backdrop-blur-sm rounded-2xl p-6 border border-gray-400/30 shadow-2xl">
        <div className="text-center">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Swiss System Not Active</h3>
          <p className="text-gray-300">This tournament is not currently in Swiss stage.</p>
        </div>
      </div>
    );
  }

  const currentRound = swissStage.currentRound;
  const totalRounds = swissStage.totalRounds;
  const isLastRound = currentRound >= totalRounds;

  return (
    <div className="bg-gradient-to-br from-blue-500/10 via-purple-600/10 to-cyan-700/10 backdrop-blur-sm rounded-2xl p-6 border border-blue-400/30 shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Trophy className="w-8 h-8 text-blue-400" />
          <h3 className="text-2xl font-bold text-white">Swiss Round Management</h3>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-300">Current Round</div>
          <div className="text-2xl font-bold text-blue-400">
            {currentRound} / {totalRounds}
          </div>
        </div>
      </div>

      {/* Round Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-300 mb-2">
          <span>Round Progress</span>
          <span>{Math.round((currentRound / totalRounds) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentRound / totalRounds) * 100}%` }}
          />
        </div>
      </div>

      {/* Completion Status */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading completion status...</p>
        </div>
      ) : completionStatus ? (
        <div className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-black/20 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white">{completionStatus.totalMatches}</div>
              <div className="text-sm text-gray-300">Total Matches</div>
            </div>
            <div className="bg-black/20 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-400">{completionStatus.completedMatches}</div>
              <div className="text-sm text-gray-300">Completed</div>
            </div>
            <div className="bg-black/20 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-red-400">{completionStatus.incompleteMatches.length}</div>
              <div className="text-sm text-gray-300">Incomplete</div>
            </div>
          </div>

          {/* Status Indicator */}
          <div className={`flex items-center justify-center p-4 rounded-lg ${
            completionStatus.isComplete 
              ? 'bg-green-500/20 border border-green-500/30' 
              : 'bg-yellow-500/20 border border-yellow-500/30'
          }`}>
            {completionStatus.isComplete ? (
              <CheckCircle className="w-6 h-6 text-green-400 mr-3" />
            ) : (
              <AlertCircle className="w-6 h-6 text-yellow-400 mr-3" />
            )}
            <span className={`font-medium ${
              completionStatus.isComplete ? 'text-green-300' : 'text-yellow-300'
            }`}>
              {completionStatus.isComplete 
                ? 'Round Complete - Ready for Next Round' 
                : 'Round In Progress - Cannot Generate Next Round Yet'
              }
            </span>
          </div>

          {/* Incomplete Matches List */}
          {completionStatus.incompleteMatches.length > 0 && (
            <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <h4 className="text-red-300 font-medium mb-2">Incomplete Matches:</h4>
              <div className="space-y-2">
                {completionStatus.incompleteMatches.map((match: any) => (
                  <div key={match.id} className="text-sm text-red-200">
                    • {match.team1Id} vs {match.team2Id} - {match.matchState}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* Action Buttons */}
      <div className="space-y-4">
        {!isLastRound && completionStatus?.canGenerateNextRound && (
          <button
            onClick={handleGenerateNextRound}
            disabled={generating}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2"
          >
            {generating ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Generating Round {currentRound + 1}...</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                <span>Generate Round {currentRound + 1}</span>
              </>
            )}
          </button>
        )}

        {isLastRound && completionStatus?.isComplete && (
          <div className="bg-gradient-to-r from-green-500/20 to-emerald-600/20 border border-green-500/30 rounded-lg p-4 text-center">
            <Trophy className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <h4 className="text-green-300 font-medium mb-1">All Swiss Rounds Complete!</h4>
            <p className="text-green-200 text-sm">Tournament is ready to advance to playoffs.</p>
          </div>
        )}

        <button
          onClick={loadCompletionStatus}
          disabled={loading}
          className="w-full bg-gray-600 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
        >
          <Clock className="w-4 h-4" />
          <span>Refresh Status</span>
        </button>
      </div>

      {/* Messages */}
      {message && (
        <div className="mt-4 bg-green-500/20 border border-green-500/30 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-green-300 font-medium">{message}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 bg-red-500/20 border border-red-500/30 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span className="text-red-300 font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* Round Information */}
      <div className="mt-6 pt-6 border-t border-gray-600/30">
        <h4 className="text-white font-medium mb-3">Round Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Current Round:</span>
            <span className="text-white ml-2">{currentRound}</span>
          </div>
          <div>
            <span className="text-gray-400">Total Rounds:</span>
            <span className="text-white ml-2">{totalRounds}</span>
          </div>
          <div>
            <span className="text-gray-400">Current Matchday:</span>
            <span className="text-white ml-2">{swissStage.currentMatchday}</span>
          </div>
          <div>
            <span className="text-gray-400">Status:</span>
            <span className={`ml-2 ${
              swissStage.isComplete ? 'text-green-400' : 'text-blue-400'
            }`}>
              {swissStage.isComplete ? 'Complete' : 'Active'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SwissRoundManagement;


