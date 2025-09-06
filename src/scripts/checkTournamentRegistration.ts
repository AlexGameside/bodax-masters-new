import { getTournament } from '../services/tournamentService';
import { getTeamsByIds } from '../services/firebaseService';

const TOURNAMENT_ID = 'VRVlwqpXPLxmeScCWg6s';

export const checkTournamentRegistration = async () => {
  try {
    console.log(`🔍 Checking registration status for tournament: ${TOURNAMENT_ID}`);
    
    // Get tournament data
    const tournament = await getTournament(TOURNAMENT_ID);
    
    if (!tournament) {
      console.log('❌ Tournament not found');
      return;
    }
    
    console.log(`📋 Tournament: ${tournament.name}`);
    console.log(`📊 Status: ${tournament.status}`);
    console.log(`👥 Total registered teams: ${tournament.teams.length}`);
    console.log(`📝 Max teams allowed: ${tournament.format.teamCount}`);
    
    if (tournament.teams.length === 0) {
      console.log('❌ No teams have registered for this tournament');
      return;
    }
    
    // Get detailed team information
    const registeredTeams = await getTeamsByIds(tournament.teams);
    
    console.log('\n📋 Registered Teams:');
    console.log('='.repeat(80));
    
    registeredTeams.forEach((team, index) => {
      console.log(`${index + 1}. ${team.name} [${team.teamTag}]`);
      console.log(`   Captain: ${team.captainId}`);
      console.log(`   Members: ${team.members.length}`);
      console.log(`   Active Members: ${team.members.filter(m => m.isActive).length}`);
      console.log(`   Registration Date: ${team.tournamentRegistrationDate || 'N/A'}`);
      console.log('');
    });
    
    // Check waitlist
    if (tournament.waitlist && tournament.waitlist.length > 0) {
      console.log(`⏳ Waitlist: ${tournament.waitlist.length} teams`);
      const waitlistTeams = await getTeamsByIds(tournament.waitlist);
      waitlistTeams.forEach((team, index) => {
        console.log(`   ${index + 1}. ${team.name} [${team.teamTag}]`);
      });
    }
    
    // Check rejected teams
    if (tournament.rejectedTeams && tournament.rejectedTeams.length > 0) {
      console.log(`❌ Rejected: ${tournament.rejectedTeams.length} teams`);
      const rejectedTeams = await getTeamsByIds(tournament.rejectedTeams);
      rejectedTeams.forEach((team, index) => {
        console.log(`   ${index + 1}. ${team.name} [${team.teamTag}]`);
      });
    }
    
    console.log('\n📈 Summary:');
    console.log(`✅ Registered: ${tournament.teams.length}/${tournament.format.teamCount}`);
    console.log(`⏳ Waitlist: ${tournament.waitlist?.length || 0}`);
    console.log(`❌ Rejected: ${tournament.rejectedTeams?.length || 0}`);
    
    // Check if tournament is ready to start
    if (tournament.teams.length >= 2) {
      console.log('✅ Tournament has enough teams to start');
    } else {
      console.log('❌ Tournament needs at least 2 teams to start');
    }
    
    if (tournament.teams.length >= tournament.format.teamCount) {
      console.log('✅ Tournament is at full capacity');
    } else {
      console.log(`📝 Tournament can accept ${tournament.format.teamCount - tournament.teams.length} more teams`);
    }
    
  } catch (error) {
    console.error('❌ Error checking tournament registration:', error);
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
    console.error('Error getting tournament registration summary:', error);
    return {
      found: false,
      message: 'Error retrieving tournament data',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

