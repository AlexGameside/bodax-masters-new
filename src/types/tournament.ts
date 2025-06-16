export interface User {
  id: string;
  uid?: string; // Firebase Auth UID
  username: string;
  email: string;
  riotId: string;
  discordUsername: string;
  // Discord OAuth fields
  discordId?: string;
  discordAvatar?: string;
  discordLinked?: boolean;
  createdAt: Date;
  teamIds: string[]; // Array of team IDs the user is part of
  isAdmin: boolean;
}

export interface TeamMember {
  userId: string;
  role: 'owner' | 'captain' | 'member';
  joinedAt: Date;
  isActive: boolean;
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
  maxMembers: number; // Maximum number of members allowed
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
  tournamentType: 'qualifier' | 'final' | 'single-elim' | 'group-stage' | 'knockout-stage';
  bracketType?: 'winners' | 'losers' | 'grand_final';
  createdAt: Date;
  // Map banning system
  matchState: 'ready_up' | 'map_banning' | 'side_selection' | 'playing' | 'waiting_results' | 'disputed' | 'completed' | 'scheduled';
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

// Tournament Format Configuration
export interface TournamentFormat {
  type: TournamentType;
  teamCount: number;
  matchFormat: MatchFormat;
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
  minimumRank?: string;
  entryFee?: number;
  approvalProcess: RegistrationApproval;
  maxTeams: number;
  registrationDeadline: Date;
  teamValidationRules: string[];
  
  // Additional properties for compatibility
  format?: string;
  teamSize?: number;
  skillLevel?: string;
}

// Tournament Schedule
export interface TournamentSchedule {
  startDate: Date;
  endDate: Date;
  timeZone: string;
  matchDuration: number; // minutes
  breakTime: number; // minutes between matches
  checkInTime: number; // minutes before match
  maxMatchesPerDay: number;
  preferredMatchTimes: string[]; // ["18:00", "20:00", "22:00"]
  blackoutDates: Date[]; // dates when no matches should be scheduled
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
  createdBy: string; // Admin ID
  adminIds: string[]; // Additional admin IDs
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  
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
} 