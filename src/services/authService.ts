import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  type User as FirebaseUser
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import type { User } from '../types/tournament';
import { createUserWithLogging } from './firebaseService';

// Store the current user in memory for now
let currentUser: User | null = null;
let authStateListeners: ((user: User | null) => void)[] = [];

const notifyAuthStateListeners = (user: User | null) => {
  authStateListeners.forEach(listener => listener(user));
};

export const registerUser = async (userData: Omit<User, 'id' | 'createdAt'> & { password: string }): Promise<void> => {
  try {
    // Check for username conflicts using public_users collection (public read access)
    const usernameQuery = query(collection(db, 'public_users'), where('username', '==', userData.username));
    const usernameSnapshot = await getDocs(usernameQuery);
    if (!usernameSnapshot.empty) {
      throw new Error('USERNAME_EXISTS');
    }
    
    // Create Firebase auth user (this handles email conflicts automatically)
    const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
    const userId = userCredential.user.uid;
    
    // Create user document in Firestore with the Firebase UID
    const { password, ...userDocData } = userData;
    
    // Create the user document directly in Firestore
    const userDocRef = doc(db, 'users', userId);
    await setDoc(userDocRef, {
      ...userDocData,
      createdAt: new Date(),
      riotIdSet: !!userDocData.riotId && userDocData.riotId.trim() !== '',
      riotIdSetAt: !!userDocData.riotId && userDocData.riotId.trim() !== '' ? new Date() : null
    });
    
    // Create lookup document for login purposes
    const lookupDocRef = doc(collection(db, 'user_lookups'));
    await setDoc(lookupDocRef, {
      userId: userId,
      username: userDocData.username,
      email: userDocData.email,
      createdAt: new Date()
    });
    
    // Create public user document (no email, for public access)
    const publicUserDocRef = doc(db, 'public_users', userId);
    await setDoc(publicUserDocRef, {
      username: userDocData.username,
      riotId: userDocData.riotId || '',
      discordUsername: userDocData.discordUsername || '',
      createdAt: new Date()
    });
    
    // Verify the document was created
    const verifyDoc = await getDoc(userDocRef);
    if (!verifyDoc.exists()) {
      throw new Error('Failed to create user document in Firestore');
    }
  } catch (error: any) {
    // Handle Firebase auth errors
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('EMAIL_EXISTS');
    } else if (error.code === 'auth/weak-password') {
      throw new Error('Password is too weak. Please choose a stronger password.');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Please enter a valid email address.');
    } else if (error.code === 'auth/operation-not-allowed') {
      throw new Error('Registration is currently disabled. Please contact support.');
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error('Too many registration attempts. Please try again later.');
    }
    
    // Handle our custom errors
    if (error.message === 'USERNAME_EXISTS') {
      throw new Error('USERNAME_EXISTS');
    } else if (error.message === 'EMAIL_EXISTS') {
      throw new Error('EMAIL_EXISTS');
    }
    
    // Re-throw other errors
    throw error;
  }
};

export const loginUser = async (usernameOrEmail: string, password: string): Promise<void> => {
  try {
    // First, try to sign in directly with the input as email
    // This works if the user entered their email
    try {
      await signInWithEmailAndPassword(auth, usernameOrEmail, password);
      return; // Success! No need to do username lookup
    } catch (emailError: any) {
      // If email login failed, it might be a username
      // We need to find the user by username and get their email

    }
    
    // If we get here, the input was likely a username
    // Try the new lookup collection first
    try {
      const userQuery = query(collection(db, 'user_lookups'), where('username', '==', usernameOrEmail));
      const userSnapshot = await getDocs(userQuery);
      
      if (!userSnapshot.empty) {
        const userDoc = userSnapshot.docs[0];
        const userData = userDoc.data();
        
        // Sign in with Firebase auth using the email from the lookup
        await signInWithEmailAndPassword(auth, userData.email, password);
        return;
      }
    } catch (lookupError) {

    }
    
    // Fallback: Try the old method for existing users (temporary)
    // This will work until we migrate all users to the lookup collection
    try {
      const userQuery = query(collection(db, 'users'), where('username', '==', usernameOrEmail));
      const userSnapshot = await getDocs(userQuery);
      
      if (userSnapshot.empty) {
        throw new Error('Invalid username/email or password');
      }
      
      const userDoc = userSnapshot.docs[0];
      const userData = userDoc.data();
      
      // Sign in with Firebase auth using the email from Firestore
      await signInWithEmailAndPassword(auth, userData.email, password);
      
    } catch (fallbackError) {
      throw new Error('Invalid username/email or password');
    }
    
  } catch (error: any) {

    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      throw new Error('Invalid username/email or password');
    }
    throw error;
  }
};

export const logoutUser = async (): Promise<void> => {
  try {
    await signOut(auth);
    // The onAuthStateChanged listener in authService.ts will automatically handle the state change
    // and notify all listeners when the user signs out
  } catch (error) {
    throw error;
  }
};

export const resetPassword = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      throw new Error('No account found with this email address');
    }
    throw error;
  }
};

export const onAuthStateChange = (callback: (user: User | null) => void) => {
  authStateListeners.push(callback);
  
  // Return unsubscribe function
  return () => {
    authStateListeners = authStateListeners.filter(listener => listener !== callback);
  };
};

// Remove the duplicate auth state listener - let useAuth hook handle this
// This prevents race conditions between multiple auth state listeners

export const getCurrentUser = (): User | null => {
  return currentUser;
}; 