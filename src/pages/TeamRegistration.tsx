import React, { useState, useEffect } from 'react';
import { Users, User, Mail, MessageCircle, CheckCircle, LogIn, Shield, Crown, UserPlus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { Team, User as UserType } from '../types/tournament';
import LoginModal from '../components/LoginModal';
import { onAuthStateChange } from '../services/authService';

interface TeamRegistrationProps {
  onRegister: (team: Omit<Team, 'id'>) => void;
  teams: Team[];
}

const TeamRegistration = ({ onRegister, teams }: TeamRegistrationProps) => {
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [userTeam, setUserTeam] = useState<Team | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    teamTag: '',
    description: '',
    maxMembers: 5
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChange((user) => {
      setCurrentUser(user);
      if (user) {
        // Check if user already has a team registered
        const existingTeam = teams.find(team => team.ownerId === user.id);
        setUserTeam(existingTeam || null);
      }
    });

    return () => unsubscribe();
  }, [teams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      setShowLoginModal(true);
      return;
    }

    setIsSubmitting(true);

    const team: Omit<Team, 'id'> = {
      name: formData.name,
      ownerId: currentUser.id,
      captainId: currentUser.id,
      members: [{
        userId: currentUser.id,
        role: 'owner',
        joinedAt: new Date(),
        isActive: true
      }],
      teamTag: formData.teamTag,
      description: formData.description,
      createdAt: new Date(),
      registeredForTournament: false,
      maxMembers: formData.maxMembers
    };

    try {
      await onRegister(team);
      setIsSubmitted(true);
    } catch (error) {
      console.error('Error registering team:', error);
      toast.error('Error registering team. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoginSuccess = (user: any) => {
    setCurrentUser(user);
  };

  // If user already has a team registered
  if (userTeam) {
    return (
      <div className="min-h-screen bg-gray-900 section-padding">
        <div className="container-modern">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-white mb-4">Team Already Registered</h1>
              <p className="text-xl text-gray-300">You have already registered a team for Bodax Masters 2025</p>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 shadow-lg">
              <div className="flex items-center justify-center mb-6">
                <CheckCircle className="w-16 h-16 text-green-400 mr-4" />
                <div className="text-left">
                  <h2 className="text-2xl font-bold text-white">{userTeam.name}</h2>
                  <p className="text-gray-300">Team Tag: {userTeam.teamTag}</p>
                  <p className="text-gray-300">Members: {userTeam.members.length}/{userTeam.maxMembers}</p>
                </div>
              </div>
              
              <div className="bg-green-900/50 border border-green-700 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-bold text-green-300 mb-2">Registration Confirmed</h3>
                <p className="text-green-200">
                  Your team "{userTeam.name}" is successfully registered for the tournament.
                  You will receive further instructions via email.
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white">Team Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                  <div>
                    <h4 className="font-medium text-gray-200 mb-2">Description</h4>
                    <p className="text-sm text-gray-300">{userTeam.description}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-200 mb-2">Registration</h4>
                    <p className="text-sm text-gray-300">Created: {userTeam.createdAt.toLocaleDateString()}</p>
                    <p className="text-sm text-gray-300">Tournament Registered: {userTeam.registeredForTournament ? 'Yes' : 'No'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 shadow-lg text-center max-w-md mx-auto">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-4">Registration Successful!</h2>
          <p className="text-gray-300 mb-6">Team "{formData.name}" registered for Bodax Masters 2025.</p>
          <p className="text-sm text-gray-400">You will receive further instructions via email.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 section-padding">
      <div className="container-modern">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-white mb-4">Team Registration</h1>
            <p className="text-xl text-gray-300">Register for Bodax Masters 2025</p>
            
            {!currentUser && (
              <div className="mt-6 p-4 bg-blue-900/50 border border-blue-700 rounded-lg">
                <p className="text-blue-300 mb-3">You need to login or register to submit a team.</p>
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="btn-primary inline-flex items-center space-x-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Login / Register</span>
                </button>
              </div>
            )}
            
            {currentUser && (
              <div className="mt-6 p-4 bg-green-900/50 border border-green-700 rounded-lg">
                <p className="text-green-300">Logged in as: {currentUser.email}</p>
                <p className="text-green-200 text-sm mt-1">You can now register your team below.</p>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="bg-gray-800 border border-gray-700 rounded-xl p-8 shadow-lg space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                <Users className="w-6 h-6 mr-3 text-primary-400" />
                Team Information
              </h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-gray-200 font-medium mb-2">Team Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                    placeholder="Enter team name"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-gray-200 font-medium mb-2 flex items-center">
                      <User className="w-4 h-4 mr-2" />
                      Team Tag *
                    </label>
                    <input
                      type="text"
                      value={formData.teamTag}
                      onChange={(e) => setFormData(prev => ({ ...prev, teamTag: e.target.value }))}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                      placeholder="Enter team tag"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-200 font-medium mb-2 flex items-center">
                      <Users className="w-4 h-4 mr-2" />
                      Max Members
                    </label>
                    <input
                      type="number"
                      value={formData.maxMembers}
                      onChange={(e) => setFormData(prev => ({ ...prev, maxMembers: parseInt(e.target.value) || 5 }))}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                      min="1"
                      max="10"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-200 font-medium mb-2 flex items-center">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Team Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                    placeholder="Enter team description"
                    rows={4}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="submit"
                disabled={isSubmitting || !currentUser}
                className="btn-primary inline-flex items-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Registering...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Register Team</span>
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

export default TeamRegistration; 