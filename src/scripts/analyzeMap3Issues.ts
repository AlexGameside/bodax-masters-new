import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { firebaseConfig } from '../config/firebase';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

interface MatchData {
  id: string;
  team1Score: number;
  team2Score: number;
  mapResults?: {
    map1?: { team1Score: number; team2Score: number; winner?: string };
    map2?: { team1Score: number; team2Score: number; winner?: string };
    map3?: { team1Score: number; team2Score: number; winner?: string };
  };
  tournamentType?: string;
  tournamentId?: string;
  team1Id?: string;
  team2Id?: string;
}

async function analyzeMap3Issues() {
  console.log('🔍 Analyzing Map 3 data issues...');
  
  try {
    // Get all completed matches
    const matchesRef = collection(db, 'matches');
    const completedMatchesQuery = query(matchesRef, where('isComplete', '==', true));
    const matchesSnapshot = await getDocs(completedMatchesQuery);
    
    const matches: MatchData[] = [];
    matchesSnapshot.forEach((doc) => {
      matches.push({
        id: doc.id,
        ...doc.data()
      } as MatchData);
    });
    
    console.log(`📊 Found ${matches.length} completed matches to analyze`);
    
    const issues = [];
    const correctMatches = [];
    const twoZeroMatches = [];
    const twoOneMatches = [];
    
    for (const match of matches) {
      const { id, team1Score, team2Score, mapResults } = match;
      
      // Skip matches that don't have map results
      if (!mapResults) {
        continue;
      }
      
      // Categorize matches
      if (team1Score === 2 && team2Score === 0) {
        twoZeroMatches.push({ id, team1Score, team2Score, hasMap3: !!mapResults.map3 });
      } else if (team1Score === 0 && team2Score === 2) {
        twoZeroMatches.push({ id, team1Score, team2Score, hasMap3: !!mapResults.map3 });
      } else if ((team1Score === 2 && team2Score === 1) || (team1Score === 1 && team2Score === 2)) {
        twoOneMatches.push({ id, team1Score, team2Score, hasMap3: !!mapResults.map3 });
      }
      
      // Check for issues
      const isTwoZero = (team1Score === 2 && team2Score === 0) || (team1Score === 0 && team2Score === 2);
      
      if (isTwoZero && mapResults.map3) {
        const map3HasScores = mapResults.map3.team1Score > 0 || mapResults.map3.team2Score > 0;
        issues.push({
          id,
          score: `${team1Score}-${team2Score}`,
          map3Scores: map3HasScores ? `${mapResults.map3.team1Score}-${mapResults.map3.team2Score}` : '0-0',
          hasWinner: !!mapResults.map3.winner
        });
      } else if (!isTwoZero && !mapResults.map3) {
        issues.push({
          id,
          score: `${team1Score}-${team2Score}`,
          issue: 'Missing map3 for 2-1 match'
        });
      } else {
        correctMatches.push({ id, score: `${team1Score}-${team2Score}` });
      }
    }
    
    console.log('\n📈 Analysis Results:');
    console.log(`✅ Correct matches: ${correctMatches.length}`);
    console.log(`🐛 Issues found: ${issues.length}`);
    console.log(`📊 2-0/0-2 matches: ${twoZeroMatches.length}`);
    console.log(`📊 2-1/1-2 matches: ${twoOneMatches.length}`);
    
    if (issues.length > 0) {
      console.log('\n⚠️  Issues Details:');
      issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. Match ${issue.id}: ${issue.score}`);
        if (issue.map3Scores) {
          console.log(`      - Map3 scores: ${issue.map3Scores}`);
          console.log(`      - Has winner: ${issue.hasWinner ? 'Yes' : 'No'}`);
        }
        if (issue.issue) {
          console.log(`      - Issue: ${issue.issue}`);
        }
      });
    }
    
    return { issues, twoZeroMatches, twoOneMatches, correctMatches };
    
  } catch (error) {
    console.error('❌ Error during analysis:', error);
    throw error;
  }
}

async function fixMap3Data(dryRun: boolean = true) {
  console.log(`🔧 ${dryRun ? 'DRY RUN: ' : ''}Fixing Map 3 data issues...`);
  
  try {
    const { issues } = await analyzeMap3Issues();
    
    if (issues.length === 0) {
      console.log('✅ No issues found! All matches are correct.');
      return;
    }
    
    let fixedCount = 0;
    
    for (const issue of issues) {
      if (issue.map3Scores) {
        console.log(`${dryRun ? '🔍 Would fix' : '🔧 Fixing'} match ${issue.id}: ${issue.score}`);
        
        if (!dryRun) {
          // Get the match data
          const matchRef = doc(db, 'matches', issue.id);
          const matchDoc = await getDocs(query(collection(db, 'matches'), where('__name__', '==', issue.id)));
          
          if (matchDoc.empty) {
            console.log(`❌ Match ${issue.id} not found`);
            continue;
          }
          
          const matchData = matchDoc.docs[0].data();
          const mapResults = matchData.mapResults;
          
          if (mapResults && mapResults.map3) {
            // Remove map3 data
            const updatedMapResults = {
              map1: mapResults.map1,
              map2: mapResults.map2
              // map3 is removed
            };
            
            // Update the match
            await updateDoc(matchRef, {
              mapResults: updatedMapResults
            });
            
            console.log(`✅ Fixed match ${issue.id}: Removed map3 data`);
            fixedCount++;
          }
        } else {
          console.log(`   - Would remove map3 data (${issue.map3Scores})`);
        }
      }
    }
    
    if (dryRun) {
      console.log(`\n🔍 DRY RUN: Would fix ${issues.length} matches`);
      console.log('💡 Run with dryRun=false to actually fix the issues');
    } else {
      console.log(`\n✅ Fixed ${fixedCount} matches`);
    }
    
  } catch (error) {
    console.error('❌ Error during fix:', error);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    console.log('🚀 Map 3 Data Cleanup Script');
    console.log('================================');
    
    // First, analyze the issues
    await analyzeMap3Issues();
    
    console.log('\n' + '='.repeat(50));
    
    // Then show what would be fixed (dry run)
    await fixMap3Data(true);
    
    console.log('\n' + '='.repeat(50));
    console.log('💡 To actually fix the issues, modify the script to run fixMap3Data(false)');
    
  } catch (error) {
    console.error('💥 Script failed:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

export { analyzeMap3Issues, fixMap3Data };




