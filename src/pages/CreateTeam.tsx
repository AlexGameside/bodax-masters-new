import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Save } from 'lucide-react';
import { addTeam } from '../services/firebaseService';
import type { User as UserType } from '../types/tournament';

interface CreateTeamProps {
  currentUser: UserType | null;
}

const CreateTeam: React.FC<CreateTeamProps> = ({ currentUser }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    teamTag: '',
    description: '',
    maxMembers: 10
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      setError('You must be logged in to create a team');
      return;
    }

    if (!formData.name.trim() || !formData.teamTag.trim()) {
      setError('Team name and tag are required');
      return;
    }

    if (formData.teamTag.length > 5) {
      setError('Team tag must be 5 characters or less');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const teamData = {
        name: formData.name.trim(),
        teamTag: formData.teamTag.trim().toUpperCase(),
        description: formData.description.trim(),
        maxMembers: formData.maxMembers,
        ownerId: currentUser.id,
        captainId: currentUser.id,
        members: [{
          userId: currentUser.id,
          role: 'owner' as const,
          joinedAt: new Date(),
          isActive: true
        }],
        createdAt: new Date(),
        registeredForTournament: false,
        maxMainPlayers: 5,
        maxSubstitutes: 2,
        maxCoaches: 1,
        maxAssistantCoaches: 1,
        maxManagers: 1,
        // Initialize roster change tracking
        rosterChangesUsed: 0,
        rosterLocked: false,
        rosterChangeDeadline: new Date(0) // Set to epoch to make inactive by default
      };

      const teamId = await addTeam(teamData);
      
      // Navigate to team management page
      navigate('/team-management', { 
        state: { message: 'Team created successfully!' }
      });
    } catch (error: any) {
      setError(error.message || 'Failed to create team');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'maxMembers' ? parseInt(value) : value
    }));
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#050505] relative flex items-center justify-center">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-20" 
             style={{
               backgroundImage: 'linear-gradient(rgba(50, 50, 50, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(50, 50, 50, 0.5) 1px, transparent 1px)',
               backgroundSize: '40px 40px'
             }} />
        <div className="bg-[#0a0a0a] border border-gray-800 rounded-lg p-8 max-w-md mx-auto relative z-10">
          {/* Corner accents */}
          <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-red-600"></div>
          <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-red-600"></div>
          <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-red-600"></div>
          <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-red-600"></div>
          
          <div className="text-center mb-8 relative">
            <Users className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-white mb-4 font-bodax tracking-wide uppercase">Create Team</h1>
            <p className="text-gray-400">You need to be logged in to create a team.</p>
          </div>
          <button 
            onClick={() => navigate('/login')}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors w-full"
          >
            Log In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] relative">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20" 
           style={{
             backgroundImage: 'linear-gradient(rgba(50, 50, 50, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(50, 50, 50, 0.5) 1px, transparent 1px)',
             backgroundSize: '40px 40px'
           }} />

      <div className="bg-[#0a0a0a] border-b border-gray-800 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center space-x-6">
            <button
              onClick={() => navigate(-1)}
              className="text-gray-500 hover:text-red-500 transition-colors"
            >
              <ArrowLeft className="w-8 h-8" />
            </button>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white font-bodax tracking-wide uppercase leading-none">
                CREATE NEW TEAM
              </h1>
              <p className="text-red-500 font-mono text-sm tracking-widest uppercase mt-1">
                SET UP YOUR TEAM FOR COMPETITIVE PLAY
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-2xl mx-auto py-8 px-4 relative z-10">
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-700 rounded-lg">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* Form */}
        <div className="bg-[#0a0a0a] border border-gray-800 p-6 rounded-lg relative group overflow-hidden">
          {/* Corner accents */}
          <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-red-600"></div>
          <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-red-600"></div>
          <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-red-600"></div>
          <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-red-600"></div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-gray-300 font-medium mb-2">
                Team Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                placeholder="Enter team name"
                maxLength={50}
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                Choose a unique and memorable name for your team
              </p>
            </div>

            <div>
              <label className="block text-gray-300 font-medium mb-2">
                Team Tag *
              </label>
              <input
                type="text"
                name="teamTag"
                value={formData.teamTag}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 uppercase"
                placeholder="TAG"
                maxLength={5}
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                Short tag (3-5 characters) that will appear in brackets [TAG]
              </p>
            </div>

            <div>
              <label className="block text-gray-300 font-medium mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                placeholder="Tell us about your team..."
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-gray-400 mt-1">
                Optional description of your team's goals and style
              </p>
            </div>

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex-1 px-4 py-2 bg-gray-900/50 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Create Team</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateTeam; 