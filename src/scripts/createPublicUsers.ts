import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '../config/firebase';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const createPublicUsers = async () => {

  
  // Sign in anonymously to get access
  await signInAnonymously(auth);

  
  const usersRef = collection(db, 'users');
  const publicUsersRef = collection(db, 'public_users');

  const usersSnapshot = await getDocs(usersRef);


  let createdCount = 0;
  let skippedCount = 0;

  for (const userDoc of usersSnapshot.docs) {
    const userData = userDoc.data();
    const userId = userDoc.id;

    // Check if public user already exists
    const publicUserRef = doc(db, 'public_users', userId);
    
    try {
      // Create public user document
      await setDoc(publicUserRef, {
        username: userData.username || 'Unknown',
        riotId: userData.riotId || '', // Use empty string instead of 'Unknown' for missing riotId
        discordUsername: userData.discordUsername || '', // Use empty string instead of 'Unknown' for missing discordUsername
        createdAt: userData.createdAt || serverTimestamp()
      });

      createdCount++;
    } catch (error) {

      skippedCount++;
    }
  }


};

// Run the migration if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createPublicUsers()
    .then(() => {

      process.exit(0);
    })
    .catch((error) => {

      process.exit(1);
    });
}
