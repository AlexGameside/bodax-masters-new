import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { MatchSchedulingService } from '../services/swissTournamentService';
import type { Match, SchedulingProposal, Team, Matchday, User, Tournament } from '../types/tournament';
import { Send, Clock, Calendar, MessageCircle, CheckCircle, XCircle, AlertCircle, Info, Zap, Users, Trophy } from 'lucide-react';
import MatchReadyUpInterface from './MatchReadyUpInterface';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { BodaxModal } from './ui';

interface MatchSchedulingInterfaceProps {
  match: Match;
  currentTeamId: string;
  teams: Team[];
  teamPlayers: User[];
  isAdmin?: boolean;
  onSchedulingUpdate: () => void;
  onReadyUp: (teamId: string, roster: {
    mainPlayers: string[];
    substitutes: string[];
    coach?: string;
    assistantCoach?: string;
    manager?: string;
  }) => Promise<void>;
  onStartMatch: () => Promise<void>;
}

interface ChatMessage {
  id: string;
  type: 'proposal' | 'response' | 'system';
  teamId: string;
  teamName: string;
  timestamp: Date | any; // Can be Date or Firestore Timestamp
  content: string;
  proposedTime?: Date | any; // Can be Date or Firestore Timestamp
  status?: 'pending' | 'accepted' | 'denied' | 'cancelled';
  responseMessage?: string;
  alternativeProposal?: Date | any; // Can be Date or Firestore Timestamp
}

const MatchSchedulingInterface: React.FC<MatchSchedulingInterfaceProps> = ({
  match,
  currentTeamId,
  teams,
  teamPlayers,
  isAdmin = false,
  onSchedulingUpdate,
  onReadyUp,
  onStartMatch
}) => {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [currentMatchday, setCurrentMatchday] = useState<Matchday | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('20:00');
  const [message, setMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const lastFetchedTournamentId = useRef<string | null>(null);

  const currentTeam = teams.find(t => t.id === currentTeamId);
  const opponentTeam = teams.find(t => 
    t.id === (match.team1Id === currentTeamId ? match.team2Id : match.team1Id)
  );

  // Fetch tournament data and current matchday to get the correct scheduling window
  useEffect(() => {
    // Reset if tournamentId changed
    if (lastFetchedTournamentId.current && lastFetchedTournamentId.current !== match.tournamentId) {
      lastFetchedTournamentId.current = null;
      setTournament(null);
      setCurrentMatchday(null);
    }

    // Skip if we already have the tournament data for this tournamentId
    if (!match.tournamentId || lastFetchedTournamentId.current === match.tournamentId) {
      return;
    }

    const fetchTournamentAndMatchday = async () => {
      try {
        // Mark that we're fetching this tournament
        lastFetchedTournamentId.current = match.tournamentId;
        
        // Fetch tournament data
        const tournamentRef = doc(db, 'tournaments', match.tournamentId);
        const tournamentDoc = await getDoc(tournamentRef);
        if (tournamentDoc.exists()) {
          const tournamentData = tournamentDoc.data() as Tournament;
          setTournament(tournamentData);
          
          // Fetch current matchday data for Swiss tournaments
          if (tournamentData.stageManagement?.swissStage?.currentRound && 
              match.tournamentType === 'swiss-round') {
            const currentRound = tournamentData.stageManagement.swissStage.currentRound;
            
            
            // Import the SwissTournamentService to get matchday data
            const { SwissTournamentService } = await import('../services/swissTournamentService');
            const matchday = await SwissTournamentService.getMatchdayByNumber(match.tournamentId, currentRound);
            
            if (matchday) {
              setCurrentMatchday(matchday);
            }
          }
        }
      } catch (error: any) {
        // Handle rate limiting errors
        if (error?.code === 'resource-exhausted' || error?.code === 429) {
          console.warn('Rate limited while fetching tournament, will retry later');
          // Reset the ref so we can retry later
          lastFetchedTournamentId.current = null;
          // Don't throw, just log - the component can work without tournament data
          return;
        }
        console.error('Error fetching tournament and matchday:', error);
        // Reset the ref on error so we can retry
        lastFetchedTournamentId.current = null;
      }
    };

    fetchTournamentAndMatchday();
  }, [match.tournamentId, match.tournamentType]);

  // Calculate scheduling constraints based on matchday
  const getSchedulingConstraints = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    
    // Get matchday constraints if this is a Swiss tournament match
    if (tournament?.stageManagement?.swissStage?.currentRound && (match.tournamentType === 'swiss-round')) {
      // Use actual matchday data from database
      if (currentMatchday) {
        
        // Use the actual matchday dates
        const minDate = new Date(currentMatchday.startDate.getFullYear(), currentMatchday.startDate.getMonth(), currentMatchday.startDate.getDate());
        const maxDate = new Date(currentMatchday.endDate.getFullYear(), currentMatchday.endDate.getMonth(), currentMatchday.endDate.getDate(), 23, 59, 59);
        
        return {
          minDate,
          maxDate,
          deadline: currentMatchday.endDate,
          daysRemaining: Math.ceil((currentMatchday.endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
        };
      } else {
        
        // Fallback to calculation if matchday data not available
        const matchdayNumber = tournament.stageManagement.swissStage.currentRound;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() + (matchdayNumber - 1) * 7);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6);
        
        const minDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
        const maxDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59);
        
        return {
          minDate,
          maxDate,
          deadline: endDate,
          daysRemaining: Math.ceil((endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
        };
      }
    } else {
      // Fallback to generic 7-day window for non-Swiss matches
      const schedulingWindow = 7; // days
      const deadline = new Date(today.getTime() + schedulingWindow * 24 * 60 * 60 * 1000);
      
      // Minimum time: tomorrow
      const minDate = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      
      // Maximum time: 7 days from now
      const maxDate = new Date(today.getTime() + schedulingWindow * 24 * 60 * 60 * 1000);
      
      return {
        minDate,
        maxDate,
        deadline,
        daysRemaining: Math.ceil((deadline.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
      };
    }
  };

  const constraints = getSchedulingConstraints();

  // Convert scheduling proposals to chat messages
  useEffect(() => {
    if (match.schedulingProposals) {
      const messages: ChatMessage[] = [];
      
      match.schedulingProposals.forEach(proposal => {
        // Add proposal message
        const proposingTeam = teams.find(t => t.id === proposal.proposedBy);
        
        // Ensure timestamp is a proper Date object
        let proposalTimestamp: Date;
        if (proposal.createdAt instanceof Date) {
          proposalTimestamp = proposal.createdAt;
        } else if (proposal.createdAt && typeof proposal.createdAt === 'object' && 'toDate' in proposal.createdAt) {
          proposalTimestamp = (proposal.createdAt as any).toDate();
        } else if (proposal.createdAt) {
          proposalTimestamp = new Date(proposal.createdAt);
        } else {
          proposalTimestamp = new Date();
        }
        
        // Ensure proposedTime is a proper Date object
        let proposedTimeDate: Date;
        if (proposal.proposedTime instanceof Date) {
          proposedTimeDate = proposal.proposedTime;
        } else if (proposal.proposedTime && typeof proposal.proposedTime === 'object' && 'seconds' in (proposal.proposedTime as any)) {
          // It's a Firestore Timestamp
          proposedTimeDate = new Date((proposal.proposedTime as any).seconds * 1000);
        } else if (proposal.proposedTime) {
          proposedTimeDate = new Date(proposal.proposedTime);
        } else {
          proposedTimeDate = new Date();
        }
        
        messages.push({
          id: `${proposal.id}-proposal`,
          type: 'proposal',
          teamId: proposal.proposedBy,
          teamName: proposingTeam?.name || 'Unknown Team',
          timestamp: proposalTimestamp,
          content: proposal.message || 'Proposed a match time',
          proposedTime: proposedTimeDate,
          status: proposal.status
        });

        // Add response message if proposal has been responded to
        if (proposal.status !== 'pending' && proposal.respondedAt) {
          // For accepted/denied proposals, create a response message
          const respondingTeam = teams.find(t => t.id !== proposal.proposedBy);
          
          // Ensure respondedAt timestamp is a proper Date object
          let responseTimestamp: Date;
          if (proposal.respondedAt instanceof Date) {
            responseTimestamp = proposal.respondedAt;
          } else if (proposal.respondedAt && typeof proposal.respondedAt === 'object' && 'toDate' in proposal.respondedAt) {
            responseTimestamp = (proposal.respondedAt as any).toDate();
          } else if (proposal.respondedAt) {
            responseTimestamp = new Date(proposal.respondedAt);
          } else {
            responseTimestamp = new Date();
          }
          
          // Ensure alternativeProposal is a proper Date object
          let alternativeProposalDate: Date | undefined;
          if (proposal.alternativeProposal instanceof Date) {
            alternativeProposalDate = proposal.alternativeProposal;
          } else if (proposal.alternativeProposal && typeof proposal.alternativeProposal === 'object' && 'seconds' in (proposal.alternativeProposal as any)) {
            // It's a Firestore Timestamp
            alternativeProposalDate = new Date((proposal.alternativeProposal as any).seconds * 1000);
          } else if (proposal.alternativeProposal) {
            alternativeProposalDate = new Date(proposal.alternativeProposal);
          } else {
            alternativeProposalDate = undefined;
          }
          
          messages.push({
            id: `${proposal.id}-response`,
            type: 'response',
            teamId: respondingTeam?.id || 'unknown',
            teamName: respondingTeam?.name || 'Unknown Team',
            timestamp: responseTimestamp,
            content: proposal.responseMessage || (proposal.status === 'accepted' ? 'Accepted the proposal' : 'Denied the proposal'),
            status: proposal.status,
            responseMessage: proposal.responseMessage,
            alternativeProposal: alternativeProposalDate
          });
        }
      });

      // Sort by timestamp
      messages.sort((a, b) => {
        const aTime = a.timestamp && typeof a.timestamp === 'object' && a.timestamp.seconds !== undefined 
          ? a.timestamp.seconds * 1000 
          : a.timestamp instanceof Date 
            ? a.timestamp.getTime() 
            : 0;
        const bTime = b.timestamp && typeof b.timestamp === 'object' && b.timestamp.seconds !== undefined 
          ? b.timestamp.seconds * 1000 
          : b.timestamp instanceof Date 
            ? b.timestamp.getTime() 
            : 0;
        return aTime - bTime;
      });
      setChatMessages(messages);
    }
  }, [match.schedulingProposals, teams]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Set default date to tomorrow and initialize selectedTeamId
  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setSelectedDate(tomorrow.toISOString().split('T')[0]);
    
    // If user has a team, use that team
    if (currentTeamId) {
      setSelectedTeamId(currentTeamId);
  
    }
    // For admins without a currentTeamId, set selectedTeamId to the first team
    else if (isAdmin && teams.length > 0) {
      setSelectedTeamId(teams[0].id);

    }
    // Fallback: if teams are loaded but no team is selected, select the first one
    else if (teams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(teams[0].id);

    }
    

  }, [isAdmin, currentTeamId, teams]);

  const handleSendProposal = async () => {

    if (!selectedDate || !selectedTime) {
      setError('Please select both date and time');
      return;
    }
    
    if (!selectedTeamId) {
      // Try to set a default team if none is selected
      if (teams.length > 0) {
        setSelectedTeamId(teams[0].id);
  
      } else {
        setError('No team selected. Please select a team first.');
        return;
      }
    }
    
    // For admins without a team, ensure a team is selected
    if (isAdmin && !currentTeamId && !selectedTeamId) {
      setError('Please select a team to act on behalf of');
      return;
    }

    // Validate date constraints
    const proposedDateTime = new Date(`${selectedDate}T${selectedTime}`);
    const now = new Date();
    

    
    if (isNaN(proposedDateTime.getTime())) {
      setError('Please select a valid date and time');
      return;
    }
    
    if (proposedDateTime <= now) {
      setError('Proposed time must be in the future');
      return;
    }
    
    if (proposedDateTime < constraints.minDate || proposedDateTime > constraints.maxDate) {
      setError(`Proposed time must be between ${constraints.minDate.toLocaleDateString()} and ${constraints.maxDate.toISOString()}`);
      return;
    }

    // Simple team ID handling - no complex validation
    const teamIdToUse = selectedTeamId || teams[0]?.id;
    
    setIsSubmitting(true);
    setError('');

    try {


      await MatchSchedulingService.sendSchedulingProposal(
        match.id,
        teamIdToUse,
        proposedDateTime,
        message.trim() || undefined
      );

      // Show success message
      toast.success('Scheduling proposal sent successfully!');
      
      setMessage('');
      setShowProposalForm(false);
      
      // Notify parent component that scheduling was updated
      onSchedulingUpdate();
    } catch (error) {
      console.error('Error sending proposal:', error);
      setError(error instanceof Error ? error.message : 'Failed to send proposal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRespondToProposal = async (proposalId: string, response: 'accept' | 'deny') => {
    setIsSubmitting(true);
    setError('');

    try {
      // For admins without a team, ensure a team is selected
      if (isAdmin && !currentTeamId && !selectedTeamId) {
        setError('Please select a team to act on behalf of');
        setIsSubmitting(false);
        return;
      }
      let alternativeProposal: Date | undefined;
      let responseMessage = '';
      let teamIdToUseForAlternative = selectedTeamId || teams[0]?.id;

      if (response === 'deny') {
        // For deny, require alternative proposal
        if (!selectedDate || !selectedTime) {
          setError('Please provide an alternative date and time when denying');
          setIsSubmitting(false);
          return;
        }
        
        // Validate alternative proposal
        const proposedDateTime = new Date(`${selectedDate}T${selectedTime}`);
        const now = new Date();
        
        if (proposedDateTime <= now) {
          setError('Alternative time must be in the future');
          setIsSubmitting(false);
          return;
        }
        
        if (proposedDateTime < constraints.minDate || proposedDateTime > constraints.maxDate) {
          setError(`Alternative time must be between ${constraints.minDate.toLocaleDateString()} and ${constraints.maxDate.toLocaleDateString()}`);
          setIsSubmitting(false);
          return;
        }

        // Ensure we have a valid team ID for validation
        if (!teamIdToUseForAlternative) {
          setError('Team selection error. Please refresh the page and try again.');
          setIsSubmitting(false);
          return;
        }
        

        

        
        alternativeProposal = proposedDateTime;
        responseMessage = message.trim() || 'Alternative time proposed';
      } else {
        responseMessage = message.trim() || 'Accepted';
      }
      
      // Ensure we don't pass empty strings
      if (!responseMessage.trim()) {
        responseMessage = response === 'accept' ? 'Accepted' : 'Alternative time proposed';
      }

      await MatchSchedulingService.respondToSchedulingProposal(
        match.id,
        proposalId,
        teamIdToUseForAlternative,
        response,
        responseMessage,
        alternativeProposal
      );

      // Show success message
      const actionText = response === 'accept' ? 'accepted' : 'responded to';
      toast.success(`Proposal ${actionText} successfully!`);
      
      setMessage('');
      setShowProposalForm(false);
      
      // Notify parent component that scheduling was updated
      onSchedulingUpdate();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to respond to proposal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDateTime = (date: Date | string | any | undefined) => {
    if (!date) return 'TBD';
    
    try {
      let dateObj: Date;
      
      // Handle Firestore Timestamp objects
      if (date && typeof date === 'object' && date.seconds !== undefined) {
        dateObj = new Date(date.seconds * 1000);
        console.log('🕒 Firestore Timestamp conversion:', {
          originalSeconds: date.seconds,
          convertedDate: dateObj,
          utcString: dateObj.toISOString(),
          localString: dateObj.toString()
        });
      } else if (typeof date === 'string') {
        dateObj = new Date(date);
      } else if (date instanceof Date) {
        dateObj = date;
      } else {
        console.warn('Unsupported date type received:', date);
        return 'TBD';
      }
      
      if (isNaN(dateObj.getTime())) {
        console.warn('Invalid date received:', date);
        return 'TBD';
      }
      
      const formatted = new Intl.DateTimeFormat('de-DE', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Berlin'
      }).format(dateObj);
      
      console.log('🕒 Final formatted time:', {
        input: date,
        dateObj: dateObj.toISOString(),
        formatted: formatted
      });
      
      return formatted;
    } catch (error) {
      console.error('Error formatting date:', error, 'Date value:', date);
      return 'TBD';
    }
  };

  const formatMessageTime = (date: Date | any) => {
    try {
      let dateObj: Date;
      
      // Handle Firestore Timestamp objects
      if (date && typeof date === 'object' && date.seconds !== undefined) {
        dateObj = new Date(date.seconds * 1000);
      } else if (date instanceof Date) {
        dateObj = date;
      } else {
        console.warn('Unsupported timestamp type for formatMessageTime:', date);
        return '--:--';
      }
      
      if (isNaN(dateObj.getTime())) {
        console.warn('Invalid timestamp received:', date);
        return '--:--';
      }
      
      return new Intl.DateTimeFormat('de-DE', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Berlin'
      }).format(dateObj);
    } catch (error) {
      console.error('Error formatting message time:', error, 'Timestamp value:', date);
      return '--:--';
    }
  };

  // Check if there's a pending proposal that needs response
  const pendingProposal = match.schedulingProposals?.find(p => p.status === 'pending');
  
  // For admins without a currentTeamId, they can respond to any pending proposal
  // For regular users and admins with a team, they can only respond to proposals from the other team
  const needsResponse = pendingProposal && (
    (isAdmin && !currentTeamId) ? true : pendingProposal.proposedBy !== currentTeamId
  );
  
  // Check if current team has a pending proposal
  const currentTeamHasPendingProposal = currentTeamId ? match.schedulingProposals?.some(
    p => p.status === 'pending' && p.proposedBy === currentTeamId
  ) : false;
  
  // Check if match should show ready-up interface
  let shouldShowReadyUp: boolean = match.matchState === 'ready_up' && !!match.scheduledTime;
  
  // Don't show ready-up interface if match is still in 'scheduled' state
  // Let the MatchPage handle the transition to 'ready_up' first

  if (shouldShowReadyUp) {
    return (
      <MatchReadyUpInterface
        match={match}
        currentTeamId={currentTeamId}
        teams={teams}
        teamPlayers={teamPlayers}
        onReadyUp={onReadyUp}
        onStartMatch={onStartMatch}
      />
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
      {/* Compact Chat Interface */}
      <div className="bg-gray-800 rounded-lg border border-gray-600 h-[350px] flex flex-col">
        {/* Chat Header */}
        <div className="p-3 border-b border-gray-600 bg-gray-750 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-blue-400" />
              <h4 className="text-white text-sm font-medium">Schedule Match</h4>
            </div>
            {needsResponse && (
              <div className="flex items-center bg-yellow-600/20 px-2 py-1 rounded text-yellow-400 text-xs font-medium">
                <AlertCircle className="w-3 h-3 mr-1" />
                Response needed
              </div>
            )}
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {chatMessages.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No messages yet</p>
              <p className="text-xs text-gray-500 mt-1">Start the conversation by sending a proposal</p>
            </div>
          ) : (
            chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.teamId === currentTeamId ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[280px] px-3 py-2 rounded-lg text-sm ${
                    msg.status === 'cancelled'
                      ? 'bg-gray-700 text-gray-400 opacity-60'
                      : msg.teamId === currentTeamId
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-white'
                  }`}
                >
                  {/* Message Header */}
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs opacity-75 font-medium">{msg.teamName}</span>
                    <span className="text-xs opacity-75">{formatMessageTime(msg.timestamp)}</span>
                  </div>

                  {/* Message Content */}
                  <div className="mb-1">
                    {msg.type === 'proposal' && msg.proposedTime && (
                      <div className="flex items-center mb-1 bg-white/10 rounded px-2 py-1">
                        <Calendar className="w-3 h-3 mr-1 text-blue-300" />
                        <span className="font-semibold text-xs">{formatDateTime(msg.proposedTime)}</span>
                      </div>
                    )}
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                  </div>

                  {/* Status Badge */}
                  {msg.status && (
                    <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                      msg.status === 'accepted' 
                        ? 'bg-green-600/20 text-green-400 border border-green-600' 
                        : msg.status === 'denied' 
                        ? 'bg-red-600/20 text-red-400 border border-red-600'
                        : msg.status === 'cancelled'
                        ? 'bg-gray-600/20 text-gray-400 border border-gray-600'
                        : 'bg-yellow-600/20 text-yellow-400 border border-yellow-600'
                    }`}>
                      {msg.status === 'accepted' && <CheckCircle className="w-3 h-3 mr-1" />}
                      {msg.status === 'denied' && <XCircle className="w-3 h-3 mr-1" />}
                      {msg.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                      {msg.status === 'cancelled' && <XCircle className="w-3 h-3 mr-1" />}
                      {msg.status.charAt(0).toUpperCase() + msg.status.slice(1)}
                    </div>
                  )}

                  {/* Alternative Proposal */}
                  {msg.alternativeProposal && (
                    <div className="mt-2 p-2 bg-blue-600/20 rounded text-xs border border-blue-600">
                      <div className="flex items-center">
                        <Clock className="w-3 h-3 mr-1 text-blue-400" />
                        <span className="text-blue-300 font-medium">Alternative: {formatDateTime(msg.alternativeProposal)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Action Area */}
        <div className="p-3 border-t border-gray-600 bg-gray-750 rounded-b-lg">
          {needsResponse ? (
            /* Response Form */
            <div className="space-y-2">
              <div className="text-center">
                <div className="text-yellow-400 text-sm font-medium">
                  Respond to {teams.find(t => t.id === pendingProposal?.proposedBy)?.name}'s proposal
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleRespondToProposal(pendingProposal!.id, 'accept')}
                  disabled={isSubmitting}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-3 py-2 rounded text-sm font-medium transition-colors flex items-center justify-center"
                >
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Accept
                </button>
                <button
                  onClick={() => setShowProposalForm(true)}
                  disabled={isSubmitting}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white px-3 py-2 rounded text-sm font-medium transition-colors flex items-center justify-center"
                >
                  <XCircle className="w-3 h-3 mr-1" />
                  Deny
                </button>
              </div>
            </div>
          ) : null}
          
          {/* Always show proposal form for admins without a team, or when no response is needed */}
          {(isAdmin && !currentTeamId) || !needsResponse ? (
            /* Send New/Update Proposal Button */
            <div>
              {currentTeamHasPendingProposal && (
                <div className="text-center text-yellow-400 text-xs mb-2">
                  You have a pending proposal. Sending a new one will replace it.
                </div>
              )}
              <button
                onClick={() => setShowProposalForm(true)}
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-2 rounded text-sm font-medium transition-colors flex items-center justify-center"
              >
                <Send className="w-3 h-3 mr-1" />
                {currentTeamHasPendingProposal ? 'Update Proposal' : 'Send Proposal'}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Proposal Form Modal */}
      <BodaxModal
        isOpen={showProposalForm}
        onClose={() => setShowProposalForm(false)}
        title={needsResponse ? 'Alternative Time' : 'Schedule Match'}
        subtitle={needsResponse ? 'Deny & propose a new time' : 'Send a scheduling proposal'}
        maxWidthClassName="max-w-md"
        footer={
          <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
            <button
              type="button"
              onClick={() => setShowProposalForm(false)}
              className="px-5 py-3 border border-gray-700 text-gray-300 hover:text-white hover:border-gray-500 font-bodax text-xl uppercase tracking-wider transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={needsResponse ? 
                () => handleRespondToProposal(pendingProposal!.id, 'deny') : 
                handleSendProposal
              }
              disabled={isSubmitting || !selectedDate || !selectedTime}
              className="px-5 py-3 bg-red-600 hover:bg-red-700 text-white border border-red-800 font-bodax text-xl uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Sending...' : (needsResponse ? 'Send Alternative' : 'Send Proposal')}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
              {/* Scheduling Window Info */}
              {(tournament?.stageManagement?.swissStage?.currentRound && (match.tournamentType === 'swiss-round')) && (
                <div className="bg-black/30 border border-gray-800 p-4">
                  <div className="flex items-center space-x-2 text-red-500 text-sm mb-1 font-mono uppercase tracking-widest">
                    <Calendar className="w-4 h-4" />
                    <span className="font-medium">Round {tournament.stageManagement.swissStage.currentRound} Scheduling Window</span>
                  </div>
                  <div className="text-xs text-gray-400 font-mono">
                    Available: {constraints.minDate.toLocaleDateString()} - {constraints.maxDate.toLocaleDateString()}
                    {constraints.daysRemaining > 0 && (
                      <span className="ml-2 text-green-300">
                        ({constraints.daysRemaining} days remaining)
                      </span>
                    )}
                  </div>
                </div>
              )}
              
              {/* Team Selection for Admins without a team */}
              {isAdmin && !currentTeamId && (
                <div>
                  <label className="block text-gray-400 text-sm font-bold mb-2 font-mono uppercase tracking-widest">
                    Act on behalf of
                  </label>
                  <select
                    value={selectedTeamId}
                    onChange={(e) => setSelectedTeamId(e.target.value)}
                    className="w-full bg-black/40 border border-gray-800 px-3 py-3 text-white text-sm focus:outline-none focus:border-red-600 font-mono uppercase tracking-wider"
                  >
                    {teams.map(team => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 text-sm font-bold mb-2 font-mono uppercase tracking-widest">
                    Date
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    min={constraints.minDate.toISOString().split('T')[0]}
                    max={constraints.maxDate.toISOString().split('T')[0]}
                    className="w-full bg-black/40 border border-gray-800 px-3 py-3 text-white text-sm focus:outline-none focus:border-red-600 font-mono uppercase tracking-wider"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm font-bold mb-2 font-mono uppercase tracking-widest">
                    Time
                  </label>
                  <input
                    type="time"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="w-full bg-black/40 border border-gray-800 px-3 py-3 text-white text-sm focus:outline-none focus:border-red-600 font-mono uppercase tracking-wider"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-sm font-bold mb-2 font-mono uppercase tracking-widest">
                  Message (Optional)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={needsResponse ? "Why are you denying and what's your alternative?" : "Add a message for your opponent..."}
                  rows={3}
                  className="w-full bg-black/40 border border-gray-800 px-3 py-3 text-white text-sm focus:outline-none focus:border-red-600 resize-none"
                />
              </div>

              {/* Error Message Display */}
              {error && (
                <div className="bg-red-900/10 border border-red-900 p-3">
                  <div className="flex items-center gap-1">
                    <XCircle className="w-3 h-3 text-red-400" />
                    <div className="text-red-300 text-sm font-mono uppercase tracking-widest">{error}</div>
                  </div>
                </div>
              )}
        </div>
      </BodaxModal>
    </div>
  );
};

export default MatchSchedulingInterface; 