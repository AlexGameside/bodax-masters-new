import React, { useState } from 'react';
import type { Match, Team } from '../types/tournament';
import { submitMatchResult, submitMatchResultAdminOverride } from '../services/firebaseService';
import { toast } from 'react-hot-toast';
import { X, Trophy, CheckCircle, AlertCircle } from 'lucide-react';
import { BodaxModal } from './ui';

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
      
      // Clear the input fields after successful submission
      setTeam1Score('');
      setTeam2Score('');
      onClose();
    } catch (error) {

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

      toast.error('Failed to force confirm results. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <BodaxModal
      isOpen={isOpen}
      onClose={onClose}
      title="Submit Results"
      subtitle="Both teams must submit matching scores"
      maxWidthClassName="max-w-md"
      footer={
        <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-5 py-3 border border-gray-700 text-gray-300 hover:text-white hover:border-gray-500 font-bodax text-xl uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          {!hasSubmitted && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !team1Score || !team2Score || (parseInt(team1Score) === 0 && parseInt(team2Score) === 0)}
              className="px-5 py-3 bg-red-600 hover:bg-red-700 text-white border border-red-800 font-bodax text-xl uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          )}
        </div>
      }
    >
          {/* Match Info */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 font-mono uppercase tracking-widest">Team 1</span>
              <span className="text-xs text-gray-500 font-mono uppercase tracking-widest">Team 2</span>
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
              <label className="text-xs text-gray-400 font-mono uppercase tracking-widest">{team1?.name || 'Team 1'} Score</label>
              <input
                type="text"
                inputMode="numeric"
                value={team1Score}
                onChange={(e) => handleScoreChange('team1', e.target.value)}
                className="w-24 px-3 py-2 bg-black/40 border border-gray-800 text-white text-center focus:outline-none focus:border-red-600 font-mono"
                placeholder="0"
                disabled={hasSubmitted || isSubmitting}
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-400 font-mono uppercase tracking-widest">{team2?.name || 'Team 2'} Score</label>
              <input
                type="text"
                inputMode="numeric"
                value={team2Score}
                onChange={(e) => handleScoreChange('team2', e.target.value)}
                className="w-24 px-3 py-2 bg-black/40 border border-gray-800 text-white text-center focus:outline-none focus:border-red-600 font-mono"
                placeholder="0"
                disabled={hasSubmitted || isSubmitting}
              />
            </div>
          </div>

          {/* Submission Status */}
          {hasSubmitted && (
            <div className="mt-4 p-4 bg-green-900/10 border border-green-900">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span className="text-sm text-green-300 font-mono uppercase tracking-widest">Results already submitted</span>
              </div>
            </div>
          )}

          {/* Other Team Status */}
          {!hasSubmitted && (
            <div className="mt-4 p-4 bg-black/30 border border-gray-800">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm text-gray-300 font-mono uppercase tracking-widest">
                  {match.resultSubmission?.team1Submitted || match.resultSubmission?.team2Submitted
                    ? 'Waiting for other team to submit results'
                    : 'Both teams need to submit matching results'}
                </span>
              </div>
            </div>
          )}

          {/* Admin Override Section */}
          {isAdmin && (
            <div className="mt-4 p-4 bg-red-900/10 border border-red-900/50">
              <div className="flex items-center space-x-2 mb-2">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <span className="text-sm text-red-300 font-medium font-mono uppercase tracking-widest">Admin Override</span>
              </div>
              <div className="text-xs text-gray-400 mb-3 font-mono">
                As an admin, you can force confirm results without waiting for both teams.
              </div>
              <button
                onClick={handleAdminOverride}
                disabled={isSubmitting || !team1Score || !team2Score || (parseInt(team1Score) === 0 && parseInt(team2Score) === 0)}
                className="w-full px-4 py-3 bg-gray-900 hover:bg-gray-800 text-white border border-gray-700 font-mono uppercase tracking-widest transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {isSubmitting ? 'Processing...' : 'Force Confirm Results (Admin)'}
              </button>
            </div>
          )}

          {/* Confirmation Status */}
          {match.resultSubmission && (
            <div className="mt-4 p-4 bg-black/30 border border-gray-800">
              <h4 className="text-white font-medium mb-3 text-sm font-mono uppercase tracking-widest">Confirmation Status</h4>
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
    </BodaxModal>
  );
};

export default ResultSubmissionModal; 