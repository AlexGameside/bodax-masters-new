import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Match, Team } from '../types/tournament';

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

interface MapResultSubmissionProps {
  match: Match;
  teams: Team[];
  currentUserTeamId?: string;
  mapNumber: number;
  onMapComplete: () => void;
}

const MapResultSubmission: React.FC<MapResultSubmissionProps> = ({
  match,
  teams,
  currentUserTeamId,
  mapNumber,
  onMapComplete
}) => {
  const [team1Score, setTeam1Score] = useState<string>('');
  const [team2Score, setTeam2Score] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDisputing, setIsDisputing] = useState(false);

  const team1 = teams.find(t => t.id === match.team1Id);
  const team2 = teams.find(t => t.id === match.team2Id);
  const isTeam1 = currentUserTeamId === match.team1Id;
  const isTeam2 = currentUserTeamId === match.team2Id;
  
  // Security: Sanitize team names to prevent XSS
  const sanitizedTeam1Name = sanitizeTeamName(team1?.name);
  const sanitizedTeam2Name = sanitizeTeamName(team2?.name);

  const mapKey = mapNumber === 1 ? 'map1' : mapNumber === 2 ? 'map2' : 'map3';
  const mapName = mapNumber === 1 ? match.map1 : mapNumber === 2 ? match.map2 : match.deciderMap;

  // Check if this team has already submitted for this map
  const hasSubmitted = isTeam1
    ? match.mapSubmissions?.[mapKey]?.team1Submitted
    : isTeam2
    ? match.mapSubmissions?.[mapKey]?.team2Submitted
    : false;

  // Get the other team's submission for this map
  const otherTeamSubmission = isTeam1
    ? match.mapSubmissions?.[mapKey]?.team2SubmittedScore
    : isTeam2
    ? match.mapSubmissions?.[mapKey]?.team1SubmittedScore
    : null;

  const handleScoreChange = (team: 'team1' | 'team2', value: string) => {
    // Security: Only allow numeric input and limit length
    const numericValue = value.replace(/[^0-9]/g, '');
    if (numericValue.length <= 3) { // Limit to 3 digits max
      if (team === 'team1') {
        setTeam1Score(numericValue);
      } else {
        setTeam2Score(numericValue);
      }
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

    // Security: Validate input ranges
    if (score1 < 0 || score2 < 0 || score1 > 999 || score2 > 999) {
      toast.error('Scores must be between 0 and 999');
      return;
    }

    if (score1 === 0 && score2 === 0) {
      toast.error('At least one team must have scored');
      return;
    }

    if (score1 === score2) {
      toast.error('Scores cannot be tied in Valorant');
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

    setIsSubmitting(true);
    try {
      const matchRef = doc(db, 'matches', match.id);
      
      // Initialize map submissions if it doesn't exist
      const currentMapSubmissions = match.mapSubmissions || {};
      const currentMapSubmission = currentMapSubmissions[mapKey] || {
        team1Submitted: false,
        team2Submitted: false,
        team1SubmittedScore: null,
        team2SubmittedScore: null
      };

      const updateData: any = {
        mapSubmissions: {
          ...currentMapSubmissions,
          [mapKey]: {
            ...currentMapSubmission,
            submittedAt: serverTimestamp()
          }
        }
      };

      if (isTeam1) {
        updateData.mapSubmissions[mapKey].team1Submitted = true;
        updateData.mapSubmissions[mapKey].team1SubmittedScore = { team1Score: score1, team2Score: score2 };
      } else {
        updateData.mapSubmissions[mapKey].team2Submitted = true;
        updateData.mapSubmissions[mapKey].team2SubmittedScore = { team1Score: score1, team2Score: score2 };
      }

      await updateDoc(matchRef, updateData);
      toast.success(`Map ${mapNumber} result submitted! Waiting for other team to confirm.`);
    } catch (error) {
      console.error('Error submitting map result:', error);
      toast.error('Failed to submit map result. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAgree = async () => {
    if (!otherTeamSubmission) return;
    
    setIsSubmitting(true);
    try {
      const matchRef = doc(db, 'matches', match.id);
      
      const currentMapSubmissions = match.mapSubmissions || {};
      const currentMapSubmission = currentMapSubmissions[mapKey] || {
        team1Submitted: false,
        team2Submitted: false,
        team1SubmittedScore: null,
        team2SubmittedScore: null
      };

      const updateData: any = {
        mapSubmissions: {
          ...currentMapSubmissions,
          [mapKey]: {
            ...currentMapSubmission,
            submittedAt: serverTimestamp()
          }
        }
      };

      if (isTeam1) {
        updateData.mapSubmissions[mapKey].team1Submitted = true;
        updateData.mapSubmissions[mapKey].team1SubmittedScore = otherTeamSubmission;
      } else {
        updateData.mapSubmissions[mapKey].team2Submitted = true;
        updateData.mapSubmissions[mapKey].team2SubmittedScore = otherTeamSubmission;
      }

      await updateDoc(matchRef, updateData);
      toast.success(`Map ${mapNumber} result confirmed!`);
    } catch (error) {
      console.error('Error agreeing to map result:', error);
      toast.error('Failed to confirm map result. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDispute = async () => {
    if (!currentUserTeamId) return;
    
    setIsDisputing(true);
    try {
      // Create a dispute for this specific map
      const matchRef = doc(db, 'matches', match.id);
      await updateDoc(matchRef, {
        matchState: 'disputed',
        disputeReason: `Map ${mapNumber} result disagreement`,
        disputedAt: serverTimestamp()
      });
      toast.success('Dispute created successfully. An admin will review this map.');
    } catch (error) {
      console.error('Error creating dispute:', error);
      toast.error('Failed to create dispute. Please try again.');
    } finally {
      setIsDisputing(false);
    }
  };

  // Check if both teams have submitted and scores don't match
  const bothTeamsSubmitted = match.mapSubmissions?.[mapKey]?.team1Submitted && match.mapSubmissions?.[mapKey]?.team2Submitted;
  const scoresMatch = bothTeamsSubmitted && 
    match.mapSubmissions?.[mapKey]?.team1SubmittedScore?.team1Score === match.mapSubmissions?.[mapKey]?.team2SubmittedScore?.team1Score &&
    match.mapSubmissions?.[mapKey]?.team1SubmittedScore?.team2Score === match.mapSubmissions?.[mapKey]?.team2SubmittedScore?.team2Score;

  // If both teams submitted and scores match, mark map as complete
  if (bothTeamsSubmitted && scoresMatch) {
    // This should trigger map completion logic
    setTimeout(() => {
      onMapComplete();
    }, 1000);
  }

    // If both teams have submitted and scores don't match, show dispute interface
  if (bothTeamsSubmitted && !scoresMatch) {
    return (
      <div className="bg-gradient-to-br from-red-500/10 via-orange-600/10 to-red-700/10 backdrop-blur-sm rounded-lg p-4 border border-red-400/30 shadow-lg">
        <div className="text-center mb-4">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <h3 className="text-lg font-bold text-white mb-1">Map {mapNumber} Score Discrepancy</h3>
          <p className="text-red-200 text-sm">Both teams have submitted different scores for {mapName}</p>
        </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
           <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-600/30">
             <h4 className="text-white font-bold mb-1 text-sm">{sanitizedTeam1Name} Submitted:</h4>
             <div className="text-xl font-bold text-white">
               <span className="text-blue-300">{sanitizedTeam1Name}</span>
               <span className="mx-2">-</span>
               <span className="text-blue-300">{sanitizedTeam2Name}</span>
             </div>
             <div className="text-2xl font-bold text-white mt-1">
               {match.mapSubmissions?.[mapKey]?.team1SubmittedScore?.team1Score} - {match.mapSubmissions?.[mapKey]?.team1SubmittedScore?.team2Score}
             </div>
           </div>
           <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-600/30">
             <h4 className="text-white font-bold mb-1 text-sm">{sanitizedTeam2Name} Submitted:</h4>
             <div className="text-xl font-bold text-white">
               <span className="text-blue-300">{sanitizedTeam1Name}</span>
               <span className="mx-2">-</span>
               <span className="text-blue-300">{sanitizedTeam2Name}</span>
             </div>
             <div className="text-2xl font-bold text-white mt-1">
               {match.mapSubmissions?.[mapKey]?.team2SubmittedScore?.team1Score} - {match.mapSubmissions?.[mapKey]?.team2SubmittedScore?.team2Score}
             </div>
           </div>
         </div>

        <div className="text-center space-y-2">
          <p className="text-gray-300 text-sm mb-3">
            Please review the scores and either agree with one of the submissions or create a dispute for admin review.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button
              onClick={handleAgree}
              disabled={isSubmitting}
              className="flex items-center justify-center px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors text-sm"
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              Agree with {isTeam1 ? sanitizedTeam2Name : sanitizedTeam1Name}'s Score
            </button>
            
            <button
              onClick={handleDispute}
              disabled={isDisputing}
              className="flex items-center justify-center px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors text-sm"
            >
              <AlertTriangle className="w-4 h-4 mr-1" />
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
      <div className="bg-gradient-to-br from-blue-500/10 via-cyan-600/10 to-blue-700/10 backdrop-blur-sm rounded-lg p-4 border border-blue-400/30 shadow-lg">
        <div className="text-center mb-4">
          <CheckCircle className="w-8 h-8 text-blue-400 mx-auto mb-2" />
          <h3 className="text-lg font-bold text-white mb-1">Map {mapNumber} Result Submitted!</h3>
          <p className="text-blue-200 text-sm">Waiting for the other team to submit their result for {mapName}</p>
        </div>

                 <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-600/30 mb-4">
           <h4 className="text-white font-bold mb-1 text-sm">Your Submitted Score:</h4>
           <div className="text-xl font-bold text-white">
             <span className="text-blue-300">{sanitizedTeam1Name}</span>
             <span className="mx-2">-</span>
             <span className="text-blue-300">{sanitizedTeam2Name}</span>
           </div>
           <div className="text-2xl font-bold text-white mt-1">
             {match.mapSubmissions?.[mapKey]?.team1SubmittedScore?.team1Score || match.mapSubmissions?.[mapKey]?.team2SubmittedScore?.team1Score} - {match.mapSubmissions?.[mapKey]?.team1SubmittedScore?.team2Score || match.mapSubmissions?.[mapKey]?.team2SubmittedScore?.team2Score}
           </div>
         </div>

        <div className="text-center">
          <div className="flex items-center justify-center text-blue-300 text-sm">
            <Clock className="w-4 h-4 mr-1 animate-pulse" />
            Waiting for {isTeam1 ? sanitizedTeam2Name : sanitizedTeam1Name} to submit...
          </div>
        </div>
      </div>
    );
  }

  // If other team has submitted, show their score and allow agreement or new submission
  if (otherTeamSubmission) {
    return (
      <div className="bg-gradient-to-br from-yellow-500/10 via-orange-600/10 to-yellow-700/10 backdrop-blur-sm rounded-lg p-4 border border-yellow-400/30 shadow-lg">
        <div className="text-center mb-4">
          <AlertTriangle className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
          <h3 className="text-lg font-bold text-white mb-1">Other Team Has Submitted</h3>
          <p className="text-yellow-200 text-sm">Review their score for {mapName} and either agree or submit your own</p>
        </div>

                 <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-600/30 mb-4">
           <h4 className="text-white font-bold mb-1 text-sm">{isTeam1 ? sanitizedTeam2Name : sanitizedTeam1Name} Submitted:</h4>
           <div className="text-xl font-bold text-white">
             <span className="text-blue-300">{sanitizedTeam1Name}</span>
             <span className="mx-2">-</span>
             <span className="text-blue-300">{sanitizedTeam2Name}</span>
           </div>
           <div className="text-2xl font-bold text-white mt-1">
             {otherTeamSubmission.team1Score} - {otherTeamSubmission.team2Score}
           </div>
         </div>

        <div className="space-y-3">
          <div className="text-center">
            <p className="text-gray-300 text-sm mb-3">Do you agree with this score?</p>
            
            <div className="flex flex-col sm:flex-row gap-2 justify-center mb-3">
              <button
                onClick={handleAgree}
                disabled={isSubmitting}
                className="flex items-center justify-center px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors text-sm"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Agree
              </button>
              
              <button
                onClick={() => {
                  setTeam1Score(otherTeamSubmission.team1Score.toString());
                  setTeam2Score(otherTeamSubmission.team2Score.toString());
                }}
                disabled={isSubmitting}
                className="flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors text-sm"
              >
                Submit Different Score
              </button>
            </div>
          </div>

          <div className="border-t border-gray-600 pt-3">
            <h4 className="text-white font-bold mb-2 text-sm">Or submit your own score:</h4>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-white font-medium mb-1 text-sm">{sanitizedTeam1Name}</label>
                <input
                  type="text"
                  value={team1Score}
                  onChange={(e) => handleScoreChange('team1', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-center text-lg font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-white font-medium mb-1 text-sm">{sanitizedTeam2Name}</label>
                <input
                  type="text"
                  value={team2Score}
                  onChange={(e) => handleScoreChange('team2', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-center text-lg font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0"
                />
              </div>
            </div>
            
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !team1Score || !team2Score}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors text-sm"
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
    <div className="bg-gradient-to-br from-green-500/10 via-emerald-600/10 to-green-700/10 backdrop-blur-sm rounded-lg p-4 border border-green-400/30 shadow-lg">
      <div className="text-center mb-4">
        <h3 className="text-lg font-bold text-white mb-1">Submit Map {mapNumber} Result</h3>
        <p className="text-green-200 text-sm">Enter the final score for {mapName}</p>
      </div>

             <div className="grid grid-cols-2 gap-3 mb-4">
         <div>
           <label className="block text-white font-medium mb-1 text-sm">{sanitizedTeam1Name}</label>
           <input
             type="text"
             value={team1Score}
             onChange={(e) => handleScoreChange('team1', e.target.value)}
             className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-center text-lg font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
             placeholder="0"
           />
         </div>
         <div>
           <label className="block text-white font-medium mb-1 text-sm">{sanitizedTeam2Name}</label>
           <input
             type="text"
             value={team2Score}
             onChange={(e) => handleScoreChange('team2', e.target.value)}
             className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-center text-lg font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
             placeholder="0"
           />
         </div>
       </div>

       <div className="text-center mb-4">
         <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-600/30">
           <div className="text-sm text-gray-400 mb-1">Current Score:</div>
           <div className="text-xl font-bold text-white">
             <span className="text-blue-300">{sanitizedTeam1Name}</span>
             <span className="mx-2">-</span>
             <span className="text-blue-300">{sanitizedTeam2Name}</span>
           </div>
           <div className="text-2xl font-bold text-white mt-1">
             {team1Score || '0'} - {team2Score || '0'}
           </div>
         </div>
       </div>

      <div className="text-center">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !team1Score || !team2Score}
          className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors text-sm"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Map Result'}
        </button>
      </div>

      <div className="mt-3 text-center text-xs text-gray-400">
        <p>Both teams must submit and agree on the results</p>
        <p>If scores don't match, a dispute will be created for admin review</p>
      </div>
    </div>
  );
};

export default MapResultSubmission;
