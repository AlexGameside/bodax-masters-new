import React, { useState } from 'react';
import { X, Flag, CheckCircle } from 'lucide-react';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { toast } from 'react-hot-toast';

interface NationalitySelectionModalProps {
  isOpen: boolean;
  userId: string;
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

const NationalitySelectionModal: React.FC<NationalitySelectionModalProps> = ({
  isOpen,
  userId,
  onComplete
}) => {
  const [selectedNationality, setSelectedNationality] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedNationality) {
      toast.error('Please select your nationality');
      return;
    }

    setIsSubmitting(true);

    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        nationality: selectedNationality,
        updatedAt: new Date()
      });

      toast.success('Nationality saved successfully!');
      await onComplete();
    } catch (error) {

      toast.error('Failed to save nationality. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-start justify-center p-4 pt-16 min-h-screen w-full overflow-y-auto">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 sm:p-6 w-full max-w-md mx-auto mt-8 mb-8 max-h-[90vh] overflow-y-auto shadow-2xl transform transition-all duration-300 ease-out">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600/20 rounded-full flex items-center justify-center">
              <Flag className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Nationality Required</h2>
              <p className="text-sm text-gray-400">Please select your nationality to continue</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <label htmlFor="nationality" className="block text-sm font-medium text-gray-300 mb-2">
              Select your nationality
            </label>
            <div className="relative">
              <select
                id="nationality"
                value={selectedNationality}
                onChange={(e) => setSelectedNationality(e.target.value)}
                className="w-full px-4 py-3 pr-10 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none cursor-pointer"
                required
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

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!selectedNationality || isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>Save Nationality</span>
              </>
            )}
          </button>
        </form>

        {/* Info */}
        <div className="mt-4 p-3 bg-blue-900/20 border border-blue-700/30 rounded-lg">
          <p className="text-sm text-blue-300">
            <strong>Note:</strong> This information is required for tournament participation and cannot be changed later.
          </p>
        </div>
      </div>
    </div>
  );
};

export default NationalitySelectionModal;
