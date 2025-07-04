import { useState, useEffect } from 'react';
import { auth } from '../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { User as FirebaseUser } from 'firebase/auth';
import type { User } from '../types/tournament';

export const useAuth = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (firebaseUser: FirebaseUser) => {
    try {
      console.log('🔍 DEBUG: Fetching user data for Firebase UID:', firebaseUser.uid);
      
      // Get user data from Firestore
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log('✅ DEBUG: Found user document:', userData.username);
        
        const customUser: User = {
          id: userDoc.id,
          username: userData.username,
          email: userData.email,
          riotId: userData.riotId,
          discordUsername: userData.discordUsername,
          discordId: userData.discordId,
          discordAvatar: userData.discordAvatar,
          discordLinked: userData.discordLinked,
          createdAt: userData.createdAt.toDate(),
          teamIds: userData.teamIds || [],
          isAdmin: userData.isAdmin || false
        };
        setCurrentUser(customUser);
      } else {
        console.error('❌ DEBUG: User document not found in Firestore for Firebase UID:', firebaseUser.uid);
        console.error('❌ DEBUG: This means the registration process failed to create the Firestore document');
        
        // Try to get the user by email as a fallback
        console.log('🔍 DEBUG: Attempting fallback lookup by email...');
        const emailQuery = query(collection(db, 'users'), where('email', '==', firebaseUser.email));
        const emailSnapshot = await getDocs(emailQuery);
        
                if (!emailSnapshot.empty) {
          const userDoc = emailSnapshot.docs[0];
          const userData = userDoc.data();
          console.log('✅ DEBUG: Found user by email fallback:', userData.username);
          console.log('✅ DEBUG: Using document ID from fallback:', userDoc.id);
          
          // Fix the document ID mismatch automatically
          if (userDoc.id !== firebaseUser.uid) {
            console.log('🔧 DEBUG: Document ID mismatch detected, fixing...');
            await fixDocumentIdMismatch(firebaseUser, userDoc.id);
            
            // Now fetch the user data again with the correct UID
            const correctedDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
            if (correctedDoc.exists()) {
              const correctedUserData = correctedDoc.data();
              const customUser: User = {
                id: firebaseUser.uid, // Use the Firebase UID
                username: correctedUserData.username,
                email: correctedUserData.email,
                riotId: correctedUserData.riotId,
                discordUsername: correctedUserData.discordUsername,
                discordId: correctedUserData.discordId,
                discordAvatar: correctedUserData.discordAvatar,
                discordLinked: correctedUserData.discordLinked,
                createdAt: correctedUserData.createdAt.toDate(),
                teamIds: correctedUserData.teamIds || [],
                isAdmin: correctedUserData.isAdmin || false
              };
              setCurrentUser(customUser);
              return;
            }
          }
          
          const customUser: User = {
            id: userDoc.id, // Use the actual document ID from Firestore
            username: userData.username,
            email: userData.email,
            riotId: userData.riotId,
            discordUsername: userData.discordUsername,
            discordId: userData.discordId,
            discordAvatar: userData.discordAvatar,
            discordLinked: userData.discordLinked,
            createdAt: userData.createdAt.toDate(),
            teamIds: userData.teamIds || [],
            isAdmin: userData.isAdmin || false
          };
          setCurrentUser(customUser);
        } else {
          console.error('❌ DEBUG: User not found by email fallback either');
          setCurrentUser(null);
        }
      }
    } catch (error) {
      console.error('❌ DEBUG: Error fetching user data:', error);
      setCurrentUser(null);
    }
  };

  const refreshUser = async () => {
    const firebaseUser = auth.currentUser;
    if (firebaseUser) {
      await fetchUserData(firebaseUser);
    }
  };

  // Add a retry mechanism for failed auth state changes
  const retryAuthStateCheck = async () => {
    const firebaseUser = auth.currentUser;
    if (firebaseUser) {
      await fetchUserData(firebaseUser);
    }
  };

  // Function to fix document ID mismatch
  const fixDocumentIdMismatch = async (firebaseUser: FirebaseUser, correctDocId: string) => {
    try {
      console.log('🔧 DEBUG: Fixing document ID mismatch...');
      console.log('🔧 DEBUG: Firebase UID:', firebaseUser.uid);
      console.log('🔧 DEBUG: Correct document ID:', correctDocId);
      
      // Get the user data from the correct document
      const correctDoc = await getDoc(doc(db, 'users', correctDocId));
      if (!correctDoc.exists()) {
        console.error('❌ DEBUG: Correct document not found');
        return;
      }
      
      const userData = correctDoc.data();
      
      // Create the document with the correct Firebase UID
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        ...userData,
        // Keep the original createdAt timestamp
        createdAt: userData.createdAt
      });
      
      // Delete the old document
      await deleteDoc(doc(db, 'users', correctDocId));
      
      console.log('✅ DEBUG: Document ID mismatch fixed successfully');
    } catch (error) {
      console.error('❌ DEBUG: Error fixing document ID mismatch:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // Add a small delay to ensure Firebase auth is fully settled
        setTimeout(async () => {
          await fetchUserData(firebaseUser);
        }, 100);
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return {
    currentUser,
    loading,
    refreshUser,
    retryAuthStateCheck
  };
}; 