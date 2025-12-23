import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { CheckCircle, XCircle, AlertTriangle, Clock, Zap, RefreshCw } from 'lucide-react';
import { submitMatchResult, createDispute, getPublicUserData, autoDetectAndSubmitMatchResult } from '../services/firebaseService';
// Riot API imports disabled - features hidden from users
// import { suggestMatchOutcome, getTeamStatistics } from '../services/riotApiService';
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
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);
  const [autoDetectedResult, setAutoDetectedResult] = useState<any>(null);
  // Riot API state variables disabled (not used, but kept to avoid breaking anything)
  // const [suggestion, setSuggestion] = useState<any>(null);
  // const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  // const [suggestionConfirmed, setSuggestionConfirmed] = useState(false);
  // const [teamStats, setTeamStats] = useState<any>(null);
  // const [showAnalytics, setShowAnalytics] = useState(false);

  const team1 = teams.find(t => t.id === match.team1Id);
  const team2 = teams.find(t => t.id === match.team2Id);
  const isTeam1 = currentUserTeamId === match.team1Id;
  const isTeam2 = currentUserTeamId === match.team2Id;

  // Check for auto-detected results
  useEffect(() => {
    if (match.autoDetectedResult) {
      setAutoDetectedResult(match.autoDetectedResult);
      // Pre-fill scores if auto-detected
      if (match.autoDetectedResult.team1Score !== undefined && match.autoDetectedResult.team2Score !== undefined) {
        setTeam1Score(match.autoDetectedResult.team1Score.toString());
        setTeam2Score(match.autoDetectedResult.team2Score.toString());
      }
    }
  }, [match.autoDetectedResult]);

  // Auto-detect match result
  const handleAutoDetect = async () => {
    setIsAutoDetecting(true);
    try {
      const result = await autoDetectAndSubmitMatchResult(match.id);
      if (result.success && result.detected) {
        toast.success(`Match detected! Score: ${result.team1Score} - ${result.team2Score}`);
        setAutoDetectedResult({
          detected: true,
          team1Score: result.team1Score,
          team2Score: result.team2Score,
          detectedAt: new Date(),
          confidence: result.matchDetails?.confidence || 'medium'
        });
        setTeam1Score(result.team1Score?.toString() || '');
        setTeam2Score(result.team2Score?.toString() || '');
        // Close modal after successful auto-detection
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        toast.error(result.error || 'No match found. Make sure players have played the match and have Riot IDs set.');
      }
    } catch (error: any) {
      console.error('Error auto-detecting match:', error);
      toast.error(error.message || 'Failed to auto-detect match result');
    } finally {
      setIsAutoDetecting(false);
    }
  };

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

  // Riot API suggestion handler disabled
  // const handleConfirmSuggestion = () => {
  //   // DISABLED
  // };

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
      <div className="bg-[#0a0a0a] border border-gray-800 p-6 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage:
              'linear-gradient(rgba(50, 50, 50, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(50, 50, 50, 0.5) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}
        />
        <div className="relative border-l-4 border-red-600 pl-4">
        <div className="text-center mb-6">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-3xl font-bold text-white font-bodax uppercase tracking-wide mb-2">Score Discrepancy Detected</h3>
          <p className="text-red-400 font-mono uppercase tracking-widest text-sm">Both teams have submitted different scores</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-[#0a0a0a] border border-gray-800">
            <h4 className="text-white font-bold mb-2 text-sm font-mono uppercase tracking-widest">{team1?.name} Submitted:</h4>
            <div className="text-3xl font-bold text-white font-bodax uppercase tracking-wide">
              {match.resultSubmission?.team1SubmittedScore?.team1Score} - {match.resultSubmission?.team1SubmittedScore?.team2Score}
            </div>
          </div>
          <div className="p-4 bg-[#0a0a0a] border border-gray-800">
            <h4 className="text-white font-bold mb-2 text-sm font-mono uppercase tracking-widest">{team2?.name} Submitted:</h4>
            <div className="text-3xl font-bold text-white font-bodax uppercase tracking-wide">
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
              className="flex items-center justify-center px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg font-bold font-mono uppercase tracking-widest transition-colors"
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              Agree with {isTeam1 ? team2?.name : team1?.name}'s Score
            </button>
            
            <button
              onClick={handleDispute}
              disabled={isDisputing}
              className="flex items-center justify-center px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg font-bold font-mono uppercase tracking-widest transition-colors"
            >
              <AlertTriangle className="w-5 h-5 mr-2" />
              Create Dispute
            </button>
          </div>
        </div>
        </div>
      </div>
    );
  }

  // If this team has already submitted, show waiting message
  if (hasSubmitted) {
    return (
      <div className="bg-[#0a0a0a] border border-gray-800 p-6 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage:
              'linear-gradient(rgba(50, 50, 50, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(50, 50, 50, 0.5) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}
        />
        <div className="relative border-l-4 border-blue-600 pl-4">
        <div className="text-center mb-6">
          <CheckCircle className="w-12 h-12 text-blue-500 mx-auto mb-4" />
          <h3 className="text-3xl font-bold text-white font-bodax uppercase tracking-wide mb-2">Results Submitted!</h3>
          <p className="text-blue-400 font-mono uppercase tracking-widest text-sm">Waiting for the other team to submit their results</p>
        </div>

        <div className="p-4 bg-[#0a0a0a] border border-gray-800 mb-6">
          <h4 className="text-white font-bold mb-2 text-sm font-mono uppercase tracking-widest">Your Submitted Score:</h4>
          <div className="text-3xl font-bold text-white font-bodax uppercase tracking-wide">
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
      </div>
    );
  }

  // If other team has submitted, show their score and allow agreement or new submission
  if (otherTeamSubmission) {
    return (
      <div className="bg-[#0a0a0a] border border-gray-800 p-6 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage:
              'linear-gradient(rgba(50, 50, 50, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(50, 50, 50, 0.5) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}
        />
        <div className="relative border-l-4 border-yellow-600 pl-4">
        <div className="text-center mb-6">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-3xl font-bold text-white font-bodax uppercase tracking-wide mb-2">Other Team Has Submitted</h3>
          <p className="text-yellow-400 font-mono uppercase tracking-widest text-sm">Review their score and either agree or submit your own</p>
        </div>

        <div className="p-4 bg-[#0a0a0a] border border-gray-800 mb-6">
          <h4 className="text-white font-bold mb-2 text-sm font-mono uppercase tracking-widest">{isTeam1 ? team2?.name : team1?.name} Submitted:</h4>
          <div className="text-3xl font-bold text-white font-bodax uppercase tracking-wide">
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
                className="flex items-center justify-center px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg font-bold font-mono uppercase tracking-widest transition-colors"
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                Agree
              </button>
              
              <button
                onClick={() => setTeam1Score(otherTeamSubmission.team1Score.toString())}
                disabled={isSubmitting}
                className="flex items-center justify-center px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg font-bold font-mono uppercase tracking-widest transition-colors"
              >
                Submit Different Score
              </button>
            </div>
          </div>

          <div className="border-t border-gray-600 pt-4">
            <h4 className="text-white font-bold mb-3">Or submit your own score:</h4>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-white font-medium mb-2 font-mono uppercase tracking-widest text-sm">{team1?.name}</label>
                <input
                  type="text"
                  value={team1Score}
                  onChange={(e) => handleScoreChange('team1', e.target.value)}
                  className="w-full px-4 py-2 bg-[#0a0a0a] border border-gray-800 text-white text-center text-xl font-bold font-bodax uppercase tracking-wide focus:ring-2 focus:ring-red-500 focus:border-red-600"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-white font-medium mb-2 font-mono uppercase tracking-widest text-sm">{team2?.name}</label>
                <input
                  type="text"
                  value={team2Score}
                  onChange={(e) => handleScoreChange('team2', e.target.value)}
                  className="w-full px-4 py-2 bg-[#0a0a0a] border border-gray-800 text-white text-center text-xl font-bold font-bodax uppercase tracking-wide focus:ring-2 focus:ring-red-500 focus:border-red-600"
                  placeholder="0"
                />
              </div>
            </div>
            
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !team1Score || !team2Score}
              className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg font-bold font-mono uppercase tracking-widest transition-colors"
            >
              Submit Different Score
            </button>
          </div>
        </div>
        </div>
      </div>
    );
  }

  // Default submission form
  return (
    <div className="bg-[#0a0a0a] border border-gray-800 p-6 relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            'linear-gradient(rgba(50, 50, 50, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(50, 50, 50, 0.5) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />
      <div className="relative border-l-4 border-green-600 pl-4">
        {/* Auto-Detection Section */}
        {(autoDetectedResult || match.autoDetectedResult) && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-green-400" />
              <h4 className="text-green-400 font-bold font-mono uppercase tracking-widest text-sm">Auto-Detected Match</h4>
            </div>
            <div className="text-white font-mono text-sm">
              Score: <span className="font-bold text-lg">{autoDetectedResult?.team1Score || match.autoDetectedResult?.team1Score} - {autoDetectedResult?.team2Score || match.autoDetectedResult?.team2Score}</span>
              {autoDetectedResult?.confidence && (
                <span className="ml-2 text-green-300">({autoDetectedResult.confidence} confidence)</span>
              )}
            </div>
          </div>
        )}
        
        {/* Auto-Detect Button */}
        <div className="mb-6">
          <button
            onClick={handleAutoDetect}
            disabled={isAutoDetecting}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-lg font-bold font-mono uppercase tracking-widest transition-all"
          >
            {isAutoDetecting ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Detecting Match...
              </>
            ) : (
              <>
                <Zap className="w-5 h-5" />
                Auto-Detect Match Result
              </>
            )}
          </button>
          <p className="text-gray-400 text-xs font-mono mt-2 text-center">
            Automatically detect match result from Riot API (requires players to have Riot IDs set)
          </p>
        </div>
        
        <div className="text-center mb-6">
          <h3 className="text-3xl font-bold text-white font-bodax uppercase tracking-wide mb-2">Submit Match Results</h3>
          <p className="text-gray-400 font-mono uppercase tracking-widest text-sm">Enter the final score for both teams</p>
        </div>
      <div className="text-center mb-6">
        <h3 className="text-3xl font-bold text-white font-bodax uppercase tracking-wide mb-2">Submit Match Results</h3>
        <p className="text-green-400 font-mono uppercase tracking-widest text-sm">Enter the final score for this match</p>
      </div>

      {/* Riot API features DISABLED - all suggestion and analytics UI removed */}

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-white font-medium mb-2 font-mono uppercase tracking-widest text-sm">{team1?.name}</label>
          <input
            type="text"
            value={team1Score}
            onChange={(e) => handleScoreChange('team1', e.target.value)}
            className="w-full px-4 py-2 bg-[#0a0a0a] border border-gray-800 text-white text-center text-xl font-bold font-bodax uppercase tracking-wide focus:ring-2 focus:ring-red-500 focus:border-red-600"
            placeholder="0"
          />
        </div>
        <div>
          <label className="block text-white font-medium mb-2 font-mono uppercase tracking-widest text-sm">{team2?.name}</label>
          <input
            type="text"
            value={team2Score}
            onChange={(e) => handleScoreChange('team2', e.target.value)}
            className="w-full px-4 py-2 bg-[#0a0a0a] border border-gray-800 text-white text-center text-xl font-bold font-bodax uppercase tracking-wide focus:ring-2 focus:ring-red-500 focus:border-red-600"
            placeholder="0"
          />
        </div>
      </div>

      <div className="text-center">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !team1Score || !team2Score}
          className="px-8 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg font-bold font-mono uppercase tracking-widest transition-colors"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Results'}
        </button>
      </div>

      <div className="mt-4 text-center text-xs text-gray-500 font-mono uppercase tracking-widest">
        <p>Both teams must submit and agree on the results</p>
        <p>If scores don't match, a dispute will be created for admin review</p>
      </div>
      </div>
    </div>
  );
};

export default TwoTeamResultSubmission;
