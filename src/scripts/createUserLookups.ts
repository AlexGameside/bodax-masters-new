import { collection, getDocs, addDoc, query, where, limit, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Migration script to create user lookup documents for existing users
 * This ensures existing users can still log in with their username
 * 
 * NOTE: This script requires that Firestore rules allow reading from the users collection.
 * You may need to temporarily update firestore.rules to allow public read for users collection,
 * or run this script while authenticated as an admin.
 */
export const createUserLookups = async () => {
  try {
    console.log('🚀 Starting user lookup migration...');
    console.log('⚠️  Note: This script requires read access to the users collection.');
    console.log('   If you get permission errors, temporarily allow public read in firestore.rules\n');
    
    console.log('📊 Fetching all users from users collection...');
    // Get all existing users
    const usersSnapshot = await getDocs(collection(db, 'users'));
    console.log(`📋 Found ${usersSnapshot.size} users to process`);

    // Get all existing lookups to check against
    console.log('🔍 Fetching existing lookups...');
    const lookupsSnapshot = await getDocs(collection(db, 'user_lookups'));
    const existingLookups = new Map<string, boolean>();
    lookupsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.userId) existingLookups.set(data.userId, true);
      if (data.username) existingLookups.set(`username:${data.username}`, true);
    });
    console.log(`📋 Found ${existingLookups.size} existing lookups`);
    
    let created = 0;
    let skipped = 0;
    let errors = 0;
    
    console.log('\n🚀 Starting migration...\n');
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;
      const username = userData.username;
      const email = userData.email;
      
      // Skip if no username or email
      if (!username || !email) {
        console.log(`⏭️  Skipping user ${userId}: missing username or email`);
        skipped++;
        continue;
      }
      
      // Check if lookup already exists
      const hasLookupByUserId = existingLookups.has(userId);
      const hasLookupByUsername = existingLookups.has(`username:${username}`);
      
      if (hasLookupByUserId || hasLookupByUsername) {
        console.log(`⏭️  Skipping user ${username} (${userId}): lookup already exists`);
        skipped++;
        continue;
      }
      
      try {
        // Create lookup document
        await addDoc(collection(db, 'user_lookups'), {
          userId: userId,
          username: username,
          email: email,
          createdAt: userData.createdAt || serverTimestamp()
        });
        
        console.log(`✅ Created lookup for ${username} (${userId})`);
        created++;
      } catch (error: any) {
        console.error(`❌ Error creating lookup for ${username} (${userId}):`, error.message);
        errors++;
      }
    }
    
    console.log('\n📈 Migration Summary:');
    console.log(`✅ Created: ${created}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`📊 Total processed: ${usersSnapshot.size}`);
    
    return { created, skipped, errors };
    
  } catch (error: any) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
};

// Run the migration if this script is executed directly
if (import.meta.url.endsWith(process.argv[1]) || import.meta.url.includes('createUserLookups')) {
  createUserLookups()
    .then((result) => {
      console.log('\n🎉 Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration failed:', error);
      process.exit(1);
    });
}
