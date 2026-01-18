import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  ArrowLeft, 
  Save, 
  Shield,
  CheckCircle,
  AlertCircle,
  Trophy,
  DollarSign,
  ArrowRight,
  ArrowLeft as ArrowLeftIcon,
  Users,
  Calendar,
  Settings,
  Zap,
  Info,
  Sparkles,
  Crown,
  Target,
  Grid3X3,
  Layers,
  Play,
  Gamepad2
} from 'lucide-react';
import type { 
  Tournament, 
  TournamentFormat,
  TournamentRules,
  TournamentSchedule,
  PrizePool,
  RegistrationRequirements
} from '../types/tournament';
import { createTournament, publishTournament, updateTournament, getTournament } from '../services/tournamentService';
import { DEFAULT_MAP_POOL } from '../constants/mapPool';
import { toast } from 'react-hot-toast';

// Helper function to clean objects for Firestore (remove undefined values)
const cleanForFirestore = (obj: any): any => {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== 'object') return obj;
  
  if (obj instanceof Date) return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(cleanForFirestore).filter(item => item !== null);
  }
  
  const cleaned: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = cleanForFirestore(value);
    }
  }
  return cleaned;
};

type TournamentMode = 'single-elimination' | 'double-elimination' | 'swiss-system' | 'round-robin' | 'group-stage' | 'league' | 'gauntlet';
type Step = 'basics' | 'format' | 'schedule' | 'registration' | 'prizes' | 'review';

const TournamentCreation = () => {
  const { id: tournamentId } = useParams<{ id: string }>();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [loadingTournament, setLoadingTournament] = useState(false);
  const [currentStep, setCurrentStep] = useState<Step>('basics');

  // Basic tournament info
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [region, setRegion] = useState<string>('Global');

  // Tournament format
  const [tournamentMode, setTournamentMode] = useState<TournamentMode>('single-elimination');
  const [matchFormat, setMatchFormat] = useState<'BO1' | 'BO3' | 'BO5' | 'BO7'>('BO3');
  const [finalsBO3, setFinalsBO3] = useState<boolean>(false);
  const [seedingMethod, setSeedingMethod] = useState<'random' | 'manual' | 'elo-based' | 'previous-tournament' | 'qualifier-results'>('random');
  
  // Swiss system specific
  const [swissRounds, setSwissRounds] = useState<number>(5);
  const [teamsAdvanceToPlayoffs, setTeamsAdvanceToPlayoffs] = useState<number>(8);
  const [schedulingWindow, setSchedulingWindow] = useState<number>(7);

  // Schedule
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Prize pool
  const [totalPrize, setTotalPrize] = useState<number>(0);
  const [currency, setCurrency] = useState<'USD' | 'EUR' | 'GBP'>('EUR');

  // Registration
  const [maxTeams, setMaxTeams] = useState<number>(8);
  const [requireRiotId, setRequireRiotId] = useState<boolean>(true);
  const [requireRankVerification, setRequireRankVerification] = useState<boolean>(false);
  const [minimumRank, setMinimumRank] = useState<string>('');
  const [entryFee, setEntryFee] = useState<number>(0);
  
  // Team composition
  const [minMainPlayers, setMinMainPlayers] = useState<number>(5);
  const [maxMainPlayers, setMaxMainPlayers] = useState<number>(5);
  const [minSubstitutes, setMinSubstitutes] = useState<number>(0);
  const [maxSubstitutes, setMaxSubstitutes] = useState<number>(2);
  const [allowCoaches, setAllowCoaches] = useState<boolean>(true);
  const [allowAssistantCoaches, setAllowAssistantCoaches] = useState<boolean>(true);
  const [allowManagers, setAllowManagers] = useState<boolean>(true);

  // Valid team sizes for elimination tournaments
  const validTeamSizes = [2, 4, 8, 16, 32];

  const steps: Array<{ id: Step; label: string; icon: any }> = [
    { id: 'basics', label: 'Basics', icon: Trophy },
    { id: 'format', label: 'Format', icon: Gamepad2 },
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'registration', label: 'Registration', icon: Users },
    { id: 'prizes', label: 'Prizes', icon: Crown },
    { id: 'review', label: 'Review', icon: CheckCircle },
  ];

  const tournamentModes: Array<{
    id: TournamentMode;
    name: string;
    description: string;
    icon: any;
    color: string;
    available: boolean;
    comingSoon?: boolean;
  }> = [
    {
      id: 'single-elimination',
      name: 'Single Elimination',
      description: 'Classic knockout bracket. One loss and you\'re out.',
      icon: Target,
      color: 'red',
      available: true,
    },
    {
      id: 'double-elimination',
      name: 'Double Elimination',
      description: 'Teams get a second chance in the losers bracket.',
      icon: Layers,
      color: 'blue',
      available: true,
    },
    {
      id: 'swiss-system',
      name: 'Swiss System',
      description: 'Play multiple rounds, advance top teams to playoffs.',
      icon: Grid3X3,
      color: 'purple',
      available: true,
    },
    {
      id: 'round-robin',
      name: 'Round Robin',
      description: 'Every team plays every other team once.',
      icon: Users,
      color: 'green',
      available: false,
      comingSoon: true,
    },
    {
      id: 'group-stage',
      name: 'Group Stage',
      description: 'Groups followed by knockout playoffs.',
      icon: Grid3X3,
      color: 'yellow',
      available: false,
      comingSoon: true,
    },
    {
      id: 'league',
      name: 'League',
      description: 'Ongoing season with weekly matches.',
      icon: Calendar,
      color: 'cyan',
      available: false,
      comingSoon: true,
    },
    {
      id: 'gauntlet',
      name: 'Gauntlet',
      description: 'Challenger format - winner stays, challengers rotate.',
      icon: Zap,
      color: 'orange',
      available: false,
      comingSoon: true,
    },
  ];

  const validateStep = (step: Step): boolean => {
    switch (step) {
      case 'basics':
        return !!(name && description);
      case 'format':
        return true; // Format is always valid
      case 'schedule':
        return !!startDate;
      case 'registration':
        return maxTeams >= 2;
      case 'prizes':
        return true; // Prizes are optional
      case 'review':
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    const currentIndex = steps.findIndex(s => s.id === currentStep);
    if (currentIndex < steps.length - 1) {
      if (validateStep(currentStep)) {
        setCurrentStep(steps[currentIndex + 1].id);
      } else {
        toast.error('Please complete all required fields');
      }
    }
  };

  const handlePrevious = () => {
    const currentIndex = steps.findIndex(s => s.id === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser?.isAdmin && !currentUser?.isVerifiedOrganizer) {
      setError('Only admins and verified organizers can create tournaments');
      return;
    }

    if (!name || !description) {
      setError('Please fill in all required fields');
      return;
    }

    // Validate team composition settings
    if (minMainPlayers < 1 || maxMainPlayers < minMainPlayers) {
      setError('Invalid main player configuration');
      return;
    }

    if (minSubstitutes < 0 || maxSubstitutes < minSubstitutes) {
      setError('Invalid substitute configuration');
      return;
    }

    if (maxMainPlayers + maxSubstitutes > 10) {
      setError('Total team size cannot exceed 10 members');
      return;
    }

    // Validate team size for elimination tournaments
    if (!['swiss-system', 'round-robin', 'group-stage', 'league', 'gauntlet'].includes(tournamentMode) && !validTeamSizes.includes(maxTeams)) {
      setError(`Team size must be 2, 4, 8, 16, or 32 for ${tournamentMode} tournaments`);
      return;
    }
    
    // Validate team size for Swiss system tournaments
    if (tournamentMode === 'swiss-system' && maxTeams < 4) {
      setError('Swiss system tournaments require at least 4 teams');
      return;
    }

    // Validate entry fee for organizers
    if (currentUser?.isVerifiedOrganizer) {
      if (entryFee <= 0) {
        setError('Entry fee must be greater than 0 for organizer tournaments');
        return;
      }
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      // Calculate prize distribution
      const firstPrize = Math.floor(totalPrize * 0.6);
      const secondPrize = Math.floor(totalPrize * 0.3);
      const thirdPrize = totalPrize - firstPrize - secondPrize;

      const format: TournamentFormat = {
        type: tournamentMode as any,
        teamCount: maxTeams,
        matchFormat,
        finalsMatchFormat: finalsBO3 ? 'BO3' : matchFormat,
        mapPool: [...DEFAULT_MAP_POOL],
        sideSelection: 'coin-flip',
        seedingMethod: seedingMethod,
        ...(tournamentMode === 'swiss-system' && {
          swissConfig: {
            rounds: swissRounds,
            teamsAdvanceToPlayoffs,
            tiebreakerMethod: 'buchholz' as const,
            schedulingWindow
          }
        })
      };

      const rules: TournamentRules = {
        overtimeRules: 'Overtime will be played as first to 2 rounds with 1 round each side.',
        pauseRules: 'Teams may request one tactical timeout per match.',
        substitutionRules: 'Substitutions are allowed between maps.',
        disputeProcess: 'Disputes must be submitted within 10 minutes of match completion.',
        forfeitRules: 'Teams that forfeit will be disqualified from the tournament.',
        technicalIssues: 'Technical issues will be handled on a case-by-case basis.',
        codeOfConduct: 'All participants must follow the tournament code of conduct.',
        antiCheatPolicy: 'Cheating will result in immediate disqualification.',
        streamingRules: 'Teams may stream their own matches.',
        communicationRules: 'Teams must use the designated communication channels.'
      };

      const schedule: TournamentSchedule = {
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        timeZone: 'UTC',
        matchDuration: 60,
        breakTime: 15,
        checkInTime: 30,
        maxMatchesPerDay: 4,
        preferredMatchTimes: ['18:00', '20:00', '22:00'],
        blackoutDates: []
      };

      const prizePool: PrizePool = {
        total: totalPrize,
        distribution: {
          first: firstPrize,
          second: secondPrize,
          third: thirdPrize
        },
        currency,
        paymentMethod: 'PayPal',
        taxInfo: 'Prizes are subject to applicable taxes.'
      };

      const requirements: RegistrationRequirements = {
        minPlayers: minMainPlayers + minSubstitutes,
        maxPlayers: maxMainPlayers + maxSubstitutes + (allowCoaches ? 1 : 0) + (allowAssistantCoaches ? 1 : 0) + (allowManagers ? 1 : 0),
        requiredRoles: ['owner', 'captain'],
        requireDiscord: false,
        requireRiotId: requireRiotId,
        requireRankVerification: requireRankVerification,
        minimumRank: minimumRank || null,
        entryFee: entryFee || null,
        approvalProcess: 'automatic',
        maxTeams: maxTeams,
        registrationDeadline: endDate ? new Date(endDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        teamValidationRules: ['All team members must be verified', 'Team must have valid roster'],
        minMainPlayers,
        maxMainPlayers,
        minSubstitutes,
        maxSubstitutes,
        allowCoaches,
        allowAssistantCoaches,
        allowManagers
      };

      const cleanRequirements: RegistrationRequirements = {
        minPlayers: requirements.minPlayers,
        maxPlayers: requirements.maxPlayers,
        requiredRoles: requirements.requiredRoles,
        requireDiscord: requirements.requireDiscord,
        requireRiotId: requirements.requireRiotId,
        requireRankVerification: requirements.requireRankVerification,
        minimumRank: requirements.minimumRank || null,
        entryFee: requirements.entryFee || null,
        approvalProcess: requirements.approvalProcess,
        maxTeams: requirements.maxTeams,
        registrationDeadline: requirements.registrationDeadline,
        teamValidationRules: requirements.teamValidationRules,
        minMainPlayers: requirements.minMainPlayers,
        maxMainPlayers: requirements.maxMainPlayers,
        minSubstitutes: requirements.minSubstitutes,
        maxSubstitutes: requirements.maxSubstitutes,
        allowCoaches: requirements.allowCoaches,
        allowAssistantCoaches: requirements.allowAssistantCoaches,
        allowManagers: requirements.allowManagers
      };

      let organizerId = undefined;
      if (currentUser?.isVerifiedOrganizer) {
        organizerId = currentUser.id;
      }
      
      let paymentInfo = undefined;
      
      if (organizerId && entryFee > 0) {
        const { calculateFees } = await import('../services/stripeService');
        const fees = calculateFees(entryFee);
        
        const refundDeadline = new Date(schedule.startDate);
        refundDeadline.setDate(refundDeadline.getDate() - 14);
        
        paymentInfo = {
          entryFee: entryFee,
          currency: 'EUR' as const,
          platformFeePercentage: 0.05,
          totalCollected: 0,
          platformFeeAmount: fees.platformFee,
          organizerPayoutAmount: fees.organizerPayout,
          payoutStatus: 'pending' as const,
          refundDeadline: refundDeadline,
          refundsIssued: 0,
        };
      }

      const tournamentData = {
        name,
        description,
        format,
        rules,
        requirements: cleanRequirements,
        schedule,
        prizePool,
        region,
        isPublic: true,
        featured: false,
        tags: [tournamentMode, region],
        createdBy: currentUser.id,
        adminIds: [currentUser.id],
        ...(organizerId && { organizerId }),
        ...(paymentInfo && { paymentInfo }),
      };

      const cleanTournamentData = cleanForFirestore(tournamentData);

      if (isEditMode && tournamentId) {
        await updateTournament(tournamentId, cleanTournamentData);
        setMessage('Tournament updated successfully!');
        setTimeout(() => {
          navigate(`/tournaments/${tournamentId}`);
        }, 2000);
      } else {
        const newTournamentId = await createTournament(cleanTournamentData, currentUser.id);
        await publishTournament(newTournamentId);
        setMessage('Tournament created and published successfully!');
        setTimeout(() => {
          navigate(`/tournaments/${newTournamentId}`);
        }, 2000);
      }

    } catch (error: any) {
      setError(error.message || 'Failed to create tournament');
    } finally {
      setLoading(false);
    }
  };

  // Load tournament data if in edit mode
  useEffect(() => {
    const loadTournamentForEdit = async () => {
      if (!tournamentId || !currentUser) return;
      
      setIsEditMode(true);
      setLoadingTournament(true);
      
      try {
        const tournament = await getTournament(tournamentId);
        
        if (!tournament) {
          setError('Tournament not found');
          setLoadingTournament(false);
          return;
        }
        
        const canEdit = currentUser.isAdmin || (currentUser.isVerifiedOrganizer && tournament.organizerId === currentUser.id);
        
        if (!canEdit) {
          setError('You do not have permission to edit this tournament');
          setLoadingTournament(false);
          return;
        }
        
        setName(tournament.name || '');
        setDescription(tournament.description || '');
        setRegion(tournament.region || 'Global');
        
        if (tournament.format) {
          setTournamentMode(tournament.format.type as TournamentMode || 'single-elimination');
          const format = tournament.format.matchFormat || 'BO3';
          setMatchFormat(format === 'BO7' ? 'BO5' : format as 'BO1' | 'BO3' | 'BO5');
          setFinalsBO3(tournament.format.finalsMatchFormat === 'BO3');
          const seed = tournament.format.seedingMethod || 'random';
          setSeedingMethod(['random', 'manual'].includes(seed) ? seed as 'random' | 'manual' : 'random');
          
          if (tournament.format.type === 'swiss-system') {
            setSwissRounds(tournament.format.swissConfig?.rounds || 5);
            setTeamsAdvanceToPlayoffs(tournament.format.swissConfig?.teamsAdvanceToPlayoffs || 8);
            setSchedulingWindow(tournament.format.swissConfig?.schedulingWindow || 7);
          }
        }
        
        if (tournament.schedule) {
          if (tournament.schedule.startDate) {
            const start = tournament.schedule.startDate instanceof Date 
              ? tournament.schedule.startDate 
              : tournament.schedule.startDate.toDate();
            setStartDate(start.toISOString().slice(0, 16));
          }
          if (tournament.schedule.endDate) {
            const end = tournament.schedule.endDate instanceof Date 
              ? tournament.schedule.endDate 
              : tournament.schedule.endDate.toDate();
            setEndDate(end.toISOString().slice(0, 16));
          }
        }
        
        if (tournament.prizePool) {
          setTotalPrize(tournament.prizePool.total || 0);
          setCurrency(tournament.prizePool.currency || 'EUR');
        }
        
        if (tournament.requirements) {
          setMaxTeams(tournament.requirements.maxTeams || 8);
          setRequireRiotId(tournament.requirements.requireRiotId || false);
          setRequireRankVerification(tournament.requirements.requireRankVerification || false);
          setMinimumRank(tournament.requirements.minimumRank || '');
          setEntryFee(tournament.requirements.entryFee || 0);
          
          setMinMainPlayers(tournament.requirements.minMainPlayers || 5);
          setMaxMainPlayers(tournament.requirements.maxMainPlayers || 5);
          setMinSubstitutes(tournament.requirements.minSubstitutes || 0);
          setMaxSubstitutes(tournament.requirements.maxSubstitutes || 2);
          setAllowCoaches(tournament.requirements.allowCoaches || false);
          setAllowAssistantCoaches(tournament.requirements.allowAssistantCoaches || false);
          setAllowManagers(tournament.requirements.allowManagers || false);
        }
        
      } catch (error: any) {
        console.error('Error loading tournament:', error);
        setError(error.message || 'Failed to load tournament');
      } finally {
        setLoadingTournament(false);
      }
    };
    
    if (tournamentId) {
      loadTournamentForEdit();
    }
  }, [tournamentId, currentUser]);

  if (!currentUser?.isAdmin && !currentUser?.isVerifiedOrganizer) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-gray-400">
            You need admin privileges or verified organizer status to create tournaments.
          </p>
          {currentUser && !currentUser.isVerifiedOrganizer && (
            <a
              href="/organizer/apply"
              className="mt-4 inline-block text-blue-400 hover:text-blue-300"
            >
              Apply to become an organizer
            </a>
          )}
        </div>
      </div>
    );
  }
  
  if (loadingTournament) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
      </div>
    );
  }

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);
  const canGoNext = validateStep(currentStep);
  const canGoPrevious = currentStepIndex > 0;

  return (
    <div className="min-h-screen bg-[#050505] text-white relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,0,76,0.08),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(0,178,255,0.08),transparent_35%)] pointer-events-none" />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-red-500 font-mono mb-2">
                {isEditMode ? 'Tournament Edit' : 'Tournament Creation'}
              </p>
              <h1 className="text-4xl sm:text-5xl font-bold font-bodax tracking-wider text-white flex items-center">
                <Trophy className="w-8 h-8 mr-3 text-red-500" />
                {isEditMode ? 'Edit Tournament' : 'Create Tournament'}
              </h1>
            </div>
            <button
              onClick={() => navigate(currentUser?.isAdmin ? '/admin/tournaments/manage' : '/organizer/tournaments')}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-gray-800/50 hover:bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-600 font-mono uppercase tracking-wider transition-all"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-between mb-8">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = step.id === currentStep;
              const isCompleted = steps.findIndex(s => s.id === currentStep) > index;
              const isAccessible = index <= currentStepIndex || isCompleted;
              
              return (
                <React.Fragment key={step.id}>
                  <button
                    onClick={() => isAccessible && setCurrentStep(step.id)}
                    disabled={!isAccessible}
                    className={`flex flex-col items-center space-y-2 transition-all ${
                      isAccessible ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                      isActive 
                        ? 'bg-red-600 border-red-500 text-white scale-110' 
                        : isCompleted
                        ? 'bg-green-600 border-green-500 text-white'
                        : 'bg-gray-800 border-gray-700 text-gray-400'
                    }`}>
                      <StepIcon className="w-5 h-5" />
                    </div>
                    <span className={`text-xs font-mono uppercase tracking-wider ${
                      isActive ? 'text-red-400 font-bold' : 'text-gray-400'
                    }`}>
                      {step.label}
                    </span>
                  </button>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-4 transition-all ${
                      isCompleted ? 'bg-green-600' : 'bg-gray-800'
                    }`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-800 rounded-lg flex items-center animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0" />
            <p className="text-red-400 font-mono text-sm">{error}</p>
          </div>
        )}
        {message && (
          <div className="mb-6 p-4 bg-green-900/20 border border-green-800 rounded-lg flex items-center animate-in fade-in">
            <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
            <p className="text-green-400 font-mono text-sm">{message}</p>
          </div>
        )}

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="bg-[#0a0a0a] border border-gray-800 rounded-xl p-8 shadow-2xl">
          {/* STEP 1: BASICS */}
          {currentStep === 'basics' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="mb-6">
                <h2 className="text-2xl font-bodax text-white mb-2 uppercase tracking-wider flex items-center">
                  <Trophy className="w-6 h-6 mr-3 text-red-500" />
                  Basic Information
                </h2>
                <p className="text-gray-400 text-sm font-mono">Tell us about your tournament</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-mono text-gray-300 mb-2 uppercase tracking-wider">
                    Tournament Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full rounded-lg border border-gray-800 bg-[#050505] text-white px-4 py-3 font-mono text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                    placeholder="e.g., Summer Championship 2024"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-mono text-gray-300 mb-2 uppercase tracking-wider">
                    Description *
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="block w-full rounded-lg border border-gray-800 bg-[#050505] text-white px-4 py-3 font-mono text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all resize-none"
                    placeholder="Describe your tournament, rules, and what makes it special..."
                    required
                  />
                </div>

                <div>
                  <label htmlFor="region" className="block text-sm font-mono text-gray-300 mb-2 uppercase tracking-wider">
                    Region
                  </label>
                  <select
                    id="region"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="block w-full rounded-lg border border-gray-800 bg-[#050505] text-white px-4 py-3 font-mono text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                  >
                    <option value="Global">Global</option>
                    <option value="NA">North America</option>
                    <option value="EU">Europe</option>
                    <option value="ASIA">Asia</option>
                    <option value="OCE">Oceania</option>
                    <option value="LATAM">Latin America</option>
                    <option value="BR">Brazil</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: FORMAT */}
          {currentStep === 'format' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="mb-6">
                <h2 className="text-2xl font-bodax text-white mb-2 uppercase tracking-wider flex items-center">
                  <Gamepad2 className="w-6 h-6 mr-3 text-red-500" />
                  Tournament Format
                </h2>
                <p className="text-gray-400 text-sm font-mono">Choose how your tournament will be structured</p>
              </div>

              {/* Tournament Mode Selection */}
              <div>
                <label className="block text-sm font-mono text-gray-300 mb-4 uppercase tracking-wider">
                  Tournament Mode *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tournamentModes.map((mode) => {
                    const ModeIcon = mode.icon;
                    const isSelected = tournamentMode === mode.id;
                    const colorClasses = {
                      red: 'border-red-500 bg-red-900/20',
                      blue: 'border-blue-500 bg-blue-900/20',
                      purple: 'border-purple-500 bg-purple-900/20',
                      green: 'border-green-500 bg-green-900/20',
                      yellow: 'border-yellow-500 bg-yellow-900/20',
                      cyan: 'border-cyan-500 bg-cyan-900/20',
                      orange: 'border-orange-500 bg-orange-900/20',
                    };
                    
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => mode.available && setTournamentMode(mode.id)}
                        disabled={!mode.available}
                        className={`relative p-6 rounded-xl border-2 transition-all text-left ${
                          isSelected 
                            ? `${colorClasses[mode.color as keyof typeof colorClasses]} scale-105 shadow-lg` 
                            : mode.available
                            ? 'border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800'
                            : 'border-gray-800 bg-gray-900/50 opacity-60 cursor-not-allowed'
                        }`}
                      >
                        {mode.comingSoon && (
                          <div className="absolute top-2 right-2 px-2 py-1 bg-yellow-600 text-yellow-100 text-xs font-mono uppercase rounded">
                            Soon
                          </div>
                        )}
                        <div className="flex items-start space-x-4">
                          <div className={`p-3 rounded-lg ${
                            isSelected 
                              ? 'bg-white/10' 
                              : 'bg-gray-700/50'
                          }`}>
                            <ModeIcon className={`w-6 h-6 ${
                              isSelected ? 'text-white' : 'text-gray-400'
                            }`} />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-white mb-1">{mode.name}</h3>
                            <p className="text-sm text-gray-400">{mode.description}</p>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="absolute top-2 right-2">
                            <CheckCircle className="w-5 h-5 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Match Format */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div>
                  <label htmlFor="matchFormat" className="block text-sm font-mono text-gray-300 mb-2 uppercase tracking-wider">
                    Match Format
                  </label>
                    <select
                    id="matchFormat"
                    value={matchFormat}
                    onChange={(e) => setMatchFormat(e.target.value as 'BO1' | 'BO3' | 'BO5' | 'BO7')}
                    className="block w-full rounded-lg border border-gray-800 bg-[#050505] text-white px-4 py-3 font-mono text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                  >
                    <option value="BO1">Best of 1</option>
                    <option value="BO3">Best of 3</option>
                    <option value="BO5">Best of 5</option>
                    <option value="BO7">Best of 7</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="seedingMethod" className="block text-sm font-mono text-gray-300 mb-2 uppercase tracking-wider">
                    Seeding Method
                  </label>
                  <select
                    id="seedingMethod"
                    value={seedingMethod}
                    onChange={(e) => setSeedingMethod(e.target.value as 'random' | 'manual' | 'elo-based' | 'previous-tournament' | 'qualifier-results')}
                    className="block w-full rounded-lg border border-gray-800 bg-[#050505] text-white px-4 py-3 font-mono text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                  >
                    <option value="random">Random Seeding</option>
                    <option value="manual">Manual Seeding</option>
                    <option value="elo-based">ELO-Based (Coming Soon)</option>
                    <option value="previous-tournament">Previous Tournament (Coming Soon)</option>
                    <option value="qualifier-results">Qualifier Results (Coming Soon)</option>
                  </select>
                </div>
              </div>

              {/* Finals BO3 Option */}
              <div className="mt-6 p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
                <div className="flex items-start space-x-3">
                  <input
                    id="finalsBO3"
                    type="checkbox"
                    checked={finalsBO3}
                    onChange={(e) => setFinalsBO3(e.target.checked)}
                    className="mt-1 h-4 w-4 text-red-600 border-gray-600 rounded focus:ring-red-500"
                  />
                  <div className="flex-1">
                    <label htmlFor="finalsBO3" className="text-sm font-medium text-white cursor-pointer">
                      Make Grand Final Best of 3
                    </label>
                    <p className="text-xs text-gray-400 mt-1">
                      The grand final will use BO3 format with full veto system, regardless of the match format above.
                    </p>
                  </div>
                </div>
              </div>

              {/* Swiss System Configuration */}
              {tournamentMode === 'swiss-system' && (
                <div className="mt-6 p-6 bg-purple-900/20 border border-purple-700 rounded-xl">
                  <h3 className="text-lg font-bold text-purple-300 mb-4 flex items-center">
                    <Grid3X3 className="w-5 h-5 mr-2" />
                    Swiss System Configuration
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="swissRounds" className="block text-sm font-mono text-gray-300 mb-2">
                        Swiss Rounds
                      </label>
                      <select
                        id="swissRounds"
                        value={swissRounds}
                        onChange={(e) => setSwissRounds(Number(e.target.value))}
                        className="block w-full rounded-lg border border-gray-800 bg-[#050505] text-white px-4 py-2 font-mono text-sm"
                      >
                        {[3, 4, 5, 6, 7].map(r => (
                          <option key={r} value={r}>{r} Rounds</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="teamsAdvanceToPlayoffs" className="block text-sm font-mono text-gray-300 mb-2">
                        Teams to Playoffs
                      </label>
                      <select
                        id="teamsAdvanceToPlayoffs"
                        value={teamsAdvanceToPlayoffs}
                        onChange={(e) => setTeamsAdvanceToPlayoffs(Number(e.target.value))}
                        className="block w-full rounded-lg border border-gray-800 bg-[#050505] text-white px-4 py-2 font-mono text-sm"
                      >
                        <option value={4}>4 Teams</option>
                        <option value={8}>8 Teams</option>
                        <option value={16}>16 Teams</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="schedulingWindow" className="block text-sm font-mono text-gray-300 mb-2">
                        Scheduling Window (Days)
                      </label>
                      <select
                        id="schedulingWindow"
                        value={schedulingWindow}
                        onChange={(e) => setSchedulingWindow(Number(e.target.value))}
                        className="block w-full rounded-lg border border-gray-800 bg-[#050505] text-white px-4 py-2 font-mono text-sm"
                      >
                        <option value={5}>5 Days</option>
                        <option value={7}>7 Days</option>
                        <option value={10}>10 Days</option>
                        <option value={14}>14 Days</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-purple-900/30 rounded-lg">
                    <p className="text-sm text-purple-200">
                      <Info className="w-4 h-4 inline mr-2" />
                      Teams play against opponents with similar records. Top teams advance to single-elimination playoffs.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: SCHEDULE */}
          {currentStep === 'schedule' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="mb-6">
                <h2 className="text-2xl font-bodax text-white mb-2 uppercase tracking-wider flex items-center">
                  <Calendar className="w-6 h-6 mr-3 text-red-500" />
                  Schedule
                </h2>
                <p className="text-gray-400 text-sm font-mono">When will your tournament take place?</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="startDate" className="block text-sm font-mono text-gray-300 mb-2 uppercase tracking-wider">
                    Start Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    id="startDate"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="block w-full rounded-lg border border-gray-800 bg-[#050505] text-white px-4 py-3 font-mono text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                    required
                  />
                  <p className="mt-2 text-xs text-gray-400 font-mono">
                    When the tournament will begin
                  </p>
                </div>
                <div>
                  <label htmlFor="endDate" className="block text-sm font-mono text-gray-300 mb-2 uppercase tracking-wider">
                    End Date & Time (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    id="endDate"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="block w-full rounded-lg border border-gray-800 bg-[#050505] text-white px-4 py-3 font-mono text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                  />
                  <p className="mt-2 text-xs text-gray-400 font-mono">
                    Leave empty to auto-calculate (7 days from start)
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: REGISTRATION */}
          {currentStep === 'registration' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="mb-6">
                <h2 className="text-2xl font-bodax text-white mb-2 uppercase tracking-wider flex items-center">
                  <Users className="w-6 h-6 mr-3 text-red-500" />
                  Registration Settings
                </h2>
                <p className="text-gray-400 text-sm font-mono">Configure team requirements and composition</p>
              </div>

              {/* Max Teams */}
              <div>
                <label htmlFor="maxTeams" className="block text-sm font-mono text-gray-300 mb-2 uppercase tracking-wider">
                  Maximum Teams *
                </label>
                {tournamentMode === 'swiss-system' ? (
                  <input
                    type="number"
                    id="maxTeams"
                    value={maxTeams}
                    onChange={(e) => setMaxTeams(parseInt(e.target.value) || 4)}
                    min={4}
                    max={64}
                    className="block w-full rounded-lg border border-gray-800 bg-[#050505] text-white px-4 py-3 font-mono text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                    required
                  />
                ) : (
                  <select
                    id="maxTeams"
                    value={maxTeams}
                    onChange={(e) => setMaxTeams(parseInt(e.target.value))}
                    className="block w-full rounded-lg border border-gray-800 bg-[#050505] text-white px-4 py-3 font-mono text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                    required
                  >
                    <option value={2}>2 Teams</option>
                    <option value={4}>4 Teams</option>
                    <option value={8}>8 Teams</option>
                    <option value={16}>16 Teams</option>
                    <option value={32}>32 Teams</option>
                  </select>
                )}
                <p className="mt-2 text-xs text-gray-400 font-mono">
                  {tournamentMode === 'swiss-system' 
                    ? 'Swiss system supports 4-64 teams'
                    : `Valid sizes for ${tournamentMode} tournaments`
                  }
                </p>
              </div>

              {/* Team Composition */}
              <div className="mt-6 p-6 bg-gray-800/50 border border-gray-700 rounded-xl">
                <h3 className="text-lg font-bold text-white mb-4">Team Composition</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label htmlFor="minMainPlayers" className="block text-xs font-mono text-gray-400 mb-1">
                      Min Main Players
                    </label>
                    <input
                      type="number"
                      id="minMainPlayers"
                      value={minMainPlayers}
                      onChange={(e) => setMinMainPlayers(parseInt(e.target.value) || 5)}
                      min={1}
                      max={10}
                      className="block w-full rounded-lg border border-gray-800 bg-[#050505] text-white px-3 py-2 font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="maxMainPlayers" className="block text-xs font-mono text-gray-400 mb-1">
                      Max Main Players
                    </label>
                    <input
                      type="number"
                      id="maxMainPlayers"
                      value={maxMainPlayers}
                      onChange={(e) => setMaxMainPlayers(parseInt(e.target.value) || 5)}
                      min={minMainPlayers}
                      max={10}
                      className="block w-full rounded-lg border border-gray-800 bg-[#050505] text-white px-3 py-2 font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="minSubstitutes" className="block text-xs font-mono text-gray-400 mb-1">
                      Min Substitutes
                    </label>
                    <input
                      type="number"
                      id="minSubstitutes"
                      value={minSubstitutes}
                      onChange={(e) => setMinSubstitutes(parseInt(e.target.value) || 0)}
                      min={0}
                      max={5}
                      className="block w-full rounded-lg border border-gray-800 bg-[#050505] text-white px-3 py-2 font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="maxSubstitutes" className="block text-xs font-mono text-gray-400 mb-1">
                      Max Substitutes
                    </label>
                    <input
                      type="number"
                      id="maxSubstitutes"
                      value={maxSubstitutes}
                      onChange={(e) => setMaxSubstitutes(parseInt(e.target.value) || 2)}
                      min={minSubstitutes}
                      max={5}
                      className="block w-full rounded-lg border border-gray-800 bg-[#050505] text-white px-3 py-2 font-mono text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowCoaches}
                      onChange={(e) => setAllowCoaches(e.target.checked)}
                      className="rounded border-gray-600 bg-[#050505] text-red-600 focus:ring-red-500"
                    />
                    <span className="text-sm text-gray-300">Allow Coaches</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowAssistantCoaches}
                      onChange={(e) => setAllowAssistantCoaches(e.target.checked)}
                      className="rounded border-gray-600 bg-[#050505] text-red-600 focus:ring-red-500"
                    />
                    <span className="text-sm text-gray-300">Allow Assistant Coaches</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowManagers}
                      onChange={(e) => setAllowManagers(e.target.checked)}
                      className="rounded border-gray-600 bg-[#050505] text-red-600 focus:ring-red-500"
                    />
                    <span className="text-sm text-gray-300">Allow Managers</span>
                  </label>
                </div>
              </div>

              {/* Requirements */}
              <div className="mt-6 space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="requireRiotId"
                    checked={requireRiotId}
                    onChange={(e) => setRequireRiotId(e.target.checked)}
                    className="rounded border-gray-600 bg-[#050505] text-red-600 focus:ring-red-500"
                  />
                  <label htmlFor="requireRiotId" className="text-sm text-gray-300 cursor-pointer">
                    Require Riot ID
                  </label>
                </div>
                {requireRiotId && (
                  <div className="ml-6 space-y-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="requireRankVerification"
                        checked={requireRankVerification}
                        onChange={(e) => setRequireRankVerification(e.target.checked)}
                        className="rounded border-gray-600 bg-[#050505] text-red-600 focus:ring-red-500"
                      />
                      <label htmlFor="requireRankVerification" className="text-sm text-gray-300 cursor-pointer">
                        Require Rank Verification
                      </label>
                    </div>
                    {requireRankVerification && (
                      <div>
                        <label htmlFor="minimumRank" className="block text-xs font-mono text-gray-400 mb-1">
                          Minimum Rank
                        </label>
                        <input
                          type="text"
                          id="minimumRank"
                          value={minimumRank}
                          onChange={(e) => setMinimumRank(e.target.value)}
                          placeholder="e.g., Gold, Platinum"
                          className="block w-full rounded-lg border border-gray-800 bg-[#050505] text-white px-3 py-2 font-mono text-sm"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Entry Fee for Organizers */}
              {currentUser?.isVerifiedOrganizer && (
                <div className="mt-6 p-6 bg-blue-900/20 border border-blue-800 rounded-xl">
                  <div className="flex items-center gap-3 mb-4">
                    <DollarSign className="w-6 h-6 text-blue-400" />
                    <h3 className="text-lg font-bold text-blue-200 uppercase tracking-wider">Entry Fee</h3>
                  </div>
                  <div>
                    <label htmlFor="entryFee" className="block text-sm font-mono text-gray-300 mb-2 uppercase tracking-wider">
                      Participation Fee per Team (EUR) *
                    </label>
                    <input
                      type="number"
                      id="entryFee"
                      value={entryFee}
                      onChange={(e) => setEntryFee(parseFloat(e.target.value) || 0)}
                      min={0}
                      step="0.01"
                      className="block w-full rounded-lg border border-gray-800 bg-[#050505] text-white px-4 py-3 font-mono text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                      placeholder="0.00"
                      required
                    />
                    <div className="mt-4 p-4 bg-blue-900/30 rounded-lg space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400 font-mono">Platform fee (5%):</span>
                        <span className="text-red-400 font-mono font-bold">€{entryFee > 0 ? (entryFee * 0.05).toFixed(2) : '0.00'}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400 font-mono">Your payout per team:</span>
                        <span className="text-green-400 font-mono font-bold">€{entryFee > 0 ? (entryFee * 0.95).toFixed(2) : '0.00'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 5: PRIZES */}
          {currentStep === 'prizes' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="mb-6">
                <h2 className="text-2xl font-bodax text-white mb-2 uppercase tracking-wider flex items-center">
                  <Crown className="w-6 h-6 mr-3 text-red-500" />
                  Prize Pool
                </h2>
                <p className="text-gray-400 text-sm font-mono">Set up prizes for winners (optional)</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="totalPrize" className="block text-sm font-mono text-gray-300 mb-2 uppercase tracking-wider">
                    Total Prize Pool
                  </label>
                  <input
                    type="number"
                    id="totalPrize"
                    value={totalPrize}
                    onChange={(e) => setTotalPrize(parseInt(e.target.value) || 0)}
                    min={0}
                    className="block w-full rounded-lg border border-gray-800 bg-[#050505] text-white px-4 py-3 font-mono text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="currency" className="block text-sm font-mono text-gray-300 mb-2 uppercase tracking-wider">
                    Currency
                  </label>
                  <select
                    id="currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as 'USD' | 'EUR' | 'GBP')}
                    className="block w-full rounded-lg border border-gray-800 bg-[#050505] text-white px-4 py-3 font-mono text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
              </div>

              {/* Prize Distribution Preview */}
              {totalPrize > 0 && (
                <div className="mt-6 p-6 bg-gradient-to-br from-yellow-900/20 to-orange-900/20 border border-yellow-700 rounded-xl">
                  <h3 className="text-lg font-bold text-yellow-300 mb-4 flex items-center">
                    <Crown className="w-5 h-5 mr-2" />
                    Prize Distribution
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-yellow-900/30 rounded-lg border border-yellow-800">
                      <div className="text-2xl font-bold text-yellow-400 mb-1">1st</div>
                      <div className="text-white font-mono">{Math.floor(totalPrize * 0.6)} {currency}</div>
                      <div className="text-xs text-yellow-300 mt-1">60%</div>
                    </div>
                    <div className="text-center p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                      <div className="text-2xl font-bold text-gray-400 mb-1">2nd</div>
                      <div className="text-white font-mono">{Math.floor(totalPrize * 0.3)} {currency}</div>
                      <div className="text-xs text-gray-400 mt-1">30%</div>
                    </div>
                    <div className="text-center p-4 bg-orange-900/30 rounded-lg border border-orange-800">
                      <div className="text-2xl font-bold text-orange-400 mb-1">3rd</div>
                      <div className="text-white font-mono">{totalPrize - Math.floor(totalPrize * 0.6) - Math.floor(totalPrize * 0.3)} {currency}</div>
                      <div className="text-xs text-orange-300 mt-1">10%</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 6: REVIEW */}
          {currentStep === 'review' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="mb-6">
                <h2 className="text-2xl font-bodax text-white mb-2 uppercase tracking-wider flex items-center">
                  <CheckCircle className="w-6 h-6 mr-3 text-red-500" />
                  Review & Create
                </h2>
                <p className="text-gray-400 text-sm font-mono">Review your tournament settings before creating</p>
              </div>

              <div className="space-y-4">
                <div className="p-6 bg-gray-800/50 border border-gray-700 rounded-xl">
                  <h3 className="font-bold text-white mb-4 flex items-center">
                    <Trophy className="w-5 h-5 mr-2 text-red-500" />
                    Tournament Details
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Name:</span>
                      <p className="text-white font-semibold">{name || 'Not set'}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Region:</span>
                      <p className="text-white font-semibold">{region}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-400">Description:</span>
                      <p className="text-white">{description || 'Not set'}</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-gray-800/50 border border-gray-700 rounded-xl">
                  <h3 className="font-bold text-white mb-4 flex items-center">
                    <Gamepad2 className="w-5 h-5 mr-2 text-red-500" />
                    Format
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Mode:</span>
                      <p className="text-white font-semibold">{tournamentModes.find(m => m.id === tournamentMode)?.name}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Match Format:</span>
                      <p className="text-white font-semibold">{matchFormat}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Max Teams:</span>
                      <p className="text-white font-semibold">{maxTeams}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Seeding:</span>
                      <p className="text-white font-semibold">{seedingMethod === 'random' ? 'Random' : 'Manual'}</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-gray-800/50 border border-gray-700 rounded-xl">
                  <h3 className="font-bold text-white mb-4 flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-red-500" />
                    Schedule
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Start:</span>
                      <p className="text-white font-semibold">{startDate ? new Date(startDate).toLocaleString() : 'Not set'}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">End:</span>
                      <p className="text-white font-semibold">{endDate ? new Date(endDate).toLocaleString() : 'Auto-calculated'}</p>
                    </div>
                  </div>
                </div>

                {totalPrize > 0 && (
                  <div className="p-6 bg-gradient-to-br from-yellow-900/20 to-orange-900/20 border border-yellow-700 rounded-xl">
                    <h3 className="font-bold text-yellow-300 mb-4 flex items-center">
                      <Crown className="w-5 h-5 mr-2" />
                      Prize Pool
                    </h3>
                    <div className="text-3xl font-bold text-white mb-2">
                      {totalPrize} {currency}
                    </div>
                    <div className="text-sm text-yellow-300">
                      1st: {Math.floor(totalPrize * 0.6)} {currency} • 2nd: {Math.floor(totalPrize * 0.3)} {currency} • 3rd: {totalPrize - Math.floor(totalPrize * 0.6) - Math.floor(totalPrize * 0.3)} {currency}
                    </div>
                  </div>
                )}

                {currentUser?.isVerifiedOrganizer && entryFee > 0 && (
                  <div className="p-6 bg-blue-900/20 border border-blue-800 rounded-xl">
                    <h3 className="font-bold text-blue-300 mb-4 flex items-center">
                      <DollarSign className="w-5 h-5 mr-2" />
                      Entry Fee
                    </h3>
                    <div className="text-2xl font-bold text-white mb-2">
                      €{entryFee.toFixed(2)} per team
                    </div>
                    <div className="text-sm text-blue-300 space-y-1">
                      <div>Platform fee: €{(entryFee * 0.05).toFixed(2)}</div>
                      <div>Your payout: €{(entryFee * 0.95).toFixed(2)} per team</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-800">
            <button
              type="button"
              onClick={handlePrevious}
              disabled={!canGoPrevious}
              className={`flex items-center px-6 py-3 text-sm font-mono uppercase tracking-wider transition-all border rounded-lg ${
                canGoPrevious
                  ? 'bg-gray-800 hover:bg-gray-700 text-white border-gray-700 hover:border-gray-600'
                  : 'bg-gray-900 text-gray-600 border-gray-800 cursor-not-allowed'
              }`}
            >
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              Previous
            </button>

            {currentStep === 'review' ? (
              <button
                type="submit"
                disabled={loading || !canGoNext}
                className={`flex items-center px-8 py-3 text-sm font-bodax uppercase tracking-wider text-white transition-all border rounded-lg ${
                  loading || !canGoNext
                    ? 'bg-gray-800 cursor-not-allowed border-gray-700'
                    : 'bg-red-600 hover:bg-red-700 border-red-800 hover:border-red-500 shadow-lg hover:shadow-red-900/50'
                }`}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {isEditMode ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {isEditMode ? 'Update Tournament' : 'Create Tournament'}
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                disabled={!canGoNext}
                className={`flex items-center px-6 py-3 text-sm font-mono uppercase tracking-wider transition-all border rounded-lg ${
                  canGoNext
                    ? 'bg-red-600 hover:bg-red-700 text-white border-red-800 hover:border-red-500 shadow-lg hover:shadow-red-900/50'
                    : 'bg-gray-800 text-gray-600 border-gray-700 cursor-not-allowed'
                }`}
              >
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default TournamentCreation;
