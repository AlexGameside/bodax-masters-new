import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { DEFAULT_MAP_POOL } from '../constants/mapPool';
import type { Match, Tournament } from '../types/tournament';
import type {
  GroupsRoundRobinConfig,
  GroupsStageStateV2,
  PlayoffsDoubleElimConfig,
  TournamentStageDefinition,
  TournamentStageStateMapV2,
} from '../types/tournamentStructure';
import { generateDoubleEliminationBracketWithSeeding } from './firebaseService';

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getStageDefinition<TConfig = any>(
  tournament: Tournament,
  stageId: string
): TournamentStageDefinition<TConfig> {
  const def = tournament.structureV2?.stages?.find((s) => s.id === stageId);
  if (!def) throw new Error(`Stage not found: ${stageId}`);
  return def as TournamentStageDefinition<TConfig>;
}

function buildGroupLetter(i: number): string {
  // Supports A..Z. (Your use case is 16 groups.)
  return String.fromCharCode(65 + i);
}

/**
 * Circle method round-robin pairings.
 * - Requires even team count.
 * - Returns rounds indexed 1..(n-1), each with n/2 pairings.
 */
export function generateRoundRobinRounds(teamIds: string[]): Array<Array<[string, string]>> {
  const n = teamIds.length;
  if (n < 2) return [];
  if (n % 2 !== 0) {
    throw new Error(`Round robin requires an even team count. Got ${n}.`);
  }

  const rounds: Array<Array<[string, string]>> = [];
  const arr = [...teamIds];

  for (let round = 1; round <= n - 1; round++) {
    const pairings: Array<[string, string]> = [];
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];

      // Alternate home/away by round for visual variety.
      if (round % 2 === 0) pairings.push([b, a]);
      else pairings.push([a, b]);
    }
    rounds.push(pairings);

    // Rotate all but the first element.
    const fixed = arr[0];
    const rest = arr.slice(1);
    const last = rest.pop()!;
    const rotated = [fixed, last, ...rest];
    for (let i = 0; i < n; i++) arr[i] = rotated[i];
  }

  return rounds;
}

function createEmptyGroups(groupCount: number): GroupsStageStateV2['groups'] {
  const groups: GroupsStageStateV2['groups'] = [];
  for (let i = 0; i < groupCount; i++) {
    const letter = buildGroupLetter(i);
    groups.push({
      id: `group-${letter}`,
      name: `Group ${letter}`,
      letter,
      teams: [],
    });
  }
  return groups;
}

/**
 * Initialize a groups round-robin stage using structureV2.
 * - Random assignment by default.
 * - If config.useLiveDraw=true, initializes draw state instead (groups stay empty until drawn).
 */
export async function initializeGroupsRoundRobinStage(
  tournamentId: string,
  stageId: string = 'groups'
): Promise<void> {
  const tournamentRef = doc(db, 'tournaments', tournamentId);
  const snap = await getDoc(tournamentRef);
  if (!snap.exists()) throw new Error('Tournament not found');

  const tournament = snap.data() as Tournament;
  if (!tournament.structureV2) throw new Error('Tournament does not have structureV2');

  if (tournament.status !== 'registration-closed') {
    throw new Error('Tournament must be closed for registration to initialize groups');
  }

  const stage = getStageDefinition<GroupsRoundRobinConfig>(tournament, stageId);
  if (stage.type !== 'groups_round_robin') {
    throw new Error(`Stage ${stageId} is not a groups_round_robin stage`);
  }

  const config = stage.config;
  const expectedTeams = config.groupCount * config.teamsPerGroup;
  const registeredTeams = tournament.teams || [];
  if (registeredTeams.length !== expectedTeams) {
    throw new Error(`Expected ${expectedTeams} teams, got ${registeredTeams.length}`);
  }

  const groups = createEmptyGroups(config.groupCount);

  const stageState: GroupsStageStateV2 = {
    status: config.useLiveDraw ? 'drawing' : 'active',
    groups,
    draw: config.useLiveDraw
      ? {
          remainingTeamIds: shuffleInPlace([...registeredTeams]),
          revealedTeamId: null,
          revealedAt: Date.now(),
          autoAssign: true,
          cursor: { groupIndex: 0, slotIndex: 0 },
        }
      : undefined,
  };

  // Randomly assign immediately if not using live draw
  if (!config.useLiveDraw) {
    const shuffled = shuffleInPlace([...registeredTeams]);
    for (let i = 0; i < groups.length; i++) {
      groups[i].teams = shuffled.slice(i * config.teamsPerGroup, (i + 1) * config.teamsPerGroup);
    }
  }

  const updatedStageState: TournamentStageStateMapV2 = {
    ...(tournament.stageStateV2 || {}),
    [stageId]: { type: 'groups_round_robin', data: stageState },
  };

  await updateDoc(tournamentRef, {
    stageStateV2: updatedStageState,
    status: 'group-stage',
    updatedAt: serverTimestamp(),
  });
}

async function assertNoExistingMatchdayMatches(
  tournamentId: string,
  stageId: string,
  matchday: number
): Promise<void> {
  const q = query(
    collection(db, 'matches'),
    where('tournamentId', '==', tournamentId),
    where('stageId', '==', stageId),
    where('matchday', '==', matchday),
    limit(1)
  );
  const existing = await getDocs(q);
  if (!existing.empty) {
    throw new Error(`Matches already exist for stage ${stageId} matchday ${matchday}`);
  }
}

export async function generateGroupsRoundRobinMatchday(
  tournamentId: string,
  stageId: string,
  matchday: number
): Promise<void> {
  const tournamentRef = doc(db, 'tournaments', tournamentId);
  const snap = await getDoc(tournamentRef);
  if (!snap.exists()) throw new Error('Tournament not found');

  const tournament = snap.data() as Tournament;
  if (!tournament.structureV2) throw new Error('Tournament does not have structureV2');
  const stage = getStageDefinition<GroupsRoundRobinConfig>(tournament, stageId);
  if (stage.type !== 'groups_round_robin') throw new Error(`Stage ${stageId} is not groups_round_robin`);

  const config = stage.config;
  const stageStateEntry = tournament.stageStateV2?.[stageId];
  if (!stageStateEntry || stageStateEntry.type !== 'groups_round_robin') {
    throw new Error(`Groups stage ${stageId} is not initialized`);
  }

  const state = stageStateEntry.data as GroupsStageStateV2;
  const roundsPerGroup = config.teamsPerGroup - 1;
  if (matchday < 1 || matchday > roundsPerGroup) {
    throw new Error(`Invalid matchday ${matchday}. Expected 1..${roundsPerGroup}`);
  }

  // Ensure groups are fully assigned
  for (const g of state.groups) {
    if (g.teams.length !== config.teamsPerGroup) {
      throw new Error(`Group ${g.name} is not fully assigned yet`);
    }
  }

  await assertNoExistingMatchdayMatches(tournamentId, stageId, matchday);

  const mapPool =
    Array.isArray(tournament.format?.mapPool) && tournament.format.mapPool.length > 0
      ? tournament.format.mapPool
      : [...DEFAULT_MAP_POOL];

  const batch = writeBatch(db);

  const matchNumberBase = 100000; // avoid collisions with bracket matchNumbers

  for (let groupIndex = 0; groupIndex < state.groups.length; groupIndex++) {
    const group = state.groups[groupIndex];
    const rounds = generateRoundRobinRounds(group.teams);
    const pairings = rounds[matchday - 1];
    for (let pairIndex = 0; pairIndex < pairings.length; pairIndex++) {
      const [team1Id, team2Id] = pairings[pairIndex];
      const match: Partial<Match> = {
        team1Id,
        team2Id,
        team1Score: 0,
        team2Score: 0,
        winnerId: null,
        isComplete: false,
        round: matchday,
        matchNumber: matchNumberBase + matchday * 1000 + groupIndex * 10 + (pairIndex + 1),
        tournamentId,
        tournamentType: 'group-stage',
        bracketType: undefined,
        stageId,
        stageType: 'groups_round_robin',
        groupId: group.id,
        stageRound: matchday,
        createdAt: new Date(),
        matchState: 'scheduled',
        mapPool,
        bannedMaps: { team1: [], team2: [] },
        team1Ready: false,
        team2Ready: false,
        team1MapBans: [],
        team2MapBans: [],
        matchday,
        // Optional fields omitted
      };

      const ref = doc(collection(db, 'matches'));
      batch.set(ref, match);
    }
  }

  await batch.commit();

  await updateDoc(tournamentRef, {
    updatedAt: serverTimestamp(),
  });
}

export async function generateAllGroupsRoundRobinMatches(
  tournamentId: string,
  stageId: string
): Promise<void> {
  const tournamentRef = doc(db, 'tournaments', tournamentId);
  const snap = await getDoc(tournamentRef);
  if (!snap.exists()) throw new Error('Tournament not found');
  const tournament = snap.data() as Tournament;
  const stage = getStageDefinition<GroupsRoundRobinConfig>(tournament, stageId);
  if (stage.type !== 'groups_round_robin') throw new Error(`Stage ${stageId} is not groups_round_robin`);

  const roundsPerGroup = stage.config.teamsPerGroup - 1;
  for (let md = 1; md <= roundsPerGroup; md++) {
    // Sequential on purpose; each matchday checks for duplicates.
    await generateGroupsRoundRobinMatchday(tournamentId, stageId, md);
  }
}

export interface GroupStandingRowV2 {
  teamId: string;
  played: number;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  roundsFor: number;
  roundsAgainst: number;
  roundDiff: number;
}

export type GroupStandingsByGroupId = Record<string, GroupStandingRowV2[]>;

function sortStandings(
  rows: GroupStandingRowV2[],
  tiebreakers: GroupsRoundRobinConfig['tiebreakers']
): GroupStandingRowV2[] {
  const rules = Array.isArray(tiebreakers) && tiebreakers.length > 0 ? tiebreakers : ['points'];
  return [...rows].sort((a, b) => {
    for (const rule of rules) {
      if (rule === 'points') {
        if (a.points !== b.points) return b.points - a.points;
      } else if (rule === 'round_diff') {
        if (a.roundDiff !== b.roundDiff) return b.roundDiff - a.roundDiff;
      } else if (rule === 'rounds_won') {
        if (a.roundsFor !== b.roundsFor) return b.roundsFor - a.roundsFor;
      } else if (rule === 'head_to_head') {
        // Not implemented yet; fall through.
      }
    }
    // Deterministic final tie-breaker
    return a.teamId.localeCompare(b.teamId);
  });
}

export async function computeGroupsRoundRobinStandings(
  tournamentId: string,
  stageId: string
): Promise<{
  standingsByGroupId: GroupStandingsByGroupId;
  isComplete: boolean;
}> {
  const tournamentRef = doc(db, 'tournaments', tournamentId);
  const snap = await getDoc(tournamentRef);
  if (!snap.exists()) throw new Error('Tournament not found');
  const tournament = snap.data() as Tournament;

  if (!tournament.structureV2) throw new Error('Tournament does not have structureV2');
  const stage = getStageDefinition<GroupsRoundRobinConfig>(tournament, stageId);
  if (stage.type !== 'groups_round_robin') throw new Error(`Stage ${stageId} is not groups_round_robin`);

  const stageStateEntry = tournament.stageStateV2?.[stageId];
  if (!stageStateEntry || stageStateEntry.type !== 'groups_round_robin') {
    throw new Error(`Groups stage ${stageId} is not initialized`);
  }
  const state = stageStateEntry.data as GroupsStageStateV2;

  const standingsByGroupId: GroupStandingsByGroupId = {};
  const config = stage.config;

  // Initialize rows for each group/team
  for (const group of state.groups) {
    if (group.teams.length !== config.teamsPerGroup) {
      throw new Error(`Group ${group.name} is not fully assigned`);
    }
    const rows: GroupStandingRowV2[] = group.teams.map((teamId) => ({
      teamId,
      played: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      points: 0,
      roundsFor: 0,
      roundsAgainst: 0,
      roundDiff: 0,
    }));
    standingsByGroupId[group.id] = rows;
  }

  // Pull all matches for this stage
  const matchesSnap = await getDocs(
    query(collection(db, 'matches'), where('tournamentId', '==', tournamentId), where('stageId', '==', stageId))
  );
  const matches = matchesSnap.docs.map((d) => d.data() as Partial<Match>);

  const expectedMatchesPerGroup = (config.teamsPerGroup * (config.teamsPerGroup - 1)) / 2;
  const completedByGroup: Record<string, number> = {};

  for (const m of matches) {
    if (!m.groupId) continue;
    if (!m.isComplete) continue;
    if (!m.team1Id || !m.team2Id) continue;
    if (typeof m.team1Score !== 'number' || typeof m.team2Score !== 'number') continue;

    completedByGroup[m.groupId] = (completedByGroup[m.groupId] || 0) + 1;
    const groupRows = standingsByGroupId[m.groupId];
    if (!groupRows) continue;

    const a = groupRows.find((r) => r.teamId === m.team1Id);
    const b = groupRows.find((r) => r.teamId === m.team2Id);
    if (!a || !b) continue;

    a.played += 1;
    b.played += 1;
    a.roundsFor += m.team1Score;
    a.roundsAgainst += m.team2Score;
    b.roundsFor += m.team2Score;
    b.roundsAgainst += m.team1Score;

    if (m.team1Score > m.team2Score) {
      a.wins += 1;
      b.losses += 1;
      a.points += config.pointsPerWin;
      b.points += config.pointsPerLoss;
    } else if (m.team2Score > m.team1Score) {
      b.wins += 1;
      a.losses += 1;
      b.points += config.pointsPerWin;
      a.points += config.pointsPerLoss;
    } else {
      a.draws += 1;
      b.draws += 1;
      a.points += config.pointsPerDraw;
      b.points += config.pointsPerDraw;
    }
  }

  // Finalize diffs + sort
  let allComplete = true;
  for (const group of state.groups) {
    const rows = standingsByGroupId[group.id];
    for (const r of rows) {
      r.roundDiff = r.roundsFor - r.roundsAgainst;
    }
    standingsByGroupId[group.id] = sortStandings(rows, config.tiebreakers);

    const completed = completedByGroup[group.id] || 0;
    if (completed !== expectedMatchesPerGroup) allComplete = false;
  }

  return { standingsByGroupId, isComplete: allComplete };
}

export async function startPlayoffsDoubleElimFromGroups(
  tournamentId: string,
  groupsStageId: string = 'groups',
  playoffsStageId: string = 'playoffs'
): Promise<void> {
  const tournamentRef = doc(db, 'tournaments', tournamentId);
  const snap = await getDoc(tournamentRef);
  if (!snap.exists()) throw new Error('Tournament not found');
  const tournament = snap.data() as Tournament;

  if (!tournament.structureV2) throw new Error('Tournament does not have structureV2');

  const groupsStage = getStageDefinition<GroupsRoundRobinConfig>(tournament, groupsStageId);
  if (groupsStage.type !== 'groups_round_robin') throw new Error('Groups stage is not groups_round_robin');

  const playoffsStage = getStageDefinition<PlayoffsDoubleElimConfig>(tournament, playoffsStageId);
  if (playoffsStage.type !== 'playoffs_double_elim') throw new Error('Playoffs stage is not playoffs_double_elim');

  const { standingsByGroupId, isComplete } = await computeGroupsRoundRobinStandings(tournamentId, groupsStageId);
  if (!isComplete) {
    throw new Error('Group stage is not complete. All group matches must be completed before starting playoffs.');
  }

  const groupsStateEntry = tournament.stageStateV2?.[groupsStageId];
  if (!groupsStateEntry || groupsStateEntry.type !== 'groups_round_robin') {
    throw new Error('Groups stage state missing');
  }
  const groupsState = groupsStateEntry.data as GroupsStageStateV2;

  // Map group letter -> [first, second]
  const placementsByLetter: Record<string, { first: string; second: string }> = {};
  for (const group of groupsState.groups) {
    const standings = standingsByGroupId[group.id];
    if (!standings || standings.length < groupsStage.config.teamsAdvancePerGroup) {
      throw new Error(`Cannot determine advancing teams for ${group.name}`);
    }
    placementsByLetter[group.letter] = {
      first: standings[0].teamId,
      second: standings[1].teamId,
    };
  }

  // Build round 1 matchups in the configured order
  const matchups: Array<[string, string]> = playoffsStage.config.fixedRound1Pairings.map((p) => {
    const a = placementsByLetter[p.groupA]?.[p.placeA === 1 ? 'first' : 'second'];
    const b = placementsByLetter[p.groupB]?.[p.placeB === 1 ? 'first' : 'second'];
    if (!a || !b) throw new Error(`Invalid playoff pairing mapping: ${p.groupA}${p.placeA} vs ${p.groupB}${p.placeB}`);
    return [a, b];
  });

  const n = playoffsStage.config.teamCount;
  if (n !== 32) {
    throw new Error(`Only 32-team double-elim playoffs are supported for this preset right now. Got ${n}.`);
  }
  if (matchups.length !== n / 2) {
    throw new Error(`Expected ${n / 2} round-1 matchups, got ${matchups.length}`);
  }

  // Convert arbitrary matchups into seeding array for generateDoubleEliminationBracketWithSeeding
  const seededTeams = new Array<string>(n);
  const used = new Set<string>();
  for (let i = 0; i < matchups.length; i++) {
    const [teamA, teamB] = matchups[i];
    if (used.has(teamA) || used.has(teamB)) {
      throw new Error('A team appears more than once in playoff round-1 mapping');
    }
    used.add(teamA);
    used.add(teamB);
    seededTeams[i] = teamA; // seed i+1
    seededTeams[n - 1 - i] = teamB; // seed n-i
  }
  if (seededTeams.some((t) => !t)) {
    throw new Error('Failed to construct playoff seeding array');
  }

  // Persist stage state (useful for UI) before generating bracket
  const updatedStageState: TournamentStageStateMapV2 = {
    ...(tournament.stageStateV2 || {}),
    [groupsStageId]: { type: 'groups_round_robin', data: { ...groupsState, status: 'completed' } },
    [playoffsStageId]: {
      type: 'playoffs_double_elim',
      data: { status: 'active', advancingTeamIds: [...seededTeams] },
    },
  };
  await updateDoc(tournamentRef, {
    stageStateV2: updatedStageState,
    status: 'in-progress',
    updatedAt: serverTimestamp(),
  });

  // Generate playoffs bracket without deleting group matches
  await generateDoubleEliminationBracketWithSeeding(tournamentId, seededTeams, {
    stageId: playoffsStageId,
    stageType: 'playoffs_double_elim',
  });
}

