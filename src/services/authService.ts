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

    
    // Check if username already exists
    const usernameQuery = query(collection(db, 'users'), where('username', '==', userData.username));
    const usernameSnapshot = await getDocs(usernameQuery);
    if (!usernameSnapshot.empty) {
      throw new Error('Username already exists');
    }

    // Check if email already exists
    const emailQuery = query(collection(db, 'users'), where('email', '==', userData.email));
    const emailSnapshot = await getDocs(emailQuery);
    if (!emailSnapshot.empty) {
      throw new Error('Email already registered');
    }

    
    // Create Firebase auth user first
    const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
    const userId = userCredential.user.uid;
    
    // Create user document in Firestore with the Firebase UID
    const { password, ...userDocData } = userData;
    
    // Create the user document directly in Firestore
    const userDocRef = doc(db, 'users', userId);
    await setDoc(userDocRef, {
      ...userDocData,
      createdAt: new Date()
    });
    
    // Verify the document was created
    const verifyDoc = await getDoc(userDocRef);
    if (!verifyDoc.exists()) {
      throw new Error('Failed to create user document in Firestore');
    }
    
    if (!verifyDoc.exists()) {
      throw new Error('Failed to create user document in Firestore');
    }
  } catch (error: any) {
    console.error('❌ DEBUG: Registration error:', error);
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('Email already registered');
    }
    throw error;
  }
};

export const loginUser = async (usernameOrEmail: string, password: string): Promise<void> => {
  try {

    
    // Try to find user by username first
    let userQuery = query(collection(db, 'users'), where('username', '==', usernameOrEmail));
    let userSnapshot = await getDocs(userQuery);
    
    // If not found by username, try email
    if (userSnapshot.empty) {
      userQuery = query(collection(db, 'users'), where('email', '==', usernameOrEmail));
      userSnapshot = await getDocs(userQuery);
    }
    
    if (userSnapshot.empty) {

      throw new Error('User not found');
    }
    
    const userDoc = userSnapshot.docs[0];
    const userData = userDoc.data();
    

    
    // Sign in with Firebase auth using the email from Firestore
    await signInWithEmailAndPassword(auth, userData.email, password);
    

    
    // The useAuth hook will automatically detect the user via onAuthStateChanged
    // No need to manually update state here
  } catch (error: any) {
    console.error('❌ DEBUG: Login error:', error);
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