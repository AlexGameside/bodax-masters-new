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

    // Create Firebase auth user
    const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
    
    // Create user document in Firestore (without password)
    const { password, ...userDocData } = userData;
    const userDoc = {
      ...userDocData,
      id: userCredential.user.uid,
      createdAt: new Date()
    };
    
    await setDoc(doc(db, 'users', userCredential.user.uid), userDoc);
    
    // Update current user and notify listeners
    currentUser = {
      id: userCredential.user.uid,
      username: userDoc.username,
      email: userDoc.email,
      riotId: userDoc.riotId,
      discordUsername: userDoc.discordUsername,
      createdAt: userDoc.createdAt,
      teamIds: userDoc.teamIds || [],
      isAdmin: userDoc.isAdmin || false
    };
    notifyAuthStateListeners(currentUser);
  } catch (error: any) {
    console.error('Registration error:', error);
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
    
    // Sign in with Firebase auth
    await signInWithEmailAndPassword(auth, userData.email, password);
    
    // Update current user and notify listeners
    currentUser = {
      id: userDoc.id,
      username: userData.username,
      email: userData.email,
      riotId: userData.riotId,
      discordUsername: userData.discordUsername,
      createdAt: userData.createdAt.toDate(),
      teamIds: userData.teamIds || [],
      isAdmin: userData.isAdmin || false
    };
    notifyAuthStateListeners(currentUser);
  } catch (error: any) {
    console.error('Login error:', error);
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
      throw new Error('Invalid username/email or password');
    }
    throw error;
  }
};

export const logoutUser = async (): Promise<void> => {
  try {
    await signOut(auth);
    currentUser = null;
    notifyAuthStateListeners(null);
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
};

export const resetPassword = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: any) {
    console.error('Password reset error:', error);
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

// Initialize auth state listener
onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
  if (firebaseUser) {
    // Get user data from Firestore
    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      currentUser = {
        id: userDoc.id,
        username: userData.username,
        email: userData.email,
        riotId: userData.riotId,
        discordUsername: userData.discordUsername,
        createdAt: userData.createdAt.toDate(),
        teamIds: userData.teamIds || [],
        isAdmin: userData.isAdmin || false
      };
    } else {
      currentUser = null;
    }
  } else {
    currentUser = null;
  }
  notifyAuthStateListeners(currentUser);
});

export const getCurrentUser = (): User | null => {
  return currentUser;
}; 