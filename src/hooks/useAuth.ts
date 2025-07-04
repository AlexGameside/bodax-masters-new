import { useState, useEffect } from 'react';
import { auth } from '../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { User as FirebaseUser } from 'firebase/auth';
import type { User } from '../types/tournament';

export const useAuth = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (firebaseUser: FirebaseUser) => {
    try {
      console.log('🔍 DEBUG: Fetching user data for:', firebaseUser.uid);
      
      // Get user data from Firestore
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
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
        console.log('✅ DEBUG: User data fetched successfully:', customUser.username);
        setCurrentUser(customUser);
      } else {
        console.warn('⚠️ DEBUG: User document not found in Firestore for:', firebaseUser.uid);
        setCurrentUser(null);
      }
    } catch (error) {
      console.error('❌ DEBUG: Error fetching user data:', error);
      setCurrentUser(null);
    }
  };

  const refreshUser = async () => {
    const firebaseUser = auth.currentUser;
    if (firebaseUser) {
      console.log('🔄 DEBUG: Refreshing user data for:', firebaseUser.uid);
      await fetchUserData(firebaseUser);
    } else {
      console.log('🔄 DEBUG: No current user to refresh');
    }
  };

  // Add a retry mechanism for failed auth state changes
  const retryAuthStateCheck = async () => {
    console.log('🔄 DEBUG: Retrying auth state check');
    const firebaseUser = auth.currentUser;
    if (firebaseUser) {
      await fetchUserData(firebaseUser);
    }
  };

  useEffect(() => {
    console.log('🔍 DEBUG: Setting up auth state listener');
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      console.log('🔍 DEBUG: Auth state changed:', firebaseUser ? `User: ${firebaseUser.uid}` : 'No user');
      
      if (firebaseUser) {
        // Add a small delay to ensure Firebase auth is fully settled
        setTimeout(async () => {
          await fetchUserData(firebaseUser);
        }, 100);
      } else {
        console.log('🔍 DEBUG: Setting currentUser to null');
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => {
      console.log('🔍 DEBUG: Cleaning up auth state listener');
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