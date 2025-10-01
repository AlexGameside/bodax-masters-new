import { collection, getDocs, addDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Migration script to create user lookup documents for existing users
 * This ensures existing users can still log in with their username
 */
export const createUserLookups = async () => {
  try {

    
    // Get all existing users
    const usersSnapshot = await getDocs(collection(db, 'users'));

    
    let created = 0;
    let skipped = 0;
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;
      
      // Check if lookup already exists
      const lookupQuery = collection(db, 'user_lookups');
      const lookupSnapshot = await getDocs(lookupQuery);
      const existingLookup = lookupSnapshot.docs.find(doc => 
        doc.data().userId === userId || doc.data().username === userData.username
      );
      
      if (existingLookup) {

        skipped++;
        continue;
      }
      
      // Create lookup document
      await addDoc(collection(db, 'user_lookups'), {
        userId: userId,
        username: userData.username,
        email: userData.email,
        createdAt: userData.createdAt || new Date()
      });
      

      created++;
    }
    

    return { created, skipped };
    
  } catch (error) {

    throw error;
  }
};

// Run the migration if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createUserLookups()
    .then(() => {

      process.exit(0);
    })
    .catch((error) => {

      process.exit(1);
    });
}
