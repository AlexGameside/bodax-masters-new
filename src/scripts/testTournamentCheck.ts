// Simple script to test the tournament registration check
// This can be run in the browser console or as a standalone script

import { getTournamentTeamsData } from './enhancedTeamExport';

const testTournamentCheck = async () => {

  
  try {
    const result = await getTournamentTeamsData();
    
    if (result.success) {




      
      // Show detailed breakdown
      if (result.teams) {

        result.teams.registered.forEach((team, index) => {

        });
        
        if (result.teams.waitlist.length > 0) {

          result.teams.waitlist.forEach((team, index) => {

          });
        }
        
        if (result.teams.rejected.length > 0) {

          result.teams.rejected.forEach((team, index) => {

          });
        }
      }
      
    } else {

    }
  } catch (error) {

  }
};

// Export for use in other modules
export { testTournamentCheck };

// If running directly, execute the test
if (typeof window !== 'undefined') {
  // Browser environment
  (window as any).testTournamentCheck = testTournamentCheck;

}












