export type TournamentStructureVersion = 2;

export type TournamentStageType =
  | 'groups_round_robin'
  | 'playoffs_double_elim'
  | string;

export type GroupTiebreakRule =
  | 'points'
  | 'round_diff'
  | 'rounds_won'
  | 'head_to_head'
  | string;

export interface GroupsRoundRobinConfig {
  groupCount: number; // e.g. 16
  teamsPerGroup: number; // e.g. 8
  teamsAdvancePerGroup: number; // e.g. 2
  matchFormat: 'BO1' | 'BO3' | 'BO5' | 'BO7'; // typically BO1
  pointsPerWin: number; // e.g. 1 or 3
  pointsPerDraw: number; // usually 0 (Valorant BO1 cannot draw), but kept generic
  pointsPerLoss: number; // usually 0
  tiebreakers: GroupTiebreakRule[]; // e.g. ['points','round_diff','rounds_won']
  /**
   * When true, groups are assigned through a live draw (raffle) instead of one-shot shuffle.
   * The draw state lives in stageStateV2 for stream-friendly operation.
   */
  useLiveDraw?: boolean;
}

export interface FixedPlayoffPairing {
  groupA: string; // e.g. "A"
  placeA: 1 | 2; // 1 = group winner, 2 = runner-up
  groupB: string; // e.g. "B"
  placeB: 1 | 2;
}

export interface PlayoffsDoubleElimConfig {
  teamCount: number; // e.g. 32
  matchFormat: 'BO1' | 'BO3' | 'BO5' | 'BO7';
  finalsMatchFormat?: 'BO1' | 'BO3' | 'BO5' | 'BO7';
  /**
   * Fixed first-round mapping based on group placements.
   * Example: A1 vs B2, B1 vs C2, ...
   */
  fixedRound1Pairings: FixedPlayoffPairing[];
}

export interface TournamentStageDefinition<TConfig = any> {
  id: string; // stable identifier within a tournament (e.g. "groups", "playoffs")
  name: string; // display name
  type: TournamentStageType;
  order: number; // 1..n
  config: TConfig;
}

export interface TournamentStructureV2 {
  version: TournamentStructureVersion;
  stages: TournamentStageDefinition[];
}

// ---- Runtime state (stored in tournament document) ----

export interface GroupSlot {
  groupLetter: string; // "A".."P"
  slots: (string | null)[]; // teamIds in draft order; length = teamsPerGroup
}

export interface GroupsStageStateV2 {
  status: 'not_started' | 'drawing' | 'active' | 'completed';
  groups: Array<{
    id: string; // "group-A"
    name: string; // "Group A"
    letter: string; // "A"
    teams: string[]; // teamIds assigned (in final order)
  }>;
  /**
   * Live draw support (stream raffle).
   * - remainingTeamIds is the draw pool.
   * - revealed is the latest revealed team (for overlay).
   * - cursor points to which group/slot is next to fill when autoAssign is enabled.
   */
  draw?: {
    remainingTeamIds: string[];
    revealedTeamId?: string | null;
    revealedAt?: number;
    autoAssign?: boolean;
    cursor?: {
      groupIndex: number;
      slotIndex: number;
    };
  };
}

export interface PlayoffsStageStateV2 {
  status: 'not_started' | 'active' | 'completed';
  advancingTeamIds?: string[];
}

export type TournamentStageStateV2 =
  | { type: 'groups_round_robin'; data: GroupsStageStateV2 }
  | { type: 'playoffs_double_elim'; data: PlayoffsStageStateV2 }
  | { type: string; data: any };

export interface TournamentStageStateMapV2 {
  [stageId: string]: TournamentStageStateV2;
}

