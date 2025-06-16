import { useState } from 'react';
import { X, Users, Check, AlertCircle } from 'lucide-react';
import type { User, Team } from '../types/tournament';

interface ReadyUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: Team;
  teamPlayers: User[];
  currentActivePlayers: string[];
  onSetActivePlayers: (activePlayers: string[]) => Promise<void>;
}

const ReadyUpModal = ({
  isOpen,
  onClose,
  team,
  teamPlayers,
  currentActivePlayers,
  onSetActivePlayers
}: ReadyUpModalProps) => {
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>(currentActivePlayers || []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!teamPlayers || !Array.isArray(teamPlayers)) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 border border-gray-700">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Loading Team Players</h3>
            <p className="text-gray-300 mb-4">Please wait while we load the team players...</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 border border-gray-700">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Team Not Found</h3>
            <p className="text-gray-300 mb-4">Unable to load team information.</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handlePlayerToggle = (playerId: string) => {
    setSelectedPlayers(prev => {
      if (prev.includes(playerId)) {
        return prev.filter(id => id !== playerId);
      } else {
        if (prev.length >= 5) {
          setError('Maximum 5 players can be selected');
          return prev;
        }
        setError('');
        return [...prev, playerId];
      }
    });
  };

  const handleSubmit = async () => {
    if (selectedPlayers.length !== 5) {
      setError('Please select exactly 5 players');
      return;
    }

    if (!onSetActivePlayers) {
      setError('Unable to set active players - function not available');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await onSetActivePlayers(selectedPlayers);
      onClose();
    } catch (error: any) {
      setError(error.message || 'Failed to set active players');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedPlayers(currentActivePlayers);
    setError('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-gray-700">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-semibold text-white">Ready Up - Select Active Players</h3>
            <p className="text-gray-300">Choose 5 players for the upcoming match</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="bg-red-900 border border-red-700 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          </div>
        )}

        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-medium text-white">Team: {team.name}</h4>
            <div className="text-sm text-gray-300">
              {selectedPlayers.length}/5 players selected
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {teamPlayers.map((player) => {
              const isSelected = selectedPlayers.includes(player.id);
              const isCaptain = player.id === team.captainId;
              
              return (
                <div
                  key={player.id}
                  onClick={() => handlePlayerToggle(player.id)}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-900'
                      : 'border-gray-600 hover:border-gray-500 bg-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        isSelected
                          ? 'border-blue-400 bg-blue-400'
                          : 'border-gray-400'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-white">
                            {player.username}
                          </span>
                          {isCaptain && (
                            <span className="bg-yellow-600 text-yellow-100 text-xs px-2 py-1 rounded-full">
                              Captain
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-300">
                          {player.riotId}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400">
                      {isSelected ? 'Selected' : 'Click to select'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-t border-gray-600 pt-4">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-gray-300">
              <strong>Selected Players:</strong>
              {selectedPlayers.length === 0 ? (
                <span className="text-gray-500 ml-2">None selected</span>
              ) : (
                <div className="mt-2 space-y-1">
                  {selectedPlayers.map(playerId => {
                    const player = teamPlayers.find(p => p.id === playerId);
                    return (
                      <div key={playerId} className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-blue-400" />
                        <span className="text-white">{player?.username}</span>
                        <span className="text-gray-400">({player?.riotId})</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={handleSubmit}
              disabled={selectedPlayers.length !== 5 || isLoading}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Setting Active Players...' : 'Confirm Active Players'}
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Reset
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReadyUpModal; 