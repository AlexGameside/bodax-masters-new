import React, { useState, useEffect } from 'react';
import type { Match, Team } from '../types/tournament';

import { toast } from 'react-hot-toast';
import { Gamepad2, Trophy, Target, Flag, Play, AlertTriangle, HelpCircle, Shield, RotateCcw, CheckCircle, X, MapPin } from 'lucide-react';
import { createDispute, resolveDispute, forceSubmitResults, updateMatchState } from '../services/firebaseService';
import { useAuth } from '../hooks/useAuth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

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
  const [showBO3ResultModal, setShowBO3ResultModal] = useState(false);

  const team1 = teams.find(t => t.id === match.team1Id);
  const team2 = teams.find(t => t.id === match.team2Id);
  const currentUserTeam = teams.find(t => t.id === currentUserTeamId);
  
  const isAdmin = currentUser?.isAdmin;
  const isInDispute = match.matchState === 'disputed';


  // Calculate BO3 match status
  const getBO3Status = () => {
    const mapResults = match.mapResults || {};
    let team1Wins = 0;
    let team2Wins = 0;
    
    if (mapResults.map1?.winner === match.team1Id) team1Wins++;
    if (mapResults.map1?.winner === match.team2Id) team2Wins++;
    if (mapResults.map2?.winner === match.team1Id) team1Wins++;
    if (mapResults.map2?.winner === match.team2Id) team2Wins++;
    if (mapResults.map3?.winner === match.team1Id) team1Wins++;
    if (mapResults.map3?.winner === match.team2Id) team2Wins++;
    
    const isComplete = team1Wins >= 2 || team2Wins >= 2;
    const winnerId = team1Wins >= 2 ? match.team1Id : team2Wins >= 2 ? match.team2Id : null;
    
    return {
      team1Wins,
      team2Wins,
      isComplete,
      winnerId,
      currentMapNumber: team1Wins + team2Wins + 1
    };
  };

  const bo3Status = getBO3Status();

  // Debug logging for map selection data
  useEffect(() => {
    if (isAdmin) {
      console.log('🔍 DEBUG: MatchInProgress - Map selection data:', {
        map1: match.map1,
        map1Side: match.map1Side,
        map2: match.map2,
        map2Side: match.map2Side,
        deciderMap: match.deciderMap,
        deciderMapSide: match.deciderMapSide,
        matchState: match.matchState
      });
    }
  }, [match.map1, match.map1Side, match.map2, match.map2Side, match.deciderMap, match.deciderMapSide, match.matchState, isAdmin]);

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

  const handleBO3MapResult = async (mapNumber: number, team1Score: number, team2Score: number) => {
    try {
      const winnerId = team1Score > team2Score ? match.team1Id : match.team2Id;
      const mapKey = mapNumber === 1 ? 'map1' : mapNumber === 2 ? 'map2' : 'map3';
      
      const updatedMapResults = {
        ...match.mapResults,
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
        if (result?.winner === match.team1Id) team1Wins++;
        if (result?.winner === match.team2Id) team2Wins++;
      });

      const matchComplete = team1Wins >= 2 || team2Wins >= 2;
      const overallWinnerId = team1Wins >= 2 ? match.team1Id : team2Wins >= 2 ? match.team2Id : null;

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

      await updateDoc(doc(db, 'matches', match.id), updateData);
      
      // If match is complete and it's a tournament match, update Swiss standings
      if (matchComplete && overallWinnerId && match.tournamentId) {
        try {
          const { SwissTournamentService } = await import('../services/swissTournamentService');
          const completedMatch = {
            ...match,
            ...updateData,
            mapResults: updatedMapResults,
            team1Score: team1Wins,
            team2Score: team2Wins,
            isComplete: true,
            winnerId: overallWinnerId
          };
          
          await SwissTournamentService.updateSwissStandings(match.tournamentId, completedMatch);
          console.log('✅ Swiss standings updated for BO3 match completion');
          
          // Also check if tournament completion should be triggered
          if (match.tournamentId) {
            const { checkAndMarkTournamentCompleted } = await import('../services/firebaseService');
            await checkAndMarkTournamentCompleted(match.tournamentId);
            console.log('✅ Tournament completion check triggered');
          }
        } catch (error) {
          console.error('❌ Failed to update Swiss standings for BO3 match:', error);
          // Don't show error to user as the match completion was successful
        }
      }
      
      toast.success(`Map ${mapNumber} result submitted successfully!`);
      if (matchComplete) {
        toast.success(`Match completed! Winner: ${overallWinnerId === match.team1Id ? team1?.name : team2?.name}`);
      }
      
      setShowBO3ResultModal(false);
    } catch (error) {
      toast.error('Failed to submit map result');
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

        {/* Admin Debug Info */}
        {isAdmin && (
          <div className="mt-4 p-3 bg-purple-900/20 border border-purple-500/30 rounded-lg">
            <h4 className="text-purple-300 font-bold mb-2 text-sm">🔍 Admin Debug - Map Selection Data</h4>
            <div className="text-xs text-purple-200 space-y-1">
              <div>map1: "{match.map1 || 'undefined'}" | map1Side: "{match.map1Side || 'undefined'}"</div>
              <div>map2: "{match.map2 || 'undefined'}" | map2Side: "{match.map2Side || 'undefined'}"</div>
              <div>deciderMap: "{match.deciderMap || 'undefined'}" | deciderMapSide: "{match.deciderMapSide || 'undefined'}"</div>
              <div>matchState: "{match.matchState}"</div>
            </div>
          </div>
        )}

        {/* BO3 Progress & Results Display */}
        <div className="mt-4 pt-4 border-t border-gray-700/50">
          {/* BO3 Series Score */}
          <div className="flex items-center justify-center space-x-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{bo3Status.team1Wins}</div>
              <div className="text-sm text-gray-300">{team1?.name}</div>
            </div>
            <div className="text-2xl font-bold text-gray-400">-</div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{bo3Status.team2Wins}</div>
              <div className="text-sm text-gray-300">{team2?.name}</div>
            </div>
          </div>

          {bo3Status.isComplete && (
            <div className="text-center mb-4 p-3 bg-green-600/20 rounded-lg border border-green-500/30">
              <div className="text-green-300 font-bold">
                🏆 Match Complete! Winner: {bo3Status.winnerId === match.team1Id ? team1?.name : team2?.name}
              </div>
            </div>
          )}

          <h4 className="text-white font-bold mb-3 text-center flex items-center justify-center space-x-2">
            <MapPin className="w-5 h-5 text-yellow-400" />
            <span>🗺️ BO3 Maps & Results</span>
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Map 1 */}
            <div className={`p-4 rounded-lg border ${
              match.mapResults?.map1?.winner
                ? 'bg-green-600/10 border-green-500/30' 
                : match.map1 && match.map1Side 
                ? 'bg-blue-600/10 border-blue-500/30' 
                : 'bg-gray-700/20 border-gray-600/30'
            }`}>
              <div className="text-center">
                <div className="text-sm text-gray-400 mb-2">Map 1</div>
                <div className="text-white font-bold text-lg mb-2">
                  {match.map1 || 'Not Selected'}
                </div>
                {/* Debug info for admins */}
                {isAdmin && (
                  <div className="text-xs text-gray-500 mb-1">
                    Debug: map1="{match.map1}", map1Side="{match.map1Side}"
                  </div>
                )}
                {match.map1Side && (
                  <div className="space-y-2 mb-3">
                    {/* Team A sees opposite of what Team B picked */}
                    {currentUserTeamId === match.team1Id ? (
                      <div className="space-y-1">
                        <div className="text-xs text-gray-300">You are playing:</div>
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${
                          match.map1Side === 'attack' 
                            ? 'bg-blue-500/20 text-blue-300' 
                            : 'bg-red-500/20 text-red-300'
                        }`}>
                          {match.map1Side === 'attack' ? '🛡️ DEFENSE' : '⚔️ ATTACK'}
                        </div>
                      </div>
                    ) : currentUserTeamId === match.team2Id ? (
                      <div className="space-y-1">
                        <div className="text-xs text-gray-300">You are playing:</div>
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${
                          match.map1Side === 'attack' 
                            ? 'bg-red-500/20 text-red-300' 
                            : 'bg-blue-500/20 text-blue-300'
                        }`}>
                          {match.map1Side === 'attack' ? '⚔️ ATTACK' : '🛡️ DEFENSE'}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="text-xs text-gray-300">Team B picked:</div>
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${
                          match.map1Side === 'attack' 
                            ? 'bg-red-500/20 text-red-300' 
                            : 'bg-blue-500/20 text-blue-300'
                        }`}>
                          {match.map1Side === 'attack' ? '⚔️ ATTACK' : '🛡️ DEFENSE'}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {/* Map Result */}
                {match.mapResults?.map1 ? (
                  <div className="bg-gray-700/50 rounded p-2">
                    <div className="text-sm font-bold text-white">
                      {match.mapResults.map1.team1Score} - {match.mapResults.map1.team2Score}
                    </div>
                    <div className="text-xs text-green-300">
                      Winner: {match.mapResults.map1.winner === match.team1Id ? team1?.name : team2?.name}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-400">No result yet</div>
                )}
              </div>
            </div>

            {/* Map 2 */}
            <div className={`p-4 rounded-lg border ${
              match.mapResults?.map2?.winner
                ? 'bg-green-600/10 border-green-500/30' 
                : match.map2 && match.map2Side 
                ? 'bg-blue-600/10 border-blue-500/30' 
                : 'bg-gray-700/20 border-gray-600/30'
            }`}>
              <div className="text-center">
                <div className="text-sm text-gray-400 mb-2">Map 2</div>
                <div className="text-white font-bold text-lg mb-2">
                  {match.map2 || 'Not Selected'}
                </div>
                {/* Debug info for admins */}
                {isAdmin && (
                  <div className="text-xs text-gray-500 mb-1">
                    Debug: map2="{match.map2}", map2Side="{match.map2Side}"
                  </div>
                )}
                {match.map2Side && (
                  <div className="space-y-2 mb-3">
                    {/* Team A sees what they picked, Team B sees opposite */}
                    {currentUserTeamId === match.team1Id ? (
                      <div className="space-y-1">
                        <div className="text-xs text-gray-300">You are playing:</div>
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${
                          match.map2Side === 'attack' 
                            ? 'bg-red-500/20 text-red-300' 
                            : 'bg-blue-500/20 text-blue-300'
                        }`}>
                          {match.map2Side === 'attack' ? '⚔️ ATTACK' : '🛡️ DEFENSE'}
                        </div>
                      </div>
                    ) : currentUserTeamId === match.team2Id ? (
                      <div className="space-y-1">
                        <div className="text-xs text-gray-300">You are playing:</div>
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${
                          match.map2Side === 'attack' 
                            ? 'bg-blue-500/20 text-blue-300' 
                            : 'bg-red-500/20 text-red-300'
                        }`}>
                          {match.map2Side === 'attack' ? '🛡️ DEFENSE' : '⚔️ ATTACK'}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="text-xs text-gray-300">Team A picked:</div>
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${
                          match.map2Side === 'attack' 
                            ? 'bg-red-500/20 text-red-300' 
                            : 'bg-blue-500/20 text-blue-300'
                        }`}>
                          {match.map2Side === 'attack' ? '⚔️ ATTACK' : '🛡️ DEFENSE'}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {/* Map Result */}
                {match.mapResults?.map2 ? (
                  <div className="bg-gray-700/50 rounded p-2">
                    <div className="text-sm font-bold text-white">
                      {match.mapResults.map2.team1Score} - {match.mapResults.map2.team2Score}
                    </div>
                    <div className="text-xs text-green-300">
                      Winner: {match.mapResults.map2.winner === match.team1Id ? team1?.name : team2?.name}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-400">No result yet</div>
                )}
              </div>
            </div>

            {/* Decider Map */}
            <div className={`p-4 rounded-lg border ${
              match.mapResults?.map3?.winner
                ? 'bg-green-600/10 border-green-500/30' 
                : match.deciderMap && match.deciderMapSide && bo3Status.currentMapNumber >= 3
                ? 'bg-blue-600/10 border-blue-500/30' 
                : 'bg-gray-700/20 border-gray-600/30'
            }`}>
              <div className="text-center">
                <div className="text-sm text-gray-400 mb-2">Decider</div>
                <div className="text-white font-bold text-lg mb-2">
                  {match.deciderMap || 'Not Selected'}
                </div>
                {/* Debug info for admins */}
                {isAdmin && (
                  <div className="text-xs text-gray-500 mb-1">
                    Debug: deciderMap="{match.deciderMap}", deciderMapSide="{match.deciderMapSide}"
                  </div>
                )}
                {match.deciderMapSide && (
                  <div className="space-y-2 mb-3">
                    {/* Team A sees what they picked, Team B sees opposite */}
                    {currentUserTeamId === match.team1Id ? (
                      <div className="space-y-1">
                        <div className="text-xs text-gray-300">You are playing:</div>
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${
                          match.deciderMapSide === 'attack' 
                            ? 'bg-red-500/20 text-red-300' 
                            : 'bg-blue-500/20 text-blue-300'
                        }`}>
                          {match.deciderMapSide === 'attack' ? '⚔️ ATTACK' : '🛡️ DEFENSE'}
                        </div>
                      </div>
                    ) : currentUserTeamId === match.team2Id ? (
                      <div className="space-y-1">
                        <div className="text-xs text-gray-300">You are playing:</div>
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${
                          match.deciderMapSide === 'attack' 
                            ? 'bg-blue-500/20 text-blue-300' 
                            : 'bg-red-500/20 text-red-300'
                        }`}>
                          {match.deciderMapSide === 'attack' ? '🛡️ DEFENSE' : '⚔️ ATTACK'}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="text-xs text-gray-300">Team A picked:</div>
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${
                          match.deciderMapSide === 'attack' 
                            ? 'bg-red-500/20 text-red-300' 
                            : 'bg-blue-500/20 text-blue-300'
                        }`}>
                          {match.deciderMapSide === 'attack' ? '⚔️ ATTACK' : '🛡️ DEFENSE'}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {/* Map Result */}
                {match.mapResults?.map3 ? (
                  <div className="bg-gray-700/50 rounded p-2">
                    <div className="text-sm font-bold text-white">
                      {match.mapResults.map3.team1Score} - {match.mapResults.map3.team2Score}
                    </div>
                    <div className="text-xs text-green-300">
                      Winner: {match.mapResults.map3.winner === match.team1Id ? team1?.name : team2?.name}
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

          {/* Submit Map Result Button */}
          {!bo3Status.isComplete && bo3Status.currentMapNumber <= 3 && currentUserTeamId && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setShowBO3ResultModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-bold transition-colors"
              >
                Submit Map {bo3Status.currentMapNumber} Result
              </button>
            </div>
          )}

          {/* Team Names Legend */}
          <div className="mt-4 pt-3 border-t border-gray-700/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className={`p-3 rounded-lg text-center ${
                currentUserTeamId === match.team1Id 
                  ? 'bg-blue-600/20 border border-blue-500/30' 
                  : 'bg-gray-700/40'
              }`}>
                <div className="font-semibold text-white mb-1">
                  {currentUserTeamId === match.team1Id ? '🎯 Your Team' : 'Team A'}
                </div>
                <div className="text-gray-300">{team1?.name}</div>
              </div>
              <div className={`p-3 rounded-lg text-center ${
                currentUserTeamId === match.team2Id 
                  ? 'bg-blue-600/20 border border-blue-500/30' 
                  : 'bg-gray-700/40'
              }`}>
                <div className="font-semibold text-white mb-1">
                  {currentUserTeamId === match.team2Id ? '🎯 Your Team' : 'Team B'}
                </div>
                <div className="text-gray-300">{team2?.name}</div>
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



      {/* BO3 Map Result Submission Modal */}
      {showBO3ResultModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold text-white mb-4">
              Submit Map {bo3Status.currentMapNumber} Result
            </h3>
            <div className="text-center mb-4">
              <div className="text-lg font-bold text-white">
                {bo3Status.currentMapNumber === 1 ? match.map1 : 
                 bo3Status.currentMapNumber === 2 ? match.map2 : 
                 match.deciderMap}
              </div>
              <div className="text-sm text-gray-300">Map {bo3Status.currentMapNumber}</div>
            </div>
            <BO3MapResultForm
              mapNumber={bo3Status.currentMapNumber}
              teams={teams}
              match={match}
              onSubmit={handleBO3MapResult}
              onCancel={() => setShowBO3ResultModal(false)}
            />
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

// BO3 Map Result Form Component
interface BO3MapResultFormProps {
  mapNumber: number;
  teams: Team[];
  match: Match;
  onSubmit: (mapNumber: number, team1Score: number, team2Score: number) => void;
  onCancel: () => void;
}

const BO3MapResultForm: React.FC<BO3MapResultFormProps> = ({
  mapNumber,
  teams,
  match,
  onSubmit,
  onCancel
}) => {
  const [team1Score, setTeam1Score] = useState<string>('');
  const [team2Score, setTeam2Score] = useState<string>('');

  const team1 = teams.find(t => t.id === match.team1Id);
  const team2 = teams.find(t => t.id === match.team2Id);

  const handleScoreChange = (value: string, setter: (value: string) => void) => {
    // Only allow numbers 0-15 (allowing for overtime)
    const numericValue = value.replace(/[^0-9]/g, '');
    const numValue = parseInt(numericValue);
    if (numericValue === '' || (numValue >= 0 && numValue <= 15)) {
      setter(numericValue);
    }
  };

  const handleSubmit = () => {
    const score1 = parseInt(team1Score);
    const score2 = parseInt(team2Score);
    
    if (isNaN(score1) || isNaN(score2)) {
      toast.error('Please enter valid scores');
      return;
    }

    if (score1 === score2) {
      toast.error('Scores cannot be tied in Valorant');
      return;
    }

    if (score1 < 0 || score1 > 15 || score2 < 0 || score2 > 15) {
      toast.error('Scores must be between 0 and 15');
      return;
    }

    // Ensure one team won (reached 13 or won in overtime)
    const winner = score1 > score2 ? score1 : score2;
    const loser = score1 < score2 ? score1 : score2;
    
    if (winner < 13) {
      toast.error('Winner must reach at least 13 rounds');
      return;
    }

    // Check valid win conditions
    if (winner === 13 && loser >= 12) {
      toast.error('If one team reaches 13 with opponent having 12+, it goes to overtime (first to 2 round lead)');
      return;
    }

    if (winner > 13 && (winner - loser) < 2) {
      toast.error('In overtime, teams must win by 2 rounds');
      return;
    }

    onSubmit(mapNumber, score1, score2);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-white font-medium mb-2">{team1?.name || 'Team A'}</label>
          <input
            type="text"
            value={team1Score}
            onChange={(e) => handleScoreChange(e.target.value, setTeam1Score)}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-center text-xl font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="0"
            maxLength={2}
          />
        </div>
        <div>
          <label className="block text-white font-medium mb-2">{team2?.name || 'Team B'}</label>
          <input
            type="text"
            value={team2Score}
            onChange={(e) => handleScoreChange(e.target.value, setTeam2Score)}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-center text-xl font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="0"
            maxLength={2}
          />
        </div>
      </div>

      <div className="text-center text-sm text-gray-400">
        Standard match: First to 13 rounds wins<br/>
        Overtime: Win by 2 rounds (e.g., 14-12, 15-13)
      </div>

      <div className="flex space-x-3">
        <button
          onClick={onCancel}
          className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Submit Result
        </button>
      </div>
    </div>
  );
};

export default MatchInProgress; 