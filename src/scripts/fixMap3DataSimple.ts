import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { firebaseConfig } from '../config/firebase';
import type { Match } from '../types/tournament';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fixMap3Data() {
  console.log('🔍 Starting Map 3 data cleanup...');
  
  try {
    // Get all completed matches
    const matchesRef = collection(db, 'matches');
    const completedMatchesQuery = query(matchesRef, where('isComplete', '==', true));
    const matchesSnapshot = await getDocs(completedMatchesQuery);
    
    const matches: Match[] = [];
    matchesSnapshot.forEach((doc) => {
      matches.push({
        id: doc.id,
        ...doc.data()
      } as Match);
    });
    
    console.log(`📊 Found ${matches.length} completed matches to analyze`);
    
    let fixedCount = 0;
    let skippedCount = 0;
    const issues = [];
    
    for (const match of matches) {
      const { id, team1Score, team2Score, mapResults } = match;
      
      // Skip matches that don't have map results
      if (!mapResults) {
        skippedCount++;
        continue;
      }
      
      // Check if this is a 2-0 or 0-2 match (should not have map3)
      const isTwoZero = (team1Score === 2 && team2Score === 0) || (team1Score === 0 && team2Score === 2);
      
      if (isTwoZero && mapResults.map3) {
        console.log(`🔧 Fixing match ${id}: ${team1Score}-${team2Score} but has map3 data`);
        
        // Check if map3 has actual scores (not just 0-0)
        const map3HasScores = mapResults.map3.team1Score > 0 || mapResults.map3.team2Score > 0;
        
        if (map3HasScores) {
          issues.push(`Match ${id}: ${team1Score}-${team2Score} but map3 has scores ${mapResults.map3.team1Score}-${mapResults.map3.team2Score}`);
        }
        
        // Remove map3 data
        const updatedMapResults = {
          map1: mapResults.map1,
          map2: mapResults.map2
          // map3 is removed
        };
        
        // Update the match
        const matchRef = doc(db, 'matches', id);
        await updateDoc(matchRef, {
          mapResults: updatedMapResults
        });
        
        console.log(`✅ Fixed match ${id}: Removed map3 data`);
        fixedCount++;
      } else if (isTwoZero && !mapResults.map3) {
        // This is correct - 2-0 match without map3
        skippedCount++;
      } else {
        // This is a 2-1 or 1-2 match - should have map3
        skippedCount++;
      }
    }
    
    console.log('\n📈 Cleanup Summary:');
    console.log(`✅ Fixed matches: ${fixedCount}`);
    console.log(`⏭️  Skipped matches: ${skippedCount}`);
    console.log(`📊 Total processed: ${matches.length}`);
    
    if (issues.length > 0) {
      console.log('\n⚠️  Issues found:');
      issues.forEach(issue => console.log(`   - ${issue}`));
    }
    
    console.log('\n🎉 Map 3 data cleanup completed!');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    console.log('🚀 Starting Map 3 cleanup script...');
    await fixMap3Data();
    console.log('\n🎯 Cleanup completed successfully!');
  } catch (error) {
    console.error('💥 Script failed:', error);
    process.exit(1);
  }
}

// Run the script
main();
