const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, setDoc, serverTimestamp } = require('firebase/firestore');

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCL7IympFrF2nWcLPEOQtyGSgPzp0MojHU",
  authDomain: "bodax-masters.firebaseapp.com",
  projectId: "bodax-masters",
  storageBucket: "bodax-masters.firebasestorage.app",
  messagingSenderId: "374148130763",
  appId: "1:374148130763:web:f32de20bc18a0ed4e4b84e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const createPublicUsers = async () => {
  console.log('Starting public users migration...');
  
  const usersRef = collection(db, 'users');
  const publicUsersRef = collection(db, 'public_users');

  const usersSnapshot = await getDocs(usersRef);
  console.log(`Found ${usersSnapshot.size} existing users`);

  let createdCount = 0;
  let skippedCount = 0;

  for (const userDoc of usersSnapshot.docs) {
    const userData = userDoc.data();
    const userId = userDoc.id;

    try {
      // Create public user document
      const publicUserRef = doc(db, 'public_users', userId);
      await setDoc(publicUserRef, {
        username: userData.username || 'Unknown',
        riotId: userData.riotId || 'Unknown',
        discordUsername: userData.discordUsername || 'Unknown',
        createdAt: userData.createdAt || serverTimestamp()
      });
      console.log(`Created public user for: ${userData.username}`);
      createdCount++;
    } catch (error) {
      console.log(`Skipped ${userData.username} (might already exist):`, error.message);
      skippedCount++;
    }
  }

  console.log(`Migration complete! Created: ${createdCount}, Skipped: ${skippedCount}`);
};

// Run the migration
createPublicUsers()
  .then(() => {
    console.log('Public users migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Public users migration failed:', error);
    process.exit(1);
  });
