import type {
  TournamentStageStateMapV2,
  TournamentStageType,
  TournamentStructureV2,
} from './tournamentStructure';

export interface User {
  id: string;
  uid?: string; // Firebase Auth UID
  username: string;
  email: string;
  riotId: string;
  riotIdSet?: boolean; // Whether Riot ID has been set (prevents user changes) - optional for backward compatibility
  riotIdSetAt?: Date; // When Riot ID was first set
  discordUsername: string;
  nationality?: string; // User's nationality
  // Discord OAuth fields
  discordId?: string;
  discordAvatar?: string;
  discordLinked?: boolean;
  inDiscordServer?: boolean; // Whether user is a member of the Discord server
  createdAt: Date;
  teamIds: string[]; // Array of team IDs the user is part of
  isAdmin: boolean;
  // Organizer fields
  isOrganizer?: boolean; // Whether user has applied to be an organizer
  isVerifiedOrganizer?: boolean; // Whether organizer has been verified by admin
  organizerInfo?: OrganizerInfo;
}

// Organizer Information
export interface OrganizerInfo {
  businessName: string;
  businessEmail: string;
  businessAddress?: string;
  taxId?: string;
  bankAccountDetails?: string; // IBAN or account details
  stripeConnectAccountId?: string; // Stripe Connect account ID
  stripeConnectOnboardingComplete?: boolean;
  applicationStatus: 'pending' | 'approved' | 'rejected';
  appliedAt: Date | any;
  verifiedAt?: Date | any;
  verifiedBy?: string; // Admin ID who verified
  rejectionReason?: string;
}

export interface TeamMember {
  userId: string;
  role: 'owner' | 'captain' | 'member' | 'coach' | 'assistant_coach' | 'manager';
  joinedAt: Date;
  isActive: boolean;
}

export interface TournamentTeamMember {
  userId: string;
  role: 'main_player' | 'substitute' | 'coach' | 'assistant_coach' | 'manager';
  joinedAt: Date;
  isActive: boolean;
}

export interface MatchTeamRoster {
  teamId: string;
  mainPlayers: string[]; // 5 main players
  substitutes: string[]; // 2 substitutes
  coach?: string; // Optional coach
  assistantCoach?: string; // Optional assistant coach
  manager?: string; // Optional manager
  readyUpTime: Date;
  isReady: boolean;
}

export interface Team {
  id: string;
  name: string;
  ownerId: string; // User who owns the team
  captainId: string; // User who is captain (can be same as owner)
  members: TeamMember[]; // Array of team members with roles
  teamTag: string;
  description: string;
  createdAt: Date;
  registeredForTournament: boolean;
  tournamentRegistrationDate?: Date;
  maxMembers: number; // Maximum number of members allowed (10 total)

  // Currently selected roster for a match (set during ready-up)
  activePlayers?: string[]; // 5 main player userIds
  
  // Team composition limits
  maxMainPlayers: number; // 5 main players
  maxSubstitutes: number; // 2 substitutes
  maxCoaches: number; // 1 coach
  maxAssistantCoaches: number; // 1 assistant coach
  maxManagers: number; // 1 manager
  
  // Roster change tracking
  rosterChangesUsed: number; // Number of roster changes used (max 3)
  rosterLocked: boolean; // Whether roster is locked by admin
  rosterLockDate?: Date; // When roster was locked
  rosterChangeDeadline: Date; // Deadline for roster changes (21.09.2025)
}

export interface TeamInvitation {
  id: string;
  teamId: string;
  invitedUserId: string;
  invitedByUserId: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: Date;
  expiresAt: Date;
  message?: string; // Optional message from inviter
}

export interface RosterChange {
  id: string;
  teamId: string;
  userId: string; // User who was added/removed
  changeType: 'add' | 'remove';
  role: 'owner' | 'captain' | 'member' | 'coach' | 'assistant_coach' | 'manager';
  changedByUserId: string; // Who made the change
  changedAt: Date;
  reason?: string; // Optional reason for the change
}

export interface UserSession {
  id: string;
  userId: string;
  ipAddress: string;
  userAgent: string;
  loginTime: Date;
  lastActivity: Date;
  isActive: boolean;
}

export interface IPAnalysis {
  ipAddress: string;
  userCount: number;
  users: Array<{
    userId: string;
    username: string;
    lastSeen: Date;
    sessionCount: number;
  }>;
  riskLevel: 'low' | 'medium' | 'high';
  suspiciousActivity: string[];
}

export interface Notification {
  id: string;
  userId: string;
  type: 'team_invite' | 'team_role_change' | 'team_removal' | 'tournament_invite' | 'match_scheduled' | 'match_result';
  title: string;
  message: string;
  data?: any; // Additional data like teamId, invitationId, etc.
  isRead: boolean;
  createdAt: Date;
  expiresAt?: Date;
  actionRequired?: boolean; // Whether user needs to take action
  actionUrl?: string; // URL to navigate to when clicked
}

export interface Match {
  id: string;
  team1Id: string | null;
  team2Id: string | null;
  team1Score: number;
  team2Score: number;
  winnerId?: string | null; // ID of the winning team
  isComplete: boolean;
  round: number;
  matchNumber: number;
  nextMatchId?: string;
  tournamentId?: string; // ID of the tournament this match belongs to
  tournamentType: 'qualifier' | 'final' | 'single-elim' | 'double-elim' | 'group-stage' | 'knockout-stage' | 'swiss-round' | 'playoff';
  bracketType?: 'winners' | 'losers' | 'grand_final';
  // ---- Stage-based tournaments (structureV2) ----
  stageId?: string; // e.g. "groups", "playoffs"
  stageType?: TournamentStageType; // e.g. "groups_round_robin"
  groupId?: string; // e.g. "group-A"
  stageRound?: number; // round within stage (do not confuse with Match.round)
  createdAt: Date;
  // Map banning system
  matchState: 'ready_up' | 'map_banning' | 'side_selection_map1' | 'side_selection_map2' | 'side_selection_decider' | 'playing' | 'waiting_results' | 'disputed' | 'completed' | 'scheduled' | 'pending_scheduling' | 'forfeited';
  mapPool: string[];
  bannedMaps: {
    team1: string[];
    team2: string[];
  };
  selectedMap?: string;
  team1Ready: boolean;
  team2Ready: boolean;
  team1MapBans: string[];
  team2MapBans: string[];
  team1MapPick?: string;
  team2MapPick?: string;
  
  // Team rosters for the match
  team1Roster?: MatchTeamRoster;
  team2Roster?: MatchTeamRoster;
  // Side selection (attack/defense) - direct properties
  team1Side?: 'attack' | 'defense';
  team2Side?: 'attack' | 'defense';
  // Side selection (attack/defense)
  sideSelection?: {
    team1Side?: 'attack' | 'defense';
    team2Side?: 'attack' | 'defense';
    team1SideSelected?: boolean;
    team2SideSelected?: boolean;
  };
  // Result submission system
  resultSubmission?: {
    team1Submitted: boolean;
    team2Submitted: boolean;
    team1SubmittedScore: { team1Score: number; team2Score: number } | null;
    team2SubmittedScore: { team1Score: number; team2Score: number } | null;
    submittedAt?: Date;
    adminOverride?: boolean;
    adminOverrideAt?: Date;
    adminId?: string;
    forceComplete?: boolean;
    byeMatch?: boolean;
  };
  // Dispute system
  dispute?: {
    createdBy: string;
    createdAt: Date;
    reason: 'manual_dispute' | 'score_mismatch';
    team1SubmittedScore?: { team1Score: number; team2Score: number };
    team2SubmittedScore?: { team1Score: number; team2Score: number };
  };
  // Additional dispute properties
  disputeRequested?: boolean;
  disputeReason?: string;
  adminAssigned?: string;
  adminResolution?: string;
  resolvedAt?: Date;
  
  // Swiss System and Scheduling
  swissRound?: number;
  matchday?: number;
  scheduledTime?: Date;
  schedulingProposals?: SchedulingProposal[];
  currentSchedulingStatus?: 'pending' | 'proposed' | 'accepted' | 'denied' | 'rescheduled';
  
  // Forfeit System
  forfeitTime?: Date; // When teams forfeit if not ready (15 min after match time)
  matchFormat?: MatchFormat; // BO1, BO3, BO5, BO7
  currentMap?: number; // Current map being played (1, 2, or 3 for BO3)
  
  // BO3 Map System
  map1?: string; // Selected map for Map 1
  map1Side?: 'attack' | 'defense'; // Side selected for Map 1
  map2?: string; // Selected map for Map 2
  map2Side?: 'attack' | 'defense'; // Side selected for Map 2
  deciderMap?: string; // Remaining map for Map 3 (decider)
  deciderMapSide?: 'attack' | 'defense'; // Side selected for Decider Map
  banSequence?: Array<{ teamId: string; mapName: string; banNumber: number }>; // Sequence of map bans

  // Veto / banning order controls (Team A / Team B + optional admin override)
  veto?: {
    // Team A starts the veto (first ban, Map 1 pick in BO3, etc.)
    teamAId?: string | null;
    teamBId?: string | null;
    coinflip?: {
      performed: boolean;
      winnerTeamId?: string | null;
      // Winner chooses whether they want to be Team A or Team B
      winnerChoice?: 'A' | 'B';
      performedAt?: Date;
      performedByUserId?: string;
      chosenAt?: Date;
      chosenByUserId?: string;
    };
    adminOverride?: {
      enabled: boolean;
      // Optional: fully define the banning turn order by ban step (allows repeats)
      banTurnOrderTeamIds?: string[];
      setByUserId?: string;
      setAt?: Date;
      note?: string;
    };
  };
  
  mapResults?: {
    map1?: { team1Score: number; team2Score: number; winner?: string };
    map2?: { team1Score: number; team2Score: number; winner?: string };
    map3?: { team1Score: number; team2Score: number; winner?: string };
  };
  
  // Map submission system for BO3
  mapSubmissions?: {
    map1?: {
      team1Submitted: boolean;
      team2Submitted: boolean;
      team1SubmittedScore: { team1Score: number; team2Score: number } | null;
      team2SubmittedScore: { team1Score: number; team2Score: number } | null;
      submittedAt?: Date;
    };
    map2?: {
      team1Submitted: boolean;
      team2Submitted: boolean;
      team1SubmittedScore: { team1Score: number; team2Score: number } | null;
      team2SubmittedScore: { team1Score: number; team2Score: number } | null;
      submittedAt?: Date;
    };
    map3?: {
      team1Submitted: boolean;
      team2Submitted: boolean;
      team1SubmittedScore: { team1Score: number; team2Score: number } | null;
      team2SubmittedScore: { team1Score: number; team2Score: number } | null;
      submittedAt?: Date;
    };
  };
  
  // Streaming information
  streamingInfo?: {
    isStreamed: boolean;
    streamUrl?: string;
    streamPlatform?: 'twitch' | 'youtube';
    username?: string;
    isLive?: boolean;
    casters?: Array<{ name: string; role: string }>;
  };
  
  // Admin tickbox system
  adminTickbox?: boolean; // Whether match is marked by admin
  adminTickboxAt?: Date; // When it was ticked
  adminTickboxBy?: string; // Who ticked it (admin ID)

  // Riot API auto-detection result (optional, stored for UI display / debugging)
  autoDetectedResult?: {
    detected: boolean;
    matchId?: string;
    matchDetails?: any;
    team1Score?: number;
    team2Score?: number;
    detectedAt?: Date | any; // Allow Firestore Timestamp/serverTimestamp
    confidence?: 'low' | 'medium' | 'high';
    team1PlayersFound?: number;
    team2PlayersFound?: number;
    error?: string;
  };
}

// Tournament Types and Formats
export type TournamentType = 
  | 'single-elimination' 
  | 'double-elimination' 
  | 'round-robin' 
  | 'swiss-system'
  | 'group-stage-single-elim'
  | 'group-stage-double-elim'
  | 'group-stage-knockout'
  | 'gauntlet'
  | 'battle-royale'
  | 'league';

export type MatchFormat = 'BO1' | 'BO3' | 'BO5' | 'BO7';
export type SideSelectionMethod = 'coin-flip' | 'higher-seed' | 'manual' | 'alternating';
export type SeedingMethod = 'random' | 'manual' | 'elo-based' | 'previous-tournament' | 'qualifier-results';
export type RegistrationApproval = 'automatic' | 'manual' | 'first-come-first-served';
export type TournamentStatus = 
  | 'draft' 
  | 'registration-open' 
  | 'registration-closed' 
  | 'in-progress'
  | 'group-stage' 
  | 'group-stage-completed'
  | 'knockout-stage' 
  | 'completed' 
  | 'cancelled';

export type TournamentStage = 'registration' | 'group-stage' | 'knockout-stage' | 'completed';

// Swiss System specific
export interface SwissRound {
  roundNumber: number;
  matchday: number;
  startDate: Date;
  endDate: Date;
  matches: string[]; // Match IDs
  isComplete: boolean;
  standings: SwissStanding[];
}

export interface SwissStanding {
  teamId: string;
  points: number;
  matchWins: number;
  matchLosses: number;
  gameWins: number;
  gameLosses: number;
  roundsWon: number; // Total rounds won across all maps
  roundsLost: number; // Total rounds lost across all maps
  opponents: string[]; // Team IDs of opponents faced
  buchholzScore?: number; // Tiebreaker score
  sonnebornBergerScore?: number; // Another tiebreaker
}

// Match Scheduling System
export interface SchedulingProposal {
  id: string;
  proposedBy: string; // Team ID
  proposedTime: Date;
  message?: string;
  status: 'pending' | 'accepted' | 'denied' | 'cancelled';
  respondedAt?: Date;
  responseMessage?: string;
  alternativeProposal?: Date; // Required when denying
  createdAt: Date;
}

export interface Matchday {
  id: string;
  tournamentId: string;
  matchdayNumber: number;
  startDate: Date;
  endDate: Date;
  matches: string[]; // Match IDs
  isComplete: boolean;
  schedulingDeadline: Date; // When teams must have scheduled their matches
  autoScheduleTime?: Date; // When admin will auto-schedule if not done
}

// Tournament Format Configuration
export interface TournamentFormat {
  type: TournamentType;
  teamCount: number;
  matchFormat: MatchFormat;
  finalsMatchFormat?: MatchFormat;
  mapPool: string[];
  sideSelection: SideSelectionMethod;
  seedingMethod: SeedingMethod;
  
  // Group Stage specific
  groupStage?: {
    groupCount: number;
    teamsPerGroup: number;
    teamsAdvancePerGroup: number;
    groupFormat: 'round-robin' | 'swiss' | 'single-elim';
  };
  
  // Knockout Stage specific
  knockoutStage?: {
    type: 'single-elimination' | 'double-elimination';
    teamsAdvance: number;
  };
  
  // Swiss System specific
  swissRounds?: number;
  swissConfig?: {
    rounds: number;
    teamsAdvanceToPlayoffs: number;
    tiebreakerMethod: 'buchholz' | 'sonneborn-berger' | 'direct-encounter';
    schedulingWindow: number; // Days teams have to schedule matches
  };
  
  // League specific
  leagueFormat?: {
    seasonLength: number; // weeks
    matchesPerWeek: number;
    playoffTeams: number;
  };
}

// Tournament Rules
export interface TournamentRules {
  overtimeRules: string;
  pauseRules: string;
  substitutionRules: string;
  disputeProcess: string;
  forfeitRules: string;
  technicalIssues: string;
  codeOfConduct: string;
  antiCheatPolicy: string;
  streamingRules: string;
  communicationRules: string;
}

// Registration Requirements
export interface RegistrationRequirements {
  minPlayers: number;
  maxPlayers: number;
  requiredRoles: string[];
  requireDiscord: boolean;
  requireRiotId: boolean;
  requireRankVerification: boolean;
  minimumRank?: string | null;
  entryFee?: number | null;
  approvalProcess: RegistrationApproval;
  maxTeams: number;
  registrationDeadline: Date | any; // Allow Firestore Timestamp
  teamValidationRules: string[];
  
  // Team composition requirements
  minMainPlayers: number; // Minimum main players required (5)
  maxMainPlayers: number; // Maximum main players allowed (5)
  minSubstitutes: number; // Minimum substitutes required (0)
  maxSubstitutes: number; // Maximum substitutes allowed (2)
  allowCoaches: boolean; // Whether coaches are allowed
  allowAssistantCoaches: boolean; // Whether assistant coaches are allowed
  allowManagers: boolean; // Whether managers are allowed
  
  // Additional properties for compatibility
  format?: string;
  teamSize?: number;
  skillLevel?: string;
}

// Tournament Schedule
export interface TournamentSchedule {
  startDate: Date | any; // Allow Firestore Timestamp
  endDate: Date | any; // Allow Firestore Timestamp
  timeZone: string;
  matchDuration: number; // minutes
  breakTime: number; // minutes between matches
  checkInTime: number; // minutes before match
  maxMatchesPerDay: number;
  preferredMatchTimes: string[]; // ["18:00", "20:00", "22:00"]
  blackoutDates: (Date | any)[]; // Allow Firestore Timestamps
}

// Prize Pool
export interface PrizePool {
  total: number;
  distribution: {
    first: number;
    second: number;
    third: number;
    fourth?: number;
    fifth?: number;
    sixth?: number;
    seventh?: number;
    eighth?: number;
  };
  currency: 'EUR' | 'USD' | 'GBP';
  paymentMethod: string;
  taxInfo: string;
}

// Tournament Statistics
export interface TournamentStats {
  registrationCount: number;
  completedMatches: number;
  totalMatches: number;
  averageMatchDuration: number;
  disputeCount: number;
  forfeitCount: number;
  viewershipPeak: number;
  totalViewership: number;
  completionRate: number;
  participantSatisfaction?: number;
}

// Tournament Stage Management
export interface GroupStanding {
  teamId: string;
  played: number;
  won: number;
  lost: number;
  drawn: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
}

export interface TournamentStageManagement {
  currentStage: TournamentStage;
  groupStage?: {
    isActive: boolean;
    currentMatchDay: number;
    totalMatchDays: number;
    groups: {
      id: string;
      name: string;
      teams: string[];
      standings: GroupStanding[];
      completedMatches: number;
      totalMatches: number;
    }[];
    completedGroups: string[];
  };
  knockoutStage?: {
    isActive: boolean;
    currentRound: number;
    totalRounds: number;
    bracketType: 'single-elimination' | 'double-elimination';
    teamsAdvancing: string[];
  };
  swissStage?: {
    isActive: boolean;
    isComplete?: boolean;
    currentRound: number;
    totalRounds: number;
    currentMatchday: number;
    totalMatchdays: number;
    rounds: SwissRound[];
    standings: SwissStanding[];
    teamsAdvancingToPlayoffs: string[];
  };
  playoffStage?: {
    isActive: boolean;
    currentRound: number;
    totalRounds: number;
    bracketType: 'single-elimination' | 'double-elimination';
    teamsAdvancing: string[];
  };
}

// Enhanced Tournament Interface
export interface Tournament {
  id: string;
  name: string;
  description: string;
  logo?: string;
  banner?: string;
  
  // Format and Rules
  format: TournamentFormat;
  rules: TournamentRules;
  requirements: RegistrationRequirements;
  schedule: TournamentSchedule;
  prizePool: PrizePool;
  
  // Status and Management
  status: TournamentStatus;
  type?: TournamentType;
  stageManagement: TournamentStageManagement;
  /**
   * Stage-based tournament structure (v2). Optional for backward compatibility.
   * When present, UI/services should prefer this over legacy `format.groupStage/knockoutStage` flows.
   */
  structureV2?: TournamentStructureV2;
  /**
   * Runtime state for structureV2 stages (stored on the tournament doc).
   */
  stageStateV2?: TournamentStageStateMapV2;
  createdBy: string; // Admin ID
  adminIds: string[]; // Additional admin IDs
  createdAt: Date | any; // Allow Firestore Timestamp
  updatedAt: Date | any; // Allow Firestore Timestamp
  publishedAt?: Date | any; // Allow Firestore Timestamp
  
  // Teams and Participants
  teams: string[]; // Registered team IDs
  approvedTeams?: string[]; // Approved team IDs
  waitlist: string[]; // Waitlisted team IDs
  rejectedTeams: string[]; // Rejected team IDs
  
  // Bracket and Matches
  brackets: {
    groupStage?: any; // Group stage bracket data
    knockoutStage?: any; // Knockout stage bracket data
    finalBracket?: any; // Final bracket data
  };
  matches: string[]; // Match IDs
  
  // Seeding and Rankings
  seeding: {
    method: SeedingMethod;
    rankings: { teamId: string; seed: number; elo?: number }[];
  };
  
  // Statistics
  stats: TournamentStats;
  
  // Prize Distribution (legacy support)
  prizeDistribution?: PrizePool;
  
  // Integration
  discordServerId?: string;
  discordChannelId?: string;
  streamUrl?: string;
  
  // Metadata
  tags: string[];
  region: string;
  isPublic: boolean;
  featured: boolean;
  
  // Advanced Features
  qualifierTournaments?: string[]; // IDs of qualifier tournaments
  wildcardSpots?: number;
  invitedTeams?: string[]; // Pre-invited team IDs
  customFields?: Record<string, any>; // For extensibility
  
  // Payment and Organizer fields
  organizerId?: string; // ID of verified organizer who created this tournament
  paymentInfo?: TournamentPaymentInfo;
}

// Tournament Payment Information
export interface TournamentPaymentInfo {
  entryFee: number; // Entry fee per team in EUR
  currency: 'EUR'; // Only EUR supported for now
  platformFeePercentage: number; // 5% platform fee
  totalCollected: number; // Total amount collected from teams
  platformFeeAmount: number; // Amount going to platform
  organizerPayoutAmount: number; // Amount going to organizer
  payoutStatus: 'pending' | 'processing' | 'completed' | 'failed';
  payoutCompletedAt?: Date | any;
  refundDeadline?: Date | any; // 14 days before tournament start
  refundsIssued: number; // Total refunds issued
}

// Prediction System Types
export interface Prediction {
  id: string;
  userId: string;
  matchId: string;
  tournamentId: string;
  predictedWinner: 'team1' | 'team2';
  predictedScore: {
    team1Score: number;
    team2Score: number;
  };
  pointsAwarded?: number; // Points awarded when match completes
  createdAt: Date;
  updatedAt: Date;
}

export interface PredictionLeaderboardEntry {
  userId: string;
  username: string;
  totalPoints: number;
  correctPredictions: number;
  totalPredictions: number;
  accuracy: number; // Percentage
  recentPredictions: Prediction[];
}

export interface PredictionStats {
  totalPredictions: number;
  correctWinnerPredictions: number;
  correctScorePredictions: number;
  totalPoints: number;
  averagePointsPerMatch: number;
}

// Payment and Registration Types
export interface TournamentRegistration {
  id: string;
  tournamentId: string;
  teamId: string;
  registeredAt: Date | any;
  paymentStatus: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  paymentIntentId?: string; // Stripe Payment Intent ID
  paymentAmount: number; // Amount paid in EUR
  paymentCompletedAt?: Date | any;
  refundedAt?: Date | any;
  refundAmount?: number;
  refundReason?: string;
  entryFeePaid: boolean;
  verificationStatus?: 'pending' | 'approved' | 'rejected';
}

// Stripe Payment Intent Metadata
export interface PaymentIntentMetadata {
  tournamentId: string;
  teamId: string;
  organizerId: string;
  entryFee: number;
  platformFee: number;
  type: 'tournament_entry_fee';
} 