import React, { useState } from 'react';
import { X, Flag, Gamepad2, CheckCircle, AlertCircle } from 'lucide-react';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { toast } from 'react-hot-toast';

interface ProfileCompletionModalProps {
  isOpen: boolean;
  userId: string;
  currentUser: any;
  onComplete: () => Promise<void>;
}

const NATIONALITIES = [
  'Germany',
  'Austria',
  'Switzerland',
  'France',
  'Spain',
  'Italy',
  'Netherlands',
  'Belgium',
  'Poland',
  'Czech Republic',
  'Slovakia',
  'Hungary',
  'Romania',
  'Bulgaria',
  'Croatia',
  'Slovenia',
  'Serbia',
  'Bosnia and Herzegovina',
  'Montenegro',
  'North Macedonia',
  'Albania',
  'Kosovo',
  'United Kingdom',
  'Ireland',
  'Denmark',
  'Sweden',
  'Norway',
  'Finland',
  'Iceland',
  'Portugal',
  'Greece',
  'Cyprus',
  'Malta',
  'Luxembourg',
  'Estonia',
  'Latvia',
  'Lithuania',
  'United States',
  'Canada',
  'Australia',
  'New Zealand',
  'Brazil',
  'Argentina',
  'Chile',
  'Colombia',
  'Mexico',
  'Japan',
  'South Korea',
  'China',
  'India',
  'Russia',
  'Ukraine',
  'Belarus',
  'Turkey',
  'Israel',
  'United Arab Emirates',
  'Saudi Arabia',
  'Egypt',
  'South Africa',
  'Nigeria',
  'Kenya',
  'Morocco',
  'Tunisia',
  'Algeria',
  'Other'
];

const ProfileCompletionModal: React.FC<ProfileCompletionModalProps> = ({
  isOpen,
  userId,
  currentUser,
  onComplete
}) => {
  const [selectedNationality, setSelectedNationality] = useState<string>(currentUser?.nationality || '');
  const [riotId, setRiotId] = useState<string>(currentUser?.riotId || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check what's missing
  const needsRiotId = !currentUser?.riotId || currentUser.riotId.trim() === '';
  const needsNationality = !currentUser?.nationality || currentUser.nationality.trim() === '';
  const needsBoth = needsRiotId && needsNationality;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate Riot ID if needed
    if (needsRiotId && (!riotId.trim() || !riotId.includes('#'))) {
      toast.error('Please enter a valid Riot ID with # symbol');
      return;
    }

    // Validate nationality if needed
    if (needsNationality && !selectedNationality) {
      toast.error('Please select your nationality');
      return;
    }

    setIsSubmitting(true);

    try {
      const userRef = doc(db, 'users', userId);
      const updates: any = { updatedAt: new Date() };
      
      // Only update what's missing
      if (needsRiotId) {
        updates.riotId = riotId.trim();
        updates.riotIdSet = true;
        updates.riotIdSetAt = new Date();
      }
      if (needsNationality) {
        updates.nationality = selectedNationality;
      }

      await updateDoc(userRef, updates);

      const completedItems = [];
      if (needsRiotId) completedItems.push('Riot ID');
      if (needsNationality) completedItems.push('Nationality');
      
      toast.success(`${completedItems.join(' and ')} saved successfully!`);
      await onComplete();
    } catch (error) {

      toast.error('Failed to save profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-start justify-center z-50 p-4 pt-16 overflow-y-auto">
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md mt-8 mb-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
              <AlertCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Profile Completion Required</h2>
              <p className="text-sm text-gray-400">
                {needsBoth 
                  ? 'Complete your profile to participate in tournaments'
                  : needsRiotId 
                    ? 'Add your Riot ID to participate in tournaments'
                    : 'Select your nationality to participate in tournaments'
                }
              </p>
            </div>
          </div>
          <button
            onClick={() => {/* Modal cannot be closed until completed */}}
            className="text-gray-400 hover:text-gray-300 transition-colors"
            disabled
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Requirements Status */}
          <div className="mb-6 space-y-3">
            <div className={`flex items-center space-x-3 p-3 rounded-lg ${needsRiotId ? 'bg-red-900/20 border border-red-700/30' : 'bg-green-900/20 border border-green-700/30'}`}>
              <Gamepad2 className={`w-5 h-5 ${needsRiotId ? 'text-red-400' : 'text-green-400'}`} />
              <div>
                <p className={`text-sm font-medium ${needsRiotId ? 'text-red-300' : 'text-green-300'}`}>
                  Riot ID
                </p>
                <p className={`text-xs ${needsRiotId ? 'text-red-400' : 'text-green-400'}`}>
                  {needsRiotId ? 'Required for tournament participation' : 'Completed ✓'}
                </p>
              </div>
            </div>

            <div className={`flex items-center space-x-3 p-3 rounded-lg ${needsNationality ? 'bg-red-900/20 border border-red-700/30' : 'bg-green-900/20 border border-green-700/30'}`}>
              <Flag className={`w-5 h-5 ${needsNationality ? 'text-red-400' : 'text-green-400'}`} />
              <div>
                <p className={`text-sm font-medium ${needsNationality ? 'text-red-300' : 'text-green-300'}`}>
                  Nationality
                </p>
                <p className={`text-xs ${needsNationality ? 'text-red-400' : 'text-green-400'}`}>
                  {needsNationality ? 'Required for tournament participation' : 'Completed ✓'}
                </p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Riot ID Field */}
            {needsRiotId && (
              <div>
                <label htmlFor="riotId" className="block text-sm font-medium text-gray-300 mb-2">
                  Riot ID *
                </label>
                <div className="relative">
                  <Gamepad2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    id="riotId"
                    value={riotId}
                    onChange={(e) => setRiotId(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your Riot ID (e.g., Username#1234)"
                    required={needsRiotId}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Format: Username#1234 (must include # symbol)
                </p>
              </div>
            )}

            {/* Nationality Field */}
            {needsNationality && (
              <div>
                <label htmlFor="nationality" className="block text-sm font-medium text-gray-300 mb-2">
                  Nationality *
                </label>
                <div className="relative">
                  <select
                    id="nationality"
                    value={selectedNationality}
                    onChange={(e) => setSelectedNationality(e.target.value)}
                    className="w-full px-4 py-3 pr-10 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none cursor-pointer"
                    required={needsNationality}
                  >
                    <option value="">Choose your nationality...</option>
                    {NATIONALITIES.map((nationality) => (
                      <option key={nationality} value={nationality}>
                        {nationality}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={
                isSubmitting || 
                (needsRiotId && (!riotId.trim() || !riotId.includes('#'))) ||
                (needsNationality && !selectedNationality)
              }
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>
                    {needsBoth 
                      ? 'Complete Profile'
                      : needsRiotId 
                        ? 'Save Riot ID'
                        : 'Save Nationality'
                    }
                  </span>
                </>
              )}
            </button>
          </form>

          {/* Info */}
          <div className="mt-4 p-3 bg-blue-900/20 border border-blue-700/30 rounded-lg">
            <p className="text-sm text-blue-300">
              <strong>Note:</strong> Both Riot ID and nationality are required for tournament participation. 
              This information helps us organize fair competitions and cannot be changed later.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileCompletionModal;
