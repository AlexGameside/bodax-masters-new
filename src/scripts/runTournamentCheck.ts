import { checkTournamentRegistration, getTournamentRegistrationSummary } from './checkTournamentRegistration';

// Run the check
const main = async () => {

  
  // Run the detailed check
  await checkTournamentRegistration();
  



  
  // Get the summary
  const summary = await getTournamentRegistrationSummary();
  
  if (summary.found && summary.tournament) {





    
    if (summary.teams && summary.teams.registered.length > 0) {

      summary.teams.registered.forEach((team, index) => {

      });
    }
  } else {

  }
  

};

// Run if this file is executed directly
if (require.main === module) {

}

export { main };
