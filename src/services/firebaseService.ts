import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc,
  doc, 
  query, 
  orderBy,
  Timestamp,
  where,
  getDoc,
  setDoc,
  writeBatch,
  arrayUnion,
  arrayRemove,
  onSnapshot,
  serverTimestamp,
  limit,
  enableNetwork,
  disableNetwork,
  connectFirestoreEmulator
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Team, Match, TeamInvitation, User, Tournament, TeamMember, Notification } from '../types/tournament';

// Enhanced Teams collection functions
export const addTeam = async (team: Omit<Team, 'id'>): Promise<string> => {
  const docRef = await addDoc(collection(db, 'teams'), {
    ...team,
    createdAt: Timestamp.now()
  });
  return docRef.id;
};

export const getTeams = async (): Promise<Team[]> => {
  const querySnapshot = await getDocs(collection(db, 'teams'));
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name,
      ownerId: data.ownerId || data.captainId, // Fallback for old teams
      captainId: data.captainId,
      members: data.members || [], // Ensure members array exists
      teamTag: data.teamTag,
      description: data.description || '',
      createdAt: data.createdAt?.toDate() || new Date(),
      registeredForTournament: data.registeredForTournament || false,
      tournamentRegistrationDate: data.tournamentRegistrationDate?.toDate(),
      maxMembers: data.maxMembers || 10 // Default max members
    };
  }) as Team[];
};

export const getTeamById = async (teamId: string): Promise<Team | null> => {
  const docRef = doc(db, 'teams', teamId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      name: data.name,
      ownerId: data.ownerId || data.captainId, // Fallback for old teams
      captainId: data.captainId,
      members: data.members || [], // Ensure members array exists
      teamTag: data.teamTag,
      description: data.description || '',
      createdAt: data.createdAt?.toDate() || new Date(),
      registeredForTournament: data.registeredForTournament || false,
      tournamentRegistrationDate: data.tournamentRegistrationDate?.toDate(),
      maxMembers: data.maxMembers || 10 // Default max members
    } as Team;
  }
  return null;
};

export const getUserTeams = async (userId: string): Promise<Team[]> => {
  const teams = await getTeams();
  return teams.filter(team => 
    team.members && team.members.some(member => member.userId === userId)
  );
};

export const updateTeamMemberRole = async (teamId: string, userId: string, newRole: 'owner' | 'captain' | 'member'): Promise<void> => {
  const teamRef = doc(db, 'teams', teamId);
  const team = await getTeamById(teamId);
  
  if (!team) throw new Error('Team not found');
  
  const updatedMembers = team.members.map(member => 
    member.userId === userId ? { ...member, role: newRole } : member
  );
  
  // Update team captain if role is being changed to captain
  const newCaptainId = newRole === 'captain' ? userId : 
    newRole === 'owner' ? userId : team.captainId;
  
  // Update team owner if role is being changed to owner
  const newOwnerId = newRole === 'owner' ? userId : team.ownerId;
  
  await updateDoc(teamRef, {
    members: updatedMembers,
    captainId: newCaptainId,
    ownerId: newOwnerId
  });
};

export const removeTeamMember = async (teamId: string, userId: string): Promise<void> => {
  const teamRef = doc(db, 'teams', teamId);
  const team = await getTeamById(teamId);
  
  if (!team) throw new Error('Team not found');
  
  const member = team.members.find(m => m.userId === userId);
  if (!member) throw new Error('User is not a member of this team');
  
  // Don't allow removing the owner
  if (member.role === 'owner') throw new Error('Cannot remove team owner');
  
  const updatedMembers = team.members.filter(member => member.userId !== userId);
  
  // If removing captain, transfer captaincy to owner or first member
  let newCaptainId = team.captainId;
  if (userId === team.captainId) {
    newCaptainId = team.ownerId;
  }
  
  await updateDoc(teamRef, {
    members: updatedMembers,
    captainId: newCaptainId
  });
  
  // Update user's teamIds
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    teamIds: arrayRemove(teamId)
  });
};

export const addTeamMember = async (teamId: string, userId: string, role: 'owner' | 'captain' | 'member' = 'member'): Promise<void> => {
  const teamRef = doc(db, 'teams', teamId);
  const team = await getTeamById(teamId);
  
  if (!team) throw new Error('Team not found');
  
  // Check if team is full
  if (team.members.length >= team.maxMembers) {
    throw new Error('Team is full');
  }
  
  // Check if user is already a member
  if (team.members.some(member => member.userId === userId)) {
    throw new Error('User is already a member of this team');
  }
  
  const newMember: TeamMember = {
    userId,
    role,
    joinedAt: new Date(),
    isActive: true
  };
  
  const updatedMembers = [...team.members, newMember];
  
  // Update team captain/owner if needed
  let newCaptainId = team.captainId;
  let newOwnerId = team.ownerId;
  
  if (role === 'captain') {
    newCaptainId = userId;
  } else if (role === 'owner') {
    newOwnerId = userId;
    newCaptainId = userId; // Owner is also captain by default
  }
  
  await updateDoc(teamRef, {
    members: updatedMembers,
    captainId: newCaptainId,
    ownerId: newOwnerId
  });
  
  // Update user's teamIds
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    teamIds: arrayUnion(teamId)
  });
};

// Enhanced Team Invitations
export const createTeamInvitation = async (
  teamId: string, 
  invitedUserId: string, 
  invitedByUserId: string,
  message?: string
): Promise<string> => {
  const team = await getTeamById(teamId);
  if (!team) throw new Error('Team not found');
  
  // Check if user is already a member
  if (team.members.some(member => member.userId === invitedUserId)) {
    throw new Error('User is already a member of this team');
  }
  
  // Check if team is full
  if (team.members.length >= team.maxMembers) {
    throw new Error('Team is full');
  }
  
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now instead of 24 hours
  
  const invitationData = {
    teamId,
    invitedUserId,
    invitedByUserId,
    status: 'pending',
    createdAt: Timestamp.now(),
    expiresAt: Timestamp.fromDate(expiresAt),
    message: message || ''
  };
  
  const docRef = await addDoc(collection(db, 'teamInvitations'), invitationData);
  
  // Create notification for invited user
  await createNotification({
    userId: invitedUserId,
    type: 'team_invite',
    title: 'Team Invitation',
    message: `You've been invited to join ${team.name}`,
    data: { teamId, invitationId: docRef.id },
    isRead: false,
    actionRequired: true,
    actionUrl: `/teams/invitations`
  });
  
  return docRef.id;
};

export const getTeamInvitations = async (userId: string): Promise<TeamInvitation[]> => {
  const querySnapshot = await getDocs(
    query(
      collection(db, 'teamInvitations'),
      where('invitedUserId', '==', userId),
      where('status', '==', 'pending')
    )
  );
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    expiresAt: doc.data().expiresAt?.toDate() || new Date()
  })) as TeamInvitation[];
};

export const acceptTeamInvitation = async (invitationId: string): Promise<void> => {
  const invitationRef = doc(db, 'teamInvitations', invitationId);
  const invitationSnap = await getDoc(invitationRef);
  
  if (!invitationSnap.exists()) {
    throw new Error('Invitation not found');
  }
  
  const invitationData = invitationSnap.data();
  const invitation = {
    ...invitationData,
    createdAt: invitationData.createdAt?.toDate() || new Date(),
    expiresAt: invitationData.expiresAt?.toDate() || new Date()
  } as TeamInvitation;
  
  if (invitation.status !== 'pending') {
    throw new Error('Invitation is no longer pending');
  }
  
  // Add better debugging for expiration
  const now = new Date();
  const expiresAt = invitation.expiresAt;
  console.log('Invitation expiration check:', {
    invitationId,
    expiresAt: expiresAt,
    now: now,
    isExpired: expiresAt < now,
    timeDifference: expiresAt.getTime() - now.getTime()
  });
  
  if (expiresAt < now) {
    throw new Error(`Invitation has expired. Expired at: ${expiresAt.toISOString()}, Current time: ${now.toISOString()}`);
  }
  
  // Add user to team
  await addTeamMember(invitation.teamId, invitation.invitedUserId);
  
  // Update invitation status
  await updateDoc(invitationRef, {
    status: 'accepted'
  });
  
  // Create notification for team owner/captain
  const team = await getTeamById(invitation.teamId);
  if (team) {
    await createNotification({
      userId: team.ownerId,
      type: 'team_invite',
      title: 'Invitation Accepted',
      message: `${invitation.invitedUserId} has accepted the invitation to join ${team.name}`,
      data: { teamId: invitation.teamId },
      isRead: false
    });
  }
};

export const declineTeamInvitation = async (invitationId: string): Promise<void> => {
  const invitationRef = doc(db, 'teamInvitations', invitationId);
  const invitationSnap = await getDoc(invitationRef);
  
  if (!invitationSnap.exists()) {
    throw new Error('Invitation not found');
  }
  
  const invitationData = invitationSnap.data();
  const invitation = {
    ...invitationData,
    createdAt: invitationData.createdAt?.toDate() || new Date(),
    expiresAt: invitationData.expiresAt?.toDate() || new Date()
  } as TeamInvitation;
  
  // Update invitation status
  await updateDoc(invitationRef, {
    status: 'declined'
  });
  
  // Create notification for team owner/captain
  const team = await getTeamById(invitation.teamId);
  if (team) {
    await createNotification({
      userId: team.ownerId,
      type: 'team_invite',
      title: 'Invitation Declined',
      message: `${invitation.invitedUserId} has declined the invitation to join ${team.name}`,
      data: { teamId: invitation.teamId },
      isRead: false
    });
  }
};

// Notifications system
export const createNotification = async (notification: Omit<Notification, 'id' | 'createdAt'>): Promise<string> => {
  const docRef = await addDoc(collection(db, 'notifications'), {
    ...notification,
    createdAt: Timestamp.now()
  });
  return docRef.id;
};

export const getUserNotifications = async (userId: string): Promise<Notification[]> => {
  const querySnapshot = await getDocs(
    query(
      collection(db, 'notifications'),
      where('userId', '==', userId)
    )
  );
  
  const notifications = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    expiresAt: doc.data().expiresAt?.toDate()
  })) as Notification[];
  
  // Sort by createdAt in descending order (newest first)
  return notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
};

export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  const notificationRef = doc(db, 'notifications', notificationId);
  await updateDoc(notificationRef, {
    isRead: true
  });
};

export const deleteNotification = async (notificationId: string): Promise<void> => {
  await deleteDoc(doc(db, 'notifications', notificationId));
};

export const getUnreadNotificationCount = async (userId: string): Promise<number> => {
  const querySnapshot = await getDocs(
    query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('isRead', '==', false)
    )
  );
  
  return querySnapshot.size;
};

// Legacy functions for backward compatibility (will be updated gradually)
export const getUserTeam = async (userId: string): Promise<Team | null> => {
  try {
    const teams = await getUserTeams(userId);
    return teams.length > 0 ? teams[0] : null;
  } catch (error) {
    console.error('Error getting user team:', error);
    return null;
  }
};

// New function to get user's team for a specific match context
export const getUserTeamForMatch = async (userId: string, match: Match): Promise<Team | null> => {
  try {
    console.log('getUserTeamForMatch called with:', { userId, matchId: match.id, team1Id: match.team1Id, team2Id: match.team2Id });
    
    // More efficient: directly check if user is in the teams in this match
    const matchTeamIds: string[] = [match.team1Id, match.team2Id].filter((id): id is string => typeof id === 'string' && !!id);
    
    if (matchTeamIds.length === 0) {
      console.log('No teams in match');
      return null;
    }
    
    // Get user's teamIds directly
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      console.log('User not found');
      return null;
    }
    
    const userTeamIds = userDoc.data().teamIds || [];
    console.log('User team IDs:', userTeamIds);
    
    // Find which team in the match the user belongs to
    let userTeamId: string | undefined = userTeamIds.find((teamId: string) => matchTeamIds.includes(teamId));
    
    // Fallback approach: If teamIds approach fails, check team members directly
    if (!userTeamId) {
      console.log('User not found in teamIds, checking team members directly...');
      for (const teamId of matchTeamIds) {
        try {
          const team = await getTeamById(teamId);
          if (team && team.members) {
            const isMember = team.members.some(member => member.userId === userId);
            if (isMember) {
              userTeamId = String(teamId);
              console.log('Found user in team members:', teamId);
              break;
            }
          }
        } catch (error) {
          console.warn(`Error checking team ${teamId}:`, error);
        }
      }
    }
    
    if (!userTeamId) {
      console.log('User not in any team in this match');
      return null;
    }
    
    // Get the specific team
    const team = await getTeamById(String(userTeamId));
    console.log('Team in match found:', team ? { id: team.id, name: team.name } : 'None');
    
    return team;
  } catch (error) {
    console.error('Error getting user team for match:', error);
    return null;
  }
};

export const getTeamPlayers = async (teamId: string): Promise<User[]> => {
  try {
    const team = await getTeamById(teamId);
    if (!team) return [];
    
    const users = await getAllUsers();
    return users.filter(user => 
      team.members && team.members.some(member => member.userId === user.id)
    );
  } catch (error) {
    console.error('Error getting team players:', error);
    return [];
  }
};

// Teams collection
export const deleteTeam = async (teamId: string): Promise<void> => {
  await deleteDoc(doc(db, 'teams', teamId));
};

export const deleteAllTeams = async (): Promise<void> => {
  const teams = await getTeams();
  const deletePromises = teams.map(team => deleteDoc(doc(db, 'teams', team.id)));
  await Promise.all(deletePromises);
};

// Matches collection
export const addMatch = async (match: Omit<Match, 'id'>): Promise<string> => {
  const docRef = await addDoc(collection(db, 'matches'), match);
  return docRef.id;
};

export const getMatches = async (): Promise<Match[]> => {
  const querySnapshot = await getDocs(collection(db, 'matches'));
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      team1Id: data.team1Id || null,
      team2Id: data.team2Id || null,
      team1Score: data.team1Score || 0,
      team2Score: data.team2Score || 0,
      winnerId: data.winnerId || null,
      isComplete: data.isComplete || false,
      round: data.round || 1,
      matchNumber: data.matchNumber || 1,
      nextMatchId: data.nextMatchId,
      tournamentId: data.tournamentId || null,
      tournamentType: data.tournamentType || 'single-elim',
      bracketType: data.bracketType,
      createdAt: data.createdAt?.toDate() || new Date(),
      // Map banning system
      matchState: data.matchState || 'ready_up',
      mapPool: data.mapPool || ['Corrode', 'Ascent', 'Bind', 'Haven', 'Icebox', 'Lotus', 'Sunset'],
      bannedMaps: data.bannedMaps || { team1: [], team2: [] },
      selectedMap: data.selectedMap,
      team1Ready: data.team1Ready || false,
      team2Ready: data.team2Ready || false,
      team1MapBans: data.team1MapBans || [],
      team2MapBans: data.team2MapBans || [],
      team1MapPick: data.team1MapPick,
      team2MapPick: data.team2MapPick,
      // Side selection
      sideSelection: data.sideSelection || {},
      // Dispute system
      disputeRequested: data.disputeRequested || false,
      disputeReason: data.disputeReason,
      adminAssigned: data.adminAssigned,
      adminResolution: data.adminResolution,
      resolvedAt: data.resolvedAt?.toDate()
    };
  });
};

export const getMatch = async (matchId: string): Promise<Match | null> => {
  const docRef = doc(db, 'matches', matchId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      tournamentId: data.tournamentId,
      round: data.round,
      matchNumber: data.matchNumber,
      team1Id: data.team1Id,
      team2Id: data.team2Id,
      winnerId: data.winnerId,
      team1Score: data.team1Score,
      team2Score: data.team2Score,
      status: data.status,
      scheduledTime: data.scheduledTime?.toDate(),
      map: data.map,
      team1Ready: data.team1Ready,
      team2Ready: data.team2Ready,
      bannedMaps: data.bannedMaps,
      banSequence: data.banSequence,
      selectedMap: data.selectedMap,
      matchState: data.matchState,
      mapPool: data.mapPool,
      team1Side: data.team1Side,
      team2Side: data.team2Side,
      sideSelection: data.sideSelection,
      resultSubmission: data.resultSubmission,
      dispute: data.dispute,
      isWinnerBracket: data.isWinnerBracket,
      // BO3 Map Banning Fields
      map1: data.map1,
      map1Side: data.map1Side,
      map2: data.map2,
      map2Side: data.map2Side,
      deciderMap: data.deciderMap,
      deciderMapSide: data.deciderMapSide,
      // Fixes for build error
      isComplete: data.isComplete ?? false,
      tournamentType: data.tournamentType ?? 'single-elim',
      createdAt: data.createdAt?.toDate() ?? new Date(),
      team1MapBans: data.team1MapBans ?? [],
      team2MapBans: data.team2MapBans ?? [],
      schedulingProposals: data.schedulingProposals ?? [],
      currentSchedulingStatus: data.currentSchedulingStatus ?? 'pending',
      swissRound: data.swissRound,
      matchday: data.matchday,
      forfeitTime: data.forfeitTime?.toDate(),
      matchFormat: data.matchFormat,
      currentMap: data.currentMap,
      mapResults: data.mapResults,
      team1Roster: data.team1Roster,
      team2Roster: data.team2Roster,
    } as Match;
  }
  return null;
};

export const onMatchUpdate = (matchId: string, callback: (match: Match | null) => void): (() => void) => {
  const matchRef = doc(db, 'matches', matchId);
  
  const unsubscribe = onSnapshot(matchRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      const matchData = {
        id: docSnap.id,
        tournamentId: data.tournamentId,
        round: data.round,
        matchNumber: data.matchNumber,
        team1Id: data.team1Id,
        team2Id: data.team2Id,
        winnerId: data.winnerId,
        team1Score: data.team1Score,
        team2Score: data.team2Score,
        status: data.status,
        scheduledTime: data.scheduledTime?.toDate(),
        map: data.map,
        team1Ready: data.team1Ready,
        team2Ready: data.team2Ready,
        bannedMaps: data.bannedMaps,
        banSequence: data.banSequence,
        selectedMap: data.selectedMap,
        matchState: data.matchState,
        mapPool: data.mapPool,
        team1Side: data.team1Side,
        team2Side: data.team2Side,
        sideSelection: data.sideSelection,
        resultSubmission: data.resultSubmission,
        dispute: data.dispute,
        isWinnerBracket: data.isWinnerBracket,
        // BO3 Map Banning Fields
        map1: data.map1,
        map1Side: data.map1Side,
        map2: data.map2,
        map2Side: data.map2Side,
        deciderMap: data.deciderMap,
        deciderMapSide: data.deciderMapSide,
        // Fixes for build error
        isComplete: data.isComplete ?? false,
        tournamentType: data.tournamentType ?? 'single-elim',
        createdAt: data.createdAt?.toDate() ?? new Date(),
        team1MapBans: data.team1MapBans ?? [],
        team2MapBans: data.team2MapBans ?? [],
        schedulingProposals: data.schedulingProposals ?? [],
        currentSchedulingStatus: data.currentSchedulingStatus ?? 'pending',
        swissRound: data.swissRound,
        matchday: data.matchday,
        forfeitTime: data.forfeitTime?.toDate(),
        matchFormat: data.matchFormat,
        currentMap: data.currentMap,
        mapResults: data.mapResults,
        team1Roster: data.team1Roster,
        team2Roster: data.team2Roster,
      } as Match;
      callback(matchData);
    } else {
      callback(null);
    }
  });
  
  return unsubscribe;
};

export const updateMatch = async (matchId: string, result: { team1Score: number; team2Score: number }): Promise<void> => {
  const matchRef = doc(db, 'matches', matchId);
  await updateDoc(matchRef, result);
};

export const updateMatchState = async (matchId: string, updates: Partial<Match>): Promise<void> => {
  const matchRef = doc(db, 'matches', matchId);
  
  // Convert Date objects to Timestamps for Firestore
  const firestoreUpdates: any = { ...updates };
  
  if (updates.resolvedAt && updates.resolvedAt instanceof Date) {
    firestoreUpdates.resolvedAt = Timestamp.fromDate(updates.resolvedAt);
  }
  
  await updateDoc(matchRef, firestoreUpdates);
};

// New function to update match state with side selection and automatic transition
export const updateMatchStateWithSides = async (
  matchId: string, 
  newState: string, 
  team1Side: 'attack' | 'defense',
  team2Side: 'attack' | 'defense',
  matchStartTime: string
): Promise<void> => {
  const matchRef = doc(db, 'matches', matchId);
  await updateDoc(matchRef, {
    matchState: newState,
    team1Side: team1Side,
    team2Side: team2Side,
    matchStartTime: matchStartTime
  });
};

export const updateMatchTeams = async (matchId: string, team1Id: string, team2Id: string): Promise<void> => {
  const matchRef = doc(db, 'matches', matchId);
  await updateDoc(matchRef, {
    team1Id,
    team2Id
  });
};

export const deleteMatch = async (matchId: string): Promise<void> => {
  await deleteDoc(doc(db, 'matches', matchId));
};

export const deleteAllMatches = async (): Promise<void> => {
  const matches = await getMatches();
  const deletePromises = matches.map(match => deleteDoc(doc(db, 'matches', match.id)));
  await Promise.all(deletePromises);
};

// Delete matches by tournament type
export const deleteMatchesByType = async (tournamentType: 'qualifier' | 'final'): Promise<void> => {
  const matches = await getMatches();
  const matchesToDelete = matches.filter(match => match.tournamentType === tournamentType);
  const deletePromises = matchesToDelete.map(match => deleteDoc(doc(db, 'matches', match.id)));
  await Promise.all(deletePromises);
};

// Generate random teams for testing
export const generateRandomTeams = (count: number): Omit<Team, 'id'>[] => {
  const teamNames = [
    'Team Alpha', 'Team Beta', 'Team Gamma', 'Team Delta',
    'Team Echo', 'Team Foxtrot', 'Team Golf', 'Team Hotel',
    'Team India', 'Team Juliet', 'Team Kilo', 'Team Lima',
    'Team Mike', 'Team November', 'Team Oscar', 'Team Papa',
    'Team Quebec', 'Team Romeo', 'Team Sierra', 'Team Tango',
    'Team Uniform', 'Team Victor', 'Team Whiskey', 'Team Xray',
    'Team Yankee', 'Team Zulu', 'Team Omega', 'Team Phoenix',
    'Team Shadow', 'Team Thunder', 'Team Lightning', 'Team Storm'
  ];

  const shuffledNames = teamNames.sort(() => Math.random() - 0.5);
  
  return Array.from({ length: count }, (_, index) => {
    const captainId = `captain-${index + 1}`;
    const players = [
      `player-${index + 1}-1`,
      `player-${index + 1}-2`, 
      `player-${index + 1}-3`,
      `player-${index + 1}-4`,
      `player-${index + 1}-5`
    ];
    
    const members: TeamMember[] = players.map((playerId, playerIndex) => ({
      userId: playerId,
      role: playerIndex === 0 ? 'owner' : 'member',
      joinedAt: new Date(),
      isActive: true
    }));
    
    return {
      name: shuffledNames[index],
      ownerId: captainId,
      captainId: captainId,
      members: members,
      teamTag: shuffledNames[index].split(' ')[1].substring(0, 3).toUpperCase(),
      description: `A competitive Valorant team`,
      createdAt: new Date(),
      registeredForTournament: false,
      maxMembers: 10,
      maxMainPlayers: 5,
      maxSubstitutes: 2,
      maxCoaches: 1,
      maxAssistantCoaches: 1,
      maxManagers: 1
    };
  });
};

// Generate qualifier bracket (32 teams, double elimination)
export const generateQualifierBracket = async (teams: Team[]): Promise<void> => {
  if (teams.length === 0) throw new Error('No teams available to generate bracket');
  if (teams.length > 32) throw new Error('Maximum 32 teams allowed');

  // Delete all existing qualifier matches first
  await deleteMatchesByType('qualifier');

  const matches: Omit<Match, 'id'>[] = [];
  const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
  const rounds = Math.ceil(Math.log2(teams.length));

  // Round 1
  let matchNumber = 1;
  for (let i = 0; i < shuffledTeams.length; i += 2) {
    if (i + 1 < shuffledTeams.length) {
      const match: Omit<Match, 'id'> = {
        team1Id: shuffledTeams[i].id,
        team2Id: shuffledTeams[i + 1].id,
        team1Score: 0,
        team2Score: 0,
        winnerId: null,
        round: 1,
        matchNumber: matchNumber++,
        isComplete: false,
        tournamentType: 'qualifier',
        team1Ready: false,
        team2Ready: false,
        createdAt: new Date(),
        matchState: 'ready_up',
        mapPool: ['Corrode', 'Ascent', 'Bind', 'Haven', 'Icebox', 'Lotus', 'Sunset'],
        bannedMaps: {
          team1: [],
          team2: []
        },
        team1MapBans: [],
        team2MapBans: []
      };
      matches.push(match);
    }
  }
  
  // Add all matches to Firebase
  for (const match of matches) {
    await addMatch(match);
  }
};

// Generate final bracket only (8 teams total)
export const generateFinalBracket = async (teams: Team[]): Promise<void> => {
  // Delete existing final matches first
  await deleteMatchesByType('final');

  const matches: Omit<Match, 'id'>[] = [];
  
  // We need 8 teams total for the final bracket (4 qualified + 4 invited)
  // For now, we'll use the first 8 teams or create placeholder teams
  const finalTeams = teams.slice(0, 8);
  
  // If we don't have 8 teams, create placeholder matches
  if (finalTeams.length < 8) {
    // Quarter Finals (4 matches)
    for (let i = 0; i < 4; i++) {
      matches.push({
        team1Id: finalTeams[i]?.id || '',
        team2Id: finalTeams[i + 4]?.id || '',
        team1Score: 0,
        team2Score: 0,
        winnerId: null,
        round: 1,
        matchNumber: i + 1,
        isComplete: false,
        tournamentType: 'final',
        team1Ready: false,
        team2Ready: false,
        createdAt: new Date(),
        matchState: 'ready_up',
        mapPool: ['Corrode', 'Ascent', 'Bind', 'Haven', 'Icebox', 'Lotus', 'Sunset'],
        bannedMaps: {
          team1: [],
          team2: []
        },
        team1MapBans: [],
        team2MapBans: []
      });
    }
  } else {
    // Quarter Finals (4 matches) with actual teams
    for (let i = 0; i < 4; i++) {
      matches.push({
        team1Id: finalTeams[i].id,
        team2Id: finalTeams[i + 4].id,
        team1Score: 0,
        team2Score: 0,
        winnerId: null,
        round: 1,
        matchNumber: i + 1,
        isComplete: false,
        tournamentType: 'final',
        team1Ready: false,
        team2Ready: false,
        createdAt: new Date(),
        matchState: 'ready_up',
        mapPool: ['Corrode', 'Ascent', 'Bind', 'Haven', 'Icebox', 'Lotus', 'Sunset'],
        bannedMaps: {
          team1: [],
          team2: []
        },
        team1MapBans: [],
        team2MapBans: []
      });
    }
  }
  
  // Semi Finals (2 matches)
  for (let i = 0; i < 2; i++) {
    matches.push({
      team1Id: '',
      team2Id: '',
      team1Score: 0,
      team2Score: 0,
      winnerId: null,
      round: 2,
      matchNumber: i + 1,
      isComplete: false,
      tournamentType: 'final',
      team1Ready: false,
      team2Ready: false,
      createdAt: new Date(),
      matchState: 'ready_up',
      mapPool: ['Corrode', 'Ascent', 'Bind', 'Haven', 'Icebox', 'Lotus', 'Sunset'],
      bannedMaps: {
        team1: [],
        team2: []
      },
      team1MapBans: [],
      team2MapBans: []
    });
  }
  
  // Finals (1 match)
  matches.push({
    team1Id: '',
    team2Id: '',
    team1Score: 0,
    team2Score: 0,
    winnerId: null,
    round: 3,
    matchNumber: 1,
    isComplete: false,
    tournamentType: 'final',
    team1Ready: false,
    team2Ready: false,
    createdAt: new Date(),
    matchState: 'ready_up',
    mapPool: ['Corrode', 'Ascent', 'Bind', 'Haven', 'Icebox', 'Lotus', 'Sunset'],
    bannedMaps: {
      team1: [],
      team2: []
    },
    team1MapBans: [],
    team2MapBans: []
  });
  
  // Add all matches to Firebase
  for (const match of matches) {
    await addMatch(match);
  }
};

// Team Management Functions
export const updateTeamActivePlayers = async (teamId: string, activePlayers: string[]): Promise<void> => {
  try {
    const teamRef = doc(db, 'teams', teamId);
    await updateDoc(teamRef, { activePlayers });
  } catch (error) {
    console.error('Error updating team active players:', error);
    throw error;
  }
};

export const registerTeamForTournament = async (teamId: string): Promise<void> => {
  try {
    const teamRef = doc(db, 'teams', teamId);
    await updateDoc(teamRef, { 
      registeredForTournament: true,
      tournamentRegistrationDate: new Date()
    });
  } catch (error) {
    console.error('Error registering team for tournament:', error);
    throw error;
  }
};

// Get all matches for a specific user
export const getUserMatches = async (userId: string): Promise<Match[]> => {
  try {
    // Check if userId is valid
    if (!userId) {
      console.warn('getUserMatches called with undefined or empty userId');
      return [];
    }

    // Get all teams the user is a member of (using the same approach as getUserTeams)
    const allTeams = await getTeams();
    const userTeams = allTeams.filter(team => 
      team.members && team.members.some(member => member.userId === userId)
    );
    
    if (userTeams.length === 0) {
      return [];
    }
    
    const userTeamIds = userTeams.map(team => team.id);
    
    // Get all matches where the user's teams are participating
    const allMatches = await getMatches();
    const userMatches = allMatches.filter(match => 
      (match.team1Id && userTeamIds.includes(match.team1Id)) ||
      (match.team2Id && userTeamIds.includes(match.team2Id))
    );
    
    return userMatches;
  } catch (error) {
    console.error('Error getting user matches:', error);
    throw error;
  }
};

// Admin functions
export const getAllUsers = async (): Promise<User[]> => {
  try {
    const usersRef = collection(db, 'users');
    const querySnapshot = await getDocs(usersRef);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as User[];
  } catch (error) {
    console.error('Error getting all users:', error);
    return [];
  }
};

export const updateUserAdminStatus = async (userId: string, isAdmin: boolean): Promise<void> => {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, { isAdmin });
};

// Comprehensive user update function for admin panel
export const updateUser = async (userId: string, updates: {
  username?: string;
  email?: string;
  riotId?: string;
  discordUsername?: string;
  discordId?: string;
  discordAvatar?: string;
  discordLinked?: boolean;
  inDiscordServer?: boolean;
  isAdmin?: boolean;
  teamIds?: string[];
}): Promise<void> => {
  const userRef = doc(db, 'users', userId);
  
  // Filter out undefined values to prevent Firebase errors
  const filteredUpdates = Object.fromEntries(
    Object.entries(updates).filter(([_, value]) => value !== undefined)
  );
  
  await updateDoc(userRef, filteredUpdates);
};

// Add new functions for Profile page
export const updateUserProfile = async (userId: string, updates: { displayName?: string; riotName?: string }): Promise<void> => {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, updates);
};

// Update Discord information for a user
export const updateUserDiscordInfo = async (userId: string, discordInfo: { 
  discordId?: string; 
  discordUsername?: string; 
  discordAvatar?: string; 
  discordLinked?: boolean; 
}): Promise<void> => {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, discordInfo);
};

export const leaveTeam = async (teamId: string, userId: string): Promise<void> => {
  const teamRef = doc(db, 'teams', teamId);
  const team = await getTeamById(teamId);
  
  if (!team) throw new Error('Team not found');
  
  // Check if user is a member
  const member = team.members.find(m => m.userId === userId);
  if (!member) throw new Error('User is not a member of this team');
  
  // Don't allow owner to leave (they must delete the team instead)
  if (member.role === 'owner') throw new Error('Team owner cannot leave. Please delete the team instead.');
  
  const updatedMembers = team.members.filter(member => member.userId !== userId);
  
  // If leaving captain, transfer captaincy to owner
  let newCaptainId = team.captainId;
  if (userId === team.captainId) {
    newCaptainId = team.ownerId;
  }
  
  await updateDoc(teamRef, {
    members: updatedMembers,
    captainId: newCaptainId
  });
  
  // Update user's teamIds
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    teamIds: arrayRemove(teamId)
  });
};

export const inviteTeamMember = async (teamId: string, email: string): Promise<void> => {
  // First, find the user by email
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('email', '==', email));
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) {
    throw new Error('User with this email not found');
  }
  
  const invitedUser = querySnapshot.docs[0];
  const invitedUserId = invitedUser.id;
  
  // Create team invitation
  await createTeamInvitation(teamId, invitedUserId, 'system', 'You have been invited to join a team');
};

// Testing functions for generating realistic test data
export const generateTestUsers = (count: number): Omit<User, 'id' | 'createdAt'>[] => {
  const usernames = [
    'TestPlayer1', 'TestPlayer2', 'TestPlayer3', 'TestPlayer4', 'TestPlayer5',
    'TestPlayer6', 'TestPlayer7', 'TestPlayer8', 'TestPlayer9', 'TestPlayer10',
    'TestPlayer11', 'TestPlayer12', 'TestPlayer13', 'TestPlayer14', 'TestPlayer15',
    'TestPlayer16', 'TestPlayer17', 'TestPlayer18', 'TestPlayer19', 'TestPlayer20',
    'TestPlayer21', 'TestPlayer22', 'TestPlayer23', 'TestPlayer24', 'TestPlayer25',
    'TestPlayer26', 'TestPlayer27', 'TestPlayer28', 'TestPlayer29', 'TestPlayer30',
    'TestPlayer31', 'TestPlayer32'
  ];

  return Array.from({ length: count }, (_, index) => ({
    username: usernames[index],
    email: `test${index + 1}@bodaxmasters.com`,
    riotId: `TestPlayer${index + 1}#1234`,
    discordUsername: `testplayer${index + 1}`,
    teamIds: [],
    isAdmin: false
  }));
};

export const generateTestTeams = (users: User[], count: number): Omit<Team, 'id' | 'createdAt'>[] => {
  const teamNames = [
    'Team Alpha', 'Team Beta', 'Team Gamma', 'Team Delta', 'Team Echo',
    'Team Foxtrot', 'Team Golf', 'Team Hotel', 'Team India', 'Team Juliet',
    'Team Kilo', 'Team Lima', 'Team Mike', 'Team November', 'Team Oscar',
    'Team Papa', 'Team Quebec', 'Team Romeo', 'Team Sierra', 'Team Tango',
    'Team Uniform', 'Team Victor', 'Team Whiskey', 'Team Xray', 'Team Yankee',
    'Team Zulu', 'Team Omega', 'Team Phoenix', 'Team Shadow', 'Team Thunder',
    'Team Lightning', 'Team Storm'
  ];

  const shuffledNames = teamNames.sort(() => Math.random() - 0.5);
  const shuffledUsers = users.sort(() => Math.random() - 0.5);
  
  return Array.from({ length: count }, (_, index) => {
    const startIndex = index * 5;
    const teamPlayers = shuffledUsers.slice(startIndex, startIndex + 5);
    const captain = teamPlayers[0];
    const isRegistered = Math.random() > 0.3;
    
    const teamData: any = {
      name: shuffledNames[index],
      captainId: captain.id,
      players: teamPlayers.map(player => player.id),
      activePlayers: [], // Will be set during ready-up
      teamTag: shuffledNames[index].split(' ')[1].substring(0, 3).toUpperCase(),
      description: `A competitive Valorant team`,
      registeredForTournament: isRegistered
    };
    
    // Only add tournamentRegistrationDate if team is registered
    if (isRegistered) {
      teamData.tournamentRegistrationDate = new Date();
    }
    
    return teamData;
  });
};

export const createTestScenario = async (): Promise<{ users: User[], teams: Team[], matches: Match[] }> => {
  try {
    // Generate 32 test users
    const testUserData = generateTestUsers(32);
    const createdUsers: User[] = [];
    
    // Create users in Firebase (without passwords for testing)
    for (const userData of testUserData) {
      const userDoc = {
        ...userData,
        id: `test-user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date()
      };
      
      // Add to Firestore
      await setDoc(doc(db, 'users', userDoc.id), userDoc);
      createdUsers.push(userDoc);
    }
    
    // Generate 6 teams (30 players total)
    const testTeamData = generateTestTeams(createdUsers, 6);
    const createdTeams: Team[] = [];
    
    // Create teams in Firebase
    for (const teamData of testTeamData) {
      const teamWithDate = { ...teamData, createdAt: new Date() };
      const teamId = await addTeam(teamWithDate);
      const createdTeam = { ...teamData, id: teamId, createdAt: new Date() };
      createdTeams.push(createdTeam);
      
      // Update users with teamId
      for (const member of teamData.members) {
        if (!member || !member.userId || typeof member.userId !== 'string') {
          console.warn('Invalid member data in test scenario:', member);
          continue;
        }
        const userRef = doc(db, 'users', member.userId);
        await updateDoc(userRef, { 
          teamIds: arrayUnion(teamId)
        });
      }
    }
    
    // Register all teams for the tournament
    const registeredTeams = createdTeams.filter(team => team.registeredForTournament);
    for (const team of registeredTeams) {
      await registerTeamForTournament(team.id);
    }
    
    // Generate the actual qualifier bracket (this will create the real matches)
    if (registeredTeams.length >= 4) {
      await generateSingleEliminationBracket('test-tournament', registeredTeams.map(team => team.id));
    }
    
    // Get the generated matches
    const generatedMatches = await getMatches();
    const qualifierMatches = generatedMatches.filter(match => match.tournamentType === 'qualifier');
    
    return {
      users: createdUsers,
      teams: createdTeams,
      matches: qualifierMatches
    };
  } catch (error) {
    console.error('Error creating test scenario:', error);
    throw error;
  }
};

export const clearTestData = async (): Promise<void> => {
  try {
    // Delete all test users from Firestore
    const users = await getAllUsers();
    const testUsers = users.filter(user => user.email.includes('@bodaxmasters.com'));
    for (const user of testUsers) {
      await deleteDoc(doc(db, 'users', user.id));
    }
    
    // Delete all teams
    await deleteAllTeams();
    
    // Delete all matches
    await deleteAllMatches();
  } catch (error) {
    console.error('Error clearing test data:', error);
    throw error;
  }
};

// Clear test users from Firebase Auth (requires admin SDK in production)
export const clearTestUsersFromAuth = async (): Promise<void> => {
  try {
    // Note: This function requires the user to be signed in as the user to be deleted
    // In a real admin scenario, you'd use the Firebase Admin SDK
    console.log('Note: To delete auth users, you need to use Firebase Admin SDK or manually delete them from the Firebase Console');
    console.log('For now, you can manually delete test users from Firebase Console > Authentication > Users');
  } catch (error) {
    console.error('Error clearing test users from auth:', error);
    throw error;
  }
};

// Create test users with authentication (for actual login testing)
export const createTestUsersWithAuth = async (count: number = 32): Promise<void> => {
  try {
    const { createUserWithEmailAndPassword } = await import('firebase/auth');
    const { auth } = await import('../config/firebase');
    
    const testUserData = generateTestUsers(count);
    const timestamp = Date.now();
    let createdCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    // Helper function to add delay
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    
    for (let i = 0; i < testUserData.length; i++) {
      const userData = testUserData[i];
      // Use timestamp to make emails unique
      const uniqueEmail = `test${i + 1}-${timestamp}@bodaxmasters.com`;
      const password = 'testpass123'; // Simple password for all test users
      
      try {
        // Create authentication account
        const userCredential = await createUserWithEmailAndPassword(auth, uniqueEmail, password);
        
        // Create user document with the unique email
        const userDoc = {
          ...userData,
          email: uniqueEmail, // Use the unique email
          id: userCredential.user.uid,
          createdAt: new Date()
        };
        
        await setDoc(doc(db, 'users', userDoc.id), userDoc);
        console.log(`Created test user: ${uniqueEmail}`);
        createdCount++;
        
        // Add delay between requests to avoid rate limiting
        // Wait 1 second between each user creation
        if (i < testUserData.length - 1) {
          await delay(1000);
        }
        
      } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') {
          console.log(`Skipping existing user: ${uniqueEmail}`);
          skippedCount++;
        } else if (error.code === 'auth/too-many-requests') {
          console.error(`Rate limit hit at user ${i + 1}. Stopping creation.`);
          console.error(`Error creating user ${uniqueEmail}:`, error);
          errorCount++;
          
          // Stop creating users if we hit rate limit
          break;
        } else {
          console.error(`Error creating user ${uniqueEmail}:`, error);
          errorCount++;
        }
      }
    }
    
    console.log(`Test users creation completed!`);
    console.log(`Created: ${createdCount} users`);
    console.log(`Skipped (already exist): ${skippedCount} users`);
    console.log(`Errors: ${errorCount} users`);
    console.log('All test users have password: testpass123');
    
    if (errorCount > 0) {
      console.log('Some users failed to create due to rate limiting. Try again in a few minutes or create fewer users at once.');
    }
  } catch (error) {
    console.error('Error creating test users with auth:', error);
    throw error;
  }
};

// Get test users for display
export const getTestUsers = async (): Promise<User[]> => {
  try {
    const users = await getAllUsers();
    return users.filter(user => user.email.includes('@bodaxmasters.com'));
  } catch (error) {
    console.error('Error getting test users:', error);
    return [];
  }
};

// Tournament Management Functions
export const createTournament = async (tournamentData: Omit<Tournament, 'id' | 'teams' | 'status' | 'createdAt'>): Promise<string> => {
  try {
    const tournament: Omit<Tournament, 'id'> = {
      ...tournamentData,
      teams: [],
      status: 'registration-open',
      createdAt: new Date()
    };
    
    // Filter out undefined values since Firebase doesn't allow them
    const cleanTournament = Object.fromEntries(
      Object.entries(tournament).filter(([_, value]) => value !== undefined)
    );
    
    const docRef = await addDoc(collection(db, 'tournaments'), cleanTournament);
    return docRef.id;
  } catch (error) {
    console.error('Error creating tournament:', error);
    throw error;
  }
};

export const getTournaments = async (): Promise<Tournament[]> => {
  return retryFirebaseOperation(async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'tournaments'));
      return querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || 'Unknown Tournament',
          description: data.description || '',
          format: data.format || {
            type: 'single-elimination',
            teamCount: 8,
            matchFormat: 'BO1',
            mapPool: [],
            sideSelection: 'coin-flip',
            seedingMethod: 'random',
          },
          rules: data.rules || {
            overtimeRules: '',
            pauseRules: '',
            substitutionRules: '',
            disputeProcess: '',
            forfeitRules: '',
            technicalIssues: '',
            codeOfConduct: '',
            antiCheatPolicy: '',
            streamingRules: '',
            communicationRules: '',
          },
          requirements: data.requirements || {
            minPlayers: 5,
            maxPlayers: 7,
            requiredRoles: [],
            requireDiscord: false,
            requireRiotId: false,
            requireRankVerification: false,
            approvalProcess: 'automatic',
            maxTeams: 8,
            registrationDeadline: new Date(),
            teamValidationRules: [],
          },
          schedule: data.schedule || {
            startDate: new Date(),
            endDate: new Date(),
            timeZone: 'Europe/Berlin',
            matchDuration: 60,
            breakTime: 15,
            checkInTime: 15,
            maxMatchesPerDay: 4,
            preferredMatchTimes: [],
            blackoutDates: [],
          },
          prizePool: data.prizePool || {
            total: 0,
            distribution: { first: 0, second: 0, third: 0 },
            currency: 'EUR',
            paymentMethod: '',
            taxInfo: '',
          },
          status: data.status || 'draft',
          createdBy: data.createdBy || '',
          adminIds: data.adminIds || [],
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          publishedAt: data.publishedAt?.toDate(),
          teams: data.teams || [],
          waitlist: data.waitlist || [],
          rejectedTeams: data.rejectedTeams || [],
          brackets: data.brackets || {},
          matches: data.matches || [],
          seeding: data.seeding || { method: 'random', rankings: [] },
          stats: data.stats || {
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
          tags: data.tags || [],
          region: data.region || 'Europe',
          skillLevel: data.skillLevel || 'intermediate',
          isPublic: data.isPublic !== undefined ? data.isPublic : true,
          featured: data.featured || false,
          stageManagement: data.stageManagement || { currentStage: 'registration' },
        } as Tournament;
      });
    } catch (error) {
      console.error('Error getting tournaments:', error);
      throw new Error('Failed to get tournaments');
    }
  });
};

export const getOpenTournaments = async (): Promise<Tournament[]> => {
  try {
    const tournaments = await getTournaments();
    return tournaments.filter(tournament => tournament.status === 'registration-open');
  } catch (error) {
    console.error('Error getting open tournaments:', error);
    return [];
  }
};

export const signupTeamForTournament = async (tournamentId: string, teamId: string): Promise<void> => {
  return retryFirebaseOperation(async () => {
    try {
      const tournamentRef = doc(db, 'tournaments', tournamentId);
      const tournamentDoc = await getDoc(tournamentRef);
      
      if (!tournamentDoc.exists()) {
        throw new Error('Tournament not found');
      }
      
      const tournamentData = tournamentDoc.data();
      const teams = tournamentData.teams || [];
      
      if (teams.includes(teamId)) {
        throw new Error('Team is already signed up for this tournament');
      }
      
      // Use the actual configured team count from tournament format, not requirements
      const maxTeams = tournamentData.format?.teamCount || tournamentData.requirements?.maxTeams || 8;
      if (teams.length >= maxTeams) {
        throw new Error('Tournament is full');
      }
      
      await updateDoc(tournamentRef, {
        teams: [...teams, teamId],
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error signing up team for tournament:', error);
      throw error;
    }
  });
};

export const generateSingleEliminationBracket = async (tournamentId: string, teamIds: string[]): Promise<void> => {
  try {
    console.log('🔍 DEBUG: generateSingleEliminationBracket called with:', { tournamentId, teamIds });
    
    if (teamIds.length < 2) {
      throw new Error('Need at least 2 teams to generate bracket');
    }

    // Validate team count for single elimination
    const validTeamSizes = [2, 4, 8, 16, 32];
    if (!validTeamSizes.includes(teamIds.length)) {
      throw new Error(`Single elimination requires 2, 4, 8, 16, or 32 teams. Got ${teamIds.length} teams.`);
    }
    
    // Shuffle teams for random seeding
    const shuffledTeams = [...teamIds].sort(() => Math.random() - 0.5);
    console.log('🔍 DEBUG: Shuffled teams:', shuffledTeams);
    
    const matches: Omit<Match, 'id'>[] = [];
    let matchNumber = 1;
    
    // Special case: 2 teams, just one match (the final)
    if (shuffledTeams.length === 2) {
      const match: Omit<Match, 'id'> = {
        team1Id: shuffledTeams[0],
        team2Id: shuffledTeams[1],
        team1Score: 0,
        team2Score: 0,
        winnerId: null,
        round: 1,
        matchNumber: matchNumber++,
        isComplete: false,
        tournamentId,
        tournamentType: 'single-elim',
        createdAt: new Date(),
        matchState: 'ready_up',
        mapPool: ['Corrode', 'Ascent', 'Bind', 'Haven', 'Icebox', 'Lotus', 'Sunset'],
        bannedMaps: {
          team1: [],
          team2: []
        },
        team1Ready: false,
        team2Ready: false,
        team1MapBans: [],
        team2MapBans: []
      };
      matches.push(match);
      console.log(`🔍 DEBUG: Created final match: ${match.team1Id} vs ${match.team2Id}`);
    } else {
      // Calculate total rounds needed
      const totalRounds = Math.ceil(Math.log2(shuffledTeams.length));
      console.log('🔍 DEBUG: Total rounds needed:', totalRounds);
      
      // Generate first round matches
      console.log('🔍 DEBUG: Generating first round matches...');
      for (let i = 0; i < shuffledTeams.length; i += 2) {
        if (i + 1 < shuffledTeams.length) {
          const match: Omit<Match, 'id'> = {
            team1Id: shuffledTeams[i],
            team2Id: shuffledTeams[i + 1],
            team1Score: 0,
            team2Score: 0,
            winnerId: null,
            round: 1,
            matchNumber: matchNumber++,
            isComplete: false,
            tournamentId,
            tournamentType: 'single-elim',
            createdAt: new Date(),
            matchState: 'ready_up',
            mapPool: ['Corrode', 'Ascent', 'Bind', 'Haven', 'Icebox', 'Lotus', 'Sunset'],
            bannedMaps: {
              team1: [],
              team2: []
            },
            team1Ready: false,
            team2Ready: false,
            team1MapBans: [],
            team2MapBans: []
          };
          matches.push(match);
          console.log(`🔍 DEBUG: Created round 1 match ${match.matchNumber}: ${match.team1Id} vs ${match.team2Id}`);
        }
      }
      
      // Generate subsequent rounds (semifinals, finals, etc.)
      console.log('🔍 DEBUG: Generating subsequent rounds...');
      for (let round = 2; round <= totalRounds; round++) {
        const matchesInRound = Math.pow(2, totalRounds - round);
        console.log(`🔍 DEBUG: Round ${round} will have ${matchesInRound} matches`);
        
        for (let match = 1; match <= matchesInRound; match++) {
          const newMatch: Omit<Match, 'id'> = {
            team1Id: null,
            team2Id: null,
            team1Score: 0,
            team2Score: 0,
            winnerId: null,
            round,
            matchNumber: matchNumber++,
            isComplete: false,
            tournamentId,
            tournamentType: 'single-elim',
            createdAt: new Date(),
            matchState: 'ready_up',
            mapPool: ['Corrode', 'Ascent', 'Bind', 'Haven', 'Icebox', 'Lotus', 'Sunset'],
            bannedMaps: {
              team1: [],
              team2: []
            },
            team1Ready: false,
            team2Ready: false,
            team1MapBans: [],
            team2MapBans: []
          };
          matches.push(newMatch);
          console.log(`🔍 DEBUG: Created round ${round} match ${newMatch.matchNumber}: TBD vs TBD`);
        }
      }
    }
    
    console.log('🔍 DEBUG: Final matches array:', matches.map(m => ({
      round: m.round,
      matchNumber: m.matchNumber,
      team1Id: m.team1Id,
      team2Id: m.team2Id
    })));
    
    // Add all matches to Firebase
    console.log('🔍 DEBUG: Adding matches to Firebase...');
    for (const match of matches) {
      await addMatch(match);
    }
    
    console.log(`✅ DEBUG: Generated ${matches.length} matches for tournament ${tournamentId}`);
  } catch (error) {
    console.error('❌ DEBUG: Error generating tournament bracket:', error);
    throw error;
  }
};

// New function that returns matches array instead of adding to Firebase
export const generateSingleEliminationBracketMatches = (teams: any[], tournamentId: string): Omit<Match, 'id'>[] => {
  if (teams.length < 2) {
    throw new Error('Need at least 2 teams to generate bracket');
  }

  // Validate team count for single elimination
  const validTeamSizes = [2, 4, 8, 16, 32];
  if (!validTeamSizes.includes(teams.length)) {
    throw new Error(`Single elimination requires 2, 4, 8, 16, or 32 teams. Got ${teams.length} teams.`);
  }
  
  // Shuffle teams for random seeding
  const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
  
  const matches: Omit<Match, 'id'>[] = [];
  let matchNumber = 1;
  
  // Generate first round matches
  for (let i = 0; i < shuffledTeams.length; i += 2) {
    if (i + 1 < shuffledTeams.length) {
      const match: Omit<Match, 'id'> = {
        team1Id: shuffledTeams[i],
        team2Id: shuffledTeams[i + 1],
        team1Score: 0,
        team2Score: 0,
        winnerId: null,
        round: 1,
        matchNumber: matchNumber++,
        isComplete: false,
        tournamentType: 'single-elim',
        tournamentId,
        createdAt: new Date(),
        matchState: 'ready_up',
        mapPool: ['Corrode', 'Ascent', 'Bind', 'Haven', 'Icebox', 'Lotus', 'Sunset'],
        bannedMaps: {
          team1: [],
          team2: []
        },
        team1Ready: false,
        team2Ready: false,
        team1MapBans: [],
        team2MapBans: []
      };
      matches.push(match);
    }
  }
  
  // Generate subsequent rounds (semifinals, finals, etc.)
  const totalRounds = Math.ceil(Math.log2(shuffledTeams.length));
  for (let round = 2; round <= totalRounds; round++) {
    const matchesInRound = Math.pow(2, totalRounds - round);
    for (let match = 1; match <= matchesInRound; match++) {
      matches.push({
        team1Id: null,
        team2Id: null,
        team1Score: 0,
        team2Score: 0,
        winnerId: null,
        round,
        matchNumber: matchNumber++,
        isComplete: false,
        tournamentType: 'single-elim',
        tournamentId,
        createdAt: new Date(),
        matchState: 'ready_up',
        mapPool: ['Corrode', 'Ascent', 'Bind', 'Haven', 'Icebox', 'Lotus', 'Sunset'],
        bannedMaps: { team1: [], team2: [] },
        team1Ready: false,
        team2Ready: false,
        team1MapBans: [],
        team2MapBans: []
      });
    }
  }
  
  return matches;
};

export const getTournamentMatches = async (tournamentId: string): Promise<Match[]> => {
  const querySnapshot = await getDocs(
    query(
      collection(db, 'matches'),
      where('tournamentId', '==', tournamentId)
    )
  );
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date()
  })) as Match[];
};

// Delete all tournaments and their associated matches
export const deleteAllTournaments = async (): Promise<void> => {
  try {
    // Get all tournaments
    const tournamentsSnapshot = await getDocs(collection(db, 'tournaments'));
    
    // Delete all tournaments
    const tournamentDeletions = tournamentsSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(tournamentDeletions);
    
    // Get all matches
    const matchesSnapshot = await getDocs(collection(db, 'matches'));
    
    // Delete all matches
    const matchDeletions = matchesSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(matchDeletions);
    
    console.log(`Deleted ${tournamentsSnapshot.docs.length} tournaments and ${matchesSnapshot.docs.length} matches`);
  } catch (error) {
    console.error('Error deleting all tournaments:', error);
    throw error;
  }
};

// Fill tournament with demo teams (fills completely to capacity, doesn't auto-start)
export const fillTournamentWithDemoTeams = async (tournamentId: string, userTeamId?: string): Promise<void> => {
  try {
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    const tournamentDoc = await getDoc(tournamentRef);
    
    if (!tournamentDoc.exists()) {
      throw new Error('Tournament not found');
    }
    
    const tournament = tournamentDoc.data() as Tournament;
    
    if (tournament.status !== 'registration-open') {
      throw new Error('Tournament is not open for signups');
    }
    
    // Calculate how many demo teams to add to fill completely
    const maxTeams = tournament.format?.teamCount || 8;
    const teamsToAdd = maxTeams - (tournament.teams?.length || 0);
    
    if (teamsToAdd <= 0) {
      throw new Error('Tournament is already full');
    }
    
    // Get existing teams that aren't already in the tournament
    const existingTeams = await getTeams();
    const availableTeams = existingTeams.filter(team => !tournament.teams?.includes(team.id));
    
    let teamsToSignup: string[] = [];
    
    // Use existing teams first
    if (availableTeams.length > 0) {
      const existingTeamsToUse = availableTeams.slice(0, Math.min(teamsToAdd, availableTeams.length));
      teamsToSignup.push(...existingTeamsToUse.map(team => team.id));
    }
    
    // If we still need more teams, create new demo teams
    const remainingTeamsNeeded = teamsToAdd - teamsToSignup.length;
    if (remainingTeamsNeeded > 0) {
      const newDemoTeams = generateRandomTeams(remainingTeamsNeeded);
      
      // Add the new demo teams to the database
      for (const teamData of newDemoTeams) {
        const teamId = await addTeam(teamData);
        teamsToSignup.push(teamId);
      }
    }
    
    // Add all teams to the tournament
    const updatedTeams = [...(tournament.teams || []), ...teamsToSignup];
    await updateDoc(tournamentRef, { 
      teams: updatedTeams,
      status: 'registration-closed' // Close registration when full
    });
    
    // Tournament is now full and ready to start
    console.log(`Tournament filled with ${teamsToSignup.length} demo teams. Tournament is ready to start!`);
    
  } catch (error) {
    console.error('Error filling tournament with demo teams:', error);
    throw error;
  }
};

// Start tournament manually (closes registration and prepares for group stage)
export const startTournament = async (tournamentId: string): Promise<void> => {
  const tournamentRef = doc(db, 'tournaments', tournamentId);
  const tournamentDoc = await getDoc(tournamentRef);
  
  if (!tournamentDoc.exists()) {
    throw new Error('Tournament not found');
  }
  
  const tournamentData = tournamentDoc.data() as Tournament;
  
  if (tournamentData.status !== 'registration-closed') {
    throw new Error('Tournament must be registration-closed to start');
  }
  
  const maxTeams = tournamentData.format?.teamCount || 8;
  if ((tournamentData.teams?.length || 0) !== maxTeams) {
    throw new Error('Tournament must have the maximum number of teams to start');
  }

  // Check if any teams are already in active matches
  const allMatches = await getMatches();
  const activeMatchStates = ['ready_up', 'map_banning', 'side_selection_map1', 'side_selection_map2', 'side_selection_decider', 'playing'];
  const teamsInActiveMatches = (tournamentData.teams || []).filter(teamId => {
    return allMatches.some(match => 
      (match.team1Id === teamId || match.team2Id === teamId) && 
      activeMatchStates.includes(match.matchState)
    );
  });

  if (teamsInActiveMatches.length > 0) {
    const teamNames = await Promise.all(
      teamsInActiveMatches.map(async (teamId) => {
        const team = await getTeamById(teamId);
        return team?.name || `Team ${teamId}`;
      })
    );
    throw new Error(`Cannot start tournament: The following teams are already in active matches: ${teamNames.join(', ')}`);
  }
  
  // Close registration and prepare for group stage
  await updateDoc(tournamentRef, {
    status: 'registration-closed',
    startedAt: Timestamp.now()
  });
  
  // Send notifications to all players
  const allTeams = await getTeams();
  const tournamentTeams = allTeams.filter(team => (tournamentData.teams || []).includes(team.id));
  
  for (const team of tournamentTeams) {
    if (team.members) {
      for (const member of team.members) {
        // Create notification for each player
        await createNotification({
          userId: member.userId,
          type: 'match_scheduled',
          title: 'Tournament Registration Closed!',
          message: `The tournament "${tournamentData.name}" registration has closed! Groups will be generated soon.`,
          isRead: false,
          data: {
            tournamentId: tournamentId,
            teamId: team.id
          },
          actionRequired: true,
          actionUrl: `/tournaments/${tournamentId}`
        });
      }
    }
  }
  
  console.log(`Tournament ${tournamentId} registration closed successfully with ${tournamentData.teams?.length || 0} teams`);
};

// Migration function to convert old team structure to new structure
export const migrateTeamStructure = async (teamId: string): Promise<void> => {
  try {
    const teamRef = doc(db, 'teams', teamId);
    const teamSnap = await getDoc(teamRef);
    
    if (!teamSnap.exists()) {
      throw new Error('Team not found');
    }
    
    const data = teamSnap.data();
    
    // Check if team already has the new structure
    if (data.members && Array.isArray(data.members)) {
      return; // Already migrated
    }
    
    // Convert old structure to new structure
    const oldPlayers = data.players || [];
    const members: TeamMember[] = oldPlayers.map((playerId: string, index: number) => ({
      userId: playerId,
      role: index === 0 ? 'owner' : 'member',
      joinedAt: new Date(),
      isActive: true
    }));
    
    // Update team with new structure
    await updateDoc(teamRef, {
      ownerId: data.captainId,
      members: members,
      maxMembers: 10
    });
    
    console.log(`Migrated team ${teamId} to new structure`);
  } catch (error) {
    console.error(`Error migrating team ${teamId}:`, error);
    throw error;
  }
};

// Migrate all teams to new structure
export const migrateAllTeams = async (): Promise<void> => {
  const teams = await getTeams();
  for (const team of teams) {
    try {
      await migrateTeamStructure(team.id);
    } catch (error) {
      console.error(`Error migrating team ${team.id}:`, error);
    }
  }
};

// Real-time listeners
export const onNotificationsChange = (userId: string, callback: (notifications: Notification[]) => void) => {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId)
  );
  
  return onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      expiresAt: doc.data().expiresAt?.toDate()
    })) as Notification[];
    
    // Sort by createdAt in descending order (newest first)
    const sortedNotifications = notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    callback(sortedNotifications);
  });
};

export const onTeamInvitationsChange = (userId: string, callback: (invitations: TeamInvitation[]) => void) => {
  const q = query(
    collection(db, 'teamInvitations'),
    where('invitedUserId', '==', userId),
    where('status', '==', 'pending')
  );
  
  return onSnapshot(q, (snapshot) => {
    const invitations = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      expiresAt: doc.data().expiresAt?.toDate() || new Date()
    })) as TeamInvitation[];
    
    callback(invitations);
  });
};

export const onUserTeamsChange = (userId: string, callback: (teams: Team[]) => void) => {
  // We need to get all teams and filter them in memory since Firestore doesn't support
  // complex queries on array fields with objects
  const q = query(collection(db, 'teams'));
  
  return onSnapshot(q, (snapshot) => {
    const allTeams = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date()
    })) as Team[];
    
    // Filter teams where the user is a member
    const userTeams = allTeams.filter(team => 
      team.members && team.members.some(member => member.userId === userId)
    );
    
    callback(userTeams);
  });
};

// Utility function to clean up expired invitations
export const cleanupExpiredInvitations = async (): Promise<void> => {
  const now = new Date();
  const querySnapshot = await getDocs(
    query(
      collection(db, 'teamInvitations'),
      where('status', '==', 'pending')
    )
  );
  
  const expiredInvitations = querySnapshot.docs.filter(doc => {
    const data = doc.data();
    const expiresAt = data.expiresAt?.toDate();
    return expiresAt && expiresAt < now;
  });
  
  console.log(`Found ${expiredInvitations.length} expired invitations to clean up`);
  
  for (const doc of expiredInvitations) {
    await updateDoc(doc.ref, {
      status: 'expired'
    });
  }
  
  console.log('Expired invitations cleaned up');
};

// Utility function to update all pending invitations to use new 7-day expiration
export const updateAllInvitationsExpiration = async (): Promise<void> => {
  const invitationsRef = collection(db, 'teamInvitations');
  const querySnapshot = await getDocs(invitationsRef);
  
  const batch = writeBatch(db);
  querySnapshot.docs.forEach((doc) => {
    const data = doc.data();
    if (data.expiresAt && data.expiresAt.toDate() < new Date()) {
      batch.update(doc.ref, { status: 'expired' });
    }
  });
  
  await batch.commit();
};

// Real-time listener for team players
export const onTeamPlayersChange = (teamId: string, callback: (players: User[]) => void) => {
  if (!teamId) {
    console.warn('onTeamPlayersChange called with undefined or empty teamId');
    callback([]);
    return () => {};
  }

  const teamRef = doc(db, 'teams', teamId);
  
  return onSnapshot(teamRef, async (teamDoc) => {
    if (teamDoc.exists()) {
      const teamData = teamDoc.data();
      const members = teamData.members || [];
      const players: User[] = [];
      
      for (const member of members) {
        try {
          // Check if member has a valid userId
          if (!member || !member.userId || typeof member.userId !== 'string') {
            console.warn('Invalid member data:', member);
            continue;
          }

          const userDoc = await getDoc(doc(db, 'users', member.userId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            players.push({
              id: userDoc.id,
              username: userData.username,
              email: userData.email,
              riotId: userData.riotId,
              discordUsername: userData.discordUsername,
              createdAt: userData.createdAt?.toDate() || new Date(),
              teamIds: userData.teamIds || [],
              isAdmin: userData.isAdmin || false
            });
          }
        } catch (error) {
          console.error('Error fetching user:', error);
        }
      }
      
      callback(players);
    } else {
      callback([]);
    }
  });
};

export const fillTeamWithDemoMembers = async (teamId: string): Promise<void> => {
  const teamRef = doc(db, 'teams', teamId);
  const teamDoc = await getDoc(teamRef);
  
  if (!teamDoc.exists()) {
    throw new Error('Team not found');
  }
  
  const teamData = teamDoc.data();
  const currentMembers = teamData.members || [];
  const teamName = teamData.name || 'Team';
  
  // Check if team already has 5 members
  if (currentMembers.length >= 5) {
    throw new Error('Team is already full');
  }
  
  // Generate unique demo users for this specific team
  const membersToAdd = 5 - currentMembers.length;
  const newMembers: TeamMember[] = [];
  
  // Get existing demo users to avoid conflicts
  const existingUsers = await getDocs(collection(db, 'users'));
  const existingUsernames = new Set(existingUsers.docs.map(doc => doc.data().username));
  
  for (let i = 0; i < membersToAdd; i++) {
    // Generate unique username based on team name and player number
    let username = `${teamName}Player${i + 1}`;
    let counter = 1;
    
    // Ensure username is unique
    while (existingUsernames.has(username)) {
      username = `${teamName}Player${i + 1}_${counter}`;
      counter++;
    }
    
    existingUsernames.add(username);
    
    // Create unique demo user data
    const demoUser = {
      username,
      email: `${username.toLowerCase().replace(/\s+/g, '')}@demo.com`,
      riotId: `${username}#${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`,
      discordUsername: username.toLowerCase().replace(/\s+/g, ''),
      createdAt: Timestamp.now(),
      teamIds: [teamId],
      isAdmin: false
    };
    
    // Create demo user
    const userRef = await addDoc(collection(db, 'users'), demoUser);
    
    // Add to team members
    newMembers.push({
      userId: userRef.id,
      role: 'member',
      joinedAt: new Date(),
      isActive: true
    });
  }
  
  // Update team with new members
  await updateDoc(teamRef, {
    members: [...currentMembers, ...newMembers]
  });
};

// Simple and bulletproof ready-up function
export const handleTeamReadyUp = async (matchId: string, teamId: string): Promise<void> => {
  console.log(`[READY-UP] Starting for match ${matchId}, team ${teamId}`);
  
  try {
    // Get the match document
    const matchRef = doc(db, 'matches', matchId);
    const matchDoc = await getDoc(matchRef);
    
    if (!matchDoc.exists()) {
      throw new Error('Match not found');
    }
    
    const matchData = matchDoc.data();
    console.log('[READY-UP] Current match data:', matchData);
    
    // Determine which team is readying up
    const isTeam1 = matchData.team1Id === teamId;
    const isTeam2 = matchData.team2Id === teamId;
    
    if (!isTeam1 && !isTeam2) {
      throw new Error('Team is not part of this match');
    }
    
    // Check if team is already ready
    if (isTeam1 && matchData.team1Ready) {
      throw new Error('Team 1 is already ready');
    }
    if (isTeam2 && matchData.team2Ready) {
      throw new Error('Team 2 is already ready');
    }
    
    // Update the ready state
    const updateData: any = {};
    if (isTeam1) {
      updateData.team1Ready = true;
    } else {
      updateData.team2Ready = true;
    }
    
    // Check if both teams are now ready
    const team1Ready = isTeam1 ? true : Boolean(matchData.team1Ready);
    const team2Ready = isTeam2 ? true : Boolean(matchData.team2Ready);
    
    if (team1Ready && team2Ready) {
      // Both teams are ready, transition to map banning
      updateData.matchState = 'map_banning';
      updateData.bannedMaps = {
        team1: [],
        team2: []
      };
      updateData.mapPool = matchData.mapPool || ['Corrode', 'Ascent', 'Bind', 'Haven', 'Icebox', 'Lotus', 'Sunset'];
      console.log('[READY-UP] Both teams ready, transitioning to map banning');
    }
    
    // Update the match document
    await updateDoc(matchRef, updateData);
    console.log('[READY-UP] Successfully updated match');
    
  } catch (error) {
    console.error('[READY-UP] Error:', error);
    throw error;
  }
};

// Function to handle map banning completion
export const handleMapBanningComplete = async (matchId: string): Promise<void> => {
  const matchRef = doc(db, 'matches', matchId);
  const matchDoc = await getDoc(matchRef);
  
  if (!matchDoc.exists()) {
    throw new Error('Match not found');
  }
  
  const matchData = matchDoc.data();
  
  // Safely handle bannedMaps with fallbacks
  const safeBannedMaps = {
    team1: Array.isArray(matchData.bannedMaps?.team1) ? matchData.bannedMaps.team1 : [],
    team2: Array.isArray(matchData.bannedMaps?.team2) ? matchData.bannedMaps.team2 : []
  };
  
  // Check if map banning is complete (both teams have banned maps and selected a map)
  const totalBans = safeBannedMaps.team1.length + safeBannedMaps.team2.length;
  const hasMapSelected = matchData.selectedMap;
  
  if (totalBans >= 5 && hasMapSelected) {
    // Update match state to side selection
    await updateDoc(matchRef, {
      matchState: 'side_selection',
      updatedAt: serverTimestamp()
    });
  }
};

// Function to ban a map
export const banMap = async (matchId: string, teamId: string, mapName: string): Promise<void> => {
  console.log('🔍 DEBUG: banMap called with:', { matchId, teamId, mapName });
  
  const matchRef = doc(db, 'matches', matchId);
  const matchDoc = await getDoc(matchRef);
  
  if (!matchDoc.exists()) {
    throw new Error('Match not found');
  }
  
  const matchData = matchDoc.data();
  const isTeam1 = matchData.team1Id === teamId;
  const isTeam2 = matchData.team2Id === teamId;
  
  console.log('🔍 DEBUG: Team identification in banMap:', { 
    teamId, 
    matchTeam1Id: matchData.team1Id, 
    matchTeam2Id: matchData.team2Id,
    isTeam1, 
    isTeam2 
  });
  
  if (!isTeam1 && !isTeam2) {
    throw new Error('Team is not part of this match');
  }
  
  // Get current banned maps and ban sequence
  const currentBannedMaps = matchData.bannedMaps || { team1: [], team2: [] };
  const banSequence = matchData.banSequence || [];
  const totalBans = currentBannedMaps.team1.length + currentBannedMaps.team2.length;
  
  console.log('🔍 DEBUG: Current ban state:', { 
    totalBans, 
    team1Bans: currentBannedMaps.team1.length, 
    team2Bans: currentBannedMaps.team2.length,
    team1BannedMaps: currentBannedMaps.team1,
    team2BannedMaps: currentBannedMaps.team2,
    banSequence
  });
  
  // BO3 Flow Logic:
  // Phase 1: 2 bans (Team A, Team B) → Map 1 selection
  // Phase 2: Map 1 + Map 2 selection (no more banning)
  // Phase 3: 2 more bans (Team A, Team B) → Decider map (automatic)
  
  // Check if we're in the right phase for banning
  if (totalBans >= 4) {
    throw new Error('Map banning phase is complete. All maps have been selected.');
  }
  
  // Determine whose turn it is to ban based on BO3 flow
  let isTeam1Turn: boolean;
  
  if (totalBans < 2) {
    // Phase 1: Team A bans first, then Team B
    isTeam1Turn = totalBans === 0;
  } else {
    // Phase 3: Team A bans first, then Team B (for decider)
    isTeam1Turn = totalBans === 2;
  }
  
  console.log('🔍 DEBUG: Turn calculation:', { 
    totalBans, 
    isTeam1Turn, 
    isTeam1, 
    isTeam2,
    phase: totalBans < 2 ? 'Phase 1 (Map 1)' : 'Phase 3 (Decider)'
  });
  
  // Check if it's the correct team's turn
  if (isTeam1 && !isTeam1Turn) {
    throw new Error("It's not your team's turn to ban. Please wait for the other team.");
  }
  if (isTeam2 && isTeam1Turn) {
    throw new Error("It's not your team's turn to ban. Please wait for the other team.");
  }
  
  // Add the map to the appropriate team's banned list
  if (isTeam1) {
    currentBannedMaps.team1 = [...currentBannedMaps.team1, mapName];
  } else {
    currentBannedMaps.team2 = [...currentBannedMaps.team2, mapName];
  }
  
  // Add to ban sequence
  const newBanSequence = [...banSequence, { teamId, mapName, banNumber: totalBans + 1 }];
  
  console.log('🔍 DEBUG: Updated banned maps:', currentBannedMaps);
  console.log('🔍 DEBUG: Updated ban sequence:', newBanSequence);
  
  // Update the match document
  await updateDoc(matchRef, {
    bannedMaps: currentBannedMaps,
    banSequence: newBanSequence,
    updatedAt: serverTimestamp()
  });
};

// Function to select a map
export const selectMap = async (matchId: string, teamId: string, mapName: string): Promise<void> => {
  console.log('🔍 DEBUG: selectMap called with:', { matchId, teamId, mapName });
  
  const matchRef = doc(db, 'matches', matchId);
  const matchDoc = await getDoc(matchRef);
  
  if (!matchDoc.exists()) {
    throw new Error('Match not found');
  }
  
  const matchData = matchDoc.data();
  const isTeam1 = matchData.team1Id === teamId;
  const isTeam2 = matchData.team2Id === teamId;
  
  console.log('🔍 DEBUG: Team identification:', { 
    teamId, 
    matchTeam1Id: matchData.team1Id, 
    matchTeam2Id: matchData.team2Id,
    isTeam1, 
    isTeam2 
  });
  
  if (!isTeam1 && !isTeam2) {
    throw new Error('Team is not part of this match');
  }
  
  // Get current banned maps and ban sequence
  const currentBannedMaps = matchData.bannedMaps || { team1: [], team2: [] };
  const banSequence = matchData.banSequence || [];
  const totalBans = currentBannedMaps.team1.length + currentBannedMaps.team2.length;
  
  console.log('🔍 DEBUG: Ban counts:', { 
    totalBans, 
    team1Bans: currentBannedMaps.team1.length, 
    team2Bans: currentBannedMaps.team2.length,
    team1BannedMaps: currentBannedMaps.team1,
    team2BannedMaps: currentBannedMaps.team2,
    banSequence
  });
  
  // BO3 Map Selection Logic:
  // After 2 bans: Team A picks Map 1
  // After Map 1 + side selection: Team B picks Map 2 (no more banning yet)
  // After Map 2 + side selection: 2 more bans, then Decider is automatic
  
  let mapSelectionPhase: 'map1' | 'map2' | 'decider' | 'none';
  let teamThatShouldSelect: 'team1' | 'team2';
  
  if (!matchData.map1) {
    // Map 1 selection phase - after 2 bans
    if (totalBans < 2) {
      throw new Error('Map 1 selection phase has not started yet. Continue banning maps.');
    }
    mapSelectionPhase = 'map1';
    teamThatShouldSelect = 'team1'; // Team A picks Map 1
  } else if (matchData.map1 && matchData.map1Side && !matchData.map2) {
    // Map 2 selection phase - Team B picks Map 2 immediately after Map 1 side selection
    mapSelectionPhase = 'map2';
    teamThatShouldSelect = 'team2'; // Team B picks Map 2
  } else if (matchData.map2 && matchData.map2Side && totalBans >= 4) {
    // Decider map is automatically selected after 4 bans
    mapSelectionPhase = 'decider';
    teamThatShouldSelect = 'team1'; // Team A picks side for Decider
  } else {
    throw new Error('Map selection is not available at this time.');
  }
  
  console.log('🔍 DEBUG: Map selection phase:', { 
    mapSelectionPhase, 
    teamThatShouldSelect,
    totalBans,
    map1: matchData.map1,
    map1Side: matchData.map1Side,
    map2: matchData.map2,
    map2Side: matchData.map2Side
  });
  
  // Check if the current team is the one that should select
  const currentTeamShouldSelect = (teamThatShouldSelect === 'team1' && isTeam1) || (teamThatShouldSelect === 'team2' && isTeam2);
  
  if (!currentTeamShouldSelect) {
    const otherTeamName = teamThatShouldSelect === 'team1' ? 'Team 1' : 'Team 2';
    throw new Error(`Only ${otherTeamName} can select a map at this time`);
  }
  
  // Verify the map is available (not banned)
  const allBannedMaps = [...currentBannedMaps.team1, ...currentBannedMaps.team2];
  if (allBannedMaps.includes(mapName)) {
    throw new Error('Cannot select a banned map');
  }
  
  // Verify the map hasn't been selected already
  if (matchData.map1 === mapName || matchData.map2 === mapName) {
    throw new Error('This map has already been selected');
  }
  
  console.log('🔍 DEBUG: Map selection successful, updating match state');
  
  // Update the match document based on the phase
  const updateData: any = {};
  
  if (mapSelectionPhase === 'map1') {
    updateData.map1 = mapName;
    // Keep in map_banning state - side selection happens within MapBanning component
    updateData.matchState = 'map_banning';
  } else if (mapSelectionPhase === 'map2') {
    updateData.map2 = mapName;
    // Keep in map_banning state - side selection happens within MapBanning component
    updateData.matchState = 'map_banning';
  } else if (mapSelectionPhase === 'decider') {
    // Find the remaining map that wasn't banned or picked
    const allMaps = ['Abyss', 'Bind', 'Haven', 'Ascent', 'Sunset', 'Corrode', 'Lotus'];
    const usedMaps = [...allBannedMaps, matchData.map1, matchData.map2];
    const remainingMap = allMaps.find(map => !usedMaps.includes(map));
    
    if (remainingMap) {
      updateData.deciderMap = remainingMap;
      // Keep in map_banning state - side selection happens within MapBanning component
      updateData.matchState = 'map_banning';
    } else {
      throw new Error('Could not determine decider map');
    }
  }
  
  updateData.updatedAt = serverTimestamp();
  
  await updateDoc(matchRef, updateData);
};

// Function to handle side selection completion
export const handleSideSelectionComplete = async (matchId: string): Promise<void> => {
  const matchRef = doc(db, 'matches', matchId);
  const matchDoc = await getDoc(matchRef);
  
  if (!matchDoc.exists()) {
    throw new Error('Match not found');
  }
  
  const matchData = matchDoc.data() as Match;
  
  // Check if both teams have selected sides
  const sideSelection = matchData.sideSelection;
  if (sideSelection?.team1SideSelected && sideSelection?.team2SideSelected) {
    await updateDoc(matchRef, {
      matchState: 'playing'
    });
  }
};

// Function to handle match completion
export const handleMatchComplete = async (matchId: string, winnerId: string, team1Score: number, team2Score: number): Promise<void> => {
  const matchRef = doc(db, 'matches', matchId);
  
  await updateDoc(matchRef, {
    matchState: 'completed',
    isComplete: true,
    winnerId,
    team1Score,
    team2Score,
    resolvedAt: new Date()
  });
};

// Helper function to check if a team is in any active matches
export const isTeamInActiveMatch = async (teamId: string): Promise<{ isActive: boolean; match?: Match }> => {
  const allMatches = await getMatches();
  const activeMatchStates = ['ready_up', 'map_banning', 'side_selection_map1', 'side_selection_map2', 'side_selection_decider', 'playing'];
  const activeMatch = allMatches.find(match => 
    (match.team1Id === teamId || match.team2Id === teamId) && 
    activeMatchStates.includes(match.matchState)
  );
  
  return {
    isActive: !!activeMatch,
    match: activeMatch || undefined
  };
};

// Helper function to get all teams that are currently in active matches
export const getTeamsInActiveMatches = async (): Promise<{ teamId: string; match: Match }[]> => {
  const allMatches = await getMatches();
  const activeMatchStates = ['ready_up', 'map_banning', 'side_selection_map1', 'side_selection_map2', 'side_selection_decider', 'playing'];
  const activeMatches = allMatches.filter(match => activeMatchStates.includes(match.matchState));
  
  const teamsInActiveMatches: { teamId: string; match: Match }[] = [];
  
  activeMatches.forEach(match => {
    if (match.team1Id) {
      teamsInActiveMatches.push({ teamId: match.team1Id, match });
    }
    if (match.team2Id) {
      teamsInActiveMatches.push({ teamId: match.team2Id, match });
    }
  });
  
  return teamsInActiveMatches;
};

// Function to submit match result
export const submitMatchResult = async (matchId: string, teamId: string, team1Score: number, team2Score: number): Promise<void> => {
  const matchRef = doc(db, 'matches', matchId);
  const matchDoc = await getDoc(matchRef);
  
  if (!matchDoc.exists()) {
    throw new Error('Match not found');
  }
  
  const matchData = matchDoc.data();
  const isTeam1 = matchData.team1Id === teamId;
  const isTeam2 = matchData.team2Id === teamId;
  
  if (!isTeam1 && !isTeam2) {
    throw new Error('Team is not part of this match');
  }
  
  // Check if match is in waiting_results state
  if (matchData.matchState !== 'waiting_results' && matchData.matchState !== 'playing') {
    throw new Error('Match is not in result submission state');
  }
  
  // Initialize result submission if it doesn't exist
  const currentResultSubmission = matchData.resultSubmission || {
    team1Submitted: false,
    team2Submitted: false,
    team1SubmittedScore: null,
    team2SubmittedScore: null
  };
  
  // Update the result submission
  const updateData: any = {
    matchState: 'waiting_results',
    resultSubmission: {
      ...currentResultSubmission,
      submittedAt: serverTimestamp()
    }
  };
  
  if (isTeam1) {
    updateData.resultSubmission.team1Submitted = true;
    updateData.resultSubmission.team1SubmittedScore = { team1Score, team2Score };
  } else {
    updateData.resultSubmission.team2Submitted = true;
    updateData.resultSubmission.team2SubmittedScore = { team1Score, team2Score };
  }
  
  // Check if both teams have submitted
  const team1Submitted = isTeam1 ? true : currentResultSubmission.team1Submitted;
  const team2Submitted = isTeam2 ? true : currentResultSubmission.team2Submitted;
  
  if (team1Submitted && team2Submitted) {
    // Both teams have submitted, check if scores match
    const submittedTeam1Score = isTeam1 ? { team1Score, team2Score } : currentResultSubmission.team1SubmittedScore;
    const submittedTeam2Score = isTeam2 ? { team1Score, team2Score } : currentResultSubmission.team2SubmittedScore;
    
    if (submittedTeam1Score && submittedTeam2Score &&
        submittedTeam1Score.team1Score === submittedTeam2Score.team1Score &&
        submittedTeam1Score.team2Score === submittedTeam2Score.team2Score) {
      // Scores match, complete the match
      const winnerId = submittedTeam1Score.team1Score > submittedTeam1Score.team2Score ? matchData.team1Id : matchData.team2Id;
      
      updateData.matchState = 'completed';
      updateData.isComplete = true;
      updateData.winnerId = winnerId;
      updateData.team1Score = submittedTeam1Score.team1Score;
      updateData.team2Score = submittedTeam1Score.team2Score;
      updateData.resolvedAt = serverTimestamp();
      
      // If this is a tournament match, update standings and advance the winner
      if (matchData.tournamentId) {
        console.log('🔍 DEBUG: Tournament match detected:', {
          tournamentId: matchData.tournamentId,
          tournamentType: matchData.tournamentType,
          matchState: matchData.matchState,
          isComplete: matchData.isComplete
        });
        
        // Debug: Show all match data fields
        console.log('🔍 DEBUG: All match data fields:', Object.keys(matchData));
        console.log('🔍 DEBUG: Full match data:', matchData);
        
        // Update Swiss standings if this is a Swiss system tournament
        if (matchData.tournamentType === 'swiss-system' || matchData.tournamentType === 'swiss') {
          console.log('🎯 DEBUG: Swiss system tournament detected, updating standings...');
          try {
            const { SwissTournamentService } = await import('./swissTournamentService');
            await SwissTournamentService.updateSwissStandings(matchData.tournamentId, {
              ...matchData,
              team1Score: submittedTeam1Score.team1Score,
              team2Score: submittedTeam1Score.team2Score,
              isComplete: true,
              winnerId
            } as Match);
            console.log('✅ DEBUG: Swiss standings updated successfully');
          } catch (error) {
            console.error('❌ DEBUG: Failed to update Swiss standings:', error);
          }
        } else {
          // For other tournament types, use the existing advancement logic
          await advanceWinnerToNextRound(matchData.tournamentId, matchData.round, matchData.matchNumber, winnerId);
        }
      }
      
      // Check if tournament should be marked as completed
      if (matchData.tournamentId) {
        await checkAndMarkTournamentCompleted(matchData.tournamentId);
      }
    } else {
      // Scores don't match, create a dispute
      updateData.matchState = 'disputed';
      updateData.dispute = {
        createdBy: 'system',
        createdAt: serverTimestamp(),
        reason: 'score_mismatch',
        team1SubmittedScore: submittedTeam1Score,
        team2SubmittedScore: submittedTeam2Score
      };
    }
  }
  
  await updateDoc(matchRef, updateData);
};

// Function to advance winner to next match in tournament
export const advanceWinnerToNextMatch = async (tournamentId: string, nextMatchId: string, winnerId: string): Promise<void> => {
  const nextMatchRef = doc(db, 'matches', nextMatchId);
  const nextMatchDoc = await getDoc(nextMatchRef);
  
  if (!nextMatchDoc.exists()) {
    console.warn('Next match not found:', nextMatchId);
    return;
  }
  
  const nextMatchData = nextMatchDoc.data();
  
  // Determine which team slot to fill
  let updateData: any = {};
  if (!nextMatchData.team1Id) {
    updateData.team1Id = winnerId;
  } else if (!nextMatchData.team2Id) {
    updateData.team2Id = winnerId;
  } else {
    console.warn('Next match already has both teams filled');
    return;
  }
  
  await updateDoc(nextMatchRef, updateData);
};

// Function to handle match completion (for admin override)
export const completeMatch = async (matchId: string, team1Score: number, team2Score: number, winnerId: string): Promise<void> => {
  console.log('🎯 DEBUG: completeMatch called with:', { matchId, team1Score, team2Score, winnerId });
  
  // Validate winnerId
  if (!winnerId || typeof winnerId !== 'string' || winnerId.trim() === '') {
    console.error('❌ DEBUG: Invalid winnerId provided to completeMatch:', winnerId);
    throw new Error('Invalid winnerId provided to completeMatch');
  }
  
  const matchRef = doc(db, 'matches', matchId);
  
  // First, get the current match data to understand the bracket structure
  const matchDoc = await getDoc(matchRef);
  if (!matchDoc.exists()) {
    throw new Error('Match not found');
  }
  
  const matchData = matchDoc.data();
  console.log('🔍 DEBUG: Match data before completion:', {
    tournamentId: matchData.tournamentId,
    round: matchData.round,
    matchNumber: matchData.matchNumber,
    team1Id: matchData.team1Id,
    team2Id: matchData.team2Id
  });
  
  // Complete the current match
  await updateDoc(matchRef, {
    matchState: 'completed',
    isComplete: true,
    winnerId,
    team1Score,
    team2Score,
    resolvedAt: serverTimestamp(),
    resultSubmission: {
      team1Submitted: true,
      team2Submitted: true,
      team1SubmittedScore: { team1Score, team2Score },
      team2SubmittedScore: { team1Score, team2Score },
      submittedAt: serverTimestamp()
    }
  });
  
  console.log('✅ DEBUG: Match completed successfully');
  
  // If this is a tournament match, update standings and advance the winner
  if (matchData.tournamentId) {
    console.log('🚀 DEBUG: Calling advancement logic with:', {
      tournamentId: matchData.tournamentId,
      currentRound: matchData.round,
      currentMatchNumber: matchData.matchNumber,
      winnerId,
      tournamentType: matchData.tournamentType
    });
    
    // Update Swiss standings if this is a Swiss system tournament
    if (matchData.tournamentType === 'swiss-system' || matchData.tournamentType === 'swiss') {
      console.log('🎯 DEBUG: Swiss system tournament detected in completeMatch, updating standings...');
      try {
        const { SwissTournamentService } = await import('./swissTournamentService');
        await SwissTournamentService.updateSwissStandings(matchData.tournamentId, {
          ...matchData,
          team1Score,
          team2Score,
          isComplete: true,
          winnerId
        } as Match);
        console.log('✅ DEBUG: Swiss standings updated successfully in completeMatch');
      } catch (error) {
        console.error('❌ DEBUG: Failed to update Swiss standings in completeMatch:', error);
      }
    } else {
      // For other tournament types, use the existing advancement logic
      // Determine the loser
      const loserId = winnerId === matchData.team1Id ? matchData.team2Id : matchData.team1Id;
      
      if (matchData.tournamentType === 'double-elim') {
        // Use double elimination advancement logic
        if (matchData.bracketType) {
          await advanceDoubleEliminationMatch(matchData.tournamentId, matchData as Match, winnerId, loserId);
        } else {
          // Fallback to single elimination logic
          await advanceWinnerToNextMatch(matchData.tournamentId, matchData.nextMatchId || '', winnerId);
        }
      } else {
        // Use single elimination advancement logic
        await advanceWinnerToNextRound(matchData.tournamentId, matchData.round, matchData.matchNumber, winnerId);
        
        // Check if this round is complete and if we should advance to the next round
        await checkAndAdvanceRound(matchData.tournamentId, matchData.round);
      }
    }
  } else {
    console.log('⚠️ DEBUG: No tournamentId found, skipping advancement');
  }
};

// New function to advance winner to the next round based on bracket position - UPDATED VERSION 2024
export const advanceWinnerToNextRound = async (tournamentId: string, currentRound: number, currentMatchNumber: number, winnerId: string): Promise<void> => {
  try {
    console.log('🔍 DEBUG: advanceWinnerToNextRound called with:', {
      tournamentId,
      currentRound,
      currentMatchNumber,
      winnerId
    });

    // Validate winnerId
    if (!winnerId || typeof winnerId !== 'string' || winnerId.trim() === '') {
      console.error('❌ DEBUG: Invalid winnerId provided to advanceWinnerToNextRound:', winnerId);
      throw new Error('Invalid winnerId provided to advanceWinnerToNextRound');
    }

    // Get all matches for this tournament
    const allMatches = await getTournamentMatches(tournamentId);
    console.log('🔍 DEBUG: All tournament matches:', allMatches.map(m => ({
      id: m.id,
      round: m.round,
      matchNumber: m.matchNumber,
      team1Id: m.team1Id,
      team2Id: m.team2Id,
      isComplete: m.isComplete,
      winnerId: m.winnerId
    })));

    const nextRound = currentRound + 1;
    console.log('🔍 DEBUG: Next round:', nextRound);
    
    // Get all matches in the next round and sort them by matchNumber
    const nextRoundMatches = allMatches
      .filter(match => match.round === nextRound)
      .sort((a, b) => a.matchNumber - b.matchNumber);
    
    console.log('🔍 DEBUG: Next round matches:', nextRoundMatches.map(m => ({
      id: m.id,
      round: m.round,
      matchNumber: m.matchNumber,
      team1Id: m.team1Id,
      team2Id: m.team2Id
    })));
    
    // Calculate which match in the next round this winner should go to
    // For any bracket: match 1&2 -> next match 1, match 3&4 -> next match 2, etc.
    // We need to find the position within the current round first
    const currentRoundMatches = allMatches
      .filter(match => match.round === currentRound)
      .sort((a, b) => a.matchNumber - b.matchNumber);
    
    const currentMatchPosition = currentRoundMatches.findIndex(match => match.matchNumber === currentMatchNumber) + 1;
    console.log('🔍 DEBUG: Current match position in round:', currentMatchPosition);
    console.log('🔍 DEBUG: Current round matches:', currentRoundMatches.map(m => m.matchNumber));
    
    // Now calculate which position in the next round this winner should go to
    // For any round: position 1&2 -> next position 1, position 3&4 -> next position 2, etc.
    const nextPosition = Math.ceil(currentMatchPosition / 2);
    console.log('🔍 DEBUG: Next position in round:', nextPosition);
    
    // Get the match at the calculated position (1-based index)
    const nextMatch = nextRoundMatches[nextPosition - 1];
    
    console.log('🔍 DEBUG: Found next match:', nextMatch ? {
      id: nextMatch.id,
      round: nextMatch.round,
      matchNumber: nextMatch.matchNumber,
      team1Id: nextMatch.team1Id,
      team2Id: nextMatch.team2Id
    } : 'No next match found');
    
    if (nextMatch) {
      const nextMatchRef = doc(db, 'matches', nextMatch.id);
      const nextMatchDoc = await getDoc(nextMatchRef);
      
      if (nextMatchDoc.exists()) {
        const nextMatchData = nextMatchDoc.data();
        console.log('🔍 DEBUG: Next match data before update:', {
          team1Id: nextMatchData.team1Id,
          team2Id: nextMatchData.team2Id
        });
        
        // Determine which team slot to fill based on match number
        // Odd match numbers (1, 3, 5, 7...) go to team1 slot
        // Even match numbers (2, 4, 6, 8...) go to team2 slot
        let updateData: any = {};
        
        if (currentMatchNumber % 2 === 1) {
          // Odd match number -> team1 slot in next match
          updateData.team1Id = winnerId;
          console.log('🔍 DEBUG: Filling team1 slot with winner (odd match number)');
        } else {
          // Even match number -> team2 slot in next match
          updateData.team2Id = winnerId;
          console.log('🔍 DEBUG: Filling team2 slot with winner (even match number)');
        }
        
        console.log('🔍 DEBUG: Update data:', updateData);
        
        await updateDoc(nextMatchRef, updateData);
        console.log(`✅ DEBUG: Successfully advanced winner to next round`);
        
        // Verify the update worked
        const updatedMatchDoc = await getDoc(nextMatchRef);
        const updatedMatchData = updatedMatchDoc.data();
        if (updatedMatchData) {
          console.log('🔍 DEBUG: Next match data after update:', {
            team1Id: updatedMatchData.team1Id,
            team2Id: updatedMatchData.team2Id
          });
        }
      } else {
        console.error('❌ DEBUG: Next match document does not exist');
      }
    } else {
      console.warn(`❌ DEBUG: No next match found for round ${nextRound}, position ${nextPosition}`);
      console.log('🔍 DEBUG: Available matches in next round:', nextRoundMatches);
    }
  } catch (error) {
    console.error('❌ DEBUG: Error advancing winner to next round:', error);
    throw error;
  }
};

// New function to check if a round is complete and advance to next round
export const checkAndAdvanceRound = async (tournamentId: string, currentRound: number): Promise<void> => {
  try {
    const allMatches = await getTournamentMatches(tournamentId);
    const currentRoundMatches = allMatches.filter(match => match.round === currentRound);
    const completedMatches = currentRoundMatches.filter(match => match.isComplete);
    
    // If all matches in current round are complete
    if (completedMatches.length === currentRoundMatches.length && currentRoundMatches.length > 0) {
      console.log(`Round ${currentRound} is complete for tournament ${tournamentId}`);
      
      // Check if this was the final round
      const maxRound = Math.max(...allMatches.map(m => m.round));
      if (currentRound === maxRound) {
        // This was the final round, mark tournament as completed
        await checkAndMarkTournamentCompleted(tournamentId);
      }
      // If not the final round, the next round matches should already have teams assigned
      // from the advanceWinnerToNextRound function
    }
  } catch (error) {
    console.error('Error checking and advancing round:', error);
    throw error;
  }
};

// Function to handle score dispute when teams submit different scores
export const handleScoreDispute = async (matchId: string): Promise<void> => {
  const matchRef = doc(db, 'matches', matchId);
  
  await updateDoc(matchRef, {
    matchState: 'disputed',
    disputeRequested: true,
    disputeReason: 'Score mismatch between teams',
    resolvedAt: serverTimestamp()
  });
};

// Function to resolve dispute (admin function)
export const resolveScoreDispute = async (
  matchId: string, 
  finalTeam1Score: number, 
  finalTeam2Score: number, 
  winnerId: string,
  adminId: string
): Promise<void> => {
  const matchRef = doc(db, 'matches', matchId);
  
  // First, get the current match data
  const matchDoc = await getDoc(matchRef);
  if (!matchDoc.exists()) {
    throw new Error('Match not found');
  }
  
  const matchData = matchDoc.data();
  
  await updateDoc(matchRef, {
    matchState: 'completed',
    isComplete: true,
    winnerId,
    team1Score: finalTeam1Score,
    team2Score: finalTeam2Score,
    resolvedAt: serverTimestamp(),
    adminAssigned: adminId,
    adminResolution: `Admin resolved score dispute. Final score: ${finalTeam1Score}-${finalTeam2Score}`,
    resultSubmission: {
      team1Submitted: true,
      team2Submitted: true,
      team1SubmittedScore: { team1Score: finalTeam1Score, team2Score: finalTeam2Score },
      team2SubmittedScore: { team1Score: finalTeam1Score, team2Score: finalTeam2Score },
      submittedAt: serverTimestamp()
    }
  });
  
  // If this is a tournament match, advance the winner to the next round
    if (matchData.tournamentId) {
    await advanceWinnerToNextRound(matchData.tournamentId, matchData.round, matchData.matchNumber, winnerId);
    
    // Check if this round is complete and if we should advance to the next round
    await checkAndAdvanceRound(matchData.tournamentId, matchData.round);
  }
};

// Check if all matches in a tournament are completed and mark tournament as completed if so
export const checkAndMarkTournamentCompleted = async (tournamentId: string): Promise<void> => {
  return retryFirebaseOperation(async () => {
    try {
      const tournamentRef = doc(db, 'tournaments', tournamentId);
      const tournamentDoc = await getDoc(tournamentRef);
      
      if (!tournamentDoc.exists()) {
        throw new Error('Tournament not found');
      }
      
      const tournamentData = tournamentDoc.data();
      const matches = await getTournamentMatches(tournamentId);
      const completedMatches = matches.filter(match => match.isComplete);
      
      // Check if all matches are completed
      if (completedMatches.length === matches.length && matches.length > 0) {
        await updateDoc(tournamentRef, {
          status: 'completed',
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error checking tournament completion:', error);
      throw error;
    }
  });
};

// Manual function to force mark a tournament as completed (for debugging)
export const forceMarkTournamentCompleted = async (tournamentId: string): Promise<void> => {
  try {
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    await updateDoc(tournamentRef, {
      status: 'completed',
      completedAt: new Date()
    });
    
    console.log(`Tournament ${tournamentId} manually marked as completed`);
  } catch (error) {
    console.error('Error manually marking tournament as completed:', error);
    throw error;
  }
};

// Create a dispute for a match
export const createDispute = async (matchId: string, teamId: string): Promise<void> => {
  const matchRef = doc(db, 'matches', matchId);
  
  await updateDoc(matchRef, {
    matchState: 'disputed',
    dispute: {
      createdBy: teamId,
      createdAt: serverTimestamp(),
      reason: 'manual_dispute'
    }
  });
};

// Resolve a dispute (admin only)
export const resolveDispute = async (matchId: string, action: 'reset' | 'force_complete'): Promise<void> => {
  const matchRef = doc(db, 'matches', matchId);
  
  if (action === 'reset') {
    await updateDoc(matchRef, {
      matchState: 'playing',
      dispute: null,
      resultSubmission: null
    });
  }
  // force_complete is handled by forceSubmitResults function
};

// Force submit results (admin only)
export const forceSubmitResults = async (matchId: string, team1Score: number, team2Score: number, winnerId: string): Promise<void> => {
  const matchRef = doc(db, 'matches', matchId);
  
  // First, get the current match data
  const matchDoc = await getDoc(matchRef);
  if (!matchDoc.exists()) {
    throw new Error('Match not found');
  }
  
  const matchData = matchDoc.data();
  
  await updateDoc(matchRef, {
    matchState: 'completed',
    isComplete: true,
    winnerId,
    team1Score,
    team2Score,
    resolvedAt: serverTimestamp(),
    dispute: null,
    resultSubmission: {
      team1Submitted: true,
      team2Submitted: true,
      team1SubmittedScore: { team1Score, team2Score },
      team2SubmittedScore: { team1Score, team2Score },
      submittedAt: serverTimestamp(),
      forceSubmitted: true,
      forceSubmittedBy: 'admin'
    }
  });
  
  // If this is a tournament match, advance the winner to the next round
    if (matchData.tournamentId) {
    await advanceWinnerToNextRound(matchData.tournamentId, matchData.round, matchData.matchNumber, winnerId);
    
    // Check if this round is complete and if we should advance to the next round
    await checkAndAdvanceRound(matchData.tournamentId, matchData.round);
  }
};

// Firebase connection monitoring
let isFirebaseConnected = true;
let connectionRetryCount = 0;
const maxRetryCount = 5;

export const checkFirebaseConnection = async (): Promise<boolean> => {
  try {
    // Try a simple query to test connection
    const testQuery = query(collection(db, 'users'), limit(1));
    await getDocs(testQuery);
    isFirebaseConnected = true;
    connectionRetryCount = 0;
    return true;
  } catch (error) {
    console.warn('Firebase connection check failed:', error);
    isFirebaseConnected = false;
    connectionRetryCount++;
    
    if (connectionRetryCount <= maxRetryCount) {
      // Retry connection after a delay
      setTimeout(() => {
        checkFirebaseConnection();
      }, 1000 * connectionRetryCount);
    }
    
    return false;
  }
};

// Helper function to retry Firebase operations
const retryFirebaseOperation = async <T>(
  operation: () => Promise<T>, 
  maxRetries: number = 3, 
  delay: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Check connection before attempting operation
      if (!isFirebaseConnected) {
        await checkFirebaseConnection();
      }
      
      return await operation();
    } catch (error) {
      lastError = error as Error;
      console.warn(`Firebase operation failed (attempt ${attempt}/${maxRetries}):`, error);
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  }
  
  throw lastError!;
};

// New function to generate tournament brackets with proper match connections
export const generateTournamentBracket = async (tournamentId: string, teamIds: string[]): Promise<void> => {
  try {
    console.log('🚀 DEBUG: generateTournamentBracket called with:', { tournamentId, teamIds });
    
    if (teamIds.length < 2) {
      throw new Error('Need at least 2 teams to generate bracket');
    }

    // Validate team count for tournament brackets
    const validTeamSizes = [4, 8, 16, 32];
    if (!validTeamSizes.includes(teamIds.length)) {
      throw new Error(`Tournament brackets require 4, 8, 16, or 32 teams. Got ${teamIds.length} teams.`);
    }
    
    // Delete existing matches for this tournament
    const existingMatches = await getTournamentMatches(tournamentId);
    console.log('🔍 DEBUG: Deleting existing matches:', existingMatches.length);
    for (const match of existingMatches) {
      await deleteMatch(match.id);
    }
    
    // Shuffle teams for random seeding
    const shuffledTeams = [...teamIds].sort(() => Math.random() - 0.5);
    console.log('🔍 DEBUG: Shuffled teams:', shuffledTeams);
    
    const matches: Omit<Match, 'id'>[] = [];
    let matchNumber = 1;
    
    // Calculate total rounds needed
    const totalRounds = Math.ceil(Math.log2(shuffledTeams.length));
    console.log('🔍 DEBUG: Total rounds needed:', totalRounds);
    
    // Generate first round matches
    console.log('🔍 DEBUG: Generating first round matches...');
    for (let i = 0; i < shuffledTeams.length; i += 2) {
      if (i + 1 < shuffledTeams.length) {
        const match: Omit<Match, 'id'> = {
          team1Id: shuffledTeams[i],
          team2Id: shuffledTeams[i + 1],
          team1Score: 0,
          team2Score: 0,
          winnerId: null,
          round: 1,
          matchNumber: matchNumber++,
          isComplete: false,
          tournamentId,
          tournamentType: 'single-elim',
          createdAt: new Date(),
          matchState: 'ready_up',
          mapPool: ['Corrode', 'Ascent', 'Bind', 'Haven', 'Icebox', 'Lotus', 'Sunset'],
          bannedMaps: {
            team1: [],
            team2: []
          },
          team1Ready: false,
          team2Ready: false,
          team1MapBans: [],
          team2MapBans: []
        };
        matches.push(match);
        console.log(`🔍 DEBUG: Created round 1 match ${match.matchNumber}: ${match.team1Id} vs ${match.team2Id}`);
      }
    }
    
    // Generate subsequent rounds (semifinals, finals, etc.)
    console.log('🔍 DEBUG: Generating subsequent rounds...');
    for (let round = 2; round <= totalRounds; round++) {
      const matchesInRound = Math.pow(2, totalRounds - round);
      console.log(`🔍 DEBUG: Round ${round} will have ${matchesInRound} matches`);
      
      for (let match = 1; match <= matchesInRound; match++) {
        const newMatch: Omit<Match, 'id'> = {
          team1Id: null,
          team2Id: null,
          team1Score: 0,
          team2Score: 0,
          winnerId: null,
          round,
          matchNumber: matchNumber++,
          isComplete: false,
          tournamentId,
          tournamentType: 'single-elim',
          createdAt: new Date(),
          matchState: 'ready_up',
          mapPool: ['Corrode', 'Ascent', 'Bind', 'Haven', 'Icebox', 'Lotus', 'Sunset'],
          bannedMaps: {
            team1: [],
            team2: []
          },
          team1Ready: false,
          team2Ready: false,
          team1MapBans: [],
          team2MapBans: []
        };
        matches.push(newMatch);
        console.log(`🔍 DEBUG: Created round ${round} match ${newMatch.matchNumber}: TBD vs TBD`);
      }
    }
    
    console.log('🔍 DEBUG: Final matches array:', matches.map(m => ({
      round: m.round,
      matchNumber: m.matchNumber,
      team1Id: m.team1Id,
      team2Id: m.team2Id
    })));
    
    // Add all matches to Firebase
    console.log('🔍 DEBUG: Adding matches to Firebase...');
    for (const match of matches) {
      await addMatch(match);
    }
    
    console.log(`✅ DEBUG: Generated ${matches.length} matches for tournament ${tournamentId}`);
  } catch (error) {
    console.error('❌ DEBUG: Error generating tournament bracket:', error);
    throw error;
  }
};

// New function to complete all matches in the current round only
export const completeCurrentRound = async (tournamentId: string, round: number): Promise<void> => {
  try {
    console.log('🚀 DEBUG: completeCurrentRound called with:', { tournamentId, round });

    // Get all matches for this tournament
    const allMatches = await getTournamentMatches(tournamentId);
    console.log('🔍 DEBUG: All tournament matches:', allMatches.map(m => ({
      id: m.id,
      round: m.round,
      matchNumber: m.matchNumber,
      team1Id: m.team1Id,
      team2Id: m.team2Id,
      isComplete: m.isComplete,
      winnerId: m.winnerId
    })));

    // Only process matches that have both teams assigned and are not complete
    const currentRoundMatches = allMatches.filter(match => 
      match.round === round && 
      !match.isComplete && 
      match.team1Id && 
      match.team2Id &&
      match.team1Id !== '' &&
      match.team2Id !== '' &&
      match.team1Id !== null &&
      match.team2Id !== null
    );
    
    console.log(`🔍 DEBUG: Found ${currentRoundMatches.length} matches to process in round ${round}`);
    
    if (currentRoundMatches.length === 0) {
      console.log(`No incomplete matches with teams assigned found in round ${round} for tournament ${tournamentId}`);
      return;
    }
    
    let completedCount = 0;
    
    for (const match of currentRoundMatches) {
      console.log(`🔍 DEBUG: Processing match ${match.id}:`, {
        team1Id: match.team1Id,
        team2Id: match.team2Id,
        team1IdType: typeof match.team1Id,
        team2IdType: typeof match.team2Id
      });
      
      // Additional safety check
      if (!match.team1Id || !match.team2Id || match.team1Id === '' || match.team2Id === '' || match.team1Id === null || match.team2Id === null) {
        console.log(`⚠️ DEBUG: Skipping match ${match.id} - missing team IDs:`, {
          team1Id: match.team1Id,
          team2Id: match.team2Id
        });
        continue;
      }
      
      // Generate random 13-7 score (no draws)
      const team1Score = Math.random() > 0.5 ? 13 : 7;
      const team2Score = team1Score === 13 ? 7 : 13;
      const winnerId = team1Score > team2Score ? match.team1Id : match.team2Id;
      
      console.log(`🎲 DEBUG: Generated scores for match ${match.id}:`, {
        team1Score,
        team2Score,
        winnerId,
        winnerIdType: typeof winnerId
      });
      
      // Final safety check for winnerId
      if (!winnerId || winnerId === '' || winnerId === null || winnerId === undefined) {
        console.log(`⚠️ DEBUG: Skipping match ${match.id} - winnerId is invalid:`, winnerId);
        continue;
      }
      
      console.log(`🎯 DEBUG: Completing match ${match.id} with winner: ${winnerId}`);
      
      // Complete the match using the new logic
      await completeMatch(match.id, team1Score, team2Score, winnerId);
      completedCount++;
    }
    
    console.log(`✅ Completed ${completedCount} matches in round ${round} for tournament ${tournamentId}`);
  } catch (error) {
    console.error('Error completing current round:', error);
    throw error;
  }
};

// New function to advance winner to the next round based on bracket position - V2
export const advanceWinnerToNextRoundV2 = async (tournamentId: string, currentRound: number, currentMatchNumber: number, winnerId: string): Promise<void> => {
  try {
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    const tournamentDoc = await getDoc(tournamentRef);
    
    if (!tournamentDoc.exists()) {
      throw new Error('Tournament not found');
    }
    
    const tournament = tournamentDoc.data() as Tournament;
    const nextRound = currentRound + 1;
    const nextMatchNumber = Math.ceil(currentMatchNumber / 2);
    
    // Check if next match already exists
    const matchesQuery = query(
      collection(db, 'matches'),
      where('tournamentId', '==', tournamentId),
      where('round', '==', nextRound),
      where('matchNumber', '==', nextMatchNumber)
    );
    
    const nextMatchDocs = await getDocs(matchesQuery);
    
    if (!nextMatchDocs.empty) {
      // Update existing next match with winner
      const nextMatchDoc = nextMatchDocs.docs[0];
      const nextMatch = nextMatchDoc.data() as Match;
      
      // Determine which team slot to fill
      const isFirstSlot = currentMatchNumber % 2 === 1;
      
      await updateDoc(nextMatchDoc.ref, {
        [isFirstSlot ? 'team1Id' : 'team2Id']: winnerId,
        updatedAt: new Date()
      });
    } else {
      // Create new match for next round
      const newMatch: Partial<Match> = {
        team1Id: winnerId,
        team2Id: '', // Will be filled when other match completes
        team1Score: 0,
        team2Score: 0,
        isComplete: false,
        round: nextRound,
        matchNumber: nextMatchNumber,
        tournamentId,
        tournamentType: 'knockout-stage',
        bracketType: 'winners',
        matchState: 'scheduled',
        mapPool: tournament.format?.mapPool || [],
        bannedMaps: { team1: [], team2: [] },
        team1Ready: false,
        team2Ready: false,
        team1MapBans: [],
        team2MapBans: [],
        createdAt: new Date()
      };
      
      await addDoc(collection(db, 'matches'), newMatch);
    }
    
  } catch (error) {
    console.error('Error advancing winner to next round:', error);
    throw error;
  }
};

// Approve team for tournament
export const approveTeamForTournament = async (tournamentId: string, teamId: string): Promise<void> => {
  try {
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    const tournamentDoc = await getDoc(tournamentRef);
    
    if (!tournamentDoc.exists()) {
      throw new Error('Tournament not found');
    }
    
    const tournament = tournamentDoc.data() as Tournament;
    
    // Add team to approved teams array
    const approvedTeams = tournament.approvedTeams || [];
    if (!approvedTeams.includes(teamId)) {
      approvedTeams.push(teamId);
    }
    
    // Add team to tournament teams if not already there
    const tournamentTeams = tournament.teams || [];
    if (!tournamentTeams.includes(teamId)) {
      tournamentTeams.push(teamId);
    }
    
    await updateDoc(tournamentRef, {
      approvedTeams,
      teams: tournamentTeams,
      updatedAt: new Date()
    });
    
  } catch (error) {
    console.error('Error approving team for tournament:', error);
    throw error;
  }
};

// Reject team from tournament
export const rejectTeamFromTournament = async (tournamentId: string, teamId: string): Promise<void> => {
  const tournamentRef = doc(db, 'tournaments', tournamentId);
  const tournament = await getDoc(tournamentRef);
  
  if (!tournament.exists()) {
    throw new Error('Tournament not found');
  }
  
  const tournamentData = tournament.data();
  const approvedTeams = tournamentData.approvedTeams || [];
  const pendingTeams = tournamentData.pendingTeams || [];
  
  // Remove from approved teams if present
  const updatedApprovedTeams = approvedTeams.filter((id: string) => id !== teamId);
  
  // Add to pending teams if not already there
  const updatedPendingTeams = pendingTeams.includes(teamId) ? pendingTeams : [...pendingTeams, teamId];
  
  await updateDoc(tournamentRef, {
    approvedTeams: updatedApprovedTeams,
    pendingTeams: updatedPendingTeams
  });
};

export const updateTournamentStatus = async (tournamentId: string, status: string): Promise<void> => {
  const tournamentRef = doc(db, 'tournaments', tournamentId);
  await updateDoc(tournamentRef, {
    status: status
  });
};

export const startSingleElimination = async (tournamentId: string): Promise<void> => {
  try {
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    const tournamentDoc = await getDoc(tournamentRef);
    
    if (!tournamentDoc.exists()) {
      throw new Error('Tournament not found');
    }
    
    const tournament = tournamentDoc.data() as Tournament;
    const allTeams = tournament.teams || [];
    
    if (allTeams.length < 2) {
      throw new Error('Need at least 2 teams to start single elimination');
    }

    // Get the configured team count from tournament format
    const configuredTeamCount = tournament.format.teamCount;
    console.log(`🔍 DEBUG: Tournament configured for ${configuredTeamCount} teams, but ${allTeams.length} teams registered`);

    // Use the configured team count for bracket generation, not the actual registered teams
    // If more teams registered than configured, use the first N teams
    const teamsForBracket = allTeams.slice(0, configuredTeamCount);
    console.log(`🔍 DEBUG: Using first ${teamsForBracket.length} teams for bracket generation`);
    
    // Generate single elimination bracket
    await generateSingleEliminationBracket(tournamentId, teamsForBracket);
    
    // Update tournament status
    await updateDoc(tournamentRef, {
      status: 'in-progress',
      startedAt: new Date()
    });
    
  } catch (error) {
    console.error('Error starting single elimination:', error);
    throw error;
  }
};

export const startDoubleElimination = async (tournamentId: string): Promise<void> => {
  try {
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    const tournamentDoc = await getDoc(tournamentRef);
    
    if (!tournamentDoc.exists()) {
      throw new Error('Tournament not found');
    }
    
    const tournament = tournamentDoc.data() as Tournament;
    const allTeams = tournament.teams || [];
    
    if (allTeams.length < 2) {
      throw new Error('Need at least 2 teams to start double elimination');
    }

    // Get the configured team count from tournament format
    const configuredTeamCount = tournament.format.teamCount;
    console.log(`🔍 DEBUG: Tournament configured for ${configuredTeamCount} teams, but ${allTeams.length} teams registered`);

    // Use the configured team count for bracket generation, not the actual registered teams
    // If more teams registered than configured, use the first N teams
    const teamsForBracket = allTeams.slice(0, configuredTeamCount);
    console.log(`🔍 DEBUG: Using first ${teamsForBracket.length} teams for bracket generation`);
    
    // Generate double elimination bracket
    await generateDoubleEliminationBracket(tournamentId, teamsForBracket);
    
    // Update tournament status
    await updateDoc(tournamentRef, {
      status: 'in-progress',
      startedAt: new Date()
    });
    
  } catch (error) {
    console.error('Error starting double elimination:', error);
    throw error;
  }
};

// Send Discord notification to a specific user
export const sendDiscordNotificationToUser = async (userId: string, message: string): Promise<{ success: boolean; error?: string }> => {
  try {
    // Get user data to check if they have Discord linked
    const user = await getUserById(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    if (!user.discordId || !user.discordLinked) {
      return { success: false, error: 'User does not have Discord linked' };
    }

    // Call the Discord bot API instead of Discord directly
    const discordApiUrl = import.meta.env.VITE_DISCORD_API_URL || 'http://localhost:3001';
    const response = await fetch(`${discordApiUrl}/api/send-discord-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userIds: [user.discordId],
        title: 'Tournament Notification',
        message: message,
        type: 'info'
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, error: errorData.error || 'Failed to send notification' };
    }

    const result = await response.json();
    return { success: result.success };
  } catch (error) {
    console.error('Error sending Discord notification:', error);
    return { success: false, error: 'Failed to send notification' };
  }
};

// Get all users with Discord linked
export const getUsersWithDiscord = async (): Promise<User[]> => {
  try {
    const users = await getAllUsers();
    return users.filter(user => user.discordLinked && user.discordId);
  } catch (error) {
    console.error('Error getting users with Discord:', error);
    return [];
  }
};

// Get user by ID
export const getUserById = async (userId: string): Promise<User | null> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return null;
    }
    
    return {
      id: userDoc.id,
      ...userDoc.data()
    } as User;
  } catch (error) {
    console.error('Error getting user by ID:', error);
    return null;
  }
};

// --- Discord Account Management ---
export const unlinkDiscordAccount = async (userId: string): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);
    
    // Update user document to remove Discord information
    await updateDoc(userRef, {
      discordId: null,
      discordUsername: null,
      discordAvatar: null,
      discordLinked: false,
      inDiscordServer: false
    });
    
    console.log(`Discord account unlinked for user: ${userId}`);
  } catch (error) {
    console.error('Error unlinking Discord account:', error);
    throw new Error('Failed to unlink Discord account');
  }
};

// --- Double Elimination Bracket Generator ---
export const generateDoubleEliminationBracket = async (tournamentId: string, teamIds: string[]): Promise<void> => {
  if (!teamIds || teamIds.length < 2) throw new Error('At least 2 teams required');

  // Validate team count for double elimination
  const validTeamSizes = [4, 8, 16, 32];
  if (!validTeamSizes.includes(teamIds.length)) {
    throw new Error(`Double elimination requires 4, 8, 16, or 32 teams. Got ${teamIds.length} teams.`);
  }

  console.log(`🔍 DEBUG: Generating double elimination bracket for ${teamIds.length} teams`);

  // Shuffle teams for random seeding
  const shuffled = [...teamIds].sort(() => Math.random() - 0.5);
  const matches: Omit<Match, 'id'>[] = [];
  let matchNumber = 1;

  // Calculate rounds needed
  const totalRounds = Math.ceil(Math.log2(teamIds.length));
  console.log(`🔍 DEBUG: Total rounds needed: ${totalRounds}`);

  // Generate Winners Bracket
  console.log('🔍 DEBUG: Generating winners bracket...');
  
  // Winners Round 1
  for (let i = 0; i < shuffled.length; i += 2) {
    matches.push({
      team1Id: shuffled[i],
      team2Id: shuffled[i + 1] || null,
      team1Score: 0,
      team2Score: 0,
      winnerId: null,
      isComplete: false,
      round: 1,
      matchNumber: matchNumber++,
      tournamentId,
      tournamentType: 'double-elim',
      bracketType: 'winners',
      matchState: 'ready_up',
      mapPool: ['Corrode', 'Ascent', 'Bind', 'Haven', 'Icebox', 'Lotus', 'Sunset'],
      bannedMaps: { team1: [], team2: [] },
      team1Ready: false,
      team2Ready: false,
      team1MapBans: [],
      team2MapBans: [],
      createdAt: new Date()
    });
  }

  // Generate subsequent winners rounds
  for (let round = 2; round <= totalRounds; round++) {
    const matchesInRound = Math.pow(2, totalRounds - round);
    for (let match = 1; match <= matchesInRound; match++) {
      matches.push({
        team1Id: null,
        team2Id: null,
        team1Score: 0,
        team2Score: 0,
        winnerId: null,
        isComplete: false,
        round,
        matchNumber: matchNumber++,
        tournamentId,
        tournamentType: 'double-elim',
        bracketType: 'winners',
        matchState: 'ready_up',
        mapPool: ['Corrode', 'Ascent', 'Bind', 'Haven', 'Icebox', 'Lotus', 'Sunset'],
        bannedMaps: { team1: [], team2: [] },
        team1Ready: false,
        team2Ready: false,
        team1MapBans: [],
        team2MapBans: [],
        createdAt: new Date()
      });
    }
  }

  // Generate Losers Bracket
  console.log('🔍 DEBUG: Generating losers bracket...');
  
  // Losers bracket has more rounds than winners bracket
  const losersRounds = totalRounds * 2 - 1;
  
  for (let round = 1; round <= losersRounds; round++) {
    // Calculate matches in this losers round
    let matchesInRound: number;
    
    if (round === 1) {
      // First losers round: half the teams (losers from winners round 1)
      matchesInRound = Math.floor(teamIds.length / 2);
    } else if (round === 2) {
      // Second losers round: quarter of teams (winners from losers round 1 + losers from winners round 2)
      matchesInRound = Math.floor(teamIds.length / 2);
    } else {
      // Subsequent rounds: half of previous round
      matchesInRound = Math.max(1, Math.floor(teamIds.length / Math.pow(2, round)));
    }
    
    for (let match = 1; match <= matchesInRound; match++) {
      matches.push({
        team1Id: null,
        team2Id: null,
        team1Score: 0,
        team2Score: 0,
        winnerId: null,
        isComplete: false,
        round,
        matchNumber: matchNumber++,
        tournamentId,
        tournamentType: 'double-elim',
        bracketType: 'losers',
        matchState: 'ready_up',
        mapPool: ['Corrode', 'Ascent', 'Bind', 'Haven', 'Icebox', 'Lotus', 'Sunset'],
        bannedMaps: { team1: [], team2: [] },
        team1Ready: false,
        team2Ready: false,
        team1MapBans: [],
        team2MapBans: [],
        createdAt: new Date()
      });
    }
  }

  // Generate Grand Finals (winners bracket finalist vs losers bracket finalist)
  console.log('🔍 DEBUG: Generating grand finals...');
  matches.push({
    team1Id: null, // Winners bracket finalist
    team2Id: null, // Losers bracket finalist
    team1Score: 0,
    team2Score: 0,
    winnerId: null,
    isComplete: false,
    round: totalRounds + 1,
    matchNumber: matchNumber++,
    tournamentId,
    tournamentType: 'double-elim',
    bracketType: 'grand_final',
    matchState: 'ready_up',
    mapPool: ['Corrode', 'Ascent', 'Bind', 'Haven', 'Icebox', 'Lotus', 'Sunset'],
    bannedMaps: { team1: [], team2: [] },
    team1Ready: false,
    team2Ready: false,
    team1MapBans: [],
    team2MapBans: [],
    createdAt: new Date()
  });

  // If needed, generate a second grand final match (if losers bracket finalist wins first match)
  if (teamIds.length >= 8) {
    matches.push({
      team1Id: null, // Winners bracket finalist
      team2Id: null, // Losers bracket finalist (if they won the first grand final)
      team1Score: 0,
      team2Score: 0,
      winnerId: null,
      isComplete: false,
      round: totalRounds + 1,
      matchNumber: matchNumber++,
      tournamentId,
      tournamentType: 'double-elim',
      bracketType: 'grand_final',
      matchState: 'ready_up',
      mapPool: ['Corrode', 'Ascent', 'Bind', 'Haven', 'Icebox', 'Lotus', 'Sunset'],
      bannedMaps: { team1: [], team2: [] },
      team1Ready: false,
      team2Ready: false,
      team1MapBans: [],
      team2MapBans: [],
      createdAt: new Date()
    });
  }

  console.log(`🔍 DEBUG: Generated ${matches.length} matches for double elimination bracket`);
  console.log(`🔍 DEBUG: Winners bracket: ${matches.filter(m => m.bracketType === 'winners').length} matches`);
  console.log(`🔍 DEBUG: Losers bracket: ${matches.filter(m => m.bracketType === 'losers').length} matches`);
  console.log(`🔍 DEBUG: Grand finals: ${matches.filter(m => m.bracketType === 'grand_final').length} matches`);

  // Add all matches to Firebase
  for (const match of matches) {
    await addMatch(match);
  }

  console.log(`✅ DEBUG: Double elimination bracket generated successfully for tournament ${tournamentId}`);
};

// --- Team Revert Functions ---

// Revert team registration from tournament
export const revertTeamRegistration = async (tournamentId: string, teamId: string): Promise<void> => {
  try {
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    const tournamentDoc = await getDoc(tournamentRef);
    
    if (!tournamentDoc.exists()) {
      throw new Error('Tournament not found');
    }
    
    const tournamentData = tournamentDoc.data();
    const teams = tournamentData.teams || [];
    const approvedTeams = tournamentData.approvedTeams || [];
    const pendingTeams = tournamentData.pendingTeams || [];
    const rejectedTeams = tournamentData.rejectedTeams || [];
    
    // Remove from all arrays
    const updatedTeams = teams.filter((id: string) => id !== teamId);
    const updatedApprovedTeams = approvedTeams.filter((id: string) => id !== teamId);
    const updatedPendingTeams = pendingTeams.filter((id: string) => id !== teamId);
    const updatedRejectedTeams = rejectedTeams.filter((id: string) => id !== teamId);
    
    // Update tournament
    await updateDoc(tournamentRef, {
      teams: updatedTeams,
      approvedTeams: updatedApprovedTeams,
      pendingTeams: updatedPendingTeams,
      rejectedTeams: updatedRejectedTeams,
      updatedAt: new Date()
    });
    
    // Update team registration status
    const teamRef = doc(db, 'teams', teamId);
    await updateDoc(teamRef, {
      registeredForTournament: false,
      tournamentRegistrationDate: null
    });
    
    console.log(`Reverted team ${teamId} registration from tournament ${tournamentId}`);
  } catch (error) {
    console.error('Error reverting team registration:', error);
    throw error;
  }
};

// Revert team approval (move back to pending)
export const revertTeamApproval = async (tournamentId: string, teamId: string): Promise<void> => {
  try {
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    const tournamentDoc = await getDoc(tournamentRef);
    
    if (!tournamentDoc.exists()) {
      throw new Error('Tournament not found');
    }
    
    const tournamentData = tournamentDoc.data();
    const approvedTeams = tournamentData.approvedTeams || [];
    const pendingTeams = tournamentData.pendingTeams || [];
    
    // Remove from approved teams
    const updatedApprovedTeams = approvedTeams.filter((id: string) => id !== teamId);
    
    // Add to pending teams if not already there
    const updatedPendingTeams = pendingTeams.includes(teamId) ? pendingTeams : [...pendingTeams, teamId];
    
    await updateDoc(tournamentRef, {
      approvedTeams: updatedApprovedTeams,
      pendingTeams: updatedPendingTeams,
      updatedAt: new Date()
    });
    
    console.log(`Reverted team ${teamId} approval for tournament ${tournamentId}`);
  } catch (error) {
    console.error('Error reverting team approval:', error);
    throw error;
  }
};

// Revert team rejection (move back to pending)
export const revertTeamRejection = async (tournamentId: string, teamId: string): Promise<void> => {
  try {
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    const tournamentDoc = await getDoc(tournamentRef);
    
    if (!tournamentDoc.exists()) {
      throw new Error('Tournament not found');
    }
    
    const tournamentData = tournamentDoc.data();
    const rejectedTeams = tournamentData.rejectedTeams || [];
    const pendingTeams = tournamentData.pendingTeams || [];
    
    // Remove from rejected teams
    const updatedRejectedTeams = rejectedTeams.filter((id: string) => id !== teamId);
    
    // Add to pending teams if not already there
    const updatedPendingTeams = pendingTeams.includes(teamId) ? pendingTeams : [...pendingTeams, teamId];
    
    await updateDoc(tournamentRef, {
      rejectedTeams: updatedRejectedTeams,
      pendingTeams: updatedPendingTeams,
      updatedAt: new Date()
    });
    
    console.log(`Reverted team ${teamId} rejection for tournament ${tournamentId}`);
  } catch (error) {
    console.error('Error reverting team rejection:', error);
    throw error;
  }
};

// Get team status in tournament
export const getTeamTournamentStatus = async (tournamentId: string, teamId: string): Promise<'registered' | 'approved' | 'pending' | 'rejected' | 'not-registered'> => {
  try {
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    const tournamentDoc = await getDoc(tournamentRef);
    
    if (!tournamentDoc.exists()) {
      throw new Error('Tournament not found');
    }
    
    const tournamentData = tournamentDoc.data();
    const teams = tournamentData.teams || [];
    const approvedTeams = tournamentData.approvedTeams || [];
    const pendingTeams = tournamentData.pendingTeams || [];
    const rejectedTeams = tournamentData.rejectedTeams || [];
    
    if (!teams.includes(teamId)) {
      return 'not-registered';
    }
    
    if (approvedTeams.includes(teamId)) {
      return 'approved';
    }
    
    if (rejectedTeams.includes(teamId)) {
      return 'rejected';
    }
    
    if (pendingTeams.includes(teamId)) {
      return 'pending';
    }
    
    return 'registered';
  } catch (error) {
    console.error('Error getting team tournament status:', error);
    throw error;
  }
};

// --- Bracket Revert Functions ---

// Revert a match result and reset the match
export const revertMatchResult = async (matchId: string): Promise<void> => {
  try {
    const matchRef = doc(db, 'matches', matchId);
    const matchDoc = await getDoc(matchRef);
    
    if (!matchDoc.exists()) {
      throw new Error('Match not found');
    }
    
    const matchData = matchDoc.data();
    
    // Reset match to ready_up state
    await updateDoc(matchRef, {
      team1Score: 0,
      team2Score: 0,
      winnerId: null,
      isComplete: false,
      matchState: 'ready_up',
      team1Ready: false,
      team2Ready: false,
      team1MapBans: [],
      team2MapBans: [],
      team1MapPick: null,
      team2MapPick: null,
      selectedMap: null,
      bannedMaps: { team1: [], team2: [] },
      sideSelection: {},
      disputeRequested: false,
      disputeReason: null,
      adminAssigned: null,
      adminResolution: null,
      resolvedAt: null
    });
    
    console.log(`Reverted match ${matchId} result`);
  } catch (error) {
    console.error('Error reverting match result:', error);
    throw error;
  }
};

// Revert a team's advancement to the next round
export const revertTeamAdvancement = async (matchId: string, teamId: string): Promise<void> => {
  try {
    const matchRef = doc(db, 'matches', matchId);
    const matchDoc = await getDoc(matchRef);
    
    if (!matchDoc.exists()) {
      throw new Error('Match not found');
    }
    
    const matchData = matchDoc.data();
    
    // Find the next match this team was advanced to
    const nextMatchId = matchData.nextMatchId;
    if (!nextMatchId) {
      throw new Error('No next match found for this match');
    }
    
    const nextMatchRef = doc(db, 'matches', nextMatchId);
    const nextMatchDoc = await getDoc(nextMatchRef);
    
    if (!nextMatchDoc.exists()) {
      throw new Error('Next match not found');
    }
    
    const nextMatchData = nextMatchDoc.data();
    
    // Remove the team from the next match
    let updatedTeam1Id = nextMatchData.team1Id;
    let updatedTeam2Id = nextMatchData.team2Id;
    
    if (nextMatchData.team1Id === teamId) {
      updatedTeam1Id = null;
    } else if (nextMatchData.team2Id === teamId) {
      updatedTeam2Id = null;
    }
    
    // Reset the next match if both teams are removed
    if (!updatedTeam1Id && !updatedTeam2Id) {
      await updateDoc(nextMatchRef, {
        team1Id: null,
        team2Id: null,
        team1Score: 0,
        team2Score: 0,
        winnerId: null,
        isComplete: false,
        matchState: 'waiting_for_teams',
        team1Ready: false,
        team2Ready: false
      });
    } else {
      await updateDoc(nextMatchRef, {
        team1Id: updatedTeam1Id,
        team2Id: updatedTeam2Id,
        team1Score: 0,
        team2Score: 0,
        winnerId: null,
        isComplete: false,
        matchState: 'ready_up',
        team1Ready: false,
        team2Ready: false
      });
    }
    
    console.log(`Reverted team ${teamId} advancement from match ${matchId} to ${nextMatchId}`);
  } catch (error) {
    console.error('Error reverting team advancement:', error);
    throw error;
  }
};

// Revert an entire round (reset all matches in a round)
export const revertRound = async (tournamentId: string, round: number): Promise<void> => {
  try {
    // Get all matches for the tournament
    const matches = await getMatches();
    const tournamentMatches = matches.filter(match => match.tournamentId === tournamentId);
    
    // Find matches in the specified round
    const roundMatches = tournamentMatches.filter(match => match.round === round);
    
    if (roundMatches.length === 0) {
      throw new Error(`No matches found for round ${round}`);
    }
    
    // Get all teams that advanced from this round
    const advancedTeams: string[] = [];
    const matchToNextMatchMap: { [matchId: string]: string } = {};
    
    roundMatches.forEach(match => {
      if (match.winnerId) {
        advancedTeams.push(match.winnerId);
      }
      if (match.nextMatchId) {
        matchToNextMatchMap[match.id] = match.nextMatchId;
      }
    });
    
    console.log(`Teams that advanced from round ${round}:`, advancedTeams);
    console.log(`Match to next match mapping:`, matchToNextMatchMap);
    
    // Reset all matches in the round
    const resetPromises = roundMatches.map(match => 
      updateDoc(doc(db, 'matches', match.id), {
        team1Score: 0,
        team2Score: 0,
        winnerId: null,
        isComplete: false,
        matchState: 'ready_up',
        team1Ready: false,
        team2Ready: false,
        team1MapBans: [],
        team2MapBans: [],
        team1MapPick: null,
        team2MapPick: null,
        selectedMap: null,
        bannedMaps: { team1: [], team2: [] },
        sideSelection: {},
        disputeRequested: false,
        disputeReason: null,
        adminAssigned: null,
        adminResolution: null,
        resolvedAt: null
      })
    );
    
    await Promise.all(resetPromises);
    
    // Remove advanced teams from all subsequent rounds
    const subsequentMatches = tournamentMatches.filter(match => match.round > round);
    const subsequentUpdatePromises = subsequentMatches.map(match => {
      let updatedTeam1Id = match.team1Id;
      let updatedTeam2Id = match.team2Id;
      let needsUpdate = false;
      
      // Remove team1 if it was advanced from the reverted round
      if (match.team1Id && advancedTeams.includes(match.team1Id)) {
        updatedTeam1Id = null;
        needsUpdate = true;
      }
      
      // Remove team2 if it was advanced from the reverted round
      if (match.team2Id && advancedTeams.includes(match.team2Id)) {
        updatedTeam2Id = null;
        needsUpdate = true;
      }
      
      if (!needsUpdate) {
        return Promise.resolve(); // No update needed
      }
      
      // If both teams are removed, reset the match completely
      if (!updatedTeam1Id && !updatedTeam2Id) {
        return updateDoc(doc(db, 'matches', match.id), {
          team1Id: null,
          team2Id: null,
          team1Score: 0,
          team2Score: 0,
          winnerId: null,
          isComplete: false,
          matchState: 'waiting_for_teams',
          team1Ready: false,
          team2Ready: false,
          team1MapBans: [],
          team2MapBans: [],
          team1MapPick: null,
          team2MapPick: null,
          selectedMap: null,
          bannedMaps: { team1: [], team2: [] },
          sideSelection: {},
          disputeRequested: false,
          disputeReason: null,
          adminAssigned: null,
          adminResolution: null,
          resolvedAt: null
        });
      } else {
        // Update with remaining teams
        return updateDoc(doc(db, 'matches', match.id), {
          team1Id: updatedTeam1Id,
          team2Id: updatedTeam2Id,
          team1Score: 0,
          team2Score: 0,
          winnerId: null,
          isComplete: false,
          matchState: updatedTeam1Id && updatedTeam2Id ? 'ready_up' : 'waiting_for_teams',
          team1Ready: false,
          team2Ready: false,
          team1MapBans: [],
          team2MapBans: [],
          team1MapPick: null,
          team2MapPick: null,
          selectedMap: null,
          bannedMaps: { team1: [], team2: [] },
          sideSelection: {},
          disputeRequested: false,
          disputeReason: null,
          adminAssigned: null,
          adminResolution: null,
          resolvedAt: null
        });
      }
    });
    
    // Filter out empty promises and execute updates
    const validUpdates = subsequentUpdatePromises.filter(promise => promise !== Promise.resolve());
    await Promise.all(validUpdates);
    
    console.log(`Reverted round ${round} and removed ${advancedTeams.length} teams from subsequent rounds for tournament ${tournamentId}`);
  } catch (error) {
    console.error('Error reverting round:', error);
    throw error;
  }
};

// Get match progression info (which teams advanced from this match)
export const getMatchProgressionInfo = async (matchId: string): Promise<{
  currentMatch: Match;
  nextMatch: Match | null;
  advancedTeam: string | null;
}> => {
  try {
    const match = await getMatch(matchId);
    if (!match) {
      throw new Error('Match not found');
    }
    
    let nextMatch: Match | null = null;
    if (match.nextMatchId) {
      nextMatch = await getMatch(match.nextMatchId);
    }
    
    return {
      currentMatch: match,
      nextMatch,
      advancedTeam: match.winnerId || null
    };
  } catch (error) {
    console.error('Error getting match progression info:', error);
    throw error;
  }
};

// Comprehensive revert function that handles bracket progression
export const revertRoundComprehensive = async (tournamentId: string, round: number): Promise<void> => {
  try {
    // Get all matches for the tournament
    const matches = await getMatches();
    const tournamentMatches = matches.filter(match => match.tournamentId === tournamentId);
    
    // Find matches in the specified round
    const roundMatches = tournamentMatches.filter(match => match.round === round);
    
    if (roundMatches.length === 0) {
      throw new Error(`No matches found for round ${round}`);
    }
    
    // Step 1: Collect all teams that advanced from this round
    const advancedTeams: string[] = [];
    roundMatches.forEach(match => {
      if (match.winnerId) {
        advancedTeams.push(match.winnerId);
      }
    });
    
    console.log(`Teams that advanced from round ${round}:`, advancedTeams);
    
    // Step 2: Reset all matches in the current round
    const resetPromises = roundMatches.map(match => 
      updateDoc(doc(db, 'matches', match.id), {
        team1Score: 0,
        team2Score: 0,
        winnerId: null,
        isComplete: false,
        matchState: 'ready_up',
        team1Ready: false,
        team2Ready: false,
        team1MapBans: [],
        team2MapBans: [],
        team1MapPick: null,
        team2MapPick: null,
        selectedMap: null,
        bannedMaps: { team1: [], team2: [] },
        sideSelection: {},
        disputeRequested: false,
        disputeReason: null,
        adminAssigned: null,
        adminResolution: null,
        resolvedAt: null
      })
    );
    
    await Promise.all(resetPromises);
    
    // Step 3: Remove advanced teams from ALL subsequent rounds recursively
    const removeTeamsFromSubsequentRounds = async (teamsToRemove: string[], startRound: number) => {
      const subsequentMatches = tournamentMatches.filter(match => match.round > startRound);
      
      for (const match of subsequentMatches) {
        let updatedTeam1Id = match.team1Id;
        let updatedTeam2Id = match.team2Id;
        let needsUpdate = false;
        
        // Check if either team should be removed
        if (match.team1Id && teamsToRemove.includes(match.team1Id)) {
          updatedTeam1Id = null;
          needsUpdate = true;
        }
        
        if (match.team2Id && teamsToRemove.includes(match.team2Id)) {
          updatedTeam2Id = null;
          needsUpdate = true;
        }
        
        if (needsUpdate) {
          // If both teams are removed, reset the match completely
          if (!updatedTeam1Id && !updatedTeam2Id) {
            await updateDoc(doc(db, 'matches', match.id), {
              team1Id: null,
              team2Id: null,
              team1Score: 0,
              team2Score: 0,
              winnerId: null,
              isComplete: false,
              matchState: 'waiting_for_teams',
              team1Ready: false,
              team2Ready: false,
              team1MapBans: [],
              team2MapBans: [],
              team1MapPick: null,
              team2MapPick: null,
              selectedMap: null,
              bannedMaps: { team1: [], team2: [] },
              sideSelection: {},
              disputeRequested: false,
              disputeReason: null,
              adminAssigned: null,
              adminResolution: null,
              resolvedAt: null
            });
          } else {
            // Update with remaining teams
            await updateDoc(doc(db, 'matches', match.id), {
              team1Id: updatedTeam1Id,
              team2Id: updatedTeam2Id,
              team1Score: 0,
              team2Score: 0,
              winnerId: null,
              isComplete: false,
              matchState: updatedTeam1Id && updatedTeam2Id ? 'ready_up' : 'waiting_for_teams',
              team1Ready: false,
              team2Ready: false,
              team1MapBans: [],
              team2MapBans: [],
              team1MapPick: null,
              team2MapPick: null,
              selectedMap: null,
              bannedMaps: { team1: [], team2: [] },
              sideSelection: {},
              disputeRequested: false,
              disputeReason: null,
              adminAssigned: null,
              adminResolution: null,
              resolvedAt: null
            });
          }
        }
      }
    };
    
    // Execute the recursive removal
    await removeTeamsFromSubsequentRounds(advancedTeams, round);
    
    console.log(`Comprehensive revert completed for round ${round}. Removed ${advancedTeams.length} teams from all subsequent rounds.`);
  } catch (error) {
    console.error('Error in comprehensive round revert:', error);
    throw error;
  }
};

// Debug function to show bracket state
export const debugBracketState = async (tournamentId: string): Promise<void> => {
  try {
    const matches = await getMatches();
    const tournamentMatches = matches.filter(match => match.tournamentId === tournamentId);
    
    console.log('=== BRACKET DEBUG STATE ===');
    console.log(`Tournament ID: ${tournamentId}`);
    console.log(`Total matches: ${tournamentMatches.length}`);
    
    const rounds = new Map<number, Match[]>();
    tournamentMatches.forEach(match => {
      if (!rounds.has(match.round)) {
        rounds.set(match.round, []);
      }
      rounds.get(match.round)!.push(match);
    });
    
    rounds.forEach((roundMatches, roundNumber) => {
      console.log(`\n--- Round ${roundNumber} ---`);
      roundMatches.forEach(match => {
        console.log(`Match ${match.matchNumber}: ${match.team1Id || 'TBD'} vs ${match.team2Id || 'TBD'} | Winner: ${match.winnerId || 'None'} | State: ${match.matchState} | Complete: ${match.isComplete}`);
      });
    });
    
    console.log('=== END BRACKET DEBUG ===');
  } catch (error) {
    console.error('Error debugging bracket state:', error);
  }
};

// Admin Logging Functions
export interface AdminLog {
  id?: string;
  type: 'signup' | 'general' | 'tournament' | 'match' | 'team' | 'user';
  action: string;
  details: string;
  userId?: string;
  username?: string;
  timestamp: Date;
  adminId?: string;
  adminUsername?: string;
  metadata?: Record<string, any>;
}

export const createAdminLog = async (log: Omit<AdminLog, 'id' | 'timestamp'>): Promise<string> => {
  // Filter out undefined values to prevent Firebase errors
  const filteredLog = Object.fromEntries(
    Object.entries(log).filter(([_, value]) => value !== undefined)
  );
  
  const docRef = await addDoc(collection(db, 'adminLogs'), {
    ...filteredLog,
    timestamp: serverTimestamp()
  });
  return docRef.id;
};

export const getAdminLogs = async (type?: string, limitCount: number = 100): Promise<AdminLog[]> => {
  console.log('🔍 DEBUG: getAdminLogs called with:', { type, limitCount });
  
  let q = query(collection(db, 'adminLogs'), orderBy('timestamp', 'desc'), limit(limitCount));
  
  if (type) {
    q = query(collection(db, 'adminLogs'), where('type', '==', type), orderBy('timestamp', 'desc'), limit(limitCount));
  }
  
  console.log('🔍 DEBUG: Executing query for adminLogs...');
  const querySnapshot = await getDocs(q);
  console.log('🔍 DEBUG: Query result size:', querySnapshot.size);
  
  const logs = querySnapshot.docs.map(doc => {
    const data = doc.data();
    console.log('🔍 DEBUG: Log data:', { id: doc.id, type: data.type, action: data.action });
    return {
      id: doc.id,
      type: data.type,
      action: data.action,
      details: data.details,
      userId: data.userId,
      username: data.username,
      timestamp: data.timestamp?.toDate() || new Date(),
      adminId: data.adminId,
      adminUsername: data.adminUsername,
      metadata: data.metadata || {}
    };
  }) as AdminLog[];
  
  console.log('🔍 DEBUG: Processed logs:', logs.length);
  return logs;
};

export const getSignupLogs = async (limitCount: number = 100): Promise<AdminLog[]> => {
  return getAdminLogs('signup', limitCount);
};

export const getGeneralLogs = async (limitCount: number = 100): Promise<AdminLog[]> => {
  return getAdminLogs('general', limitCount);
};

// Enhanced user registration with logging
export const createUserWithLogging = async (userData: Omit<User, 'id' | 'createdAt'>, adminId?: string, adminUsername?: string): Promise<string> => {
  try {
    // Create the user
    const docRef = await addDoc(collection(db, 'users'), {
      ...userData,
      createdAt: Timestamp.now()
    });
    
    // Log the signup
    await createAdminLog({
      type: 'signup',
      action: 'user_registered',
      details: `New user registered: ${userData.username} (${userData.email})`,
      userId: docRef.id,
      username: userData.username,
      adminId,
      adminUsername,
      metadata: {
        email: userData.email,
        riotId: userData.riotId,
        discordLinked: userData.discordLinked || false
      }
    });
    
    return docRef.id;
  } catch (error) {
    // Log the error
    await createAdminLog({
      type: 'signup',
      action: 'user_registration_failed',
      details: `Failed to register user: ${userData.username} - ${error instanceof Error ? error.message : String(error)}`,
      adminId,
      adminUsername,
      metadata: {
        email: userData.email,
        error: error instanceof Error ? error.message : String(error)
      }
    });
    throw error;
  }
};

// Enhanced team creation with logging
export const createTeamWithLogging = async (teamData: Omit<Team, 'id'>, adminId?: string, adminUsername?: string): Promise<string> => {
  try {
    const teamId = await addTeam(teamData);
    
    // Log the team creation
    await createAdminLog({
      type: 'team',
      action: 'team_created',
      details: `Team created: ${teamData.name} by ${teamData.captainId}`,
      userId: teamData.captainId,
      adminId,
      adminUsername,
      metadata: {
        teamName: teamData.name,
        teamTag: teamData.teamTag,
        memberCount: teamData.members?.length || 0
      }
    });
    
    return teamId;
  } catch (error) {
    await createAdminLog({
      type: 'team',
      action: 'team_creation_failed',
      details: `Failed to create team: ${teamData.name} - ${error instanceof Error ? error.message : String(error)}`,
      adminId,
      adminUsername,
      metadata: {
        teamName: teamData.name,
        error: error instanceof Error ? error.message : String(error)
      }
    });
    throw error;
  }
};

// Enhanced tournament creation with logging
export const createTournamentWithLogging = async (tournamentData: Omit<Tournament, 'id' | 'teams' | 'status' | 'createdAt'>, adminId?: string, adminUsername?: string): Promise<string> => {
  try {
    const tournamentId = await createTournament(tournamentData);
    
    // Log the tournament creation
    await createAdminLog({
      type: 'tournament',
      action: 'tournament_created',
      details: `Tournament created: ${tournamentData.name}`,
      adminId,
      adminUsername,
      metadata: {
        tournamentName: tournamentData.name,
        format: tournamentData.format,
        prizePool: tournamentData.prizePool
      }
    });
    
    return tournamentId;
  } catch (error) {
    await createAdminLog({
      type: 'tournament',
      action: 'tournament_creation_failed',
      details: `Failed to create tournament: ${tournamentData.name} - ${error instanceof Error ? error.message : String(error)}`,
      adminId,
      adminUsername,
      metadata: {
        tournamentName: tournamentData.name,
        error: error instanceof Error ? error.message : String(error)
      }
    });
    throw error;
  }
};

// General admin action logging
export const logAdminAction = async (
  action: string,
  details: string,
  adminId?: string,
  adminUsername?: string,
  metadata?: Record<string, any>,
  type: 'signup' | 'general' | 'tournament' | 'match' | 'team' | 'user' = 'general'
): Promise<void> => {
  await createAdminLog({
    type,
    action,
    details,
    adminId,
    adminUsername,
    metadata
  });
}

/**
 * Real-time listener for user matches
 * 
 * This function sets up a real-time listener that monitors for active matches
 * for a given user. It correctly handles subscription management to prevent memory leaks
 * and expands the definition of an "active" match to ensure the user is always
 * aware of matches that require their attention.
 * 
 * It listens for changes in the user's teams and then sets up a listener for matches
 * involving those teams.
 *
 * @param userId - The user ID to monitor matches for.
 * @param callback - Function called whenever the user's active matches change.
 * @returns An unsubscribe function to clean up all listeners.
 */
export const onUserMatchesChange = (userId: string, callback: (matches: Match[]) => void) => {
  if (!userId) {
    console.warn('onUserMatchesChange called with undefined or empty userId');
    callback([]);
    return () => {}; // Return a no-op unsubscribe function
  }

  let unsubscribeMatches: (() => void) | null = null;

  // 1. Listen for changes to the user's teams
  const teamsQuery = query(collection(db, 'teams'));

  const unsubscribeTeams = onSnapshot(teamsQuery, (teamsSnapshot) => {
    try {
      // Unsubscribe from any previous matches listener to prevent leaks
      if (unsubscribeMatches) {
        unsubscribeMatches();
        unsubscribeMatches = null;
      }

      const userTeamIds = teamsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Team))
        .filter(team => team.members?.some(member => member.userId === userId))
        .map(team => team.id);

      if (userTeamIds.length === 0) {
        callback([]); // User is not in any teams, so no active matches
        return;
      }
      
      // 2. Listen for matches involving the user's teams
      const activeMatchStates = [
        'scheduled',
        'ready_up', 
        'map_banning', 
        'side_selection_map1', 
        'side_selection_map2', 
        'side_selection_decider', 
        'playing', 
        'waiting_for_results',
        'disputed'
      ];

      const matchesQuery = query(
        collection(db, 'matches'),
        where('matchState', 'in', activeMatchStates)
      );

      unsubscribeMatches = onSnapshot(matchesQuery, (matchesSnapshot) => {
        const allActiveMatches = matchesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date()
        } as unknown as Match));

        // Filter for matches that involve one of the user's teams
        const userMatches = allActiveMatches.filter(match => 
          (match.team1Id && userTeamIds.includes(match.team1Id)) || 
          (match.team2Id && userTeamIds.includes(match.team2Id))
        );

        callback(userMatches);
      }, (error) => {
        console.error("Error on matches snapshot listener:", error);
        callback([]);
      });

    } catch (error) {
      console.error('Error in onUserMatchesChange listener:', error);
      callback([]);
    }
  });

  // Return a single unsubscribe function that cleans up both listeners
  return () => {
    unsubscribeTeams();
    if (unsubscribeMatches) {
      unsubscribeMatches();
    }
  };
};

// Log a general user action
export const logUserAction = async (
  action: string,
  details: string,
  userId?: string,
  username?: string,
  metadata?: Record<string, any>
): Promise<void> => {
  await createAdminLog({
    type: 'user',
    action,
    details,
    userId,
    username,
    metadata
  });
};

// Get pending invitations sent by a specific team
export const getTeamPendingInvitations = async (teamId: string): Promise<TeamInvitation[]> => {
  const querySnapshot = await getDocs(
    query(
      collection(db, 'teamInvitations'),
      where('teamId', '==', teamId),
      where('status', '==', 'pending')
    )
  );
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    expiresAt: doc.data().expiresAt?.toDate() || new Date()
  })) as TeamInvitation[];
};

// Real-time listener for pending invitations sent by a team
export const onTeamPendingInvitationsChange = (teamId: string, callback: (invitations: TeamInvitation[]) => void) => {
  const q = query(
    collection(db, 'teamInvitations'),
    where('teamId', '==', teamId),
    where('status', '==', 'pending')
  );
  
  return onSnapshot(q, (snapshot) => {
    const invitations = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      expiresAt: doc.data().expiresAt?.toDate() || new Date()
    })) as TeamInvitation[];
    
    callback(invitations);
  });
};

// Cancel a pending invitation
export const cancelTeamInvitation = async (invitationId: string): Promise<void> => {
  const invitationRef = doc(db, 'teamInvitations', invitationId);
  const invitationSnap = await getDoc(invitationRef);
  
  if (!invitationSnap.exists()) {
    throw new Error('Invitation not found');
  }
  
  const invitationData = invitationSnap.data();
  
  // Update invitation status to cancelled
  await updateDoc(invitationRef, {
    status: 'cancelled'
  });
  
  // Create notification for invited user
  await createNotification({
    userId: invitationData.invitedUserId,
    type: 'team_invite',
    title: 'Invitation Cancelled',
    message: 'A team invitation has been cancelled',
    data: { teamId: invitationData.teamId },
    isRead: false
  });
};

// Manual Seeding Functions
export const setManualSeeding = async (tournamentId: string, teamRankings: { teamId: string; seed: number }[]): Promise<void> => {
  try {
    console.log('🔍 DEBUG: setManualSeeding called with:', { tournamentId, teamRankings });
    
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    const tournamentDoc = await getDoc(tournamentRef);
    
    if (!tournamentDoc.exists()) {
      throw new Error('Tournament not found');
    }
    
    const tournament = tournamentDoc.data() as Tournament;
    
    // Validate that all teams in rankings are registered for the tournament
    const registeredTeamIds = tournament.teams || [];
    const rankingTeamIds = teamRankings.map(r => r.teamId);
    
    const invalidTeams = rankingTeamIds.filter(teamId => !registeredTeamIds.includes(teamId));
    if (invalidTeams.length > 0) {
      throw new Error(`Teams not registered for tournament: ${invalidTeams.join(', ')}`);
    }
    
    // Validate that all registered teams are included in rankings
    const missingTeams = registeredTeamIds.filter(teamId => !rankingTeamIds.includes(teamId));
    if (missingTeams.length > 0) {
      throw new Error(`Missing teams in rankings: ${missingTeams.join(', ')}`);
    }
    
    // Validate seed numbers are unique and sequential
    const seeds = teamRankings.map(r => r.seed).sort((a, b) => a - b);
    const expectedSeeds = Array.from({ length: teamRankings.length }, (_, i) => i + 1);
    if (JSON.stringify(seeds) !== JSON.stringify(expectedSeeds)) {
      throw new Error('Seed numbers must be unique and sequential from 1 to N');
    }
    
    // Update tournament with manual seeding
    await updateDoc(tournamentRef, {
      seeding: {
        method: 'manual',
        rankings: teamRankings,
      },
      updatedAt: serverTimestamp()
    });
    
    console.log('✅ DEBUG: Manual seeding set successfully');
  } catch (error) {
    console.error('❌ DEBUG: Error setting manual seeding:', error);
    throw error;
  }
};

export const generateBracketWithManualSeeding = async (tournamentId: string): Promise<void> => {
  try {
    console.log('🔍 DEBUG: generateBracketWithManualSeeding called with:', { tournamentId });
    
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    const tournamentDoc = await getDoc(tournamentRef);
    
    if (!tournamentDoc.exists()) {
      throw new Error('Tournament not found');
    }
    
    const tournament = tournamentDoc.data() as Tournament;
    
    if (tournament.seeding.method !== 'manual') {
      throw new Error('Tournament does not have manual seeding configured');
    }
    
    if (!tournament.seeding.rankings || tournament.seeding.rankings.length === 0) {
      throw new Error('No manual seeding rankings found');
    }
    
    // Sort teams by their seed number
    const sortedTeams = [...tournament.seeding.rankings]
      .sort((a, b) => a.seed - b.seed)
      .map(r => r.teamId);
    
    console.log('🔍 DEBUG: Teams sorted by manual seeding:', sortedTeams);
    
    // Delete existing matches for this tournament
    const existingMatches = await getTournamentMatches(tournamentId);
    console.log('🔍 DEBUG: Deleting existing matches:', existingMatches.length);
    for (const match of existingMatches) {
      await deleteMatch(match.id);
    }
    
    // Generate bracket based on tournament type
    if (tournament.format.type === 'double-elimination') {
      await generateDoubleEliminationBracketWithSeeding(tournamentId, sortedTeams);
    } else {
      await generateSingleEliminationBracketWithSeeding(tournamentId, sortedTeams);
    }
    
    console.log('✅ DEBUG: Bracket generated with manual seeding successfully');
  } catch (error) {
    console.error('❌ DEBUG: Error generating bracket with manual seeding:', error);
    throw error;
  }
};

export const generateSingleEliminationBracketWithSeeding = async (tournamentId: string, seededTeams: string[]): Promise<void> => {
  try {
    console.log('🔍 DEBUG: generateSingleEliminationBracketWithSeeding called with:', { tournamentId, seededTeams });
    
    if (seededTeams.length < 2) {
      throw new Error('Need at least 2 teams to generate bracket');
    }

    // Validate team count for single elimination
    const validTeamSizes = [2, 4, 8, 16, 32];
    if (!validTeamSizes.includes(seededTeams.length)) {
      throw new Error(`Single elimination requires 2, 4, 8, 16, or 32 teams. Got ${seededTeams.length} teams.`);
    }
    
    const matches: Omit<Match, 'id'>[] = [];
    let matchNumber = 1;
    
    // Special case: 2 teams, just one match (the final)
    if (seededTeams.length === 2) {
      const match: Omit<Match, 'id'> = {
        team1Id: seededTeams[0],
        team2Id: seededTeams[1],
        team1Score: 0,
        team2Score: 0,
        winnerId: null,
        round: 1,
        matchNumber: matchNumber++,
        isComplete: false,
        tournamentId,
        tournamentType: 'single-elim',
        createdAt: new Date(),
        matchState: 'ready_up',
        mapPool: ['Corrode', 'Ascent', 'Bind', 'Haven', 'Icebox', 'Lotus', 'Sunset'],
        bannedMaps: {
          team1: [],
          team2: []
        },
        team1Ready: false,
        team2Ready: false,
        team1MapBans: [],
        team2MapBans: []
      };
      matches.push(match);
      console.log(`🔍 DEBUG: Created final match: ${match.team1Id} vs ${match.team2Id}`);
    } else {
      // Calculate total rounds needed
      const totalRounds = Math.ceil(Math.log2(seededTeams.length));
      console.log('🔍 DEBUG: Total rounds needed:', totalRounds);
      
      // Generate first round matches using seeded bracket placement
      console.log('🔍 DEBUG: Generating first round matches with seeding...');
      const firstRoundMatches = generateSeededFirstRound(seededTeams);
      
      for (const [team1Id, team2Id] of firstRoundMatches) {
        const match: Omit<Match, 'id'> = {
          team1Id,
          team2Id,
          team1Score: 0,
          team2Score: 0,
          winnerId: null,
          round: 1,
          matchNumber: matchNumber++,
          isComplete: false,
          tournamentId,
          tournamentType: 'single-elim',
          createdAt: new Date(),
          matchState: 'ready_up',
          mapPool: ['Corrode', 'Ascent', 'Bind', 'Haven', 'Icebox', 'Lotus', 'Sunset'],
          bannedMaps: {
            team1: [],
            team2: []
          },
          team1Ready: false,
          team2Ready: false,
          team1MapBans: [],
          team2MapBans: []
        };
        matches.push(match);
        console.log(`🔍 DEBUG: Created round 1 match ${match.matchNumber}: ${match.team1Id} vs ${match.team2Id}`);
      }
      
      // Generate subsequent rounds (semifinals, finals, etc.)
      console.log('🔍 DEBUG: Generating subsequent rounds...');
      for (let round = 2; round <= totalRounds; round++) {
        const matchesInRound = Math.pow(2, totalRounds - round);
        console.log(`🔍 DEBUG: Round ${round} will have ${matchesInRound} matches`);
        
        for (let match = 1; match <= matchesInRound; match++) {
          const newMatch: Omit<Match, 'id'> = {
            team1Id: null,
            team2Id: null,
            team1Score: 0,
            team2Score: 0,
            winnerId: null,
            round,
            matchNumber: matchNumber++,
            isComplete: false,
            tournamentId,
            tournamentType: 'single-elim',
            createdAt: new Date(),
            matchState: 'ready_up',
            mapPool: ['Corrode', 'Ascent', 'Bind', 'Haven', 'Icebox', 'Lotus', 'Sunset'],
            bannedMaps: {
              team1: [],
              team2: []
            },
            team1Ready: false,
            team2Ready: false,
            team1MapBans: [],
            team2MapBans: []
          };
          matches.push(newMatch);
          console.log(`🔍 DEBUG: Created round ${round} match ${newMatch.matchNumber}: TBD vs TBD`);
        }
      }
    }
    
    console.log('🔍 DEBUG: Final matches array:', matches.map(m => ({
      round: m.round,
      matchNumber: m.matchNumber,
      team1Id: m.team1Id,
      team2Id: m.team2Id
    })));
    
    // Add all matches to Firebase
    console.log('🔍 DEBUG: Adding matches to Firebase...');
    for (const match of matches) {
      await addMatch(match);
    }
    
    console.log(`✅ DEBUG: Generated ${matches.length} matches with manual seeding for tournament ${tournamentId}`);
  } catch (error) {
    console.error('❌ DEBUG: Error generating single elimination bracket with seeding:', error);
    throw error;
  }
};

// Helper function to generate seeded first round matches
const generateSeededFirstRound = (seededTeams: string[]): [string, string][] => {
  const matches: [string, string][] = [];
  const n = seededTeams.length;
  
  // Standard tournament seeding pattern:
  // Seed 1 vs Seed N, Seed 2 vs Seed N-1, etc.
  for (let i = 0; i < n / 2; i++) {
    const team1Index = i;
    const team2Index = n - 1 - i;
    matches.push([seededTeams[team1Index], seededTeams[team2Index]]);
  }
  
  return matches;
};

export const generateDoubleEliminationBracketWithSeeding = async (tournamentId: string, seededTeams: string[]): Promise<void> => {
  if (!seededTeams || seededTeams.length < 2) throw new Error('At least 2 teams required');

  // Validate team count for double elimination
  const validTeamSizes = [4, 8, 16, 32];
  if (!validTeamSizes.includes(seededTeams.length)) {
    throw new Error(`Double elimination requires 4, 8, 16, or 32 teams. Got ${seededTeams.length} teams.`);
  }

  console.log(`🔍 DEBUG: Generating double elimination bracket with seeding for ${seededTeams.length} teams`);

  const matches: Omit<Match, 'id'>[] = [];
  let matchNumber = 1;

  // Calculate rounds needed
  const totalRounds = Math.ceil(Math.log2(seededTeams.length));
  console.log(`🔍 DEBUG: Total rounds needed: ${totalRounds}`);

  // Generate Winners Bracket with seeding
  console.log('🔍 DEBUG: Generating winners bracket with seeding...');
  
  // Winners Round 1 - use seeded bracket placement
  const firstRoundMatches = generateSeededFirstRound(seededTeams);
  for (const [team1Id, team2Id] of firstRoundMatches) {
    matches.push({
      team1Id,
      team2Id,
      team1Score: 0,
      team2Score: 0,
      winnerId: null,
      isComplete: false,
      round: 1,
      matchNumber: matchNumber++,
      tournamentId,
      tournamentType: 'double-elim',
      bracketType: 'winners',
      matchState: 'ready_up',
      mapPool: ['Corrode', 'Ascent', 'Bind', 'Haven', 'Icebox', 'Lotus', 'Sunset'],
      bannedMaps: { team1: [], team2: [] },
      team1Ready: false,
      team2Ready: false,
      team1MapBans: [],
      team2MapBans: [],
      createdAt: new Date()
    });
  }

  // Generate subsequent winners rounds
  for (let round = 2; round <= totalRounds; round++) {
    const matchesInRound = Math.pow(2, totalRounds - round);
    for (let match = 1; match <= matchesInRound; match++) {
      matches.push({
        team1Id: null,
        team2Id: null,
        team1Score: 0,
        team2Score: 0,
        winnerId: null,
        isComplete: false,
        round,
        matchNumber: matchNumber++,
        tournamentId,
        tournamentType: 'double-elim',
        bracketType: 'winners',
        matchState: 'ready_up',
        mapPool: ['Corrode', 'Ascent', 'Bind', 'Haven', 'Icebox', 'Lotus', 'Sunset'],
        bannedMaps: { team1: [], team2: [] },
        team1Ready: false,
        team2Ready: false,
        team1MapBans: [],
        team2MapBans: [],
        createdAt: new Date()
      });
    }
  }

  // Generate Losers Bracket
  console.log('🔍 DEBUG: Generating losers bracket...');
  
  // Losers bracket has more rounds than winners bracket
  const losersRounds = totalRounds * 2 - 1;
  
  for (let round = 1; round <= losersRounds; round++) {
    // Calculate matches in this losers round
    let matchesInRound: number;
    
    if (round === 1) {
      // First losers round: half the teams (losers from winners round 1)
      matchesInRound = Math.floor(seededTeams.length / 2);
    } else if (round === 2) {
      // Second losers round: quarter of teams (winners from losers round 1 + losers from winners round 2)
      matchesInRound = Math.floor(seededTeams.length / 2);
    } else {
      // Subsequent rounds: half of previous round
      matchesInRound = Math.max(1, Math.floor(seededTeams.length / Math.pow(2, round)));
    }
    
    for (let match = 1; match <= matchesInRound; match++) {
      matches.push({
        team1Id: null,
        team2Id: null,
        team1Score: 0,
        team2Score: 0,
        winnerId: null,
        isComplete: false,
        round,
        matchNumber: matchNumber++,
        tournamentId,
        tournamentType: 'double-elim',
        bracketType: 'losers',
        matchState: 'ready_up',
        mapPool: ['Corrode', 'Ascent', 'Bind', 'Haven', 'Icebox', 'Lotus', 'Sunset'],
        bannedMaps: { team1: [], team2: [] },
        team1Ready: false,
        team2Ready: false,
        team1MapBans: [],
        team2MapBans: [],
        createdAt: new Date()
      });
    }
  }

  // Generate Grand Finals (winners bracket finalist vs losers bracket finalist)
  console.log('🔍 DEBUG: Generating grand finals...');
  matches.push({
    team1Id: null, // Winners bracket finalist
    team2Id: null, // Losers bracket finalist
    team1Score: 0,
    team2Score: 0,
    winnerId: null,
    isComplete: false,
    round: totalRounds + 1,
    matchNumber: matchNumber++,
    tournamentId,
    tournamentType: 'double-elim',
    bracketType: 'grand_final',
    matchState: 'ready_up',
    mapPool: ['Corrode', 'Ascent', 'Bind', 'Haven', 'Icebox', 'Lotus', 'Sunset'],
    bannedMaps: { team1: [], team2: [] },
    team1Ready: false,
    team2Ready: false,
    team1MapBans: [],
    team2MapBans: [],
    createdAt: new Date()
  });

  // If needed, generate a second grand final match (if losers bracket finalist wins first match)
  if (seededTeams.length >= 8) {
    matches.push({
      team1Id: null, // Winners bracket finalist
      team2Id: null, // Losers bracket finalist (if they won the first grand final)
      team1Score: 0,
      team2Score: 0,
      winnerId: null,
      isComplete: false,
      round: totalRounds + 1,
      matchNumber: matchNumber++,
      tournamentId,
      tournamentType: 'double-elim',
      bracketType: 'grand_final',
      matchState: 'ready_up',
      mapPool: ['Corrode', 'Ascent', 'Bind', 'Haven', 'Icebox', 'Lotus', 'Sunset'],
      bannedMaps: { team1: [], team2: [] },
      team1Ready: false,
      team2Ready: false,
      team1MapBans: [],
      team2MapBans: [],
      createdAt: new Date()
    });
  }

  console.log(`🔍 DEBUG: Generated ${matches.length} matches for double elimination bracket with seeding`);
  console.log(`🔍 DEBUG: Winners bracket: ${matches.filter(m => m.bracketType === 'winners').length} matches`);
  console.log(`🔍 DEBUG: Losers bracket: ${matches.filter(m => m.bracketType === 'losers').length} matches`);
  console.log(`🔍 DEBUG: Grand finals: ${matches.filter(m => m.bracketType === 'grand_final').length} matches`);

  // Add all matches to Firebase
  for (const match of matches) {
    await addMatch(match);
  }

  console.log(`✅ DEBUG: Double elimination bracket with seeding generated successfully for tournament ${tournamentId}`);
};

// New comprehensive double elimination advancement function
export const advanceDoubleEliminationMatch = async (tournamentId: string, match: Match, winnerId: string, loserId: string): Promise<void> => {
  try {
    console.log('🔍 DEBUG: advanceDoubleEliminationMatch called with:', {
      tournamentId,
      matchId: match.id,
      winnerId,
      loserId,
      bracketType: match.bracketType,
      round: match.round,
      matchNumber: match.matchNumber
    });

    // Get all matches for this tournament
    const allMatches = await getTournamentMatches(tournamentId);
    
    if (match.bracketType === 'winners') {
      // Handle winners bracket advancement
      await advanceWinnersBracketMatch(tournamentId, match, winnerId, loserId, allMatches);
    } else if (match.bracketType === 'losers') {
      // Handle losers bracket advancement
      await advanceLosersBracketMatch(tournamentId, match, winnerId, allMatches);
    } else if (match.bracketType === 'grand_final') {
      // Handle grand finals
      await advanceGrandFinalMatch(tournamentId, match, winnerId, allMatches);
    }
  } catch (error) {
    console.error('❌ DEBUG: Error in advanceDoubleEliminationMatch:', error);
    throw error;
  }
};

// Advance winners bracket match
const advanceWinnersBracketMatch = async (tournamentId: string, match: Match, winnerId: string, loserId: string, allMatches: Match[]): Promise<void> => {
  console.log('🔍 DEBUG: Advancing winners bracket match');
  
  // 1. Advance winner to next winners bracket match
  const nextWinnersRound = match.round + 1;
  const nextWinnersMatchNumber = Math.ceil(match.matchNumber / 2);
  
  const nextWinnersMatch = allMatches.find(m => 
    m.tournamentId === tournamentId && 
    m.bracketType === 'winners' && 
    m.round === nextWinnersRound && 
    m.matchNumber === nextWinnersMatchNumber
  );
  
  if (nextWinnersMatch) {
    const nextMatchRef = doc(db, 'matches', nextWinnersMatch.id);
    const isFirstSlot = match.matchNumber % 2 === 1;
    
    await updateDoc(nextMatchRef, {
      [isFirstSlot ? 'team1Id' : 'team2Id']: winnerId,
      updatedAt: new Date()
    });
    console.log(`✅ DEBUG: Advanced winner ${winnerId} to winners bracket match ${nextWinnersMatch.id}`);
  }
  
  // 2. Send loser to losers bracket
  await sendLoserToLosersBracket(tournamentId, match, loserId, allMatches);
};

// Send loser to losers bracket
const sendLoserToLosersBracket = async (tournamentId: string, match: Match, loserId: string, allMatches: Match[]): Promise<void> => {
  console.log('🔍 DEBUG: Sending loser to losers bracket:', loserId);
  
  // Calculate which losers bracket match this loser should go to
  const losersBracketMatch = findLosersBracketMatch(tournamentId, match, allMatches);
  
  if (losersBracketMatch) {
    const losersMatchRef = doc(db, 'matches', losersBracketMatch.id);
    const isFirstSlot = !losersBracketMatch.team1Id;
    
    await updateDoc(losersMatchRef, {
      [isFirstSlot ? 'team1Id' : 'team2Id']: loserId,
      updatedAt: new Date()
    });
    console.log(`✅ DEBUG: Sent loser ${loserId} to losers bracket match ${losersBracketMatch.id}`);
  } else {
    console.warn('⚠️ DEBUG: No available losers bracket match found for loser:', loserId);
  }
};

// Find the appropriate losers bracket match for a loser
const findLosersBracketMatch = (tournamentId: string, match: Match, allMatches: Match[]): Match | null => {
  const winnersRound = match.round;
  const winnersMatchNumber = match.matchNumber;
  
  // For double elimination, the losers bracket structure is:
  // LB Round 1: Losers from WB Round 1
  // LB Round 2: Winners from LB Round 1 + Losers from WB Round 2
  // LB Round 3: Winners from LB Round 2 + Losers from WB Round 3
  // etc.
  
  if (winnersRound === 1) {
    // First round losers go to first losers bracket round
    const losersRound = 1;
    const losersMatchNumber = Math.ceil(winnersMatchNumber / 2);
    
    return allMatches.find(m => 
      m.tournamentId === tournamentId && 
      m.bracketType === 'losers' && 
      m.round === losersRound && 
      m.matchNumber === losersMatchNumber
    ) || null;
  } else {
    // Later round losers go to later losers bracket rounds
    // The formula is: losersRound = (winnersRound - 1) * 2 + 1
    // This ensures proper losers bracket progression
    const losersRound = (winnersRound - 1) * 2 + 1;
    const losersMatchNumber = Math.ceil(winnersMatchNumber / 2);
    
    return allMatches.find(m => 
      m.tournamentId === tournamentId && 
      m.bracketType === 'losers' && 
      m.round === losersRound && 
      m.matchNumber === losersMatchNumber
    ) || null;
  }
};

// Advance losers bracket match
const advanceLosersBracketMatch = async (tournamentId: string, match: Match, winnerId: string, allMatches: Match[]): Promise<void> => {
  console.log('🔍 DEBUG: Advancing losers bracket match');
  
  const nextLosersRound = match.round + 1;
  const nextLosersMatchNumber = Math.ceil(match.matchNumber / 2);
  
  const nextLosersMatch = allMatches.find(m => 
    m.tournamentId === tournamentId && 
    m.bracketType === 'losers' && 
    m.round === nextLosersRound && 
    m.matchNumber === nextLosersMatchNumber
  );
  
  if (nextLosersMatch) {
    const nextMatchRef = doc(db, 'matches', nextLosersMatch.id);
    const isFirstSlot = match.matchNumber % 2 === 1;
    
    await updateDoc(nextMatchRef, {
      [isFirstSlot ? 'team1Id' : 'team2Id']: winnerId,
      updatedAt: new Date()
    });
    console.log(`✅ DEBUG: Advanced winner ${winnerId} to next losers bracket match ${nextLosersMatch.id}`);
  } else {
    // This might be the losers bracket final, check if we need to advance to grand finals
    const isLosersFinal = isLosersBracketFinal(tournamentId, match, allMatches);
    if (isLosersFinal) {
      await advanceToGrandFinals(tournamentId, winnerId, allMatches);
    }
  }
};

// Check if this is the losers bracket final
const isLosersBracketFinal = (tournamentId: string, match: Match, allMatches: Match[]): boolean => {
  const losersMatches = allMatches.filter(m => 
    m.tournamentId === tournamentId && 
    m.bracketType === 'losers'
  );
  
  const maxLosersRound = Math.max(...losersMatches.map(m => m.round));
  return match.round === maxLosersRound;
};

// Advance to grand finals
const advanceToGrandFinals = async (tournamentId: string, losersBracketWinner: string, allMatches: Match[]): Promise<void> => {
  console.log('🔍 DEBUG: Advancing to grand finals');
  
  const grandFinalMatch = allMatches.find(m => 
    m.tournamentId === tournamentId && 
    m.bracketType === 'grand_final' && 
    m.round === Math.max(...allMatches.map(m => m.round))
  );
  
  if (grandFinalMatch) {
    const grandFinalRef = doc(db, 'matches', grandFinalMatch.id);
    
    // The losers bracket winner goes to team2 slot in grand finals
    await updateDoc(grandFinalRef, {
      team2Id: losersBracketWinner,
      updatedAt: new Date()
    });
    console.log(`✅ DEBUG: Advanced losers bracket winner ${losersBracketWinner} to grand finals`);
  }
};

// Advance grand final match
const advanceGrandFinalMatch = async (tournamentId: string, match: Match, winnerId: string, allMatches: Match[]): Promise<void> => {
  console.log('🔍 DEBUG: Advancing grand final match');
  
  // Check if there's a second grand final match (reset bracket)
  const grandFinalMatches = allMatches.filter(m => 
    m.tournamentId === tournamentId && 
    m.bracketType === 'grand_final'
  );
  
  if (grandFinalMatches.length > 1) {
    // There's a second grand final match
    const secondGrandFinal = grandFinalMatches.find(m => m.id !== match.id);
    if (secondGrandFinal && !secondGrandFinal.isComplete) {
      // If the losers bracket winner won the first grand final, they need to win one more
      const losersBracketWinner = match.team2Id;
      if (winnerId === losersBracketWinner) {
        // Losers bracket winner won, they need to win the second match too
        const secondGrandFinalRef = doc(db, 'matches', secondGrandFinal.id);
        await updateDoc(secondGrandFinalRef, {
          team1Id: match.team1Id, // Winners bracket finalist
          team2Id: winnerId, // Losers bracket winner
          updatedAt: new Date()
        });
        console.log(`✅ DEBUG: Set up second grand final match`);
      }
    }
  }
  
  // Mark tournament as completed
  await checkAndMarkTournamentCompleted(tournamentId);
};
