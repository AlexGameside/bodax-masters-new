import React, { useState } from 'react';
import { CheckCircle, AlertCircle, Trophy } from 'lucide-react';
import type { Match, Team } from '../types/tournament';

interface ScoreSubmissionProps {
  match: Match;
  teams: Team[];
  currentUserTeamId: string;
  onSubmitScore: (team1Score: number, team2Score: number) => Promise<void>;
  isAdmin?: boolean;
}

const ScoreSubmission: React.FC<ScoreSubmissionProps> = ({
  match,
  teams,
  currentUserTeamId,
  onSubmitScore,
  isAdmin = false
}) => {
  const [team1Score, setTeam1Score] = useState('');
  const [team2Score, setTeam2Score] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const team1 = teams.find(t => t.id === match.team1Id);
  const team2 = teams.find(t => t.id === match.team2Id);
  const isTeam1 = currentUserTeamId === match.team1Id;
  const isTeam2 = currentUserTeamId === match.team2Id;

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleScoreSubmit = async () => {
    const score1 = parseInt(team1Score);
    const score2 = parseInt(team2Score);
    
    if (isNaN(score1) || isNaN(score2)) {
      alert('Please enter valid scores');
      return;
    }
    
    setIsLoading(true);
    try {
      await onSubmitScore(score1, score2);
      setTeam1Score('');
      setTeam2Score('');
    } catch (err) {
      console.error('Error submitting score:', err);
      alert('Failed to submit score');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTeamScoreEntry = async (team: 'team1' | 'team2', score: string) => {
    if (team === 'team1') {
      setTeam1Score(score);
    } else {
      setTeam2Score(score);
    }

    // Check if both scores are entered and match
    const score1 = parseInt(team === 'team1' ? score : team1Score);
    const score2 = parseInt(team === 'team2' ? score : team2Score);
    
    if (!isNaN(score1) && !isNaN(score2) && score1 === score2) {
      // Scores match, automatically submit after a small delay
      setTimeout(async () => {
        setIsLoading(true);
        try {
          await onSubmitScore(score1, score2);
          setTeam1Score('');
          setTeam2Score('');
        } catch (err) {
          console.error('Error submitting score:', err);
          alert('Failed to submit score');
        } finally {
          setIsLoading(false);
        }
      }, 1000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-green-900/20 border border-green-500 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-green-400 mb-2">Match in Progress</h3>
        <p className="text-gray-300">The match is currently being played</p>
        {match.selectedMap && (
          <p className="text-white mt-2">Map: {match.selectedMap}</p>
        )}
      </div>

      {/* Score Submission */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h4 className="text-white font-semibold mb-4">Submit Match Result</h4>
        <p className="text-gray-300 text-sm mb-6">
          Both teams must submit matching scores to complete the match
        </p>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Team 1 Score Entry */}
          <div className="bg-blue-900/20 rounded-xl p-6 border border-blue-700">
            <h4 className="text-lg font-semibold text-blue-300 mb-4 text-center">
              {team1?.name || 'Team 1'} Score Entry
            </h4>
            <div className="space-y-4">
              <div className="text-center">
                <label className="block text-sm font-medium text-blue-300 mb-2">Your Score</label>
                <input
                  type="number"
                  value={team1Score}
                  onChange={(e) => handleTeamScoreEntry('team1', e.target.value)}
                  className="w-full px-4 py-3 border border-blue-600 rounded-lg text-center text-2xl font-bold bg-gray-700 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="0"
                  min="0"
                  disabled={isLoading}
                />
              </div>
              <div className="text-center">
                <label className="block text-sm font-medium text-blue-300 mb-2">Opponent Score</label>
                <input
                  type="number"
                  value={team2Score}
                  onChange={(e) => handleTeamScoreEntry('team2', e.target.value)}
                  className="w-full px-4 py-3 border border-blue-600 rounded-lg text-center text-2xl font-bold bg-gray-700 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="0"
                  min="0"
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          {/* Team 2 Score Entry */}
          <div className="bg-red-900/20 rounded-xl p-6 border border-red-700">
            <h4 className="text-lg font-semibold text-red-300 mb-4 text-center">
              {team2?.name || 'Team 2'} Score Entry
            </h4>
            <div className="space-y-4">
              <div className="text-center">
                <label className="block text-sm font-medium text-red-300 mb-2">Your Score</label>
                <input
                  type="number"
                  value={team2Score}
                  onChange={(e) => handleTeamScoreEntry('team2', e.target.value)}
                  className="w-full px-4 py-3 border border-red-600 rounded-lg text-center text-2xl font-bold bg-gray-700 text-white focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
                  placeholder="0"
                  min="0"
                  disabled={isLoading}
                />
              </div>
              <div className="text-center">
                <label className="block text-sm font-medium text-red-300 mb-2">Opponent Score</label>
                <input
                  type="number"
                  value={team1Score}
                  onChange={(e) => handleTeamScoreEntry('team1', e.target.value)}
                  className="w-full px-4 py-3 border border-red-600 rounded-lg text-center text-2xl font-bold bg-gray-700 text-white focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
                  placeholder="0"
                  min="0"
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Score Matching Indicator */}
        {team1Score && team2Score && parseInt(team1Score) === parseInt(team2Score) && (
          <div className="mt-6 text-center">
            <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
              <div className="flex items-center justify-center text-green-300">
                <CheckCircle className="w-6 h-6 mr-2" />
                <span className="font-semibold text-lg">Scores Match! Result will be submitted automatically.</span>
              </div>
            </div>
          </div>
        )}

        {/* Admin Override */}
        {isAdmin && (
          <div className="mt-6 text-center">
            <div className="bg-purple-900/20 border border-purple-700 rounded-lg p-4">
              <h4 className="font-semibold text-purple-300 mb-2">Admin Override</h4>
              <p className="text-purple-300 text-sm mb-4">As an admin, you can manually submit the final score.</p>
              <button
                onClick={handleScoreSubmit}
                disabled={!team1Score || !team2Score || isLoading}
                className="bg-purple-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Submitting...' : 'Submit Final Score'}
              </button>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 text-center">
          <div className="bg-gray-700 border border-gray-600 rounded-lg p-4">
            <h4 className="font-semibold text-white mb-2">How to Submit Scores</h4>
            <p className="text-gray-300 text-sm">
              Both teams should enter their scores. When the scores match, the result will be automatically submitted. 
              {isAdmin && ' Admins can also manually submit scores using the override option above.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScoreSubmission; 