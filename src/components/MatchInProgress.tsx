import React, { useState, useEffect } from 'react';
import type { Match, Team } from '../types/tournament';

import { toast } from 'react-hot-toast';
import { Gamepad2, Trophy, Target, Flag, Play, AlertTriangle, HelpCircle, Shield, RotateCcw, CheckCircle, X, MapPin, Zap, RefreshCw } from 'lucide-react';
import { createDispute, resolveDispute, forceSubmitResults, updateMatchState, submitMatchResult, autoDetectAndSubmitMatchResult } from '../services/firebaseService';
import { useAuth } from '../hooks/useAuth';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import MapResultSubmission from './MapResultSubmission';
import TwoTeamResultSubmission from './TwoTeamResultSubmission';
import PostMatchAnalytics from './PostMatchAnalytics';

// Security: Sanitize user input to prevent XSS
const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

// Security: Validate and sanitize team names
const sanitizeTeamName = (name: string | undefined): string => {
  if (!name || typeof name !== 'string') return 'Unknown Team';
  const sanitized = sanitizeInput(name.trim());
  return sanitized.length > 0 ? sanitized : 'Unknown Team';
};

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
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);
  const [localMatch, setLocalMatch] = useState(match);

  const team1 = teams.find(t => t.id === match.team1Id);
  const team2 = teams.find(t => t.id === match.team2Id);
  const currentUserTeam = teams.find(t => t.id === currentUserTeamId);
  
  // Security: Sanitize team names to prevent XSS
  const sanitizedTeam1Name = sanitizeTeamName(team1?.name);
  const sanitizedTeam2Name = sanitizeTeamName(team2?.name);
  
  const isAdmin = currentUser?.isAdmin;
  const isInDispute = localMatch.matchState === 'disputed';

  // Real-time match updates to fix the refresh issue
  useEffect(() => {
    if (!match?.id) return;

    const matchRef = doc(db, 'matches', match.id);
    const unsubscribe = onSnapshot(matchRef, (docSnap) => {
      if (docSnap.exists()) {
        const updatedMatch = { ...docSnap.data(), id: docSnap.id } as Match;
        setLocalMatch(updatedMatch);
      }
    });

    return () => unsubscribe();
  }, [match?.id]);

  // Use localMatch for all calculations instead of the prop
  const currentMatch = localMatch || match;

  // Determine if this is a BO3 match
  const isBO3Match = currentMatch.matchFormat === 'BO3' || currentMatch.bracketType === 'grand_final';
  const isBO1Match = !isBO3Match;

  // Calculate BO3 match status
  const getBO3Status = () => {
    const mapResults = currentMatch.mapResults || {};
    let team1Wins = 0;
    let team2Wins = 0;
    
    if (mapResults.map1?.winner === currentMatch.team1Id) team1Wins++;
    if (mapResults.map1?.winner === currentMatch.team2Id) team2Wins++;
    if (mapResults.map2?.winner === currentMatch.team1Id) team1Wins++;
    if (mapResults.map2?.winner === currentMatch.team2Id) team2Wins++;
    if (mapResults.map3?.winner === currentMatch.team1Id) team1Wins++;
    if (mapResults.map3?.winner === currentMatch.team2Id) team2Wins++;
    
    const isComplete = team1Wins >= 2 || team2Wins >= 2;
    const winnerId = team1Wins >= 2 ? currentMatch.team1Id : team2Wins >= 2 ? currentMatch.team2Id : null;
    
    return {
      team1Wins,
      team2Wins,
      isComplete,
      winnerId,
      currentMapNumber: team1Wins + team2Wins + 1
    };
  };

  const bo3Status = getBO3Status();

  const handleCreateDispute = async () => {
    if (!currentUserTeamId) return;
    
    setIsCreatingDispute(true);
    try {
      await createDispute(currentMatch.id, currentUserTeamId);
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
      await updateMatchState(currentMatch.id, { matchState: 'playing' });
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
      await resolveDispute(currentMatch.id, 'reset');
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
      const winnerId = team1Score > team2Score ? currentMatch.team1Id : currentMatch.team2Id;
      if (winnerId) {
        await forceSubmitResults(currentMatch.id, team1Score, team2Score, winnerId);
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

  const handleAutoDetectMatch = async () => {
    if (!isAdmin) return;
    
    setIsAutoDetecting(true);
    try {
      const result = await autoDetectAndSubmitMatchResult(currentMatch.id);
      if (result.success && result.detected) {
        toast.success(`Match detected! Score: ${result.team1Score} - ${result.team2Score}`);
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

  const handleMapComplete = async (mapNumber: number) => {
    try {
      const mapKey = mapNumber === 1 ? 'map1' : mapNumber === 2 ? 'map2' : 'map3';
      const mapSubmission = currentMatch.mapSubmissions?.[mapKey];
      
      if (!mapSubmission?.team1SubmittedScore || !mapSubmission?.team2SubmittedScore) {
        toast.error('Both teams must submit results for the map to be complete');
        return;
      }

      // Verify both teams submitted the same score
      if (mapSubmission.team1SubmittedScore.team1Score !== mapSubmission.team2SubmittedScore.team1Score ||
          mapSubmission.team1SubmittedScore.team2Score !== mapSubmission.team2SubmittedScore.team2Score) {
        toast.error('Both teams must agree on the score');
        return;
      }

      const team1Score = mapSubmission.team1SubmittedScore.team1Score;
      const team2Score = mapSubmission.team1SubmittedScore.team2Score;
      const winnerId = team1Score > team2Score ? currentMatch.team1Id : currentMatch.team2Id;

      // Update map results
      const updatedMapResults = {
        ...currentMatch.mapResults,
        [mapKey]: {
          team1Score,
          team2Score,
          winner: winnerId
        }
      };

      // Calculate overall match result
      let team1Wins = 0;
      let team2Wins = 0;
      Object.values(updatedMapResults).forEach((result: any) => {
        if (result?.winner === currentMatch.team1Id) team1Wins++;
        if (result?.winner === currentMatch.team2Id) team2Wins++;
      });

      const matchComplete = team1Wins >= 2 || team2Wins >= 2;
      const overallWinnerId = team1Wins >= 2 ? currentMatch.team1Id : team2Wins >= 2 ? currentMatch.team2Id : null;

      const updateData: any = {
        mapResults: updatedMapResults,
        team1Score: team1Wins,
        team2Score: team2Wins
      };

      if (matchComplete && overallWinnerId) {
        updateData.matchState = 'completed';
        updateData.isComplete = true;
        updateData.winnerId = overallWinnerId;
      }

      await updateDoc(doc(db, 'matches', currentMatch.id), updateData);
      
      toast.success(`Map ${mapNumber} completed! ${team1Wins}-${team2Wins}`);
      
      if (matchComplete) {
        toast.success(`Match completed! Winner: ${overallWinnerId === currentMatch.team1Id ? sanitizedTeam1Name : sanitizedTeam2Name}`);
      }
    } catch (error) {

      toast.error('Failed to complete map');
    }
  };

  // If match is in waiting_results state, show the two-team result submission
  if (currentMatch.matchState === 'waiting_results') {
    return (
      <div className="space-y-4">
        <TwoTeamResultSubmission
          match={currentMatch}
          teams={teams}
          currentUserTeamId={currentUserTeamId}
          onClose={() => {}} // No close action needed as it's not a modal
        />
      </div>
    );
  }

  // If match is complete, show final results
  const isMatchComplete = (isBO3Match && bo3Status.isComplete) || currentMatch.matchState === 'completed';
  if (isMatchComplete) {
    // For BO1, use resultSubmission scores; for BO3, use mapResults
    const finalTeam1Score = isBO3Match ? bo3Status.team1Wins : (currentMatch.team1Score || 0);
    const finalTeam2Score = isBO3Match ? bo3Status.team2Wins : (currentMatch.team2Score || 0);
    const winnerId = isBO3Match ? bo3Status.winnerId : (currentMatch.winnerId || null);
    
    return (
      <div className="space-y-6">
        {/* Post-Match Analytics - Show First */}
        {(() => {
          console.log('[MatchInProgress] Checking if PostMatchAnalytics should render:', {
            matchId: currentMatch.id,
            matchState: currentMatch.matchState,
            isComplete: currentMatch.isComplete,
            hasAutoDetectedResult: !!currentMatch.autoDetectedResult,
            hasMatchDetails: !!currentMatch.autoDetectedResult?.matchDetails
          });
          
          // Always show for completed matches (component will handle fetching if needed)
          if (currentMatch.matchState === 'completed' && currentMatch.isComplete) {
            console.log('[MatchInProgress] Rendering PostMatchAnalytics for completed match');
            return (
              <PostMatchAnalytics
                match={currentMatch}
                teams={teams}
                currentUserTeamId={currentUserTeamId}
              />
            );
          }
          
          console.log('[MatchInProgress] Not rendering PostMatchAnalytics (match not completed)');
          return null;
        })()}

      </div>
    );
  }

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
                match={currentMatch}
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
          <div className="flex items-center space-x-2">
            {/* Admin Auto-Detect Button */}
            {isAdmin && currentMatch.matchState === 'playing' && (
              <button
                onClick={handleAutoDetectMatch}
                disabled={isAutoDetecting}
                className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                title="Check if the game is done and auto-detect the score"
              >
                {isAutoDetecting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Checking...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>Auto-Detect Score</span>
                  </>
                )}
              </button>
            )}
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
        </div>



        {/* BO1 or BO3 Progress & Results Display */}
        <div className="mt-4 pt-4 border-t border-gray-700/50">
          {isBO3Match ? (
            <>
              {/* BO3 Series Score */}
              <div className="flex items-center justify-center space-x-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{bo3Status.team1Wins}</div>
                  <div className="text-sm text-gray-300">{sanitizedTeam1Name}</div>
                </div>
                <div className="text-2xl font-bold text-gray-400">-</div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{bo3Status.team2Wins}</div>
                  <div className="text-sm text-gray-300">{sanitizedTeam2Name}</div>
                </div>
              </div>

              <h4 className="text-white font-bold mb-3 text-center flex items-center justify-center space-x-2">
                <MapPin className="w-5 h-5 text-yellow-400" />
                <span>🗺️ BO3 Maps & Results</span>
              </h4>
            </>
          ) : (
            <h4 className="text-white font-bold mb-3 text-center flex items-center justify-center space-x-2">
              <MapPin className="w-5 h-5 text-yellow-400" />
              <span>🗺️ Map & Results</span>
            </h4>
          )}
          
          {isBO3Match ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Map 1 */}
            <div className={`p-4 rounded-lg border ${
              currentMatch.mapResults?.map1?.winner
                ? 'bg-green-600/10 border-green-500/30' 
                : currentMatch.map1 && currentMatch.map1Side 
                ? 'bg-blue-600/10 border-blue-500/30' 
                : 'bg-gray-700/20 border-gray-600/30'
            }`}>
              <div className="text-center">
                <div className="text-sm text-gray-400 mb-2">Map 1</div>
                <div className="text-white font-bold text-lg mb-2">
                  {currentMatch.map1 || 'Not Selected'}
                </div>
                {currentMatch.map1Side && (
                  <div className="space-y-2 mb-3">
                    {currentUserTeamId === currentMatch.team1Id ? (
                      <div className="space-y-1">
                        <div className="text-xs text-gray-300">You are playing:</div>
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${
                          currentMatch.map1Side === 'attack' 
                            ? 'bg-blue-500/20 text-blue-300' 
                            : 'bg-red-500/20 text-red-300'
                        }`}>
                          {currentMatch.map1Side === 'attack' ? '🛡️ DEFENSE' : '⚔️ ATTACK'}
                        </div>
                      </div>
                    ) : currentUserTeamId === currentMatch.team2Id ? (
                      <div className="space-y-1">
                        <div className="text-xs text-gray-300">You are playing:</div>
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${
                          currentMatch.map1Side === 'attack' 
                            ? 'bg-red-500/20 text-red-300' 
                            : 'bg-blue-500/20 text-blue-300'
                        }`}>
                          {currentMatch.map1Side === 'attack' ? '⚔️ ATTACK' : '🛡️ DEFENSE'}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="text-xs text-gray-300">Team B picked:</div>
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${
                          currentMatch.map1Side === 'attack' 
                            ? 'bg-red-500/20 text-red-300' 
                            : 'bg-blue-500/20 text-blue-300'
                        }`}>
                          {currentMatch.map1Side === 'attack' ? '⚔️ ATTACK' : '🛡️ DEFENSE'}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {/* Map Result */}
                {currentMatch.mapResults?.map1 ? (
                  <div className="bg-gray-700/50 rounded p-2">
                    <div className="text-sm font-bold text-white">
                      {currentMatch.mapResults.map1.team1Score} - {currentMatch.mapResults.map1.team2Score}
                    </div>
                    <div className="text-xs text-green-300">
                      Winner: {currentMatch.mapResults.map1.winner === currentMatch.team1Id ? sanitizedTeam1Name : sanitizedTeam2Name}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-400">No result yet</div>
                )}
              </div>
            </div>

            {/* Map 2 */}
            <div className={`p-4 rounded-lg border ${
              currentMatch.mapResults?.map2?.winner
                ? 'bg-green-600/10 border-green-500/30' 
                : currentMatch.map2 && currentMatch.map2Side 
                ? 'bg-blue-600/10 border-blue-500/30' 
                : 'bg-gray-700/20 border-gray-600/30'
            }`}>
              <div className="text-center">
                <div className="text-sm text-gray-400 mb-2">Map 2</div>
                <div className="text-white font-bold text-lg mb-2">
                  {currentMatch.map2 || 'Not Selected'}
                </div>
                {currentMatch.map2Side && (
                  <div className="space-y-2 mb-3">
                    {currentUserTeamId === currentMatch.team1Id ? (
                      <div className="space-y-1">
                        <div className="text-xs text-gray-300">You are playing:</div>
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${
                          currentMatch.map2Side === 'attack' 
                            ? 'bg-red-500/20 text-red-300' 
                            : 'bg-blue-500/20 text-blue-300'
                        }`}>
                          {currentMatch.map2Side === 'attack' ? '⚔️ ATTACK' : '🛡️ DEFENSE'}
                        </div>
                      </div>
                    ) : currentUserTeamId === currentMatch.team2Id ? (
                      <div className="space-y-1">
                        <div className="text-xs text-gray-300">You are playing:</div>
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${
                          currentMatch.map2Side === 'attack' 
                            ? 'bg-blue-500/20 text-blue-300' 
                            : 'bg-red-500/20 text-red-300'
                        }`}>
                          {currentMatch.map2Side === 'attack' ? '🛡️ DEFENSE' : '⚔️ ATTACK'}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="text-xs text-gray-300">Team A picked:</div>
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${
                          currentMatch.map2Side === 'attack' 
                            ? 'bg-red-500/20 text-red-300' 
                            : 'bg-blue-500/20 text-blue-300'
                        }`}>
                          {currentMatch.map2Side === 'attack' ? '⚔️ ATTACK' : '🛡️ DEFENSE'}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {/* Map Result */}
                {currentMatch.mapResults?.map2 ? (
                  <div className="bg-gray-700/50 rounded p-2">
                    <div className="text-sm font-bold text-white">
                      {currentMatch.mapResults.map2.team1Score} - {currentMatch.mapResults.map2.team2Score}
                    </div>
                    <div className="text-xs text-green-300">
                      Winner: {currentMatch.mapResults.map2.winner === currentMatch.team1Id ? sanitizedTeam1Name : sanitizedTeam2Name}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-400">No result yet</div>
                )}
              </div>
            </div>

            {/* Decider Map */}
            <div className={`p-4 rounded-lg border ${
              currentMatch.mapResults?.map3?.winner
                ? 'bg-green-600/10 border-green-500/30' 
                : currentMatch.deciderMap && currentMatch.deciderMapSide && bo3Status.currentMapNumber >= 3
                ? 'bg-blue-600/10 border-blue-500/30' 
                : 'bg-gray-700/20 border-gray-600/30'
            }`}>
              <div className="text-center">
                <div className="text-sm text-gray-400 mb-2">Decider</div>
                <div className="text-white font-bold text-lg mb-2">
                  {currentMatch.deciderMap || 'Not Selected'}
                </div>
                {currentMatch.deciderMapSide && (
                  <div className="space-y-2 mb-3">
                    {currentUserTeamId === currentMatch.team1Id ? (
                      <div className="space-y-1">
                        <div className="text-xs text-gray-300">You are playing:</div>
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${
                          currentMatch.deciderMapSide === 'attack' 
                            ? 'bg-red-500/20 text-red-300' 
                            : 'bg-blue-500/20 text-blue-300'
                        }`}>
                          {currentMatch.deciderMapSide === 'attack' ? '⚔️ ATTACK' : '🛡️ DEFENSE'}
                        </div>
                      </div>
                    ) : currentUserTeamId === currentMatch.team2Id ? (
                      <div className="space-y-1">
                        <div className="text-xs text-gray-300">You are playing:</div>
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${
                          currentMatch.deciderMapSide === 'attack' 
                            ? 'bg-blue-500/20 text-blue-300' 
                            : 'bg-red-500/20 text-red-300'
                        }`}>
                          {currentMatch.deciderMapSide === 'attack' ? '🛡️ DEFENSE' : '⚔️ ATTACK'}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="text-xs text-gray-300">Team A picked:</div>
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${
                          currentMatch.deciderMapSide === 'attack' 
                            ? 'bg-red-500/20 text-red-300' 
                            : 'bg-blue-500/20 text-blue-300'
                        }`}>
                          {currentMatch.deciderMapSide === 'attack' ? '⚔️ ATTACK' : '🛡️ DEFENSE'}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {/* Map Result */}
                {currentMatch.mapResults?.map3 ? (
                  <div className="bg-gray-700/50 rounded p-2">
                    <div className="text-sm font-bold text-white">
                      {currentMatch.mapResults.map3.team1Score} - {currentMatch.mapResults.map3.team2Score}
                    </div>
                    <div className="text-xs text-green-300">
                      Winner: {currentMatch.mapResults.map3.winner === currentMatch.team1Id ? sanitizedTeam1Name : sanitizedTeam2Name}
                    </div>
                  </div>
                ) : bo3Status.currentMapNumber <= 3 ? (
                  <div className="text-xs text-gray-400">
                    {bo3Status.currentMapNumber === 3 ? 'Ready to play' : 'Not needed yet'}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          ) : (
            /* BO1 Single Map Display */
            <div className="grid grid-cols-1 gap-4 max-w-md mx-auto">
              <div className={`p-4 rounded-lg border ${
                currentMatch.resultSubmission?.team1Submitted && currentMatch.resultSubmission?.team2Submitted
                  ? 'bg-green-600/10 border-green-500/30' 
                  : currentMatch.selectedMap && currentMatch.team1Side && currentMatch.team2Side
                  ? 'bg-blue-600/10 border-blue-500/30' 
                  : 'bg-gray-700/20 border-gray-600/30'
              }`}>
                <div className="text-center">
                  <div className="text-sm text-gray-400 mb-2">Selected Map</div>
                  <div className="text-white font-bold text-lg mb-2">
                    {currentMatch.selectedMap || 'Not Selected'}
                  </div>
                  {currentMatch.team1Side && currentMatch.team2Side && (
                    <div className="space-y-2 mb-3">
                      {currentUserTeamId === currentMatch.team1Id ? (
                        <div className="space-y-1">
                          <div className="text-xs text-gray-300">You are playing:</div>
                          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${
                            currentMatch.team1Side === 'attack' 
                              ? 'bg-red-500/20 text-red-300' 
                              : 'bg-blue-500/20 text-blue-300'
                          }`}>
                            {currentMatch.team1Side === 'attack' ? '⚔️ ATTACK' : '🛡️ DEFENSE'}
                          </div>
                        </div>
                      ) : currentUserTeamId === currentMatch.team2Id ? (
                        <div className="space-y-1">
                          <div className="text-xs text-gray-300">You are playing:</div>
                          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${
                            currentMatch.team2Side === 'attack' 
                              ? 'bg-red-500/20 text-red-300' 
                              : 'bg-blue-500/20 text-blue-300'
                          }`}>
                            {currentMatch.team2Side === 'attack' ? '⚔️ ATTACK' : '🛡️ DEFENSE'}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Submit Map Result Button */}
          {isBO3Match && !bo3Status.isComplete && currentUserTeamId && (
            <div className="mt-4 text-center">
              <MapResultSubmission
                match={currentMatch}
                teams={teams}
                currentUserTeamId={currentUserTeamId}
                mapNumber={bo3Status.currentMapNumber}
                onMapComplete={() => handleMapComplete(bo3Status.currentMapNumber)}
              />
            </div>
          )}

          {/* BO1 Result Submission */}
          {isBO1Match && currentMatch.selectedMap && currentMatch.team1Side && currentMatch.team2Side && currentUserTeamId && (
            <div className="mt-4">
              <TwoTeamResultSubmission
                match={currentMatch}
                teams={teams}
                currentUserTeamId={currentUserTeamId}
                onClose={() => {}}
              />
            </div>
          )}

          {/* Team Names Legend */}
          <div className="mt-4 pt-3 border-t border-gray-700/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className={`p-3 rounded-lg text-center ${
                currentUserTeamId === currentMatch.team1Id 
                  ? 'bg-blue-600/20 border border-blue-500/30' 
                  : 'bg-gray-700/40'
              }`}>
                <div className="font-semibold text-white mb-1">
                  {currentUserTeamId === currentMatch.team1Id ? '🎯 Your Team' : 'Team A'}
                </div>
                <div className="text-gray-300">{sanitizedTeam1Name}</div>
              </div>
              <div className={`p-3 rounded-lg text-center ${
                currentUserTeamId === currentMatch.team2Id 
                  ? 'bg-blue-600/20 border border-blue-500/30' 
                  : 'bg-gray-700/40'
              }`}>
                <div className="font-semibold text-white mb-1">
                  {currentUserTeamId === currentMatch.team2Id ? '🎯 Your Team' : 'Team B'}
                </div>
                <div className="text-gray-300">{sanitizedTeam2Name}</div>
              </div>
            </div>
          </div>
        </div>
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
  
  // Security: Sanitize team names for the form
  const sanitizedTeam1Name = sanitizeTeamName(team1?.name);
  const sanitizedTeam2Name = sanitizeTeamName(team2?.name);

  const handleScoreChange = (value: string, setter: (value: string) => void) => {
    // Security: Only allow numeric input and limit length
    const numericValue = value.replace(/[^0-9]/g, '');
    if (numericValue.length <= 3) { // Limit to 3 digits max
      setter(numericValue);
    }
  };

  const handleSubmit = () => {
    const score1 = parseInt(team1Score);
    const score2 = parseInt(team2Score);
    
    // Security: Validate input ranges
    if (isNaN(score1) || isNaN(score2)) {
      toast.error('Please enter valid scores');
      return;
    }
    
    if (score1 < 0 || score2 < 0 || score1 > 999 || score2 > 999) {
      toast.error('Scores must be between 0 and 999');
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
            {sanitizedTeam1Name} Score
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
            {sanitizedTeam2Name} Score
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
