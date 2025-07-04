import { useState, useEffect } from 'react';
import { auth } from '../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
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