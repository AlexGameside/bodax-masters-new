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
        registeredForTournament: false
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
      <div className="min-h-screen bg-black text-white font-mono flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 z-0 pointer-events-none opacity-10" style={{backgroundImage: 'repeating-linear-gradient(0deg, #fff1 0 1px, transparent 1px 40px), repeating-linear-gradient(90deg, #fff1 0 1px, transparent 1px 40px)'}} />
        <div className="bg-black/60 border border-gray-700 rounded-lg p-8 max-w-md mx-auto relative z-10">
          <div className="text-center mb-8">
            <Users className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-white mb-4">Create Team</h1>
            <p className="text-gray-300">You need to be logged in to create a team.</p>
          </div>
          <button 
            onClick={() => navigate('/login')}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors border border-red-800 w-full"
          >
            Log In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-mono relative overflow-hidden">
      {/* Subtle grid/code background */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-10" style={{backgroundImage: 'repeating-linear-gradient(0deg, #fff1 0 1px, transparent 1px 40px), repeating-linear-gradient(90deg, #fff1 0 1px, transparent 1px 40px)'}} />
      
      <div className="max-w-2xl mx-auto py-8 px-4 relative z-10">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Create New Team</h1>
            <p className="text-gray-300">Set up your team for competitive play</p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* Form */}
        <div className="bg-black/60 border border-gray-700 rounded-lg p-6">
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
                className="w-full px-3 py-2 bg-black/60 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-red-500"
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
                className="w-full px-3 py-2 bg-black/60 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-red-500 uppercase"
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
                className="w-full px-3 py-2 bg-black/60 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-red-500"
                placeholder="Tell us about your team..."
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-gray-400 mt-1">
                Optional description of your team's goals and style
              </p>
            </div>

            <div>
              <label className="block text-gray-300 font-medium mb-2">
                Maximum Members
              </label>
              <select
                name="maxMembers"
                value={formData.maxMembers}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-black/60 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-red-500"
              >
                <option value={5}>5 Members (Minimum)</option>
                <option value={6}>6 Members</option>
                <option value={7}>7 Members</option>
                <option value={8}>8 Members</option>
                <option value={9}>9 Members</option>
                <option value={10}>10 Members (Recommended)</option>
                <option value={12}>12 Members</option>
                <option value={15}>15 Members (Maximum)</option>
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Choose how many members your team can have
              </p>
            </div>

            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
              <h3 className="text-white font-medium mb-2">Team Setup Information</h3>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• You will be the team owner and captain</li>
                <li>• You can invite other players to join your team</li>
                <li>• You can promote members to captain or transfer ownership</li>
                <li>• You can remove members from the team</li>
                <li>• Team name and tag must be unique</li>
              </ul>
            </div>

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors border border-gray-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 disabled:opacity-50 border border-red-800"
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