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
  ChevronDown,
  Calendar,
  Clock
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { Tournament, Team } from '../types/tournament';

interface PlayoffManualSeedingProps {
  tournament: Tournament;
  teams: Team[];
  top8TeamIds: string[];
  onSeedingUpdated?: () => void;
  onClose?: () => void;
  onGeneratePlayoffBracket?: (seededTeamIds: string[]) => Promise<void>;
}

interface SeedingItem {
  id: string;
  teamId: string;
  teamName: string;
  teamTag: string;
  seed: number;
  swissPoints?: number;
  swissWins?: number;
}

const PlayoffManualSeeding: React.FC<PlayoffManualSeedingProps> = ({
  tournament,
  teams,
  top8TeamIds,
  onSeedingUpdated,
  onClose,
  onGeneratePlayoffBracket
}) => {
  const [seedingItems, setSeedingItems] = useState<SeedingItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Initialize seeding items from top 8 teams
    const swissStandings = tournament.stageManagement?.swissStage?.standings || [];
    
    const items: SeedingItem[] = top8TeamIds.map((teamId, index) => {
      const team = teams.find(t => t.id === teamId);
      const standing = swissStandings.find((s: any) => s.teamId === teamId);
      
      return {
        id: teamId,
        teamId: teamId,
        teamName: team?.name || 'Unknown Team',
        teamTag: team?.teamTag || '???',
        seed: index + 1,
        swissPoints: standing?.points,
        swissWins: (standing as any)?.wins
      };
    });
    
    setSeedingItems(items);
  }, [tournament, teams, top8TeamIds]);

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

  const handleGeneratePlayoffBracket = async () => {
    if (seedingItems.length !== 8) {
      setError('Must have exactly 8 teams for playoff bracket');
      return;
    }

    setGenerating(true);
    setError('');

    try {
      const seededTeamIds = seedingItems.map(item => item.teamId);
      
      if (onGeneratePlayoffBracket) {
        await onGeneratePlayoffBracket(seededTeamIds);
        toast.success('Playoff bracket generated with manual seeding!');
        
        if (onSeedingUpdated) {
          onSeedingUpdated();
        }
      }
    } catch (error: any) {
      console.error('Error generating playoff bracket:', error);
      setError(error.message || 'Failed to generate playoff bracket');
      toast.error('Failed to generate playoff bracket');
    } finally {
      setGenerating(false);
    }
  };

  const handleResetSeeding = () => {
    const swissStandings = tournament.stageManagement?.swissStage?.standings || [];
    
    const items: SeedingItem[] = top8TeamIds.map((teamId, index) => {
      const team = teams.find(t => t.id === teamId);
      const standing = swissStandings.find((s: any) => s.teamId === teamId);
      
      return {
        id: teamId,
        teamId: teamId,
        teamName: team?.name || 'Unknown Team',
        teamTag: team?.teamTag || '???',
        seed: index + 1,
        swissPoints: standing?.points,
        swissWins: (standing as any)?.wins
      };
    });
    
    setSeedingItems(items);
    setError('');
  };

  const getSeedColor = (seed: number) => {
    if (seed === 1) return 'bg-yellow-600 text-yellow-100';
    if (seed === 2) return 'bg-gray-500 text-gray-100';
    if (seed === 3) return 'bg-amber-700 text-amber-100';
    if (seed === 4) return 'bg-orange-600 text-orange-100';
    return 'bg-blue-600 text-blue-100';
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Trophy className="w-6 h-6 text-yellow-500" />
          <div>
            <h2 className="text-xl font-bold text-white">Playoff Bracket Seeding</h2>
            <p className="text-gray-400 text-sm">
              Arrange the top 8 teams for the playoff bracket
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
        <h3 className="text-sm font-semibold text-blue-300 mb-2">Playoff Bracket Format:</h3>
        <ul className="text-sm text-blue-200 space-y-1">
          <li>• <span className="text-yellow-400">Quarter Finals:</span> 1v8, 3v6, 2v7, 4v5 (BO3)</li>
          <li>• <span className="text-gray-300">Semi Finals:</span> Winners advance (BO3)</li>
          <li>• <span className="text-orange-400">Grand Final:</span> Championship match (BO3)</li>
          <li>• All matches will skip scheduling and go directly to admin-set times</li>
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
                {(item.swissPoints !== undefined || item.swissWins !== undefined) && (
                  <div className="text-xs text-gray-500 mt-1">
                    Swiss: {item.swissWins || 0}W • {item.swissPoints || 0} pts
                  </div>
                )}
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
            disabled={saving || generating}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset to Swiss Standings</span>
          </button>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleGeneratePlayoffBracket}
            disabled={saving || generating}
            className="flex items-center space-x-2 px-6 py-3 bg-green-600 hover:bg-green-500 disabled:bg-green-700 disabled:cursor-not-allowed rounded-lg transition-colors text-lg font-semibold"
          >
            {generating ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <Trophy className="w-5 h-5" />
            )}
            <span>{generating ? 'Generating Bracket...' : 'Generate Playoff Bracket'}</span>
          </button>
        </div>
      </div>

      {/* Quarter Final Preview */}
      <div className="mt-6 p-4 bg-gray-800 rounded-lg">
        <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center space-x-2">
          <Trophy className="w-4 h-4 text-yellow-500" />
          <span>Quarter Finals Preview:</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          {/* QF1: 1v8 → SF1 */}
          {seedingItems[0] && seedingItems[7] && (
            <div className="flex items-center justify-between p-3 bg-gray-700 rounded border border-gray-600">
              <span className="text-white font-medium">
                {seedingItems[0].teamName} <span className="text-yellow-400">(#1)</span>
              </span>
              <span className="text-gray-400 mx-2">vs</span>
              <span className="text-white font-medium">
                {seedingItems[7].teamName} <span className="text-gray-400">(#8)</span>
              </span>
            </div>
          )}
          
          {/* QF2: 3v6 → SF1 */}
          {seedingItems[2] && seedingItems[5] && (
            <div className="flex items-center justify-between p-3 bg-gray-700 rounded border border-gray-600">
              <span className="text-white font-medium">
                {seedingItems[2].teamName} <span className="text-amber-400">(#3)</span>
              </span>
              <span className="text-gray-400 mx-2">vs</span>
              <span className="text-white font-medium">
                {seedingItems[5].teamName} <span className="text-blue-400">(#6)</span>
              </span>
            </div>
          )}
          
          {/* QF3: 2v7 → SF2 */}
          {seedingItems[1] && seedingItems[6] && (
            <div className="flex items-center justify-between p-3 bg-gray-700 rounded border border-gray-600">
              <span className="text-white font-medium">
                {seedingItems[1].teamName} <span className="text-gray-400">(#2)</span>
              </span>
              <span className="text-gray-400 mx-2">vs</span>
              <span className="text-white font-medium">
                {seedingItems[6].teamName} <span className="text-blue-400">(#7)</span>
              </span>
            </div>
          )}
          
          {/* QF4: 4v5 → SF2 */}
          {seedingItems[3] && seedingItems[4] && (
            <div className="flex items-center justify-between p-3 bg-gray-700 rounded border border-gray-600">
              <span className="text-white font-medium">
                {seedingItems[3].teamName} <span className="text-orange-400">(#4)</span>
              </span>
              <span className="text-gray-400 mx-2">vs</span>
              <span className="text-white font-medium">
                {seedingItems[4].teamName} <span className="text-blue-400">(#5)</span>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayoffManualSeeding;

