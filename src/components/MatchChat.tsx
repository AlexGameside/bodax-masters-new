import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-hot-toast';
import { Send, MessageCircle, User } from 'lucide-react';
import { collection, addDoc, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getTeamPlayers } from '../services/firebaseService';

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: any;
  teamId?: string;
}

interface MatchChatProps {
  matchId: string;
  userTeam?: any;
  teams: any[];
}

const MatchChat: React.FC<MatchChatProps> = ({ matchId, userTeam, teams }) => {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [teamPlayers, setTeamPlayers] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load team players for username resolution
  useEffect(() => {
    const loadTeamPlayers = async () => {
      if (!teams.length) return;
      
      try {
        const allPlayers: any[] = [];
        for (const team of teams) {
          const players = await getTeamPlayers(team.id);
          allPlayers.push(...players);
        }
        setTeamPlayers(allPlayers);
      } catch (error) {
        console.error('Error loading team players:', error);
      }
    };

    loadTeamPlayers();
  }, [teams]);

  // Real-time chat listener
  useEffect(() => {
    if (!matchId) return;

    const chatRef = collection(db, 'matches', matchId, 'chat');
    const q = query(chatRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatMessages: ChatMessage[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        chatMessages.push({
          id: doc.id,
          userId: data.userId,
          username: data.username,
          message: data.message,
          timestamp: data.timestamp,
          teamId: data.teamId
        });
      });
      setMessages(chatMessages);
    }, (error) => {
      console.error('Error listening to chat:', error);
    });

    return () => unsubscribe();
  }, [matchId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser || !newMessage.trim() || !matchId) return;

    setIsLoading(true);
    
    try {
      const chatRef = collection(db, 'matches', matchId, 'chat');
      
      // Get username from team players or use display name
      let username = currentUser.username || 'Unknown';
      
      // Find the user in team players to get their proper username
      const player = teamPlayers.find(p => p.id === currentUser.id);
      if (player) {
        username = player.username || player.riotId || currentUser.username || 'Unknown';
      } else if (userTeam?.members) {
        // Fallback to team members if player not found in teamPlayers
        const member = userTeam.members.find((m: any) => m.userId === currentUser.id);
        if (member) {
          username = member.username || member.riotName || currentUser.username || 'Unknown';
        }
      }

      await addDoc(chatRef, {
        userId: currentUser.id,
        username: username,
        message: newMessage.trim(),
        timestamp: serverTimestamp(),
        teamId: userTeam?.id
      });

      setNewMessage('');
      
    } catch (error) {
      toast.error('Failed to send message');
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getTeamColor = (teamId?: string) => {
    if (!teamId) return 'text-gray-300';
    return teamId === userTeam?.id ? 'text-blue-400' : 'text-red-400';
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-700">
      <div className="flex items-center mb-3">
        <MessageCircle className="w-4 h-4 text-blue-400 mr-2" />
        <h2 className="text-sm font-semibold text-white">Match Chat</h2>
      </div>
      
      {/* Messages */}
      <div className="bg-gray-900 rounded-lg p-3 h-48 overflow-y-auto mb-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-6">
            <MessageCircle className="w-6 h-6 mx-auto mb-2 text-gray-400" />
            <p className="text-xs">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((msg) => (
              <div key={msg.id} className="flex items-start space-x-2">
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 bg-blue-900 rounded-full flex items-center justify-center">
                    <User className="w-3 h-3 text-blue-400" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className={`text-xs font-medium ${getTeamColor(msg.teamId)}`}>
                      {msg.username}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                  <div className="bg-gray-800 rounded-lg px-2 py-1">
                    <p className="text-xs text-gray-200">{msg.message}</p>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="flex space-x-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 px-2 py-1 text-xs bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
          disabled={isLoading || !currentUser}
          maxLength={200}
        />
        <button
          type="submit"
          disabled={isLoading || !newMessage.trim() || !currentUser}
          className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors flex items-center text-xs"
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
          ) : (
            <Send className="w-3 h-3" />
          )}
        </button>
      </form>

      {!currentUser && (
        <p className="text-xs text-gray-500 mt-2 text-center">
          Please log in to send messages
        </p>
      )}
    </div>
  );
};

export default MatchChat; 