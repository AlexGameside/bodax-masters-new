import React, { useState } from 'react';
import type { Match, Team } from '../types/tournament';
import { submitMatchResult, submitMatchResultAdminOverride } from '../services/firebaseService';
import { toast } from 'react-hot-toast';
import { X, Trophy, CheckCircle, AlertCircle } from 'lucide-react';

interface ResultSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match;
  teams: Team[];
  currentUserTeamId?: string;
  isAdmin?: boolean;
}

const ResultSubmissionModal: React.FC<ResultSubmissionModalProps> = ({
  isOpen,
  onClose,
  match,
  teams,
  currentUserTeamId,
  isAdmin = false
}) => {
  const [team1Score, setTeam1Score] = useState<string>('');
  const [team2Score, setTeam2Score] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const team1 = teams.find(t => t.id === match.team1Id);
  const team2 = teams.find(t => t.id === match.team2Id);
  const isTeam1 = currentUserTeamId === match.team1Id;
  const isTeam2 = currentUserTeamId === match.team2Id;

  // Check if this team has already submitted
  const hasSubmitted = isTeam1 
    ? match.resultSubmission?.team1Submitted 
    : isTeam2 
    ? match.resultSubmission?.team2Submitted 
    : false;

  const handleScoreChange = (team: 'team1' | 'team2', value: string) => {
    // Only allow numbers, but no upper limit
    const numericValue = value.replace(/[^0-9]/g, '');
    
    if (team === 'team1') {
      setTeam1Score(numericValue);
    } else {
      setTeam2Score(numericValue);
    }
  };

  const handleSubmit = async () => {
    if (!currentUserTeamId) {
      toast.error('You must be part of a team to submit results');
      return;
    }

    const score1 = parseInt(team1Score);
    const score2 = parseInt(team2Score);

    if (isNaN(score1) || isNaN(score2)) {
      toast.error('Please enter valid scores');
      return;
    }

    if (score1 < 0 || score2 < 0) {
      toast.error('Scores cannot be negative');
      return;
    }

    if (score1 === 0 && score2 === 0) {
      toast.error('At least one team must have scored');
      return;
    }

    setIsSubmitting(true);
    try {
      await submitMatchResult(match.id, currentUserTeamId, score1, score2);
      toast.success('Results submitted successfully!');
      onClose();
    } catch (error) {
      console.error('Error submitting results:', error);
      toast.error('Failed to submit results. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdminOverride = async () => {
    if (!isAdmin) {
      toast.error('Only admins can force confirm results');
      return;
    }

    const score1 = parseInt(team1Score);
    const score2 = parseInt(team2Score);

    if (isNaN(score1) || isNaN(score2)) {
      toast.error('Please enter valid scores');
      return;
    }

    if (score1 < 0 || score2 < 0) {
      toast.error('Scores cannot be negative');
      return;
    }

    if (score1 === 0 && score2 === 0) {
      toast.error('At least one team must have scored');
      return;
    }

    setIsSubmitting(true);
    try {
      // Use admin override function
      await submitMatchResultAdminOverride(match.id, score1, score2);
      toast.success('Results force confirmed by admin!');
      onClose();
    } catch (error) {
      console.error('Error force confirming results:', error);
      toast.error('Failed to force confirm results. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <h3 className="text-lg font-semibold text-white">Submit Match Results</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Match Info */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Team 1</span>
              <span className="text-sm text-gray-400">Team 2</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-white">{team1?.name || 'Team 1'}</span>
              <span className="text-gray-400">vs</span>
              <span className="font-medium text-white">{team2?.name || 'Team 2'}</span>
            </div>
          </div>

          {/* Score Input */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-300">{team1?.name || 'Team 1'} Score:</label>
              <input
                type="text"
                inputMode="numeric"
                value={team1Score}
                onChange={(e) => handleScoreChange('team1', e.target.value)}
                className="w-20 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-center focus:outline-none focus:border-blue-500"
                placeholder="0"
                disabled={hasSubmitted || isSubmitting}
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-300">{team2?.name || 'Team 2'} Score:</label>
              <input
                type="text"
                inputMode="numeric"
                value={team2Score}
                onChange={(e) => handleScoreChange('team2', e.target.value)}
                className="w-20 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-center focus:outline-none focus:border-blue-500"
                placeholder="0"
                disabled={hasSubmitted || isSubmitting}
              />
            </div>
          </div>

          {/* Submission Status */}
          {hasSubmitted && (
            <div className="mt-4 p-3 bg-green-900 border border-green-700 rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span className="text-sm text-green-300">Results already submitted</span>
              </div>
            </div>
          )}

          {/* Other Team Status */}
          {!hasSubmitted && (
            <div className="mt-4 p-3 bg-blue-900 border border-blue-700 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-blue-400" />
                <span className="text-sm text-blue-300">
                  {match.resultSubmission?.team1Submitted || match.resultSubmission?.team2Submitted
                    ? 'Waiting for other team to submit results'
                    : 'Both teams need to submit matching results'}
                </span>
              </div>
            </div>
          )}

          {/* Admin Override Section */}
          {isAdmin && (
            <div className="mt-4 p-3 bg-purple-900 border border-purple-700 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <AlertCircle className="h-4 w-4 text-purple-400" />
                <span className="text-sm text-purple-300 font-medium">Admin Override</span>
              </div>
              <div className="text-xs text-purple-200 mb-3">
                As an admin, you can force confirm results without waiting for both teams.
              </div>
              <button
                onClick={handleAdminOverride}
                disabled={isSubmitting || !team1Score || !team2Score || (parseInt(team1Score) === 0 && parseInt(team2Score) === 0)}
                className="w-full px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {isSubmitting ? 'Processing...' : 'Force Confirm Results (Admin)'}
              </button>
            </div>
          )}

          {/* Confirmation Status */}
          {match.resultSubmission && (
            <div className="mt-4 p-3 bg-gray-700 border border-gray-600 rounded-lg">
              <h4 className="text-white font-medium mb-2 text-sm">Confirmation Status:</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-300">{team1?.name || 'Team 1'}:</span>
                  <span className={match.resultSubmission.team1Submitted ? 'text-green-400' : 'text-red-400'}>
                    {match.resultSubmission.team1Submitted ? '✅ Confirmed' : '❌ Not Confirmed'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">{team2?.name || 'Team 2'}:</span>
                  <span className={match.resultSubmission.team2Submitted ? 'text-green-400' : 'text-red-400'}>
                    {match.resultSubmission.team2Submitted ? '✅ Confirmed' : '❌ Not Confirmed'}
                  </span>
                </div>
                {match.resultSubmission.team1Submitted && match.resultSubmission.team2Submitted && (
                  <div className="text-center pt-2 border-t border-gray-600">
                    <span className="text-green-400 font-medium">🎉 Both teams confirmed! Results will be processed.</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex space-x-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            {!hasSubmitted && (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !team1Score || !team2Score || (parseInt(team1Score) === 0 && parseInt(team2Score) === 0)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Results'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultSubmissionModal; 