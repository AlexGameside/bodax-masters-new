import React, { useState } from 'react';
import type { Match, Team } from '../types/tournament';
import ResultSubmissionModal from './ResultSubmissionModal';
import { toast } from 'react-hot-toast';
import { Gamepad2, Trophy, Target, Flag, Play, AlertTriangle, HelpCircle, Shield, RotateCcw, CheckCircle, X } from 'lucide-react';
import { createDispute, resolveDispute, forceSubmitResults, updateMatchState } from '../services/firebaseService';
import { useAuth } from '../hooks/useAuth';

interface MatchInProgressProps {
  match: Match;
  teams: Team[];
  currentUserTeamId?: string;
}

const MatchInProgress: React.FC<MatchInProgressProps> = ({ match, teams, currentUserTeamId }) => {
  const { currentUser } = useAuth();
  const [showResultModal, setShowResultModal] = useState(false);
  const [showHelpConfirmation, setShowHelpConfirmation] = useState(false);
  const [isCreatingDispute, setIsCreatingDispute] = useState(false);
  const [isResolvingDispute, setIsResolvingDispute] = useState(false);
  const [isReturningToPlaying, setIsReturningToPlaying] = useState(false);

  const team1 = teams.find(t => t.id === match.team1Id);
  const team2 = teams.find(t => t.id === match.team2Id);
  const currentUserTeam = teams.find(t => t.id === currentUserTeamId);
  
  const isAdmin = currentUser?.isAdmin;
  const isInDispute = match.matchState === 'disputed';
  const hasSubmitted = currentUserTeamId && match.resultSubmission && 
    ((currentUserTeamId === match.team1Id && match.resultSubmission.team1Submitted) ||
     (currentUserTeamId === match.team2Id && match.resultSubmission.team2Submitted));

  const handleCreateDispute = async () => {
    if (!currentUserTeamId) return;
    
    setIsCreatingDispute(true);
    try {
      await createDispute(match.id, currentUserTeamId);
      toast.success('Dispute created successfully. An admin will review this match.');
      setShowHelpConfirmation(false);
    } catch (error) {
      toast.error('Failed to create dispute. Please try again.');
    } finally {
      setIsCreatingDispute(false);
    }
  };

  const handleReturnToPlaying = async () => {
    setIsReturningToPlaying(true);
    try {
      await updateMatchState(match.id, { matchState: 'playing' });
      toast.success('Match returned to playing state.');
    } catch (error) {
      toast.error('Failed to return match to playing state. Please try again.');
    } finally {
      setIsReturningToPlaying(false);
    }
  };

  const handleResetMatch = async () => {
    setIsResolvingDispute(true);
    try {
      await resolveDispute(match.id, 'reset');
      toast.success('Match reset to playing state.');
    } catch (error) {
      toast.error('Failed to reset match. Please try again.');
    } finally {
      setIsResolvingDispute(false);
    }
  };

  const handleForceSubmitResults = async (team1Score: number, team2Score: number) => {
    setIsResolvingDispute(true);
    try {
      const winnerId = team1Score > team2Score ? match.team1Id : match.team2Id;
      if (winnerId) {
        await forceSubmitResults(match.id, team1Score, team2Score, winnerId);
        toast.success('Results force submitted successfully.');
      } else {
        toast.error('Unable to determine winner. Please check team IDs.');
      }
    } catch (error) {
      toast.error('Failed to force submit results. Please try again.');
    } finally {
      setIsResolvingDispute(false);
    }
  };

  if (isInDispute) {
    return (
      <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="bg-red-500 p-2 rounded-lg">
            <AlertTriangle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Match in Dispute</h3>
            <p className="text-red-300">This match requires admin attention</p>
          </div>
        </div>

        {isAdmin ? (
          <div className="space-y-4">
            <div className="bg-gray-800/50 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-white mb-2">Admin Actions</h4>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleResetMatch}
                  disabled={isResolvingDispute}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset to Playing</span>
                </button>
                
                <button
                  onClick={() => setShowResultModal(true)}
                  disabled={isResolvingDispute}
                  className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Force Submit Results</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <Shield className="w-5 h-5 text-blue-400" />
              <p className="text-gray-300">
                This match is under review by an administrator. Please wait for resolution.
              </p>
            </div>
            {/* Return to Playing Button for non-admin users */}
            <div className="mt-4 pt-4 border-t border-gray-700/50">
              <button
                onClick={handleReturnToPlaying}
                disabled={isReturningToPlaying}
                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Play className="w-4 h-4" />
                <span>{isReturningToPlaying ? 'Returning...' : 'No Longer Need Help'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Force Submit Results Modal for Admin */}
        {isAdmin && showResultModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-xl font-bold text-white mb-4">Force Submit Results</h3>
              <ForceSubmitForm
                match={match}
                teams={teams}
                onSubmit={handleForceSubmitResults}
                onCancel={() => setShowResultModal(false)}
                isSubmitting={isResolvingDispute}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Match Status */}
      <div className="bg-gray-800/50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-green-500 p-2 rounded-lg">
              <Play className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Match in Progress</h3>
              <p className="text-gray-300">Submit your results when the match is complete</p>
            </div>
          </div>
          {/* Need Help Button */}
          <button
            onClick={() => setShowHelpConfirmation(true)}
            disabled={isCreatingDispute}
            className="flex items-center space-x-2 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-800 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
            <span>{isCreatingDispute ? 'Creating...' : 'Need Help?'}</span>
          </button>
        </div>

        {/* Sides Display - Integrated */}
        {match.team1Side && match.team2Side && (
            <div className="mt-4 pt-4 border-t border-gray-700/50 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-700/40 p-3 rounded-lg">
                    <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-300">{team1?.name}</span>
                        <span className={`font-bold px-2 py-1 rounded-md text-xs ${match.team1Side === 'attack' ? 'bg-orange-500/20 text-orange-300' : 'bg-blue-500/20 text-blue-300'}`}>
                            {match.team1Side === 'attack' ? '⚔️ ATTACK' : '🛡️ DEFENSE'}
                        </span>
                    </div>
                </div>
                <div className="bg-gray-700/40 p-3 rounded-lg">
                    <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-300">{team2?.name}</span>
                        <span className={`font-bold px-2 py-1 rounded-md text-xs ${match.team2Side === 'attack' ? 'bg-orange-500/20 text-orange-300' : 'bg-blue-500/20 text-blue-300'}`}>
                            {match.team2Side === 'attack' ? '⚔️ ATTACK' : '🛡️ DEFENSE'}
                        </span>
                    </div>
                </div>
            </div>
        )}
      </div>

      {/* Help Confirmation Modal */}
      {showHelpConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Confirm Help Request</h3>
              <button
                onClick={() => setShowHelpConfirmation(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="mb-6">
              <div className="flex items-center space-x-3 mb-3">
                <div className="bg-orange-500 p-2 rounded-lg">
                  <HelpCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-medium">Request Admin Assistance</p>
                  <p className="text-gray-300 text-sm">This will pause your match and notify an administrator.</p>
                </div>
              </div>
              <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-3">
                <p className="text-orange-200 text-sm">
                  <strong>Note:</strong> Only use this if you're experiencing technical issues, rule violations, or other problems that require admin intervention.
                </p>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowHelpConfirmation(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateDispute}
                disabled={isCreatingDispute}
                className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-800 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {isCreatingDispute ? 'Creating...' : 'Request Help'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result Submission */}
      {hasSubmitted ? (
        <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-green-300 font-medium">Results Submitted ✓</span>
          </div>
          <p className="text-green-200 text-sm mt-1">
            Waiting for the other team to submit their results...
          </p>
        </div>
      ) : (
        <button
          onClick={() => setShowResultModal(true)}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-3 px-6 rounded-lg font-semibold transition-all transform hover:scale-105"
        >
          Submit Results
        </button>
      )}

      {/* Result Submission Modal */}
      {showResultModal && (
        <ResultSubmissionModal
          isOpen={showResultModal}
          onClose={() => setShowResultModal(false)}
          match={match}
          teams={teams}
          currentUserTeamId={currentUserTeamId}
        />
      )}
    </div>
  );
};

// Force Submit Form Component
interface ForceSubmitFormProps {
  match: Match;
  teams: Team[];
  onSubmit: (team1Score: number, team2Score: number) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

const ForceSubmitForm: React.FC<ForceSubmitFormProps> = ({
  match,
  teams,
  onSubmit,
  onCancel,
  isSubmitting
}) => {
  const [team1Score, setTeam1Score] = useState<string>('');
  const [team2Score, setTeam2Score] = useState<string>('');

  const team1 = teams.find(t => t.id === match.team1Id);
  const team2 = teams.find(t => t.id === match.team2Id);

  const handleScoreChange = (value: string, setter: (value: string) => void) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    setter(numericValue);
  };

  const handleSubmit = () => {
    const score1 = parseInt(team1Score);
    const score2 = parseInt(team2Score);
    
    if (isNaN(score1) || isNaN(score2)) {
      toast.error('Please enter valid scores');
      return;
    }
    
    if (score1 === score2) {
      toast.error('Scores cannot be equal');
      return;
    }
    
    onSubmit(score1, score2);
  };

  const isSubmitDisabled = !team1Score || !team2Score || team1Score === team2Score || isSubmitting;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {team1?.name} Score
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={team1Score}
            onChange={(e) => handleScoreChange(e.target.value, setTeam1Score)}
            placeholder="0"
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {team2?.name} Score
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={team2Score}
            onChange={(e) => handleScoreChange(e.target.value, setTeam2Score)}
            placeholder="0"
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      
      <div className="flex space-x-3">
        <button
          onClick={handleSubmit}
          disabled={isSubmitDisabled}
          className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white py-2 px-4 rounded-lg transition-colors"
        >
          {isSubmitting ? 'Submitting...' : 'Force Submit'}
        </button>
        <button
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 text-white py-2 px-4 rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default MatchInProgress; 