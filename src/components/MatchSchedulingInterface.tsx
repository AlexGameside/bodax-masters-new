import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { MatchSchedulingService } from '../services/swissTournamentService';
import type { Match, SchedulingProposal, Team, Matchday, User } from '../types/tournament';
import { Send, Clock, Calendar, MessageCircle, CheckCircle, XCircle, AlertCircle, Info, Zap, Users, Trophy } from 'lucide-react';
import MatchReadyUpInterface from './MatchReadyUpInterface';

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
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('20:00');
  const [message, setMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const currentTeam = teams.find(t => t.id === currentTeamId);
  const opponentTeam = teams.find(t => 
    t.id === (match.team1Id === currentTeamId ? match.team2Id : match.team1Id)
  );

  // Calculate scheduling constraints
  const getSchedulingConstraints = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Unity League uses a 7-day scheduling window
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
  };

  const constraints = getSchedulingConstraints();

  // Convert scheduling proposals to chat messages
  useEffect(() => {
    if (match.schedulingProposals) {
      const messages: ChatMessage[] = [];
      
      console.log('🔍 DEBUG: Processing scheduling proposals:', match.schedulingProposals);
      
      match.schedulingProposals.forEach(proposal => {
        console.log('🔍 DEBUG: Processing proposal:', {
          id: proposal.id,
          createdAt: proposal.createdAt,
          createdAtType: typeof proposal.createdAt,
          createdAtConstructor: proposal.createdAt?.constructor?.name,
          respondedAt: proposal.respondedAt,
          respondedAtType: typeof proposal.respondedAt,
          respondedAtConstructor: proposal.respondedAt?.constructor?.name
        });
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
  }, [isAdmin, currentTeamId, teams]);

  const handleSendProposal = async () => {
    if (!selectedDate || !selectedTime) {
      setError('Please select both date and time');
      return;
    }
    
    // For admins without a team, ensure a team is selected
    if (isAdmin && !currentTeamId && !selectedTeamId) {
      setError('Please select a team to act on behalf of');
      return;
    }

    // Validate date constraints
    const proposedDateTime = new Date(`${selectedDate}T${selectedTime}`);
    const now = new Date();
    
    console.log('🔍 DEBUG: Date validation:', {
      selectedDate,
      selectedTime,
      proposedDateTime: proposedDateTime.toISOString(),
      now: now.toISOString(),
      minDate: constraints.minDate.toISOString(),
      maxDate: constraints.maxDate.toISOString(),
      isValid: !isNaN(proposedDateTime.getTime())
    });
    
    if (isNaN(proposedDateTime.getTime())) {
      setError('Invalid date/time combination');
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

    setIsSubmitting(true);
    setError('');

    try {
      console.log('🔍 DEBUG: Sending proposal with:', {
        matchId: match.id,
        teamId: selectedTeamId,
        proposedDateTime,
        message: message.trim() || undefined
      });

      await MatchSchedulingService.sendSchedulingProposal(
        match.id,
        selectedTeamId,
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
        selectedTeamId,
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
  
  // Debug logging for proposals
  console.log('🔍 DEBUG: Scheduling proposals:', match.schedulingProposals);
  console.log('🔍 DEBUG: Pending proposal:', pendingProposal);
  console.log('🔍 DEBUG: Needs response:', needsResponse);
  console.log('🔍 DEBUG: Current team has pending:', currentTeamHasPendingProposal);

  // Check if match should show ready-up interface
  let shouldShowReadyUp: boolean = (match.matchState === 'scheduled' || match.matchState === 'ready_up') && !!match.scheduledTime;
  
  // If match is scheduled, check if it's time for ready-up (15 minutes before scheduled time)
  if (match.matchState === 'scheduled' && match.scheduledTime) {
    const scheduledTime = match.scheduledTime instanceof Date 
      ? match.scheduledTime 
      : new Date((match.scheduledTime as any).seconds * 1000);
    
    const readyUpTime = new Date(scheduledTime.getTime() - (15 * 60 * 1000));
    const now = new Date();
    
    // If it's time for ready-up, show the ready-up interface
    if (now >= readyUpTime) {
      shouldShowReadyUp = true;
    }
  }

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
    <div className="bg-gradient-to-br from-pink-500/10 via-magenta-600/10 to-purple-700/10 backdrop-blur-sm rounded-2xl p-8 border border-pink-400/30 shadow-2xl">
      {/* Header with Unity League styling */}
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-2 rounded-xl">
          <Trophy className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">Schedule Match</h3>
          <div className="text-sm text-pink-200">
            {constraints.daysRemaining} days remaining
          </div>
        </div>
      </div>
      
      {/* Match Info with Unity styling */}
      <div className="bg-black/60 border border-cyan-400/30 rounded-xl p-3 mb-4 shadow-lg backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="text-cyan-300 text-sm font-medium">Match #{match.matchNumber}</div>
          <div className="bg-pink-600/20 px-2 py-1 rounded-full text-pink-300 text-xs">
            R{match.swissRound} • MD{match.matchday}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-white font-bold text-lg">{currentTeam?.name}</div>
          <div className="bg-gradient-to-r from-pink-500 to-purple-600 px-4 py-1 rounded-full text-white font-bold text-sm">vs</div>
          <div className="text-white font-bold text-lg">{opponentTeam?.name}</div>
        </div>
      </div>

      {/* Scheduling Constraints Warning */}
      <div className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border border-yellow-500/30 rounded-lg p-2 mb-3">
        <div className="text-yellow-200 text-xs text-center">
          Deadline: {constraints.deadline.toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin' })}
        </div>
      </div>

      {/* Chat Interface with Unity styling */}
      <div className="bg-black/60 rounded-2xl border border-cyan-400/30 h-[600px] flex flex-col shadow-xl backdrop-blur-sm">
        {/* Chat Header */}
        <div className="p-3 border-b border-cyan-400/30 bg-gradient-to-r from-cyan-600/20 to-blue-600/20 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-cyan-400" />
              <h4 className="text-white font-bold text-sm">Chat</h4>
            </div>
            {needsResponse && (
              <div className="flex items-center bg-yellow-600/20 px-2 py-1 rounded-full text-yellow-400 text-xs font-medium border border-yellow-500/30">
                <AlertCircle className="w-3 h-3 mr-1" />
                Response needed
              </div>
            )}
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {chatMessages.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">No scheduling messages yet</p>
              <p className="text-sm text-pink-200">Send a proposal to get started!</p>
            </div>
          ) : (
            chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.teamId === currentTeamId ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                    msg.status === 'cancelled'
                      ? 'bg-gray-800/40 text-gray-400 border border-gray-700/30 opacity-60'
                      : msg.teamId === currentTeamId
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg'
                      : 'bg-gray-700/80 text-white border border-gray-600/50'
                  }`}
                >
                  {/* Message Header */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs opacity-75 font-medium">{msg.teamName}</span>
                    <span className="text-xs opacity-75">{formatMessageTime(msg.timestamp)}</span>
                  </div>

                  {/* Message Content */}
                  <div className="mb-3">
                    {msg.type === 'proposal' && msg.proposedTime && (
                      <div className="flex items-center mb-3 bg-white/10 rounded-lg p-2">
                        <Calendar className="w-4 h-4 mr-2 text-cyan-300" />
                        <span className="font-bold">{formatDateTime(msg.proposedTime)}</span>
                      </div>
                    )}
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                  </div>

                  {/* Status Badge */}
                  {msg.status && (
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      msg.status === 'accepted' 
                        ? 'bg-green-600/20 text-green-400 border border-green-500/30' 
                        : msg.status === 'denied' 
                        ? 'bg-red-600/20 text-red-400 border border-red-500/30'
                        : msg.status === 'cancelled'
                        ? 'bg-gray-600/20 text-gray-400 border border-gray-500/30'
                        : 'bg-yellow-600/20 text-yellow-400 border border-yellow-500/30'
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
                    <div className="mt-3 p-3 bg-cyan-600/20 rounded-lg text-sm border border-cyan-500/30">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-2 text-cyan-400" />
                        <span className="text-cyan-300 font-medium">Alternative: {formatDateTime(msg.alternativeProposal)}</span>
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
        <div className="p-3 border-t border-cyan-400/30 bg-gradient-to-r from-cyan-600/20 to-blue-600/20 rounded-b-2xl">
          {needsResponse ? (
            /* Response Form */
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-yellow-400 text-lg font-bold mb-2">
                  Respond to {teams.find(t => t.id === pendingProposal?.proposedBy)?.name}'s proposal
                </div>
                <div className="text-pink-200 text-sm">You have {constraints.daysRemaining} days remaining to schedule</div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleRespondToProposal(pendingProposal!.id, 'accept')}
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 text-white px-3 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center text-sm"
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Accept
                </button>
                <button
                  onClick={() => setShowProposalForm(true)}
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 text-white px-3 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center text-sm"
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Deny
                </button>
              </div>
            </div>
          ) : null}
          
          {/* Always show proposal form for admins without a team, or when no response is needed */}
          {(isAdmin && !currentTeamId) || !needsResponse ? (
            /* Send New/Update Proposal Button */
            <div className="space-y-2">
              {currentTeamHasPendingProposal && (
                <div className="text-center text-yellow-400 text-xs">
                  You have a pending proposal. Sending a new one will replace it.
                </div>
              )}
              <button
                onClick={() => setShowProposalForm(true)}
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center text-sm"
              >
                <Send className="w-4 h-4 mr-1" />
                {currentTeamHasPendingProposal ? 'Update Proposal' : 'Send Proposal'}
                {isAdmin && !currentTeamId && selectedTeamId && (
                  <span className="block text-xs text-cyan-300 mt-1">
                    for {teams.find(t => t.id === selectedTeamId)?.name}
                  </span>
                )}
                {isAdmin && currentTeamId && (
                  <span className="block text-xs text-cyan-300 mt-1">
                    for your team
                  </span>
                )}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Proposal Form Modal */}
      {showProposalForm && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 max-w-md w-full mx-4 border border-cyan-400/30 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-3 rounded-xl">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <h4 className="text-xl font-bold text-white">
                {needsResponse ? 'Propose Alternative Time' : 'Send Scheduling Proposal'}
                {isAdmin && !currentTeamId && selectedTeamId && (
                  <span className="block text-sm text-cyan-300 mt-1">
                    on behalf of {teams.find(t => t.id === selectedTeamId)?.name}
                  </span>
                )}
                {isAdmin && currentTeamId && (
                  <span className="block text-sm text-cyan-300 mt-1">
                    for your team: {teams.find(t => t.id === currentTeamId)?.name}
                  </span>
                )}
              </h4>
            </div>
            
            <div className="space-y-6">
              {/* Team Selection for Admins without a team */}
              {isAdmin && !currentTeamId && (
                <div>
                  <label className="block text-cyan-300 text-sm font-medium mb-3">
                    Act on behalf of
                  </label>
                  <select
                    value={selectedTeamId}
                    onChange={(e) => setSelectedTeamId(e.target.value)}
                    className="w-full bg-gray-700 border border-cyan-500/30 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200"
                  >
                    {teams.map(team => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <div>
                <label className="block text-cyan-300 text-sm font-medium mb-3">
                  Proposed Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={constraints.minDate.toISOString().split('T')[0]}
                  max={constraints.maxDate.toISOString().split('T')[0]}
                  className="w-full bg-gray-700 border border-cyan-500/30 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200"
                />
                <div className="text-xs text-pink-200 mt-1">
                  Available: {constraints.minDate.toLocaleDateString()} - {constraints.maxDate.toLocaleDateString()}
                </div>
              </div>

              <div>
                <label className="block text-cyan-300 text-sm font-medium mb-3">
                  Proposed Time
                </label>
                <input
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="w-full bg-gray-700 border border-cyan-500/30 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200"
                />
              </div>

              <div>
                <label className="block text-cyan-300 text-sm font-medium mb-3">
                  Message (Optional)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={needsResponse ? "Why are you denying and what's your alternative?" : "Add a message for your opponent..."}
                  rows={3}
                  className="w-full bg-gray-700 border border-cyan-500/30 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none transition-all duration-200"
                />
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setShowProposalForm(false)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-xl font-medium transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={needsResponse ? 
                    () => handleRespondToProposal(pendingProposal!.id, 'deny') : 
                    handleSendProposal
                  }
                  disabled={isSubmitting || !selectedDate || !selectedTime}
                  className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 text-white py-3 rounded-xl font-bold transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  {isSubmitting ? 'Sending...' : (needsResponse ? 'Send Alternative' : 'Send Proposal')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Messages */}
      {error && (
        <div className="bg-gradient-to-r from-red-600/20 to-pink-600/20 border border-red-500/30 rounded-xl p-4 mt-6">
          <div className="flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-400" />
            <div className="text-red-300 font-medium">{error}</div>
          </div>
        </div>
      )}

      {/* Help Text with Unity styling */}
      <div className="mt-8 p-6 bg-black/60 rounded-2xl border border-pink-400/30">
        <div className="flex items-center gap-3 mb-4">
          <Zap className="w-6 h-6 text-pink-400" />
          <h5 className="text-pink-400 font-bold text-lg">How Unity League Scheduling Works</h5>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-cyan-300">
              <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
              <span>Send a proposal within the 7-day window</span>
            </div>
            <div className="flex items-center gap-2 text-pink-300">
              <div className="w-2 h-2 bg-pink-400 rounded-full"></div>
              <span>Your opponent can accept or propose alternative</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-purple-300">
              <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
              <span>Keep negotiating until you agree on a time</span>
            </div>
            <div className="flex items-center gap-2 text-yellow-300">
              <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
              <span>Auto-scheduled if not agreed by deadline</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchSchedulingInterface; 