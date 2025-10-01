import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Copy, Trash2, ExternalLink, Plus, Users, Calendar } from 'lucide-react';
import type { Match } from '../types/tournament';

interface StreamerLink {
  id: string;
  streamerId: string;
  streamerName: string;
  activeMatchId?: string;
  createdAt: Date;
  lastUsed?: Date;
  isActive: boolean;
}

const StreamerManagement: React.FC = () => {
  const [streamerLinks, setStreamerLinks] = useState<StreamerLink[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newStreamerName, setNewStreamerName] = useState('');
  const [selectedMatchId, setSelectedMatchId] = useState('');

  // Load streamer links and matches
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load streamer links
        const streamerLinksRef = collection(db, 'streamerLinks');
        const streamerQuery = query(streamerLinksRef, orderBy('createdAt', 'desc'));
        
        const unsubscribe = onSnapshot(streamerQuery, (snapshot) => {
          const links = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            lastUsed: doc.data().lastUsed?.toDate(),
          })) as StreamerLink[];
          setStreamerLinks(links);
        });

        // Load matches for dropdown
        const matchesRef = collection(db, 'matches');
        const matchesSnapshot = await getDocs(matchesRef);
        const matchesData = matchesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Match[];
        setMatches(matchesData);

        setLoading(false);
        return unsubscribe;
      } catch (error) {
        console.error('Error loading streamer data:', error);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const generateStreamerId = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const createStreamerLink = async () => {
    if (!newStreamerName.trim()) return;

    try {
      const streamerId = generateStreamerId();
      
      await addDoc(collection(db, 'streamerLinks'), {
        streamerId,
        streamerName: newStreamerName.trim(),
        activeMatchId: selectedMatchId || null,
        createdAt: new Date(),
        isActive: true,
      });

      setNewStreamerName('');
      setSelectedMatchId('');
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error creating streamer link:', error);
    }
  };

  const deleteStreamerLink = async (linkId: string) => {
    if (!confirm('Are you sure you want to delete this streamer link?')) return;

    try {
      await deleteDoc(doc(db, 'streamerLinks', linkId));
    } catch (error) {
      console.error('Error deleting streamer link:', error);
    }
  };

  const copyStreamerLink = (streamerId: string) => {
    const link = `${window.location.origin}/overlay/${streamerId}`;
    navigator.clipboard.writeText(link);
    // You could add a toast notification here
  };

  const copyControlLink = (streamerId: string) => {
    const link = `${window.location.origin}/streamer-control/${streamerId}`;
    navigator.clipboard.writeText(link);
    // You could add a toast notification here
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Streamer Management</h2>
          <p className="text-gray-400">Create and manage streamer overlay links</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Streamer Link
        </button>
      </div>

      {/* Streamer Links List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {streamerLinks.map((link) => (
          <div key={link.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">{link.streamerName}</h3>
                <p className="text-sm text-gray-400">ID: {link.streamerId}</p>
              </div>
              <button
                onClick={() => deleteStreamerLink(link.id)}
                className="text-red-400 hover:text-red-300 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Overlay Link */}
              <div>
                <label className="text-sm font-medium text-gray-300 block mb-1">
                  Overlay URL (for OBS)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={`${window.location.origin}/overlay/${link.streamerId}`}
                    readOnly
                    className="flex-1 px-3 py-2 bg-gray-700 text-white text-sm rounded border border-gray-600"
                  />
                  <button
                    onClick={() => copyStreamerLink(link.streamerId)}
                    className="p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                    title="Copy overlay link"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Control Panel Link */}
              <div>
                <label className="text-sm font-medium text-gray-300 block mb-1">
                  Control Panel URL
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={`${window.location.origin}/streamer-control/${link.streamerId}`}
                    readOnly
                    className="flex-1 px-3 py-2 bg-gray-700 text-white text-sm rounded border border-gray-600"
                  />
                  <button
                    onClick={() => copyControlLink(link.streamerId)}
                    className="p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                    title="Copy control link"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Active Match */}
              {link.activeMatchId && (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Calendar className="w-4 h-4" />
                  <span>Active Match: {link.activeMatchId}</span>
                </div>
              )}

              {/* Status */}
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${link.isActive ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                <span className="text-sm text-gray-400">
                  {link.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold text-white mb-4">Create Streamer Link</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Streamer Name
                </label>
                <input
                  type="text"
                  value={newStreamerName}
                  onChange={(e) => setNewStreamerName(e.target.value)}
                  placeholder="Enter streamer name"
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Active Match (Optional)
                </label>
                <select
                  value={selectedMatchId}
                  onChange={(e) => setSelectedMatchId(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">No active match</option>
                  {matches.map((match) => (
                    <option key={match.id} value={match.id}>
                      {match.team1Id} vs {match.team2Id} - {match.matchState}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={createStreamerLink}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Create Link
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StreamerManagement;






