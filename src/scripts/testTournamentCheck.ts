// Simple script to test the tournament registration check
// This can be run in the browser console or as a standalone script

import { getTournamentTeamsData } from './enhancedTeamExport';

const testTournamentCheck = async () => {
  console.log('🔍 Testing tournament registration check for VRVlwqpXPLxmeScCWg6s...');
  
  try {
    const result = await getTournamentTeamsData();
    
    if (result.success) {
      console.log('✅ Tournament found!');
      console.log('📊 Tournament Details:', result.tournament);
      console.log('👥 Teams:', result.teams);
      console.log('📈 Summary:', result.summary);
      
      // Show detailed breakdown
      console.log('\n📋 Registered Teams:');
      result.teams.registered.forEach((team, index) => {
        console.log(`${index + 1}. ${team.name} [${team.teamTag}] - ${team.activeMemberCount} active members`);
      });
      
      if (result.teams.waitlist.length > 0) {
        console.log('\n⏳ Waitlisted Teams:');
        result.teams.waitlist.forEach((team, index) => {
          console.log(`${index + 1}. ${team.name} [${team.teamTag}]`);
        });
      }
      
      if (result.teams.rejected.length > 0) {
        console.log('\n❌ Rejected Teams:');
        result.teams.rejected.forEach((team, index) => {
          console.log(`${index + 1}. ${team.name} [${team.teamTag}]`);
        });
      }
      
    } else {
      console.log('❌ Tournament not found or error occurred:', result.message);
    }
  } catch (error) {
    console.error('❌ Error during tournament check:', error);
  }
};

// Export for use in other modules
export { testTournamentCheck };

// If running directly, execute the test
if (typeof window !== 'undefined') {
  // Browser environment
  (window as any).testTournamentCheck = testTournamentCheck;
  console.log('Tournament check function available as window.testTournamentCheck()');
}

