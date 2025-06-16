import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  ArrowLeft, 
  ArrowRight, 
  Save, 
  Eye, 
  Settings, 
  Users, 
  Trophy, 
  Calendar,
  DollarSign,
  Shield,
  Gamepad2,
  Map,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import type { 
  Tournament, 
  TournamentType, 
  MatchFormat, 
  SideSelectionMethod, 
  SeedingMethod,
  RegistrationApproval,
  TournamentFormat,
  TournamentRules,
  RegistrationRequirements,
  TournamentSchedule,
  PrizePool
} from '../types/tournament';
import { createTournament } from '../services/tournamentService';
import { toast } from 'react-hot-toast';

const TournamentCreation = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // Tournament data state
  const [tournamentData, setTournamentData] = useState<Partial<Tournament>>({
    name: '',
    description: '',
    format: {
      type: 'single-elimination' as TournamentType,
      teamCount: 8,
      matchFormat: 'BO1' as MatchFormat,
      mapPool: ['Ascent', 'Bind', 'Haven', 'Split', 'Icebox', 'Breeze', 'Fracture', 'Pearl', 'Lotus', 'Sunset'],
      sideSelection: 'coin-flip' as SideSelectionMethod,
      seedingMethod: 'random' as SeedingMethod,
    },
    rules: {
      overtimeRules: 'Standard Valorant overtime rules apply. First to 13 rounds wins.',
      pauseRules: 'Teams may request one tactical timeout per match. Technical timeouts are unlimited.',
      substitutionRules: 'Substitutions are allowed between maps in BO3/BO5 matches.',
      disputeProcess: 'Submit disputes with screenshots and evidence. Admin review required.',
      forfeitRules: 'Teams forfeit after 15 minutes of no-show. 2-0 loss recorded.',
      technicalIssues: 'Technical issues must be reported immediately. Replay if necessary.',
      codeOfConduct: 'Respect all players and staff. No toxic behavior tolerated.',
      antiCheatPolicy: 'All players must play fair. Cheating results in immediate disqualification.',
      streamingRules: 'Teams may stream their own matches. No stream sniping allowed.',
      communicationRules: 'Use tournament Discord for communication. No external comms during matches.',
    },
    requirements: {
      minPlayers: 5,
      maxPlayers: 7,
      requiredRoles: ['Captain', 'IGL'],
      requireDiscord: true,
      requireRiotId: true,
      requireRankVerification: false,
      approvalProcess: 'automatic' as RegistrationApproval,
      maxTeams: 8,
      registrationDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      teamValidationRules: ['All players must have valid Riot IDs', 'Discord accounts required'],
    },
    schedule: {
      startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      endDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 21 days from now
      timeZone: 'Europe/Berlin',
      matchDuration: 60,
      breakTime: 15,
      checkInTime: 15,
      maxMatchesPerDay: 4,
      preferredMatchTimes: ['18:00', '20:00', '22:00'],
      blackoutDates: [],
    },
    prizePool: {
      total: 300,
      distribution: {
        first: 200,
        second: 75,
        third: 25,
      },
      currency: 'EUR' as const,
      paymentMethod: 'PayPal',
      taxInfo: 'Prize money subject to local tax laws.',
    },
    status: 'draft',
    tags: [],
    region: 'Europe',
    isPublic: true,
    featured: false,
    stats: {
      registrationCount: 0,
      completedMatches: 0,
      totalMatches: 0,
      averageMatchDuration: 0,
      disputeCount: 0,
      forfeitCount: 0,
      viewershipPeak: 0,
      totalViewership: 0,
      completionRate: 0,
    },
    seeding: {
      method: 'random',
      rankings: [],
    },
    brackets: {},
    matches: [],
    teams: [],
    waitlist: [],
    rejectedTeams: [],
    adminIds: [],
  });

  const steps = [
    { id: 1, title: 'Basic Info', icon: Settings },
    { id: 2, title: 'Format & Rules', icon: Gamepad2 },
    { id: 3, title: 'Registration', icon: Users },
    { id: 4, title: 'Schedule', icon: Calendar },
    { id: 5, title: 'Prize Pool', icon: DollarSign },
    { id: 6, title: 'Review', icon: CheckCircle },
  ];

  const updateTournamentData = (updates: Partial<Tournament>) => {
    setTournamentData(prev => ({ ...prev, ...updates }));
  };

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCreateTournament = async () => {
    if (!currentUser) return;
    
    setIsCreating(true);
    try {
      // Validate required fields
      if (!tournamentData.name?.trim()) {
        toast.error('Tournament name is required');
        return;
      }

      if (!tournamentData.description?.trim()) {
        toast.error('Tournament description is required');
        return;
      }

      if (!tournamentData.format?.teamCount) {
        toast.error('Number of teams is required');
        return;
      }

      if (!tournamentData.requirements?.maxTeams) {
        toast.error('Maximum teams is required');
        return;
      }

      // Create the tournament
      const tournamentId = await createTournament(tournamentData, currentUser.id);
      
      toast.success(`Tournament "${tournamentData.name}" created successfully!`);
      
      // Navigate to tournament management page
      navigate(`/admin/tournaments/${tournamentId}`);
    } catch (error) {
      console.error('Error creating tournament:', error);
      toast.error('Failed to create tournament. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <BasicInfoStep tournamentData={tournamentData} updateTournamentData={updateTournamentData} />;
      case 2:
        return <FormatRulesStep tournamentData={tournamentData} updateTournamentData={updateTournamentData} />;
      case 3:
        return <RegistrationStep tournamentData={tournamentData} updateTournamentData={updateTournamentData} />;
      case 4:
        return <ScheduleStep tournamentData={tournamentData} updateTournamentData={updateTournamentData} />;
      case 5:
        return <PrizePoolStep tournamentData={tournamentData} updateTournamentData={updateTournamentData} />;
      case 6:
        return <ReviewStep tournamentData={tournamentData} />;
      default:
        return null;
    }
  };

  if (!currentUser?.isAdmin) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-gray-400">You need admin privileges to create tournaments.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Create Tournament</h1>
            <p className="text-gray-400 mt-2">Set up a new tournament with all the details</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setPreviewMode(!previewMode)}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
            >
              <Eye className="w-4 h-4" />
              <span>{previewMode ? 'Edit' : 'Preview'}</span>
            </button>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              
              return (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center space-x-3 ${
                    isActive ? 'text-blue-400' : isCompleted ? 'text-green-400' : 'text-gray-500'
                  }`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                      isActive ? 'border-blue-400 bg-blue-400/20' : 
                      isCompleted ? 'border-green-400 bg-green-400/20' : 
                      'border-gray-600 bg-gray-800'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <Icon className="w-5 h-5" />
                      )}
                    </div>
                    <span className="hidden md:block font-medium">{step.title}</span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-16 h-0.5 mx-4 ${
                      isCompleted ? 'bg-green-400' : 'bg-gray-600'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          {renderStepContent()}
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="flex items-center space-x-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 px-6 py-3 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <div className="flex space-x-3">
            {currentStep < steps.length ? (
              <button
                onClick={handleNext}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg transition-colors"
              >
                <span>Next</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleCreateTournament}
                disabled={isCreating}
                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 px-6 py-3 rounded-lg transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>{isCreating ? 'Creating...' : 'Create Tournament'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Step Components
const BasicInfoStep = ({ tournamentData, updateTournamentData }: any) => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Basic Information</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-2">Tournament Name</label>
          <input
            type="text"
            value={tournamentData.name}
            onChange={(e) => updateTournamentData({ name: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter tournament name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Region</label>
          <select
            value={tournamentData.region}
            onChange={(e) => updateTournamentData({ region: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="Europe">Europe</option>
            <option value="North America">North America</option>
            <option value="Asia">Asia</option>
            <option value="Global">Global</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Visibility</label>
          <select
            value={tournamentData.isPublic ? 'public' : 'private'}
            onChange={(e) => updateTournamentData({ isPublic: e.target.value === 'public' })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Description</label>
        <textarea
          value={tournamentData.description}
          onChange={(e) => updateTournamentData({ description: e.target.value })}
          rows={4}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Describe your tournament..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Tags</label>
        <input
          type="text"
          value={tournamentData.tags?.join(', ') || ''}
          onChange={(e) => updateTournamentData({ tags: e.target.value.split(',').map(tag => tag.trim()) })}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter tags separated by commas"
        />
      </div>
    </div>
  );
};

const FormatRulesStep = ({ tournamentData, updateTournamentData }: any) => {
  const tournamentTypes: { value: TournamentType; label: string; description: string }[] = [
    { value: 'single-elimination', label: 'Single Elimination', description: 'Teams are eliminated after one loss' },
    { value: 'double-elimination', label: 'Double Elimination', description: 'Teams must lose twice to be eliminated' },
    { value: 'round-robin', label: 'Round Robin', description: 'All teams play against each other' },
    { value: 'swiss-system', label: 'Swiss System', description: 'Teams play against others with similar records' },
    { value: 'group-stage-single-elim', label: 'Group Stage + Single Elim', description: 'Groups then single elimination playoffs' },
    { value: 'group-stage-double-elim', label: 'Group Stage + Double Elim', description: 'Groups then double elimination playoffs' },
    { value: 'group-stage-knockout', label: 'Group Stage + Knockout', description: 'Groups then knockout stage' },
    { value: 'gauntlet', label: 'Gauntlet', description: 'Teams must win multiple matches in sequence' },
    { value: 'battle-royale', label: 'Battle Royale', description: 'All teams start together, last team standing wins' },
    { value: 'league', label: 'League', description: 'Season-long competition with playoffs' },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Format & Rules</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-2">Tournament Type</label>
          <select
            value={tournamentData.format?.type}
            onChange={(e) => updateTournamentData({ 
              format: { ...tournamentData.format, type: e.target.value as TournamentType }
            })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {tournamentTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          <p className="text-sm text-gray-400 mt-1">
            {tournamentTypes.find(t => t.value === tournamentData.format?.type)?.description}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Number of Teams</label>
          <select
            value={tournamentData.format?.teamCount}
            onChange={(e) => updateTournamentData({ 
              format: { ...tournamentData.format, teamCount: parseInt(e.target.value) }
            })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value={4}>4 Teams</option>
            <option value={8}>8 Teams</option>
            <option value={16}>16 Teams</option>
            <option value={32}>32 Teams</option>
            <option value={64}>64 Teams</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Match Format</label>
          <select
            value={tournamentData.format?.matchFormat}
            onChange={(e) => updateTournamentData({ 
              format: { ...tournamentData.format, matchFormat: e.target.value as MatchFormat }
            })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="BO1">Best of 1</option>
            <option value="BO3">Best of 3</option>
            <option value="BO5">Best of 5</option>
            <option value="BO7">Best of 7</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Side Selection</label>
          <select
            value={tournamentData.format?.sideSelection}
            onChange={(e) => updateTournamentData({ 
              format: { ...tournamentData.format, sideSelection: e.target.value as SideSelectionMethod }
            })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="coin-flip">Coin Flip</option>
            <option value="higher-seed">Higher Seed Chooses</option>
            <option value="manual">Manual Assignment</option>
            <option value="alternating">Alternating</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Map Pool</label>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {['Ascent', 'Bind', 'Haven', 'Split', 'Icebox', 'Breeze', 'Fracture', 'Pearl', 'Lotus', 'Sunset'].map(map => (
            <label key={map} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={tournamentData.format?.mapPool?.includes(map)}
                onChange={(e) => {
                  const currentMaps = tournamentData.format?.mapPool || [];
                  const newMaps = e.target.checked 
                    ? [...currentMaps, map]
                    : currentMaps.filter((m: string) => m !== map);
                  updateTournamentData({ 
                    format: { ...tournamentData.format, mapPool: newMaps }
                  });
                }}
                className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm">{map}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Group Stage Configuration */}
      {tournamentData.format?.type?.includes('group-stage') && (
        <div className="border border-gray-600 rounded-lg p-4">
          <h3 className="text-lg font-medium mb-4">Group Stage Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Number of Groups</label>
              <select
                value={tournamentData.format?.groupStage?.groupCount || 2}
                onChange={(e) => updateTournamentData({ 
                  format: { 
                    ...tournamentData.format, 
                    groupStage: { 
                      ...tournamentData.format?.groupStage, 
                      groupCount: parseInt(e.target.value) 
                    }
                  }
                })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={2}>2 Groups</option>
                <option value={4}>4 Groups</option>
                <option value={8}>8 Groups</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Teams per Group</label>
              <input
                type="number"
                value={tournamentData.format?.groupStage?.teamsPerGroup || 4}
                onChange={(e) => updateTournamentData({ 
                  format: { 
                    ...tournamentData.format, 
                    groupStage: { 
                      ...tournamentData.format?.groupStage, 
                      teamsPerGroup: parseInt(e.target.value) 
                    }
                  }
                })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Teams Advance per Group</label>
              <input
                type="number"
                value={tournamentData.format?.groupStage?.teamsAdvancePerGroup || 2}
                onChange={(e) => updateTournamentData({ 
                  format: { 
                    ...tournamentData.format, 
                    groupStage: { 
                      ...tournamentData.format?.groupStage, 
                      teamsAdvancePerGroup: parseInt(e.target.value) 
                    }
                  }
                })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const RegistrationStep = ({ tournamentData, updateTournamentData }: any) => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Registration Requirements</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-2">Minimum Players</label>
          <input
            type="number"
            value={tournamentData.requirements?.minPlayers}
            onChange={(e) => updateTournamentData({ 
              requirements: { ...tournamentData.requirements, minPlayers: parseInt(e.target.value) }
            })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Maximum Players</label>
          <input
            type="number"
            value={tournamentData.requirements?.maxPlayers}
            onChange={(e) => updateTournamentData({ 
              requirements: { ...tournamentData.requirements, maxPlayers: parseInt(e.target.value) }
            })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Maximum Teams</label>
          <input
            type="number"
            value={tournamentData.requirements?.maxTeams}
            onChange={(e) => updateTournamentData({ 
              requirements: { ...tournamentData.requirements, maxTeams: parseInt(e.target.value) }
            })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Entry Fee (€)</label>
          <input
            type="number"
            value={tournamentData.requirements?.entryFee || 0}
            onChange={(e) => updateTournamentData({ 
              requirements: { ...tournamentData.requirements, entryFee: parseFloat(e.target.value) }
            })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Approval Process</label>
          <select
            value={tournamentData.requirements?.approvalProcess}
            onChange={(e) => updateTournamentData({ 
              requirements: { ...tournamentData.requirements, approvalProcess: e.target.value as RegistrationApproval }
            })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="automatic">Automatic</option>
            <option value="manual">Manual Review</option>
            <option value="first-come-first-served">First Come, First Served</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Registration Deadline</label>
          <input
            type="datetime-local"
            value={tournamentData.requirements?.registrationDeadline?.toISOString().slice(0, 16) || ''}
            onChange={(e) => updateTournamentData({ 
              requirements: { ...tournamentData.requirements, registrationDeadline: new Date(e.target.value) }
            })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Required Verifications</label>
        <div className="space-y-3">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={tournamentData.requirements?.requireDiscord}
              onChange={(e) => updateTournamentData({ 
                requirements: { ...tournamentData.requirements, requireDiscord: e.target.checked }
              })}
              className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
            />
            <span>Discord Account Required</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={tournamentData.requirements?.requireRiotId}
              onChange={(e) => updateTournamentData({ 
                requirements: { ...tournamentData.requirements, requireRiotId: e.target.checked }
              })}
              className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
            />
            <span>Riot ID Required</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={tournamentData.requirements?.requireRankVerification}
              onChange={(e) => updateTournamentData({ 
                requirements: { ...tournamentData.requirements, requireRankVerification: e.target.checked }
              })}
              className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
            />
            <span>Rank Verification Required</span>
          </label>
        </div>
      </div>
    </div>
  );
};

const ScheduleStep = ({ tournamentData, updateTournamentData }: any) => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Tournament Schedule</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-2">Start Date</label>
          <input
            type="datetime-local"
            value={tournamentData.schedule?.startDate?.toISOString().slice(0, 16) || ''}
            onChange={(e) => updateTournamentData({ 
              schedule: { ...tournamentData.schedule, startDate: new Date(e.target.value) }
            })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">End Date</label>
          <input
            type="datetime-local"
            value={tournamentData.schedule?.endDate?.toISOString().slice(0, 16) || ''}
            onChange={(e) => updateTournamentData({ 
              schedule: { ...tournamentData.schedule, endDate: new Date(e.target.value) }
            })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Time Zone</label>
          <select
            value={tournamentData.schedule?.timeZone}
            onChange={(e) => updateTournamentData({ 
              schedule: { ...tournamentData.schedule, timeZone: e.target.value }
            })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="Europe/Berlin">Europe/Berlin (CET)</option>
            <option value="Europe/London">Europe/London (GMT)</option>
            <option value="America/New_York">America/New_York (EST)</option>
            <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
            <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Match Duration (minutes)</label>
          <input
            type="number"
            value={tournamentData.schedule?.matchDuration}
            onChange={(e) => updateTournamentData({ 
              schedule: { ...tournamentData.schedule, matchDuration: parseInt(e.target.value) }
            })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Break Time (minutes)</label>
          <input
            type="number"
            value={tournamentData.schedule?.breakTime}
            onChange={(e) => updateTournamentData({ 
              schedule: { ...tournamentData.schedule, breakTime: parseInt(e.target.value) }
            })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Check-in Time (minutes)</label>
          <input
            type="number"
            value={tournamentData.schedule?.checkInTime}
            onChange={(e) => updateTournamentData({ 
              schedule: { ...tournamentData.schedule, checkInTime: parseInt(e.target.value) }
            })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
    </div>
  );
};

const PrizePoolStep = ({ tournamentData, updateTournamentData }: any) => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Prize Pool</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-2">Total Prize Pool (€)</label>
          <input
            type="number"
            value={tournamentData.prizePool?.total}
            onChange={(e) => updateTournamentData({ 
              prizePool: { ...tournamentData.prizePool, total: parseFloat(e.target.value) }
            })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Currency</label>
          <select
            value={tournamentData.prizePool?.currency}
            onChange={(e) => updateTournamentData({ 
              prizePool: { ...tournamentData.prizePool, currency: e.target.value as 'EUR' | 'USD' | 'GBP' }
            })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="EUR">EUR (€)</option>
            <option value="USD">USD ($)</option>
            <option value="GBP">GBP (£)</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Prize Distribution</label>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">1st Place</label>
              <input
                type="number"
                value={tournamentData.prizePool?.distribution?.first}
                onChange={(e) => updateTournamentData({ 
                  prizePool: { 
                    ...tournamentData.prizePool, 
                    distribution: { ...tournamentData.prizePool?.distribution, first: parseFloat(e.target.value) }
                  }
                })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">2nd Place</label>
              <input
                type="number"
                value={tournamentData.prizePool?.distribution?.second}
                onChange={(e) => updateTournamentData({ 
                  prizePool: { 
                    ...tournamentData.prizePool, 
                    distribution: { ...tournamentData.prizePool?.distribution, second: parseFloat(e.target.value) }
                  }
                })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">3rd Place</label>
              <input
                type="number"
                value={tournamentData.prizePool?.distribution?.third}
                onChange={(e) => updateTournamentData({ 
                  prizePool: { 
                    ...tournamentData.prizePool, 
                    distribution: { ...tournamentData.prizePool?.distribution, third: parseFloat(e.target.value) }
                  }
                })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Payment Method</label>
        <input
          type="text"
          value={tournamentData.prizePool?.paymentMethod}
          onChange={(e) => updateTournamentData({ 
            prizePool: { ...tournamentData.prizePool, paymentMethod: e.target.value }
          })}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="e.g., PayPal, Bank Transfer"
        />
      </div>
    </div>
  );
};

const ReviewStep = ({ tournamentData }: any) => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Review Tournament</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-medium mb-3">Basic Information</h3>
          <div className="space-y-2 text-sm">
            <p><strong>Name:</strong> {tournamentData.name}</p>
            <p><strong>Region:</strong> {tournamentData.region}</p>
            <p><strong>Visibility:</strong> {tournamentData.isPublic ? 'Public' : 'Private'}</p>
          </div>
        </div>

        <div className="bg-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-medium mb-3">Format</h3>
          <div className="space-y-2 text-sm">
            <p><strong>Type:</strong> {tournamentData.format?.type}</p>
            <p><strong>Teams:</strong> {tournamentData.format?.teamCount}</p>
            <p><strong>Format:</strong> {tournamentData.format?.matchFormat}</p>
            <p><strong>Maps:</strong> {tournamentData.format?.mapPool?.length} selected</p>
          </div>
        </div>

        <div className="bg-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-medium mb-3">Registration</h3>
          <div className="space-y-2 text-sm">
            <p><strong>Max Teams:</strong> {tournamentData.requirements?.maxTeams}</p>
            <p><strong>Players:</strong> {tournamentData.requirements?.minPlayers}-{tournamentData.requirements?.maxPlayers}</p>
            <p><strong>Entry Fee:</strong> €{tournamentData.requirements?.entryFee || 0}</p>
            <p><strong>Approval:</strong> {tournamentData.requirements?.approvalProcess}</p>
          </div>
        </div>

        <div className="bg-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-medium mb-3">Prize Pool</h3>
          <div className="space-y-2 text-sm">
            <p><strong>Total:</strong> €{tournamentData.prizePool?.total}</p>
            <p><strong>1st:</strong> €{tournamentData.prizePool?.distribution?.first}</p>
            <p><strong>2nd:</strong> €{tournamentData.prizePool?.distribution?.second}</p>
            <p><strong>3rd:</strong> €{tournamentData.prizePool?.distribution?.third}</p>
          </div>
        </div>
      </div>

      <div className="bg-gray-700 rounded-lg p-4">
        <h3 className="text-lg font-medium mb-3">Schedule</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p><strong>Start:</strong> {tournamentData.schedule?.startDate?.toLocaleDateString()}</p>
            <p><strong>End:</strong> {tournamentData.schedule?.endDate?.toLocaleDateString()}</p>
          </div>
          <div>
            <p><strong>Time Zone:</strong> {tournamentData.schedule?.timeZone}</p>
            <p><strong>Match Duration:</strong> {tournamentData.schedule?.matchDuration} min</p>
          </div>
          <div>
            <p><strong>Break Time:</strong> {tournamentData.schedule?.breakTime} min</p>
            <p><strong>Check-in:</strong> {tournamentData.schedule?.checkInTime} min</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TournamentCreation; 