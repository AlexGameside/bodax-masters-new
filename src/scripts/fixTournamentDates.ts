import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export const fixTournamentDates = async () => {
  try {
    console.log('🔧 Starting to fix tournament dates...');
    
    // Get all tournaments
    const tournamentsRef = collection(db, 'tournaments');
    const querySnapshot = await getDocs(tournamentsRef);
    
    let fixedCount = 0;
    
    for (const docSnapshot of querySnapshot.docs) {
      const tournament = docSnapshot.data();
      const tournamentId = docSnapshot.id;
      
      // Check if startDate is an empty object or invalid
      const startDate = tournament.schedule?.startDate;
      const needsFix = !startDate || 
                      (typeof startDate === 'object' && Object.keys(startDate).length === 0) ||
                      (startDate && typeof startDate === 'object' && !startDate.toDate);
      
      if (needsFix) {
        console.log(`🔧 Fixing tournament ${tournamentId}: ${tournament.name}`);
        
        // Set a default start date (7 days from now)
        const defaultStartDate = new Date();
        defaultStartDate.setDate(defaultStartDate.getDate() + 7);
        
        // Update the tournament with proper Timestamp
        await updateDoc(doc(db, 'tournaments', tournamentId), {
          'schedule.startDate': Timestamp.fromDate(defaultStartDate),
          updatedAt: Timestamp.now()
        });
        
        fixedCount++;
        console.log(`✅ Fixed tournament ${tournamentId}`);
      }
    }
    
    console.log(`🎉 Fixed ${fixedCount} tournaments out of ${querySnapshot.docs.length} total tournaments`);
    return fixedCount;
  } catch (error) {
    console.error('❌ Error fixing tournament dates:', error);
    throw error;
  }
};

// Export for use in other files
export default fixTournamentDates;
