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
        setCurrentUser(customUser);
      } else {
        setCurrentUser(null);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setCurrentUser(null);
    }
  };

  const refreshUser = async () => {
    const firebaseUser = auth.currentUser;
    if (firebaseUser) {
      await fetchUserData(firebaseUser);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        await fetchUserData(firebaseUser);
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return {
    currentUser,
    loading,
    refreshUser
  };
}; 