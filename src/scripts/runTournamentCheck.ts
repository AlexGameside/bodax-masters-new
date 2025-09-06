import { checkTournamentRegistration, getTournamentRegistrationSummary } from './checkTournamentRegistration';

// Run the check
const main = async () => {
  console.log('🚀 Starting tournament registration check...\n');
  
  // Run the detailed check
  await checkTournamentRegistration();
  
  console.log('\n' + '='.repeat(80));
  console.log('📊 SUMMARY REPORT');
  console.log('='.repeat(80));
  
  // Get the summary
  const summary = await getTournamentRegistrationSummary();
  
  if (summary.found && summary.tournament) {
    console.log(`Tournament: ${summary.tournament.name}`);
    console.log(`Status: ${summary.tournament.status}`);
    console.log(`Teams: ${summary.tournament.registeredCount}/${summary.tournament.maxTeams}`);
    console.log(`Waitlist: ${summary.tournament.waitlistCount}`);
    console.log(`Rejected: ${summary.tournament.rejectedCount}`);
    
    if (summary.teams && summary.teams.registered.length > 0) {
      console.log('\nRegistered Teams:');
      summary.teams.registered.forEach((team, index) => {
        console.log(`${index + 1}. ${team.name} [${team.teamTag}] - ${team.activeMemberCount} active members`);
      });
    }
  } else {
    console.log(`Error: ${summary.message}`);
  }
  
  console.log('\n✅ Check complete!');
};

// Run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { main };
