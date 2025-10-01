import React, { useState, useEffect } from 'react';
import { getDocs, collection, query, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { toast } from 'react-hot-toast';
import { AlertTriangle, CheckCircle, XCircle, Trash2, Eye } from 'lucide-react';
import type { Match, Team } from '../types/tournament';
import { getTeams } from '../services/firebaseService';

interface Map3Issue {
  id: string;
  team1Score: number;
  team2Score: number;
  map3Data: {
    team1Score: number;
    team2Score: number;
    winner?: string;
  };
  team1Name?: string;
  team2Name?: string;
  tournamentId?: string;
  matchNumber?: number;
}

const Map3IssuesTab: React.FC = () => {
  const [issues, setIssues] = useState<Map3Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [fixing, setFixing] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);

  useEffect(() => {
    loadMap3Issues();
  }, []);

  const loadMap3Issues = async () => {
    try {
      setLoading(true);
      
      // Load teams first to get team names
      const allTeams = await getTeams();
      setTeams(allTeams);
      
      // Get all completed matches
      const matchesRef = collection(db, 'matches');
      const completedMatchesQuery = query(matchesRef, where('isComplete', '==', true));
      const matchesSnapshot = await getDocs(completedMatchesQuery);
      
      const foundIssues: Map3Issue[] = [];
      
      matchesSnapshot.forEach((doc) => {
        const matchData = doc.data() as Match;
        const { team1Score, team2Score, mapResults, team1Id, team2Id } = matchData;
        
        // Skip matches without map results
        if (!mapResults) return;
        
        // Check if this is a 2-0 or 0-2 match that has map3 data
        const isTwoZero = (team1Score === 2 && team2Score === 0) || (team1Score === 0 && team2Score === 2);
        
        if (isTwoZero && mapResults.map3) {
          // Get team names
          const team1 = allTeams.find(t => t.id === team1Id);
          const team2 = allTeams.find(t => t.id === team2Id);
          
          foundIssues.push({
            id: doc.id,
            team1Score,
            team2Score,
            map3Data: mapResults.map3,
            team1Name: team1?.name || 'Unknown Team',
            team2Name: team2?.name || 'Unknown Team',
            tournamentId: matchData.tournamentId,
            matchNumber: matchData.matchNumber
          });
        }
      });
      
      setIssues(foundIssues);
    } catch (error) {
      console.error('Error loading Map 3 issues:', error);
      toast.error('Failed to load Map 3 issues');
    } finally {
      setLoading(false);
    }
  };

  const fixMap3Issue = async (matchId: string) => {
    if (!window.confirm('Are you sure you want to remove Map 3 data from this match? This action cannot be undone.')) {
      return;
    }

    try {
      setFixing(matchId);
      
      // Get the current match data
      const matchRef = doc(db, 'matches', matchId);
      const matchDoc = await getDocs(query(collection(db, 'matches'), where('__name__', '==', matchId)));
      
      if (matchDoc.empty) {
        toast.error('Match not found');
        return;
      }
      
      const matchData = matchDoc.docs[0].data();
      const mapResults = matchData.mapResults;
      
      if (!mapResults || !mapResults.map3) {
        toast.error('No Map 3 data found to remove');
        return;
      }
      
      // Remove map3 data
      const updatedMapResults = {
        map1: mapResults.map1,
        map2: mapResults.map2
        // map3 is removed
      };
      
      // Update the match
      await updateDoc(matchRef, {
        mapResults: updatedMapResults
      });
      
      // Remove from issues list
      setIssues(prev => prev.filter(issue => issue.id !== matchId));
      
      toast.success('Map 3 data removed successfully');
      
    } catch (error) {
      console.error('Error fixing Map 3 issue:', error);
      toast.error('Failed to fix Map 3 issue');
    } finally {
      setFixing(null);
    }
  };

  const getIssueType = (issue: Map3Issue) => {
    const { team1Score, team2Score, map3Data } = issue;
    
    if (team1Score === 2 && team2Score === 0) {
      return '2-0 match with Map 3 data';
    } else if (team1Score === 0 && team2Score === 2) {
      return '0-2 match with Map 3 data';
    }
    
    return 'Unknown issue';
  };

  const getSeverity = (issue: Map3Issue) => {
    const { map3Data } = issue;
    
    // High severity if map3 has actual scores
    if (map3Data.team1Score > 0 || map3Data.team2Score > 0) {
      return 'high';
    }
    
    // Medium severity if map3 has winner but no scores
    if (map3Data.winner) {
      return 'medium';
    }
    
    // Low severity if map3 exists but is empty
    return 'low';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-300">Loading Map 3 issues...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white mb-2">Map 3 Data Issues</h2>
            <p className="text-gray-300 text-sm">
              Matches that ended 2-0 or 0-2 but incorrectly have Map 3 data
            </p>
          </div>
          <button
            onClick={loadMap3Issues}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Refresh
          </button>
        </div>
        
        <div className="mt-4 flex items-center space-x-6 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-gray-300">High: Map 3 has scores</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span className="text-gray-300">Medium: Map 3 has winner</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-gray-300">Low: Map 3 exists but empty</span>
          </div>
        </div>
      </div>

      {/* Issues List */}
      {issues.length === 0 ? (
        <div className="bg-green-900/20 border border-green-700 rounded-lg p-6 text-center">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-green-400 mb-2">No Issues Found!</h3>
          <p className="text-gray-300">All matches have correct Map 3 data.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {issues.map((issue) => {
            const severity = getSeverity(issue);
            const severityColor = severity === 'high' ? 'red' : severity === 'medium' ? 'yellow' : 'green';
            
            return (
              <div
                key={issue.id}
                className={`bg-gray-800 rounded-lg p-4 border border-${severityColor}-700`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-white font-semibold">
                        Match #{issue.matchNumber || 'Unknown'}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium bg-${severityColor}-900/50 text-${severityColor}-300`}>
                        {getIssueType(issue)}
                      </span>
                    </div>
                    
                    <div className="text-gray-300 text-sm space-y-1">
                      <div>
                        <strong>Score:</strong> {issue.team1Score} - {issue.team2Score}
                      </div>
                      <div>
                        <strong>Teams:</strong> {issue.team1Name || 'Team 1'} vs {issue.team2Name || 'Team 2'}
                      </div>
                      <div>
                        <strong>Map 3 Data:</strong> {issue.map3Data.team1Score} - {issue.map3Data.team2Score}
                        {issue.map3Data.winner && (
                          <span className="ml-2 text-yellow-400">
                            (Winner: {issue.map3Data.winner === issue.team1Name ? 'Team 1' : 'Team 2'})
                          </span>
                        )}
                      </div>
                      <div>
                        <strong>Match ID:</strong> <code className="bg-gray-700 px-1 rounded text-xs">{issue.id}</code>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => fixMap3Issue(issue.id)}
                      disabled={fixing === issue.id}
                      className="px-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center space-x-2"
                    >
                      {fixing === issue.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Fixing...</span>
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4" />
                          <span>Remove Map 3</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Summary */}
      {issues.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-2">Summary</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">
                {issues.filter(i => getSeverity(i) === 'high').length}
              </div>
              <div className="text-gray-300">High Severity</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">
                {issues.filter(i => getSeverity(i) === 'medium').length}
              </div>
              <div className="text-gray-300">Medium Severity</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">
                {issues.filter(i => getSeverity(i) === 'low').length}
              </div>
              <div className="text-gray-300">Low Severity</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Map3IssuesTab;
