import React, { useState, useEffect } from 'react';
import { 
  GripVertical, 
  Trophy, 
  Users, 
  Save, 
  RotateCcw, 
  AlertCircle,
  CheckCircle,
  XCircle,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { setManualSeeding, generateBracketWithManualSeeding } from '../services/firebaseService';
import { toast } from 'react-hot-toast';
import type { Tournament, Team } from '../types/tournament';

interface ManualSeedingInterfaceProps {
  tournament: Tournament;
  teams: Team[];
  onSeedingUpdated?: () => void;
  onClose?: () => void;
}

interface SeedingItem {
  id: string;
  teamId: string;
  teamName: string;
  teamTag: string;
  seed: number;
}

const ManualSeedingInterface: React.FC<ManualSeedingInterfaceProps> = ({
  tournament,
  teams,
  onSeedingUpdated,
  onClose
}) => {
  const [seedingItems, setSeedingItems] = useState<SeedingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Initialize seeding items from tournament teams
    const registeredTeamIds = tournament.teams || [];
    const registeredTeams = teams.filter(team => registeredTeamIds.includes(team.id));
    
    // If tournament already has manual seeding, use it
    if ((tournament.seeding?.method === 'manual' || tournament.format?.seedingMethod === 'manual') && tournament.seeding?.rankings) {
      const existingRankings = tournament.seeding.rankings;
      const items: SeedingItem[] = existingRankings.map(ranking => {
        const team = registeredTeams.find(t => t.id === ranking.teamId);
        return {
          id: ranking.teamId,
          teamId: ranking.teamId,
          teamName: team?.name || 'Unknown Team',
          teamTag: team?.teamTag || '???',
          seed: ranking.seed
        };
      });
      setSeedingItems(items);
    } else {
      // Create default seeding (1, 2, 3, 4, etc.)
      const items: SeedingItem[] = registeredTeams.map((team, index) => ({
        id: team.id,
        teamId: team.id,
        teamName: team.name,
        teamTag: team.teamTag,
        seed: index + 1
      }));
      setSeedingItems(items);
    }
  }, [tournament, teams]);

  const moveTeam = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;

    const items = Array.from(seedingItems);
    const [movedItem] = items.splice(fromIndex, 1);
    items.splice(toIndex, 0, movedItem);

    // Update seed numbers based on new order
    const updatedItems = items.map((item, index) => ({
      ...item,
      seed: index + 1
    }));

    setSeedingItems(updatedItems);
  };

  const moveTeamUp = (index: number) => {
    if (index > 0) {
      moveTeam(index, index - 1);
    }
  };

  const moveTeamDown = (index: number) => {
    if (index < seedingItems.length - 1) {
      moveTeam(index, index + 1);
    }
  };

  const handleSaveSeeding = async () => {
    if (seedingItems.length === 0) {
      setError('No teams to seed');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const rankings = seedingItems.map(item => ({
        teamId: item.teamId,
        seed: item.seed
      }));

      await setManualSeeding(tournament.id, rankings);
      toast.success('Manual seeding saved successfully!');
      
      if (onSeedingUpdated) {
        onSeedingUpdated();
      }
    } catch (error: any) {
      console.error('Error saving manual seeding:', error);
      setError(error.message || 'Failed to save seeding');
      toast.error('Failed to save seeding');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateBracket = async () => {
    if (seedingItems.length === 0) {
      setError('No teams to seed');
      return;
    }

    setGenerating(true);
    setError('');

    try {
      await generateBracketWithManualSeeding(tournament.id);
      toast.success('Bracket generated with manual seeding!');
      
      if (onSeedingUpdated) {
        onSeedingUpdated();
      }
    } catch (error: any) {
      console.error('Error generating bracket:', error);
      setError(error.message || 'Failed to generate bracket');
      toast.error('Failed to generate bracket');
    } finally {
      setGenerating(false);
    }
  };

  const handleResetSeeding = () => {
    const registeredTeamIds = tournament.teams || [];
    const registeredTeams = teams.filter(team => registeredTeamIds.includes(team.id));
    
    const items: SeedingItem[] = registeredTeams.map((team, index) => ({
      id: team.id,
      teamId: team.id,
      teamName: team.name,
      teamTag: team.teamTag,
      seed: index + 1
    }));
    
    setSeedingItems(items);
    setError('');
  };

  const getSeedColor = (seed: number) => {
    if (seed === 1) return 'bg-yellow-600 text-yellow-100';
    if (seed === 2) return 'bg-gray-500 text-gray-100';
    if (seed === 3) return 'bg-amber-700 text-amber-100';
    if (seed <= 8) return 'bg-blue-600 text-blue-100';
    return 'bg-gray-600 text-gray-100';
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Trophy className="w-6 h-6 text-yellow-500" />
          <div>
            <h2 className="text-xl font-bold text-white">Manual Seeding</h2>
            <p className="text-gray-400 text-sm">
              Use the arrow buttons to arrange teams in your desired seeding order
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-400">
            {seedingItems.length} teams
          </span>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <XCircle className="w-5 h-5 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <span className="text-red-300">{error}</span>
        </div>
      )}

      {/* Seeding Instructions */}
      <div className="mb-6 p-4 bg-blue-900/30 border border-blue-700 rounded-lg">
        <h3 className="text-sm font-semibold text-blue-300 mb-2">Seeding Instructions:</h3>
        <ul className="text-sm text-blue-200 space-y-1">
          <li>• <span className="text-yellow-400">Seed 1</span> will face the lowest seed in the first round</li>
          <li>• <span className="text-gray-300">Seed 2</span> will face the second-lowest seed</li>
          <li>• Higher seeds typically have easier paths to the finals</li>
          <li>• Use the arrow buttons to move teams up or down in the seeding</li>
        </ul>
      </div>

      {/* Seeding Interface */}
      <div className="mb-6">
        <div className="space-y-2">
          {seedingItems.map((item, index) => (
            <div
              key={item.id}
              className="flex items-center p-4 rounded-lg border bg-gray-800 border-gray-600 hover:bg-gray-750 transition-colors"
            >
              {/* Drag Handle Icon */}
              <div className="mr-4 p-1 text-gray-400">
                <GripVertical className="w-5 h-5" />
              </div>

              {/* Seed Number */}
              <div className={`mr-4 px-3 py-1 rounded-full text-sm font-bold ${getSeedColor(item.seed)}`}>
                #{item.seed}
              </div>

              {/* Team Info */}
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <span className="font-semibold text-white">{item.teamName}</span>
                  <span className="text-gray-400 text-sm">[{item.teamTag}]</span>
                </div>
              </div>

              {/* Team Members Count */}
              <div className="flex items-center space-x-1 text-gray-400 mr-4">
                <Users className="w-4 h-4" />
                <span className="text-sm">
                  {teams.find(t => t.id === item.teamId)?.members?.length || 0}
                </span>
              </div>

              {/* Move Controls */}
              <div className="flex flex-col space-y-1">
                <button
                  onClick={() => moveTeamUp(index)}
                  disabled={index === 0}
                  className="p-1 hover:bg-gray-600 disabled:bg-gray-700 disabled:cursor-not-allowed rounded transition-colors"
                  title="Move up"
                >
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                </button>
                <button
                  onClick={() => moveTeamDown(index)}
                  disabled={index === seedingItems.length - 1}
                  className="p-1 hover:bg-gray-600 disabled:bg-gray-700 disabled:cursor-not-allowed rounded transition-colors"
                  title="Move down"
                >
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={handleResetSeeding}
            disabled={loading || saving || generating}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset</span>
          </button>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleSaveSeeding}
            disabled={loading || saving || generating}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-700 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{saving ? 'Saving...' : 'Save Seeding'}</span>
          </button>

          <button
            onClick={handleGenerateBracket}
            disabled={loading || saving || generating}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-green-700 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            {generating ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Trophy className="w-4 h-4" />
            )}
            <span>{generating ? 'Generating...' : 'Generate Bracket'}</span>
          </button>
        </div>
      </div>

      {/* Preview Info */}
      <div className="mt-6 p-4 bg-gray-800 rounded-lg">
        <h3 className="text-sm font-semibold text-gray-300 mb-2">First Round Preview:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          {seedingItems.slice(0, Math.floor(seedingItems.length / 2)).map((item, index) => {
            const opponentIndex = seedingItems.length - 1 - index;
            const opponent = seedingItems[opponentIndex];
            if (!opponent) return null;
            
            return (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                <span className="text-white">
                  {item.teamName} <span className="text-gray-400">(#{item.seed})</span>
                </span>
                <span className="text-gray-400 mx-2">vs</span>
                <span className="text-white">
                  {opponent.teamName} <span className="text-gray-400">(#{opponent.seed})</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ManualSeedingInterface; 