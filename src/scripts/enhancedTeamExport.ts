import { getTournamentRegistrationSummary } from './checkTournamentRegistration';
import { getTeams } from '../services/firebaseService';

const TOURNAMENT_ID = 'VRVlwqpXPLxmeScCWg6s';

export const exportTeamsWithTournamentStatus = async () => {
  try {

    
    // Get all teams
    const allTeams = await getTeams(undefined, true); // Get all teams as admin
    
    // Get tournament registration data
    const tournamentData = await getTournamentRegistrationSummary(TOURNAMENT_ID);
    
    // Create enhanced CSV headers
    const headers = [
      'Team Name',
      'Team Tag', 
      'Captain',
      'Captain Email',
      'Total Members',
      'Active Members',
      'Registered for Tournament',
      'Tournament Registration Date',
      'Tournament Status',
      'Members List',
      'Member Roles',
      'Team Creation Date'
    ];
    
    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...allTeams.map(team => {
        // Check if team is registered for the specific tournament
        let tournamentStatus = 'Not Registered';
        let registrationDate = 'N/A';
        
        if (tournamentData.found && tournamentData.teams) {
          const isRegistered = tournamentData.teams.registered.some(t => t.id === team.id);
          const isWaitlisted = tournamentData.teams.waitlist.some(t => t.id === team.id);
          const isRejected = tournamentData.teams.rejected.some(t => t.id === team.id);
          
          if (isRegistered) {
            tournamentStatus = 'Registered';
            const regTeam = tournamentData.teams.registered.find(t => t.id === team.id);
            registrationDate = regTeam?.registrationDate ? new Date(regTeam.registrationDate).toISOString().split('T')[0] : 'N/A';
          } else if (isWaitlisted) {
            tournamentStatus = 'Waitlisted';
          } else if (isRejected) {
            tournamentStatus = 'Rejected';
          }
        }
        
        const memberList = team.members?.map(member => {
          return member.userId || 'Unknown User';
        }).join('; ') || 'No members';
        
        const memberRoles = team.members?.map(member => {
          return `${member.userId || 'Unknown'}: ${member.role}`;
        }).join('; ') || 'No roles';
        
        const activeMemberCount = team.members?.filter(member => member.isActive).length || 0;
        
        return [
          `"${team.name}"`,
          `"${team.teamTag || 'N/A'}"`,
          `"${team.captainId || 'Unknown Captain'}"`,
          `"N/A"`, // Captain email not available in current data structure
          team.members ? team.members.length : 0,
          activeMemberCount,
          team.registeredForTournament ? 'Yes' : 'No',
          `"${registrationDate}"`,
          `"${tournamentStatus}"`,
          `"${memberList}"`,
          `"${memberRoles}"`,
          team.createdAt ? new Date(team.createdAt).toISOString().split('T')[0] : 'N/A'
        ].join(',');
      })
    ].join('\n');

    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tournament-teams-export-${TOURNAMENT_ID}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    


    
    // Log summary
    if (tournamentData.found && tournamentData.tournament) {





    }
    
    return {
      success: true,
      message: 'Enhanced team export completed successfully',
      tournamentData: tournamentData.found ? tournamentData : null
    };
    
  } catch (error) {

    return {
      success: false,
      message: 'Failed to generate enhanced team export',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Function to get just the tournament registration data without export
export const getTournamentTeamsData = async (tournamentId: string = TOURNAMENT_ID) => {
  try {
    const tournamentData = await getTournamentRegistrationSummary(tournamentId);
    
    if (!tournamentData.found) {
      return {
        success: false,
        message: tournamentData.message
      };
    }
    
    return {
      success: true,
      tournament: tournamentData.tournament,
      teams: tournamentData.teams,
      summary: {
        totalTeams: (tournamentData.tournament?.registeredCount || 0) + (tournamentData.tournament?.waitlistCount || 0) + (tournamentData.tournament?.rejectedCount || 0),
        registered: tournamentData.tournament?.registeredCount || 0,
        waitlisted: tournamentData.tournament?.waitlistCount || 0,
        rejected: tournamentData.tournament?.rejectedCount || 0,
        capacity: tournamentData.tournament?.maxTeams || 0,
        canStart: (tournamentData.tournament?.registeredCount || 0) >= 2,
        isFull: (tournamentData.tournament?.registeredCount || 0) >= (tournamentData.tournament?.maxTeams || 0)
      }
    };
  } catch (error) {

    return {
      success: false,
      message: 'Failed to retrieve tournament teams data',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};
