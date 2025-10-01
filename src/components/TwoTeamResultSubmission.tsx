import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react';
import { submitMatchResult, createDispute } from '../services/firebaseService';
import type { Match, Team } from '../types/tournament';

interface TwoTeamResultSubmissionProps {
  match: Match;
  teams: Team[];
  currentUserTeamId?: string;
  onClose: () => void;
}

const TwoTeamResultSubmission: React.FC<TwoTeamResultSubmissionProps> = ({
  match,
  teams,
  currentUserTeamId,
  onClose
}) => {
  const [team1Score, setTeam1Score] = useState<string>('');
  const [team2Score, setTeam2Score] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDisputing, setIsDisputing] = useState(false);

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

  // Get the other team's submission
  const otherTeamSubmission = isTeam1 
    ? match.resultSubmission?.team2SubmittedScore 
    : isTeam2 
    ? match.resultSubmission?.team1SubmittedScore 
    : null;

  const handleScoreChange = (team: 'team1' | 'team2', value: string) => {
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
    } catch (error) {

      toast.error('Failed to submit results. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAgree = async () => {
    if (!otherTeamSubmission) return;
    
    setIsSubmitting(true);
    try {
      await submitMatchResult(
        match.id, 
        currentUserTeamId!, 
        otherTeamSubmission.team1Score, 
        otherTeamSubmission.team2Score
      );
      toast.success('Results agreed and match completed!');
      
      // Clear the input fields after successful agreement
      setTeam1Score('');
      setTeam2Score('');
      onClose();
    } catch (error) {

      toast.error('Failed to agree to results. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDispute = async () => {
    if (!currentUserTeamId) return;
    
    setIsDisputing(true);
    try {
      await createDispute(match.id, currentUserTeamId);
      toast.success('Dispute created successfully. An admin will review this match.');
      onClose();
    } catch (error) {

      toast.error('Failed to create dispute. Please try again.');
    } finally {
      setIsDisputing(false);
    }
  };

  // If both teams have submitted and scores don't match, show dispute interface
  const bothTeamsSubmitted = match.resultSubmission?.team1Submitted && match.resultSubmission?.team2Submitted;
  const scoresMatch = bothTeamsSubmitted && 
    match.resultSubmission?.team1SubmittedScore?.team1Score === match.resultSubmission?.team2SubmittedScore?.team1Score &&
    match.resultSubmission?.team1SubmittedScore?.team2Score === match.resultSubmission?.team2SubmittedScore?.team2Score;

  if (bothTeamsSubmitted && !scoresMatch) {
    return (
      <div className="bg-gradient-to-br from-red-500/10 via-orange-600/10 to-red-700/10 backdrop-blur-sm rounded-2xl p-6 border border-red-400/30 shadow-2xl">
        <div className="text-center mb-6">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-white mb-2">Score Discrepancy Detected</h3>
          <p className="text-red-200">Both teams have submitted different scores</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-600/30">
            <h4 className="text-white font-bold mb-2">{team1?.name} Submitted:</h4>
            <div className="text-2xl font-bold text-white">
              {match.resultSubmission?.team1SubmittedScore?.team1Score} - {match.resultSubmission?.team1SubmittedScore?.team2Score}
            </div>
          </div>
          <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-600/30">
            <h4 className="text-white font-bold mb-2">{team2?.name} Submitted:</h4>
            <div className="text-2xl font-bold text-white">
              {match.resultSubmission?.team2SubmittedScore?.team1Score} - {match.resultSubmission?.team2SubmittedScore?.team2Score}
            </div>
          </div>
        </div>

        <div className="text-center space-y-3">
          <p className="text-gray-300 mb-4">
            Please review the scores and either agree with one of the submissions or create a dispute for admin review.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleAgree}
              disabled={isSubmitting}
              className="flex items-center justify-center px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg font-bold transition-colors"
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              Agree with {isTeam1 ? team2?.name : team1?.name}'s Score
            </button>
            
            <button
              onClick={handleDispute}
              disabled={isDisputing}
              className="flex items-center justify-center px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg font-bold transition-colors"
            >
              <AlertTriangle className="w-5 h-5 mr-2" />
              Create Dispute
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If this team has already submitted, show waiting message
  if (hasSubmitted) {
    return (
      <div className="bg-gradient-to-br from-blue-500/10 via-cyan-600/10 to-blue-700/10 backdrop-blur-sm rounded-2xl p-6 border border-blue-400/30 shadow-2xl">
        <div className="text-center mb-6">
          <CheckCircle className="w-12 h-12 text-blue-400 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-white mb-2">Results Submitted!</h3>
          <p className="text-blue-200">Waiting for the other team to submit their results</p>
        </div>

        <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-600/30 mb-6">
          <h4 className="text-white font-bold mb-2">Your Submitted Score:</h4>
          <div className="text-2xl font-bold text-white">
            {match.resultSubmission?.team1SubmittedScore?.team1Score || match.resultSubmission?.team2SubmittedScore?.team1Score} - {match.resultSubmission?.team1SubmittedScore?.team2Score || match.resultSubmission?.team2SubmittedScore?.team2Score}
          </div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center text-blue-300">
            <Clock className="w-5 h-5 mr-2 animate-pulse" />
            Waiting for {isTeam1 ? team2?.name : team1?.name} to submit...
          </div>
        </div>
      </div>
    );
  }

  // If other team has submitted, show their score and allow agreement or new submission
  if (otherTeamSubmission) {
    return (
      <div className="bg-gradient-to-br from-yellow-500/10 via-orange-600/10 to-yellow-700/10 backdrop-blur-sm rounded-2xl p-6 border border-yellow-400/30 shadow-2xl">
        <div className="text-center mb-6">
          <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-white mb-2">Other Team Has Submitted</h3>
          <p className="text-yellow-200">Review their score and either agree or submit your own</p>
        </div>

        <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-600/30 mb-6">
          <h4 className="text-white font-bold mb-2">{isTeam1 ? team2?.name : team1?.name} Submitted:</h4>
          <div className="text-2xl font-bold text-white">
            {otherTeamSubmission.team1Score} - {otherTeamSubmission.team2Score}
          </div>
        </div>

        <div className="space-y-4">
          <div className="text-center">
            <p className="text-gray-300 mb-4">Do you agree with this score?</p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
              <button
                onClick={handleAgree}
                disabled={isSubmitting}
                className="flex items-center justify-center px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg font-bold transition-colors"
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                Agree
              </button>
              
              <button
                onClick={() => setTeam1Score(otherTeamSubmission.team1Score.toString())}
                disabled={isSubmitting}
                className="flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg font-bold transition-colors"
              >
                Submit Different Score
              </button>
            </div>
          </div>

          <div className="border-t border-gray-600 pt-4">
            <h4 className="text-white font-bold mb-3">Or submit your own score:</h4>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-white font-medium mb-2">{team1?.name}</label>
                <input
                  type="text"
                  value={team1Score}
                  onChange={(e) => handleScoreChange('team1', e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-center text-xl font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-white font-medium mb-2">{team2?.name}</label>
                <input
                  type="text"
                  value={team2Score}
                  onChange={(e) => handleScoreChange('team2', e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-center text-xl font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0"
                />
              </div>
            </div>
            
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !team1Score || !team2Score}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg font-bold transition-colors"
            >
              Submit Different Score
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Default submission form
  return (
    <div className="bg-gradient-to-br from-green-500/10 via-emerald-600/10 to-green-700/10 backdrop-blur-sm rounded-2xl p-6 border border-green-400/30 shadow-2xl">
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-white mb-2">Submit Match Results</h3>
        <p className="text-green-200">Enter the final score for this match</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-white font-medium mb-2">{team1?.name}</label>
          <input
            type="text"
            value={team1Score}
            onChange={(e) => handleScoreChange('team1', e.target.value)}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-center text-xl font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="0"
          />
        </div>
        <div>
          <label className="block text-white font-medium mb-2">{team2?.name}</label>
          <input
            type="text"
            value={team2Score}
            onChange={(e) => handleScoreChange('team2', e.target.value)}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-center text-xl font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="0"
          />
        </div>
      </div>

      <div className="text-center">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !team1Score || !team2Score}
          className="px-8 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg font-bold transition-colors"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Results'}
        </button>
      </div>

      <div className="mt-4 text-center text-sm text-gray-400">
        <p>Both teams must submit and agree on the results</p>
        <p>If scores don't match, a dispute will be created for admin review</p>
      </div>
    </div>
  );
};

export default TwoTeamResultSubmission;
