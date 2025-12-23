import { getTournament } from '../services/tournamentService';
import { getTeamsByIds } from '../services/firebaseService';

const TOURNAMENT_ID = 'VRVlwqpXPLxmeScCWg6s';

export const checkTournamentRegistration = async () => {
  try {

    
    // Get tournament data
    const tournament = await getTournament(TOURNAMENT_ID);
    
    if (!tournament) {

      return;
    }
    




    
    if (tournament.teams.length === 0) {

      return;
    }
    
    // Get detailed team information
    const registeredTeams = await getTeamsByIds(tournament.teams);
    


    
    registeredTeams.forEach((team, index) => {






    });
    
    // Check waitlist
    if (tournament.waitlist && tournament.waitlist.length > 0) {

      const waitlistTeams = await getTeamsByIds(tournament.waitlist);
      waitlistTeams.forEach((team, index) => {

      });
    }
    
    // Check rejected teams
    if (tournament.rejectedTeams && tournament.rejectedTeams.length > 0) {

      const rejectedTeams = await getTeamsByIds(tournament.rejectedTeams);
      rejectedTeams.forEach((team, index) => {

      });
    }
    




    
    // Check if tournament is ready to start
    if (tournament.teams.length >= 2) {

    } else {

    }
    
    if (tournament.teams.length >= tournament.format.teamCount) {

    } else {

    }
    
  } catch (error) {

  }
};

// Export function for use in other parts of the application
export const getTournamentRegistrationSummary = async (tournamentId: string = TOURNAMENT_ID) => {
  try {
    const tournament = await getTournament(tournamentId);
    
    if (!tournament) {
      return {
        found: false,
        message: 'Tournament not found'
      };
    }
    
    const registeredTeams = await getTeamsByIds(tournament.teams);
    const waitlistTeams = tournament.waitlist?.length > 0 ? await getTeamsByIds(tournament.waitlist) : [];
    const rejectedTeams = tournament.rejectedTeams?.length > 0 ? await getTeamsByIds(tournament.rejectedTeams) : [];
    
    return {
      found: true,
      tournament: {
        id: tournament.id,
        name: tournament.name,
        status: tournament.status,
        maxTeams: tournament.format.teamCount,
        registeredCount: tournament.teams.length,
        waitlistCount: tournament.waitlist?.length || 0,
        rejectedCount: tournament.rejectedTeams?.length || 0
      },
      teams: {
        registered: registeredTeams.map(team => ({
          id: team.id,
          name: team.name,
          teamTag: team.teamTag,
          captainId: team.captainId,
          memberCount: team.members.length,
          activeMemberCount: team.members.filter(m => m.isActive).length,
          registrationDate: team.tournamentRegistrationDate
        })),
        waitlist: waitlistTeams.map(team => ({
          id: team.id,
          name: team.name,
          teamTag: team.teamTag,
          captainId: team.captainId
        })),
        rejected: rejectedTeams.map(team => ({
          id: team.id,
          name: team.name,
          teamTag: team.teamTag,
          captainId: team.captainId
        }))
      }
    };
  } catch (error) {

    return {
      found: false,
      message: 'Error retrieving tournament data',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};












